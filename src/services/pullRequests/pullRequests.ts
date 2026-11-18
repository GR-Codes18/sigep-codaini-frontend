/**
 * Servicios de Pull Request (Fase 2, paso 6): listar las ramas para el modal y crear el PR (6A), y
 * cerrarlo desde el sistema (6B).
 *
 * Mismo patrón que los servicios de tareas: Zod → actor → tarea → regla de `domain/` → GitHub →
 * `siguienteEstadoPR` → escritura en una sola transacción. GitHub se usa siempre a través de
 * `entorno.github` (simulado en el prototipo).
 *
 * Crear (§7.2, §7.5):
 *   - un error de GitHub (rama inexistente, el caso preparado del plan §8) no escribe nada y la
 *     etiqueta sigue igual (S3): la ventana muestra el motivo y permite reintentar;
 *   - un PR que ya existía para esas ramas se vincula: el resultado trae `vinculado: true` para que
 *     la pantalla muestre «Ya existía un PR para estas ramas; lo vinculamos»;
 *   - si GitHub informa conflictos, en la misma operación se registra un segundo evento del Sistema
 *     que pasa el PR a CON_CONFLICTOS y avisa al practicante (§7.3, §8.1).
 * No se avisa a nadie por crear un PR (§8.1).
 *
 * Cerrar (§7.5): solo con la etiqueta Creado o Con conflictos y con motivo; la etiqueta queda en
 * Cerrado (se puede crear otro) y se conservan la URL y las ramas. GitHub se llama solo después de los
 * permisos y del texto. Se avisa al responsable si lo cerró otra persona (§8.1).
 */

import { z } from 'zod';
import type { DatosAlmacen } from '@/data';
import {
  puedeCerrarPullRequest,
  puedeCrearPullRequest,
  siguienteEstadoPR,
  type Id,
  type Tarea,
} from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { etiquetaTarea } from '../etiquetas';
import type { PRConocido } from '../github';
import { AUTOR_SISTEMA, crearEvento, diferencias } from '../historial';
import { crearNotificaciones } from '../notificaciones';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { conEfectos, ejecutarConsulta, ejecutarServicio } from '../transaccional';
import {
  cargarContextoTarea,
  esquemaId,
  esquemaTextoOpcional,
  eventoDeTarea,
  exigirTexto,
  referenciaTarea,
  reemplazarTarea,
  textoGuardado,
} from '../tareas/comun';

export const NOTA_PR_VINCULADO = 'Ya existía un PR para estas ramas; se vinculó.';

// ── Listar ramas ─────────────────────────────────────────────────────────────────────────────

const esquemaListar = z.object({ idActor: esquemaId, idTarea: esquemaId });

export type EntradaListarRamas = z.input<typeof esquemaListar>;

/**
 * Ramas del repositorio para el desplegable de «Crear Pull Request». Solo para quien puede crear el PR
 * de esa tarea (mismo permiso que crear). No escribe nada.
 */
export function listarRamasParaPullRequest(
  entrada: EntradaListarRamas,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<string[]>> {
  return ejecutarConsulta(entorno, ({ datos, entorno: e }) => {
    const valida = validarEntrada(esquemaListar, entrada);
    if (!valida.ok) return valida;

    const contexto = cargarContextoTarea(datos, valida.valor.idActor, valida.valor.idTarea);
    if (!contexto.ok) return contexto;
    const { actor, tarea, proyecto, asignaciones } = contexto.valor;

    const permiso = puedeCrearPullRequest(tarea, actor, { proyecto, asignaciones });
    if (!permiso.permitido) return denegar(permiso);

    return { ok: true, valor: e.github.listarRamas(proyecto) };
  });
}

// ── Crear ────────────────────────────────────────────────────────────────────────────────────

const esquemaCrear = z.object({
  idActor: esquemaId,
  idTarea: esquemaId,
  rama_origen: z.string().trim().min(1, 'Elige la rama de trabajo.'),
  titulo: z.string().trim().min(1, 'Escribe el título del Pull Request.'),
  /** Plantilla para completar (§7.2); puede quedar vacía. */
  descripcion: z.string().optional(),
});

export type EntradaCrearPullRequest = z.input<typeof esquemaCrear>;

export interface PullRequestCreado {
  tarea: Tarea;
  /** `true` si GitHub ya tenía un PR para esas ramas y se vinculó en lugar de crear otro. */
  vinculado: boolean;
}

/** Los PR conocidos del proyecto (tareas con URL), marcando el anterior de la propia tarea. */
function prsDelProyecto(
  datos: Pick<DatosAlmacen, 'tareas'>,
  idProyecto: Id,
  idTarea: Id,
): PRConocido[] {
  const prs: PRConocido[] = [];
  for (const t of datos.tareas) {
    if (t.id_proyecto !== idProyecto || t.url_pull_request === null) continue;
    if (t.estado_pr === null || t.rama_origen === null || t.rama_base === null) continue;
    prs.push({
      url: t.url_pull_request,
      rama_origen: t.rama_origen,
      rama_base: t.rama_base,
      estado_pr: t.estado_pr,
      propio: t.id === idTarea,
    });
  }
  return prs;
}

/**
 * Crea el PR de la tarea (solo el practicante responsable, con la etiqueta en PENDIENTE o CERRADO).
 * La rama base es siempre la del proyecto; título y descripción van solo a GitHub (la tarea no los
 * guarda, §11).
 */
export function crearPullRequest(
  entrada: EntradaCrearPullRequest,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<PullRequestCreado>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaCrear, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;

    const contexto = cargarContextoTarea(datos, v.idActor, v.idTarea);
    if (!contexto.ok) return contexto;
    const { actor, tarea, proyecto, asignaciones } = contexto.valor;

    // Responsable, alcance, FINALIZADO, etiqueta visible y PR en PENDIENTE o CERRADO.
    const permiso = puedeCrearPullRequest(tarea, actor, { proyecto, asignaciones });
    if (!permiso.permitido) return denegar(permiso);

    const respuesta = e.github.crearPullRequest({
      repositorio: proyecto,
      rama_origen: v.rama_origen,
      titulo: v.titulo,
      descripcion: v.descripcion ?? '',
      prs_del_proyecto: prsDelProyecto(datos, proyecto.id, tarea.id),
    });
    // S3: un error al crear no es un evento; no se escribe nada.
    if (!respuesta.ok) return fallo(respuesta.codigo);

    const creado = siguienteEstadoPR(tarea, { tipo: 'PR_CREADO', resultado: respuesta.resultado });
    if (!creado.aplica) return denegar(creado);
    const conPR: Tarea = {
      ...tarea,
      estado_pr: creado.estado_pr,
      url_pull_request: respuesta.url,
      rama_origen: v.rama_origen,
      rama_base: proyecto.rama_base,
    };
    const vinculado = respuesta.resultado !== 'NUEVO';
    const eventos = [
      eventoDeTarea(
        {
          actor,
          proyecto,
          tarea: conPR,
          tipo_accion: 'PULL_REQUEST_CREADO',
          cambios: diferencias(tarea, conPR, [
            'estado_pr',
            'url_pull_request',
            'rama_origen',
            'rama_base',
          ]),
          nota: vinculado ? NOTA_PR_VINCULADO : null,
        },
        marca,
        e.generarId,
      ),
    ];
    let final = conPR;
    let avisos: ReturnType<typeof crearNotificaciones> = [];

    // §7.5: GitHub calcula los conflictos unos segundos después; lo informa el Sistema.
    if (respuesta.conflictos) {
      const informado = siguienteEstadoPR(conPR, {
        tipo: 'GITHUB_INFORMA',
        consulta: { estado: 'ABIERTO', conflictos: true },
      });
      if (!informado.aplica) return denegar(informado);
      final = { ...conPR, estado_pr: informado.estado_pr };
      eventos.push(
        crearEvento(
          {
            autor: AUTOR_SISTEMA,
            tipo_accion: 'PULL_REQUEST_ESTADO_ACTUALIZADO',
            elemento: { tipo: 'TAREA', id: tarea.id, etiqueta: etiquetaTarea(proyecto, tarea) },
            id_proyecto: proyecto.id,
            cambios: diferencias(conPR, final, ['estado_pr']),
          },
          marca,
          e.generarId,
        ),
      );
      if (tarea.id_practicante !== null) {
        avisos = crearNotificaciones(
          {
            autor: AUTOR_SISTEMA,
            destinatarios: [tarea.id_practicante],
            tipo: 'PULL_REQUEST_CON_CONFLICTOS',
            mensaje: `El Pull Request de ${referenciaTarea(proyecto, tarea)} tiene conflictos.`,
            elemento: { tipo: 'TAREA', id: tarea.id },
          },
          datos.usuarios,
          marca,
          e.generarId,
        );
      }
    }

    return {
      ok: true,
      valor: { tarea: final, vinculado },
      cambios: conEfectos(
        datos,
        { tareas: reemplazarTarea(datos.tareas, final) },
        { eventos, notificaciones: avisos },
      ),
    };
  });
}

// ── Cerrar ───────────────────────────────────────────────────────────────────────────────────

const esquemaCerrar = z.object({
  idActor: esquemaId,
  idTarea: esquemaId,
  motivo: esquemaTextoOpcional,
});

export type EntradaCerrarPR = z.input<typeof esquemaCerrar>;

/**
 * Cierra el PR de la tarea sin fusionarlo (§7.5): el practicante responsable, el Supervisor del
 * proyecto o el Administrador, con motivo. Solo cambia `estado_pr` a CERRADO; la URL y las ramas se
 * conservan, y luego se puede crear un PR nuevo.
 */
export function cerrarPullRequest(
  entrada: EntradaCerrarPR,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Tarea>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaCerrar, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;

    const contexto = cargarContextoTarea(datos, v.idActor, v.idTarea);
    if (!contexto.ok) return contexto;
    const { actor, tarea, proyecto, asignaciones } = contexto.valor;

    // `puede()` → etiqueta visible → PR abierto (CREADO o CON_CONFLICTOS) → motivo vacío.
    const permiso = puedeCerrarPullRequest(tarea, actor, { proyecto, asignaciones }, v.motivo);
    if (!permiso.permitido) return denegar(permiso);
    // Motivo ausente: `domain/` lo deja pasar, el servicio no.
    const sinTexto = exigirTexto(permiso.exige_texto, v.motivo);
    if (sinTexto !== null) return sinTexto;

    // Un PR abierto siempre tiene URL; sin ella, el dato está roto (→ ERROR_INESPERADO).
    if (tarea.url_pull_request === null) {
      throw new Error(`La tarea ${tarea.id} tiene un PR abierto sin URL.`);
    }
    // GitHub, solo después de los permisos y del texto.
    e.github.cerrarPullRequest(tarea.url_pull_request);

    const cerrado = siguienteEstadoPR(tarea, { tipo: 'PR_CERRADO_DESDE_SISTEMA' });
    if (!cerrado.aplica) return denegar(cerrado);
    const nueva: Tarea = { ...tarea, estado_pr: cerrado.estado_pr };

    const evento = eventoDeTarea(
      {
        actor,
        proyecto,
        tarea: nueva,
        tipo_accion: 'PULL_REQUEST_CERRADO_DESDE_EL_SISTEMA',
        cambios: diferencias(tarea, nueva, ['estado_pr']),
        nota: textoGuardado(v.motivo),
      },
      marca,
      e.generarId,
    );
    // §8.1: al responsable si lo cerró otra persona (`crearNotificaciones` descarta al autor).
    const avisos =
      tarea.id_practicante === null
        ? []
        : crearNotificaciones(
            {
              autor: evento.autor,
              destinatarios: [tarea.id_practicante],
              tipo: 'PULL_REQUEST_CERRADO_POR_OTRA_PERSONA',
              mensaje: `Cerraron el Pull Request de ${referenciaTarea(proyecto, tarea)}.`,
              elemento: { tipo: 'TAREA', id: tarea.id },
            },
            datos.usuarios,
            marca,
            e.generarId,
          );

    return {
      ok: true,
      valor: nueva,
      cambios: conEfectos(
        datos,
        { tareas: reemplazarTarea(datos.tareas, nueva) },
        { eventos: [evento], notificaciones: avisos },
      ),
    };
  });
}

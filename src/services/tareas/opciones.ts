/**
 * Servicios de las dos opciones de una tarea: «Requiere supervisión» y «Requiere PR» (Fase 2, paso 5C).
 *
 * Mismo orden que 5A: Zod → actor → tarea → regla de `domain/` → texto ausente → «sin cambios» →
 * escritura. `valor` es el valor deseado (`true` = activar, `false` = desactivar).
 *
 * «Requiere PR» (D3-A, D5-A):
 *   - activar → `TAREA_OPCIONES_CAMBIADAS`; desactivar, con cualquier rol → `PULL_REQUEST_NO_REQUERIDO`;
 *   - `siguienteEstadoPR` aplica C1: activar en ESPERANDO_SUPERVISION o TERMINADA sin `estado_pr` lo
 *     pasa a PENDIENTE; desactivar nunca lo cambia (la etiqueta la oculta `etiquetaPRVisible`);
 *   - solo cuando actúa el practicante se avisa al supervisor del proyecto (§8.1).
 */

import { z } from 'zod';
import {
  puedeCambiarRequierePR,
  puedeCambiarRequiereSupervision,
  siguienteEstadoPR,
  type Tarea,
} from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { cambio } from '../historial';
import { crearNotificaciones } from '../notificaciones';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { conEfectos, ejecutarServicio } from '../transaccional';
import {
  cargarContextoTarea,
  esquemaId,
  esquemaTextoOpcional,
  eventoDeTarea,
  exigirTexto,
  referenciaTarea,
  reemplazarTarea,
  textoGuardado,
} from './comun';

const esquemaRequiereSupervision = z.object({
  idActor: esquemaId,
  idTarea: esquemaId,
  valor: z.boolean(),
});
const esquemaRequierePR = esquemaRequiereSupervision.extend({ motivo: esquemaTextoOpcional });

export type EntradaRequiereSupervision = z.input<typeof esquemaRequiereSupervision>;
export type EntradaRequierePR = z.input<typeof esquemaRequierePR>;

// ── Requiere supervisión ─────────────────────────────────────────────────────────────────────

/**
 * Activa o desactiva «Requiere supervisión» (§6.3): solo Administrador y Supervisor del proyecto, y
 * solo con la tarea DISPONIBLE o EN_PROGRESO. Sin aviso (§8.1 no lo lista).
 */
export function cambiarRequiereSupervision(
  entrada: EntradaRequiereSupervision,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Tarea>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaRequiereSupervision, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;

    const contexto = cargarContextoTarea(datos, v.idActor, v.idTarea);
    if (!contexto.ok) return contexto;
    const { actor, tarea, proyecto, asignaciones } = contexto.valor;

    const permiso = puedeCambiarRequiereSupervision(tarea, actor, { proyecto, asignaciones });
    if (!permiso.permitido) return denegar(permiso);
    if (v.valor === tarea.requiere_supervision) return fallo('SIN_CAMBIOS');

    const nueva: Tarea = { ...tarea, requiere_supervision: v.valor };
    const evento = eventoDeTarea(
      {
        actor,
        proyecto,
        tarea: nueva,
        tipo_accion: 'TAREA_OPCIONES_CAMBIADAS',
        cambios: [cambio('requiere_supervision', tarea.requiere_supervision, v.valor)],
      },
      marca,
      e.generarId,
    );

    return {
      ok: true,
      valor: nueva,
      cambios: conEfectos(
        datos,
        { tareas: reemplazarTarea(datos.tareas, nueva) },
        { eventos: [evento] },
      ),
    };
  });
}

// ── Requiere PR ──────────────────────────────────────────────────────────────────────────────

/**
 * Activa o desactiva «Requiere PR» (§4, §7.4, §7.5). Administrador y Supervisor, ambas cosas; el
 * practicante responsable solo desactiva, con motivo. Nadie lo cambia si la tarea ya tuvo PR. No se
 * restringe por el estado de la tarea.
 */
export function cambiarRequierePR(
  entrada: EntradaRequierePR,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Tarea>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaRequierePR, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;

    const contexto = cargarContextoTarea(datos, v.idActor, v.idTarea);
    if (!contexto.ok) return contexto;
    const { actor, tarea, proyecto, asignaciones } = contexto.valor;

    // `puede()` → PR existente → motivo vacío.
    const permiso = puedeCambiarRequierePR(
      tarea,
      actor,
      { proyecto, asignaciones },
      v.valor,
      v.motivo,
    );
    if (!permiso.permitido) return denegar(permiso);
    // Motivo ausente del practicante: `domain/` lo deja pasar, el servicio no.
    const sinTexto = exigirTexto(permiso.exige_texto, v.motivo);
    if (sinTexto !== null) return sinTexto;
    if (v.valor === tarea.requiere_pr) return fallo('SIN_CAMBIOS');

    // C1, sobre la tarea original: el evento no mira `requiere_pr`, solo el estado y `estado_pr`.
    const pr = siguienteEstadoPR(tarea, { tipo: 'REQUIERE_PR_CAMBIADO', valor: v.valor });
    if (!pr.aplica) return denegar(pr);

    const nueva: Tarea = { ...tarea, requiere_pr: v.valor, estado_pr: pr.estado_pr };
    const cambios = [cambio('requiere_pr', tarea.requiere_pr, v.valor)];
    if (pr.estado_pr !== tarea.estado_pr) {
      cambios.push(cambio('estado_pr', tarea.estado_pr, pr.estado_pr));
    }
    const evento = eventoDeTarea(
      {
        actor,
        proyecto,
        tarea: nueva,
        tipo_accion: v.valor ? 'TAREA_OPCIONES_CAMBIADAS' : 'PULL_REQUEST_NO_REQUERIDO',
        cambios,
        nota: textoGuardado(v.motivo),
      },
      marca,
      e.generarId,
    );
    // §8.1: solo cuando el practicante marca «No requiere PR» (no puede activarlo).
    const avisos =
      actor.rol === 'PRACTICANTE'
        ? crearNotificaciones(
            {
              autor: evento.autor,
              destinatarios: [proyecto.id_supervisor],
              tipo: 'PULL_REQUEST_NO_REQUERIDO_POR_PRACTICANTE',
              mensaje: `${actor.nombre} marcó ${referenciaTarea(proyecto, tarea)} como «No requiere PR».`,
              elemento: { tipo: 'TAREA', id: tarea.id },
            },
            datos.usuarios,
            marca,
            e.generarId,
          )
        : [];

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

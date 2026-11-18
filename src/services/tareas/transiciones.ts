/**
 * Servicios de las 7 transiciones de tarea de §6.2 (Fase 2, paso 5B).
 *
 * Una función exportada por acción (plan §4.4). Todas comparten `ejecutarTransicion`, con el mismo
 * orden que 5A:
 *   Zod → actor → tarea → `puedeTransicionar` (puede → estado → condición → texto vacío) →
 *   texto ausente → efecto propio de la transición → evento + aviso → una sola escritura.
 *
 * Reglas que viven aquí y no en `domain/`:
 *   - `fecha_termino` sale de la marca (el mismo instante que el evento que cierra la tarea) al
 *     terminar o aprobar, y vuelve a `null` al reabrir;
 *   - enviar y terminar recalculan `estado_pr` con `siguienteEstadoPR` y, si ya hubo PR, consultan
 *     antes a GitHub (`entorno.github`); aprobar **no** recalcula (S5);
 *   - devolver y reabrir conservan al responsable aunque ya no pueda trabajar (D6-A);
 *   - el aviso va al responsable **anterior** a la transición; `crearNotificaciones` descarta al
 *     autor (por eso liberar la tarea propia no avisa a nadie).
 */

import { z, type ZodType } from 'zod';
import type { DatosAlmacen } from '@/data';
import {
  necesitaConsultaGitHub,
  puedeTransicionar,
  siguienteEstadoPR,
  type AccionTransicion,
  type CambioRegistrado,
  type EstadoPR,
  type Id,
  type Tarea,
  type TipoAccionHistorial,
  type TipoNotificacion,
} from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import type { PuertoGitHub } from '../github';
import { cambio } from '../historial';
import type { Marca } from '../marca';
import { crearNotificaciones } from '../notificaciones';
import { denegar, validarEntrada, type Fallo, type Resultado } from '../resultado';
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
  type ContextoTareaServicio,
} from './comun';

// ── Entradas ─────────────────────────────────────────────────────────────────────────────────

const esquemaTransicion = z.object({ idActor: esquemaId, idTarea: esquemaId });
const esquemaLiberar = esquemaTransicion.extend({ motivo: esquemaTextoOpcional });
const esquemaConNota = esquemaTransicion.extend({ nota: esquemaTextoOpcional });

export type EntradaTransicion = z.input<typeof esquemaTransicion>;
export type EntradaLiberar = z.input<typeof esquemaLiberar>;
export type EntradaConNota = z.input<typeof esquemaConNota>;

interface EntradaValida {
  idActor: Id;
  idTarea: Id;
  motivo?: string;
  nota?: string;
}

// ── Ayudante común ───────────────────────────────────────────────────────────────────────────

interface ContextoEfecto extends ContextoTareaServicio {
  entrada: EntradaValida;
  datos: DatosAlmacen;
  marca: Marca;
  github: PuertoGitHub;
}

interface Aviso {
  destinatario: Id;
  tipo: TipoNotificacion;
  mensaje: string;
}

/** Lo que cada transición cambia, además del estado (que pone y registra el ayudante). */
interface Efecto {
  tarea: Tarea;
  /** Cambios que van después del de `estado` en el evento. */
  cambios?: CambioRegistrado[];
  nota?: string | null;
  aviso?: Aviso | null;
}

function ejecutarTransicion<V extends EntradaValida>(
  transicion: AccionTransicion,
  tipo_accion: TipoAccionHistorial,
  esquema: ZodType<V>,
  entrada: unknown,
  entorno: Entorno,
  efecto: (contexto: ContextoEfecto) => Efecto | Fallo,
): Promise<Resultado<Tarea>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquema, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;

    const contexto = cargarContextoTarea(datos, v.idActor, v.idTarea);
    if (!contexto.ok) return contexto;
    const { actor, tarea, proyecto, asignaciones } = contexto.valor;

    // Quién, estado, condición (pausa, supervisión) y texto vacío: todo en `domain/`.
    const permiso = puedeTransicionar(tarea, actor, { proyecto, asignaciones }, transicion, {
      motivo: v.motivo,
      nota: v.nota,
    });
    if (!permiso.permitido) return denegar(permiso);
    // Texto ausente: `domain/` lo deja pasar (la interfaz abre el modal), el servicio no.
    const texto = permiso.exige_texto === 'MOTIVO' ? v.motivo : v.nota;
    const sinTexto = exigirTexto(permiso.exige_texto, texto);
    if (sinTexto !== null) return sinTexto;

    const resultado = efecto({ ...contexto.valor, entrada: v, datos, marca, github: e.github });
    if ('ok' in resultado) return resultado;

    const nueva = resultado.tarea;
    const evento = eventoDeTarea(
      {
        actor,
        proyecto,
        tarea: nueva,
        tipo_accion,
        cambios: [cambio('estado', tarea.estado, nueva.estado), ...(resultado.cambios ?? [])],
        nota: resultado.nota ?? null,
      },
      marca,
      e.generarId,
    );
    const aviso = resultado.aviso ?? null;
    const avisos =
      aviso === null
        ? []
        : crearNotificaciones(
            {
              autor: evento.autor,
              destinatarios: [aviso.destinatario],
              tipo: aviso.tipo,
              mensaje: aviso.mensaje,
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

/** Nombre de una persona para el historial (copia, como en la semilla). */
function nombreDe(datos: Pick<DatosAlmacen, 'usuarios'>, id: Id): string {
  const usuario = datos.usuarios.find((u) => u.id === id);
  if (usuario === undefined) throw new Error(`No existe la persona ${id}.`);
  return usuario.nombre;
}

/** Aviso al responsable anterior; ninguno si la tarea no lo tenía. */
function avisoAlResponsable(tarea: Tarea, tipo: TipoNotificacion, mensaje: string): Aviso | null {
  return tarea.id_practicante === null
    ? null
    : { destinatario: tarea.id_practicante, tipo, mensaje };
}

/**
 * `estado_pr` al llegar a ESPERANDO_SUPERVISION o TERMINADA (§7.4). Si ya hubo PR, GitHub dice cómo
 * está (nunca se adivina); si no, `domain/` decide sin consultar. Un `FALTA_CONSULTA_GITHUB` sería un
 * error de programación: se devuelve como fallo con su mensaje y no se escribe nada.
 */
function estadoPRAlLlegar(
  tarea: Tarea,
  github: PuertoGitHub,
): { estado_pr: EstadoPR | null; cambios: CambioRegistrado[] } | Fallo {
  const consulta = necesitaConsultaGitHub(tarea) ? github.consultarPullRequest(tarea) : undefined;
  const pr = siguienteEstadoPR(tarea, { tipo: 'TAREA_ENVIADA_O_TERMINADA', github: consulta });
  if (!pr.aplica) return denegar(pr);
  const cambios =
    pr.estado_pr === tarea.estado_pr ? [] : [cambio('estado_pr', tarea.estado_pr, pr.estado_pr)];
  return { estado_pr: pr.estado_pr, cambios };
}

// ── Las 7 transiciones ───────────────────────────────────────────────────────────────────────

/** DISPONIBLE → EN_PROGRESO. El practicante del proyecto la toma; no si el proyecto está en pausa. */
export function tomarTarea(
  entrada: EntradaTransicion,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Tarea>> {
  return ejecutarTransicion('TOMAR', 'TAREA_TOMADA', esquemaTransicion, entrada, entorno, (c) => ({
    tarea: { ...c.tarea, estado: 'EN_PROGRESO', id_practicante: c.actor.id },
    cambios: [cambio('responsable', null, c.actor.nombre)],
  }));
}

/**
 * EN_PROGRESO → DISPONIBLE. El responsable (motivo opcional) o el Administrador / Supervisor (motivo
 * obligatorio). PR, URL y ramas se conservan; la marca «Devuelta» también (se deriva del historial).
 */
export function liberarTarea(
  entrada: EntradaLiberar,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Tarea>> {
  return ejecutarTransicion('LIBERAR', 'TAREA_LIBERADA', esquemaLiberar, entrada, entorno, (c) => ({
    tarea: { ...c.tarea, estado: 'DISPONIBLE', id_practicante: null },
    cambios: [
      cambio(
        'responsable',
        c.tarea.id_practicante === null ? null : nombreDe(c.datos, c.tarea.id_practicante),
        null,
      ),
    ],
    nota: textoGuardado(c.entrada.motivo),
    aviso: avisoAlResponsable(
      c.tarea,
      'TAREA_LIBERADA',
      `Liberaron tu tarea ${referenciaTarea(c.proyecto, c.tarea)}.`,
    ),
  }));
}

/** EN_PROGRESO → ESPERANDO_SUPERVISION (solo con «Requiere supervisión»). Avisa al supervisor. */
export function enviarTareaASupervision(
  entrada: EntradaTransicion,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Tarea>> {
  return ejecutarTransicion(
    'ENVIAR_A_SUPERVISION',
    'TAREA_ENVIADA_A_SUPERVISION',
    esquemaTransicion,
    entrada,
    entorno,
    (c) => {
      const pr = estadoPRAlLlegar(c.tarea, c.github);
      if ('ok' in pr) return pr;
      return {
        tarea: { ...c.tarea, estado: 'ESPERANDO_SUPERVISION', estado_pr: pr.estado_pr },
        cambios: pr.cambios,
        aviso: {
          destinatario: c.proyecto.id_supervisor,
          tipo: 'TAREA_ENVIADA_A_SUPERVISION',
          mensaje: `${c.actor.nombre} envió ${referenciaTarea(c.proyecto, c.tarea)} a supervisión.`,
        },
      };
    },
  );
}

/** EN_PROGRESO → TERMINADA (solo sin «Requiere supervisión»). Sin aviso (§8.1). */
export function marcarTareaTerminada(
  entrada: EntradaTransicion,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Tarea>> {
  return ejecutarTransicion(
    'MARCAR_TERMINADA',
    'TAREA_TERMINADA',
    esquemaTransicion,
    entrada,
    entorno,
    (c) => {
      const pr = estadoPRAlLlegar(c.tarea, c.github);
      if ('ok' in pr) return pr;
      return {
        tarea: {
          ...c.tarea,
          estado: 'TERMINADA',
          estado_pr: pr.estado_pr,
          fecha_termino: c.marca.ahora,
        },
        cambios: pr.cambios,
      };
    },
  );
}

/** ESPERANDO_SUPERVISION → TERMINADA. El supervisor del proyecto; no recalcula el PR (S5). */
export function aprobarTarea(
  entrada: EntradaTransicion,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Tarea>> {
  return ejecutarTransicion(
    'APROBAR',
    'TAREA_APROBADA',
    esquemaTransicion,
    entrada,
    entorno,
    (c) => ({
      tarea: { ...c.tarea, estado: 'TERMINADA', fecha_termino: c.marca.ahora },
      aviso: avisoAlResponsable(
        c.tarea,
        'TAREA_APROBADA',
        `Aprobaron tu tarea ${referenciaTarea(c.proyecto, c.tarea)}.`,
      ),
    }),
  );
}

/** ESPERANDO_SUPERVISION → EN_PROGRESO con nota. Conserva al responsable (D6-A). */
export function devolverTarea(
  entrada: EntradaConNota,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Tarea>> {
  return ejecutarTransicion(
    'DEVOLVER',
    'TAREA_DEVUELTA',
    esquemaConNota,
    entrada,
    entorno,
    (c) => ({
      tarea: { ...c.tarea, estado: 'EN_PROGRESO' },
      nota: textoGuardado(c.entrada.nota),
      aviso: avisoAlResponsable(
        c.tarea,
        'TAREA_DEVUELTA',
        `Devolvieron tu tarea ${referenciaTarea(c.proyecto, c.tarea)} con observaciones.`,
      ),
    }),
  );
}

/** TERMINADA → EN_PROGRESO con nota. Limpia `fecha_termino` y conserva al responsable (D6-A). */
export function reabrirTarea(
  entrada: EntradaConNota,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Tarea>> {
  return ejecutarTransicion(
    'REABRIR',
    'TAREA_REABIERTA',
    esquemaConNota,
    entrada,
    entorno,
    (c) => ({
      tarea: { ...c.tarea, estado: 'EN_PROGRESO', fecha_termino: null },
      nota: textoGuardado(c.entrada.nota),
      aviso: avisoAlResponsable(
        c.tarea,
        'TAREA_REABIERTA',
        `Reabrieron tu tarea ${referenciaTarea(c.proyecto, c.tarea)}.`,
      ),
    }),
  );
}

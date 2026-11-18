/**
 * Piezas comunes de los servicios de tareas (Fase 2, paso 5).
 *
 * Orden de comprobación que siguen todos los servicios de tareas:
 *   Zod (forma y formato) → actor → tarea o proyecto → regla de `domain/` → texto ausente →
 *   «sin cambios» → escritura.
 *
 * Zod **no** valida que el motivo o la nota tengan contenido: solo que, si vienen, sean texto. Si
 * rechazara aquí un motivo vacío, se saltaría el orden de `domain/` (por ejemplo, eliminar una
 * tarea con PR y motivo vacío debe responder `TAREA_YA_TIENE_PR`, no un error de texto). El texto
 * vacío lo rechaza `domain/` (`TEXTO_OBLIGATORIO`) y el texto ausente, `exigirTexto`.
 */

import { z } from 'zod';
import type { DatosAlmacen } from '@/data';
import {
  formatearIdLegible,
  type Asignacion,
  type CambioRegistrado,
  type EventoHistorial,
  type Id,
  type Proyecto,
  type Tarea,
  type TextoExigido,
  type TipoAccionHistorial,
  type Usuario,
} from '@/domain';
import { obtenerActor } from '../actor';
import { etiquetaTarea } from '../etiquetas';
import { autorDe, crearEvento } from '../historial';
import type { Marca } from '../marca';
import { exito, fallo, type Fallo, type Resultado } from '../resultado';

// ── Esquemas de entrada ──────────────────────────────────────────────────────────────────────

export const esquemaId = z.string().min(1, 'Falta el identificador.');

/** Motivo o nota: opcional y sin exigir contenido (ver la cabecera). */
export const esquemaTextoOpcional = z.string().optional();

export const esquemaTitulo = z.string().trim().min(1, 'Escribe un título.');

export const esquemaDescripcion = z
  .string()
  .trim()
  .min(1, 'Escribe la descripción: qué se espera y cuándo se considera terminada.');

/** `YYYY-MM-DD` con una fecha que existe en el calendario (`2026-02-30` no vale). */
export function esFechaDeCalendario(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

/** Fecha límite: obligatoria y válida. No se exige que sea futura (decisión D7-A). */
export const esquemaFechaLimite = z
  .string()
  .refine(esFechaDeCalendario, 'La fecha límite no es válida.');

// ── Carga del contexto ───────────────────────────────────────────────────────────────────────

/** Asignaciones **de quien actúa** (no las del proyecto): es lo que pide `puede()`. */
export function asignacionesDe(datos: Pick<DatosAlmacen, 'asignaciones'>, idUsuario: Id) {
  return datos.asignaciones.filter((a) => a.id_practicante === idUsuario);
}

export interface ContextoProyectoServicio {
  actor: Usuario;
  proyecto: Proyecto;
  asignaciones: Asignacion[];
}

export interface ContextoTareaServicio extends ContextoProyectoServicio {
  tarea: Tarea;
}

/** Actor → proyecto. Para las acciones que aún no tienen tarea (crear). */
export function cargarContextoProyecto(
  datos: Pick<DatosAlmacen, 'usuarios' | 'proyectos' | 'asignaciones'>,
  idActor: Id,
  idProyecto: Id,
): Resultado<ContextoProyectoServicio> {
  const actor = obtenerActor(datos, idActor);
  if (!actor.ok) return actor;
  const proyecto = datos.proyectos.find((p) => p.id === idProyecto);
  if (proyecto === undefined) return fallo('NO_ENCONTRADO');
  return exito({ actor: actor.valor, proyecto, asignaciones: asignacionesDe(datos, idActor) });
}

/** Actor → tarea → su proyecto. Una tarea sin proyecto es un dato roto: `NO_ENCONTRADO`. */
export function cargarContextoTarea(
  datos: Pick<DatosAlmacen, 'usuarios' | 'proyectos' | 'asignaciones' | 'tareas'>,
  idActor: Id,
  idTarea: Id,
): Resultado<ContextoTareaServicio> {
  const actor = obtenerActor(datos, idActor);
  if (!actor.ok) return actor;
  const tarea = datos.tareas.find((t) => t.id === idTarea);
  if (tarea === undefined) return fallo('NO_ENCONTRADO');
  const proyecto = datos.proyectos.find((p) => p.id === tarea.id_proyecto);
  if (proyecto === undefined) return fallo('NO_ENCONTRADO');
  return exito({
    actor: actor.valor,
    tarea,
    proyecto,
    asignaciones: asignacionesDe(datos, idActor),
  });
}

// ── Texto exigido ────────────────────────────────────────────────────────────────────────────

/**
 * `domain/` deja pasar un texto **ausente** (`undefined` = «todavía no se escribió», para que la
 * interfaz abra el modal). El servicio no puede: si la acción exige motivo o nota y no llegó,
 * responde `TEXTO_OBLIGATORIO`.
 */
export function exigirTexto(exigido: TextoExigido, texto: string | undefined): Fallo | null {
  if (exigido === null) return null;
  return texto === undefined || texto.trim() === '' ? fallo('TEXTO_OBLIGATORIO') : null;
}

/** El texto que se guarda en el evento: recortado, o `null` si no hay. */
export function textoGuardado(texto: string | undefined): string | null {
  const recortado = texto?.trim() ?? '';
  return recortado === '' ? null : recortado;
}

// ── Escritura ────────────────────────────────────────────────────────────────────────────────

/** Lista nueva con la tarea reemplazada. No cambia la original. */
export function reemplazarTarea(tareas: readonly Tarea[], nueva: Tarea): Tarea[] {
  return tareas.map((t) => (t.id === nueva.id ? nueva : t));
}

/** `«Menú principal» (PL2D-004)`, para los mensajes de las notificaciones. */
export function referenciaTarea(
  proyecto: Pick<Proyecto, 'codigo'>,
  tarea: Pick<Tarea, 'numero' | 'titulo'>,
): string {
  const id = formatearIdLegible(proyecto.codigo, tarea.numero);
  if (!id.ok) throw new Error(id.mensaje);
  return `«${tarea.titulo}» (${id.id})`;
}

export interface EntradaEventoTarea {
  actor: Pick<Usuario, 'id'>;
  proyecto: Pick<Proyecto, 'id' | 'codigo'>;
  /** La tarea como queda (su título va en la etiqueta del evento). */
  tarea: Pick<Tarea, 'id' | 'numero' | 'titulo'>;
  tipo_accion: TipoAccionHistorial;
  cambios: readonly CambioRegistrado[];
  nota?: string | null;
}

/** Evento de una tarea: autor, etiqueta `PL2D-018 · Título` e `id_proyecto` siempre presentes. */
export function eventoDeTarea(
  entrada: EntradaEventoTarea,
  marca: Marca,
  generarId: (prefijo: string) => Id,
): EventoHistorial {
  return crearEvento(
    {
      autor: autorDe(entrada.actor.id),
      tipo_accion: entrada.tipo_accion,
      elemento: {
        tipo: 'TAREA',
        id: entrada.tarea.id,
        etiqueta: etiquetaTarea(entrada.proyecto, entrada.tarea),
      },
      id_proyecto: entrada.proyecto.id,
      cambios: entrada.cambios,
      nota: entrada.nota ?? null,
    },
    marca,
    generarId,
  );
}

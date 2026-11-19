/**
 * Responsable de una tarea que requiere atención (Fase 4; decisión D6-A del paso 5, propuesta §6.5).
 *
 * Devolver o reabrir una tarea **conserva al responsable** aunque ya no pueda trabajar en ella (su cuenta quedó
 * INACTIVA o su asignación al proyecto tiene baja). La tarea queda EN_PROGRESO a nombre de alguien que no la va a
 * terminar, y el Administrador o el Supervisor deben poder verlo para liberarla con un motivo.
 *
 * Esta función solo decide **si hay algo que señalar y por qué**; el texto y quién lo ve son de la interfaz y de la
 * consulta. Una tarea en otro estado no se señala: DISPONIBLE no tiene responsable, y las que esperan supervisión o
 * están terminadas ya no dependen de su trabajo.
 *
 * No importa React, Zustand, `data/` ni `services/`.
 */

import type { Asignacion } from './proyectos';
import type { Tarea } from './tareas';
import type { Usuario } from './usuarios';

export const MOTIVOS_ATENCION_RESPONSABLE = [
  'CUENTA_INACTIVA',
  'CUENTA_NO_ENCONTRADA',
  'SIN_ASIGNACION_VIGENTE',
] as const;

export type MotivoAtencionResponsable = (typeof MOTIVOS_ATENCION_RESPONSABLE)[number];

/**
 * Los motivos por los que el responsable de una tarea EN_PROGRESO ya no puede seguir con ella, en el orden de
 * `MOTIVOS_ATENCION_RESPONSABLE`; `[]` si no hay nada que señalar.
 *
 * - `responsable`: la cuenta del responsable; `undefined` si no se encontró.
 * - `asignaciones`: las asignaciones de **ese responsable** (cualquier proyecto; aquí solo cuenta la de esta tarea).
 */
export function motivosDeAtencionDelResponsable(
  tarea: Pick<Tarea, 'estado' | 'id_practicante' | 'id_proyecto'>,
  responsable: Pick<Usuario, 'estado'> | undefined,
  asignaciones: readonly Pick<Asignacion, 'id_practicante' | 'id_proyecto' | 'fecha_baja'>[],
): MotivoAtencionResponsable[] {
  const { id_practicante: idResponsable } = tarea;
  if (tarea.estado !== 'EN_PROGRESO' || idResponsable === null) return [];

  const motivos: MotivoAtencionResponsable[] = [];
  if (responsable === undefined) motivos.push('CUENTA_NO_ENCONTRADA');
  else if (responsable.estado !== 'ACTIVO') motivos.push('CUENTA_INACTIVA');

  const vigente = asignaciones.some(
    (a) =>
      a.id_practicante === idResponsable &&
      a.id_proyecto === tarea.id_proyecto &&
      a.fecha_baja === null,
  );
  if (!vigente) motivos.push('SIN_ASIGNACION_VIGENTE');
  return motivos;
}

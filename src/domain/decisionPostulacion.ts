/**
 * Decisión sobre una postulación (Fase 2, paso 7A; propuesta §5.1).
 *
 * Las únicas transiciones del estado de una postulación:
 *   - APROBAR:      PENDIENTE → APROBADA (crea la cuenta del practicante; lo hace el servicio).
 *   - RECHAZAR:     PENDIENTE → RECHAZADA (exige motivo).
 *   - RECONSIDERAR: RECHAZADA → PENDIENTE (exige nota). Una postulación aprobada no se revierte aquí:
 *     si hace falta, se finaliza al practicante.
 *
 * Esta función decide solo el **estado**. Quién puede (rol, usuario activo) y qué texto se exige
 * es de `puede()` (`APROBAR_/RECHAZAR_/RECONSIDERAR_POSTULACION`). El servicio y la pantalla (qué
 * botón se ve) consultan la misma regla, como con `transicionesDisponibles` en las tareas.
 *
 * No importa React, Zustand, `data/` ni `services/`.
 */

import type { EstadoPostulacion } from './enumeraciones';

export const ACCIONES_DECISION_POSTULACION = ['APROBAR', 'RECHAZAR', 'RECONSIDERAR'] as const;

export type AccionDecisionPostulacion = (typeof ACCIONES_DECISION_POSTULACION)[number];

export const CODIGOS_DECISION_POSTULACION = [
  'POSTULACION_NO_PENDIENTE',
  'POSTULACION_NO_RECHAZADA',
] as const;

export type CodigoDecisionPostulacion = (typeof CODIGOS_DECISION_POSTULACION)[number];

export interface TransicionPostulacion {
  desde: EstadoPostulacion;
  hasta: EstadoPostulacion;
  codigo: CodigoDecisionPostulacion;
  mensaje: string;
}

const SOLO_PENDIENTE = {
  desde: 'PENDIENTE',
  codigo: 'POSTULACION_NO_PENDIENTE',
  mensaje: 'Solo se puede aprobar o rechazar una postulación pendiente.',
} as const;

export const TRANSICIONES_POSTULACION: Readonly<
  Record<AccionDecisionPostulacion, TransicionPostulacion>
> = {
  APROBAR: { ...SOLO_PENDIENTE, hasta: 'APROBADA' },
  RECHAZAR: { ...SOLO_PENDIENTE, hasta: 'RECHAZADA' },
  RECONSIDERAR: {
    desde: 'RECHAZADA',
    hasta: 'PENDIENTE',
    codigo: 'POSTULACION_NO_RECHAZADA',
    mensaje:
      'Solo se puede reconsiderar una postulación rechazada. Una aprobada no se revierte aquí: finaliza al practicante.',
  },
};

export type ResultadoDecisionPostulacion =
  | { ok: true; estado_nuevo: EstadoPostulacion }
  | { ok: false; codigo: CodigoDecisionPostulacion; mensaje: string };

/** ¿Se puede ejecutar la decisión con la postulación en este estado? */
export function puedeDecidirPostulacion(
  estado: EstadoPostulacion,
  accion: AccionDecisionPostulacion,
): ResultadoDecisionPostulacion {
  const transicion = TRANSICIONES_POSTULACION[accion];
  if (estado !== transicion.desde) {
    return { ok: false, codigo: transicion.codigo, mensaje: transicion.mensaje };
  }
  return { ok: true, estado_nuevo: transicion.hasta };
}

/** Las decisiones que se pueden tomar en este estado (los botones que la pantalla puede mostrar). */
export function decisionesDisponibles(estado: EstadoPostulacion): AccionDecisionPostulacion[] {
  return ACCIONES_DECISION_POSTULACION.filter(
    (accion) => puedeDecidirPostulacion(estado, accion).ok,
  );
}

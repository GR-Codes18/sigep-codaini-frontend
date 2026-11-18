/**
 * Validación de un bloque de criterios (Fase 2, paso 7B; propuesta §5.1).
 *
 * Un bloque es el conjunto de criterios de una evaluación: los generales del área (`AREA`) o los de una
 * especialidad (`ESPECIALIDAD`). Para que el sistema pueda calcular el puntaje, los criterios **activos**
 * del bloque deben ser enteros mayores que 0 y sumar 100; si no hay ninguno, tampoco se calcula.
 *
 * Es la misma regla que aplica `calcularPuntaje` (mismos códigos y mismos mensajes), pero aquí se puede
 * preguntar **antes** de guardar, y la pantalla puede mostrar «Suma actual: 95/100» con la misma regla.
 * Una prueba compara las dos para que no se separen. No toca `puntaje.ts`.
 *
 * Orden de comprobación: sin criterios activos → peso inválido → suma distinta de 100.
 *
 * No importa React, Zustand, `data/` ni `services/`.
 */

import type { BloqueCriterio } from './enumeraciones';
import type { CriterioEvaluacion } from './postulaciones';

/** Suma que deben alcanzar los pesos activos de un bloque. */
export const PESO_TOTAL_BLOQUE = 100;

export const CODIGOS_BLOQUE_CRITERIOS = [
  'BLOQUE_SIN_CRITERIOS',
  'PESO_INVALIDO',
  'PESOS_NO_SUMAN_100',
] as const;

export type CodigoBloqueCriterios = (typeof CODIGOS_BLOQUE_CRITERIOS)[number];

export type ResultadoBloqueCriterios =
  | { ok: true; suma: number }
  | { ok: false; codigo: CodigoBloqueCriterios; mensaje: string; suma: number };

const NOMBRE_BLOQUE: Record<BloqueCriterio, string> = {
  AREA: 'del área',
  ESPECIALIDAD: 'de la especialidad',
};

/** Suma de los pesos de los criterios activos (lo que la pantalla muestra como «suma actual»). */
export function sumaPesosActivos(
  criterios: readonly Pick<CriterioEvaluacion, 'peso' | 'activo'>[],
) {
  return criterios.filter((c) => c.activo).reduce((suma, c) => suma + c.peso, 0);
}

/** ¿Los criterios activos de este bloque permiten calcular un puntaje? No modifica la entrada. */
export function validarBloqueCriterios(
  criterios: readonly Pick<CriterioEvaluacion, 'peso' | 'activo'>[],
  bloque: BloqueCriterio,
): ResultadoBloqueCriterios {
  const activos = criterios.filter((c) => c.activo);
  const suma = sumaPesosActivos(criterios);
  const nombre = NOMBRE_BLOQUE[bloque];

  if (activos.length === 0) {
    return {
      ok: false,
      codigo: 'BLOQUE_SIN_CRITERIOS',
      mensaje: `El bloque ${nombre} no tiene criterios activos.`,
      suma,
    };
  }
  if (activos.some((c) => !Number.isInteger(c.peso) || c.peso <= 0)) {
    return {
      ok: false,
      codigo: 'PESO_INVALIDO',
      mensaje: `Los pesos del bloque ${nombre} deben ser números enteros mayores que 0.`,
      suma,
    };
  }
  if (suma !== PESO_TOTAL_BLOQUE) {
    return {
      ok: false,
      codigo: 'PESOS_NO_SUMAN_100',
      mensaje: `Los pesos de los criterios activos del bloque ${nombre} deben sumar ${PESO_TOTAL_BLOQUE}.`,
      suma,
    };
  }
  return { ok: true, suma };
}

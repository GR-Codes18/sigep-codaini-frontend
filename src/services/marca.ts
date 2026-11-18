/**
 * Marca de tiempo de una operación: un único instante que comparten todo lo que ella escribe.
 *
 * Así `Tarea.fecha_termino` y el evento que la cierra (`TAREA_TERMINADA` o `TAREA_APROBADA`) salen
 * del mismo instante, y los indicadores (tiempo de ciclo) no se descartan por unos milisegundos.
 * Se toma dentro de la transacción, después de la demora, para que el historial quede en orden.
 */

import { hoyEn, type Fecha, type FechaHora } from '@/domain';

export interface Marca {
  /** ISO 8601 en UTC con `Z`, como pide `domain/`. */
  readonly ahora: FechaHora;
  /** Hoy según la hora de Perú (UTC−5). */
  readonly hoy: Fecha;
}

export function crearMarca(ahora: Date): Marca {
  if (Number.isNaN(ahora.getTime())) {
    throw new RangeError('La marca de tiempo necesita una fecha válida.');
  }
  const iso = ahora.toISOString();
  return { ahora: iso, hoy: hoyEn(iso) };
}

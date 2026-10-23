/**
 * Tipos técnicos compartidos por el dominio.
 *
 * Solo alias de tipos: no hay lógica. Los valores viajan como texto para
 * sobrevivir a la persistencia en localStorage.
 */

import type { TipoElemento } from './enumeraciones';

/** Identificador de cualquier entidad. Es el `id_usuario` cuando apunta a una persona. */
export type Id = string;

/** Fecha de calendario en formato `YYYY-MM-DD` (sin hora ni zona horaria). */
export type Fecha = string;

/** Instante en formato ISO 8601 UTC (por ejemplo `2026-10-22T14:30:00.000Z`). */
export type FechaHora = string;

/** Hora de reloj en formato `HH:mm` (24 horas), para la reunión semanal. */
export type Hora = string;

/** Referencia mínima a una entidad de cualquier módulo (historial, insights, avisos). */
export interface ReferenciaElemento {
  tipo: TipoElemento;
  id: Id;
}

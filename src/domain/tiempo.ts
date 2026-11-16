/**
 * Utilidades de tiempo de `domain/` (Fase 1, paso 9).
 *
 * Salen de `reglasInsights.ts` (paso 8) para que las usen también los indicadores y, más
 * adelante, el ciclo de vida (paso 10). Esta capa no lee el reloj: `ahora` siempre llega por
 * parámetro. No importa React, Zustand, `data/` ni `services/`.
 *
 * Reglas acordadas por los autores (DECISIONES.md, paso 8):
 *   - Los días son periodos completos de 24 h (`diasCompletos`, con `Math.floor`: 6 d 23 h = 6).
 *   - `hoy` sale de `ahora` cortando el día en la hora de Perú (UTC−5 fijo, sin horario de verano).
 *   - Una `Fecha` sin hora vale como el inicio de ese día en la hora de Perú.
 *   - `ahora` es ISO 8601 en UTC con `Z`.
 */

import type { Fecha, FechaHora } from './comunes';
import type { EventoHistorial } from './historial';

/** Hora de Perú (UTC−5 todo el año): corta el día de `hoy` y de las fechas sin hora. */
export const DESFASE_ZONA_HORARIA_MS = -5 * 60 * 60 * 1000;

export const MS_POR_DIA = 86_400_000;

/** ISO 8601 en UTC, como lo da `new Date().toISOString()` (los milisegundos son opcionales). */
const FORMATO_AHORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

/** `ahora` válido: ISO 8601 en UTC con `Z` y una fecha que existe. */
export function esAhoraValido(ahora: string): boolean {
  return FORMATO_AHORA.test(ahora) && !Number.isNaN(Date.parse(ahora));
}

/** Días completos de 24 h entre dos instantes en milisegundos (6 d 23 h = 6). */
export function diasCompletos(desde: number, hasta: number): number {
  return Math.floor((hasta - desde) / MS_POR_DIA);
}

/**
 * Fecha de calendario de `ahora` en la hora de Perú. `ahora` debe ser válido:
 * quien llama lo comprueba antes con `esAhoraValido`.
 */
export function hoyEn(ahora: FechaHora): Fecha {
  return new Date(Date.parse(ahora) + DESFASE_ZONA_HORARIA_MS).toISOString().slice(0, 10);
}

/** Inicio del día `fecha` en la hora de Perú, en milisegundos (`NaN` si la fecha no es válida). */
export function inicioDelDia(fecha: Fecha): number {
  return Date.parse(`${fecha}T00:00:00.000Z`) - DESFASE_ZONA_HORARIA_MS;
}

/** Días de calendario entre dos fechas (`NaN` si alguna no es válida). */
export function diasEntreFechas(desde: Fecha, hasta: Fecha): number {
  return (Date.parse(hasta) - Date.parse(desde)) / MS_POR_DIA;
}

/** Instante del evento más reciente, o `null` si no hay eventos. */
export function ultimaFecha(eventos: readonly EventoHistorial[]): number | null {
  return eventos.length === 0 ? null : Math.max(...eventos.map((e) => Date.parse(e.fecha)));
}

export function aFechaHora(ms: number): FechaHora {
  return new Date(ms).toISOString();
}

/**
 * Fechas de la práctica (Fase 1, paso 10; propuesta §5.2, §5.6 y §5.8).
 *
 * Tres cosas, todas puras y sin leer el reloj (`ahora` llega por parámetro):
 *   - La fecha de fin prevista: ingreso + duración en meses (valor configurable).
 *   - El aviso previo: cuántos días faltan y si la práctica está en el periodo de aviso.
 *   - El vencimiento: la fecha de fin ya pasó y la práctica sigue sin finalizar.
 *
 * Reglas acordadas por los autores (detalle en DECISIONES.md, paso 10):
 *   - Sumar meses conserva el día; si el mes destino es más corto, queda el último día de ese mes
 *     (31-oct + 4 meses = 28-feb o 29-feb en año bisiesto). No desborda al mes siguiente.
 *   - La duración va de 1 a 24 meses y el aviso de 1 a 365 días, enteros. La propuesta (§5.8) no
 *     define límites; sin tope, un número enorme saca la fecha del rango de `Date`.
 *   - «Hoy» es la fecha de calendario de `ahora` en hora de Perú (UTC−5), igual que en los insights.
 *   - Faltan días ≥ 0 hasta la fecha de fin: EN_CURSO si faltan más que el aviso; AVISO si faltan
 *     entre 1 y el aviso (el borde cuenta); FIN_HOY si faltan 0; VENCIDA si ya pasó (vencer hoy no
 *     es estar vencida). Es la misma regla que el insight «Fin de práctica» del paso 8.
 *   - Esta capa no decide cuándo se notifica: el servicio avisa una sola vez, cuando
 *     `dias_restantes` es igual al aviso configurado.
 *
 * Orden de comprobación: `fechaFinPrevista`: meses → fecha. `situacionFinPractica`: `ahora` →
 * aviso → fecha.
 *
 * No importa React, Zustand, `data/` ni `services/`.
 */

import type { Fecha, FechaHora } from './comunes';
import { diasEntreFechas, esAhoraValido, hoyEn } from './tiempo';

/** Códigos de error de esta capa. */
export const CODIGOS_PRACTICA = [
  'AHORA_INVALIDO',
  'MESES_INVALIDOS',
  'AVISO_INVALIDO',
  'FECHA_INVALIDA',
] as const;

export type CodigoPractica = (typeof CODIGOS_PRACTICA)[number];

/** Tope de la duración configurable (meses). La propuesta no lo define: regla de los autores. */
export const DURACION_MAXIMA_MESES = 24;

/** Tope del aviso previo configurable (días). La propuesta no lo define: regla de los autores. */
export const AVISO_MAXIMO_DIAS = 365;

export const SITUACIONES_FIN_PRACTICA = ['EN_CURSO', 'AVISO', 'FIN_HOY', 'VENCIDA'] as const;

export type SituacionFinPractica = (typeof SITUACIONES_FIN_PRACTICA)[number];

export type ErrorPractica<C extends CodigoPractica> = { ok: false; codigo: C; mensaje: string };

export type ResultadoFechaFin =
  { ok: true; fecha: Fecha } | ErrorPractica<'MESES_INVALIDOS' | 'FECHA_INVALIDA'>;

export type ResultadoSituacionFin =
  | {
      ok: true;
      situacion: SituacionFinPractica;
      /** Días de calendario hasta la fecha de fin; negativo si ya venció. */
      dias_restantes: number;
    }
  | ErrorPractica<'AHORA_INVALIDO' | 'AVISO_INVALIDO' | 'FECHA_INVALIDA'>;

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const ANIO_MAXIMO = 9999;

function error<C extends CodigoPractica>(codigo: C, mensaje: string): ErrorPractica<C> {
  return { ok: false, codigo, mensaje };
}

/** Último día del mes `mes` (1 a 12) del año `anio`. */
function diasDelMes(anio: number, mes: number): number {
  const fecha = new Date(0);
  // El día 0 del mes siguiente es el último día de este mes.
  fecha.setUTCFullYear(anio, mes, 0);
  return fecha.getUTCDate();
}

/** `[año, mes, día]` si `fecha` es una fecha de calendario `YYYY-MM-DD` real; si no, `null`. */
function partesDeFecha(fecha: string): [number, number, number] | null {
  if (!FORMATO_FECHA.test(fecha)) return null;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  if (mes < 1 || mes > 12) return null;
  if (dia < 1 || dia > diasDelMes(anio, mes)) return null;
  return [anio, mes, dia];
}

function formatearFecha(anio: number, mes: number, dia: number): Fecha {
  return `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Suma meses conservando el día; si el mes destino es más corto, queda su último día. */
function sumarMeses(fecha: Fecha, meses: number): Fecha | null {
  const partes = partesDeFecha(fecha);
  if (partes === null) return null;
  const [anio, mes, dia] = partes;
  const indice = anio * 12 + (mes - 1) + meses;
  const anioFin = Math.floor(indice / 12);
  const mesFin = (indice % 12) + 1;
  if (anioFin > ANIO_MAXIMO) return null;
  return formatearFecha(anioFin, mesFin, Math.min(dia, diasDelMes(anioFin, mesFin)));
}

/** Fecha de fin prevista: ingreso + `duracionMeses` (parámetro de Configuración, §5.8). */
export function fechaFinPrevista(fechaIngreso: Fecha, duracionMeses: number): ResultadoFechaFin {
  if (
    !Number.isInteger(duracionMeses) ||
    duracionMeses < 1 ||
    duracionMeses > DURACION_MAXIMA_MESES
  ) {
    return error(
      'MESES_INVALIDOS',
      `La duración debe ser un número entero de meses, entre 1 y ${DURACION_MAXIMA_MESES}.`,
    );
  }
  const fecha = sumarMeses(fechaIngreso, duracionMeses);
  if (fecha === null) {
    return error('FECHA_INVALIDA', 'La fecha de ingreso no es una fecha válida (AAAA-MM-DD).');
  }
  return { ok: true, fecha };
}

/**
 * En qué punto está la práctica respecto de su fecha de fin y del aviso previo (`avisoDias`,
 * parámetro de Configuración, §5.8).
 */
export function situacionFinPractica(
  fechaFin: Fecha,
  ahora: FechaHora,
  avisoDias: number,
): ResultadoSituacionFin {
  if (!esAhoraValido(ahora)) {
    return error(
      'AHORA_INVALIDO',
      'El momento del cálculo debe ser una fecha y hora ISO 8601 en UTC (terminada en Z).',
    );
  }
  if (!Number.isInteger(avisoDias) || avisoDias < 1 || avisoDias > AVISO_MAXIMO_DIAS) {
    return error(
      'AVISO_INVALIDO',
      `El aviso previo debe ser un número entero de días, entre 1 y ${AVISO_MAXIMO_DIAS}.`,
    );
  }
  if (partesDeFecha(fechaFin) === null) {
    return error('FECHA_INVALIDA', 'La fecha de fin no es una fecha válida (AAAA-MM-DD).');
  }

  const faltan = diasEntreFechas(hoyEn(ahora), fechaFin);
  const situacion: SituacionFinPractica =
    faltan < 0 ? 'VENCIDA' : faltan === 0 ? 'FIN_HOY' : faltan <= avisoDias ? 'AVISO' : 'EN_CURSO';
  return { ok: true, situacion, dias_restantes: faltan };
}

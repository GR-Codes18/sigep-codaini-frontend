/**
 * Reloj de la semilla: todas las fechas salen de un único `ahora` y se expresan como
 * «hace N días y H horas». Los instantes (`FechaHora`) se restan de `ahora`, así que nunca
 * quedan en el futuro a ninguna hora del día; las `Fecha` se cortan en la hora de Perú.
 */

import { hoyEn, type Fecha, type FechaHora } from '@/domain';

const MS_POR_HORA = 3_600_000;

/** `[días, horas]` antes de `ahora` (las horas son opcionales). */
export type Desfase = readonly [dias: number, horas?: number];

export interface Reloj {
  readonly ahora: FechaHora;
  /** Hoy en la hora de Perú. */
  readonly hoy: Fecha;
  /** Instante situado `dias` días y `horas` horas antes de `ahora`. */
  hace: (desfase: Desfase) => FechaHora;
  /** Fecha de calendario de hoy + `n` días (negativo = pasado). */
  dia: (n: number) => Fecha;
}

export function sumarDias(fecha: Fecha, n: number): Fecha {
  const resultado = new Date(`${fecha}T00:00:00.000Z`);
  resultado.setUTCDate(resultado.getUTCDate() + n);
  return resultado.toISOString().slice(0, 10);
}

/** Fecha de calendario (hora de Perú) de un instante. */
export function fechaDe(instante: FechaHora): Fecha {
  return hoyEn(instante);
}

export function crearReloj(ahora: Date): Reloj {
  const ms = ahora.getTime();
  if (Number.isNaN(ms)) throw new RangeError('La semilla necesita un «ahora» válido.');
  const iso = new Date(ms).toISOString();
  const hoy = hoyEn(iso);
  return {
    ahora: iso,
    hoy,
    hace: ([dias, horas = 0]) =>
      new Date(ms - Math.round((dias * 24 + horas) * MS_POR_HORA)).toISOString(),
    dia: (n) => sumarDias(hoy, n),
  };
}

/** Suma `minutos` a un instante (para ordenar eventos que ocurren casi a la vez). */
export function masMinutos(instante: FechaHora, minutos: number): FechaHora {
  return new Date(Date.parse(instante) + minutos * 60_000).toISOString();
}

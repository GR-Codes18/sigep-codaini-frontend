import { describe, expect, it } from 'vitest';

import type { Fecha, FechaHora } from './comunes';
import { CATALOGO_PARAMETROS } from './configuracion';
import {
  AVISO_MAXIMO_DIAS,
  CODIGOS_PRACTICA,
  DURACION_MAXIMA_MESES,
  fechaFinPrevista,
  situacionFinPractica,
} from './practicas';
import { calcularInsights } from './reglasInsights';
import type { UmbralesInsight } from './reglasInsights';
import { practicanteDetalle, usuario } from './pruebas/fabricas';

/** 15:00 en hora de Perú: `hoy` es el 16 de noviembre. */
const AHORA = '2026-11-16T20:00:00.000Z';
const HOY = '2026-11-16';
const DIA = 86_400_000;
const AVISO = 14;

/** Fecha de calendario a `dias` días de hoy (negativo = pasado). */
function fechaEn(dias: number): Fecha {
  return new Date(Date.parse(HOY) + dias * DIA).toISOString().slice(0, 10);
}

function situacion(fin: Fecha, ahora: FechaHora = AHORA, aviso = AVISO) {
  return situacionFinPractica(fin, ahora, aviso);
}

const UMBRALES = Object.fromEntries(
  CATALOGO_PARAMETROS.flatMap((p) =>
    p.clave.startsWith('INSIGHT_') && p.valor.tipo === 'numero' ? [[p.clave, p.valor.valor]] : [],
  ),
) as UmbralesInsight;

describe('fecha de fin prevista', () => {
  it('F-1 suma los meses: 1-ago + 4 es 1-dic y 15-nov + 4 cruza el año hasta 15-mar', () => {
    expect(fechaFinPrevista('2026-08-01', 4)).toEqual({ ok: true, fecha: '2026-12-01' });
    expect(fechaFinPrevista('2026-11-15', 4)).toEqual({ ok: true, fecha: '2027-03-15' });
    expect(fechaFinPrevista('2026-09-30', 4)).toEqual({ ok: true, fecha: '2027-01-30' });
  });

  it('F-2 si el mes destino es más corto queda su último día, también en año bisiesto', () => {
    expect(fechaFinPrevista('2026-10-31', 4)).toEqual({ ok: true, fecha: '2027-02-28' });
    expect(fechaFinPrevista('2027-10-31', 4)).toEqual({ ok: true, fecha: '2028-02-29' });
    expect(fechaFinPrevista('2026-01-31', 1)).toEqual({ ok: true, fecha: '2026-02-28' });
    expect(fechaFinPrevista('2026-03-31', 1)).toEqual({ ok: true, fecha: '2026-04-30' });
  });

  it('F-3 desde un 29 de febrero se llega al último día de un febrero que no es bisiesto', () => {
    expect(fechaFinPrevista('2028-02-29', 12)).toEqual({ ok: true, fecha: '2029-02-28' });
    expect(fechaFinPrevista('2024-02-29', 24)).toEqual({ ok: true, fecha: '2026-02-28' });
    expect(fechaFinPrevista('2028-02-29', 24)).toEqual({ ok: true, fecha: '2030-02-28' });
  });

  it('F-4 la duración debe ser un entero de 1 a 24 meses (los bordes valen); gana sobre la fecha', () => {
    for (const meses of [0, -1, 2.5, Number.NaN, Infinity, 25]) {
      expect(fechaFinPrevista('2026-08-01', meses)).toMatchObject({
        ok: false,
        codigo: 'MESES_INVALIDOS',
      });
    }
    expect(fechaFinPrevista('2026-08-01', 1)).toEqual({ ok: true, fecha: '2026-09-01' });
    expect(fechaFinPrevista('2026-08-01', 24)).toEqual({ ok: true, fecha: '2028-08-01' });
    expect(fechaFinPrevista('ayer', 0)).toMatchObject({ ok: false, codigo: 'MESES_INVALIDOS' });
    expect(DURACION_MAXIMA_MESES).toBe(24);
    const porDefecto = CATALOGO_PARAMETROS.find((p) => p.clave === 'PRACTICA_DURACION_MESES');
    expect(porDefecto?.valor).toEqual({ tipo: 'numero', valor: 4 });
    expect(CODIGOS_PRACTICA).toEqual([
      'AHORA_INVALIDO',
      'MESES_INVALIDOS',
      'AVISO_INVALIDO',
      'FECHA_INVALIDA',
    ]);
  });

  it('F-5 una fecha de ingreso que no existe en el calendario devuelve FECHA_INVALIDA', () => {
    for (const ingreso of [
      '2026-02-30',
      '2027-02-29',
      '2026-04-31',
      '2026-13-01',
      '2026-00-10',
      '2026-2-3',
      'ayer',
      '',
    ]) {
      expect(fechaFinPrevista(ingreso, 4)).toMatchObject({ ok: false, codigo: 'FECHA_INVALIDA' });
    }
    // El resultado no cabe en cuatro dígitos de año.
    expect(fechaFinPrevista('9999-12-31', 1)).toMatchObject({
      ok: false,
      codigo: 'FECHA_INVALIDA',
    });
  });
});

describe('aviso previo y vencimiento', () => {
  it('V-1 si faltan más días que el aviso la práctica sigue en curso; justo el aviso ya es AVISO', () => {
    expect(situacion(fechaEn(15))).toEqual({ ok: true, situacion: 'EN_CURSO', dias_restantes: 15 });
    expect(situacion(fechaEn(14))).toEqual({ ok: true, situacion: 'AVISO', dias_restantes: 14 });
  });

  it('V-2 mañana es AVISO con 1 día; la fecha de fin es hoy (FIN_HOY, 0 días)', () => {
    expect(situacion(fechaEn(1))).toEqual({ ok: true, situacion: 'AVISO', dias_restantes: 1 });
    expect(situacion(fechaEn(0))).toEqual({ ok: true, situacion: 'FIN_HOY', dias_restantes: 0 });
  });

  it('V-3 una fecha de fin pasada está VENCIDA y los días restantes son negativos', () => {
    expect(situacion(fechaEn(-1))).toEqual({ ok: true, situacion: 'VENCIDA', dias_restantes: -1 });
    expect(situacion(fechaEn(-10))).toEqual({
      ok: true,
      situacion: 'VENCIDA',
      dias_restantes: -10,
    });
  });

  it('V-4 hoy se corta en hora de Perú: a las 22:00 del 15 la práctica que acaba el 15 acaba hoy', () => {
    expect(situacion('2026-11-15', '2026-11-16T03:00:00.000Z')).toEqual({
      ok: true,
      situacion: 'FIN_HOY',
      dias_restantes: 0,
    });
    expect(situacion('2026-11-15', '2026-11-16T05:00:00.000Z')).toEqual({
      ok: true,
      situacion: 'VENCIDA',
      dias_restantes: -1,
    });
  });

  it('V-5 un ahora que no es ISO UTC con Z devuelve AHORA_INVALIDO, aunque lo demás también falle', () => {
    for (const ahora of [
      '2026-11-16T20:00:00',
      '2026-11-16',
      'ayer',
      '',
      '2026-13-45T00:00:00.000Z',
    ]) {
      expect(situacion(fechaEn(3), ahora)).toMatchObject({ ok: false, codigo: 'AHORA_INVALIDO' });
    }
    expect(situacion('ayer', 'ayer', 0)).toMatchObject({ ok: false, codigo: 'AHORA_INVALIDO' });
  });

  it('V-6 el aviso es un entero de 1 a 365 (los bordes valen) y la fecha de fin debe existir', () => {
    for (const aviso of [0, -1, 2.5, Number.NaN, Infinity, 366]) {
      expect(situacion(fechaEn(3), AHORA, aviso)).toMatchObject({
        ok: false,
        codigo: 'AVISO_INVALIDO',
      });
    }
    expect(situacion(fechaEn(3), AHORA, 1)).toMatchObject({ ok: true });
    expect(situacion(fechaEn(3), AHORA, 365)).toMatchObject({ ok: true });
    expect(situacion('ayer', AHORA, 0)).toMatchObject({ ok: false, codigo: 'AVISO_INVALIDO' });
    for (const fin of ['2026-02-30', 'ayer', '']) {
      expect(situacion(fin)).toMatchObject({ ok: false, codigo: 'FECHA_INVALIDA' });
    }
    expect(AVISO_MAXIMO_DIAS).toBe(365);
  });

  it('V-7 coincide con el insight «Fin de práctica»: VENCIDA es crítico, el aviso es informativo y en curso no lo muestra', () => {
    const esperada = { VENCIDA: 'CRITICO', FIN_HOY: 'INFORMATIVO', AVISO: 'INFORMATIVO' } as const;
    for (const dias of [-5, -1, 0, 1, 14, 15, 30]) {
      const fin = fechaEn(dias);
      const resultado = calcularInsights(
        {
          usuarios: [usuario('PRACTICANTE')],
          practicantes: [practicanteDetalle({ fecha_fin_prevista: fin })],
          proyectos: [],
          asignaciones: [],
          tareas: [],
          historial: [],
          postulantes: [],
        },
        UMBRALES,
        AHORA,
      );
      if (!resultado.ok)
        throw new Error(`Se esperaba un cálculo válido y llegó ${resultado.codigo}`);
      const insight = resultado.insights.find((i) => i.tipo_regla === 'FIN_PRACTICA');
      const fila = situacion(fin, AHORA, UMBRALES.INSIGHT_FIN_PRACTICA_DIAS);
      if (!fila.ok) throw new Error(`Se esperaba una situación válida y llegó ${fila.codigo}`);
      const severidad = fila.situacion === 'EN_CURSO' ? undefined : esperada[fila.situacion];
      expect(insight?.severidad, `a ${dias} días de la fecha de fin`).toBe(severidad);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { indicadoresDePostulaciones } from './indicadoresPostulaciones';
import type { DatosIndicadoresPostulaciones } from './indicadoresPostulaciones';
import type { TipoAccionHistorial } from './enumeraciones';
import type { EstadoPostulacion } from './enumeraciones';
import { evento } from './pruebas/fabricas';

const PERIODO = { desde: '2026-11-01T05:00:00.000Z', hasta: '2026-11-17T18:30:00.000Z' };

function postulante(id: string, estado: EstadoPostulacion, area = 'area-sw') {
  return { id, estado, id_area_tecnica: area };
}

function decision(id: string, accion: TipoAccionHistorial, fecha: string) {
  return evento({
    id: `e-${id}-${accion}-${fecha}`,
    fecha,
    tipo_accion: accion,
    elemento: { tipo: 'POSTULANTE', id, etiqueta: id },
    id_proyecto: null,
  });
}

function evaluacion(id: string, puntaje: number, fecha = '2026-10-30T12:00:00.000Z') {
  return { id_postulante: id, puntaje_total: puntaje, fecha_evaluacion: fecha };
}

function datos(
  cambios: Partial<DatosIndicadoresPostulaciones> = {},
): DatosIndicadoresPostulaciones {
  return {
    postulantes: [],
    evaluaciones: [],
    historial: [],
    areas: ['area-sw', 'area-vj'],
    ...cambios,
  };
}

describe('indicadoresDePostulaciones · postulaciones decididas', () => {
  it('sin postulaciones: cero decididas y cada área sin datos', () => {
    expect(indicadoresDePostulaciones(datos(), PERIODO)).toEqual({
      decididas: 0,
      por_area: [
        { id_area_tecnica: 'area-sw', decididas: 0, evaluadas: 0, puntaje_promedio: null },
        { id_area_tecnica: 'area-vj', decididas: 0, evaluadas: 0, puntaje_promedio: null },
      ],
    });
  });

  it('cuenta las aprobadas y las rechazadas cuya decisión cae en el periodo', () => {
    const r = indicadoresDePostulaciones(
      datos({
        postulantes: [postulante('a', 'APROBADA'), postulante('r', 'RECHAZADA')],
        historial: [
          decision('a', 'POSTULACION_APROBADA', '2026-11-10T15:00:00.000Z'),
          decision('r', 'POSTULACION_RECHAZADA', '2026-11-12T15:00:00.000Z'),
        ],
      }),
      PERIODO,
    );

    expect(r.decididas).toBe(2);
  });

  it('no cuenta las pendientes, aunque tengan una decisión anterior en el periodo', () => {
    const r = indicadoresDePostulaciones(
      datos({
        postulantes: [postulante('p', 'PENDIENTE')],
        historial: [
          decision('p', 'POSTULACION_RECHAZADA', '2026-11-05T15:00:00.000Z'),
          decision('p', 'POSTULACION_RECONSIDERADA', '2026-11-06T15:00:00.000Z'),
        ],
      }),
      PERIODO,
    );

    expect(r.decididas).toBe(0);
  });

  it('una decisión fuera del periodo no cuenta', () => {
    const r = indicadoresDePostulaciones(
      datos({
        postulantes: [postulante('antes', 'APROBADA'), postulante('despues', 'APROBADA')],
        historial: [
          decision('antes', 'POSTULACION_APROBADA', '2026-10-31T23:59:59.999Z'),
          decision('despues', 'POSTULACION_APROBADA', '2026-11-17T18:30:00.001Z'),
        ],
      }),
      PERIODO,
    );

    expect(r.decididas).toBe(0);
  });

  it('los dos extremos del periodo entran', () => {
    const r = indicadoresDePostulaciones(
      datos({
        postulantes: [postulante('ini', 'APROBADA'), postulante('fin', 'RECHAZADA')],
        historial: [
          decision('ini', 'POSTULACION_APROBADA', PERIODO.desde),
          decision('fin', 'POSTULACION_RECHAZADA', PERIODO.hasta),
        ],
      }),
      PERIODO,
    );

    expect(r.decididas).toBe(2);
  });

  it('rechazada, reconsiderada y luego aprobada cuenta una vez, por la fecha de la aprobación', () => {
    const base = datos({
      postulantes: [postulante('x', 'APROBADA')],
      historial: [
        decision('x', 'POSTULACION_RECHAZADA', '2026-10-01T15:00:00.000Z'),
        decision('x', 'POSTULACION_RECONSIDERADA', '2026-10-05T15:00:00.000Z'),
        decision('x', 'POSTULACION_APROBADA', '2026-11-10T15:00:00.000Z'),
      ],
    });

    expect(indicadoresDePostulaciones(base, PERIODO).decididas).toBe(1);
    // Con un periodo que solo contiene el rechazo antiguo no cuenta: la decisión vigente es la aprobación.
    expect(
      indicadoresDePostulaciones(base, {
        desde: '2026-09-30T05:00:00.000Z',
        hasta: '2026-10-02T05:00:00.000Z',
      }).decididas,
    ).toBe(0);
  });

  it('una decidida sin evento de decisión no cuenta', () => {
    const r = indicadoresDePostulaciones(
      datos({ postulantes: [postulante('x', 'APROBADA')] }),
      PERIODO,
    );

    expect(r.decididas).toBe(0);
  });

  it('ignora las decisiones de otros elementos con el mismo id', () => {
    const r = indicadoresDePostulaciones(
      datos({
        postulantes: [postulante('x', 'APROBADA')],
        historial: [
          evento({
            id: 'e-tarea',
            fecha: '2026-11-10T15:00:00.000Z',
            tipo_accion: 'POSTULACION_APROBADA',
            elemento: { tipo: 'TAREA', id: 'x', etiqueta: 'x' },
          }),
        ],
      }),
      PERIODO,
    );

    expect(r.decididas).toBe(0);
  });
});

describe('indicadoresDePostulaciones · puntaje promedio por área', () => {
  const decididasEn = (...ids: string[]) =>
    ids.map((id) => decision(id, 'POSTULACION_APROBADA', '2026-11-10T15:00:00.000Z'));

  it('promedia el puntaje de las decididas de cada área', () => {
    const r = indicadoresDePostulaciones(
      datos({
        postulantes: [
          postulante('a', 'APROBADA', 'area-sw'),
          postulante('b', 'APROBADA', 'area-sw'),
          postulante('c', 'APROBADA', 'area-vj'),
        ],
        evaluaciones: [evaluacion('a', 80), evaluacion('b', 90), evaluacion('c', 70)],
        historial: decididasEn('a', 'b', 'c'),
      }),
      PERIODO,
    );

    expect(r.por_area).toEqual([
      { id_area_tecnica: 'area-sw', decididas: 2, evaluadas: 2, puntaje_promedio: 85 },
      { id_area_tecnica: 'area-vj', decididas: 1, evaluadas: 1, puntaje_promedio: 70 },
    ]);
  });

  it('un área sin decididas tiene promedio null, no cero', () => {
    const r = indicadoresDePostulaciones(
      datos({
        postulantes: [postulante('a', 'APROBADA', 'area-sw')],
        evaluaciones: [evaluacion('a', 80)],
        historial: decididasEn('a'),
      }),
      PERIODO,
    );

    expect(r.por_area[1]).toEqual({
      id_area_tecnica: 'area-vj',
      decididas: 0,
      evaluadas: 0,
      puntaje_promedio: null,
    });
  });

  it('las decididas sin evaluación cuentan como decididas pero no entran en el promedio', () => {
    const r = indicadoresDePostulaciones(
      datos({
        postulantes: [postulante('a', 'APROBADA'), postulante('b', 'APROBADA')],
        evaluaciones: [evaluacion('a', 60)],
        historial: decididasEn('a', 'b'),
      }),
      PERIODO,
    );

    expect(r.decididas).toBe(2);
    expect(r.por_area[0]).toEqual({
      id_area_tecnica: 'area-sw',
      decididas: 2,
      evaluadas: 1,
      puntaje_promedio: 60,
    });
  });

  it('todas las decididas del área sin evaluación: promedio null', () => {
    const r = indicadoresDePostulaciones(
      datos({ postulantes: [postulante('a', 'APROBADA')], historial: decididasEn('a') }),
      PERIODO,
    );

    expect(r.por_area[0]).toMatchObject({ decididas: 1, evaluadas: 0, puntaje_promedio: null });
  });

  it('usa la evaluación más reciente de cada postulación', () => {
    const r = indicadoresDePostulaciones(
      datos({
        postulantes: [postulante('a', 'APROBADA')],
        evaluaciones: [
          evaluacion('a', 40, '2026-10-01T12:00:00.000Z'),
          evaluacion('a', 90, '2026-10-20T12:00:00.000Z'),
          evaluacion('a', 10, '2026-09-01T12:00:00.000Z'),
        ],
        historial: decididasEn('a'),
      }),
      PERIODO,
    );

    expect(r.por_area[0]!.puntaje_promedio).toBe(90);
  });

  it('no promedia las postulaciones no decididas ni las decididas fuera del periodo', () => {
    const r = indicadoresDePostulaciones(
      datos({
        postulantes: [
          postulante('pendiente', 'PENDIENTE'),
          postulante('vieja', 'APROBADA'),
          postulante('buena', 'APROBADA'),
        ],
        evaluaciones: [
          evaluacion('pendiente', 10),
          evaluacion('vieja', 20),
          evaluacion('buena', 70),
        ],
        historial: [
          decision('vieja', 'POSTULACION_APROBADA', '2026-09-01T15:00:00.000Z'),
          decision('buena', 'POSTULACION_APROBADA', '2026-11-10T15:00:00.000Z'),
        ],
      }),
      PERIODO,
    );

    expect(r.por_area[0]).toMatchObject({ decididas: 1, puntaje_promedio: 70 });
  });

  it('redondea a un decimal con las mitades hacia arriba', () => {
    const promedio = (puntajes: number[]) => {
      const ids = puntajes.map((_, i) => `p${i}`);
      return indicadoresDePostulaciones(
        datos({
          postulantes: ids.map((id) => postulante(id, 'APROBADA')),
          evaluaciones: ids.map((id, i) => evaluacion(id, puntajes[i]!)),
          historial: decididasEn(...ids),
        }),
        PERIODO,
      ).por_area[0]!.puntaje_promedio;
    };

    expect(promedio([80, 91])).toBe(85.5);
    expect(promedio([70, 70, 71])).toBe(70.3); // 70,333…
    expect(promedio([70, 71, 71])).toBe(70.7); // 70,666…
    expect(promedio([1, 1, 2, 2, 2, 2, 2, 2, 2, 2])).toBe(1.8);
    // 0,95 exacto sube a 1: 38 aciertos de 40.
    expect(promedio([...Array.from({ length: 38 }, () => 1), 0, 0])).toBe(1);
    // 0,05 exacto sube: 1 de 20 → 0,05 → 0,1.
    expect(promedio([1, ...Array.from({ length: 19 }, () => 0)])).toBe(0.1);
  });

  it('un área que no está en la lista no sale, pero sus decididas cuentan en el total', () => {
    const r = indicadoresDePostulaciones(
      datos({
        postulantes: [postulante('a', 'APROBADA', 'area-otra')],
        historial: decididasEn('a'),
      }),
      PERIODO,
    );

    expect(r.decididas).toBe(1);
    expect(r.por_area.map((a) => a.id_area_tecnica)).toEqual(['area-sw', 'area-vj']);
    expect(r.por_area.every((a) => a.decididas === 0)).toBe(true);
  });

  it('no modifica los datos de entrada', () => {
    const entrada = datos({
      postulantes: Object.freeze([postulante('a', 'APROBADA')]),
      evaluaciones: Object.freeze([evaluacion('a', 80)]),
      historial: Object.freeze(decididasEn('a')),
      areas: Object.freeze(['area-sw']),
    });

    expect(() => indicadoresDePostulaciones(entrada, PERIODO)).not.toThrow();
  });
});

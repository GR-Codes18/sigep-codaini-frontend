import { describe, expect, it } from 'vitest';

import type { FechaHora, Id } from './comunes';
import { CATALOGO_PARAMETROS } from './configuracion';
import type { TipoAccionHistorial } from './enumeraciones';
import type { EventoHistorial } from './historial';
import {
  CODIGOS_INDICADORES,
  DIAS_PERIODO_MAXIMO,
  DIAS_PERIODO_PREDETERMINADO,
  avanceProyecto,
  cargaDePracticante,
  diasEsperando,
  enviosASupervision,
  indicadoresParaUsuario,
  instanteUltimoEnvio,
  proyectosDeCarga,
  tiempoCicloMs,
  ultimaActividadDeProyecto,
  ultimaActividadDeUsuario,
  vecesDevuelta,
} from './indicadores';
import type { DatosIndicadores, FiltroIndicadores } from './indicadores';
import { calcularInsights } from './reglasInsights';
import type { UmbralesInsight } from './reglasInsights';
import type { Tarea } from './tareas';
import { IDS, asignacion, evento, proyecto, tarea, usuario } from './pruebas/fabricas';

/** 15:00 en hora de Perú: `hoy` es el 16 de noviembre. */
const AHORA = '2026-11-16T20:00:00.000Z';
const DIA = 86_400_000;
const HORA = 3_600_000;
const MINUTO = 60_000;

/** Día 0 a las 10:00 UTC (5:00 en Perú), dentro del periodo de 30 días. */
const BASE = Date.parse('2026-11-01T10:00:00.000Z');

const TODOS: FiltroIndicadores = { dias: 30, id_proyecto: null };

const ADMIN = usuario('ADMINISTRADOR');
const SUP = usuario('SUPERVISOR');
const PRAC = usuario('PRACTICANTE');

/** Instante del día `dias` (desde el día 0, 10:00 UTC) más `horas`. */
function en(dias: number, horas = 0): FechaHora {
  return new Date(BASE + dias * DIA + horas * HORA).toISOString();
}

function haceDias(dias: number, horas = 0, minutos = 0): FechaHora {
  return new Date(Date.parse(AHORA) - dias * DIA - horas * HORA - minutos * MINUTO).toISOString();
}

function datos(cambios: Partial<DatosIndicadores> = {}): DatosIndicadores {
  return { proyectos: [proyecto()], asignaciones: [], tareas: [], historial: [], ...cambios };
}

function calcular(
  quien: ReturnType<typeof usuario>,
  d: DatosIndicadores,
  filtro: FiltroIndicadores = TODOS,
  ahora: FechaHora = AHORA,
) {
  const resultado = indicadoresParaUsuario(quien, d, filtro, ahora);
  if (!resultado.ok) throw new Error(`Se esperaba un cálculo válido y llegó ${resultado.codigo}`);
  return resultado;
}

/** Evento sobre una tarea; `autor` `null` es «Sistema». */
function ev(
  accion: TipoAccionHistorial,
  fecha: FechaHora,
  idTarea: Id = IDS.tarea,
  autor: Id | null = IDS.practicante,
  idProyecto: Id | null = IDS.proyecto,
): EventoHistorial {
  return evento({
    tipo_accion: accion,
    fecha,
    elemento: { tipo: 'TAREA', id: idTarea, etiqueta: 'PRB-001 Tarea de prueba' },
    autor: autor === null ? { tipo: 'SISTEMA' } : { tipo: 'USUARIO', id_usuario: autor },
    id_proyecto: idProyecto,
  });
}

function terminada(id: Id, termino: FechaHora, cambios: Partial<Tarea> = {}): Tarea {
  return tarea({ id, estado: 'TERMINADA', fecha_termino: termino, ...cambios });
}

/** Tarea del proyecto base tomada en `d0` y terminada `dias` días después. */
function conCiclo(id: Id, dias: number, cambios: Partial<Tarea> = {}) {
  return {
    tarea: terminada(id, en(dias), cambios),
    historial: [ev('TAREA_TOMADA', en(0), id), ev('TAREA_TERMINADA', en(dias), id)],
  };
}

const UMBRALES = Object.fromEntries(
  CATALOGO_PARAMETROS.flatMap((p) =>
    p.clave.startsWith('INSIGHT_') && p.valor.tipo === 'numero' ? [[p.clave, p.valor.valor]] : [],
  ),
) as UmbralesInsight;

describe('periodo y ahora', () => {
  it('P-1 un ahora que no es ISO UTC con Z devuelve AHORA_INVALIDO', () => {
    for (const ahora of [
      '2026-11-16T20:00:00',
      '2026-11-16',
      'ayer',
      '',
      '2026-13-45T00:00:00.000Z',
    ]) {
      expect(indicadoresParaUsuario(ADMIN, datos(), TODOS, ahora)).toMatchObject({
        ok: false,
        codigo: 'AHORA_INVALIDO',
      });
    }
  });

  it('P-2 los días del periodo deben ser un entero de 1 a 365 (los bordes 1 y 365 valen)', () => {
    for (const dias of [0, -1, 2.5, Number.NaN, Infinity, 366, 10_000_000_000]) {
      expect(
        indicadoresParaUsuario(ADMIN, datos(), { dias, id_proyecto: null }, AHORA),
      ).toMatchObject({ ok: false, codigo: 'PERIODO_INVALIDO' });
    }
    for (const dias of [1, 365]) {
      expect(
        indicadoresParaUsuario(ADMIN, datos(), { dias, id_proyecto: null }, AHORA),
      ).toMatchObject({ ok: true });
    }
    expect(DIAS_PERIODO_MAXIMO).toBe(365);
    expect(CODIGOS_INDICADORES).toEqual(['AHORA_INVALIDO', 'PERIODO_INVALIDO']);
  });

  it('P-3 el día se corta en hora de Perú: a las 22:00 del 15 el periodo de 1 día empieza el 15', () => {
    const resultado = calcular(
      ADMIN,
      datos(),
      { dias: 1, id_proyecto: null },
      '2026-11-16T03:00:00.000Z',
    );
    expect(resultado.periodo).toEqual({
      desde: '2026-11-15T05:00:00.000Z',
      hasta: '2026-11-16T03:00:00.000Z',
      dias: 1,
    });
  });

  it('P-4 el límite inferior entra: una terminada justo en `desde` cuenta y 1 ms antes no', () => {
    const resultado = calcular(
      ADMIN,
      datos({
        tareas: [
          terminada('t-justo', '2026-10-18T05:00:00.000Z'),
          terminada('t-antes', '2026-10-18T04:59:59.999Z'),
        ],
      }),
    );
    expect(resultado.resumen.tareas_terminadas).toBe(1);
  });

  it('P-5 un periodo de 30 días empieza a las 00:00 (Perú) del día 29 anterior a hoy', () => {
    expect(calcular(ADMIN, datos()).periodo.desde).toBe('2026-10-18T05:00:00.000Z');
    expect(calcular(ADMIN, datos(), { dias: 1, id_proyecto: null }).periodo.desde).toBe(
      '2026-11-16T05:00:00.000Z',
    );
  });

  it('P-6 con ahora y periodo inválidos a la vez gana AHORA_INVALIDO', () => {
    expect(
      indicadoresParaUsuario(ADMIN, datos(), { dias: 0, id_proyecto: null }, 'ayer'),
    ).toMatchObject({ ok: false, codigo: 'AHORA_INVALIDO' });
  });

  it('P-7 el periodo predeterminado es de 30 días', () => {
    expect(DIAS_PERIODO_PREDETERMINADO).toBe(30);
  });

  it('P-8 el límite superior entra: una terminada justo en ahora cuenta y 1 ms después no', () => {
    const resultado = calcular(
      ADMIN,
      datos({
        tareas: [terminada('t-ahora', AHORA), terminada('t-despues', '2026-11-16T20:00:00.001Z')],
      }),
    );
    expect(resultado.resumen.tareas_terminadas).toBe(1);
  });
});

describe('avance', () => {
  it('A-1 son las terminadas sobre el total; en progreso, esperando y disponibles no cuentan', () => {
    const tres = ['t1', 't2', 't3'].map((id) => terminada(id, en(1)));
    expect(
      avanceProyecto(IDS.proyecto, [...tres, tarea({ id: 't4', estado: 'EN_PROGRESO' })]),
    ).toEqual({ numerador: 3, denominador: 4, porcentaje: 75 });
    expect(
      avanceProyecto(IDS.proyecto, [
        terminada('t1', en(1)),
        tarea({ id: 't2', estado: 'EN_PROGRESO' }),
        tarea({ id: 't3', estado: 'ESPERANDO_SUPERVISION' }),
        tarea({ id: 't4', estado: 'DISPONIBLE', id_practicante: null }),
      ]),
    ).toEqual({ numerador: 1, denominador: 4, porcentaje: 25 });
  });

  it('A-2 un proyecto sin tareas no tiene avance (null, no 0 %)', () => {
    expect(avanceProyecto(IDS.proyecto, [])).toBeNull();
  });

  it('A-3 el porcentaje se redondea con las mitades hacia arriba', () => {
    const una = [terminada('t0', en(1))];
    const siete = Array.from({ length: 7 }, (_, i) =>
      tarea({ id: `t-${i}`, estado: 'EN_PROGRESO' }),
    );
    expect(avanceProyecto(IDS.proyecto, [...una, ...siete])?.porcentaje).toBe(13);
    expect(
      avanceProyecto(IDS.proyecto, [
        terminada('a', en(1)),
        terminada('b', en(1)),
        tarea({ id: 'c', estado: 'EN_PROGRESO' }),
      ])?.porcentaje,
    ).toBe(67);
  });

  it('A-4 solo cuenta las tareas de su proyecto', () => {
    const tareas = [
      terminada('t1', en(1)),
      tarea({ id: 't2', estado: 'EN_PROGRESO' }),
      terminada('t3', en(1), { id_proyecto: 'p-otro' }),
    ];
    expect(avanceProyecto(IDS.proyecto, tareas)).toEqual({
      numerador: 1,
      denominador: 2,
      porcentaje: 50,
    });
  });

  it('A-5 el avance no depende del periodo: una terminada hace 90 días cuenta', () => {
    const resultado = calcular(
      ADMIN,
      datos({
        tareas: [
          terminada('t-vieja', haceDias(90)),
          tarea({ id: 't-curso', estado: 'EN_PROGRESO' }),
        ],
      }),
    );
    expect(resultado.resumen.tareas_terminadas).toBe(0);
    expect(resultado.por_proyecto[0]?.avance).toEqual({
      numerador: 1,
      denominador: 2,
      porcentaje: 50,
    });
  });
});

describe('tiempo de ciclo', () => {
  function cicloDe(t: Tarea, historial: EventoHistorial[]) {
    return calcular(ADMIN, datos({ tareas: [t], historial })).resumen.tiempo_ciclo_dias;
  }

  it('C-1 de tomada a terminada: 10:00 del día 0 a 22:00 del día 2 son 2,5 días', () => {
    const t = terminada('t-c', en(2, 12));
    expect(
      cicloDe(t, [ev('TAREA_TOMADA', en(0), 't-c'), ev('TAREA_TERMINADA', en(2, 12), 't-c')]),
    ).toBe(2.5);
  });

  it('C-2 el tiempo sin responsable tras liberar no cuenta: 1 + 2 días son 3, no 6', () => {
    const t = terminada('t-c', en(6));
    expect(
      cicloDe(t, [
        ev('TAREA_TOMADA', en(0), 't-c'),
        ev('TAREA_LIBERADA', en(1), 't-c'),
        ev('TAREA_TOMADA', en(4), 't-c'),
        ev('TAREA_TERMINADA', en(6), 't-c'),
      ]),
    ).toBe(3);
  });

  it('C-3 el tiempo que pasó terminada antes de reabrir no cuenta: 2 + 1 días son 3', () => {
    const t = terminada('t-c', en(11));
    expect(
      cicloDe(t, [
        ev('TAREA_TOMADA', en(0), 't-c'),
        ev('TAREA_TERMINADA', en(2), 't-c'),
        ev('TAREA_REABIERTA', en(10), 't-c'),
        ev('TAREA_TERMINADA', en(11), 't-c'),
      ]),
    ).toBe(3);
  });

  it('C-4 enviar y devolver no cortan el tramo: tomada el día 0 y aprobada el 4 son 4 días', () => {
    const t = terminada('t-c', en(4), { requiere_supervision: true });
    expect(
      cicloDe(t, [
        ev('TAREA_TOMADA', en(0), 't-c'),
        ev('TAREA_ENVIADA_A_SUPERVISION', en(1), 't-c'),
        ev('TAREA_DEVUELTA', en(2), 't-c', IDS.supervisor),
        ev('TAREA_ENVIADA_A_SUPERVISION', en(3), 't-c'),
        ev('TAREA_APROBADA', en(4), 't-c', IDS.supervisor),
      ]),
    ).toBe(4);
  });

  it('C-5 se ancla en fecha_termino: terminada hace 31 días queda fuera de 30; hace 29 entra', () => {
    const vieja = terminada('t-vieja', haceDias(31));
    const reciente = terminada('t-reciente', haceDias(29));
    const resultado = calcular(
      ADMIN,
      datos({
        tareas: [vieja, reciente],
        historial: [
          ev('TAREA_TOMADA', haceDias(33), 't-vieja'),
          ev('TAREA_TERMINADA', haceDias(31), 't-vieja'),
          ev('TAREA_TOMADA', haceDias(31), 't-reciente'),
          ev('TAREA_TERMINADA', haceDias(29), 't-reciente'),
        ],
      }),
    );
    expect(resultado.resumen.tareas_terminadas).toBe(1);
    expect(resultado.resumen.tiempo_ciclo_dias).toBe(2);
  });

  it('C-6 una terminada sin evento de toma cuenta como terminada pero no aporta ciclo (null)', () => {
    const t = terminada('t-c', en(2));
    const resultado = calcular(
      ADMIN,
      datos({ tareas: [t], historial: [ev('TAREA_TERMINADA', en(2), 't-c')] }),
    );
    expect(resultado.resumen.tareas_terminadas).toBe(1);
    expect(resultado.resumen.tiempo_ciclo_dias).toBeNull();
    expect(tiempoCicloMs(t, [ev('TAREA_TERMINADA', en(2), 't-c')])).toBeNull();
  });

  it('C-7 sin terminadas en el periodo el ciclo es null, no 0', () => {
    const resultado = calcular(ADMIN, datos());
    expect(resultado.resumen.tareas_terminadas).toBe(0);
    expect(resultado.resumen.tiempo_ciclo_dias).toBeNull();
  });

  it('C-8 en la fila de cada practicante el ciclo es de las tareas que terminó él', () => {
    const mia = conCiclo('t-mia', 2, { id_practicante: IDS.practicante });
    const otra = conCiclo('t-otra', 4, { id_practicante: 'u-otro' });
    const resultado = calcular(
      ADMIN,
      datos({
        tareas: [mia.tarea, otra.tarea],
        historial: [...mia.historial, ...otra.historial],
        asignaciones: [
          asignacion({ id: 'a-1', id_practicante: IDS.practicante }),
          asignacion({ id: 'a-2', id_practicante: 'u-otro' }),
        ],
      }),
    );
    const fila = (id: Id) => resultado.por_practicante.find((f) => f.id_practicante === id);
    expect(fila(IDS.practicante)).toMatchObject({ tareas_terminadas: 1, tiempo_ciclo_dias: 2 });
    expect(fila('u-otro')).toMatchObject({ tareas_terminadas: 1, tiempo_ciclo_dias: 4 });
  });

  it('C-9 el ciclo se mide hasta fecha_termino: lo que el historial registre después no cuenta', () => {
    const t = terminada('t-c', en(2));
    const hastaElDia2 = [ev('TAREA_TOMADA', en(0), 't-c'), ev('TAREA_TERMINADA', en(2), 't-c')];
    // Una reapertura el día 5 queda sin cerrar: el resultado es el mismo con o sin corte.
    expect(cicloDe(t, [...hastaElDia2, ev('TAREA_REABIERTA', en(5), 't-c', IDS.supervisor)])).toBe(
      2,
    );
    // Una reapertura el día 5 que se cierra el día 6 sumaría 1 día más si no se cortara en el 2.
    expect(
      cicloDe(t, [
        ...hastaElDia2,
        ev('TAREA_REABIERTA', en(5), 't-c', IDS.supervisor),
        ev('TAREA_TERMINADA', en(6), 't-c'),
      ]),
    ).toBe(2);
    expect(tiempoCicloMs(t, hastaElDia2)).toBe(2 * DIA);
  });
});

describe('espera de supervisión', () => {
  function esperaDe(historial: EventoHistorial[]) {
    return calcular(ADMIN, datos({ tareas: [tarea({ id: 't-e' })], historial })).resumen
      .espera_supervision_dias;
  }

  it('E-1 de enviada a aprobada: 08:00 del día 0 a 20:00 del día 1 son 1,5 días', () => {
    expect(
      esperaDe([
        ev('TAREA_ENVIADA_A_SUPERVISION', en(0, -2), 't-e'),
        ev('TAREA_APROBADA', en(1, 10), 't-e', IDS.supervisor),
      ]),
    ).toBe(1.5);
  });

  it('E-2 se ancla en la respuesta: enviada hace 32 días y respondida hace 29 entra', () => {
    expect(
      esperaDe([
        ev('TAREA_ENVIADA_A_SUPERVISION', haceDias(32), 't-e'),
        ev('TAREA_DEVUELTA', haceDias(29), 't-e', IDS.supervisor),
      ]),
    ).toBe(3);
  });

  it('E-3 una segunda respuesta sin un envío nuevo no alarga el tramo', () => {
    const historial = [
      ev('TAREA_ENVIADA_A_SUPERVISION', en(0), 't-e'),
      ev('TAREA_APROBADA', en(1), 't-e', IDS.supervisor),
      ev('TAREA_APROBADA', en(3), 't-e', IDS.supervisor),
    ];
    expect(esperaDe(historial)).toBe(1);
    expect(enviosASupervision('t-e', historial)).toHaveLength(1);
  });
});

describe('tasa de devolución (tareas con una devolución / tareas enviadas en el periodo)', () => {
  function tasaDe(tareas: Tarea[], historial: EventoHistorial[]) {
    return calcular(ADMIN, datos({ tareas, historial })).resumen.tasa_devolucion;
  }
  const envio = (id: Id, fecha: FechaHora) => ev('TAREA_ENVIADA_A_SUPERVISION', fecha, id);
  const devuelve = (id: Id, fecha: FechaHora) => ev('TAREA_DEVUELTA', fecha, id, IDS.supervisor);
  const aprueba = (id: Id, fecha: FechaHora) => ev('TAREA_APROBADA', fecha, id, IDS.supervisor);

  it('T-1 cuenta tareas, no devoluciones: una devuelta dos veces y tres aprobadas son 1 de 4', () => {
    const ids = ['t1', 't2', 't3', 't4'];
    expect(
      tasaDe(
        ids.map((id) => tarea({ id })),
        [
          envio('t1', haceDias(10)),
          devuelve('t1', haceDias(9)),
          envio('t1', haceDias(8)),
          devuelve('t1', haceDias(7)),
          ...['t2', 't3', 't4'].flatMap((id) => [envio(id, haceDias(6)), aprueba(id, haceDias(5))]),
        ],
      ),
    ).toEqual({ numerador: 1, denominador: 4, porcentaje: 25 });
  });

  it('T-2 el ancla es el envío: uno enviado hace 32 días y devuelto hace 29 queda fuera de los dos lados', () => {
    expect(
      tasaDe(
        [tarea({ id: 't-x' }), tarea({ id: 't-y' })],
        [
          envio('t-x', haceDias(32)),
          devuelve('t-x', haceDias(29)),
          envio('t-y', haceDias(5)),
          aprueba('t-y', haceDias(4)),
        ],
      ),
    ).toEqual({ numerador: 0, denominador: 1, porcentaje: 0 });
  });

  it('T-3 un envío del periodo sin respuesta entra en el denominador', () => {
    expect(
      tasaDe(
        [tarea({ id: 't-a' }), tarea({ id: 't-b' }), tarea({ id: 't-c' })],
        [
          envio('t-a', haceDias(10)),
          devuelve('t-a', haceDias(9)),
          envio('t-b', haceDias(8)),
          aprueba('t-b', haceDias(7)),
          envio('t-c', haceDias(3)),
        ],
      ),
    ).toEqual({ numerador: 1, denominador: 3, porcentaje: 33 });
  });

  it('T-4 una devolución anterior al periodo no cuenta aunque se reenvíe y apruebe dentro', () => {
    expect(
      tasaDe(
        [tarea({ id: 't-r' })],
        [
          envio('t-r', haceDias(41)),
          devuelve('t-r', haceDias(40)),
          envio('t-r', haceDias(5)),
          aprueba('t-r', haceDias(4)),
        ],
      ),
    ).toEqual({ numerador: 0, denominador: 1, porcentaje: 0 });
  });

  it('T-5 sin tareas enviadas en el periodo la tasa es null, no 0 %', () => {
    expect(tasaDe([tarea({ id: 't-sin' })], [])).toBeNull();
  });

  it('T-6 en la fila de cada practicante solo cuentan los envíos que hizo él', () => {
    const t = terminada('t-t', haceDias(4), { id_practicante: 'u-ana' });
    const resultado = calcular(
      ADMIN,
      datos({
        tareas: [t],
        asignaciones: [
          asignacion({ id: 'a-luis', id_practicante: 'u-luis' }),
          asignacion({ id: 'a-ana', id_practicante: 'u-ana' }),
        ],
        historial: [
          ev('TAREA_ENVIADA_A_SUPERVISION', haceDias(10), 't-t', 'u-luis'),
          ev('TAREA_DEVUELTA', haceDias(9), 't-t', IDS.supervisor),
          ev('TAREA_LIBERADA', haceDias(8), 't-t', 'u-luis'),
          ev('TAREA_TOMADA', haceDias(7), 't-t', 'u-ana'),
          ev('TAREA_ENVIADA_A_SUPERVISION', haceDias(5), 't-t', 'u-ana'),
          ev('TAREA_APROBADA', haceDias(4), 't-t', IDS.supervisor),
        ],
      }),
    );
    const fila = (id: Id) => resultado.por_practicante.find((f) => f.id_practicante === id);
    expect(fila('u-luis')?.tasa_devolucion).toEqual({
      numerador: 1,
      denominador: 1,
      porcentaje: 100,
    });
    expect(fila('u-ana')?.tasa_devolucion).toEqual({ numerador: 0, denominador: 1, porcentaje: 0 });
  });
});

describe('tareas eliminadas: sus eventos no cuentan', () => {
  /** `t-vivo` espera 1 día; `t-borrada` ya no está en `tareas` y esperó 4 días y fue devuelta. */
  function mundo() {
    return datos({
      tareas: [tarea({ id: 't-vivo' })],
      historial: [
        ev('TAREA_ENVIADA_A_SUPERVISION', en(0), 't-vivo'),
        ev('TAREA_APROBADA', en(1), 't-vivo', IDS.supervisor),
        ev('TAREA_TOMADA', en(0), 't-borrada'),
        ev('TAREA_ENVIADA_A_SUPERVISION', en(0, 1), 't-borrada'),
        ev('TAREA_DEVUELTA', en(4, 1), 't-borrada', IDS.supervisor),
      ],
    });
  }

  it('X-1 la espera de supervisión ignora los envíos de una tarea eliminada', () => {
    expect(calcular(ADMIN, mundo()).resumen.espera_supervision_dias).toBe(1);
  });

  it('X-2 la tasa de devolución ignora las devoluciones de una tarea eliminada', () => {
    expect(calcular(ADMIN, mundo()).resumen.tasa_devolucion).toEqual({
      numerador: 0,
      denominador: 1,
      porcentaje: 0,
    });
  });

  it('X-3 (regresión, sin mutación) el ciclo de una tarea eliminada no aporta muestra', () => {
    const resultado = calcular(
      ADMIN,
      datos({
        tareas: [],
        historial: [
          ev('TAREA_TOMADA', en(0), 't-borrada'),
          ev('TAREA_TERMINADA', en(2), 't-borrada'),
        ],
      }),
    );
    expect(resultado.resumen.tareas_terminadas).toBe(0);
    expect(resultado.resumen.tiempo_ciclo_dias).toBeNull();
  });
});

describe('última actividad', () => {
  it('U-1 la de un proyecto es su último evento, de cualquier autor (también «Sistema»)', () => {
    const historial = [
      ev('TAREA_TOMADA', en(1)),
      ev('TAREA_EDITADA', en(3), IDS.tarea, null),
      ev('TAREA_TOMADA', en(5), 't-otra', IDS.practicante, 'p-otro'),
    ];
    expect(ultimaActividadDeProyecto(IDS.proyecto, historial)).toBe(en(3));
  });

  it('U-2 la de una persona son solo las acciones que registró ella, no las que otros hicieron sobre ella', () => {
    const historial = [
      ev('TAREA_TOMADA', en(1)),
      evento({
        tipo_accion: 'PRACTICANTE_ASIGNADO_A_PROYECTO',
        fecha: en(3),
        autor: { tipo: 'USUARIO', id_usuario: IDS.admin },
        elemento: { tipo: 'USUARIO', id: IDS.practicante, etiqueta: 'Persona PRACTICANTE' },
      }),
      ev('TAREA_EDITADA', en(4), IDS.tarea, null),
    ];
    expect(ultimaActividadDeUsuario(IDS.practicante, historial)).toBe(en(1));
  });

  it('U-3 sin eventos la última actividad es null', () => {
    expect(ultimaActividadDeProyecto(IDS.proyecto, [])).toBeNull();
    expect(ultimaActividadDeUsuario(IDS.practicante, [])).toBeNull();
  });

  it('U-4 no depende del periodo: un evento de hace 90 días se devuelve en proyecto y practicante', () => {
    const resultado = calcular(
      ADMIN,
      datos({
        asignaciones: [asignacion()],
        historial: [ev('TAREA_TOMADA', haceDias(90))],
      }),
    );
    expect(resultado.por_proyecto[0]?.ultima_actividad).toBe(haceDias(90));
    expect(resultado.por_practicante[0]?.ultima_actividad).toBe(haceDias(90));
  });
});

describe('días esperando', () => {
  const esperando = tarea({ id: 't-d', estado: 'ESPERANDO_SUPERVISION' });
  const envio = (fecha: FechaHora) => ev('TAREA_ENVIADA_A_SUPERVISION', fecha, 't-d');

  it('D-1 cuenta desde el último envío: enviada hace 10 días, devuelta, reenviada hace 2 d 23 h son 2', () => {
    const historial = [
      envio(haceDias(10)),
      ev('TAREA_DEVUELTA', haceDias(8), 't-d', IDS.supervisor),
      envio(haceDias(2, 23)),
    ];
    expect(instanteUltimoEnvio('t-d', historial)).toBe(Date.parse(haceDias(2, 23)));
    expect(diasEsperando(esperando, historial, AHORA)).toBe(2);
  });

  it('D-2 son días completos de 24 h: 2 d 23 h 59 min son 2 y 3 d exactos son 3', () => {
    expect(diasEsperando(esperando, [envio(haceDias(2, 23, 59))], AHORA)).toBe(2);
    expect(diasEsperando(esperando, [envio(haceDias(3))], AHORA)).toBe(3);
  });

  it('D-3 una tarea que no está esperando supervisión no tiene días esperando (null)', () => {
    const enCurso = tarea({ id: 't-d', estado: 'EN_PROGRESO' });
    expect(diasEsperando(enCurso, [envio(haceDias(10))], AHORA)).toBeNull();
  });

  it('D-4 esperando supervisión pero sin evento de envío da null', () => {
    expect(diasEsperando(esperando, [], AHORA)).toBeNull();
    expect(
      diasEsperando(esperando, [ev('TAREA_ENVIADA_A_SUPERVISION', haceDias(9), 't-otra')], AHORA),
    ).toBeNull();
  });

  it('D-5 coincide con el insight «supervisión demorada»: los días del título son diasEsperando', () => {
    const envioReciente = envio(haceDias(3, 23));
    const resultado = calcularInsights(
      {
        usuarios: [SUP, PRAC],
        practicantes: [],
        proyectos: [proyecto()],
        asignaciones: [],
        tareas: [esperando],
        historial: [envioReciente],
        postulantes: [],
      },
      UMBRALES,
      AHORA,
    );
    if (!resultado.ok) throw new Error(`Se esperaba un cálculo válido y llegó ${resultado.codigo}`);
    const dias = diasEsperando(esperando, [envioReciente], AHORA);
    expect(dias).toBe(3);
    const insight = resultado.insights.find((i) => i.tipo_regla === 'SUPERVISION_DEMORADA');
    expect(insight?.titulo).toBe(`PRB-001 espera supervisión hace ${dias} días`);
  });
});

describe('veces devuelta', () => {
  it('V-1 cuenta las devoluciones de esa tarea y no las de otra', () => {
    const historial = [
      ev('TAREA_DEVUELTA', en(1), 't-v', IDS.supervisor),
      ev('TAREA_DEVUELTA', en(3), 't-v', IDS.supervisor),
      ev('TAREA_DEVUELTA', en(2), 't-otra', IDS.supervisor),
    ];
    expect(vecesDevuelta('t-v', historial)).toBe(2);
    expect(vecesDevuelta('t-sin', historial)).toBe(0);
  });

  it('V-2 reabrir una tarea no es devolverla', () => {
    const historial = [
      ev('TAREA_DEVUELTA', en(1), 't-v', IDS.supervisor),
      ev('TAREA_REABIERTA', en(5), 't-v', IDS.supervisor),
      ev('TAREA_REABIERTA', en(8), 't-v', IDS.supervisor),
    ];
    expect(vecesDevuelta('t-v', historial)).toBe(1);
  });
});

describe('carga', () => {
  const enCurso = (id: Id, cambios: Partial<Tarea> = {}) =>
    tarea({ id, estado: 'EN_PROGRESO', ...cambios });

  it('K-1 la carga son solo las EN_PROGRESO de esa persona en los proyectos indicados', () => {
    const tareas = [
      enCurso('t1'),
      enCurso('t2'),
      tarea({ id: 't3', estado: 'ESPERANDO_SUPERVISION' }),
      terminada('t4', en(1)),
      enCurso('t5', { id_practicante: 'u-otro' }),
      enCurso('t6', { id_proyecto: 'p-otro' }),
    ];
    expect(cargaDePracticante(IDS.practicante, tareas, [IDS.proyecto])).toBe(2);
  });

  it('K-2 la carga incluye los proyectos EN_PAUSA y excluye los FINALIZADO', () => {
    const proyectos = [
      { id: 'pa', estado: 'ACTIVO' as const },
      { id: 'pb', estado: 'EN_PAUSA' as const },
      { id: 'pc', estado: 'FINALIZADO' as const },
    ];
    const asignaciones = proyectos.map((p, i) => asignacion({ id: `a-${i}`, id_proyecto: p.id }));
    const ids = proyectosDeCarga(IDS.practicante, asignaciones, proyectos);
    expect(ids).toEqual(['pa', 'pb']);
    const tareas = [
      enCurso('t1', { id_proyecto: 'pa' }),
      enCurso('t2', { id_proyecto: 'pb' }),
      enCurso('t3', { id_proyecto: 'pc' }),
    ];
    expect(cargaDePracticante(IDS.practicante, tareas, ids)).toBe(2);
  });

  it('K-3 una asignación con baja no suma a la carga', () => {
    const asignaciones = [
      asignacion({ id: 'a-1', id_proyecto: 'pa', fecha_baja: '2026-11-01' }),
      asignacion({ id: 'a-2', id_proyecto: 'pb', id_practicante: 'u-otro' }),
    ];
    const proyectos = [
      { id: 'pa', estado: 'ACTIVO' as const },
      { id: 'pb', estado: 'ACTIVO' as const },
    ];
    expect(proyectosDeCarga(IDS.practicante, asignaciones, proyectos)).toEqual([]);
  });
});

describe('alcance y forma del resultado', () => {
  const P1 = proyecto({ id: 'p-1', codigo: 'UNO', id_supervisor: IDS.supervisor });
  const P2 = proyecto({ id: 'p-2', codigo: 'DOS', id_supervisor: IDS.supervisorAjeno });
  const enP = (id: Id, idProyecto: Id, cambios: Partial<Tarea> = {}) =>
    terminada(id, haceDias(3), { id_proyecto: idProyecto, ...cambios });

  function mundoDosProyectos() {
    return datos({
      proyectos: [P1, P2],
      tareas: [enP('t-1', 'p-1'), enP('t-2', 'p-2')],
    });
  }

  it('L-1 el Supervisor solo ve sus proyectos y el Administrador todos', () => {
    const delSupervisor = calcular(SUP, mundoDosProyectos());
    expect(delSupervisor.por_proyecto.map((p) => p.id_proyecto)).toEqual(['p-1']);
    expect(delSupervisor.resumen.tareas_terminadas).toBe(1);
    const delAdmin = calcular(ADMIN, mundoDosProyectos());
    expect(delAdmin.por_proyecto.map((p) => p.id_proyecto)).toEqual(['p-1', 'p-2']);
    expect(delAdmin.resumen.tareas_terminadas).toBe(2);
  });

  it('L-2 el Practicante y un usuario INACTIVO reciben el resultado vacío, sin error', () => {
    for (const quien of [PRAC, usuario('SUPERVISOR', { estado: 'INACTIVO' })]) {
      const resultado = calcular(quien, mundoDosProyectos());
      expect(resultado.por_proyecto).toEqual([]);
      expect(resultado.por_practicante).toEqual([]);
      expect(resultado.resumen).toEqual({
        tareas_terminadas: 0,
        tiempo_ciclo_dias: null,
        espera_supervision_dias: null,
        tasa_devolucion: null,
      });
    }
  });

  it('L-3 el Supervisor que filtra por un proyecto ajeno recibe vacío y no un error', () => {
    const resultado = calcular(SUP, mundoDosProyectos(), { dias: 30, id_proyecto: 'p-2' });
    expect(resultado.por_proyecto).toEqual([]);
    expect(resultado.resumen.tareas_terminadas).toBe(0);
  });

  it('L-4 un practicante en un proyecto del Supervisor y en uno ajeno: el Supervisor solo ve lo suyo', () => {
    const d = datos({
      proyectos: [P1, P2],
      asignaciones: [
        asignacion({ id: 'a-1', id_proyecto: 'p-1' }),
        asignacion({ id: 'a-2', id_proyecto: 'p-2' }),
      ],
      tareas: [
        tarea({ id: 'c-1', estado: 'EN_PROGRESO', id_proyecto: 'p-1' }),
        tarea({ id: 'c-2', estado: 'EN_PROGRESO', id_proyecto: 'p-2' }),
        tarea({ id: 'c-3', estado: 'EN_PROGRESO', id_proyecto: 'p-2' }),
        enP('t-1', 'p-1'),
        enP('t-2', 'p-2'),
      ],
      historial: [
        ev('TAREA_TOMADA', haceDias(5), 'c-1', IDS.practicante, 'p-1'),
        ev('TAREA_TOMADA', haceDias(1), 'c-2', IDS.practicante, 'p-2'),
      ],
    });
    const fila = calcular(SUP, d).por_practicante[0];
    expect(fila).toMatchObject({
      id_practicante: IDS.practicante,
      carga: 1,
      tareas_terminadas: 1,
      ultima_actividad: haceDias(5),
    });
    expect(calcular(ADMIN, d).por_practicante[0]).toMatchObject({ carga: 3, tareas_terminadas: 2 });
  });

  it('L-5 aparece quien se fue el primer día del periodo (baja el 18-oct) y no quien se fue el día anterior', () => {
    const resultado = calcular(
      ADMIN,
      datos({
        asignaciones: [
          asignacion({ id: 'a-a', id_practicante: 'u-a', fecha_baja: '2026-10-18' }),
          asignacion({ id: 'a-b', id_practicante: 'u-b', fecha_baja: '2026-10-17' }),
          asignacion({ id: 'a-c', id_practicante: 'u-c', fecha_baja: null }),
        ],
      }),
    );
    expect(resultado.por_practicante.map((f) => f.id_practicante)).toEqual(['u-a', 'u-c']);
  });

  it('L-9 no aparece quien se asigna después de hoy; el día de hoy sí, y hoy se corta en hora de Perú', () => {
    const asignaciones = [
      asignacion({ id: 'a-futura', id_practicante: 'u-futura', fecha_alta: '2026-11-17' }),
      asignacion({ id: 'a-hoy', id_practicante: 'u-hoy', fecha_alta: '2026-11-16' }),
      asignacion({ id: 'a-ayer', id_practicante: 'u-ayer', fecha_alta: '2026-11-15' }),
    ];
    const filas = (ahora: FechaHora) =>
      calcular(ADMIN, datos({ asignaciones }), TODOS, ahora).por_practicante.map(
        (f) => f.id_practicante,
      );
    expect(filas(AHORA)).toEqual(['u-hoy', 'u-ayer']);
    // A las 22:00 del 15 en Perú (03:00 UTC del 16) la asignación del 16 todavía es futura.
    expect(filas('2026-11-16T03:00:00.000Z')).toEqual(['u-ayer']);
  });

  it('L-6 los proyectos FINALIZADO aparecen para el Administrador y para su Supervisor', () => {
    const finalizado = proyecto({ id: 'p-fin', codigo: 'FIN', estado: 'FINALIZADO' });
    const d = datos({ proyectos: [finalizado] });
    expect(calcular(ADMIN, d).por_proyecto.map((p) => p.id_proyecto)).toEqual(['p-fin']);
    expect(calcular(SUP, d).por_proyecto.map((p) => p.id_proyecto)).toEqual(['p-fin']);
  });

  it('L-7 el resultado no trae postulaciones ni área técnica: las claves son exactas', () => {
    const resultado = calcular(
      ADMIN,
      datos({ asignaciones: [asignacion()], tareas: [tarea({ id: 't-1' })] }),
    );
    expect(Object.keys(resultado)).toEqual([
      'ok',
      'periodo',
      'resumen',
      'por_proyecto',
      'por_practicante',
    ]);
    expect(Object.keys(resultado.resumen)).toEqual([
      'tareas_terminadas',
      'tiempo_ciclo_dias',
      'espera_supervision_dias',
      'tasa_devolucion',
    ]);
    expect(Object.keys(resultado.por_proyecto[0] ?? {}).sort()).toEqual(
      [
        'id_proyecto',
        'tareas_terminadas',
        'tiempo_ciclo_dias',
        'espera_supervision_dias',
        'tasa_devolucion',
        'avance',
        'ultima_actividad',
      ].sort(),
    );
    expect(Object.keys(resultado.por_practicante[0] ?? {}).sort()).toEqual(
      [
        'id_practicante',
        'tareas_terminadas',
        'tiempo_ciclo_dias',
        'tasa_devolucion',
        'carga',
        'ultima_actividad',
      ].sort(),
    );
  });

  it('L-8 el Administrador que filtra por un proyecto recibe solo ese', () => {
    const resultado = calcular(ADMIN, mundoDosProyectos(), { dias: 30, id_proyecto: 'p-1' });
    expect(resultado.por_proyecto.map((p) => p.id_proyecto)).toEqual(['p-1']);
    expect(resultado.resumen.tareas_terminadas).toBe(1);
  });
});

describe('resumen y entrada', () => {
  it('R-1 el resumen promedia todas las muestras, no los promedios de cada proyecto', () => {
    const a1 = conCiclo('a-1', 1, { id_proyecto: 'p-a' });
    const a2 = conCiclo('a-2', 3, { id_proyecto: 'p-a' });
    const b1 = conCiclo('b-1', 5, { id_proyecto: 'p-b' });
    const conProyecto = (c: ReturnType<typeof conCiclo>, idProyecto: Id) =>
      c.historial.map((e) => ({ ...e, id_proyecto: idProyecto }));
    const resultado = calcular(
      ADMIN,
      datos({
        proyectos: [proyecto({ id: 'p-a', codigo: 'AAA' }), proyecto({ id: 'p-b', codigo: 'BBB' })],
        tareas: [a1.tarea, a2.tarea, b1.tarea],
        historial: [
          ...conProyecto(a1, 'p-a'),
          ...conProyecto(a2, 'p-a'),
          ...conProyecto(b1, 'p-b'),
        ],
      }),
    );
    expect(resultado.resumen.tiempo_ciclo_dias).toBe(3);
    expect(resultado.por_proyecto.map((p) => p.tiempo_ciclo_dias)).toEqual([2, 5]);
  });

  it('N-1 no modifica el historial que recibe, ni siquiera si viene desordenado', () => {
    const t = terminada('t-n', en(4), { requiere_supervision: true });
    const historial = [
      ev('TAREA_APROBADA', en(4), 't-n', IDS.supervisor),
      ev('TAREA_TOMADA', en(0), 't-n'),
      ev('TAREA_ENVIADA_A_SUPERVISION', en(3), 't-n'),
    ];
    const copia = historial.map((e) => ({ ...e }));
    Object.freeze(historial);
    calcular(ADMIN, datos({ tareas: [t], historial }));
    expect(tiempoCicloMs(t, historial)).toBe(4 * DIA);
    expect(enviosASupervision('t-n', historial)).toHaveLength(1);
    expect(historial).toEqual(copia);
  });
});

import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import type { Fecha, FechaHora } from './comunes';
import { CATALOGO_PARAMETROS } from './configuracion';
import { TIPOS_REGLA_INSIGHT } from './enumeraciones';
import type { TipoReglaInsight } from './enumeraciones';
import type { EventoHistorial } from './historial';
import type { Insight, InsightRevision } from './insights';
import { puede } from './permisos';
import type { Asignacion, Proyecto } from './proyectos';
import {
  aplicarRevisiones,
  calcularInsights,
  estaVencida,
  filtrarInsightsPorAlcance,
  hoyEn,
  insightsParaUsuario,
  ordenarInsights,
  validarUmbrales,
} from './reglasInsights';
import type { ClaveUmbralInsight, DatosInsights, UmbralesInsight } from './reglasInsights';
import type { Tarea } from './tareas';
import type { Practicante, Usuario } from './usuarios';
import {
  IDS,
  asignacion,
  evento,
  postulante,
  practicanteDetalle,
  proyecto,
  revision,
  tarea,
  usuario,
} from './pruebas/fabricas';

/** 15:00 en hora de Perú: `hoy` es el 15 de noviembre. */
const AHORA = '2026-11-15T20:00:00.000Z';
const HOY = '2026-11-15';
const DIA = 86_400_000;

/** Los umbrales iniciales, leídos del catálogo de Configuración. */
const UMBRALES = Object.fromEntries(
  CATALOGO_PARAMETROS.flatMap((p) =>
    p.clave.startsWith('INSIGHT_') && p.valor.tipo === 'numero' ? [[p.clave, p.valor.valor]] : [],
  ),
) as UmbralesInsight;

const CLAVES = Object.keys(UMBRALES) as ClaveUmbralInsight[];

function haceDias(dias: number, horas = 0, minutos = 0): FechaHora {
  return new Date(
    Date.parse(AHORA) - dias * DIA - horas * 3_600_000 - minutos * 60_000,
  ).toISOString();
}

/** Fecha de calendario a `desplazamiento` días de `base` (negativo = pasado). */
function fecha(desplazamiento: number, base: Fecha = HOY): Fecha {
  return new Date(Date.parse(base) + desplazamiento * DIA).toISOString().slice(0, 10);
}

function datos(cambios: Partial<DatosInsights> = {}): DatosInsights {
  return {
    usuarios: [],
    practicantes: [],
    proyectos: [],
    asignaciones: [],
    tareas: [],
    historial: [],
    postulantes: [],
    ...cambios,
  };
}

function calcular(d: DatosInsights, umbrales = UMBRALES, ahora = AHORA): Insight[] {
  const resultado = calcularInsights(d, umbrales, ahora);
  if (!resultado.ok) throw new Error(`Se esperaba un cálculo válido y llegó ${resultado.codigo}`);
  return resultado.insights;
}

function deRegla(
  d: DatosInsights,
  tipo: TipoReglaInsight,
  umbrales = UMBRALES,
  ahora = AHORA,
): Insight[] {
  return calcular(d, umbrales, ahora).filter((i) => i.tipo_regla === tipo);
}

const LUIS = usuario('PRACTICANTE', { nombre: 'Luis Quispe' });
const P2 = proyecto({ id: 'p-dos', codigo: 'DOS', nombre: 'Proyecto dos' });
const ASIG_P2 = asignacion({ id: 'a-dos', id_proyecto: P2.id });

interface Mundo {
  usuario?: Usuario;
  practicantes?: Practicante[];
  proyectos?: Proyecto[];
  asignaciones?: Asignacion[];
  historial?: EventoHistorial[];
  tareas?: Tarea[];
}

/** Luis, practicante ACTIVO, asignado desde el 2026-02-01 al proyecto base (ACTIVO). */
function mundoPracticante(m: Mundo = {}): DatosInsights {
  return datos({
    usuarios: [m.usuario ?? LUIS],
    practicantes: m.practicantes ?? [practicanteDetalle()],
    proyectos: m.proyectos ?? [proyecto()],
    asignaciones: m.asignaciones ?? [asignacion()],
    historial: m.historial ?? [],
    tareas: m.tareas ?? [],
  });
}

/** Evento cuyo autor es Luis. */
function propio(fechaEvento: FechaHora, cambios: Partial<EventoHistorial> = {}): EventoHistorial {
  return evento({ fecha: fechaEvento, ...cambios });
}

const sobreLuis = { tipo: 'USUARIO', id: LUIS.id, etiqueta: 'Luis Quispe' } as const;

describe('zona horaria, ahora y vencida', () => {
  it('Z-1 hoy se corta a la medianoche en hora de Perú (UTC−5)', () => {
    expect(hoyEn('2026-11-16T04:59:59.999Z')).toBe('2026-11-15');
    expect(hoyEn('2026-11-16T05:00:00.000Z')).toBe('2026-11-16');
  });

  it('Z-2 una tarea que vence el 15 recién está vencida a las 00:00 del 16 en Perú', () => {
    const p = proyecto({
      id: 'p-zona',
      fecha_inicio: '2026-11-01',
      fecha_fin_prevista: '2027-11-01',
    });
    const tareas = ['2026-11-15', '2026-12-20', '2026-12-20', '2026-12-20'].map((limite, i) =>
      tarea({
        id: `t-zona-${i}`,
        id_proyecto: p.id,
        id_practicante: null,
        estado: 'DISPONIBLE',
        fecha_limite: limite,
      }),
    );
    const d = datos({ proyectos: [p], tareas });

    expect(deRegla(d, 'POSIBLE_ATRASO_PROYECTO', UMBRALES, '2026-11-16T04:30:00.000Z')).toEqual([]);
    expect(
      deRegla(d, 'POSIBLE_ATRASO_PROYECTO', UMBRALES, '2026-11-16T05:00:00.000Z'),
    ).toHaveLength(1);
  });

  it.each(['', 'ayer', '2026-11-15', '2026-11-15T20:00:00'])(
    'Z-3 ahora inválido (%j) da AHORA_INVALIDO',
    (ahora) => {
      expect(
        insightsParaUsuario(usuario('ADMINISTRADOR'), datos(), UMBRALES, [], ahora),
      ).toMatchObject({ ok: false, codigo: 'AHORA_INVALIDO' });
    },
  );

  it('Z-4 ahora se comprueba antes que los umbrales', () => {
    expect(
      calcularInsights(datos(), { ...UMBRALES, INSIGHT_INACTIVO_DIAS: 0 }, 'ayer'),
    ).toMatchObject({ ok: false, codigo: 'AHORA_INVALIDO' });
  });

  it('E-1 vencida = fecha límite ya pasada y no terminada', () => {
    expect(estaVencida({ estado: 'EN_PROGRESO', fecha_limite: HOY }, HOY)).toBe(false);
    expect(estaVencida({ estado: 'EN_PROGRESO', fecha_limite: fecha(-1) }, HOY)).toBe(true);
    expect(estaVencida({ estado: 'TERMINADA', fecha_limite: fecha(-1) }, HOY)).toBe(false);
    expect(estaVencida({ estado: 'ESPERANDO_SUPERVISION', fecha_limite: fecha(-1) }, HOY)).toBe(
      true,
    );
  });
});

describe('umbrales', () => {
  const DIAS: ClaveUmbralInsight[] = [
    'INSIGHT_INACTIVO_DIAS',
    'INSIGHT_INACTIVO_CRITICO_DIAS',
    'INSIGHT_PROYECTO_SIN_ACTIVIDAD_DIAS',
    'INSIGHT_SUPERVISION_DEMORADA_DIAS',
    'INSIGHT_POSTULACION_DIAS',
    'INSIGHT_FIN_PRACTICA_DIAS',
  ];

  it('U-1 los 10 valores iniciales del catálogo son válidos', () => {
    expect(CLAVES).toHaveLength(10);
    expect(validarUmbrales(UMBRALES)).toEqual({ ok: true });
  });

  it.each(DIAS)('U-2 %s en 0 es inválido', (clave) => {
    expect(validarUmbrales({ ...UMBRALES, [clave]: 0 })).toMatchObject({
      ok: false,
      codigo: 'UMBRAL_INVALIDO',
      clave,
    });
  });

  it.each(CLAVES.flatMap((clave) => [7.5, Number.NaN, -1].map((valor) => [clave, valor] as const)))(
    'U-3 %s con %d es inválido',
    (clave, valor) => {
      expect(validarUmbrales({ ...UMBRALES, [clave]: valor })).toMatchObject({
        ok: false,
        codigo: 'UMBRAL_INVALIDO',
        clave,
      });
    },
  );

  it('U-4 la carga mínima debe ser menor que la máxima', () => {
    expect(
      validarUmbrales({
        ...UMBRALES,
        INSIGHT_CARGA_MINIMA_TAREAS: 3,
        INSIGHT_CARGA_MAXIMA_TAREAS: 3,
      }),
    ).toMatchObject({ ok: false, clave: 'INSIGHT_CARGA_MINIMA_TAREAS' });
    expect(
      validarUmbrales({
        ...UMBRALES,
        INSIGHT_CARGA_MINIMA_TAREAS: 0,
        INSIGHT_CARGA_MAXIMA_TAREAS: 3,
      }),
    ).toEqual({ ok: true });
  });

  it.each(['INSIGHT_ATRASO_PUNTOS', 'INSIGHT_ATRASO_PORCENTAJE'] as const)(
    'U-5 %s admite 100 y rechaza 101',
    (clave) => {
      expect(validarUmbrales({ ...UMBRALES, [clave]: 100 })).toEqual({ ok: true });
      expect(validarUmbrales({ ...UMBRALES, [clave]: 101 })).toMatchObject({ ok: false, clave });
    },
  );

  it('U-6 el umbral crítico de inactividad debe superar al de atención', () => {
    expect(
      validarUmbrales({
        ...UMBRALES,
        INSIGHT_INACTIVO_DIAS: 7,
        INSIGHT_INACTIVO_CRITICO_DIAS: 7,
      }),
    ).toMatchObject({ ok: false, clave: 'INSIGHT_INACTIVO_CRITICO_DIAS' });
    expect(
      validarUmbrales({
        ...UMBRALES,
        INSIGHT_INACTIVO_DIAS: 7,
        INSIGHT_INACTIVO_CRITICO_DIAS: 8,
      }),
    ).toEqual({ ok: true });
  });

  it('U-7 se informa la primera clave del catálogo, y lo individual antes que lo relacional', () => {
    expect(
      validarUmbrales({ ...UMBRALES, INSIGHT_INACTIVO_DIAS: 0, INSIGHT_FIN_PRACTICA_DIAS: 0 }),
    ).toMatchObject({ clave: 'INSIGHT_INACTIVO_DIAS' });
    expect(
      validarUmbrales({
        ...UMBRALES,
        INSIGHT_CARGA_MINIMA_TAREAS: 3,
        INSIGHT_CARGA_MAXIMA_TAREAS: 3,
        INSIGHT_FIN_PRACTICA_DIAS: 0,
      }),
    ).toMatchObject({ clave: 'INSIGHT_FIN_PRACTICA_DIAS' });
  });

  it('U-8 con un umbral inválido no se calcula ningún insight', () => {
    const d = mundoPracticante({ historial: [propio(haceDias(10))] });
    const invalidos = { ...UMBRALES, INSIGHT_POSTULACION_DIAS: 0 };

    expect(calcularInsights(d, invalidos, AHORA)).toMatchObject({
      ok: false,
      codigo: 'UMBRAL_INVALIDO',
      clave: 'INSIGHT_POSTULACION_DIAS',
    });
    expect(insightsParaUsuario(usuario('ADMINISTRADOR'), d, invalidos, [], AHORA)).toMatchObject({
      ok: false,
      codigo: 'UMBRAL_INVALIDO',
    });
  });
});

describe('practicante inactivo', () => {
  const inactivo = (m: Mundo) => deRegla(mundoPracticante(m), 'PRACTICANTE_INACTIVO');

  it('I-1 justo en el umbral: 7 días exactos dan ATENCIÓN', () => {
    expect(inactivo({ historial: [propio(haceDias(7))] }).map((i) => i.severidad)).toEqual([
      'ATENCION',
    ]);
  });

  it('I-2 días completos: 6 días y 23:59 h todavía no disparan', () => {
    expect(inactivo({ historial: [propio(haceDias(6, 23, 59))] })).toEqual([]);
  });

  it('I-3 14 días dan CRÍTICO y 13 dan ATENCIÓN', () => {
    expect(inactivo({ historial: [propio(haceDias(14))] }).map((i) => i.severidad)).toEqual([
      'CRITICO',
    ]);
    expect(inactivo({ historial: [propio(haceDias(13))] }).map((i) => i.severidad)).toEqual([
      'ATENCION',
    ]);
  });

  it('I-4 cuenta cualquier acción suya, también de su cuenta', () => {
    const historial = [
      propio(haceDias(20)),
      propio(haceDias(2), {
        id: 'e-cuenta',
        tipo_accion: 'CUENTA_CONTRASENA_CAMBIADA',
        elemento: sobreLuis,
        id_proyecto: null,
      }),
    ];
    expect(inactivo({ historial })).toEqual([]);
  });

  it('I-5 no cuenta lo que otra persona o el Sistema hacen sobre él', () => {
    const historial: EventoHistorial[] = [
      propio(haceDias(10)),
      evento({
        id: 'e-restablecer',
        fecha: haceDias(1),
        autor: { tipo: 'USUARIO', id_usuario: IDS.admin },
        tipo_accion: 'PRACTICANTE_CONTRASENA_RESTABLECIDA',
        elemento: sobreLuis,
        id_proyecto: null,
      }),
      evento({
        id: 'e-asignar',
        fecha: haceDias(1),
        autor: { tipo: 'USUARIO', id_usuario: IDS.admin },
        tipo_accion: 'PRACTICANTE_ASIGNADO_A_PROYECTO',
        elemento: sobreLuis,
      }),
      evento({
        id: 'e-sistema',
        fecha: haceDias(1),
        autor: { tipo: 'SISTEMA' },
        tipo_accion: 'TAREA_LIBERADA',
        elemento: sobreLuis,
      }),
    ];
    expect(inactivo({ historial }).map((i) => i.titulo)).toEqual([
      'Luis Quispe sin actividad hace 10 días',
    ]);
  });

  it('I-6 recién asignado: el reloj arranca en su asignación, no en su cuenta', () => {
    expect(
      inactivo({
        usuario: { ...LUIS, fecha_alta: haceDias(60) },
        asignaciones: [asignacion({ fecha_alta: fecha(-3) })],
      }),
    ).toEqual([]);
  });

  it('I-7 una asignación nueva no reinicia el reloj: manda la asignación vigente más antigua', () => {
    const resultado = inactivo({
      proyectos: [proyecto(), P2],
      asignaciones: [asignacion({ fecha_alta: fecha(-60) }), { ...ASIG_P2, fecha_alta: fecha(-1) }],
      historial: [propio(haceDias(20))],
    });
    expect(resultado.map((i) => i.titulo)).toEqual(['Luis Quispe sin actividad hace 20 días']);
  });

  it.each<[string, Mundo]>([
    ['sin asignaciones', { asignaciones: [] }],
    [
      'con su asignación dada de baja',
      { asignaciones: [asignacion({ fecha_baja: '2026-10-01' })] },
    ],
    ['solo en un proyecto EN_PAUSA', { proyectos: [proyecto({ estado: 'EN_PAUSA' })] }],
    [
      'solo en un proyecto FINALIZADO',
      { proyectos: [proyecto({ estado: 'FINALIZADO', fecha_fin_real: '2026-10-01' })] },
    ],
  ])('I-8 %s no se evalúa', (_caso, mundo) => {
    expect(inactivo(mundo)).toEqual([]);
  });

  it('I-9 un practicante INACTIVO (finalizado) no se evalúa', () => {
    expect(inactivo({ usuario: { ...LUIS, estado: 'INACTIVO' } })).toEqual([]);
  });

  it('I-10 ids_proyecto lleva solo sus proyectos ACTIVO vigentes', () => {
    const pausa = proyecto({ id: 'p-pausa', estado: 'EN_PAUSA' });
    const conBaja = proyecto({ id: 'p-baja' });
    const finalizado = proyecto({
      id: 'p-fin',
      estado: 'FINALIZADO',
      fecha_fin_real: '2026-10-01',
    });
    const resultado = inactivo({
      proyectos: [proyecto(), pausa, conBaja, finalizado],
      asignaciones: [
        asignacion(),
        asignacion({ id: 'a-pausa', id_proyecto: pausa.id }),
        asignacion({ id: 'a-baja', id_proyecto: conBaja.id, fecha_baja: '2026-10-01' }),
        asignacion({ id: 'a-fin', id_proyecto: finalizado.id }),
      ],
    });
    expect(resultado.map((i) => i.ids_proyecto)).toEqual([[IDS.proyecto]]);
  });

  it('I-11 la fecha de detección es el último evento más el umbral de atención, aun en crítico', () => {
    const resultado = inactivo({ historial: [propio(haceDias(20))] });
    expect(resultado.map((i) => [i.severidad, i.fecha_deteccion])).toEqual([
      ['CRITICO', haceDias(13)],
    ]);
  });

  it('I-12 título, elemento y alcance del insight', () => {
    expect(inactivo({ historial: [propio(haceDias(12))] })).toMatchObject([
      {
        tipo_regla: 'PRACTICANTE_INACTIVO',
        severidad: 'ATENCION',
        titulo: 'Luis Quispe sin actividad hace 12 días',
        elemento: { tipo: 'USUARIO', id: LUIS.id },
        revisado: false,
        ids_proyecto: [IDS.proyecto],
      },
    ]);
  });
});

describe('carga desbalanceada', () => {
  const carga = (m: Mundo, umbrales = UMBRALES) =>
    deRegla(mundoPracticante(m), 'CARGA_DESBALANCEADA', umbrales);

  function enProgreso(n: number, idProyecto: string = IDS.proyecto): Tarea[] {
    return Array.from({ length: n }, (_, i) =>
      tarea({ id: `t-${idProyecto}-${i}`, id_proyecto: idProyecto, estado: 'EN_PROGRESO' }),
    );
  }

  function disponible(idProyecto: string = IDS.proyecto): Tarea {
    return tarea({
      id: `t-disponible-${idProyecto}`,
      id_proyecto: idProyecto,
      id_practicante: null,
      estado: 'DISPONIBLE',
    });
  }

  it('C-1 más de 3: 4 en progreso disparan y 3 no', () => {
    expect(carga({ tareas: enProgreso(4) })).toHaveLength(1);
    expect(carga({ tareas: enProgreso(3) })).toEqual([]);
  });

  it('C-2 la carga es de la persona: suma sus proyectos y lleva los dos ids', () => {
    const resultado = carga({
      proyectos: [proyecto(), P2],
      asignaciones: [asignacion(), ASIG_P2],
      tareas: [...enProgreso(2), ...enProgreso(2, P2.id)],
    });
    expect(resultado.map((i) => [...i.ids_proyecto].sort())).toEqual([
      [IDS.proyecto, P2.id].sort(),
    ]);
  });

  it('C-3 no cuentan las tareas de otro practicante ni las de otros estados', () => {
    const tareas = [
      ...enProgreso(3),
      tarea({ id: 't-ajena', estado: 'EN_PROGRESO', id_practicante: IDS.practicanteAjeno }),
      tarea({ id: 't-esperando', estado: 'ESPERANDO_SUPERVISION' }),
      tarea({ id: 't-terminada', estado: 'TERMINADA' }),
    ];
    expect(carga({ tareas })).toEqual([]);
  });

  it('C-4 cuentan las EN_PROGRESO de un proyecto EN_PAUSA', () => {
    const pausa = { ...P2, estado: 'EN_PAUSA' as const };
    const resultado = carga({
      proyectos: [proyecto(), pausa],
      asignaciones: [asignacion(), ASIG_P2],
      tareas: [...enProgreso(3), ...enProgreso(1, pausa.id)],
    });
    expect(resultado.map((i) => [i.titulo, [...i.ids_proyecto].sort()])).toEqual([
      ['Luis Quispe tiene 4 tareas en progreso', [IDS.proyecto, pausa.id].sort()],
    ]);
  });

  it('C-5 sin ningún proyecto ACTIVO vigente no se evalúa', () => {
    const pausa = { ...P2, estado: 'EN_PAUSA' as const };
    expect(
      carga({ proyectos: [pausa], asignaciones: [ASIG_P2], tareas: enProgreso(5, pausa.id) }),
    ).toEqual([]);
  });

  it('C-6 ninguna en progreso dispara solo si su proyecto ACTIVO tiene disponibles', () => {
    expect(carga({ tareas: [disponible()] })).toHaveLength(1);
    expect(carga({ tareas: [] })).toEqual([]);
  });

  it('C-7 las disponibles de un proyecto EN_PAUSA no cuentan para el mínimo', () => {
    const pausa = { ...P2, estado: 'EN_PAUSA' as const };
    expect(
      carga({
        proyectos: [proyecto(), pausa],
        asignaciones: [asignacion(), ASIG_P2],
        tareas: [disponible(pausa.id)],
      }),
    ).toEqual([]);
  });

  it('C-8 la carga mínima es un parámetro', () => {
    expect(
      carga(
        { tareas: [...enProgreso(1), disponible()] },
        { ...UMBRALES, INSIGHT_CARGA_MINIMA_TAREAS: 1 },
      ),
    ).toHaveLength(1);
  });

  it('C-9 severidad ATENCIÓN y fecha de detección = ahora', () => {
    expect(carga({ tareas: enProgreso(4) }).map((i) => [i.severidad, i.fecha_deteccion])).toEqual([
      ['ATENCION', AHORA],
    ]);
  });

  it('C-10 un practicante INACTIVO no se evalúa', () => {
    expect(carga({ usuario: { ...LUIS, estado: 'INACTIVO' }, tareas: enProgreso(5) })).toEqual([]);
  });
});

describe('posible atraso del proyecto', () => {
  /** Del 01 al 10 de noviembre: 10 días con el último incluido. */
  const PA = proyecto({
    id: 'p-atraso',
    codigo: 'ATR',
    nombre: 'Proyecto atrasado',
    fecha_inicio: '2026-11-01',
    fecha_fin_prevista: '2026-11-10',
  });
  const AHORA_4_NOV = '2026-11-04T20:00:00.000Z';

  /** `n` tareas: las primeras `terminadas`, luego `vencidas` (límite pasado) y el resto a futuro. */
  function tareasDe(
    idProyecto: string,
    n: number,
    { terminadas = 0, vencidas = 0 }: { terminadas?: number; vencidas?: number } = {},
  ): Tarea[] {
    return Array.from({ length: n }, (_, i) =>
      tarea({
        id: `t-${idProyecto}-${i}`,
        numero: i + 1,
        id_proyecto: idProyecto,
        id_practicante: null,
        estado: i < terminadas ? 'TERMINADA' : 'DISPONIBLE',
        fecha_limite: i >= terminadas && i < terminadas + vencidas ? '2026-01-01' : '2027-12-31',
      }),
    );
  }

  const atraso = (p: Proyecto, tareas: Tarea[], ahora = AHORA, umbrales = UMBRALES) =>
    deRegla(datos({ proyectos: [p], tareas }), 'POSIBLE_ATRASO_PROYECTO', umbrales, ahora);

  /** Empieza hoy: el avance esperado es 0 % y solo puede disparar el tramo de vencidas. */
  const DESDE_HOY = proyecto({ id: 'p-hoy', fecha_inicio: HOY, fecha_fin_prevista: '2026-12-31' });

  it('A-1 justo en 20 puntos dispara y 19,66 no', () => {
    expect(atraso(PA, tareasDe(PA.id, 10, { terminadas: 1 }), AHORA_4_NOV)).toHaveLength(1);
    // n = 29, k = 3: 100·3·29 − 100·3·10 = 5700 < 20·10·29 = 5800.
    expect(atraso(PA, tareasDe(PA.id, 29, { terminadas: 3 }), AHORA_4_NOV)).toEqual([]);
    expect(atraso(PA, tareasDe(PA.id, 10, { terminadas: 2 }), AHORA_4_NOV)).toEqual([]);
  });

  it('A-2 cálculo con enteros: 70 % − 50 % es 20 exacto (en coma flotante, 19,999…)', () => {
    // Hoy 08-nov: t = 7 de d = 10; 1 de 2 terminadas. En JavaScript (7/10 − 1/2) × 100 da
    // 19.999999999999996 y no dispararía; con enteros, 100·7·2 − 100·1·10 = 400 ≥ 20·10·2 = 400.
    // (Ojo: (3/10 − 1/10) × 100 da 20 exacto en JavaScript, así que no sirve para esta prueba.)
    const resultado = atraso(PA, tareasDe(PA.id, 2, { terminadas: 1 }), '2026-11-08T20:00:00.000Z');
    expect(resultado.map((i) => i.motivo)).toEqual([
      'Avance real 50 % frente a 70 % esperado (20 puntos; umbral 20).',
    ]);
  });

  it('A-3 el 25 % de vencidas se calcula sobre el total de tareas', () => {
    expect(atraso(DESDE_HOY, tareasDe(DESDE_HOY.id, 20, { vencidas: 5 }))).toHaveLength(1);
    expect(atraso(DESDE_HOY, tareasDe(DESDE_HOY.id, 20, { vencidas: 4 }))).toEqual([]);
    // 3 de 20 es el 15 % del total, aunque sea el 75 % de las 4 no terminadas.
    expect(atraso(DESDE_HOY, tareasDe(DESDE_HOY.id, 20, { terminadas: 16, vencidas: 3 }))).toEqual(
      [],
    );
  });

  it('A-4 un proyecto sin tareas no se evalúa (nunca divide entre cero)', () => {
    expect(() => atraso(PA, [], '2026-11-10T20:00:00.000Z')).not.toThrow();
    expect(atraso(PA, [], '2026-11-10T20:00:00.000Z')).toEqual([]);
  });

  it.each([
    ['fin igual al inicio', '2026-11-01', '2026-11-01'],
    ['fin antes del inicio', '2026-11-10', '2026-11-01'],
  ])('A-5 %s: solo se evalúa el tramo de vencidas', (_caso, inicio, fin) => {
    const p = proyecto({ id: 'p-fechas', fecha_inicio: inicio, fecha_fin_prevista: fin });
    expect(atraso(p, tareasDe(p.id, 20))).toEqual([]);
    const conVencidas = atraso(p, tareasDe(p.id, 20, { vencidas: 5 }));
    expect(conVencidas.map((i) => i.motivo)).toEqual([
      '5 de 20 tareas vencidas (25 %; umbral 25 %).',
    ]);
  });

  it('A-6 la duración incluye el último día', () => {
    const el10 = '2026-11-10T20:00:00.000Z';
    expect(atraso(PA, tareasDe(PA.id, 10, { terminadas: 7 }), el10).map((i) => i.motivo)).toEqual([
      'Avance real 70 % frente a 90 % esperado (20 puntos; umbral 20).',
    ]);
    expect(atraso(PA, tareasDe(PA.id, 10, { terminadas: 8 }), el10)).toEqual([]);
    expect(
      atraso(PA, tareasDe(PA.id, 10, { terminadas: 8 }), '2026-11-11T20:00:00.000Z').map(
        (i) => i.motivo,
      ),
    ).toEqual(['Avance real 80 % frente a 100 % esperado (20 puntos; umbral 20).']);
    expect(atraso(PA, tareasDe(PA.id, 10), '2026-11-01T20:00:00.000Z')).toEqual([]);
  });

  it('A-7 el avance esperado se acota entre 0 y 100', () => {
    const futuro = proyecto({
      id: 'p-futuro',
      fecha_inicio: '2026-12-01',
      fecha_fin_prevista: '2026-12-31',
    });
    expect(atraso(futuro, tareasDe(futuro.id, 10))).toEqual([]);
    // Pasado el fin: esperado 100 % (no 140 %), real 85 %, 15 puntos.
    expect(atraso(PA, tareasDe(PA.id, 20, { terminadas: 17 }))).toEqual([]);
  });

  it.each(['EN_PAUSA', 'FINALIZADO'] as const)('A-8 un proyecto %s no se evalúa', (estado) => {
    const p = { ...DESDE_HOY, estado };
    expect(atraso(p, tareasDe(p.id, 20, { vencidas: 5 }))).toEqual([]);
  });

  it('A-9 los dos tramos dan un solo insight CRÍTICO con fecha = ahora', () => {
    expect(atraso(PA, tareasDe(PA.id, 20, { vencidas: 5 }))).toMatchObject([
      {
        tipo_regla: 'POSIBLE_ATRASO_PROYECTO',
        severidad: 'CRITICO',
        titulo: 'Posible atraso en Proyecto atrasado',
        motivo:
          'Avance real 0 % frente a 100 % esperado (100 puntos; umbral 20). 5 de 20 tareas vencidas (25 %; umbral 25 %).',
        elemento: { tipo: 'PROYECTO', id: PA.id },
        fecha_deteccion: AHORA,
        ids_proyecto: [PA.id],
      },
    ]);
  });

  it('A-10 puntos y porcentaje son parámetros', () => {
    expect(
      atraso(PA, tareasDe(PA.id, 10, { terminadas: 1 }), AHORA_4_NOV, {
        ...UMBRALES,
        INSIGHT_ATRASO_PUNTOS: 30,
      }),
    ).toEqual([]);
    expect(
      atraso(DESDE_HOY, tareasDe(DESDE_HOY.id, 20, { vencidas: 5 }), AHORA, {
        ...UMBRALES,
        INSIGHT_ATRASO_PORCENTAJE: 50,
      }),
    ).toEqual([]);
  });
});

describe('proyecto sin actividad', () => {
  const sinActividad = (m: Mundo) =>
    deRegla(
      datos({
        usuarios: [LUIS],
        proyectos: m.proyectos ?? [proyecto()],
        asignaciones: m.asignaciones ?? [asignacion()],
        historial: m.historial ?? [],
      }),
      'PROYECTO_SIN_ACTIVIDAD',
    );

  it('P-1 7 días sin eventos dan ATENCIÓN y 6 días 23 h no', () => {
    expect(
      sinActividad({ historial: [evento({ fecha: haceDias(7) })] }).map((i) => i.severidad),
    ).toEqual(['ATENCION']);
    expect(sinActividad({ historial: [evento({ fecha: haceDias(6, 23) })] })).toEqual([]);
  });

  it('P-2 cuenta cualquier autor: el Sistema y el Administrador también', () => {
    const delSistema = evento({
      fecha: haceDias(1),
      autor: { tipo: 'SISTEMA' },
      tipo_accion: 'PULL_REQUEST_ESTADO_ACTUALIZADO',
    });
    const delAdministrador = evento({
      fecha: haceDias(1),
      autor: { tipo: 'USUARIO', id_usuario: IDS.admin },
      tipo_accion: 'PROYECTO_ENLACE_AGREGADO',
      elemento: { tipo: 'PROYECTO', id: IDS.proyecto, etiqueta: 'PRB' },
    });
    expect(sinActividad({ historial: [delSistema] })).toEqual([]);
    expect(sinActividad({ historial: [delAdministrador] })).toEqual([]);
  });

  it('P-3 los eventos de otro proyecto no cuentan', () => {
    expect(
      sinActividad({ historial: [evento({ fecha: haceDias(1), id_proyecto: IDS.proyectoAjeno })] }),
    ).toHaveLength(1);
  });

  it('P-4 un proyecto ACTIVO sin equipo no dispara', () => {
    expect(sinActividad({ asignaciones: [] })).toEqual([]);
    expect(sinActividad({ asignaciones: [asignacion({ fecha_baja: '2026-10-01' })] })).toEqual([]);
  });

  it('P-5 un proyecto EN_PAUSA no se evalúa', () => {
    expect(sinActividad({ proyectos: [proyecto({ estado: 'EN_PAUSA' })] })).toEqual([]);
  });

  it('P-6 sin eventos, el reloj arranca en la fecha de inicio', () => {
    expect(
      sinActividad({ proyectos: [proyecto({ fecha_inicio: fecha(-10) })] }).map((i) => i.titulo),
    ).toEqual(['Proyecto de prueba sin actividad hace 10 días']);
    expect(sinActividad({ proyectos: [proyecto({ fecha_inicio: fecha(-6) })] })).toEqual([]);
  });

  it('P-7 la fecha de detección es el último evento más el umbral', () => {
    expect(
      sinActividad({ historial: [evento({ fecha: haceDias(9) })] }).map((i) => i.fecha_deteccion),
    ).toEqual([haceDias(2)]);
  });
});

describe('supervisión demorada', () => {
  const SUP = usuario('SUPERVISOR', { nombre: 'Marta Ríos' });
  const ESPERANDO = tarea({ estado: 'ESPERANDO_SUPERVISION', requiere_supervision: true });
  const envio = (fechaEnvio: FechaHora, id = 'e-envio') =>
    evento({ id, fecha: fechaEnvio, tipo_accion: 'TAREA_ENVIADA_A_SUPERVISION' });

  const demorada = (m: Mundo) =>
    deRegla(
      datos({
        usuarios: [SUP],
        proyectos: m.proyectos ?? [proyecto()],
        tareas: m.tareas ?? [ESPERANDO],
        historial: m.historial ?? [],
      }),
      'SUPERVISION_DEMORADA',
    );

  it('S-1 3 días esperando dan ATENCIÓN y 2 días 23 h no', () => {
    expect(demorada({ historial: [envio(haceDias(3))] }).map((i) => i.severidad)).toEqual([
      'ATENCION',
    ]);
    expect(demorada({ historial: [envio(haceDias(2, 23))] })).toEqual([]);
  });

  it('S-2 el plazo corre desde el último envío', () => {
    const historial = [
      envio(haceDias(10), 'e-envio-1'),
      evento({
        id: 'e-devuelta',
        fecha: haceDias(5),
        autor: { tipo: 'USUARIO', id_usuario: SUP.id },
        tipo_accion: 'TAREA_DEVUELTA',
      }),
      envio(haceDias(1), 'e-envio-2'),
    ];
    expect(demorada({ historial })).toEqual([]);
  });

  it('S-3 vale con el proyecto EN_PAUSA; las tareas en otros estados no cuentan', () => {
    expect(
      demorada({ proyectos: [proyecto({ estado: 'EN_PAUSA' })], historial: [envio(haceDias(5))] }),
    ).toHaveLength(1);
    expect(
      demorada({ tareas: [tarea({ estado: 'EN_PROGRESO' })], historial: [envio(haceDias(5))] }),
    ).toEqual([]);
  });

  it('S-4 elemento TAREA, su proyecto y el ID legible en el título', () => {
    const [insight] = demorada({ historial: [envio(haceDias(3))] });
    expect(insight).toMatchObject({
      elemento: { tipo: 'TAREA', id: IDS.tarea },
      ids_proyecto: [IDS.proyecto],
      titulo: 'PRB-001 espera supervisión hace 3 días',
    });
    expect(insight?.motivo).toContain('Supervisor: Marta Ríos.');
  });

  it('S-5 sin evento de envío no se puede medir: no dispara', () => {
    expect(demorada({ historial: [] })).toEqual([]);
  });
});

describe('postulaciones sin decidir', () => {
  const sinDecidir = (postulantes = [postulante()], historial: EventoHistorial[] = []) =>
    deRegla(datos({ postulantes, historial }), 'POSTULACIONES_SIN_DECIDIR');

  it('Q-1 pendiente hace 5 días dispara, hace 4 no; las decididas no cuentan', () => {
    expect(sinDecidir([postulante({ fecha_postulacion: haceDias(5) })])).toHaveLength(1);
    expect(sinDecidir([postulante({ fecha_postulacion: haceDias(4) })])).toEqual([]);
    expect(
      sinDecidir([
        postulante({ id: 'po-aprobada', estado: 'APROBADA', fecha_postulacion: haceDias(30) }),
        postulante({ id: 'po-rechazada', estado: 'RECHAZADA', fecha_postulacion: haceDias(30) }),
      ]),
    ).toEqual([]);
  });

  it('Q-2 una postulación reconsiderada cuenta desde su reconsideración', () => {
    const antigua = postulante({ fecha_postulacion: haceDias(30) });
    const reconsiderada = evento({
      fecha: haceDias(1),
      autor: { tipo: 'USUARIO', id_usuario: IDS.admin },
      tipo_accion: 'POSTULACION_RECONSIDERADA',
      elemento: { tipo: 'POSTULANTE', id: IDS.postulante, etiqueta: 'Ana Torres' },
      id_proyecto: null,
    });
    expect(sinDecidir([antigua])).toHaveLength(1);
    expect(sinDecidir([antigua], [reconsiderada])).toEqual([]);
  });

  it('Q-3 elemento POSTULANTE y sin proyectos', () => {
    expect(sinDecidir([postulante({ fecha_postulacion: haceDias(6) })])).toMatchObject([
      { elemento: { tipo: 'POSTULANTE', id: IDS.postulante }, ids_proyecto: [] },
    ]);
  });
});

describe('fin de práctica', () => {
  const finPractica = (m: Mundo, umbrales = UMBRALES) =>
    deRegla(mundoPracticante(m), 'FIN_PRACTICA', umbrales);
  const conFin = (fin: Fecha) => [practicanteDetalle({ fecha_fin_prevista: fin })];

  it('F-1 faltan 14 días: INFORMATIVO; faltan 15: nada', () => {
    expect(finPractica({ practicantes: conFin(fecha(14)) }).map((i) => i.severidad)).toEqual([
      'INFORMATIVO',
    ]);
    expect(finPractica({ practicantes: conFin(fecha(15)) })).toEqual([]);
  });

  it('F-2 termina hoy: INFORMATIVO; terminó ayer: CRÍTICO', () => {
    expect(finPractica({ practicantes: conFin(HOY) }).map((i) => [i.severidad, i.titulo])).toEqual([
      ['INFORMATIVO', 'Luis Quispe finaliza su práctica hoy'],
    ]);
    expect(
      finPractica({ practicantes: conFin(fecha(-1)) }).map((i) => [i.severidad, i.titulo]),
    ).toEqual([['CRITICO', 'Luis Quispe superó su fecha de fin hace 1 día']]);
  });

  it('F-3 un practicante INACTIVO (ya finalizado) no se evalúa', () => {
    expect(
      finPractica({ usuario: { ...LUIS, estado: 'INACTIVO' }, practicantes: conFin(HOY) }),
    ).toEqual([]);
  });

  it('F-4 se evalúa aunque no tenga proyecto; ids_proyecto = vigentes no finalizados', () => {
    expect(
      finPractica({ asignaciones: [], practicantes: conFin(HOY) }).map((i) => i.ids_proyecto),
    ).toEqual([[]]);

    const pausa = proyecto({ id: 'p-pausa', estado: 'EN_PAUSA' });
    const finalizado = proyecto({
      id: 'p-fin',
      estado: 'FINALIZADO',
      fecha_fin_real: '2026-10-01',
    });
    const resultado = finPractica({
      practicantes: conFin(HOY),
      proyectos: [proyecto(), pausa, finalizado],
      asignaciones: [
        asignacion(),
        asignacion({ id: 'a-pausa', id_proyecto: pausa.id }),
        asignacion({ id: 'a-fin', id_proyecto: finalizado.id }),
      ],
    });
    expect(resultado.map((i) => [...i.ids_proyecto].sort())).toEqual([
      [IDS.proyecto, pausa.id].sort(),
    ]);
  });

  it('F-5 fecha de detección: inicio del aviso o día siguiente al fin, en hora de Perú', () => {
    // Fin el 25-nov: el aviso empieza el 11-nov a las 00:00 de Perú.
    expect(finPractica({ practicantes: conFin(fecha(10)) }).map((i) => i.fecha_deteccion)).toEqual([
      '2026-11-11T05:00:00.000Z',
    ]);
    // Fin el 12-nov: vencida desde el 13-nov a las 00:00 de Perú.
    expect(finPractica({ practicantes: conFin(fecha(-3)) }).map((i) => i.fecha_deteccion)).toEqual([
      '2026-11-13T05:00:00.000Z',
    ]);
  });

  it('F-6 la anticipación es su propio parámetro', () => {
    expect(finPractica({ practicantes: conFin(fecha(12)) })).toHaveLength(1);
    expect(
      finPractica(
        { practicantes: conFin(fecha(12)) },
        { ...UMBRALES, INSIGHT_FIN_PRACTICA_DIAS: 10 },
      ),
    ).toEqual([]);
  });

  it.each(['', 'no-es-fecha'])(
    'F-7 una fecha de fin inválida (%j) no genera insight ni lanza',
    (fin) => {
      const d = mundoPracticante({ practicantes: conFin(fin) });
      expect(() => calcular(d)).not.toThrow();
      expect(deRegla(d, 'FIN_PRACTICA')).toEqual([]);
      expect(calcular(d).some((i) => i.titulo.includes('NaN'))).toBe(false);
    },
  );

  it('F-7 un practicante sin fila de detalle no genera insight de fin', () => {
    expect(finPractica({ practicantes: [] })).toEqual([]);
  });

  it('F-8 la fecha de fin prevista no admite nulo (lo comprueba tsc)', () => {
    expectTypeOf<Practicante['fecha_fin_prevista']>().toEqualTypeOf<string>();
  });
});

describe('revisiones y cambio de severidad', () => {
  function insightDe(cambios: Partial<Insight> = {}): Insight {
    return {
      tipo_regla: 'PRACTICANTE_INACTIVO',
      severidad: 'ATENCION',
      titulo: 'Luis Quispe sin actividad hace 8 días',
      motivo: 'Motivo de prueba.',
      elemento: { tipo: 'USUARIO', id: IDS.practicante },
      fecha_deteccion: haceDias(1),
      revisado: false,
      ids_proyecto: [IDS.proyecto],
      ...cambios,
    };
  }

  const revisado = (i: Insight, revisiones: InsightRevision[], idUsuario: string = IDS.admin) =>
    aplicarRevisiones([i], revisiones, idUsuario, AHORA).map((r) => r.revisado);

  it('R-1 una revisión propia reciente con la misma severidad lo marca', () => {
    expect(revisado(insightDe(), [revision({ fecha: haceDias(1) })])).toEqual([true]);
  });

  it('R-2 «revisado» es por persona: lo que revisa el Administrador no vale para el Supervisor', () => {
    expect(revisado(insightDe(), [revision({ fecha: haceDias(1) })], IDS.supervisor)).toEqual([
      false,
    ]);
  });

  it('R-3 a los 7 días exactos reaparece; a los 6 días 23 h no', () => {
    expect(revisado(insightDe(), [revision({ fecha: haceDias(7) })])).toEqual([false]);
    expect(revisado(insightDe(), [revision({ fecha: haceDias(6, 23) })])).toEqual([true]);
  });

  it('R-4 si la severidad sube, reaparece', () => {
    expect(
      revisado(insightDe({ severidad: 'CRITICO' }), [
        revision({ fecha: haceDias(1), severidad_al_revisar: 'ATENCION' }),
      ]),
    ).toEqual([false]);
    const fin = { tipo_regla: 'FIN_PRACTICA' as const };
    expect(
      revisado(insightDe({ ...fin, severidad: 'CRITICO' }), [
        revision({ ...fin, fecha: haceDias(1), severidad_al_revisar: 'INFORMATIVO' }),
      ]),
    ).toEqual([false]);
  });

  it('R-5 si la severidad baja, sigue revisado', () => {
    expect(
      revisado(insightDe({ severidad: 'ATENCION' }), [
        revision({ fecha: haceDias(1), severidad_al_revisar: 'CRITICO' }),
      ]),
    ).toEqual([true]);
  });

  it('R-6 si vuelve a la severidad que tenía al revisarlo, sigue revisado', () => {
    expect(
      revisado(insightDe({ severidad: 'CRITICO' }), [
        revision({ fecha: haceDias(1), severidad_al_revisar: 'CRITICO' }),
      ]),
    ).toEqual([true]);
  });

  it('R-7 manda la revisión más reciente por fecha, no por posición', () => {
    const vieja = revision({ id: 'r-vieja', fecha: haceDias(3), severidad_al_revisar: 'ATENCION' });
    const nueva = revision({ id: 'r-nueva', fecha: haceDias(1), severidad_al_revisar: 'CRITICO' });
    const critico = insightDe({ severidad: 'CRITICO' });
    expect(revisado(critico, [vieja, nueva])).toEqual([true]);
    expect(revisado(critico, [nueva, vieja])).toEqual([true]);
  });

  it('R-8 una revisión de otra regla o de otro elemento no aplica', () => {
    expect(
      revisado(insightDe(), [revision({ fecha: haceDias(1), tipo_regla: 'CARGA_DESBALANCEADA' })]),
    ).toEqual([false]);
    expect(
      revisado(insightDe(), [
        revision({ fecha: haceDias(1), elemento: { tipo: 'USUARIO', id: IDS.practicanteAjeno } }),
      ]),
    ).toEqual([false]);
  });

  it('R-9 un insight revisado sigue en la lista con revisado: true', () => {
    const resultado = insightsParaUsuario(
      usuario('ADMINISTRADOR'),
      mundoPracticante({ historial: [propio(haceDias(8))] }),
      UMBRALES,
      [revision({ fecha: haceDias(1) })],
      AHORA,
    );
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(
      resultado.insights
        .filter((i) => i.tipo_regla === 'PRACTICANTE_INACTIVO')
        .map((i) => i.revisado),
    ).toEqual([true]);
  });

  it('R-10 no hay estado guardado: si la condición vuelve antes de 7 días sin subir, sigue revisado', () => {
    // El insight se recalcula desde cero; solo cuentan la revisión, la severidad y el plazo.
    expect(revisado(insightDe(), [revision({ fecha: haceDias(2) })])).toEqual([true]);
  });
});

describe('alcance', () => {
  const SUPERVISOR = usuario('SUPERVISOR');
  const PROYECTOS = [
    proyecto(),
    proyecto({ id: IDS.proyectoAjeno, id_supervisor: IDS.supervisorAjeno }),
  ];

  function insightDe(
    tipo_regla: TipoReglaInsight,
    ids_proyecto: string[] = [IDS.proyecto],
  ): Insight {
    return {
      tipo_regla,
      severidad: 'ATENCION',
      titulo: tipo_regla,
      motivo: 'Motivo de prueba.',
      elemento: { tipo: 'USUARIO', id: IDS.practicante },
      fecha_deteccion: AHORA,
      revisado: false,
      ids_proyecto,
    };
  }

  const SIETE = TIPOS_REGLA_INSIGHT.map((tipo) => insightDe(tipo));
  const tipos = (insights: Insight[]) => insights.map((i) => i.tipo_regla);

  it('L-1 el Administrador ve las 7 reglas', () => {
    expect(tipos(filtrarInsightsPorAlcance(SIETE, usuario('ADMINISTRADOR'), PROYECTOS))).toEqual([
      ...TIPOS_REGLA_INSIGHT,
    ]);
  });

  it('L-2 el Supervisor ve solo las 5 de §9.1.4', () => {
    expect(tipos(filtrarInsightsPorAlcance(SIETE, SUPERVISOR, PROYECTOS))).toEqual([
      'PRACTICANTE_INACTIVO',
      'CARGA_DESBALANCEADA',
      'POSIBLE_ATRASO_PROYECTO',
      'PROYECTO_SIN_ACTIVIDAD',
      'SUPERVISION_DEMORADA',
    ]);
  });

  it('L-3 el Supervisor necesita algún proyecto suyo entre los del insight', () => {
    expect(
      filtrarInsightsPorAlcance(
        [insightDe('PRACTICANTE_INACTIVO', [IDS.proyectoAjeno])],
        SUPERVISOR,
        PROYECTOS,
      ),
    ).toEqual([]);
    expect(
      filtrarInsightsPorAlcance(
        [insightDe('PRACTICANTE_INACTIVO', [IDS.proyecto, IDS.proyectoAjeno])],
        SUPERVISOR,
        PROYECTOS,
      ),
    ).toHaveLength(1);
  });

  it('L-4 el Practicante no ve insights', () => {
    expect(filtrarInsightsPorAlcance(SIETE, usuario('PRACTICANTE'), PROYECTOS)).toEqual([]);
  });

  it('L-5 un usuario INACTIVO no ve insights', () => {
    expect(
      filtrarInsightsPorAlcance(SIETE, usuario('ADMINISTRADOR', { estado: 'INACTIVO' }), PROYECTOS),
    ).toEqual([]);
    expect(
      filtrarInsightsPorAlcance(SIETE, usuario('SUPERVISOR', { estado: 'INACTIVO' }), PROYECTOS),
    ).toEqual([]);
  });

  it('L-6 lo que el Supervisor ve coincide con lo que puede marcar como revisado', () => {
    const filas = TIPOS_REGLA_INSIGHT.map((tipo) => {
      const visible =
        filtrarInsightsPorAlcance([insightDe(tipo)], SUPERVISOR, PROYECTOS).length === 1;
      const marca = puede(SUPERVISOR, 'MARCAR_INSIGHT_REVISADO', {
        insight: { tipo_regla: tipo, ids_proyecto: [IDS.proyecto] },
        proyectos: PROYECTOS,
      }).permitido;
      return [tipo, visible, marca] as const;
    });
    for (const [tipo, visible, marca] of filas) {
      expect({ tipo, visible }).toEqual({ tipo, visible: marca });
    }
    expect(filas.some(([, visible]) => visible)).toBe(true);
    expect(filas.some(([, visible]) => !visible)).toBe(true);
  });
});

describe('orden y pureza', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function insightDe(
    id: string,
    severidad: Insight['severidad'],
    fechaDeteccion: FechaHora,
  ): Insight {
    return {
      tipo_regla: 'PRACTICANTE_INACTIVO',
      severidad,
      titulo: id,
      motivo: 'Motivo de prueba.',
      elemento: { tipo: 'USUARIO', id },
      fecha_deteccion: fechaDeteccion,
      revisado: false,
      ids_proyecto: [],
    };
  }

  const DESORDENADOS = [
    insightDe('atencion', 'ATENCION', haceDias(5)),
    insightDe('critico-nuevo', 'CRITICO', haceDias(1)),
    insightDe('informativo', 'INFORMATIVO', haceDias(10)),
    insightDe('critico-viejo', 'CRITICO', haceDias(4)),
  ];

  it('O-1 por severidad y, dentro de la misma, el más antiguo primero', () => {
    expect(ordenarInsights(DESORDENADOS).map((i) => i.elemento.id)).toEqual([
      'critico-viejo',
      'critico-nuevo',
      'atencion',
      'informativo',
    ]);
  });

  it('O-2 no muta las entradas', () => {
    const entrada = structuredClone(DESORDENADOS);
    ordenarInsights(entrada);
    expect(entrada).toEqual(DESORDENADOS);

    const d = mundoPracticante({ historial: [propio(haceDias(10))] });
    const copia = structuredClone(d);
    calcular(d);
    expect(d).toEqual(copia);
  });

  it('O-3 no lee el reloj: con otra hora del sistema el resultado es idéntico', () => {
    const d = mundoPracticante({ historial: [propio(haceDias(10))] });
    const antes = calcular(d);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    const despues = calcular(d);
    expect(antes.length).toBeGreaterThan(0);
    expect(despues).toEqual(antes);
  });
});

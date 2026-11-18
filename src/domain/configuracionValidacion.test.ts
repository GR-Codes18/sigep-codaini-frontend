import { describe, expect, it } from 'vitest';
import {
  CATALOGO_PARAMETROS,
  SECCIONES_CONFIGURACION,
  type ClaveParametro,
  type SeccionConfiguracion,
  type ValorParametro,
} from './configuracion';
import {
  CODIGOS_CONFIGURACION,
  clavesDeSeccion,
  validarSeccionConfiguracion,
  type ValoresConfiguracion,
} from './configuracionValidacion';
import { AVISO_MAXIMO_DIAS, DURACION_MAXIMA_MESES } from './practicas';
import { validarUmbrales, type UmbralesInsight } from './reglasInsights';

/** Los valores iniciales del catálogo (todas las secciones), con los cambios que pida cada prueba. */
function valores(cambios: ValoresConfiguracion = {}): ValoresConfiguracion {
  const base: ValoresConfiguracion = {};
  for (const p of CATALOGO_PARAMETROS) base[p.clave] = { ...p.valor };
  return { ...base, ...cambios };
}

const numero = (valor: number): ValorParametro => ({ tipo: 'numero', valor });
const rango = (minimo: number, maximo: number): ValorParametro => ({
  tipo: 'rango',
  minimo,
  maximo,
});
const proporcion = (area: number, especialidad: number): ValorParametro => ({
  tipo: 'proporcion',
  area,
  especialidad,
});

const evaluar = (cambios: ValoresConfiguracion) =>
  validarSeccionConfiguracion('EVALUACION', valores(cambios));
const practicas = (cambios: ValoresConfiguracion) =>
  validarSeccionConfiguracion('PRACTICAS', valores(cambios));
const seguimiento = (cambios: ValoresConfiguracion) =>
  validarSeccionConfiguracion('SEGUIMIENTO', valores(cambios));

describe('clavesDeSeccion', () => {
  it('cada sección tiene sus parámetros, en el orden del catálogo', () => {
    expect(clavesDeSeccion('EVALUACION')).toEqual([
      'EVALUACION_BANDA_AMBIGUA',
      'EVALUACION_PROPORCION',
    ]);
    expect(clavesDeSeccion('PRACTICAS')).toEqual([
      'PRACTICA_DURACION_MESES',
      'PRACTICA_AVISO_FIN_DIAS',
    ]);
    expect(clavesDeSeccion('SEGUIMIENTO')).toHaveLength(10);
    expect(clavesDeSeccion('SEGUIMIENTO').every((c) => c.startsWith('INSIGHT_'))).toBe(true);
  });

  it('las tres secciones juntas cubren el catálogo completo, sin repetir', () => {
    const todas = SECCIONES_CONFIGURACION.flatMap((s) => clavesDeSeccion(s));
    expect(todas.sort()).toEqual(CATALOGO_PARAMETROS.map((p) => p.clave).sort());
  });
});

describe('los valores iniciales del catálogo son válidos', () => {
  it.each(SECCIONES_CONFIGURACION)('%s', (seccion) => {
    expect(validarSeccionConfiguracion(seccion, valores())).toEqual({ ok: true });
  });
});

describe('Evaluación — banda de puntaje ambiguo', () => {
  it.each([
    [0, 1],
    [99, 100],
    [50, 69],
    [0, 100],
    [69, 70],
  ])('%i a %i es válida (extremos incluidos)', (minimo, maximo) => {
    expect(evaluar({ EVALUACION_BANDA_AMBIGUA: rango(minimo, maximo) })).toEqual({ ok: true });
  });

  it.each([
    [60, 60],
    [70, 69],
    [100, 0],
    [0, 0],
    [100, 100],
  ])('mínimo %i y máximo %i: el mínimo debe ser menor', (minimo, maximo) => {
    expect(evaluar({ EVALUACION_BANDA_AMBIGUA: rango(minimo, maximo) })).toMatchObject({
      ok: false,
      codigo: 'BANDA_MINIMO_NO_MENOR',
      clave: 'EVALUACION_BANDA_AMBIGUA',
      campo: 'minimo',
    });
  });

  it.each([
    [-1, 50, 'minimo'],
    [101, 102, 'minimo'],
    [10, -1, 'maximo'],
    [10, 101, 'maximo'],
  ])('%i y %i fuera de 0 a 100 (campo %s)', (minimo, maximo, campo) => {
    expect(evaluar({ EVALUACION_BANDA_AMBIGUA: rango(minimo, maximo) })).toMatchObject({
      ok: false,
      codigo: 'VALOR_FUERA_DE_RANGO',
      clave: 'EVALUACION_BANDA_AMBIGUA',
      campo,
    });
  });

  it.each([
    [50.5, 69, 'minimo'],
    [50, 69.1, 'maximo'],
    [Number.NaN, 69, 'minimo'],
    [50, Number.NaN, 'maximo'],
    [Number.POSITIVE_INFINITY, 69, 'minimo'],
    [50, Number.NEGATIVE_INFINITY, 'maximo'],
  ])('%s y %s no son enteros (campo %s)', (minimo, maximo, campo) => {
    expect(evaluar({ EVALUACION_BANDA_AMBIGUA: rango(minimo, maximo) })).toMatchObject({
      ok: false,
      codigo: 'VALOR_NO_ENTERO',
      campo,
    });
  });

  it('el mínimo se revisa antes que el máximo, y los valores antes que la relación', () => {
    expect(evaluar({ EVALUACION_BANDA_AMBIGUA: rango(-5, 200) })).toMatchObject({
      campo: 'minimo',
    });
    expect(evaluar({ EVALUACION_BANDA_AMBIGUA: rango(80, 200) })).toMatchObject({
      codigo: 'VALOR_FUERA_DE_RANGO',
      campo: 'maximo',
    });
  });
});

describe('Evaluación — proporción de la nota', () => {
  it.each([
    [40, 60],
    [50, 50],
    [0, 100],
    [100, 0],
    [1, 99],
  ])('%i / %i suma 100', (area, especialidad) => {
    expect(evaluar({ EVALUACION_PROPORCION: proporcion(area, especialidad) })).toEqual({
      ok: true,
    });
  });

  it.each([
    [40, 59],
    [40, 61],
    [0, 0],
    [50, 51],
    [100, 100],
  ])('%i / %i no suma 100', (area, especialidad) => {
    expect(evaluar({ EVALUACION_PROPORCION: proporcion(area, especialidad) })).toMatchObject({
      ok: false,
      codigo: 'PROPORCION_NO_SUMA_100',
      clave: 'EVALUACION_PROPORCION',
      campo: null,
    });
  });

  it.each([
    [-10, 110, 'area'],
    [101, -1, 'area'],
    [50, 101, 'especialidad'],
    [100, -0.0001, 'especialidad'],
  ])('%s / %s fuera de 0 a 100 aunque sumen 100 (campo %s)', (area, especialidad, campo) => {
    expect(evaluar({ EVALUACION_PROPORCION: proporcion(area, especialidad) })).toMatchObject({
      ok: false,
      codigo: expect.stringMatching(/VALOR_FUERA_DE_RANGO|VALOR_NO_ENTERO/),
      campo,
    });
  });

  it('-10 / 110 suma 100 pero cada valor está fuera de rango', () => {
    expect(evaluar({ EVALUACION_PROPORCION: proporcion(-10, 110) })).toMatchObject({
      codigo: 'VALOR_FUERA_DE_RANGO',
      campo: 'area',
    });
  });

  it.each([
    [40.5, 59.5, 'area'],
    [40, 60.0001, 'especialidad'],
    [Number.NaN, 60, 'area'],
    [40, Number.NaN, 'especialidad'],
  ])('%s / %s no son enteros, aunque sumen 100 (campo %s)', (area, especialidad, campo) => {
    expect(evaluar({ EVALUACION_PROPORCION: proporcion(area, especialidad) })).toMatchObject({
      ok: false,
      codigo: 'VALOR_NO_ENTERO',
      campo,
    });
  });
});

describe('Evaluación — orden de comprobación', () => {
  it('la banda se revisa antes que la proporción (orden del catálogo)', () => {
    const r = evaluar({
      EVALUACION_BANDA_AMBIGUA: rango(70, 60),
      EVALUACION_PROPORCION: proporcion(10, 10),
    });
    expect(r).toMatchObject({ codigo: 'BANDA_MINIMO_NO_MENOR' });
  });

  it('con la banda bien, se revisa la proporción', () => {
    expect(evaluar({ EVALUACION_PROPORCION: proporcion(10, 10) })).toMatchObject({
      codigo: 'PROPORCION_NO_SUMA_100',
    });
  });
});

describe('Prácticas — duración', () => {
  it.each([1, 4, DURACION_MAXIMA_MESES])('%i meses es válida', (meses) => {
    expect(practicas({ PRACTICA_DURACION_MESES: numero(meses) })).toEqual({ ok: true });
  });

  it.each([0, -1, DURACION_MAXIMA_MESES + 1, 1000])('%i meses está fuera de rango', (meses) => {
    expect(practicas({ PRACTICA_DURACION_MESES: numero(meses) })).toMatchObject({
      ok: false,
      codigo: 'VALOR_FUERA_DE_RANGO',
      clave: 'PRACTICA_DURACION_MESES',
      campo: 'valor',
    });
  });

  it.each([4.5, 0.5, Number.NaN, Number.POSITIVE_INFINITY])('%s no es un entero', (meses) => {
    expect(practicas({ PRACTICA_DURACION_MESES: numero(meses) })).toMatchObject({
      ok: false,
      codigo: 'VALOR_NO_ENTERO',
      clave: 'PRACTICA_DURACION_MESES',
    });
  });

  it('el tope es el de domain/ (24)', () => {
    expect(DURACION_MAXIMA_MESES).toBe(24);
  });
});

describe('Prácticas — aviso previo', () => {
  it.each([1, 14, AVISO_MAXIMO_DIAS])('%i días es válido', (dias) => {
    expect(practicas({ PRACTICA_AVISO_FIN_DIAS: numero(dias) })).toEqual({ ok: true });
  });

  it.each([0, -3, AVISO_MAXIMO_DIAS + 1])('%i días está fuera de rango', (dias) => {
    expect(practicas({ PRACTICA_AVISO_FIN_DIAS: numero(dias) })).toMatchObject({
      ok: false,
      codigo: 'VALOR_FUERA_DE_RANGO',
      clave: 'PRACTICA_AVISO_FIN_DIAS',
      campo: 'valor',
    });
  });

  it.each([14.2, Number.NaN])('%s no es un entero', (dias) => {
    expect(practicas({ PRACTICA_AVISO_FIN_DIAS: numero(dias) })).toMatchObject({
      ok: false,
      codigo: 'VALOR_NO_ENTERO',
      clave: 'PRACTICA_AVISO_FIN_DIAS',
    });
  });

  it('el tope es el de domain/ (365)', () => {
    expect(AVISO_MAXIMO_DIAS).toBe(365);
  });

  it('la duración se revisa antes que el aviso (orden del catálogo)', () => {
    const r = practicas({ PRACTICA_DURACION_MESES: numero(0), PRACTICA_AVISO_FIN_DIAS: numero(0) });
    expect(r).toMatchObject({ clave: 'PRACTICA_DURACION_MESES' });
  });
});

describe('Seguimiento — reutiliza validarUmbrales', () => {
  it('da el mismo resultado que validarUmbrales con los mismos umbrales', () => {
    const casos: Record<string, number>[] = [
      {},
      { INSIGHT_INACTIVO_DIAS: 0 },
      { INSIGHT_INACTIVO_CRITICO_DIAS: 7 },
      { INSIGHT_CARGA_MINIMA_TAREAS: 3 },
      { INSIGHT_ATRASO_PUNTOS: 101 },
      { INSIGHT_ATRASO_PORCENTAJE: 0 },
      { INSIGHT_FIN_PRACTICA_DIAS: 2.5 },
    ];
    for (const cambios of casos) {
      const umbrales = Object.fromEntries(
        CATALOGO_PARAMETROS.filter((p) => p.clave.startsWith('INSIGHT_')).map((p) => [
          p.clave,
          p.valor.tipo === 'numero' ? p.valor.valor : 0,
        ]),
      ) as UmbralesInsight;
      Object.assign(umbrales, cambios);
      const enSeccion = seguimiento(
        Object.fromEntries(Object.entries(cambios).map(([k, v]) => [k, numero(v)])),
      );
      expect(enSeccion, JSON.stringify(cambios)).toEqual(validarUmbrales(umbrales));
    }
  });

  it.each([
    ['INSIGHT_INACTIVO_DIAS', 0],
    ['INSIGHT_ATRASO_PUNTOS', 101],
    ['INSIGHT_ATRASO_PORCENTAJE', 0],
    ['INSIGHT_SUPERVISION_DEMORADA_DIAS', 1.5],
    ['INSIGHT_CARGA_MAXIMA_TAREAS', -1],
  ] as const)('%s = %s se rechaza como UMBRAL_INVALIDO con su clave', (clave, valor) => {
    expect(seguimiento({ [clave]: numero(valor) })).toMatchObject({
      ok: false,
      codigo: 'UMBRAL_INVALIDO',
      clave,
    });
  });

  it('los bordes válidos de los umbrales pasan', () => {
    expect(
      seguimiento({
        INSIGHT_INACTIVO_DIAS: numero(1),
        INSIGHT_INACTIVO_CRITICO_DIAS: numero(2),
        INSIGHT_CARGA_MINIMA_TAREAS: numero(0),
        INSIGHT_CARGA_MAXIMA_TAREAS: numero(1),
        INSIGHT_ATRASO_PUNTOS: numero(100),
        INSIGHT_ATRASO_PORCENTAJE: numero(1),
      }),
    ).toEqual({ ok: true });
  });

  it('el crítico debe ser mayor que el de atención', () => {
    expect(seguimiento({ INSIGHT_INACTIVO_CRITICO_DIAS: numero(7) })).toMatchObject({
      codigo: 'UMBRAL_INVALIDO',
      clave: 'INSIGHT_INACTIVO_CRITICO_DIAS',
    });
  });

  it('la carga mínima debe ser menor que la máxima', () => {
    expect(seguimiento({ INSIGHT_CARGA_MINIMA_TAREAS: numero(3) })).toMatchObject({
      codigo: 'UMBRAL_INVALIDO',
      clave: 'INSIGHT_CARGA_MINIMA_TAREAS',
    });
  });
});

describe('forma de los valores', () => {
  const secciones: [SeccionConfiguracion, ClaveParametro, ValorParametro][] = [
    ['EVALUACION', 'EVALUACION_BANDA_AMBIGUA', numero(5)], // debería ser rango
    ['EVALUACION', 'EVALUACION_PROPORCION', rango(1, 2)], // debería ser proporción
    ['PRACTICAS', 'PRACTICA_DURACION_MESES', proporcion(1, 2)], // debería ser número
    ['SEGUIMIENTO', 'INSIGHT_INACTIVO_DIAS', rango(1, 2)], // debería ser número
  ];

  it.each(secciones)('%s: %s con otro tipo es PARAMETRO_INVALIDO', (seccion, clave, valor) => {
    expect(validarSeccionConfiguracion(seccion, valores({ [clave]: valor }))).toMatchObject({
      ok: false,
      codigo: 'PARAMETRO_INVALIDO',
      clave,
      campo: null,
    });
  });

  it.each(SECCIONES_CONFIGURACION)('%s: falta cualquier parámetro de la sección', (seccion) => {
    for (const clave of clavesDeSeccion(seccion)) {
      const sin = valores();
      delete sin[clave];
      expect(validarSeccionConfiguracion(seccion, sin), clave).toMatchObject({
        ok: false,
        codigo: 'PARAMETRO_INVALIDO',
        clave,
      });
    }
  });

  it('un valor undefined o un objeto vacío también es PARAMETRO_INVALIDO', () => {
    expect(validarSeccionConfiguracion('EVALUACION', {})).toMatchObject({
      codigo: 'PARAMETRO_INVALIDO',
      clave: 'EVALUACION_BANDA_AMBIGUA',
    });
    expect(
      validarSeccionConfiguracion('PRACTICAS', valores({ PRACTICA_AVISO_FIN_DIAS: undefined })),
    ).toMatchObject({ codigo: 'PARAMETRO_INVALIDO', clave: 'PRACTICA_AVISO_FIN_DIAS' });
  });

  it('un número que no es número (texto) es PARAMETRO_INVALIDO', () => {
    const roto = { tipo: 'numero', valor: '4' } as unknown as ValorParametro;
    expect(practicas({ PRACTICA_DURACION_MESES: roto })).toMatchObject({
      codigo: 'PARAMETRO_INVALIDO',
      clave: 'PRACTICA_DURACION_MESES',
    });
  });

  it('la forma se revisa antes que los valores', () => {
    const r = validarSeccionConfiguracion(
      'EVALUACION',
      valores({
        EVALUACION_BANDA_AMBIGUA: rango(70, 60), // inválida por valores
        EVALUACION_PROPORCION: numero(1), // y esta por forma
      }),
    );
    expect(r).toMatchObject({ codigo: 'PARAMETRO_INVALIDO', clave: 'EVALUACION_PROPORCION' });
  });
});

describe('alcance de la validación', () => {
  it('solo mira su sección: lo malo de otra sección no la afecta', () => {
    const roto = valores({
      PRACTICA_DURACION_MESES: numero(0),
      EVALUACION_PROPORCION: proporcion(1, 1),
    });
    expect(validarSeccionConfiguracion('SEGUIMIENTO', roto)).toEqual({ ok: true });
    expect(validarSeccionConfiguracion('PRACTICAS', roto)).toMatchObject({ ok: false });
    expect(validarSeccionConfiguracion('EVALUACION', roto)).toMatchObject({ ok: false });
  });

  it('una sección no necesita los parámetros de las demás', () => {
    const soloPracticas: ValoresConfiguracion = {
      PRACTICA_DURACION_MESES: numero(6),
      PRACTICA_AVISO_FIN_DIAS: numero(30),
    };
    expect(validarSeccionConfiguracion('PRACTICAS', soloPracticas)).toEqual({ ok: true });
  });

  it('no cambia los valores que recibe', () => {
    const entrada = valores({ EVALUACION_BANDA_AMBIGUA: rango(70, 60) });
    const copia = structuredClone(entrada);
    for (const seccion of SECCIONES_CONFIGURACION) validarSeccionConfiguracion(seccion, entrada);
    expect(entrada).toEqual(copia);
  });

  it('es determinista: lo mismo da lo mismo', () => {
    const entrada = valores({ PRACTICA_AVISO_FIN_DIAS: numero(0) });
    expect(validarSeccionConfiguracion('PRACTICAS', entrada)).toEqual(
      validarSeccionConfiguracion('PRACTICAS', entrada),
    );
  });

  it('cada error propio trae un código conocido y un mensaje en español', () => {
    const errores = [
      evaluar({ EVALUACION_BANDA_AMBIGUA: rango(0.5, 9) }),
      evaluar({ EVALUACION_BANDA_AMBIGUA: rango(-1, 9) }),
      evaluar({ EVALUACION_BANDA_AMBIGUA: rango(9, 9) }),
      evaluar({ EVALUACION_PROPORCION: proporcion(1, 1) }),
      practicas({ PRACTICA_DURACION_MESES: numero(0) }),
      validarSeccionConfiguracion('EVALUACION', {}),
    ];
    for (const e of errores) {
      expect(e.ok).toBe(false);
      if (e.ok || e.codigo === 'UMBRAL_INVALIDO') continue;
      expect(CODIGOS_CONFIGURACION).toContain(e.codigo);
      expect(e.mensaje.length).toBeGreaterThan(10);
    }
    expect(new Set(errores.flatMap((e) => (e.ok ? [] : [e.codigo]))).size).toBeGreaterThanOrEqual(
      5,
    );
  });
});

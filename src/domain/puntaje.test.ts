import { describe, expect, it } from 'vitest';

import type { BloqueCriterio } from './enumeraciones';
import type { CriterioEvaluacion } from './postulaciones';
import {
  calcularPuntaje,
  type BandaAmbigua,
  type EntradaPuntaje,
  type JuicioCriterio,
  type ProporcionNota,
  type ResultadoPuntaje,
} from './puntaje';
import { IDS, criterio } from './pruebas/fabricas';

/** Una fila = un criterio del bloque y lo que el modelo dijo de él. */
interface Fila {
  peso: number;
  cumplido: boolean;
  obligatorio?: boolean;
  activo?: boolean;
  observacion?: string | null;
}

const cumple = (peso: number, extra: Partial<Fila> = {}): Fila => ({
  peso,
  cumplido: true,
  ...extra,
});
const falla = (peso: number, extra: Partial<Fila> = {}): Fila => ({
  peso,
  cumplido: false,
  ...extra,
});

const PROPORCION_INICIAL: ProporcionNota = { area: 40, especialidad: 60 };
const BANDA_INICIAL: BandaAmbigua = { minimo: 50, maximo: 69 };

function filasA(bloque: BloqueCriterio, filas: readonly Fila[]) {
  const prefijo = bloque === 'AREA' ? 'area' : 'esp';
  const criterios: CriterioEvaluacion[] = [];
  const juicios: JuicioCriterio[] = [];
  filas.forEach((f, i) => {
    const id = `c-${prefijo}-${i + 1}`;
    criterios.push(
      criterio({
        id,
        id_especialidad: bloque === 'AREA' ? null : IDS.especialidad,
        nombre: `${bloque === 'AREA' ? 'Área' : 'Especialidad'} ${i + 1}`,
        peso: f.peso,
        obligatorio: f.obligatorio ?? false,
        activo: f.activo ?? true,
      }),
    );
    juicios.push({ id_criterio: id, cumplido: f.cumplido, observacion: f.observacion ?? null });
  });
  return { criterios, juicios };
}

function entrada(opciones: {
  area: readonly Fila[];
  especialidad: readonly Fila[];
  proporcion?: ProporcionNota;
  banda?: BandaAmbigua;
}): EntradaPuntaje {
  const area = filasA('AREA', opciones.area);
  const especialidad = filasA('ESPECIALIDAD', opciones.especialidad);
  return {
    id_area_tecnica: IDS.areaTecnica,
    id_especialidad: IDS.especialidad,
    criterios: [...area.criterios, ...especialidad.criterios],
    juicios: [...area.juicios, ...especialidad.juicios],
    banda: opciones.banda ?? BANDA_INICIAL,
    proporcion: opciones.proporcion ?? PROPORCION_INICIAL,
  };
}

function exito(resultado: ResultadoPuntaje) {
  if (!resultado.ok) {
    throw new Error(`Se esperaba éxito y llegó ${resultado.codigo} (${resultado.bloque})`);
  }
  return resultado;
}

function error(resultado: ResultadoPuntaje) {
  if (resultado.ok) {
    throw new Error(`Se esperaba un error y llegó la nota ${resultado.puntaje_total}`);
  }
  expect(resultado.mensaje.trim()).not.toBe('');
  return resultado;
}

/**
 * Bloque de 5 criterios con pesos 49, 1, 19, 1 y 30 (suman 100). Se marcan cumplidos los
 * primeros `n`, así que las sumas posibles son 49, 50, 69 y 70.
 */
function bloqueDeBorde(n: number): Fila[] {
  return [49, 1, 19, 1, 30].map((peso, i) => (i < n ? cumple(peso) : falla(peso)));
}

describe('calcularPuntaje: cálculo por bloques y proporción', () => {
  it('ejemplo de la propuesta: área 80 y especialidad 90 con 40/60 → 86', () => {
    const r = exito(
      calcularPuntaje(
        entrada({ area: [cumple(80), falla(20)], especialidad: [cumple(90), falla(10)] }),
      ),
    );
    expect(r.puntaje_area).toBe(80);
    expect(r.puntaje_especialidad).toBe(90);
    expect(r.puntaje_total).toBe(86);
    expect(r.requiere_revision_manual).toBe(false);
    expect(r.motivos_revision).toEqual([]);
  });

  it('la proporción llega por parámetro: 80 y 90 con 50/50 → 85', () => {
    const r = exito(
      calcularPuntaje(
        entrada({
          area: [cumple(80), falla(20)],
          especialidad: [cumple(90), falla(10)],
          proporcion: { area: 50, especialidad: 50 },
        }),
      ),
    );
    expect(r.puntaje_total).toBe(85);
  });

  it('el criterio obligatorio no cumplido no anula su bloque: suma 0 y el resto se conserva', () => {
    const r = exito(
      calcularPuntaje(
        entrada({
          area: [cumple(90), falla(10, { obligatorio: true })],
          especialidad: [cumple(90), falla(10)],
        }),
      ),
    );
    expect(r.puntaje_area).toBe(90);
    expect(r.puntaje_total).toBe(90);
  });
});

describe('calcularPuntaje: redondeo de la nota final', () => {
  it('86,4 se redondea a 86 (área 81 y especialidad 90 con 40/60)', () => {
    const r = exito(
      calcularPuntaje(
        entrada({ area: [cumple(81), falla(19)], especialidad: [cumple(90), falla(10)] }),
      ),
    );
    expect(r.puntaje_total).toBe(86);
  });

  it('la mitad sube: 69,5 → 70 y queda fuera de la banda (área 69 y especialidad 70 con 50/50)', () => {
    const r = exito(
      calcularPuntaje(
        entrada({
          area: [cumple(69), falla(31)],
          especialidad: [cumple(70), falla(30)],
          proporcion: { area: 50, especialidad: 50 },
        }),
      ),
    );
    expect(r.puntaje_total).toBe(70);
    expect(r.requiere_revision_manual).toBe(false);
  });

  it('la banda se compara con la nota redondeada: 49,5 → 50 y lleva la marca (área 49 y especialidad 50 con 50/50)', () => {
    const r = exito(
      calcularPuntaje(
        entrada({
          area: [cumple(49), falla(51)],
          especialidad: [cumple(50), falla(50)],
          proporcion: { area: 50, especialidad: 50 },
        }),
      ),
    );
    expect(r.puntaje_total).toBe(50);
    expect(r.motivos_revision).toEqual(['BANDA_AMBIGUA']);
  });

  it('cálculo con enteros: área 11 y especialidad 66 con 30/70 → 49,5 exacto → 50, con marca', () => {
    // En coma flotante, 0.3 * 11 + 0.7 * 66 = 49,49999999999999 → se redondearía a 49 (sin marca).
    // Con enteros, (30 * 11 + 70 * 66) / 100 = 4950 / 100 = 49,5 exacto → 50 (dentro de la banda).
    const r = exito(
      calcularPuntaje(
        entrada({
          area: [cumple(11), falla(89)],
          especialidad: [cumple(66), falla(34)],
          proporcion: { area: 30, especialidad: 70 },
        }),
      ),
    );
    expect(r.puntaje_total).toBe(50);
    expect(r.motivos_revision).toEqual(['BANDA_AMBIGUA']);
  });
});

describe('calcularPuntaje: bordes de la banda ambigua (50 a 69, extremos incluidos)', () => {
  // Los dos bloques usan los pesos 49, 1, 19, 1 y 30 con los mismos criterios cumplidos, así que
  // área = especialidad = nota con cualquier proporción.

  it('borde 49: cumple solo el criterio de 49 en cada bloque (suma 49) → nota 49, sin marca', () => {
    // cumplido = true: 49. cumplido = false: 1, 19, 1 y 30. Área 49, especialidad 49.
    const r = exito(
      calcularPuntaje(entrada({ area: bloqueDeBorde(1), especialidad: bloqueDeBorde(1) })),
    );
    expect(r.puntaje_area).toBe(49);
    expect(r.puntaje_total).toBe(49);
    expect(r.requiere_revision_manual).toBe(false);
  });

  it('borde 50: cumplen los criterios de 49 y 1 en cada bloque (suma 50) → nota 50, con marca', () => {
    // cumplido = true: 49 y 1. cumplido = false: 19, 1 y 30. Área 50, especialidad 50.
    const r = exito(
      calcularPuntaje(entrada({ area: bloqueDeBorde(2), especialidad: bloqueDeBorde(2) })),
    );
    expect(r.puntaje_area).toBe(50);
    expect(r.puntaje_total).toBe(50);
    expect(r.motivos_revision).toEqual(['BANDA_AMBIGUA']);
  });

  it('borde 69: cumplen los criterios de 49, 1 y 19 en cada bloque (suma 69) → nota 69, con marca', () => {
    // cumplido = true: 49, 1 y 19. cumplido = false: 1 y 30. Área 69, especialidad 69.
    const r = exito(
      calcularPuntaje(entrada({ area: bloqueDeBorde(3), especialidad: bloqueDeBorde(3) })),
    );
    expect(r.puntaje_area).toBe(69);
    expect(r.puntaje_total).toBe(69);
    expect(r.motivos_revision).toEqual(['BANDA_AMBIGUA']);
  });

  it('borde 70: cumplen los criterios de 49, 1, 19 y 1 en cada bloque (suma 70) → nota 70, sin marca', () => {
    // cumplido = true: 49, 1, 19 y 1. cumplido = false: 30. Área 70, especialidad 70.
    const r = exito(
      calcularPuntaje(entrada({ area: bloqueDeBorde(4), especialidad: bloqueDeBorde(4) })),
    );
    expect(r.puntaje_area).toBe(70);
    expect(r.puntaje_total).toBe(70);
    expect(r.requiere_revision_manual).toBe(false);
  });

  it('la banda llega por parámetro: con 60 a 79, la nota 70 lleva la marca', () => {
    const r = exito(
      calcularPuntaje(
        entrada({
          area: [cumple(70), falla(30)],
          especialidad: [cumple(70), falla(30)],
          banda: { minimo: 60, maximo: 79 },
        }),
      ),
    );
    expect(r.puntaje_total).toBe(70);
    expect(r.motivos_revision).toEqual(['BANDA_AMBIGUA']);
  });
});

describe('calcularPuntaje: criterio obligatorio', () => {
  it('obligatorio no cumplido en ÁREA con nota 90 → marca CRITERIO_OBLIGATORIO', () => {
    const r = exito(
      calcularPuntaje(
        entrada({
          area: [cumple(90), falla(10, { obligatorio: true })],
          especialidad: [cumple(90), falla(10)],
        }),
      ),
    );
    expect(r.puntaje_total).toBe(90);
    expect(r.requiere_revision_manual).toBe(true);
    expect(r.motivos_revision).toEqual(['CRITERIO_OBLIGATORIO']);
  });

  it('obligatorio cumplido con nota 90 → sin marca', () => {
    const r = exito(
      calcularPuntaje(
        entrada({
          area: [cumple(90, { obligatorio: true }), falla(10)],
          especialidad: [cumple(90, { obligatorio: true }), falla(10)],
        }),
      ),
    );
    expect(r.requiere_revision_manual).toBe(false);
    expect(r.motivos_revision).toEqual([]);
  });

  it('obligatorio no cumplido en ESPECIALIDAD con nota 90 → marca CRITERIO_OBLIGATORIO', () => {
    const r = exito(
      calcularPuntaje(
        entrada({
          area: [cumple(90), falla(10)],
          especialidad: [cumple(90), falla(10, { obligatorio: true })],
        }),
      ),
    );
    expect(r.motivos_revision).toEqual(['CRITERIO_OBLIGATORIO']);
  });

  it('obligatorio no cumplido y nota en la banda → los dos motivos', () => {
    const r = exito(
      calcularPuntaje(
        entrada({
          area: [cumple(60), falla(40, { obligatorio: true })],
          especialidad: [cumple(60), falla(40)],
        }),
      ),
    );
    expect(r.puntaje_total).toBe(60);
    expect(r.motivos_revision).toEqual(['CRITERIO_OBLIGATORIO', 'BANDA_AMBIGUA']);
  });
});

describe('calcularPuntaje: criterios de cada bloque', () => {
  it('pesos que suman 90 en ÁREA → PESOS_NO_SUMAN_100 en el bloque AREA', () => {
    const r = error(
      calcularPuntaje(
        entrada({ area: [cumple(50), cumple(40)], especialidad: [cumple(90), falla(10)] }),
      ),
    );
    expect(r.codigo).toBe('PESOS_NO_SUMAN_100');
    expect(r.bloque).toBe('AREA');
  });

  it('pesos que suman 110 en ÁREA → PESOS_NO_SUMAN_100', () => {
    const r = error(
      calcularPuntaje(
        entrada({ area: [cumple(60), cumple(50)], especialidad: [cumple(90), falla(10)] }),
      ),
    );
    expect(r.codigo).toBe('PESOS_NO_SUMAN_100');
    expect(r.bloque).toBe('AREA');
  });

  it('pesos que suman 90 en ESPECIALIDAD → PESOS_NO_SUMAN_100 en el bloque ESPECIALIDAD', () => {
    const r = error(
      calcularPuntaje(
        entrada({ area: [cumple(80), falla(20)], especialidad: [cumple(50), cumple(40)] }),
      ),
    );
    expect(r.codigo).toBe('PESOS_NO_SUMAN_100');
    expect(r.bloque).toBe('ESPECIALIDAD');
  });

  it('ÁREA con todos sus criterios inactivos → BLOQUE_SIN_CRITERIOS en el bloque AREA', () => {
    const r = error(
      calcularPuntaje(
        entrada({
          area: [cumple(60, { activo: false }), cumple(40, { activo: false })],
          especialidad: [cumple(90), falla(10)],
        }),
      ),
    );
    expect(r.codigo).toBe('BLOQUE_SIN_CRITERIOS');
    expect(r.bloque).toBe('AREA');
  });

  it('ESPECIALIDAD sin ningún criterio → BLOQUE_SIN_CRITERIOS en el bloque ESPECIALIDAD', () => {
    const r = error(calcularPuntaje(entrada({ area: [cumple(80), falla(20)], especialidad: [] })));
    expect(r.codigo).toBe('BLOQUE_SIN_CRITERIOS');
    expect(r.bloque).toBe('ESPECIALIDAD');
  });

  it('un criterio inactivo no cuenta ni aparece en el desglose, aunque tenga juicio', () => {
    // Activos 60 + 40 = 100; el inactivo de 30 haría sumar 130.
    const r = exito(
      calcularPuntaje(
        entrada({
          area: [cumple(60), cumple(40), cumple(30, { activo: false })],
          especialidad: [cumple(90), falla(10)],
        }),
      ),
    );
    expect(r.puntaje_area).toBe(100);
    expect(r.detalles.map((d) => d.id_criterio)).not.toContain('c-area-3');
  });

  it('los criterios de otra especialidad del área y los de otra área se ignoran', () => {
    const base = entrada({ area: [cumple(80), falla(20)], especialidad: [cumple(90), falla(10)] });
    const otraEspecialidad = criterio({
      id: 'c-frontend',
      id_especialidad: 'es-frontend',
      peso: 50,
    });
    const otraArea = criterio({ id: 'c-videojuegos', id_area_tecnica: 'at-videojuegos', peso: 50 });
    const r = exito(
      calcularPuntaje({
        ...base,
        criterios: [...base.criterios, otraEspecialidad, otraArea],
        juicios: [
          ...base.juicios,
          { id_criterio: 'c-frontend', cumplido: true, observacion: null },
          { id_criterio: 'c-videojuegos', cumplido: true, observacion: null },
        ],
      }),
    );
    expect(r.puntaje_area).toBe(80);
    expect(r.puntaje_especialidad).toBe(90);
    expect(r.detalles.map((d) => d.id_criterio)).toEqual([
      'c-area-1',
      'c-area-2',
      'c-esp-1',
      'c-esp-2',
    ]);
  });

  // Cada caso suma 100 con el segundo criterio: solo la comprobación del peso lo detiene.
  it.each([
    ['0', 0, 100],
    ['negativo', -10, 110],
    ['decimal', 12.5, 87.5],
  ])('peso %s → PESO_INVALIDO', (_nombre, peso, resto) => {
    const r = error(
      calcularPuntaje(
        entrada({ area: [cumple(peso), cumple(resto)], especialidad: [cumple(90), falla(10)] }),
      ),
    );
    expect(r.codigo).toBe('PESO_INVALIDO');
    expect(r.bloque).toBe('AREA');
  });

  it('peso NaN → PESO_INVALIDO', () => {
    const r = error(
      calcularPuntaje(
        entrada({ area: [cumple(Number.NaN), cumple(100)], especialidad: [cumple(90), falla(10)] }),
      ),
    );
    expect(r.codigo).toBe('PESO_INVALIDO');
  });

  it('a un criterio activo le falta el juicio → JUICIO_FALTANTE', () => {
    const base = entrada({ area: [cumple(80), falla(20)], especialidad: [cumple(90), falla(10)] });
    const r = error(
      calcularPuntaje({
        ...base,
        juicios: base.juicios.filter((j) => j.id_criterio !== 'c-area-2'),
      }),
    );
    expect(r.codigo).toBe('JUICIO_FALTANTE');
    expect(r.bloque).toBe('AREA');
  });
});

describe('calcularPuntaje: desglose', () => {
  it('copia nombre, peso, bloque, cumplido y observación; puntaje_obtenido es el peso o 0', () => {
    const r = exito(
      calcularPuntaje(
        entrada({
          area: [cumple(80, { observacion: 'Tiene título técnico.' }), falla(20)],
          especialidad: [cumple(90), falla(10, { observacion: 'No menciona Node.' })],
        }),
      ),
    );
    expect(r.detalles).toEqual([
      {
        id_criterio: 'c-area-1',
        bloque: 'AREA',
        nombre_criterio: 'Área 1',
        peso: 80,
        cumplido: true,
        puntaje_obtenido: 80,
        observacion: 'Tiene título técnico.',
      },
      {
        id_criterio: 'c-area-2',
        bloque: 'AREA',
        nombre_criterio: 'Área 2',
        peso: 20,
        cumplido: false,
        puntaje_obtenido: 0,
        observacion: null,
      },
      {
        id_criterio: 'c-esp-1',
        bloque: 'ESPECIALIDAD',
        nombre_criterio: 'Especialidad 1',
        peso: 90,
        cumplido: true,
        puntaje_obtenido: 90,
        observacion: null,
      },
      {
        id_criterio: 'c-esp-2',
        bloque: 'ESPECIALIDAD',
        nombre_criterio: 'Especialidad 2',
        peso: 10,
        cumplido: false,
        puntaje_obtenido: 0,
        observacion: 'No menciona Node.',
      },
    ]);
  });
});

describe('calcularPuntaje: parámetros de Configuración', () => {
  const bloques = { area: [cumple(80), falla(20)], especialidad: [cumple(90), falla(10)] };

  it.each([
    ['que suma 99', { area: 40, especialidad: 59 }],
    ['que suma 101', { area: 41, especialidad: 60 }],
    ['con decimales que suman 100', { area: 40.5, especialidad: 59.5 }],
    ['con un negativo', { area: -10, especialidad: 110 }],
    ['con NaN', { area: Number.NaN, especialidad: 60 }],
  ])('proporción %s → PROPORCION_INVALIDA', (_nombre, proporcion) => {
    const r = error(calcularPuntaje(entrada({ ...bloques, proporcion })));
    expect(r.codigo).toBe('PROPORCION_INVALIDA');
    expect(r.bloque).toBeNull();
  });

  it.each([
    ['invertida (69 a 50)', { minimo: 69, maximo: 50 }],
    ['con mínimo igual al máximo (60 a 60)', { minimo: 60, maximo: 60 }],
    ['con decimales (49,5 a 69)', { minimo: 49.5, maximo: 69 }],
    ['por debajo de 0 (-1 a 69)', { minimo: -1, maximo: 69 }],
    ['por encima de 100 (50 a 101)', { minimo: 50, maximo: 101 }],
  ])('banda %s → BANDA_INVALIDA', (_nombre, banda) => {
    const r = error(calcularPuntaje(entrada({ ...bloques, banda })));
    expect(r.codigo).toBe('BANDA_INVALIDA');
    expect(r.bloque).toBeNull();
  });
});

describe('calcularPuntaje: orden de comprobación', () => {
  const malaProporcion = { area: 40, especialidad: 59 };
  const malaBanda = { minimo: 69, maximo: 50 };

  it('proporción inválida y ÁREA sin criterios → PROPORCION_INVALIDA', () => {
    const r = error(
      calcularPuntaje(
        entrada({ area: [], especialidad: [cumple(90), falla(10)], proporcion: malaProporcion }),
      ),
    );
    expect(r.codigo).toBe('PROPORCION_INVALIDA');
  });

  it('proporción y banda inválidas → PROPORCION_INVALIDA', () => {
    const r = error(
      calcularPuntaje(
        entrada({
          area: [cumple(80), falla(20)],
          especialidad: [cumple(90), falla(10)],
          proporcion: malaProporcion,
          banda: malaBanda,
        }),
      ),
    );
    expect(r.codigo).toBe('PROPORCION_INVALIDA');
  });

  it('banda inválida y ÁREA sin criterios → BANDA_INVALIDA', () => {
    const r = error(
      calcularPuntaje(
        entrada({ area: [], especialidad: [cumple(90), falla(10)], banda: malaBanda }),
      ),
    );
    expect(r.codigo).toBe('BANDA_INVALIDA');
  });

  it('los dos bloques mal → el error es del bloque AREA', () => {
    const r = error(calcularPuntaje(entrada({ area: [cumple(50)], especialidad: [] })));
    expect(r.codigo).toBe('PESOS_NO_SUMAN_100');
    expect(r.bloque).toBe('AREA');
  });

  it('peso decimal y suma distinta de 100 → PESO_INVALIDO antes que PESOS_NO_SUMAN_100', () => {
    const r = error(
      calcularPuntaje(
        entrada({ area: [cumple(12.5), cumple(50)], especialidad: [cumple(90), falla(10)] }),
      ),
    );
    expect(r.codigo).toBe('PESO_INVALIDO');
  });

  it('suma distinta de 100 y juicio faltante → PESOS_NO_SUMAN_100 antes que JUICIO_FALTANTE', () => {
    const base = entrada({ area: [cumple(50), cumple(40)], especialidad: [cumple(90), falla(10)] });
    const r = error(
      calcularPuntaje({
        ...base,
        juicios: base.juicios.filter((j) => j.id_criterio !== 'c-area-1'),
      }),
    );
    expect(r.codigo).toBe('PESOS_NO_SUMAN_100');
  });
});

describe('calcularPuntaje: pureza', () => {
  it('no muta la entrada', () => {
    const base = entrada({ area: [cumple(80), falla(20)], especialidad: [cumple(90), falla(10)] });
    const congelada: EntradaPuntaje = Object.freeze({
      ...base,
      criterios: Object.freeze(base.criterios.map((c) => Object.freeze({ ...c }))),
      juicios: Object.freeze(base.juicios.map((j) => Object.freeze({ ...j }))),
      banda: Object.freeze({ ...base.banda }),
      proporcion: Object.freeze({ ...base.proporcion }),
    });
    const r = exito(calcularPuntaje(congelada));
    expect(r.puntaje_total).toBe(86);
    expect(congelada.criterios.map((c) => c.id)).toEqual([
      'c-area-1',
      'c-area-2',
      'c-esp-1',
      'c-esp-2',
    ]);
  });
});

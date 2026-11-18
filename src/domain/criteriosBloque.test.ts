import { describe, expect, it } from 'vitest';
import {
  CODIGOS_BLOQUE_CRITERIOS,
  PESO_TOTAL_BLOQUE,
  sumaPesosActivos,
  validarBloqueCriterios,
} from './criteriosBloque';
import type { BloqueCriterio } from './enumeraciones';
import type { CriterioEvaluacion } from './postulaciones';
import { calcularPuntaje } from './puntaje';

const AREA = 'area-x';
const ESPECIALIDAD = 'esp-x';

function criterio(
  id: string,
  peso: number,
  cambios: Partial<CriterioEvaluacion> = {},
): CriterioEvaluacion {
  return {
    id,
    id_area_tecnica: AREA,
    id_especialidad: null,
    nombre: id,
    tipo: 'TECNOLOGIA',
    peso,
    obligatorio: false,
    activo: true,
    ...cambios,
  };
}

const pesos = (...valores: number[]) => valores.map((p, i) => ({ peso: p, activo: true, i }));

describe('validarBloqueCriterios', () => {
  it('acepta pesos enteros mayores que 0 que suman 100', () => {
    expect(validarBloqueCriterios(pesos(30, 30, 25, 15), 'AREA')).toEqual({ ok: true, suma: 100 });
    expect(validarBloqueCriterios(pesos(100), 'ESPECIALIDAD')).toEqual({ ok: true, suma: 100 });
  });

  it.each([
    ['99', [50, 49], 99],
    ['101', [50, 51], 101],
    ['0', [0], 0],
  ])('suma %s → PESOS_NO_SUMAN_100 o PESO_INVALIDO con la suma real', (_nombre, valores, suma) => {
    const r = validarBloqueCriterios(pesos(...valores), 'AREA');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.suma).toBe(suma);
  });

  it('sin criterios → BLOQUE_SIN_CRITERIOS', () => {
    expect(validarBloqueCriterios([], 'AREA')).toMatchObject({
      ok: false,
      codigo: 'BLOQUE_SIN_CRITERIOS',
      suma: 0,
    });
  });

  it('solo cuentan los activos: con todos inactivos es BLOQUE_SIN_CRITERIOS', () => {
    const r = validarBloqueCriterios([{ peso: 100, activo: false }], 'AREA');
    expect(r).toMatchObject({ ok: false, codigo: 'BLOQUE_SIN_CRITERIOS' });
  });

  it('un criterio inactivo no suma ni se valida', () => {
    const bloque = [
      { peso: 60, activo: true },
      { peso: 40, activo: true },
      { peso: 10, activo: false },
      { peso: -3, activo: false },
    ];
    expect(validarBloqueCriterios(bloque, 'AREA')).toEqual({ ok: true, suma: 100 });
    expect(sumaPesosActivos(bloque)).toBe(100);
  });

  it.each([
    ['cero', [100, 0]],
    ['negativo', [110, -10]],
    ['decimal', [50.5, 49.5]],
  ])('peso %s → PESO_INVALIDO (antes que la suma)', (_nombre, valores) => {
    expect(validarBloqueCriterios(pesos(...valores), 'AREA')).toMatchObject({
      ok: false,
      codigo: 'PESO_INVALIDO',
    });
  });

  it('un peso no finito → PESO_INVALIDO', () => {
    expect(validarBloqueCriterios(pesos(Number.NaN, 100), 'AREA')).toMatchObject({
      codigo: 'PESO_INVALIDO',
    });
  });

  it('el mensaje nombra el bloque', () => {
    const area = validarBloqueCriterios([], 'AREA');
    const especialidad = validarBloqueCriterios([], 'ESPECIALIDAD');
    expect(!area.ok && area.mensaje).toContain('del área');
    expect(!especialidad.ok && especialidad.mensaje).toContain('de la especialidad');
  });

  it('no modifica la entrada', () => {
    const entrada = pesos(50, 50);
    const copia = structuredClone(entrada);
    validarBloqueCriterios(entrada, 'AREA');
    expect(entrada).toEqual(copia);
  });

  it('el total exigido es 100', () => {
    expect(PESO_TOTAL_BLOQUE).toBe(100);
    expect(CODIGOS_BLOQUE_CRITERIOS).toHaveLength(3);
  });
});

describe('contraste con calcularPuntaje: la misma regla, los mismos códigos y mensajes', () => {
  const VALIDO_ESPECIALIDAD = [
    criterio('e1', 50, { id_especialidad: ESPECIALIDAD }),
    criterio('e2', 50, { id_especialidad: ESPECIALIDAD }),
  ];
  const VALIDO_AREA = [criterio('a1', 60), criterio('a2', 40)];

  /** El código y el mensaje que da `calcularPuntaje` para un bloque (el otro bloque, válido). */
  function dePuntaje(bloque: BloqueCriterio, criterios: CriterioEvaluacion[]) {
    const todos =
      bloque === 'AREA' ? [...criterios, ...VALIDO_ESPECIALIDAD] : [...VALIDO_AREA, ...criterios];
    const r = calcularPuntaje({
      id_area_tecnica: AREA,
      id_especialidad: ESPECIALIDAD,
      criterios: todos,
      juicios: todos.map((c) => ({ id_criterio: c.id, cumplido: true, observacion: null })),
      banda: { minimo: 50, maximo: 69 },
      proporcion: { area: 40, especialidad: 60 },
    });
    return r.ok
      ? { ok: true as const }
      : { ok: false as const, codigo: r.codigo, mensaje: r.mensaje };
  }

  const casos: [string, number[], Partial<CriterioEvaluacion>[]][] = [
    ['válido', [30, 30, 40], []],
    ['suma 99', [30, 30, 39], []],
    ['suma 101', [30, 30, 41], []],
    ['peso cero', [100, 0], []],
    ['peso negativo', [110, -10], []],
    ['peso decimal', [50.5, 49.5], []],
    ['un inactivo no cuenta', [60, 40, 10], [{}, {}, { activo: false }]],
    ['todos inactivos', [100], [{ activo: false }]],
    ['sin criterios', [], []],
  ];

  for (const bloque of ['AREA', 'ESPECIALIDAD'] as const) {
    it.each(casos)(`bloque ${bloque}: %s`, (_nombre, valores, extras) => {
      const criterios = valores.map((p, i) =>
        criterio(`c${i}`, p, {
          id_especialidad: bloque === 'ESPECIALIDAD' ? ESPECIALIDAD : null,
          ...extras[i],
        }),
      );
      const nuestro = validarBloqueCriterios(criterios, bloque);
      const calculo = dePuntaje(bloque, criterios);
      expect(nuestro.ok).toBe(calculo.ok);
      if (!nuestro.ok && !calculo.ok) {
        expect(nuestro.codigo).toBe(calculo.codigo);
        expect(nuestro.mensaje).toBe(calculo.mensaje);
      }
    });
  }
});

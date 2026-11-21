import { beforeEach, describe, expect, it } from 'vitest';
import { SECCIONES_CONFIGURACION } from '@/domain';
import { useAlmacen } from '@/data';
import { crearEntorno, obtenerConfiguracion } from '@/services';
import {
  aConfiguracion,
  aValorParametro,
  erroresPorParametro,
  ETIQUETA_SECCION,
  textoANumero,
} from './configuracion';

const entorno = crearEntorno({ demoraMs: 0 });

async function secciones() {
  const r = await obtenerConfiguracion({ idActor: 'demo-admin' }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return { vista: r.valor, filas: aConfiguracion(r.valor) };
}

describe('adaptador de Configuración', () => {
  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('cada sección tiene su título y las tres están', async () => {
    const { filas } = await secciones();

    expect(filas.map((s) => s.seccion)).toEqual([...SECCIONES_CONFIGURACION]);
    for (const s of filas) expect(s.titulo).toBe(ETIQUETA_SECCION[s.seccion]);
    expect(ETIQUETA_SECCION.EVALUACION).toBe('Evaluación de postulaciones');
  });

  it('presenta el valor actual y el predeterminado de cada parámetro, con su unidad', async () => {
    const { filas } = await secciones();
    const todos = filas.flatMap((s) => s.parametros);

    const banda = todos.find((p) => p.clave === 'EVALUACION_BANDA_AMBIGUA')!;
    expect(banda.campos.map((c) => [c.nombre, c.valor])).toEqual([
      ['minimo', '50'],
      ['maximo', '69'],
    ]);
    expect(banda.predeterminadoTexto).toBe('50 a 69');
    const proporcion = todos.find((p) => p.clave === 'EVALUACION_PROPORCION')!;
    expect(proporcion.predeterminadoTexto).toBe('40 % / 60 %');
    const duracion = todos.find((p) => p.clave === 'PRACTICA_DURACION_MESES')!;
    expect(duracion.predeterminadoTexto).toBe('4 meses');
    expect(duracion.unidad).toBe('meses');
    expect(todos.find((p) => p.clave === 'INSIGHT_ATRASO_PORCENTAJE')!.unidad).toBe('%');
    // 2 + 2 parámetros de Evaluación y Prácticas y 10 umbrales de Seguimiento.
    expect(todos).toHaveLength(14);
  });

  it('con los valores de ejemplo todo es predeterminado y no hay nada que restaurar', async () => {
    const { filas } = await secciones();

    for (const s of filas) expect(s.todoPredeterminado).toBe(true);
  });

  it('textoANumero: vacío y no numérico dan NaN; la coma decimal se acepta', () => {
    expect(textoANumero('12')).toBe(12);
    expect(textoANumero(' 3,5 ')).toBe(3.5);
    expect(Number.isNaN(textoANumero(''))).toBe(true);
    expect(Number.isNaN(textoANumero('abc'))).toBe(true);
  });

  it('aValorParametro arma el valor según el tipo del parámetro', async () => {
    const { filas } = await secciones();
    const todos = filas.flatMap((s) => s.parametros);
    const de = (c: string) => todos.find((p) => p.clave === c)!;

    expect(aValorParametro(de('PRACTICA_DURACION_MESES'), { valor: '6' })).toEqual({
      tipo: 'numero',
      valor: 6,
    });
    expect(aValorParametro(de('EVALUACION_BANDA_AMBIGUA'), { minimo: '10', maximo: '20' })).toEqual(
      { tipo: 'rango', minimo: 10, maximo: 20 },
    );
    expect(
      aValorParametro(de('EVALUACION_PROPORCION'), { area: '30', especialidad: '70' }),
    ).toEqual({ tipo: 'proporcion', area: 30, especialidad: 70 });
  });

  describe('erroresPorParametro', () => {
    const claves = ['EVALUACION_BANDA_AMBIGUA', 'PRACTICA_DURACION_MESES'] as const;

    it('reparte los errores por parámetro y por casilla', () => {
      const { porClave, sueltos } = erroresPorParametro(
        {
          'EVALUACION_BANDA_AMBIGUA.minimo': 'Mínimo mal',
          PRACTICA_DURACION_MESES: 'Duración mal',
        },
        claves,
      );

      expect(porClave.EVALUACION_BANDA_AMBIGUA?.porCampo.minimo).toBe('Mínimo mal');
      expect(porClave.PRACTICA_DURACION_MESES?.general).toBe('Duración mal');
      expect(sueltos).toEqual([]);
    });

    it('acepta las claves de la forma (valores.CLAVE.campo) y deja sueltas las desconocidas', () => {
      const { porClave, sueltos } = erroresPorParametro(
        { 'valores.PRACTICA_DURACION_MESES.valor': 'Escribe un número.', _general: 'Otro' },
        claves,
      );

      expect(porClave.PRACTICA_DURACION_MESES?.porCampo.valor).toBe('Escribe un número.');
      expect(sueltos).toEqual(['Otro']);
    });

    it('sin errores no devuelve nada', () => {
      expect(erroresPorParametro(undefined, claves)).toEqual({ porClave: {}, sueltos: [] });
    });
  });
});

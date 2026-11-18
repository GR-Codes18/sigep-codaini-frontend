import { describe, expect, it } from 'vitest';
import { CATALOGO_PARAMETROS, calcularInsights } from '@/domain';
import { prepararPrueba } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import { calcularInsightsVigentes, umbralesDe } from './comun';

const AHORA = AHORA_DE_PRUEBA.toISOString();

describe('umbralesDe', () => {
  it('arma los 10 umbrales de Seguimiento con los valores vigentes', () => {
    const { datos } = { datos: prepararPrueba().datos() };
    const r = umbralesDe(datos.parametros);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.valor)).toHaveLength(10);
    expect(r.valor.INSIGHT_INACTIVO_DIAS).toBe(7);
    expect(r.valor.INSIGHT_INACTIVO_CRITICO_DIAS).toBe(14);
    expect(r.valor.INSIGHT_CARGA_MINIMA_TAREAS).toBe(0);
  });

  it('usa el valor guardado, no el del catálogo inicial', () => {
    const prueba = prepararPrueba();
    const parametros = prueba
      .datos()
      .parametros.map((p) =>
        p.clave === 'INSIGHT_INACTIVO_DIAS'
          ? { ...p, valor: { tipo: 'numero' as const, valor: 3 } }
          : p,
      );
    const r = umbralesDe(parametros);
    expect(r.ok && r.valor.INSIGHT_INACTIVO_DIAS).toBe(3);
  });

  it('no incluye los parámetros que no son de insights', () => {
    const r = umbralesDe(prepararPrueba().datos().parametros);
    if (!r.ok) throw new Error(r.mensaje);
    expect(Object.keys(r.valor).every((c) => c.startsWith('INSIGHT_'))).toBe(true);
  });

  it('un umbral que falta es CONFIGURACION_INVALIDA', () => {
    const parametros = prepararPrueba()
      .datos()
      .parametros.filter((p) => p.clave !== 'INSIGHT_ATRASO_PUNTOS');
    expect(umbralesDe(parametros)).toMatchObject({ ok: false, codigo: 'CONFIGURACION_INVALIDA' });
  });

  it('un umbral que no es un número es CONFIGURACION_INVALIDA', () => {
    const parametros = prepararPrueba()
      .datos()
      .parametros.map((p) =>
        p.clave === 'INSIGHT_ATRASO_PUNTOS'
          ? { ...p, valor: { tipo: 'rango' as const, minimo: 1, maximo: 2 } }
          : p,
      );
    expect(umbralesDe(parametros)).toMatchObject({ ok: false, codigo: 'CONFIGURACION_INVALIDA' });
  });

  it('cubre todas las claves INSIGHT_ del catálogo', () => {
    const claves = CATALOGO_PARAMETROS.filter((p) => p.clave.startsWith('INSIGHT_')).map(
      (p) => p.clave,
    );
    const r = umbralesDe(prepararPrueba().datos().parametros);
    expect(r.ok && Object.keys(r.valor).sort()).toEqual([...claves].sort());
  });
});

describe('calcularInsightsVigentes', () => {
  it('devuelve los insights de las 7 reglas sin filtrar por rol', () => {
    const datos = prepararPrueba().datos();
    const r = calcularInsightsVigentes(datos, AHORA);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const reglas = new Set(r.valor.map((i) => i.tipo_regla));
    expect(reglas.size).toBe(7);
    expect(r.valor.every((i) => i.revisado === false)).toBe(true);
  });

  it('da lo mismo que calcular con domain/', () => {
    const datos = prepararPrueba().datos();
    const esperado = calcularInsights(
      datos,
      {
        INSIGHT_INACTIVO_DIAS: 7,
        INSIGHT_INACTIVO_CRITICO_DIAS: 14,
        INSIGHT_CARGA_MAXIMA_TAREAS: 3,
        INSIGHT_CARGA_MINIMA_TAREAS: 0,
        INSIGHT_ATRASO_PUNTOS: 20,
        INSIGHT_ATRASO_PORCENTAJE: 25,
        INSIGHT_PROYECTO_SIN_ACTIVIDAD_DIAS: 7,
        INSIGHT_SUPERVISION_DEMORADA_DIAS: 3,
        INSIGHT_POSTULACION_DIAS: 5,
        INSIGHT_FIN_PRACTICA_DIAS: 14,
      },
      AHORA,
    );
    const r = calcularInsightsVigentes(datos, AHORA);
    expect(esperado.ok && r.ok && r.valor).toEqual(esperado.ok && esperado.insights);
  });

  it('un umbral cambiado en Configuración cambia el resultado', () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();
    const base = calcularInsightsVigentes(datos, AHORA);
    const estricto = calcularInsightsVigentes(
      {
        ...datos,
        parametros: datos.parametros.map((p) =>
          p.clave === 'INSIGHT_SUPERVISION_DEMORADA_DIAS'
            ? { ...p, valor: { tipo: 'numero' as const, valor: 10 } }
            : p,
        ),
      },
      AHORA,
    );
    const demoradas = (r: typeof base) =>
      r.ok ? r.valor.filter((i) => i.tipo_regla === 'SUPERVISION_DEMORADA').length : -1;
    expect(demoradas(estricto)).toBeLessThan(demoradas(base));
  });

  it('un «ahora» inválido es AHORA_INVALIDO', () => {
    const r = calcularInsightsVigentes(prepararPrueba().datos(), '2026-11-17');
    expect(r).toMatchObject({ ok: false, codigo: 'AHORA_INVALIDO' });
  });

  it('un umbral fuera de rango es UMBRAL_INVALIDO, con el mensaje de domain/', () => {
    const datos = prepararPrueba().datos();
    const r = calcularInsightsVigentes(
      {
        ...datos,
        parametros: datos.parametros.map((p) =>
          p.clave === 'INSIGHT_INACTIVO_DIAS'
            ? { ...p, valor: { tipo: 'numero' as const, valor: 0 } }
            : p,
        ),
      },
      AHORA,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'UMBRAL_INVALIDO' });
    expect(r.ok === false && r.mensaje.length).toBeGreaterThan(0);
  });

  it('falta un parámetro: CONFIGURACION_INVALIDA', () => {
    const datos = prepararPrueba().datos();
    const r = calcularInsightsVigentes({ ...datos, parametros: [] }, AHORA);
    expect(r).toMatchObject({ ok: false, codigo: 'CONFIGURACION_INVALIDA' });
  });
});

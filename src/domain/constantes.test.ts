import { describe, expect, it } from 'vitest';

import { CATALOGO_PARAMETROS, SECCIONES_CONFIGURACION } from './configuracion';
import { ACCIONES_POR_CATEGORIA } from './enumeraciones';

describe('constantes de domain', () => {
  it('las 62 acciones del historial no tienen repetidos', () => {
    const acciones = Object.values(ACCIONES_POR_CATEGORIA).flat();

    expect(acciones).toHaveLength(62);
    expect(new Set(acciones).size).toBe(62);
  });

  it('el catalogo tiene 14 claves unicas', () => {
    const claves = CATALOGO_PARAMETROS.map((parametro) => parametro.clave);

    expect(claves).toHaveLength(14);
    expect(new Set(claves).size).toBe(14);
  });

  it('cada clave tiene seccion valida y un valor inicial coherente con su tipo', () => {
    for (const parametro of CATALOGO_PARAMETROS) {
      expect(SECCIONES_CONFIGURACION).toContain(parametro.seccion);
      const valor = parametro.valor;

      if (valor.tipo === 'numero') {
        expect(typeof valor.valor).toBe('number');
      } else if (valor.tipo === 'rango') {
        expect(typeof valor.minimo).toBe('number');
        expect(typeof valor.maximo).toBe('number');
      } else {
        expect(typeof valor.area).toBe('number');
        expect(typeof valor.especialidad).toBe('number');
      }
    }
  });
});

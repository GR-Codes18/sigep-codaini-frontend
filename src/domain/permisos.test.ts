import { describe, expect, it } from 'vitest';

import {
  ACCIONES_PERMISO,
  AMBITO_POR_ACCION,
  AMBITOS_PERMISO,
  CODIGOS_DENEGACION,
} from './permisos';

/**
 * La cobertura de contextos no se comprueba aquí: `ContextoPorAccion` es un tipo mapeado sobre
 * `AccionPermiso`, así que si falta una acción el proyecto no compila. Esa parte la verifica
 * `tsc -b` (`npm run build`); aquí se comprueba lo que existe en tiempo de ejecución.
 */
describe('contrato de permisos', () => {
  it('define 55 acciones sin repetidos', () => {
    expect(ACCIONES_PERMISO).toHaveLength(55);
    expect(new Set(ACCIONES_PERMISO).size).toBe(55);
  });

  it('cada acción tiene ámbito y el mapa no tiene sobrantes ni faltantes', () => {
    const acciones = Object.keys(AMBITO_POR_ACCION);

    expect(acciones).toHaveLength(55);
    expect(new Set(acciones)).toEqual(new Set(ACCIONES_PERMISO));

    for (const accion of ACCIONES_PERMISO) {
      expect(AMBITOS_PERMISO).toContain(AMBITO_POR_ACCION[accion]);
    }
  });

  it('reparte los ámbitos en 32 de proyecto, 7 propios y 16 globales', () => {
    const ambitos = ACCIONES_PERMISO.map((accion) => AMBITO_POR_ACCION[accion]);

    expect(ambitos.filter((ambito) => ambito === 'PROYECTO')).toHaveLength(32);
    expect(ambitos.filter((ambito) => ambito === 'PROPIO')).toHaveLength(7);
    expect(ambitos.filter((ambito) => ambito === 'GLOBAL')).toHaveLength(16);
  });

  it('define seis códigos de denegación sin repetidos', () => {
    expect(CODIGOS_DENEGACION).toHaveLength(6);
    expect(new Set(CODIGOS_DENEGACION).size).toBe(6);
  });
});

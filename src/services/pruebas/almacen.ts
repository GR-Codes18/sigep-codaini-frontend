/**
 * Ayudas de prueba para `services/` sobre el entorno de prueba. **Solo las importan los tests.**
 *
 * `prepararPrueba` suma al entorno de prueba tres atajos: leer los datos vigentes, modificarlos
 * directamente (para armar un caso) y comprobar que una operación fallida no escribió nada.
 */

import type { CambiosAlmacen, DatosAlmacen } from '@/data';
import { expect } from 'vitest';
import { crearEntornoDePrueba } from './entorno';

export function prepararPrueba(opciones: Parameters<typeof crearEntornoDePrueba>[0] = {}) {
  const prueba = crearEntornoDePrueba(opciones);
  const datos = () => prueba.almacen.getState().datos;
  const modificar = (operacion: (d: DatosAlmacen) => CambiosAlmacen) =>
    prueba.almacen.getState().transaccion(operacion);
  return { ...prueba, datos, modificar };
}

export type PruebaPreparada = ReturnType<typeof prepararPrueba>;

/**
 * Llámala **antes** de la operación; el resultado se llama **después** y comprueba que ni los datos ni
 * el almacenamiento del navegador cambiaron.
 */
export function sinEscritura(prueba: PruebaPreparada) {
  const datosAntes = prueba.datos();
  const escriturasAntes = prueba.escrituras();
  return () => {
    expect(prueba.datos()).toBe(datosAntes);
    expect(prueba.escrituras()).toBe(escriturasAntes);
  };
}

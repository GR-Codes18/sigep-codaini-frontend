/**
 * Entorno de prueba para `services/`. **Solo lo importan los tests.**
 *
 * Almacén en memoria con la semilla real, reloj controlable, IDs secuenciales (`evt-t001`) y
 * demora 0. Cuenta las escrituras que llegan al «navegador» para comprobar que una operación
 * fallida no escribe nada.
 */

import type { StateStorage } from 'zustand/middleware';
import { crearAlmacen } from '@/data';
import { crearSemilla } from '@/data/semilla';
import type { Entorno } from '../entorno';
import { GITHUB_SIMULADO, type PuertoGitHub } from '../github';

export const AHORA_DE_PRUEBA = new Date('2026-11-17T18:30:00.000Z');

export function crearEntornoDePrueba(opciones: { demoraMs?: number; github?: PuertoGitHub } = {}) {
  let escrituras = 0;
  const valores = new Map<string, string>();
  const memoria: StateStorage = {
    getItem: (clave) => valores.get(clave) ?? null,
    setItem: (clave, valor) => {
      escrituras += 1;
      valores.set(clave, valor);
    },
    removeItem: (clave) => {
      valores.delete(clave);
    },
  };
  const almacen = crearAlmacen({
    crearSemilla: (ahora) => crearSemilla(ahora ?? AHORA_DE_PRUEBA),
    almacenamiento: () => memoria,
  });

  let actual = AHORA_DE_PRUEBA;
  let contador = 0;
  const entorno: Entorno = {
    almacen,
    ahora: () => actual,
    generarId: (prefijo) => `${prefijo}-t${String(++contador).padStart(3, '0')}`,
    demoraMs: opciones.demoraMs ?? 0,
    github: opciones.github ?? GITHUB_SIMULADO,
  };

  return {
    entorno,
    almacen,
    /** Escrituras que llegaron al almacenamiento del navegador. */
    escrituras: () => escrituras,
    /** Mueve el reloj del entorno. */
    fijarAhora: (fecha: Date) => {
      actual = fecha;
    },
  };
}

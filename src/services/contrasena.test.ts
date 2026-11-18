import { describe, expect, it } from 'vitest';
import {
  ALFABETO_CONTRASENA,
  LONGITUD_CONTRASENA_TEMPORAL,
  generarContrasenaTemporal,
} from './contrasena';

describe('generarContrasenaTemporal', () => {
  it('tiene 10 caracteres (más que el mínimo de 8) del alfabeto sin ambiguos', () => {
    const contrasena = generarContrasenaTemporal();
    expect(contrasena).toHaveLength(LONGITUD_CONTRASENA_TEMPORAL);
    expect(LONGITUD_CONTRASENA_TEMPORAL).toBeGreaterThanOrEqual(8);
    for (const caracter of contrasena) expect(ALFABETO_CONTRASENA).toContain(caracter);
    expect(ALFABETO_CONTRASENA).not.toMatch(/[01OlI]/);
  });

  it('no se repite entre llamadas', () => {
    const todas = new Set(Array.from({ length: 50 }, () => generarContrasenaTemporal()));
    expect(todas.size).toBe(50);
  });

  it('con una fuente fija da siempre lo mismo', () => {
    const fuente = () => new Uint8Array(20).fill(3);
    expect(generarContrasenaTemporal(fuente)).toBe(ALFABETO_CONTRASENA[3].repeat(10));
  });

  it('descarta los bytes que sesgarían el resultado', () => {
    const limite = 256 - (256 % ALFABETO_CONTRASENA.length);
    let llamadas = 0;
    const fuente = () => {
      llamadas += 1;
      // Primero bytes por encima del límite (se descartan) y luego válidos.
      return llamadas === 1 ? new Uint8Array(20).fill(limite) : new Uint8Array(20).fill(0);
    };
    expect(generarContrasenaTemporal(fuente)).toBe(ALFABETO_CONTRASENA[0].repeat(10));
    expect(llamadas).toBe(2);
  });
});

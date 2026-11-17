import { describe, expect, it } from 'vitest';
import { crearMarca } from './marca';

describe('marca de tiempo', () => {
  it('ahora es ISO 8601 en UTC con Z', () => {
    const marca = crearMarca(new Date('2026-11-17T18:30:00.123Z'));
    expect(marca.ahora).toBe('2026-11-17T18:30:00.123Z');
    expect(marca.ahora).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('hoy se corta en la hora de Perú (UTC−5)', () => {
    expect(crearMarca(new Date('2026-11-17T18:30:00.000Z')).hoy).toBe('2026-11-17');
    // 02:59 UTC es todavía el día anterior en Perú; 05:00 UTC ya es el día nuevo.
    expect(crearMarca(new Date('2026-11-18T02:59:59.999Z')).hoy).toBe('2026-11-17');
    expect(crearMarca(new Date('2026-11-18T05:00:00.000Z')).hoy).toBe('2026-11-18');
    // Cambio de año y 29 de febrero.
    expect(crearMarca(new Date('2027-01-01T04:59:00.000Z')).hoy).toBe('2026-12-31');
    expect(crearMarca(new Date('2028-03-01T04:00:00.000Z')).hoy).toBe('2028-02-29');
  });

  it('una fecha inválida lanza en vez de producir una marca rota', () => {
    expect(() => crearMarca(new Date('no es una fecha'))).toThrow(RangeError);
  });

  it('el mismo objeto da el mismo instante a todo lo que lo use', () => {
    const marca = crearMarca(new Date('2026-11-17T18:30:00.000Z'));
    const fechaTermino = marca.ahora;
    const fechaEvento = marca.ahora;
    expect(fechaTermino).toBe(fechaEvento);
  });
});

import { describe, expect, it } from 'vitest';
import { useAlmacen } from '@/data';
import { DEMORA_PREDETERMINADA_MS, ENTORNO, crearEntorno } from './entorno';

describe('entorno por defecto', () => {
  it('usa el almacén de la aplicación y una demora de 600 ms', () => {
    expect(ENTORNO.almacen).toBe(useAlmacen);
    expect(DEMORA_PREDETERMINADA_MS).toBe(600);
    expect(ENTORNO.demoraMs).toBe(600);
  });

  it('el reloj devuelve una fecha real', () => {
    expect(ENTORNO.ahora()).toBeInstanceOf(Date);
    expect(Math.abs(ENTORNO.ahora().getTime() - Date.now())).toBeLessThan(1000);
  });

  it('los IDs llevan el prefijo y no se repiten', () => {
    const a = ENTORNO.generarId('evt');
    const b = ENTORNO.generarId('evt');
    expect(a).toMatch(/^evt-[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
    expect(ENTORNO.generarId('ntf')).toMatch(/^ntf-/);
  });
});

describe('crearEntorno', () => {
  it('cambia solo lo que se pide', () => {
    const reloj = () => new Date('2026-01-01T00:00:00.000Z');
    const entorno = crearEntorno({ demoraMs: 0, ahora: reloj });
    expect(entorno.demoraMs).toBe(0);
    expect(entorno.ahora).toBe(reloj);
    expect(entorno.almacen).toBe(ENTORNO.almacen);
    expect(entorno.generarId).toBe(ENTORNO.generarId);
  });

  it('no modifica el entorno por defecto', () => {
    crearEntorno({ demoraMs: 0 });
    expect(ENTORNO.demoraMs).toBe(600);
  });
});

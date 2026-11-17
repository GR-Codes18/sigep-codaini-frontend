import { describe, expect, it } from 'vitest';
import { crearSemilla } from '@/data/semilla';
import { obtenerActor } from './actor';

describe('obtenerActor', () => {
  const datos = crearSemilla(new Date('2026-11-17T18:30:00.000Z'));

  it('devuelve el usuario completo (con su rol y estado vigentes)', () => {
    const resultado = obtenerActor(datos, 'demo-supervisor');
    expect(resultado.ok && resultado.valor).toMatchObject({
      id: 'demo-supervisor',
      rol: 'SUPERVISOR',
      estado: 'ACTIVO',
    });
  });

  it('si la cuenta no existe devuelve NO_ENCONTRADO con un mensaje legible', () => {
    const resultado = obtenerActor(datos, 'no-existe');
    expect(resultado).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    expect(!resultado.ok && resultado.mensaje).toMatch(/cuenta/);
  });
});

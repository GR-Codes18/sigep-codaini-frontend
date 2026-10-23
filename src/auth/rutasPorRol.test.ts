import { describe, expect, it } from 'vitest';
import { puedeVerRuta } from './rutasPorRol';

describe('puedeVerRuta', () => {
  it('permite las rutas del propio panel', () => {
    expect(puedeVerRuta('PRACTICANTE', '/practicante/inicio')).toBe(true);
    expect(puedeVerRuta('ADMINISTRADOR', '/administrador/postulaciones')).toBe(true);
  });

  it('bloquea las rutas de otro panel', () => {
    expect(puedeVerRuta('PRACTICANTE', '/administrador/dashboard')).toBe(false);
    expect(puedeVerRuta('SUPERVISOR', '/practicante/inicio')).toBe(false);
  });

  it('no se deja engañar por prefijos parecidos', () => {
    expect(puedeVerRuta('PRACTICANTE', '/practicante-falso/inicio')).toBe(false);
  });
});
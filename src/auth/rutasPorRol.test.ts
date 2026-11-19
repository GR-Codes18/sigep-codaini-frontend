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

  it('el módulo de Postulaciones y sus páginas son solo del Administrador', () => {
    for (const ruta of [
      '/administrador/postulaciones',
      '/administrador/postulaciones/pos-25',
      '/administrador/postulaciones/criterios',
    ]) {
      expect(puedeVerRuta('ADMINISTRADOR', ruta), ruta).toBe(true);
      expect(puedeVerRuta('SUPERVISOR', ruta), ruta).toBe(false);
      expect(puedeVerRuta('PRACTICANTE', ruta), ruta).toBe(false);
    }
  });
});

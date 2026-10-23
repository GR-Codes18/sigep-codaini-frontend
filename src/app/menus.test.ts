import { describe, expect, it } from 'vitest';
import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';
import { MENU_POR_ROL, etiquetaDeRuta } from './menus';

const total = (rol: keyof typeof MENU_POR_ROL) =>
  MENU_POR_ROL[rol].flatMap((g) => g.items).length;

describe('menús por rol', () => {
  it('tienen 9, 5 y 3 módulos', () => {
    expect(total('ADMINISTRADOR')).toBe(9);
    expect(total('SUPERVISOR')).toBe(5);
    expect(total('PRACTICANTE')).toBe(3);
  });

  it('cada ruta pertenece al panel de su rol', () => {
    for (const rol of Object.keys(MENU_POR_ROL) as (keyof typeof MENU_POR_ROL)[]) {
      for (const item of MENU_POR_ROL[rol].flatMap((g) => g.items)) {
        expect(item.ruta.startsWith(`${PREFIJO_POR_ROL[rol]}/`)).toBe(true);
      }
    }
  });

  it('resuelve la etiqueta de una ruta y del perfil', () => {
    expect(etiquetaDeRuta('ADMINISTRADOR', '/administrador/postulaciones')).toBe('Postulaciones');
    expect(etiquetaDeRuta('PRACTICANTE', '/practicante/perfil')).toBe('Mi perfil');
  });
});
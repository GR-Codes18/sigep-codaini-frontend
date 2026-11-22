import { describe, expect, it } from 'vitest';
import { ROLES } from './enumeraciones';
import { camposDelPerfil, CAMPOS_DEL_PERFIL, type CampoDelPerfil } from './perfil';
import { usuario } from './pruebas/fabricas';

const nombres = (campos: ReturnType<typeof camposDelPerfil>) => campos.map((c) => c.campo);
const editables = (campos: ReturnType<typeof camposDelPerfil>) =>
  campos.filter((c) => c.editable).map((c) => c.campo);

describe('camposDelPerfil', () => {
  it('el Practicante tiene los seis campos y los edita todos', () => {
    const campos = camposDelPerfil(usuario('PRACTICANTE'));

    expect(nombres(campos)).toEqual([...CAMPOS_DEL_PERFIL]);
    expect(editables(campos)).toEqual([...CAMPOS_DEL_PERFIL]);
  });

  it('el Supervisor ve nombre y correo en solo lectura y edita celular, Discord y GitHub', () => {
    const campos = camposDelPerfil(usuario('SUPERVISOR'));

    expect(nombres(campos)).toEqual(['nombre', 'correo', 'celular', 'discord', 'cuenta_github']);
    expect(editables(campos)).toEqual(['celular', 'discord', 'cuenta_github']);
  });

  it('el Administrador solo tiene nombre, correo y celular, y los edita', () => {
    const campos = camposDelPerfil(usuario('ADMINISTRADOR'));

    expect(nombres(campos)).toEqual(['nombre', 'correo', 'celular']);
    expect(editables(campos)).toEqual(['nombre', 'correo', 'celular']);
  });

  it('a nadie le sobran campos que su rol no tiene (Discord, GitHub y disponibilidad no existen para el Administrador)', () => {
    const admin = nombres(camposDelPerfil(usuario('ADMINISTRADOR')));
    for (const campo of [
      'discord',
      'cuenta_github',
      'disponibilidad_horaria',
    ] as CampoDelPerfil[]) {
      expect(admin).not.toContain(campo);
    }
    expect(nombres(camposDelPerfil(usuario('SUPERVISOR')))).not.toContain('disponibilidad_horaria');
  });

  it.each(ROLES)('un usuario INACTIVO (%s) conserva sus campos, pero no edita ninguno', (rol) => {
    const campos = camposDelPerfil(usuario(rol, { estado: 'INACTIVO' }));

    expect(campos.length).toBeGreaterThan(0);
    expect(editables(campos)).toEqual([]);
  });

  it('cada campo sale una sola vez y siempre en el orden de la lista', () => {
    for (const rol of ROLES) {
      const dados = nombres(camposDelPerfil(usuario(rol)));
      expect(new Set(dados).size).toBe(dados.length);
      expect(dados).toEqual(CAMPOS_DEL_PERFIL.filter((c) => dados.includes(c)));
    }
  });

  it('no modifica al usuario', () => {
    const persona = usuario('SUPERVISOR');
    const copia = structuredClone(persona);

    camposDelPerfil(persona);

    expect(persona).toEqual(copia);
  });
});

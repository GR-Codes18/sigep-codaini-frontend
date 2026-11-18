import { describe, expect, it } from 'vitest';
import type { Rol } from './enumeraciones';
import { puede } from './permisos';
import { usuario } from './pruebas/fabricas';
import { reactivarPractica, reactivarSupervisor } from './reactivacion';

const ROLES: Rol[] = ['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'];

const finalizado = () => usuario('PRACTICANTE', { estado: 'INACTIVO' });
const inactivo = () => usuario('SUPERVISOR', { estado: 'INACTIVO' });

describe('reactivarPractica', () => {
  it('el Administrador reactiva a un practicante finalizado y se le pide una nota', () => {
    const r = reactivarPractica(usuario('ADMINISTRADOR'), finalizado());
    expect(r).toEqual({ ok: true, exige_texto: 'NOTA' });
  });

  it('con la nota escrita queda permitida', () => {
    expect(reactivarPractica(usuario('ADMINISTRADOR'), finalizado(), { nota: 'Vuelve.' })).toEqual({
      ok: true,
      exige_texto: 'NOTA',
    });
  });

  it.each([
    ['vacía', ''],
    ['de solo espacios', '   \n'],
  ])('una nota %s → TEXTO_OBLIGATORIO', (_caso, nota) => {
    expect(reactivarPractica(usuario('ADMINISTRADOR'), finalizado(), { nota })).toEqual({
      ok: false,
      codigo: 'TEXTO_OBLIGATORIO',
    });
  });

  it.each(ROLES.filter((r) => r !== 'ADMINISTRADOR'))('el rol %s → ROL_NO_PERMITIDO', (rol) => {
    expect(reactivarPractica(usuario(rol), finalizado())).toEqual({
      ok: false,
      codigo: 'ROL_NO_PERMITIDO',
    });
  });

  it('un Administrador INACTIVO → USUARIO_INACTIVO', () => {
    const admin = usuario('ADMINISTRADOR', { estado: 'INACTIVO' });
    expect(reactivarPractica(admin, finalizado())).toEqual({
      ok: false,
      codigo: 'USUARIO_INACTIVO',
    });
  });

  it.each([
    ['un supervisor', () => usuario('SUPERVISOR', { estado: 'INACTIVO' })],
    ['un administrador', () => usuario('ADMINISTRADOR', { estado: 'INACTIVO', id: 'otro' })],
  ])(
    'si la persona es %s → FUERA_DE_ALCANCE (la acción es solo de practicantes)',
    (_caso, crear) => {
      expect(reactivarPractica(usuario('ADMINISTRADOR'), crear())).toEqual({
        ok: false,
        codigo: 'FUERA_DE_ALCANCE',
      });
    },
  );

  it('un practicante que sigue activo → PRACTICANTE_NO_FINALIZADO, con su mensaje', () => {
    const r = reactivarPractica(usuario('ADMINISTRADOR'), usuario('PRACTICANTE'));
    expect(r).toMatchObject({ ok: false, codigo: 'PRACTICANTE_NO_FINALIZADO' });
    expect(!r.ok && r.mensaje).toContain('práctica finalizada');
  });

  it('el orden: permiso → estado → texto', () => {
    // Sin permiso gana sobre el estado; con permiso, el estado gana sobre el texto.
    expect(reactivarPractica(usuario('SUPERVISOR'), usuario('PRACTICANTE'), { nota: '' })).toEqual({
      ok: false,
      codigo: 'ROL_NO_PERMITIDO',
    });
    expect(
      reactivarPractica(usuario('ADMINISTRADOR'), usuario('PRACTICANTE'), { nota: '' }),
    ).toMatchObject({ ok: false, codigo: 'PRACTICANTE_NO_FINALIZADO' });
  });

  it('exige el mismo texto que dice la matriz de permisos', () => {
    const permiso = puede(usuario('ADMINISTRADOR'), 'REACTIVAR_PRACTICA', {
      usuario_objetivo: finalizado(),
    });
    expect(permiso).toEqual({ permitido: true, exige_texto: 'NOTA' });
  });

  it('no modifica las personas', () => {
    const admin = usuario('ADMINISTRADOR');
    const objetivo = finalizado();
    const copias = structuredClone([admin, objetivo]);
    reactivarPractica(admin, objetivo, { nota: 'x' });
    expect([admin, objetivo]).toEqual(copias);
  });
});

describe('reactivarSupervisor', () => {
  it('el Administrador reactiva a un supervisor inactivo, sin texto', () => {
    expect(reactivarSupervisor(usuario('ADMINISTRADOR'), inactivo())).toEqual({
      ok: true,
      exige_texto: null,
    });
  });

  it.each(ROLES.filter((r) => r !== 'ADMINISTRADOR'))('el rol %s → ROL_NO_PERMITIDO', (rol) => {
    expect(reactivarSupervisor(usuario(rol), inactivo())).toEqual({
      ok: false,
      codigo: 'ROL_NO_PERMITIDO',
    });
  });

  it('un Administrador INACTIVO → USUARIO_INACTIVO', () => {
    const admin = usuario('ADMINISTRADOR', { estado: 'INACTIVO' });
    expect(reactivarSupervisor(admin, inactivo())).toEqual({
      ok: false,
      codigo: 'USUARIO_INACTIVO',
    });
  });

  it('si la persona no es un supervisor → FUERA_DE_ALCANCE', () => {
    expect(reactivarSupervisor(usuario('ADMINISTRADOR'), finalizado())).toEqual({
      ok: false,
      codigo: 'FUERA_DE_ALCANCE',
    });
  });

  it('un supervisor que ya está activo → SUPERVISOR_YA_ACTIVO, con su mensaje', () => {
    const r = reactivarSupervisor(usuario('ADMINISTRADOR'), usuario('SUPERVISOR'));
    expect(r).toMatchObject({ ok: false, codigo: 'SUPERVISOR_YA_ACTIVO' });
    expect(!r.ok && r.mensaje).toContain('supervisor inactivo');
  });
});

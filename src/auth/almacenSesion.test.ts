import { beforeEach, describe, expect, it } from 'vitest';
import { accesoRapido } from './iniciarSesion';
import { useAlmacenSesion } from './almacenSesion';

describe('almacenSesion', () => {
  beforeEach(() => {
    localStorage.clear();
    useAlmacenSesion.setState({ usuario: null });
  });

  it('empieza sin sesión', () => {
    expect(useAlmacenSesion.getState().usuario).toBeNull();
  });

  it('abre y cierra sesión, y lo persiste', () => {
    useAlmacenSesion.getState().abrirSesion(accesoRapido('SUPERVISOR'));
    expect(useAlmacenSesion.getState().usuario?.rol).toBe('SUPERVISOR');
    expect(localStorage.getItem('sigep-sesion')).toContain('SUPERVISOR');

    useAlmacenSesion.getState().cerrarSesion();
    expect(useAlmacenSesion.getState().usuario).toBeNull();
  });

  it('ignora una sesión corrupta (JSON roto) sin romper', async () => {
    localStorage.setItem('sigep-sesion', '{esto no es json');
    await useAlmacenSesion.persist.rehydrate();
    expect(useAlmacenSesion.getState().usuario).toBeNull();
  });

  it('ignora una sesión con forma inválida (rol inventado)', async () => {
    localStorage.setItem(
      'sigep-sesion',
      JSON.stringify({
        state: {
          usuario: {
            id: 'x',
            nombre: 'X',
            correo: 'x',
            rol: 'ROOT',
            debe_cambiar_contrasena: false,
          },
        },
        version: 0,
      }),
    );
    await useAlmacenSesion.persist.rehydrate();
    expect(useAlmacenSesion.getState().usuario).toBeNull();
  });

  it('recupera una sesión válida guardada', async () => {
    const usuario = accesoRapido('PRACTICANTE');
    localStorage.setItem('sigep-sesion', JSON.stringify({ state: { usuario }, version: 0 }));
    await useAlmacenSesion.persist.rehydrate();
    expect(useAlmacenSesion.getState().usuario?.rol).toBe('PRACTICANTE');
  });
});

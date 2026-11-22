import { beforeEach, describe, expect, it } from 'vitest';
import { sesionDePrueba } from './sesionDePrueba';
import { useAlmacenSesion } from './almacenSesion';
import { accesoRapido, crearEntorno } from '@/services';

describe('almacenSesion', () => {
  const entorno = crearEntorno({ demoraMs: 0 });

  beforeEach(() => {
    localStorage.clear();
    useAlmacenSesion.setState({ usuario: null });
  });

  it('empieza sin sesión', () => {
    expect(useAlmacenSesion.getState().usuario).toBeNull();
  });

  it('abre y cierra sesión, y lo persiste', async () => {
    const resultado = await accesoRapido({ rol: 'SUPERVISOR' }, entorno);
    if (!resultado.ok) throw new Error(resultado.mensaje);
    useAlmacenSesion.getState().abrirSesion(resultado.valor);
    expect(useAlmacenSesion.getState().usuario?.rol).toBe('SUPERVISOR');
    const guardado = JSON.parse(localStorage.getItem('sigep-sesion') ?? '{}') as {
      state?: { usuario?: Record<string, unknown> };
    };
    expect(guardado.state?.usuario?.rol).toBe('SUPERVISOR');
    expect(guardado.state?.usuario).not.toHaveProperty('contrasena');

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
    const usuario = sesionDePrueba('PRACTICANTE');
    localStorage.setItem('sigep-sesion', JSON.stringify({ state: { usuario }, version: 0 }));
    await useAlmacenSesion.persist.rehydrate();
    expect(useAlmacenSesion.getState().usuario?.rol).toBe('PRACTICANTE');
    expect(useAlmacenSesion.getState().usuario).not.toHaveProperty('contrasena');
  });
});

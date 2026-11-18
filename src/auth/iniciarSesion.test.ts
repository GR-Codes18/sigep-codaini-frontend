import { describe, expect, it } from 'vitest';
import { accesoRapido, iniciarSesion } from './iniciarSesion';
import { crearEntornoDePrueba } from '@/services/pruebas/entorno';

describe('iniciarSesion', () => {
  it('acepta credenciales de la semilla y no devuelve la contraseña', async () => {
    const { entorno } = crearEntornoDePrueba();
    const r = await iniciarSesion('admin@codaini.demo', 'demo12345', entorno);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.usuario.rol).toBe('ADMINISTRADOR');
      expect(r.usuario).not.toHaveProperty('contrasena');
    }
  });

  it('ignora mayúsculas y espacios en el correo', async () => {
    const { entorno } = crearEntornoDePrueba();
    expect((await iniciarSesion('  Admin@CODAINI.demo ', 'demo12345', entorno)).ok).toBe(true);
  });

  it('rechaza contraseña errónea con mensaje genérico', async () => {
    const { entorno } = crearEntornoDePrueba();
    const r = await iniciarSesion('admin@codaini.demo', 'otra-clave', entorno);
    expect(r).toEqual({
      ok: false,
      codigo: 'CREDENCIALES_INVALIDAS',
      mensaje: 'Correo o contraseña incorrectos',
    });
  });

  it('da el mismo mensaje si el correo no existe', async () => {
    const { entorno } = crearEntornoDePrueba();
    const a = await iniciarSesion('nadie@codaini.demo', 'demo12345', entorno);
    const b = await iniciarSesion('admin@codaini.demo', 'mala', entorno);
    expect(a).toEqual(b);
  });

  it('rechaza campos vacíos con el mensaje genérico', async () => {
    const { entorno } = crearEntornoDePrueba();
    expect(await iniciarSesion('', '', entorno)).toEqual({
      ok: false,
      codigo: 'CREDENCIALES_INVALIDAS',
      mensaje: 'Correo o contraseña incorrectos',
    });
  });
});

describe('accesoRapido', () => {
  it.each([
    ['ADMINISTRADOR', 'demo-admin'],
    ['SUPERVISOR', 'demo-supervisor'],
    ['PRACTICANTE', 'demo-practicante'],
  ] as const)('devuelve la cuenta sembrada para %s', async (rol, id) => {
    const { entorno } = crearEntornoDePrueba();
    const resultado = await accesoRapido(rol, entorno);
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      const u = resultado.usuario;
      expect(u.id).toBe(id);
      expect(u.rol).toBe(rol);
      expect(u).not.toHaveProperty('contrasena');
    }
  });
});

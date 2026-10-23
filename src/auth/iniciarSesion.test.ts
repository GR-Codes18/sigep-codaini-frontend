import { describe, expect, it } from 'vitest';
import { accesoRapido, iniciarSesion } from './iniciarSesion';

describe('iniciarSesion', () => {
  it('acepta credenciales correctas y no devuelve la contraseña', () => {
    const r = iniciarSesion('admin@codaini.demo', 'demo12345');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.usuario.rol).toBe('ADMINISTRADOR');
      expect(r.usuario).not.toHaveProperty('contrasena');
    }
  });

  it('ignora mayúsculas y espacios en el correo', () => {
    expect(iniciarSesion('  Admin@CODAINI.demo ', 'demo12345').ok).toBe(true);
  });

  it('rechaza contraseña errónea con mensaje genérico', () => {
    const r = iniciarSesion('admin@codaini.demo', 'otra-clave');
    expect(r).toEqual({
      ok: false,
      codigo: 'CREDENCIALES_INVALIDAS',
      mensaje: 'Correo o contraseña incorrectos',
    });
  });

  it('da el mismo mensaje si el correo no existe', () => {
    const a = iniciarSesion('nadie@codaini.demo', 'demo12345');
    const b = iniciarSesion('admin@codaini.demo', 'mala');
    expect(a).toEqual(b);
  });

  it('rechaza campos vacíos', () => {
    expect(iniciarSesion('', '').ok).toBe(false);
  });
});

describe('accesoRapido', () => {
  it.each(['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'] as const)(
    'devuelve la cuenta de %s',
    (rol) => {
      const u = accesoRapido(rol);
      expect(u.rol).toBe(rol);
      expect(u).not.toHaveProperty('contrasena');
    },
  );
});

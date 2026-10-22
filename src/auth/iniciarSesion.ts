import { CUENTAS_DEMO, type CuentaDemo } from './usuariosDemo';
import type { Rol, UsuarioSesion } from './tipos';

export type ResultadoAcceso =
  | { ok: true; usuario: UsuarioSesion }
  | { ok: false; codigo: 'CREDENCIALES_INVALIDAS'; mensaje: string };

const MENSAJE_GENERICO = 'Correo o contraseña incorrectos';

// Quita la contraseña: la sesión nunca debe guardarla.
function aUsuarioSesion(cuenta: CuentaDemo): UsuarioSesion {
  const { contrasena: _contrasena, ...usuario } = cuenta;
  return usuario;
}

export function iniciarSesion(correo: string, contrasena: string): ResultadoAcceso {
  const correoNormalizado = correo.trim().toLowerCase();
  const cuenta = Object.values(CUENTAS_DEMO).find((c) => c.correo === correoNormalizado);

  // Mismo mensaje si falla el correo o la contraseña: no se revela cuál falló.
  if (!cuenta || cuenta.contrasena !== contrasena) {
    return { ok: false, codigo: 'CREDENCIALES_INVALIDAS', mensaje: MENSAJE_GENERICO };
  }
  return { ok: true, usuario: aUsuarioSesion(cuenta) };
}

export function accesoRapido(rol: Rol): UsuarioSesion {
  return aUsuarioSesion(CUENTAS_DEMO[rol]);
}

import type { Entorno } from '@/services';
import { autenticarUsuario, ENTORNO, obtenerUsuarioDeAccesoRapido } from '@/services';
import type { Rol, UsuarioSesion } from './tipos';
import { IDS_ACCESO_RAPIDO } from './usuariosDemo';

export type ResultadoAcceso =
  { ok: true; usuario: UsuarioSesion } | { ok: false; codigo: string; mensaje: string };

function comoResultadoAcceso(
  resultado: Awaited<ReturnType<typeof autenticarUsuario>>,
): ResultadoAcceso {
  return resultado.ok
    ? { ok: true, usuario: resultado.valor }
    : { ok: false, codigo: resultado.codigo, mensaje: resultado.mensaje };
}

export async function iniciarSesion(
  correo: string,
  contrasena: string,
  entorno: Entorno = ENTORNO,
): Promise<ResultadoAcceso> {
  return comoResultadoAcceso(await autenticarUsuario(correo, contrasena, entorno));
}

export async function accesoRapido(rol: Rol, entorno: Entorno = ENTORNO): Promise<ResultadoAcceso> {
  return comoResultadoAcceso(
    await obtenerUsuarioDeAccesoRapido(IDS_ACCESO_RAPIDO[rol], rol, entorno),
  );
}

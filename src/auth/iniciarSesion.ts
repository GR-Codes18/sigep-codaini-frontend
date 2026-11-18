import type { Entorno } from '@/services';
import { autenticarUsuario, ENTORNO, obtenerUsuarioDeAccesoRapido } from '@/services';
import { ID_ADMIN, ID_PRACTICANTE_DEMO, ID_SUPERVISOR_DEMO } from '@/data';
import type { Rol, UsuarioSesion } from './tipos';

export type ResultadoAcceso =
  { ok: true; usuario: UsuarioSesion } | { ok: false; codigo: string; mensaje: string };

type ResultadoServicioAcceso = Awaited<ReturnType<typeof autenticarUsuario>>;

function comoResultadoAcceso(resultado: ResultadoServicioAcceso): ResultadoAcceso {
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
  const ids = {
    ADMINISTRADOR: ID_ADMIN,
    SUPERVISOR: ID_SUPERVISOR_DEMO,
    PRACTICANTE: ID_PRACTICANTE_DEMO,
  } satisfies Record<Rol, string>;
  return comoResultadoAcceso(await obtenerUsuarioDeAccesoRapido(ids[rol], rol, entorno));
}

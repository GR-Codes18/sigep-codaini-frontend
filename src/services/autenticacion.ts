import { z } from 'zod';
import type { Id, Rol, Usuario } from '@/domain';
import { ENTORNO, type Entorno } from './entorno';
import { simularDemora } from './demora';
import { fallo, type Resultado, validarEntrada } from './resultado';

const esquemaCredenciales = z.object({
  correo: z
    .string()
    .trim()
    .pipe(z.email())
    .transform((correo) => correo.toLowerCase()),
  contrasena: z.string().min(1),
});

export type UsuarioAutenticado = Pick<
  Usuario,
  'id' | 'nombre' | 'correo' | 'rol' | 'debe_cambiar_contrasena'
>;

const MENSAJE_ACCESO_INESPERADO = 'SIGEP: no se pudo completar la autenticación.';

function aUsuarioAutenticado(usuario: Usuario): UsuarioAutenticado {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    debe_cambiar_contrasena: usuario.debe_cambiar_contrasena,
  };
}

async function esperarDemora(entorno: Entorno): Promise<boolean> {
  try {
    await simularDemora(entorno.demoraMs);
    return true;
  } catch (error) {
    console.error(MENSAJE_ACCESO_INESPERADO, error);
    return false;
  }
}

export async function autenticarUsuario(
  correo: string,
  contrasena: string,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<UsuarioAutenticado>> {
  if (!(await esperarDemora(entorno))) return fallo('ERROR_INESPERADO');

  const entrada = validarEntrada(esquemaCredenciales, { correo, contrasena });
  if (!entrada.ok) return fallo('CREDENCIALES_INVALIDAS');

  const usuario = entorno.almacen
    .getState()
    .datos.usuarios.find((u) => u.correo.toLowerCase() === entrada.valor.correo);

  if (
    usuario === undefined ||
    usuario.estado !== 'ACTIVO' ||
    usuario.contrasena !== entrada.valor.contrasena
  ) {
    return fallo('CREDENCIALES_INVALIDAS');
  }

  return { ok: true, valor: aUsuarioAutenticado(usuario) };
}

export async function obtenerUsuarioDeAccesoRapido(
  idUsuario: Id,
  rolEsperado: Rol,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<UsuarioAutenticado>> {
  if (!(await esperarDemora(entorno))) return fallo('ERROR_INESPERADO');

  const usuario = entorno.almacen.getState().datos.usuarios.find((u) => u.id === idUsuario);
  if (usuario === undefined || usuario.estado !== 'ACTIVO' || usuario.rol !== rolEsperado) {
    return fallo('ACCESO_RAPIDO_NO_DISPONIBLE');
  }

  return { ok: true, valor: aUsuarioAutenticado(usuario) };
}

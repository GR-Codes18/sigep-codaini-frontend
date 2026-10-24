import type { Rol } from './tipos';

export const PREFIJO_POR_ROL: Record<Rol, string> = {
  ADMINISTRADOR: '/administrador',
  SUPERVISOR: '/supervisor',
  PRACTICANTE: '/practicante',
};

export const INICIO_POR_ROL: Record<Rol, string> = {
  ADMINISTRADOR: '/administrador/dashboard',
  SUPERVISOR: '/supervisor/dashboard',
  PRACTICANTE: '/practicante/inicio',
};

export function puedeVerRuta(rol: Rol, ruta: string): boolean {
  const prefijo = PREFIJO_POR_ROL[rol];
  return ruta === prefijo || ruta.startsWith(`${prefijo}/`);
}

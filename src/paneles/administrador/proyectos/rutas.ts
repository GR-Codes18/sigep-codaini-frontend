import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';
import type { Rol } from '@/domain';

/** El módulo Proyectos y sus páginas; el Administrador controla su ciclo de vida (§5.4). */
export const RUTA_PROYECTOS = `${PREFIJO_POR_ROL.ADMINISTRADOR}/proyectos`;

/**
 * El detalle del proyecto lo comparten el Administrador y el Supervisor (§9.1.1: «igual que el Administrador»): cada uno
 * navega por las direcciones de su propio panel. Sin rol se usa el del Administrador.
 */
export const rutaDeProyectos = (rol: Rol = 'ADMINISTRADOR') => `${PREFIJO_POR_ROL[rol]}/proyectos`;

/** Las pestañas del detalle de un proyecto, en el parámetro `?pestana=` (permite enlazarlas). */
export const PESTANAS_DEL_PROYECTO = ['resumen', 'tablero', 'equipo'] as const;
export type PestanaDelProyecto = (typeof PESTANAS_DEL_PROYECTO)[number];

export const PESTANA_INICIAL: PestanaDelProyecto = 'resumen';

/** El detalle de una tarea dentro de su proyecto (§6.7): clic en una tarjeta del tablero. */
export const rutaDeDetalleDeTarea = (
  idProyecto: string,
  idTarea: string,
  rol: Rol = 'ADMINISTRADOR',
) => `${rutaDeProyectos(rol)}/${idProyecto}/tareas/${idTarea}`;

export function rutaDeDetalleDeProyecto(
  idProyecto: string,
  pestana?: PestanaDelProyecto,
  rol: Rol = 'ADMINISTRADOR',
): string {
  const base = `${rutaDeProyectos(rol)}/${idProyecto}`;
  return pestana === undefined || pestana === PESTANA_INICIAL ? base : `${base}?pestana=${pestana}`;
}

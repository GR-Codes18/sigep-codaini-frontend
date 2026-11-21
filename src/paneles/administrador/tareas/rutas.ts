import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';
import type { Rol } from '@/domain';

/** El módulo Tareas: la vista transversal de las tareas de todos los proyectos (§5.5). */
export const RUTA_TAREAS = `${PREFIJO_POR_ROL.ADMINISTRADOR}/tareas`;

/**
 * Tareas lo comparten el Administrador (§5.5) y el Supervisor (§9.1.3: «la misma vista, filtrada a sus proyectos»): cada
 * uno navega por las direcciones de su propio panel. Sin rol se usa el del Administrador.
 */
export const rutaDeTareas = (rol: Rol = 'ADMINISTRADOR') => `${PREFIJO_POR_ROL[rol]}/tareas`;

/** El detalle de una tarea, donde se ejecutan todas sus acciones (§6.7). */
export const rutaDeDetalleDeTareaGlobal = (idTarea: string, rol: Rol = 'ADMINISTRADOR') =>
  `${rutaDeTareas(rol)}/${idTarea}`;

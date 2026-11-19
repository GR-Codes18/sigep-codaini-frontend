import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';

/** El módulo Tareas: la vista transversal de las tareas de todos los proyectos (§5.5). */
export const RUTA_TAREAS = `${PREFIJO_POR_ROL.ADMINISTRADOR}/tareas`;

/** El detalle de una tarea, donde se ejecutan todas sus acciones (§6.7). */
export const rutaDeDetalleDeTareaGlobal = (idTarea: string) => `${RUTA_TAREAS}/${idTarea}`;

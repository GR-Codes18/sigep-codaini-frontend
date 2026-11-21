import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';

/** Mis proyectos, del Practicante (§9.2.1). El tablero y el detalle de tarea cuelgan de aquí. */
export const RUTA_MIS_PROYECTOS_PRACTICANTE = `${PREFIJO_POR_ROL.PRACTICANTE}/proyectos`;

/** El detalle de un proyecto vigente, con sus tres pestañas. */
export const rutaDeMiProyecto = (idProyecto: string) =>
  `${RUTA_MIS_PROYECTOS_PRACTICANTE}/${idProyecto}`;

/** El resumen mínimo, de solo lectura, de un proyecto que ya no es vigente (finalizado o «Ya no participas»). */
export const rutaDeProyectoAnterior = (idProyecto: string) =>
  `${RUTA_MIS_PROYECTOS_PRACTICANTE}/${idProyecto}/anterior`;

/**
 * Mi historial filtrado por un proyecto. Mi historial (7.2) todavía no existe: hasta entonces la dirección llega a una
 * página vacía, y el 7.2 tendrá que leer `?proyecto=`.
 */
export const rutaDeHistorialDelProyecto = (idProyecto: string) =>
  `${PREFIJO_POR_ROL.PRACTICANTE}/historial?proyecto=${idProyecto}`;

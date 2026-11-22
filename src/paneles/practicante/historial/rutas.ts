import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';

/** Mi historial, del Practicante (§9.2.2). Acepta `?proyecto=<id>` para filtrar por un proyecto suyo. */
export const RUTA_MI_HISTORIAL = `${PREFIJO_POR_ROL.PRACTICANTE}/historial`;

/** El parámetro de la dirección que filtra por proyecto. */
export const PARAMETRO_PROYECTO = 'proyecto';

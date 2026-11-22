import { RUTA_MIS_PROYECTOS_PRACTICANTE } from '../proyectos/rutas';

/**
 * Los enlaces de las tarjetas del Inicio (§9.2.3): las cuatro llevan a Mis proyectos, **sin filtro**. El Practicante no
 * tiene un módulo de Tareas y Mis proyectos no lee filtros; uno por tarjeta exigiría cambios en el módulo 7.1 y el id del
 * proyecto, que las tarjetas no traen. Queda anotado para la Fase 8.
 */
export const ENLACES_INICIO_PRACTICANTE = {
  enProgreso: RUTA_MIS_PROYECTOS_PRACTICANTE,
  devueltas: RUTA_MIS_PROYECTOS_PRACTICANTE,
  esperandoSupervision: RUTA_MIS_PROYECTOS_PRACTICANTE,
  disponibles: RUTA_MIS_PROYECTOS_PRACTICANTE,
} as const;

import { crearParametros } from './parametros';
import type { DatosAlmacen } from './tipos';

/**
 * PROVISIONAL (Fase 2, paso 1): solo los parámetros de configuración, sin
 * personas ni proyectos. El paso 2 la reemplaza por la semilla completa de la
 * sección 8 del plan, con fechas relativas a `ahora`.
 */
export function crearSemilla(ahora: Date = new Date()): DatosAlmacen {
  void ahora;
  return {
    usuarios: [],
    practicantes: [],
    supervisores: [],
    proyectos: [],
    enlaces_proyecto: [],
    asignaciones: [],
    tareas: [],
    postulantes: [],
    areas_tecnicas: [],
    especialidades: [],
    criterios: [],
    evaluaciones: [],
    detalles_evaluacion: [],
    historial: [],
    notificaciones: [],
    revisiones_insight: [],
    parametros: crearParametros(),
  };
}

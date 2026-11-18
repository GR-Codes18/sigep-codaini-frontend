/**
 * Forma de los datos que guarda el almacén: una colección por entidad de `domain/`.
 *
 * Los insights no se guardan (se calculan); solo se guarda su revisión. Los
 * parámetros de configuración tienen `id === clave`.
 */

import type {
  Asignacion,
  AreaTecnica,
  CriterioEvaluacion,
  EnlaceProyecto,
  Especialidad,
  EventoHistorial,
  InsightRevision,
  Notificacion,
  ParametroConfiguracion,
  Postulante,
  PostulacionEvaluacion,
  PostulacionEvaluacionDetalle,
  Practicante,
  Proyecto,
  Supervisor,
  Tarea,
  Usuario,
} from '@/domain';

export interface DatosAlmacen {
  usuarios: Usuario[];
  practicantes: Practicante[];
  supervisores: Supervisor[];
  proyectos: Proyecto[];
  enlaces_proyecto: EnlaceProyecto[];
  asignaciones: Asignacion[];
  tareas: Tarea[];
  postulantes: Postulante[];
  areas_tecnicas: AreaTecnica[];
  especialidades: Especialidad[];
  criterios: CriterioEvaluacion[];
  evaluaciones: PostulacionEvaluacion[];
  detalles_evaluacion: PostulacionEvaluacionDetalle[];
  historial: EventoHistorial[];
  notificaciones: Notificacion[];
  revisiones_insight: InsightRevision[];
  parametros: ParametroConfiguracion[];
}

export const COLECCIONES = [
  'usuarios',
  'practicantes',
  'supervisores',
  'proyectos',
  'enlaces_proyecto',
  'asignaciones',
  'tareas',
  'postulantes',
  'areas_tecnicas',
  'especialidades',
  'criterios',
  'evaluaciones',
  'detalles_evaluacion',
  'historial',
  'notificaciones',
  'revisiones_insight',
  'parametros',
] as const satisfies readonly (keyof DatosAlmacen)[];

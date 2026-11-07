/**
 * Postulantes, catálogos de evaluación y resultado de la evaluación simulada.
 */

import type { FechaHora, Id } from './comunes';
import type { BloqueCriterio, EstadoPostulacion, TipoCriterio } from './enumeraciones';

export interface ArchivoCV {
  nombre: string;
  url: string;
}

export interface Postulante {
  id: Id;
  nombre: string;
  correo: string;
  celular: string;
  id_area_tecnica: Id;
  id_especialidad: Id;
  fecha_postulacion: FechaHora;
  cv: ArchivoCV;
  estado: EstadoPostulacion;
}

export interface AreaTecnica {
  id: Id;
  nombre: string;
  activo: boolean;
}

export interface Especialidad {
  id: Id;
  id_area_tecnica: Id;
  nombre: string;
  activo: boolean;
}

export interface CriterioEvaluacion {
  id: Id;
  id_area_tecnica: Id;
  /** `null` = criterio general del área. */
  id_especialidad: Id | null;
  nombre: string;
  tipo: TipoCriterio;
  peso: number;
  obligatorio: boolean;
  activo: boolean;
}

export interface PostulacionEvaluacion {
  id: Id;
  id_postulante: Id;
  puntaje_area: number;
  puntaje_especialidad: number;
  puntaje_total: number;
  justificacion: string;
  requiere_revision_manual: boolean;
  fecha_evaluacion: FechaHora;
}

export interface PostulacionEvaluacionDetalle {
  id: Id;
  id_evaluacion: Id;
  id_criterio: Id;
  /** Se copia al evaluar; no se deriva de `id_criterio`. */
  bloque: BloqueCriterio;
  nombre_criterio: string;
  peso: number;
  cumplido: boolean;
  puntaje_obtenido: number;
  observacion: string | null;
}

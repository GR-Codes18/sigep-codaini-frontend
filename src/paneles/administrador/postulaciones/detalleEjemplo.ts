import type { PostulacionEvaluacionDetalle } from '@/domain';

// PROVISIONAL: se reemplaza por el cálculo de domain/ (Fase 1, paso 7) y por data/.
const d = (
  idEval: string,
  n: number,
  bloque: 'AREA' | 'ESPECIALIDAD',
  nombre: string,
  peso: number,
  cumplido: boolean,
): PostulacionEvaluacionDetalle => ({
  id: `${idEval}-d${n}`,
  id_evaluacion: idEval,
  id_criterio: `c-${n}`,
  bloque,
  nombre_criterio: nombre,
  peso,
  cumplido,
  puntaje_obtenido: cumplido ? peso : 0,
  observacion: cumplido ? null : 'No se evidencia en el CV.',
});

/** Mismo desglose para todas las evaluaciones de ejemplo (suma 100 por bloque). */
export function detallesDeEjemplo(idEvaluacion: string): PostulacionEvaluacionDetalle[] {
  return [
    d(idEvaluacion, 1, 'AREA', 'Nivel académico', 40, true),
    d(idEvaluacion, 2, 'AREA', 'Disponibilidad', 30, true),
    d(idEvaluacion, 3, 'AREA', 'Experiencia previa', 30, false),
    d(idEvaluacion, 4, 'ESPECIALIDAD', 'Tecnología principal', 50, true),
    d(idEvaluacion, 5, 'ESPECIALIDAD', 'Proyectos propios', 30, true),
    d(idEvaluacion, 6, 'ESPECIALIDAD', 'Palabra clave de la especialidad', 20, false),
  ];
}

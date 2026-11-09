import type { PostulacionEvaluacion, Postulante } from '@/domain';

export type PestanaPostulacion = 'pendientes' | 'revision' | 'aprobadas' | 'rechazadas' | 'todas';

export interface FilaPostulacion {
  postulante: Postulante;
  evaluacion: PostulacionEvaluacion | undefined;
}

export interface Filtros {
  pestana: PestanaPostulacion;
  busqueda: string;
  idArea: string;
  idEspecialidad: string;
  desde: string; // YYYY-MM-DD o ''
  hasta: string;
}

export function unirFilas(
  postulantes: Postulante[],
  evaluaciones: PostulacionEvaluacion[],
): FilaPostulacion[] {
  return postulantes.map((postulante) => ({
    postulante,
    evaluacion: evaluaciones.find((e) => e.id_postulante === postulante.id),
  }));
}

const enPestana = (f: FilaPostulacion, pestana: PestanaPostulacion): boolean => {
  switch (pestana) {
    case 'pendientes':
      return f.postulante.estado === 'PENDIENTE';
    case 'revision':
      return f.postulante.estado === 'PENDIENTE' && !!f.evaluacion?.requiere_revision_manual;
    case 'aprobadas':
      return f.postulante.estado === 'APROBADA';
    case 'rechazadas':
      return f.postulante.estado === 'RECHAZADA';
    default:
      return true;
  }
};

export function contarPorPestana(filas: FilaPostulacion[]): Record<PestanaPostulacion, number> {
  const pestanas: PestanaPostulacion[] = [
    'pendientes',
    'revision',
    'aprobadas',
    'rechazadas',
    'todas',
  ];
  return Object.fromEntries(
    pestanas.map((t) => [t, filas.filter((f) => enPestana(f, t)).length]),
  ) as Record<PestanaPostulacion, number>;
}

export function filtrarYOrdenar(filas: FilaPostulacion[], f: Filtros): FilaPostulacion[] {
  const q = f.busqueda.trim().toLowerCase();
  return filas
    .filter((x) => enPestana(x, f.pestana))
    .filter((x) => !f.idArea || x.postulante.id_area_tecnica === f.idArea)
    .filter((x) => !f.idEspecialidad || x.postulante.id_especialidad === f.idEspecialidad)
    .filter((x) => {
      const dia = x.postulante.fecha_postulacion.slice(0, 10);
      return (!f.desde || dia >= f.desde) && (!f.hasta || dia <= f.hasta);
    })
    .filter(
      (x) =>
        !q ||
        x.postulante.nombre.toLowerCase().includes(q) ||
        x.postulante.correo.toLowerCase().includes(q),
    )
    .sort((a, b) => (b.evaluacion?.puntaje_total ?? -1) - (a.evaluacion?.puntaje_total ?? -1));
}

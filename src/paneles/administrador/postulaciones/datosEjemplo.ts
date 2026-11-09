import type { AreaTecnica, Especialidad, PostulacionEvaluacion, Postulante } from '@/domain';

// PROVISIONAL: se reemplaza por data/ y services/ de Persona A.
const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString();

export const AREAS_EJEMPLO: AreaTecnica[] = [
  { id: 'a-soft', nombre: 'Software', activo: true },
  { id: 'a-juegos', nombre: 'Videojuegos', activo: true },
];

export const ESPECIALIDADES_EJEMPLO: Especialidad[] = [
  { id: 'e-front', id_area_tecnica: 'a-soft', nombre: 'Frontend', activo: true },
  { id: 'e-back', id_area_tecnica: 'a-soft', nombre: 'Backend', activo: true },
  { id: 'e-uni', id_area_tecnica: 'a-juegos', nombre: 'Unity', activo: true },
];

const p = (
  id: string,
  nombre: string,
  area: string,
  esp: string,
  dias: number,
  estado: Postulante['estado'],
): Postulante => ({
  id,
  nombre,
  correo: `${nombre.split(' ')[0].toLowerCase()}@correo.demo`,
  celular: '999888777',
  id_area_tecnica: area,
  id_especialidad: esp,
  fecha_postulacion: hace(dias),
  cv: { nombre: `cv-${id}.pdf`, url: '#' },
  estado,
});

export const POSTULANTES_EJEMPLO: Postulante[] = [
  p('p1', 'Lucía Torres', 'a-soft', 'e-front', 1, 'PENDIENTE'),
  p('p2', 'Marco Ruiz', 'a-soft', 'e-back', 2, 'PENDIENTE'),
  p('p3', 'Ana Quispe', 'a-juegos', 'e-uni', 3, 'PENDIENTE'),
  p('p4', 'Diego Vega', 'a-soft', 'e-front', 6, 'PENDIENTE'),
  p('p5', 'Sofía Rojas', 'a-soft', 'e-back', 9, 'APROBADA'),
  p('p6', 'Luis Paredes', 'a-juegos', 'e-uni', 12, 'RECHAZADA'),
];

const ev = (id: string, puntaje: number, revision: boolean): PostulacionEvaluacion => ({
  id: `ev-${id}`,
  id_postulante: id,
  puntaje_area: puntaje,
  puntaje_especialidad: puntaje,
  puntaje_total: puntaje,
  justificacion: 'Evaluación simulada.',
  requiere_revision_manual: revision,
  fecha_evaluacion: hace(0),
});

export const EVALUACIONES_EJEMPLO: PostulacionEvaluacion[] = [
  ev('p1', 86, false),
  ev('p2', 62, true),
  ev('p3', 45, true),
  ev('p4', 91, false),
  ev('p5', 88, false),
  ev('p6', 30, false),
];

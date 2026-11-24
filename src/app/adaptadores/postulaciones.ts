import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  hoyEn,
  type AccionDecisionPostulacion,
  type EstadoPostulacion,
  type Fecha,
} from '@/domain';
import type { EventoLinea } from '@/compartido/LineaTiempo';
import type { ListadoPostulaciones, PostulacionDetalle } from '@/services';
import { aEventosLinea } from './eventos';

interface Nombre {
  id: string;
  nombre: string;
}

export interface FilaPostulacion {
  id: string;
  nombre: string;
  correo: string;
  area: Nombre | null;
  especialidad: Nombre | null;
  /** El instante de la postulación, ya como `Date` (`parseISO` en el borde). */
  fecha: Date;
  /** El día de la postulación en hora de Perú (para el filtro por rango de fechas). */
  dia: Fecha;
  fechaTexto: string;
  estado: EstadoPostulacion;
  /** `null` si todavía no se evaluó. */
  puntaje: number | null;
  requiereRevision: boolean;
}

export interface ContadoresPostulaciones {
  TODAS: number;
  PENDIENTES: number;
  REQUIEREN_REVISION: number;
  APROBADAS: number;
  RECHAZADAS: number;
}

export interface PostulacionesParaVista {
  /** Por puntaje de mayor a menor (el ranking de §5.1), como las entrega la consulta. */
  filas: FilaPostulacion[];
  contadores: ContadoresPostulaciones;
}

/** Fecha de la postulación como se muestra en el listado y el detalle: «7 nov 2026». */
function diaVisible(iso: string): string {
  return format(parseISO(iso), 'd MMM yyyy', { locale: es });
}

/** Fecha y hora: «7 nov 2026, 14:30». */
function fechaHoraVisible(iso: string): string {
  return format(parseISO(iso), 'd MMM yyyy, HH:mm', { locale: es });
}

/**
 * El listado de `listarPostulaciones` a las filas de la tabla. Solo presenta: conserva el orden del ranking y los
 * contadores de la consulta, y no filtra ni decide nada.
 */
export function aPostulaciones(listado: ListadoPostulaciones): PostulacionesParaVista {
  return {
    filas: listado.postulaciones.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      correo: p.correo,
      area: p.area,
      especialidad: p.especialidad,
      fecha: parseISO(p.fecha_postulacion),
      dia: hoyEn(p.fecha_postulacion),
      fechaTexto: diaVisible(p.fecha_postulacion),
      estado: p.estado,
      puntaje: p.puntaje,
      requiereRevision: p.requiere_revision_manual,
    })),
    contadores: listado.contadores,
  };
}

export interface CriterioParaVista {
  nombre: string;
  peso: number;
  cumplido: boolean;
  puntaje: number;
  /** Vacío si el criterio no trae observación. */
  observacion: string;
}

export interface EvaluacionParaVista {
  puntajeTotal: number;
  puntajeArea: number;
  puntajeEspecialidad: number;
  justificacion: string;
  requiereRevision: boolean;
  fechaTexto: string;
  bloques: { AREA: CriterioParaVista[]; ESPECIALIDAD: CriterioParaVista[] };
  /**
   * El peso de cada bloque en la nota (en %) y la fórmula con números, solo si la proporción vigente reproduce la nota
   * guardada. Si Configuración cambió después de evaluar, es `null`: no se afirma una fórmula que no cuadra.
   */
  pesos: { area: number; especialidad: number; formula: string } | null;
}

export interface DetalleParaVista {
  id: string;
  nombre: string;
  correo: string;
  celular: string;
  /** «Sin área» / «Sin especialidad» si el catálogo ya no las tiene. */
  area: string;
  especialidad: string;
  /** El instante de la postulación, ya como `Date`, para decir «hace N días». */
  fecha: Date;
  fechaTexto: string;
  estado: EstadoPostulacion;
  cv: { nombre: string };
  /** `null` si todavía no se evaluó. */
  evaluacion: EvaluacionParaVista | null;
  eventos: EventoLinea[];
  /** La cuenta de practicante que nació de esta postulación, si fue aprobada. */
  practicante: { id: string; nombre: string } | null;
  /** Lo que se puede decidir ahora; lo decide `domain/` y llega con la consulta. */
  decisiones: AccionDecisionPostulacion[];
}

/** «0,4» para 40: coma decimal, como se lee en español. */
function comoFraccion(porcentaje: number): string {
  return String(porcentaje / 100).replace('.', ',');
}

/** Los pesos del detalle, si con ellos sale la nota guardada (redondeo con las mitades hacia arriba, como `domain/`). */
function pesosQueCuadran(
  evaluacion: NonNullable<PostulacionDetalle['evaluacion']>,
): EvaluacionParaVista['pesos'] {
  const { proporcion: p } = evaluacion;
  if (p === null) return null;
  const nota = Math.round(
    (p.area * evaluacion.puntaje_area + p.especialidad * evaluacion.puntaje_especialidad) / 100,
  );
  if (nota !== evaluacion.puntaje_total) return null;
  return {
    area: p.area,
    especialidad: p.especialidad,
    formula: `Nota final = ${comoFraccion(p.area)} × ${evaluacion.puntaje_area} + ${comoFraccion(p.especialidad)} × ${evaluacion.puntaje_especialidad} = ${evaluacion.puntaje_total}`,
  };
}

/** El detalle de `obtenerPostulacion` al modelo de presentación (fechas con `parseISO`, sin reglas). */
export function aDetallePostulacion(detalle: PostulacionDetalle): DetalleParaVista {
  const { postulante, evaluacion } = detalle;
  const criterios = (
    lista: PostulacionDetalle['evaluacion'] & object,
    bloque: 'AREA' | 'ESPECIALIDAD',
  ) =>
    lista.bloques[bloque].map((c): CriterioParaVista => ({
      nombre: c.nombre,
      peso: c.peso,
      cumplido: c.cumplido,
      puntaje: c.puntaje_obtenido,
      observacion: c.observacion ?? '',
    }));
  return {
    id: postulante.id,
    nombre: postulante.nombre,
    correo: postulante.correo,
    celular: postulante.celular,
    area: postulante.area?.nombre ?? 'Sin área',
    especialidad: postulante.especialidad?.nombre ?? 'Sin especialidad',
    fecha: parseISO(postulante.fecha_postulacion),
    fechaTexto: fechaHoraVisible(postulante.fecha_postulacion),
    estado: detalle.estado,
    cv: { nombre: postulante.cv.nombre },
    evaluacion:
      evaluacion === null
        ? null
        : {
            puntajeTotal: evaluacion.puntaje_total,
            puntajeArea: evaluacion.puntaje_area,
            puntajeEspecialidad: evaluacion.puntaje_especialidad,
            justificacion: evaluacion.justificacion,
            requiereRevision: evaluacion.requiere_revision_manual,
            fechaTexto: fechaHoraVisible(evaluacion.fecha_evaluacion),
            pesos: pesosQueCuadran(evaluacion),
            bloques: {
              AREA: criterios(evaluacion, 'AREA'),
              ESPECIALIDAD: criterios(evaluacion, 'ESPECIALIDAD'),
            },
          },
    eventos: aEventosLinea(detalle.eventos),
    practicante: detalle.practicante,
    decisiones: detalle.decisiones,
  };
}

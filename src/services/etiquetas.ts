/**
 * Etiquetas de los elementos del historial: copia del ID legible y del título o nombre, para que el
 * evento se siga entendiendo aunque el elemento cambie o desaparezca. Mismo formato que la semilla.
 */

import {
  formatearIdLegible,
  type ClaveParametro,
  type Postulante,
  type Proyecto,
  type Tarea,
  type Usuario,
} from '@/domain';

/** `PL2D-018 · Menú principal` */
export function etiquetaTarea(
  proyecto: Pick<Proyecto, 'codigo'>,
  tarea: Pick<Tarea, 'numero' | 'titulo'>,
): string {
  const id = formatearIdLegible(proyecto.codigo, tarea.numero);
  if (!id.ok) throw new Error(id.mensaje);
  return `${id.id} · ${tarea.titulo}`;
}

/** `PL2D · Plataforma 2D: Aventura Andina` */
export function etiquetaProyecto(proyecto: Pick<Proyecto, 'codigo' | 'nombre'>): string {
  return `${proyecto.codigo} · ${proyecto.nombre}`;
}

export function etiquetaUsuario(usuario: Pick<Usuario, 'nombre'>): string {
  return usuario.nombre;
}

export function etiquetaPostulante(postulante: Pick<Postulante, 'nombre'>): string {
  return postulante.nombre;
}

const ETIQUETA_PARAMETRO: Readonly<Record<ClaveParametro, string>> = {
  EVALUACION_BANDA_AMBIGUA: 'Banda de puntaje ambiguo',
  EVALUACION_PROPORCION: 'Proporción de la nota (área y especialidad)',
  PRACTICA_DURACION_MESES: 'Duración predeterminada de la práctica (meses)',
  PRACTICA_AVISO_FIN_DIAS: 'Aviso de fin de práctica (días)',
  INSIGHT_INACTIVO_DIAS: 'Practicante inactivo: días para «atención»',
  INSIGHT_INACTIVO_CRITICO_DIAS: 'Practicante inactivo: días para «crítico»',
  INSIGHT_CARGA_MAXIMA_TAREAS: 'Carga desbalanceada: máximo de tareas en progreso',
  INSIGHT_CARGA_MINIMA_TAREAS: 'Carga desbalanceada: mínimo de tareas en progreso',
  INSIGHT_ATRASO_PUNTOS: 'Posible atraso: puntos de diferencia',
  INSIGHT_ATRASO_PORCENTAJE: 'Posible atraso: porcentaje de tareas vencidas',
  INSIGHT_PROYECTO_SIN_ACTIVIDAD_DIAS: 'Proyecto sin actividad: días',
  INSIGHT_SUPERVISION_DEMORADA_DIAS: 'Supervisión demorada: días',
  INSIGHT_POSTULACION_DIAS: 'Postulaciones sin decidir: días',
  INSIGHT_FIN_PRACTICA_DIAS: 'Fin de práctica: días de anticipación',
};

/** `Banda de puntaje ambiguo`: el nombre de un parámetro de Configuración, para el historial. */
export function etiquetaParametro(clave: ClaveParametro): string {
  return ETIQUETA_PARAMETRO[clave];
}

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type {
  AccionPracticante,
  ConfiguracionVista,
  ListadoPracticantes,
  PracticanteDetalle,
  ProyectoResumen,
} from '@/services';
import type { EstadoPracticante, EstadoProyecto, Fecha, SituacionFinPractica } from '@/domain';
import type { EventoLinea } from '@/compartido/LineaTiempo';
import type { TareaTablero } from '@/compartido/TableroKanban';
import { aEventosLinea } from './eventos';
import { aTareaTablero } from './tablero';

interface Nombre {
  id: string;
  nombre: string;
}

/** Cuánto falta (o cuánto pasó) para el fin de la práctica, ya como texto para la tabla y el detalle. */
export interface FinParaVista {
  situacion: SituacionFinPractica;
  texto: string;
}

export interface FilaPracticante {
  id: string;
  nombre: string;
  correo: string;
  area: Nombre | null;
  especialidad: Nombre | null;
  estado: EstadoPracticante;
  /** Activo sin ningún proyecto vigente que no esté finalizado: ofrece el atajo «Asignar a proyecto». */
  sinProyecto: boolean;
  proyectos: ProyectoResumen[];
  carga: number;
  /** `null` si nunca hizo una acción. */
  ultimaActividad: Date | null;
  ultimaActividadTexto: string;
  finPrevistaTexto: string;
  /** `null` para quien ya finalizó la práctica. */
  fin: FinParaVista | null;
}

export interface ContadoresPracticantes {
  TODOS: number;
  ACTIVOS: number;
  SIN_PROYECTO: number;
  FINALIZADOS: number;
}

export interface PracticantesParaVista {
  /** Por nombre, como las entrega la consulta. */
  filas: FilaPracticante[];
  contadores: ContadoresPracticantes;
}

/** «7 nov 2026» a partir de `AAAA-MM-DD` o de un instante ISO. */
function diaVisible(valor: string): string {
  return format(parseISO(valor), 'd MMM yyyy', { locale: es });
}

const plural = (n: number, singular: string, plurales: string) =>
  `${n} ${n === 1 ? singular : plurales}`;

/** El texto de «cuánto falta» según la situación y los días que calculó la consulta. */
function finParaVista(
  fin: { situacion: SituacionFinPractica; dias_restantes: number } | null,
): FinParaVista | null {
  if (fin === null) return null;
  switch (fin.situacion) {
    case 'EN_CURSO':
      return {
        situacion: fin.situacion,
        texto: `Faltan ${plural(fin.dias_restantes, 'día', 'días')}`,
      };
    case 'AVISO':
      return {
        situacion: fin.situacion,
        texto: `Faltan ${plural(fin.dias_restantes, 'día', 'días')}`,
      };
    case 'FIN_HOY':
      return { situacion: fin.situacion, texto: 'Termina hoy' };
    case 'VENCIDA':
      return {
        situacion: fin.situacion,
        texto: `Vencida hace ${plural(Math.abs(fin.dias_restantes), 'día', 'días')}`,
      };
  }
}

/**
 * El listado de `listarPracticantes` a las filas de la tabla. Solo presenta: conserva el orden y los contadores de la
 * consulta, convierte fechas con `parseISO` en el borde y no filtra ni decide nada.
 */
export function aPracticantes(listado: ListadoPracticantes): PracticantesParaVista {
  return {
    filas: listado.practicantes.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      correo: p.correo,
      area: p.area,
      especialidad: p.especialidad,
      estado: p.situacion.estado,
      sinProyecto: p.situacion.sin_proyecto,
      proyectos: p.proyectos_activos,
      carga: p.carga,
      ultimaActividad: p.ultima_actividad === null ? null : parseISO(p.ultima_actividad),
      ultimaActividadTexto:
        p.ultima_actividad === null ? 'Sin actividad' : diaVisible(p.ultima_actividad),
      finPrevistaTexto: diaVisible(p.fecha_fin_prevista),
      fin: finParaVista(p.fin),
    })),
    contadores: listado.contadores,
  };
}

export interface ParticipacionParaVista {
  proyecto: ProyectoResumen;
  estadoProyecto: EstadoProyecto;
  altaTexto: string;
  /** `null` mientras la asignación sigue vigente. */
  bajaTexto: string | null;
}

export interface TareaDePracticanteParaVista {
  tarea: TareaTablero;
  proyecto: ProyectoResumen;
}

export interface DetallePracticanteParaVista {
  id: string;
  nombre: string;
  correo: string;
  celular: string;
  discord: string | null;
  cuentaGithub: string | null;
  disponibilidadHoraria: number | null;
  altaTexto: string;
  estado: EstadoPracticante;
  sinProyecto: boolean;
  area: string;
  especialidad: string;
  /** Para precargar el formulario de edición. */
  idEspecialidad: string | null;
  fechaIngreso: Fecha;
  fechaIngresoTexto: string;
  fechaFinPrevista: Fecha;
  fechaFinPrevistaTexto: string;
  fin: FinParaVista | null;
  proyectosActuales: ParticipacionParaVista[];
  proyectosAnteriores: ParticipacionParaVista[];
  tareasActuales: TareaDePracticanteParaVista[];
  tareasCompletadas: TareaDePracticanteParaVista[];
  eventos: EventoLinea[];
  postulacionOrigen: { id: string; nombre: string } | null;
  /** Lo que se puede hacer ahora; lo decide `domain/` y llega con la consulta. */
  acciones: AccionPracticante[];
  /** Tareas en progreso que se liberarían al finalizar la práctica (para el aviso de la confirmación). */
  tareasALiberar: number;
}

type ParticipacionDeConsulta = PracticanteDetalle['proyectos_actuales'][number];

const aParticipacion = (p: ParticipacionDeConsulta): ParticipacionParaVista => ({
  proyecto: p.proyecto,
  estadoProyecto: p.estado_proyecto,
  altaTexto: diaVisible(p.fecha_alta),
  bajaTexto: p.fecha_baja === null ? null : diaVisible(p.fecha_baja),
});

const aTareaDePracticante = (t: PracticanteDetalle['tareas_actuales'][number]) => ({
  tarea: aTareaTablero(t),
  proyecto: t.proyecto,
});

/** El detalle de `obtenerPracticante` al modelo de presentación (fechas con `parseISO`, sin reglas). */
export function aDetallePracticante(detalle: PracticanteDetalle): DetallePracticanteParaVista {
  const { datos_personales: d, practica } = detalle;
  return {
    id: d.id,
    nombre: d.nombre,
    correo: d.correo,
    celular: d.celular,
    discord: d.discord,
    cuentaGithub: d.cuenta_github,
    disponibilidadHoraria: d.disponibilidad_horaria,
    altaTexto: diaVisible(d.fecha_alta),
    estado: practica.situacion.estado,
    sinProyecto: practica.situacion.sin_proyecto,
    area: practica.area?.nombre ?? 'Sin área',
    especialidad: practica.especialidad?.nombre ?? 'Sin especialidad',
    idEspecialidad: practica.especialidad?.id ?? null,
    fechaIngreso: practica.fecha_ingreso,
    fechaIngresoTexto: diaVisible(practica.fecha_ingreso),
    fechaFinPrevista: practica.fecha_fin_prevista,
    fechaFinPrevistaTexto: diaVisible(practica.fecha_fin_prevista),
    fin: finParaVista(practica.fin),
    proyectosActuales: detalle.proyectos_actuales.map(aParticipacion),
    proyectosAnteriores: detalle.proyectos_anteriores.map(aParticipacion),
    tareasActuales: detalle.tareas_actuales.map(aTareaDePracticante),
    tareasCompletadas: detalle.tareas_completadas.map(aTareaDePracticante),
    eventos: aEventosLinea(detalle.eventos),
    postulacionOrigen: detalle.postulacion_origen,
    acciones: detalle.acciones,
    tareasALiberar: detalle.tareas_a_liberar,
  };
}

/**
 * La duración predeterminada de la práctica en meses (`PRACTICA_DURACION_MESES`), con la que el formulario propone la
 * fecha de fin. `null` si el parámetro no está o no es un número.
 */
export function duracionDePracticaMeses(configuracion: ConfiguracionVista): number | null {
  for (const seccion of configuracion.secciones) {
    const parametro = seccion.parametros.find((p) => p.clave === 'PRACTICA_DURACION_MESES');
    if (parametro !== undefined) {
      return parametro.valor.tipo === 'numero' ? parametro.valor.valor : null;
    }
  }
  return null;
}

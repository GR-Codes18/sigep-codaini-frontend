import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  hoyEn,
  type DiaSemana,
  type EstadoProyecto,
  type EstadoTarea,
  type Fecha,
  type Hora,
} from '@/domain';
import type { EventoLinea } from '@/compartido/LineaTiempo';
import {
  textoReunion,
  type AccionProyecto,
  type EquipoProyectoGestion,
  type ListadoProyectos,
  type PersonaResumen,
  type ReunionDeProyecto,
  type ResumenProyectoGestion,
} from '@/services';
import { aEventosLinea } from './eventos';

/** «7 nov 2026» a partir de `AAAA-MM-DD` o de un instante ISO. */
function diaVisible(valor: string): string {
  return format(parseISO(valor), 'd MMM yyyy', { locale: es });
}

export interface AvanceParaVista {
  terminadas: number;
  total: number;
  porcentaje: number;
  /** «12 de 30 · 40 %». */
  texto: string;
}

/** El avance de la consulta (tareas terminadas sobre el total); `null` si el proyecto no tiene tareas. */
function aAvance(
  avance: { numerador: number; denominador: number; porcentaje: number } | null,
): AvanceParaVista | null {
  if (avance === null) return null;
  return {
    terminadas: avance.numerador,
    total: avance.denominador,
    porcentaje: avance.porcentaje,
    texto: `${avance.numerador} de ${avance.denominador} · ${avance.porcentaje} %`,
  };
}

/** La próxima reunión como «23 nov 2026, 10:00» (día de Perú), o «Sin definir». */
export function proximaReunionTexto(
  reunion: Pick<ReunionDeProyecto, 'proxima' | 'hora_reunion'>,
): string {
  if (reunion.proxima === null || reunion.hora_reunion === null) return 'Sin definir';
  return `${diaVisible(hoyEn(reunion.proxima))}, ${reunion.hora_reunion}`;
}

export interface FilaProyecto {
  id: string;
  nombre: string;
  codigo: string;
  estado: EstadoProyecto;
  supervisor: PersonaResumen;
  practicantesActivos: number;
  /** `null` si el proyecto no tiene tareas. */
  avance: AvanceParaVista | null;
  tareasEsperandoSupervision: number;
  proximaReunionTexto: string;
}

export interface ProyectosParaVista {
  /** Como las entrega la consulta. */
  filas: FilaProyecto[];
  contadores: ListadoProyectos['contadores'];
  /** Lo decide `domain/` y llega con la consulta: la pantalla solo ofrece o no «Nuevo proyecto». */
  puedeCrear: boolean;
  /** A quién se puede asignar un proyecto nuevo (supervisores activos); lo decide la consulta. */
  supervisoresDisponibles: PersonaResumen[];
}

/**
 * El listado de `listarProyectos` a las filas de la tabla. Solo presenta: conserva el orden y los contadores de la
 * consulta, convierte fechas con `parseISO` en el borde y no filtra ni decide nada.
 */
export function aProyectos(listado: ListadoProyectos): ProyectosParaVista {
  return {
    filas: listado.proyectos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      codigo: p.codigo,
      estado: p.estado,
      supervisor: p.supervisor,
      practicantesActivos: p.practicantes_activos,
      avance: aAvance(p.avance),
      tareasEsperandoSupervision: p.tareas_esperando_supervision,
      proximaReunionTexto: proximaReunionTexto(p.reunion),
    })),
    contadores: listado.contadores,
    puedeCrear: listado.puede_crear,
    supervisoresDisponibles: listado.supervisores_disponibles,
  };
}

export interface DatosProyectoParaVista {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string;
  estado: EstadoProyecto;
  fechaInicio: Fecha;
  fechaInicioTexto: string;
  fechaFinPrevista: Fecha;
  fechaFinPrevistaTexto: string;
  /** `null` mientras no se finaliza. */
  fechaFinRealTexto: string | null;
  supervisor: PersonaResumen;
  /** «lunes a las 10:00» o «Sin definir». */
  reunionTexto: string;
  proximaReunionTexto: string;
  /** Para precargar el formulario de edición; ambos son `null` si no hay reunión. */
  diaReunion: DiaSemana | null;
  horaReunion: Hora | null;
  repositorioUrl: string;
  ramaBase: string;
}

export interface EnlaceParaVista {
  id: string;
  nombre: string;
  url: string;
}

export interface TareasDeEstadoParaVista {
  estado: EstadoTarea;
  cantidad: number;
}

export interface ResumenParaVista {
  proyecto: DatosProyectoParaVista;
  enlaces: EnlaceParaVista[];
  avance: AvanceParaVista | null;
  /** En el orden del flujo: Disponible, En progreso, Esperando supervisión y Terminada. */
  tareasPorEstado: TareasDeEstadoParaVista[];
  tareasVencidas: number;
  actividadReciente: EventoLinea[];
  /** Lo que se puede hacer con el proyecto; lo decide `puede()` y las reglas de `domain/`, y llega con la consulta. */
  acciones: AccionProyecto[];
  /** Lo que explica finalizar y reactivar; lo calcula `domain/` y llega con la consulta. */
  cicloDeVida: CicloDeVidaParaVista;
  /** A quién se puede cambiar el supervisor; lo decide `domain/` y llega con la consulta. */
  supervisoresDestino: PersonaResumen[];
}

export interface CicloDeVidaParaVista {
  /** Si es mayor que 0, finalizar está bloqueado. */
  tareasEsperandoSupervision: number;
  /** Las «En progreso» que se liberarían al finalizar. */
  tareasALiberar: number;
  /** Reactivar pide reactivar antes al supervisor del proyecto. */
  supervisorInactivo: boolean;
}

const ORDEN_ESTADOS_TAREA: readonly EstadoTarea[] = [
  'DISPONIBLE',
  'EN_PROGRESO',
  'ESPERANDO_SUPERVISION',
  'TERMINADA',
];

/** Los datos del proyecto de la consulta al modelo de presentación (fechas legibles, reunión como texto). */
export function aDatosProyecto(
  proyecto: ResumenProyectoGestion['proyecto'],
): DatosProyectoParaVista {
  return {
    id: proyecto.id,
    nombre: proyecto.nombre,
    codigo: proyecto.codigo,
    descripcion: proyecto.descripcion,
    estado: proyecto.estado,
    fechaInicio: proyecto.fecha_inicio,
    fechaInicioTexto: diaVisible(proyecto.fecha_inicio),
    fechaFinPrevista: proyecto.fecha_fin_prevista,
    fechaFinPrevistaTexto: diaVisible(proyecto.fecha_fin_prevista),
    fechaFinRealTexto:
      proyecto.fecha_fin_real === null ? null : diaVisible(proyecto.fecha_fin_real),
    supervisor: proyecto.supervisor,
    reunionTexto:
      textoReunion(proyecto.reunion.dia_reunion, proyecto.reunion.hora_reunion) ?? 'Sin definir',
    proximaReunionTexto: proximaReunionTexto(proyecto.reunion),
    diaReunion: proyecto.reunion.dia_reunion,
    horaReunion: proyecto.reunion.hora_reunion,
    repositorioUrl: proyecto.repositorio_url,
    ramaBase: proyecto.rama_base,
  };
}

/** El Resumen de `obtenerProyecto` (vista de gestión) al modelo de presentación. Solo presenta. */
export function aResumenProyecto(resumen: ResumenProyectoGestion): ResumenParaVista {
  return {
    proyecto: aDatosProyecto(resumen.proyecto),
    enlaces: resumen.enlaces.map((e) => ({ id: e.id, nombre: e.nombre, url: e.url })),
    avance: aAvance(resumen.avance),
    tareasPorEstado: ORDEN_ESTADOS_TAREA.map((estado) => ({
      estado,
      cantidad: resumen.tareas_por_estado[estado],
    })),
    tareasVencidas: resumen.tareas_vencidas,
    actividadReciente: aEventosLinea(resumen.actividad_reciente),
    acciones: resumen.acciones,
    cicloDeVida: {
      tareasEsperandoSupervision: resumen.ciclo_de_vida.tareas_esperando_supervision,
      tareasALiberar: resumen.ciclo_de_vida.tareas_a_liberar,
      supervisorInactivo: resumen.ciclo_de_vida.supervisor_inactivo,
    },
    supervisoresDestino: resumen.supervisores_destino,
  };
}

export interface MiembroParaVista {
  id: string;
  nombre: string;
  correo: string;
  /** «Sin especialidad» si el catálogo ya no la tiene. */
  especialidad: string;
  /** Tareas en progreso en este proyecto. */
  carga: number;
  altaTexto: string;
  /** Las «En progreso» que se liberarían al quitarlo; lo calcula `domain/`. */
  tareasALiberar: number;
  /** Lo decide `domain/` (no se puede quitar en un proyecto finalizado). */
  puedeQuitar: boolean;
}

export interface ExMiembroParaVista {
  id: string;
  nombre: string;
  altaTexto: string;
  bajaTexto: string;
}

export interface EquipoParaVista {
  /** Para explicar que un proyecto finalizado no admite asignar ni quitar. */
  estadoProyecto: EstadoProyecto;
  /** Lo decide `domain/` y llega con la consulta. */
  puedeAsignar: boolean;
  activos: MiembroParaVista[];
  anteriores: ExMiembroParaVista[];
}

/** El Equipo de `obtenerEquipoProyecto` (vista de gestión) al modelo de presentación. Solo presenta. */
export function aEquipoProyecto(equipo: EquipoProyectoGestion): EquipoParaVista {
  return {
    estadoProyecto: equipo.estado_proyecto,
    puedeAsignar: equipo.puede_asignar,
    activos: equipo.activos.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      correo: m.correo,
      especialidad: m.especialidad ?? 'Sin especialidad',
      carga: m.carga,
      altaTexto: diaVisible(m.fecha_alta),
      tareasALiberar: m.tareas_a_liberar,
      puedeQuitar: m.puede_quitar,
    })),
    anteriores: equipo.anteriores.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      altaTexto: diaVisible(m.fecha_alta),
      bajaTexto: diaVisible(m.fecha_baja),
    })),
  };
}

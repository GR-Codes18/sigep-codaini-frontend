import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { EstadoUsuario } from '@/domain';
import type { EventoLinea } from '@/compartido/LineaTiempo';
import type { TareaTablero } from '@/compartido/TableroKanban';
import {
  textoReunion,
  type AccionSupervisor,
  type ListadoSupervisores,
  type ProyectoResumen,
  type SupervisorDetalle,
} from '@/services';
import { aEventosLinea } from './eventos';
import { aTareaTablero } from './tablero';

export interface FilaSupervisor {
  id: string;
  nombre: string;
  correo: string;
  estado: EstadoUsuario;
  proyectosACargo: number;
  practicantesACargo: number;
  /** Tareas esperando su supervisión; el listado las resalta cuando hay alguna. */
  tareasPorRevisar: number;
  /** `null` si nunca hizo una acción. */
  ultimaActividad: Date | null;
  ultimaActividadTexto: string;
}

export interface ContadoresSupervisores {
  TODOS: number;
  ACTIVOS: number;
  INACTIVOS: number;
}

export interface SupervisoresParaVista {
  /** Por nombre, como las entrega la consulta. */
  filas: FilaSupervisor[];
  contadores: ContadoresSupervisores;
}

/** «7 nov 2026» a partir de `AAAA-MM-DD` o de un instante ISO. */
function diaVisible(valor: string): string {
  return format(parseISO(valor), 'd MMM yyyy', { locale: es });
}

/**
 * El listado de `listarSupervisores` a las filas de la tabla. Solo presenta: conserva el orden y los contadores de la
 * consulta, convierte fechas con `parseISO` en el borde y no filtra ni decide nada.
 */
export function aSupervisores(listado: ListadoSupervisores): SupervisoresParaVista {
  return {
    filas: listado.supervisores.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      correo: s.correo,
      estado: s.estado,
      proyectosACargo: s.proyectos_a_cargo,
      practicantesACargo: s.practicantes_a_cargo,
      tareasPorRevisar: s.tareas_por_revisar,
      ultimaActividad: s.ultima_actividad === null ? null : parseISO(s.ultima_actividad),
      ultimaActividadTexto:
        s.ultima_actividad === null ? 'Sin actividad' : diaVisible(s.ultima_actividad),
    })),
    contadores: listado.contadores,
  };
}

export interface ProyectoACargoParaVista {
  proyecto: ProyectoResumen;
  estado: SupervisorDetalle['proyectos_a_cargo'][number]['estado'];
  /** «Lunes a las 10:00» o «Sin definir». */
  reunionTexto: string;
  practicantesActivos: number;
}

export interface TareaPorRevisarParaVista {
  tarea: TareaTablero;
  proyecto: ProyectoResumen;
  /** `null` si no se pudo calcular desde cuándo espera. */
  diasEsperando: number | null;
}

export interface ProyectoAnteriorParaVista {
  proyecto: ProyectoResumen;
  /** `null` si el proyecto no registra su fecha de fin real. */
  finRealTexto: string | null;
}

export interface DetalleSupervisorParaVista {
  id: string;
  nombre: string;
  correo: string;
  celular: string;
  discord: string | null;
  cuentaGithub: string | null;
  estado: EstadoUsuario;
  altaTexto: string;
  proyectosACargo: ProyectoACargoParaVista[];
  tareasPorRevisar: TareaPorRevisarParaVista[];
  proyectosAnteriores: ProyectoAnteriorParaVista[];
  eventos: EventoLinea[];
  /** Lo que se puede hacer ahora; lo decide `domain/` y llega con la consulta. */
  acciones: AccionSupervisor[];
}

/** El detalle de `obtenerSupervisor` al modelo de presentación (fechas con `parseISO`, sin reglas). */
export function aDetalleSupervisor(detalle: SupervisorDetalle): DetalleSupervisorParaVista {
  const { datos } = detalle;
  return {
    id: datos.id,
    nombre: datos.nombre,
    correo: datos.correo,
    celular: datos.celular,
    discord: datos.discord,
    cuentaGithub: datos.cuenta_github,
    estado: datos.estado,
    altaTexto: diaVisible(datos.fecha_alta),
    proyectosACargo: detalle.proyectos_a_cargo.map((p) => ({
      proyecto: p.proyecto,
      estado: p.estado,
      reunionTexto: textoReunion(p.reunion.dia_reunion, p.reunion.hora_reunion) ?? 'Sin definir',
      practicantesActivos: p.practicantes_activos,
    })),
    tareasPorRevisar: detalle.tareas_por_revisar.map((t) => ({
      tarea: aTareaTablero(t),
      proyecto: t.proyecto,
      diasEsperando: t.dias_esperando,
    })),
    proyectosAnteriores: detalle.proyectos_anteriores.map((p) => ({
      proyecto: p.proyecto,
      finRealTexto: p.fecha_fin_real === null ? null : diaVisible(p.fecha_fin_real),
    })),
    eventos: aEventosLinea(detalle.eventos),
    acciones: detalle.acciones,
  };
}

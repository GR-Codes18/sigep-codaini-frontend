import type { EventoLinea } from '@/compartido/LineaTiempo';
import type { TareaTablero } from '@/compartido/TableroKanban';
import type { EstadoProyecto, Id } from '@/domain';
import type {
  EquipoProyectoPracticante,
  MisProyectos,
  MotivoProyectoAnterior,
  ResumenProyectoAnterior,
  ResumenProyectoPracticante,
} from '@/services';
import { aEventosLinea } from './eventos';
import { aTareaTablero } from './tablero';
import { diaVisible, proximaReunionTexto } from './proyectos';
import { textoReunion } from '@/services';

const SIN_DATO = '—';

// ── Listado ──────────────────────────────────────────────────────────────────────────────────

export interface TarjetaDeMiProyecto {
  id: Id;
  nombre: string;
  codigo: string;
  estado: EstadoProyecto;
  /** Avance de 0 a 100 para la barra; `undefined` si el proyecto no tiene tareas (no se dibuja una barra en cero). */
  avance: number | undefined;
  detalles: { etiqueta: string; valor: string }[];
}

export interface TarjetaDeProyectoAnterior {
  id: Id;
  nombre: string;
  codigo: string;
  motivo: MotivoProyectoAnterior;
  detalles: { etiqueta: string; valor: string }[];
}

export interface MisProyectosParaVista {
  vigentes: TarjetaDeMiProyecto[];
  anteriores: TarjetaDeProyectoAnterior[];
}

/** «7 nov 2026 – 20 nov 2026», o «Desde el 7 nov 2026» si el periodo no tiene fin registrado. */
function periodoTexto(alta: string, fin: string | null): string {
  return fin === null ? `Desde el ${diaVisible(alta)}` : `${diaVisible(alta)} – ${diaVisible(fin)}`;
}

/**
 * El listado de `listarMisProyectos` a las tarjetas (§9.2.1). Solo presenta: las vigentes llevan mi carga, las tareas
 * disponibles, el avance y la reunión; las anteriores solo el supervisor y el periodo, sin barra, carga ni reunión.
 */
export function aMisProyectos(listado: MisProyectos): MisProyectosParaVista {
  return {
    vigentes: listado.vigentes.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      codigo: p.codigo,
      estado: p.estado,
      avance: p.avance === null ? undefined : p.avance.porcentaje,
      detalles: [
        { etiqueta: 'Supervisor', valor: p.supervisor.nombre },
        { etiqueta: 'Mi carga', valor: String(p.mi_carga) },
        { etiqueta: 'Disponibles para tomar', valor: String(p.tareas_disponibles) },
        { etiqueta: 'Próxima reunión', valor: proximaReunionTexto(p.reunion) },
      ],
    })),
    anteriores: listado.anteriores.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      codigo: p.codigo,
      motivo: p.motivo,
      detalles: [
        { etiqueta: 'Supervisor', valor: p.supervisor.nombre },
        { etiqueta: 'Participaste', valor: periodoTexto(p.fecha_alta, p.fecha_fin) },
      ],
    })),
  };
}

/** Qué es un proyecto para quien mira, según `listarMisProyectos`: vigente, anterior o ajeno (no aparece en ninguna lista). */
export type ClaseDeProyecto = 'VIGENTE' | 'ANTERIOR' | 'AJENO';

export function claseDeProyecto(listado: MisProyectos, idProyecto: Id): ClaseDeProyecto {
  if (listado.vigentes.some((p) => p.id === idProyecto)) return 'VIGENTE';
  if (listado.anteriores.some((p) => p.id === idProyecto)) return 'ANTERIOR';
  return 'AJENO';
}

// ── Detalle de un proyecto vigente ───────────────────────────────────────────────────────────

export interface ResumenPracticanteParaVista {
  nombre: string;
  codigo: string;
  descripcion: string;
  estado: EstadoProyecto;
  fechaInicioTexto: string;
  fechaFinPrevistaTexto: string;
  supervisor: string;
  /** «Lunes 10:00», o «Sin definir». */
  reunionTexto: string;
  proximaReunionTexto: string;
  repositorioUrl: string;
  ramaBase: string;
  enlaces: { id: Id; nombre: string; url: string }[];
  /** «12 de 30 · 40 %», o «Sin tareas». */
  avanceTexto: string;
  avance: number;
  /** Mis tareas abiertas del proyecto; las vencidas llevan `vencida` (se pintan en rojo). */
  misTareas: TareaTablero[];
  /** Lo que hice yo en el proyecto, no la actividad del resto del equipo. */
  miActividad: EventoLinea[];
}

/** El Resumen de `obtenerProyecto` para el Practicante (solo lectura, §9.2.1). */
export function aResumenProyectoPracticante(
  resumen: ResumenProyectoPracticante,
): ResumenPracticanteParaVista {
  const p = resumen.proyecto;
  return {
    nombre: p.nombre,
    codigo: p.codigo,
    descripcion: p.descripcion,
    estado: p.estado,
    fechaInicioTexto: diaVisible(p.fecha_inicio),
    fechaFinPrevistaTexto: diaVisible(p.fecha_fin_prevista),
    supervisor: p.supervisor.nombre,
    reunionTexto: textoReunion(p.reunion.dia_reunion, p.reunion.hora_reunion) ?? 'Sin definir',
    proximaReunionTexto: proximaReunionTexto(p.reunion),
    repositorioUrl: p.repositorio_url,
    ramaBase: p.rama_base,
    enlaces: resumen.enlaces,
    avanceTexto:
      resumen.avance === null
        ? 'Sin tareas'
        : `${resumen.avance.numerador} de ${resumen.avance.denominador} · ${resumen.avance.porcentaje} %`,
    avance: resumen.avance?.porcentaje ?? 0,
    misTareas: resumen.mis_tareas.map(aTareaTablero),
    miActividad: aEventosLinea(resumen.mi_actividad),
  };
}

export interface FilaCompanero {
  id: Id;
  nombre: string;
  especialidad: string;
  carga: number;
  discord: string;
  github: string;
}

export interface EquipoPracticanteParaVista {
  companeros: FilaCompanero[];
  supervisor: { nombre: string; discord: string; github: string };
}

/**
 * El equipo de `obtenerEquipoProyecto` para el Practicante: de los compañeros, nombre, especialidad, carga, Discord y GitHub;
 * del supervisor, Discord y GitHub. La consulta no entrega correo ni celular de nadie, y este modelo tampoco los tiene.
 */
export function aEquipoPracticante(equipo: EquipoProyectoPracticante): EquipoPracticanteParaVista {
  return {
    companeros: equipo.companeros.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      especialidad: c.especialidad ?? 'Sin especialidad',
      carga: c.carga,
      discord: c.discord ?? SIN_DATO,
      github: c.cuenta_github ?? SIN_DATO,
    })),
    supervisor: {
      nombre: equipo.supervisor.nombre,
      discord: equipo.supervisor.discord ?? SIN_DATO,
      github: equipo.supervisor.cuenta_github ?? SIN_DATO,
    },
  };
}

// ── Resumen mínimo de un proyecto anterior ───────────────────────────────────────────────────

export interface ResumenAnteriorParaVista {
  nombre: string;
  codigo: string;
  descripcion: string;
  estado: EstadoProyecto;
  supervisor: string;
  fechaInicioTexto: string;
  fechaFinPrevistaTexto: string;
  /** La fecha real de finalización, si el proyecto ya finalizó. */
  fechaFinRealTexto: string | null;
  /** Mi paso por el proyecto; `null` si la consulta no encuentra una participación mía. */
  participacion: { periodoTexto: string; tareasTerminadas: number } | null;
}

export function aResumenAnterior(resumen: ResumenProyectoAnterior): ResumenAnteriorParaVista {
  const p = resumen.proyecto;
  const part = resumen.participacion;
  return {
    nombre: p.nombre,
    codigo: p.codigo,
    descripcion: p.descripcion,
    estado: p.estado,
    supervisor: p.supervisor.nombre,
    fechaInicioTexto: diaVisible(p.fecha_inicio),
    fechaFinPrevistaTexto: diaVisible(p.fecha_fin_prevista),
    fechaFinRealTexto: p.fecha_fin_real === null ? null : diaVisible(p.fecha_fin_real),
    participacion:
      part === null
        ? null
        : {
            periodoTexto: periodoTexto(part.fecha_alta, part.fecha_baja ?? p.fecha_fin_real),
            tareasTerminadas: part.tareas_terminadas,
          },
  };
}

import type { EstadoPR, EstadoTarea, Id } from '@/domain';
import type { InicioPracticante, InicioPracticanteVacio, ProyectoResumen } from '@/services';
import { aReuniones, type FilaReunion } from './dashboard';
import { diaVisible } from './proyectos';
import { rutaDelElemento } from './reportes';

export interface FilaTareaEnCurso {
  id: Id;
  /** `CODIGO-NNN`, ya formateado por la consulta. */
  idLegible: string;
  titulo: string;
  proyecto: ProyectoResumen;
  /** «18 nov 2026». */
  fechaLimiteTexto: string;
  /** La fecha límite pasó (lo decide `domain/`). */
  vencida: boolean;
  /** La marca «Devuelta con observaciones». */
  devuelta: boolean;
  rutaDetalle: string | null;
}

export interface FilaPullRequestPorAtender {
  id: Id;
  idLegible: string;
  titulo: string;
  proyecto: ProyectoResumen;
  /** La tarea puede estar en cualquier columna: la consulta mira el estado del PR, no el del Kanban. */
  estado: EstadoTarea;
  /** `PENDIENTE` (falta crearlo) o `CON_CONFLICTOS` (hay que resolverlos). */
  estadoPr: EstadoPR;
  rutaDetalle: string | null;
}

export interface InicioPracticanteParaVista {
  vacio: false;
  tarjetas: {
    enProgreso: number;
    devueltas: number;
    esperandoSupervision: number;
    disponibles: number;
  };
  enCurso: FilaTareaEnCurso[];
  pullRequests: FilaPullRequestPorAtender[];
  reuniones: FilaReunion[];
}

/** Un Practicante sin proyecto vigente: un solo mensaje, sin tarjetas. */
export interface InicioPracticanteVacioParaVista {
  vacio: true;
}

/**
 * El Inicio de `obtenerInicioPracticante` al modelo de presentación (§9.2.3). Solo presenta: los números, el orden
 * (devueltas, vencidas, fecha límite) y qué tareas tienen el PR por atender ya los decidió la consulta, que solo trae lo
 * del propio Practicante. Los enlaces van al panel del Practicante y las fechas usan `diaVisible`.
 */
export function aInicioPracticante(
  vista: InicioPracticante | InicioPracticanteVacio,
): InicioPracticanteParaVista | InicioPracticanteVacioParaVista {
  if (vista.vacio) return { vacio: true };
  const t = vista.tarjetas;
  return {
    vacio: false,
    tarjetas: {
      enProgreso: t.en_progreso,
      devueltas: t.devueltas,
      esperandoSupervision: t.esperando_supervision,
      disponibles: t.disponibles,
    },
    enCurso: vista.en_curso.map((tarea) => ({
      id: tarea.id,
      idLegible: tarea.id_legible,
      titulo: tarea.titulo,
      proyecto: tarea.proyecto,
      fechaLimiteTexto: diaVisible(tarea.fecha_limite),
      vencida: tarea.vencida,
      devuelta: tarea.devuelta,
      rutaDetalle: rutaDelElemento('TAREA', tarea.id, 'PRACTICANTE'),
    })),
    pullRequests: vista.pull_requests_por_atender.flatMap((tarea) =>
      tarea.etiqueta_pr_visible === null
        ? []
        : [
            {
              id: tarea.id,
              idLegible: tarea.id_legible,
              titulo: tarea.titulo,
              proyecto: tarea.proyecto,
              estado: tarea.estado,
              estadoPr: tarea.etiqueta_pr_visible,
              rutaDetalle: rutaDelElemento('TAREA', tarea.id, 'PRACTICANTE'),
            },
          ],
    ),
    reuniones: aReuniones(vista.proximas_reuniones, 'PRACTICANTE'),
  };
}

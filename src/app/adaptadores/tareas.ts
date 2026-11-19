import { format, parseISO } from 'date-fns';
import type { EstadoPR, EstadoTarea, Fecha } from '@/domain';
import type { ListadoTareas, ProyectoResumen } from '@/services';

export interface FilaTarea {
  id: string;
  /** `CODIGO-NNN`, ya formateado por la consulta. */
  idLegible: string;
  titulo: string;
  proyecto: ProyectoResumen;
  /** `null` = «Sin asignar». */
  idResponsable: string | null;
  responsable: string | null;
  estado: EstadoTarea;
  requiereSupervision: boolean;
  /** La etiqueta del Pull Request **ya filtrada por la regla de visibilidad** (§7.3); `null` si no se muestra. */
  estadoPr: EstadoPR | null;
  fechaLimite: Fecha;
  /** «30/11/2026». */
  fechaLimiteTexto: string;
  /** La fecha límite pasó y la tarea no está terminada (lo calcula `domain/`). */
  vencida: boolean;
  /** Días completos esperando supervisión; `null` si no está en esa columna. */
  diasEsperando: number | null;
}

export interface TareasParaVista {
  /** Por código de proyecto y número, como las entrega la consulta. */
  filas: FilaTarea[];
  contadores: ListadoTareas['contadores'];
  /** Entre cuáles proyectos se puede crear una tarea; lo decide `domain/` y llega con la consulta. */
  proyectosParaCrear: ProyectoResumen[];
}

/**
 * El listado de `listarTareas` a las filas de la tabla. Solo presenta: conserva el orden y los contadores de la consulta,
 * convierte la fecha límite a texto y no filtra ni decide nada (la etiqueta del PR y «vencida» ya vienen decididas).
 */
export function aTareas(listado: ListadoTareas): TareasParaVista {
  return {
    filas: listado.tareas.map((t) => ({
      id: t.id,
      idLegible: t.id_legible,
      titulo: t.titulo,
      proyecto: t.proyecto,
      idResponsable: t.id_practicante,
      responsable: t.responsable,
      estado: t.estado,
      requiereSupervision: t.requiere_supervision,
      estadoPr: t.etiqueta_pr_visible,
      fechaLimite: t.fecha_limite,
      fechaLimiteTexto: format(parseISO(t.fecha_limite), 'dd/MM/yyyy'),
      vencida: t.vencida,
      diasEsperando: t.dias_esperando,
    })),
    contadores: listado.contadores,
    proyectosParaCrear: listado.proyectos_para_crear,
  };
}

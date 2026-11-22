import { parseISO } from 'date-fns';
import type { TareaTablero } from '@/compartido/TableroKanban';
import type { TableroProyecto, TareaDeTablero, TerminadasDeProyecto } from '@/services';

/**
 * Una tarjeta del tablero (`TareaDeTablero`) a las props de `TableroKanban`.
 *
 * `fecha_termino` se convierte a `Date` aquí, en el borde. La etiqueta de PR ya viene filtrada por la regla de
 * visibilidad (§7.3), la marca «Devuelta» por el alcance del rol y `vencida` por la regla de domain/: se pasan tal cual.
 */
export function aTareaTablero(tarea: TareaDeTablero): TareaTablero {
  return {
    id: tarea.id,
    idLegible: tarea.id_legible,
    titulo: tarea.titulo,
    estado: tarea.estado,
    ...(tarea.responsable !== null ? { responsable: tarea.responsable } : {}),
    esMia: tarea.es_mia,
    fechaLimite: tarea.fecha_limite,
    vencida: tarea.vencida,
    ...(tarea.fecha_termino !== null ? { fechaTermino: parseISO(tarea.fecha_termino) } : {}),
    requiereSupervision: tarea.requiere_supervision,
    estadoPr: tarea.etiqueta_pr_visible,
    devuelta: tarea.devuelta,
  };
}

export interface TableroParaVista {
  /** Las tareas de las cuatro columnas en una sola lista; las terminadas ya llegan recortadas a las 5 más recientes. */
  tareas: TareaTablero[];
  /** Cuántas terminadas tiene el proyecto en total (contador de la columna y «Ver todas las terminadas»). */
  totalTerminadas: number;
  /** El estado del proyecto: finalizado deja el tablero en solo lectura y en pausa nadie toma tareas nuevas (§6.8). */
  estadoProyecto: TableroProyecto['estado_proyecto'];
  /** Lo decide `domain/` y llega con la consulta: la pantalla solo ofrece o no «Nueva tarea». */
  puedeCrearTarea: boolean;
}

/** El tablero de un proyecto en el orden de las columnas. El componente las reparte por estado. */
export function aTablero(tablero: TableroProyecto): TableroParaVista {
  return {
    tareas: [
      ...tablero.disponibles,
      ...tablero.en_progreso,
      ...tablero.esperando_supervision,
      ...tablero.terminadas,
    ].map(aTareaTablero),
    totalTerminadas: tablero.total_terminadas,
    estadoProyecto: tablero.estado_proyecto,
    puedeCrearTarea: tablero.puede_crear_tarea,
  };
}

/** «Ver todas las terminadas»: el listado completo, de la más reciente a la más antigua. */
export function aTareasTerminadas(terminadas: TerminadasDeProyecto): TareaTablero[] {
  return terminadas.tareas.map(aTareaTablero);
}

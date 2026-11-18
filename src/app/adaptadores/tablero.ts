import { parseISO } from 'date-fns';
import type { TareaTablero } from '@/compartido/TableroKanban';
import type { TableroProyecto, TareaDeTablero } from '@/services';

/**
 * Una tarjeta del tablero (`TareaDeTablero`) a las props de `TableroKanban`.
 *
 * `fecha_termino` se convierte a `Date` aquí, en el borde. La etiqueta de PR ya viene filtrada por la regla de
 * visibilidad (§7.3) y la marca «Devuelta» por el alcance del rol, así que se pasan tal cual.
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
    ...(tarea.fecha_termino !== null ? { fechaTermino: parseISO(tarea.fecha_termino) } : {}),
    requiereSupervision: tarea.requiere_supervision,
    estadoPr: tarea.etiqueta_pr_visible,
    devuelta: tarea.devuelta,
  };
}

/**
 * Las tareas del tablero de un proyecto en una sola lista, en el orden de las columnas. El componente las reparte
 * por estado; las terminadas ya llegan recortadas a las 5 más recientes (`total_terminadas` da el total).
 */
export function aTareasDelTablero(tablero: TableroProyecto): TareaTablero[] {
  return [
    ...tablero.disponibles,
    ...tablero.en_progreso,
    ...tablero.esperando_supervision,
    ...tablero.terminadas,
  ].map(aTareaTablero);
}

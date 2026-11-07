/**
 * Tareas de un proyecto.
 *
 * El ID legible `CODIGO-NNN` no se guarda: se calcula con `Proyecto.codigo` y
 * `Tarea.numero`.
 */

import type { Fecha, FechaHora, Id } from './comunes';
import type { EstadoPR, EstadoTarea } from './enumeraciones';

export interface Tarea {
  id: Id;
  /** Correlativo por proyecto. */
  numero: number;
  titulo: string;
  descripcion: string;
  fecha_limite: Fecha;
  id_proyecto: Id;
  /** Contiene un `Usuario.id`; `null` si la tarea está DISPONIBLE. */
  id_practicante: Id | null;
  estado: EstadoTarea;
  requiere_supervision: boolean;
  requiere_pr: boolean;
  /**
   * `null` hasta la primera llegada a ESPERANDO_SUPERVISION o TERMINADA; se
   * oculta con una regla de visibilidad.
   */
  estado_pr: EstadoPR | null;
  rama_origen: string | null;
  rama_base: string | null;
  url_pull_request: string | null;
  fecha_termino: FechaHora | null;
}

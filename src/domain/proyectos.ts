/**
 * Proyectos, sus enlaces y las asignaciones de practicantes.
 */

import type { Fecha, Hora, Id } from './comunes';
import type { DiaSemana, EstadoProyecto } from './enumeraciones';

export interface Proyecto {
  id: Id;
  nombre: string;
  /** 3–5 caracteres, único e inmutable; forma el ID legible `CODIGO-NNN`. */
  codigo: string;
  descripcion: string;
  fecha_inicio: Fecha;
  fecha_fin_prevista: Fecha;
  fecha_fin_real: Fecha | null;
  estado: EstadoProyecto;
  dia_reunion: DiaSemana | null;
  hora_reunion: Hora | null;
  repositorio_url: string;
  rama_base: string;
  /** Contiene un `Usuario.id`. */
  id_supervisor: Id;
  /** Inicia en 0; solo lo escribe la generación de IDs. */
  ultimo_numero_tarea: number;
}

export interface EnlaceProyecto {
  id: Id;
  id_proyecto: Id;
  nombre: string;
  url: string;
}

export interface Asignacion {
  id: Id;
  /** Contiene un `Usuario.id`. */
  id_practicante: Id;
  id_proyecto: Id;
  fecha_alta: Fecha;
  fecha_baja: Fecha | null;
}

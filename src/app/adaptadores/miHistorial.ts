import type { EstadoPR, Id } from '@/domain';
import type { MiHistorial, ProyectoResumen } from '@/services';
import { diaVisiblePeru } from './reportes';

export interface FilaMiHistorial {
  id: Id;
  /** `CODIGO-NNN`, ya formateado por la consulta. */
  idLegible: string;
  titulo: string;
  proyecto: ProyectoResumen;
  /** «7 nov 2026», con el día cortado en hora de Perú; «—» si la tarea no trae fecha de término. */
  fechaTerminoTexto: string;
  /** Cuántas veces se la devolvió el supervisor. */
  vecesDevuelta: number;
  /** La etiqueta del Pull Request **ya filtrada por la regla de visibilidad** (§7.3); `null` si no se muestra. */
  estadoPr: EstadoPR | null;
}

export interface MiHistorialParaVista {
  /** De la más reciente a la más antigua, como las entrega la consulta. */
  filas: FilaMiHistorial[];
  /** Los proyectos en los que estuve (vigentes y anteriores), para el filtro. */
  proyectos: ProyectoResumen[];
}

/**
 * El historial de `listarMiHistorial` a las filas de la tabla. Solo presenta: conserva el orden de la consulta, convierte
 * la fecha de término a texto y no decide nada (qué tareas cuentan y la etiqueta del PR ya vienen decididas).
 */
export function aMiHistorial(historial: MiHistorial): MiHistorialParaVista {
  return {
    filas: historial.tareas.map((t) => ({
      id: t.id,
      idLegible: t.id_legible,
      titulo: t.titulo,
      proyecto: t.proyecto,
      fechaTerminoTexto: t.fecha_termino === null ? '—' : diaVisiblePeru(t.fecha_termino),
      vecesDevuelta: t.veces_devuelta,
      estadoPr: t.etiqueta_pr_visible,
    })),
    proyectos: historial.proyectos,
  };
}

/**
 * El proyecto del filtro que pide la dirección (`?proyecto=`), o `null` si no vale. Solo vale un proyecto en el que el
 * Practicante estuvo (`proyectos` es lo que entrega la consulta, y solo trae lo suyo): uno inválido, inexistente o ajeno
 * se ignora sin mensaje.
 */
export function idProyectoValido(
  pedido: string | null,
  proyectos: readonly Pick<ProyectoResumen, 'id'>[],
): Id | null {
  if (pedido === null) return null;
  return proyectos.some((p) => p.id === pedido) ? pedido : null;
}

export interface FiltrosMiHistorial {
  /** `null` = todos los proyectos. */
  idProyecto: Id | null;
  busqueda: string;
}

/** Minúsculas y sin tildes: «Pantalla» se encuentra buscando «pantalla». */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Las filas que cumplen el proyecto y la búsqueda por título o ID. Conserva el orden. */
export function filtrarMiHistorial(
  filas: readonly FilaMiHistorial[],
  filtros: FiltrosMiHistorial,
): FilaMiHistorial[] {
  const texto = normalizar(filtros.busqueda);
  return filas.filter(
    (f) =>
      (filtros.idProyecto === null || f.proyecto.id === filtros.idProyecto) &&
      (texto === '' ||
        normalizar(f.titulo).includes(texto) ||
        normalizar(f.idLegible).includes(texto)),
  );
}

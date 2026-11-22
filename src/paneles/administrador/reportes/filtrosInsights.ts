import type { FilaInsight } from '@/app/adaptadores';
import type { Severidad, TipoReglaInsight } from '@/domain';

/**
 * Filtros del listado de insights (§5.6): severidad, tipo, proyecto y estado.
 *
 * La consulta entrega todos los insights de quien mira, ya ordenados por severidad y antigüedad; aquí solo se
 * **presenta** según lo que la persona elige. No decide nada de negocio: «revisado» ya llega calculado para quien mira.
 */

export type EstadoDeInsights = 'ACTIVOS' | 'REVISADOS' | 'TODOS';

export interface FiltrosInsights {
  /** Vacío = todas. */
  severidad: Severidad | '';
  /** Vacío = todos los tipos. */
  tipo: TipoReglaInsight | '';
  /** Vacío = todos los proyectos. */
  idProyecto: string;
  /** Abre en «Activos»: lo revisado sale de la lista activa (§5.6). */
  estado: EstadoDeInsights;
}

export const FILTROS_INICIALES: FiltrosInsights = {
  severidad: '',
  tipo: '',
  idProyecto: '',
  estado: 'ACTIVOS',
};

/** Los insights que cumplen los filtros, en el orden recibido. No modifica la lista recibida. */
export function filtrarInsights(
  filas: readonly FilaInsight[],
  filtros: FiltrosInsights,
): FilaInsight[] {
  return filas.filter(
    (f) =>
      (filtros.severidad === '' || f.severidad === filtros.severidad) &&
      (filtros.tipo === '' || f.tipoRegla === filtros.tipo) &&
      (filtros.idProyecto === '' || f.proyectos.some((p) => p.id === filtros.idProyecto)) &&
      (filtros.estado === 'TODOS' || (filtros.estado === 'REVISADOS') === f.revisado),
  );
}

export interface OpcionDeProyecto {
  id: string;
  nombre: string;
}

/** Los proyectos a los que se refieren los insights, sin repetir y por nombre. */
export function opcionesDeProyecto(filas: readonly FilaInsight[]): OpcionDeProyecto[] {
  const vistos = new Map<string, OpcionDeProyecto>();
  for (const f of filas) for (const p of f.proyectos) vistos.set(p.id, p);
  return [...vistos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** ¿Hay algún filtro aplicado además del estado? (para el mensaje del estado vacío) */
export function hayFiltros(filtros: FiltrosInsights): boolean {
  return filtros.severidad !== '' || filtros.tipo !== '' || filtros.idProyecto !== '';
}

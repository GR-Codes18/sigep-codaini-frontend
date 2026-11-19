import type { FilaSupervisor } from '@/app/adaptadores';

/**
 * Pestañas y búsqueda del listado de Supervisores (§5.3).
 *
 * La consulta entrega el conjunto completo con sus contadores; aquí solo se **presenta** según lo que la persona elige
 * (decisión Q5 del paso 11 de la Fase 2). No decide nada de negocio.
 */

export type PestanaSupervisores = 'ACTIVOS' | 'INACTIVOS' | 'TODOS';

export interface FiltrosSupervisores {
  pestana: PestanaSupervisores;
  busqueda: string;
}

/** Abre en «Activos» (§5.3). */
export const FILTROS_INICIALES: FiltrosSupervisores = { pestana: 'ACTIVOS', busqueda: '' };

/** Minúsculas y sin tildes: «Óscar» se encuentra buscando «oscar». */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function enPestana(fila: FilaSupervisor, pestana: PestanaSupervisores): boolean {
  switch (pestana) {
    case 'ACTIVOS':
      return fila.estado === 'ACTIVO';
    case 'INACTIVOS':
      return fila.estado === 'INACTIVO';
    case 'TODOS':
      return true;
  }
}

/** Las filas que cumplen la pestaña y la búsqueda, en el orden recibido. No modifica la lista recibida. */
export function filtrarSupervisores(
  filas: readonly FilaSupervisor[],
  filtros: FiltrosSupervisores,
): FilaSupervisor[] {
  const texto = normalizar(filtros.busqueda);
  return filas.filter(
    (f) =>
      enPestana(f, filtros.pestana) &&
      (texto === '' ||
        normalizar(f.nombre).includes(texto) ||
        normalizar(f.correo).includes(texto)),
  );
}

/** ¿Hay una búsqueda aplicada además de la pestaña? (para el mensaje del estado vacío) */
export function hayFiltros(filtros: FiltrosSupervisores): boolean {
  return filtros.busqueda.trim() !== '';
}

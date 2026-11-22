import type { FilaProyecto } from '@/app/adaptadores';

/**
 * Pestañas, filtro por supervisor y búsqueda del listado de Proyectos (§5.4).
 *
 * La consulta entrega el conjunto completo con sus contadores; aquí solo se **presenta** según lo que la persona elige
 * (decisión Q5 del paso 11 de la Fase 2). No decide nada de negocio.
 */

export type PestanaProyectos = 'ACTIVO' | 'EN_PAUSA' | 'FINALIZADO' | 'TODOS';

export interface FiltrosProyectos {
  pestana: PestanaProyectos;
  /** Vacío = todos los supervisores. */
  idSupervisor: string;
  busqueda: string;
}

/** Abre en «Activos» (§5.4). */
/** Las pestañas que un enlace puede pedir con `?pestana=` (el Dashboard, §5.9). */
export const PESTANAS_DE_PROYECTOS = [
  'ACTIVO',
  'EN_PAUSA',
  'FINALIZADO',
  'TODOS',
] as const satisfies readonly PestanaProyectos[];

export const FILTROS_INICIALES: FiltrosProyectos = {
  pestana: 'ACTIVO',
  idSupervisor: '',
  busqueda: '',
};

/** Minúsculas y sin tildes: «Plataforma» se encuentra buscando «plataforma». */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Las filas que cumplen la pestaña y los filtros, en el orden recibido. No modifica la lista recibida. */
export function filtrarProyectos(
  filas: readonly FilaProyecto[],
  filtros: FiltrosProyectos,
): FilaProyecto[] {
  const texto = normalizar(filtros.busqueda);
  return filas.filter(
    (f) =>
      (filtros.pestana === 'TODOS' || f.estado === filtros.pestana) &&
      (filtros.idSupervisor === '' || f.supervisor.id === filtros.idSupervisor) &&
      (texto === '' || normalizar(f.nombre).includes(texto)),
  );
}

export interface OpcionDeFiltro {
  id: string;
  nombre: string;
}

/** Los supervisores que tienen proyectos, sin repetir y por nombre. */
export function opcionesDeSupervisor(filas: readonly FilaProyecto[]): OpcionDeFiltro[] {
  const vistos = new Map<string, OpcionDeFiltro>();
  for (const f of filas) vistos.set(f.supervisor.id, f.supervisor);
  return [...vistos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** ¿Hay algún filtro o búsqueda aplicados además de la pestaña? (para el mensaje del estado vacío) */
export function hayFiltros(filtros: FiltrosProyectos): boolean {
  return filtros.idSupervisor !== '' || filtros.busqueda.trim() !== '';
}

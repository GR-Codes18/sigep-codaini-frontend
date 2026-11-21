import type { FilaPracticanteACargo } from '@/app/adaptadores';

/**
 * Pestañas, filtro y búsqueda de «Practicantes a cargo» (§9.1.2). La consulta entrega el conjunto completo con sus
 * contadores; aquí solo se **presenta** según lo que la persona elige. Quién es activo y quién anterior ya llega decidido
 * por la consulta (`situacion`).
 */
export type PestanaACargo = 'ACTIVOS' | 'ANTERIORES';

export interface FiltrosACargo {
  pestana: PestanaACargo;
  /** Vacío = todos sus proyectos. */
  idProyecto: string;
  busqueda: string;
}

/** Abre en «Activos» (§9.1.2). */
export const FILTROS_INICIALES: FiltrosACargo = {
  pestana: 'ACTIVOS',
  idProyecto: '',
  busqueda: '',
};

/** Minúsculas y sin tildes: «Óscar» se encuentra buscando «oscar». */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Las filas que cumplen la pestaña, el proyecto y la búsqueda por nombre o correo, en el orden recibido. */
export function filtrarACargo(
  filas: readonly FilaPracticanteACargo[],
  filtros: FiltrosACargo,
): FilaPracticanteACargo[] {
  const texto = normalizar(filtros.busqueda);
  const situacion = filtros.pestana === 'ACTIVOS' ? 'ACTIVO' : 'ANTERIOR';
  return filas.filter(
    (f) =>
      f.situacion === situacion &&
      (filtros.idProyecto === '' || f.proyectos.some((p) => p.id === filtros.idProyecto)) &&
      (texto === '' ||
        normalizar(f.nombre).includes(texto) ||
        normalizar(f.correo).includes(texto)),
  );
}

export interface OpcionDeProyecto {
  id: string;
  nombre: string;
}

/** Los proyectos que aparecen en las filas (solo los suyos), sin repetir y por nombre. */
export function opcionesDeProyecto(filas: readonly FilaPracticanteACargo[]): OpcionDeProyecto[] {
  const vistos = new Map<string, OpcionDeProyecto>();
  for (const f of filas) for (const p of f.proyectos) vistos.set(p.id, p);
  return [...vistos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** ¿Hay algún filtro o búsqueda además de la pestaña? (para el mensaje del estado vacío) */
export function hayFiltros(filtros: FiltrosACargo): boolean {
  return filtros.idProyecto !== '' || filtros.busqueda.trim() !== '';
}

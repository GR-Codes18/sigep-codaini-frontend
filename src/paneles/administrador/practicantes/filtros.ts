import type { FilaPracticante } from '@/app/adaptadores';

/**
 * Pestañas, filtros y búsqueda del listado de Practicantes (§5.2).
 *
 * La consulta entrega el conjunto completo con sus contadores; aquí solo se **presenta** según lo que la persona elige
 * (decisión Q5 del paso 11 de la Fase 2). No decide nada de negocio: «Activos» incluye a los «Sin proyecto» porque así
 * lo dice la consulta (`estado` y `sinProyecto`).
 */

export type PestanaPracticantes = 'ACTIVOS' | 'SIN_PROYECTO' | 'FINALIZADOS' | 'TODOS';

export interface FiltrosPracticantes {
  pestana: PestanaPracticantes;
  /** Vacío = todas las áreas. */
  idArea: string;
  /** Vacío = todos los proyectos. */
  idProyecto: string;
  busqueda: string;
}

/** Abre en «Activos» (§5.2). */
export const FILTROS_INICIALES: FiltrosPracticantes = {
  pestana: 'ACTIVOS',
  idArea: '',
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

function enPestana(fila: FilaPracticante, pestana: PestanaPracticantes): boolean {
  switch (pestana) {
    case 'ACTIVOS':
      return fila.estado === 'ACTIVO';
    case 'SIN_PROYECTO':
      return fila.estado === 'ACTIVO' && fila.sinProyecto;
    case 'FINALIZADOS':
      return fila.estado === 'FINALIZADO';
    case 'TODOS':
      return true;
  }
}

/** Las filas que cumplen la pestaña y los filtros, en el orden recibido. No modifica la lista recibida. */
export function filtrarPracticantes(
  filas: readonly FilaPracticante[],
  filtros: FiltrosPracticantes,
): FilaPracticante[] {
  const texto = normalizar(filtros.busqueda);
  return filas.filter(
    (f) =>
      enPestana(f, filtros.pestana) &&
      (filtros.idArea === '' || f.area?.id === filtros.idArea) &&
      (filtros.idProyecto === '' || f.proyectos.some((p) => p.id === filtros.idProyecto)) &&
      (texto === '' ||
        normalizar(f.nombre).includes(texto) ||
        normalizar(f.correo).includes(texto)),
  );
}

export interface OpcionDeFiltro {
  id: string;
  nombre: string;
}

const porNombre = (a: OpcionDeFiltro, b: OpcionDeFiltro) => a.nombre.localeCompare(b.nombre, 'es');

/** Las áreas que aparecen en los practicantes, sin repetir y por nombre. */
export function opcionesDeArea(filas: readonly FilaPracticante[]): OpcionDeFiltro[] {
  const vistas = new Map<string, OpcionDeFiltro>();
  for (const f of filas) if (f.area) vistas.set(f.area.id, f.area);
  return [...vistas.values()].sort(porNombre);
}

/** Los proyectos en los que hay practicantes activos, sin repetir y por nombre. */
export function opcionesDeProyecto(filas: readonly FilaPracticante[]): OpcionDeFiltro[] {
  const vistos = new Map<string, OpcionDeFiltro>();
  for (const f of filas) for (const p of f.proyectos) vistos.set(p.id, p);
  return [...vistos.values()].sort(porNombre);
}

/** ¿Hay algún filtro o búsqueda aplicados además de la pestaña? (para el mensaje del estado vacío) */
export function hayFiltros(filtros: FiltrosPracticantes): boolean {
  return filtros.idArea !== '' || filtros.idProyecto !== '' || filtros.busqueda.trim() !== '';
}

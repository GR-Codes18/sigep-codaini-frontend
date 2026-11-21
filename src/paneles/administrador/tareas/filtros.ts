import type { FilaTarea } from '@/app/adaptadores';
import { ESTADOS_PR, type EstadoPR, type EstadoTarea } from '@/domain';

/**
 * Pestañas, filtros y búsqueda del listado de Tareas (§5.5).
 *
 * La consulta entrega el conjunto completo con sus contadores; aquí solo se **presenta** según lo que la persona elige
 * (decisión Q5 del paso 11 de la Fase 2). No decide nada de negocio: «vencida» y la etiqueta del Pull Request ya llegan
 * decididas por la consulta.
 */

export type PestanaTareas = 'TODAS' | EstadoTarea;

export interface FiltrosTareas {
  pestana: PestanaTareas;
  /** Vacío = todos los proyectos. */
  idProyecto: string;
  /** Vacío = cualquier responsable. */
  idResponsable: string;
  soloVencidas: boolean;
  soloSinAsignar: boolean;
  soloRequierenSupervision: boolean;
  /** Vacío = cualquier etiqueta. Solo cuentan las tareas cuya etiqueta se muestra. */
  estadoPr: EstadoPR | '';
  busqueda: string;
}

/** Abre en «Todas» (§5.5). */
export const FILTROS_INICIALES: FiltrosTareas = {
  pestana: 'TODAS',
  idProyecto: '',
  idResponsable: '',
  soloVencidas: false,
  soloSinAsignar: false,
  soloRequierenSupervision: false,
  estadoPr: '',
  busqueda: '',
};

export const ETIQUETA_ESTADO_PR: Record<EstadoPR, string> = {
  PENDIENTE: 'Pendiente',
  CREADO: 'Creado',
  CON_CONFLICTOS: 'Con conflictos',
  FUSIONADO: 'Fusionado',
  CERRADO: 'Cerrado',
};

export const OPCIONES_ESTADO_PR: readonly EstadoPR[] = ESTADOS_PR;

/** Minúsculas y sin tildes: «Pantalla» se encuentra buscando «pantalla». */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Las filas que cumplen la pestaña, los filtros y la búsqueda, en el orden recibido. No modifica la lista recibida. */
export function filtrarTareas(filas: readonly FilaTarea[], filtros: FiltrosTareas): FilaTarea[] {
  const texto = normalizar(filtros.busqueda);
  return filas.filter(
    (f) =>
      (filtros.pestana === 'TODAS' || f.estado === filtros.pestana) &&
      (filtros.idProyecto === '' || f.proyecto.id === filtros.idProyecto) &&
      (filtros.idResponsable === '' || f.idResponsable === filtros.idResponsable) &&
      (!filtros.soloVencidas || f.vencida) &&
      (!filtros.soloSinAsignar || f.idResponsable === null) &&
      (!filtros.soloRequierenSupervision || f.requiereSupervision) &&
      (filtros.estadoPr === '' || f.estadoPr === filtros.estadoPr) &&
      (texto === '' ||
        normalizar(f.titulo).includes(texto) ||
        normalizar(f.idLegible).includes(texto)),
  );
}

export interface OpcionDeFiltro {
  id: string;
  nombre: string;
}

const porNombre = (a: OpcionDeFiltro, b: OpcionDeFiltro) => a.nombre.localeCompare(b.nombre, 'es');

/** Los proyectos que tienen tareas, sin repetir y por nombre. */
export function opcionesDeProyecto(filas: readonly FilaTarea[]): OpcionDeFiltro[] {
  const vistos = new Map<string, OpcionDeFiltro>();
  for (const f of filas) vistos.set(f.proyecto.id, f.proyecto);
  return [...vistos.values()].sort(porNombre);
}

/** Los responsables que aparecen en las tareas, sin repetir y por nombre. */
export function opcionesDeResponsable(filas: readonly FilaTarea[]): OpcionDeFiltro[] {
  const vistos = new Map<string, OpcionDeFiltro>();
  for (const f of filas) {
    if (f.idResponsable !== null && f.responsable !== null) {
      vistos.set(f.idResponsable, { id: f.idResponsable, nombre: f.responsable });
    }
  }
  return [...vistos.values()].sort(porNombre);
}

/** ¿Hay algún filtro o búsqueda aplicados además de la pestaña? (para el mensaje del estado vacío) */
export function hayFiltros(filtros: FiltrosTareas): boolean {
  return (
    filtros.idProyecto !== '' ||
    filtros.idResponsable !== '' ||
    filtros.soloVencidas ||
    filtros.soloSinAsignar ||
    filtros.soloRequierenSupervision ||
    filtros.estadoPr !== '' ||
    filtros.busqueda.trim() !== ''
  );
}

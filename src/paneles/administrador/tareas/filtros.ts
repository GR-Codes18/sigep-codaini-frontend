import type { FilaTarea } from '@/app/adaptadores';
import { ESTADOS_PR, type EstadoPR, type EstadoTarea, type Rol } from '@/domain';

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
/** Las pestañas que un enlace puede pedir con `?pestana=` (el Dashboard, §5.9). */
export const PESTANAS_DE_TAREAS = [
  'TODAS',
  'DISPONIBLE',
  'EN_PROGRESO',
  'ESPERANDO_SUPERVISION',
  'TERMINADA',
] as const satisfies readonly PestanaTareas[];

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

/**
 * La pestaña en que abre el listado cuando nadie pidió otra. El Administrador abre en «Todas» (§5.5); el Supervisor, en
 * «Esperando supervisión» si tiene tareas ahí y, si no, en «Todas», para que su cola de revisión sea lo primero que ve (§9.1.3).
 */
export function pestanaInicialDeTareas(
  rol: Rol,
  contadores: Pick<Record<EstadoTarea, number>, 'ESPERANDO_SUPERVISION'>,
): PestanaTareas {
  return rol === 'SUPERVISOR' && contadores.ESPERANDO_SUPERVISION > 0
    ? 'ESPERANDO_SUPERVISION'
    : 'TODAS';
}

/**
 * Los filtros que pide la dirección: `?vencidas=1` y `?sin_asignar=1` (los enlaces del Dashboard, §9.1.5). Solo vale el
 * valor `1`; cualquier otra cosa se ignora y la vista abre como siempre, sin error. El filtro que llega queda activo en
 * pantalla (la casilla marcada) y se puede quitar.
 */
export function filtrosDeLaDireccion(
  parametros: Pick<URLSearchParams, 'get'>,
): Partial<Pick<FiltrosTareas, 'soloVencidas' | 'soloSinAsignar'>> {
  return {
    ...(parametros.get('vencidas') === '1' ? { soloVencidas: true } : {}),
    ...(parametros.get('sin_asignar') === '1' ? { soloSinAsignar: true } : {}),
  };
}

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

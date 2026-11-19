import type { FilaPostulacion } from '@/app/adaptadores';

/**
 * Pestañas, filtros, búsqueda y orden del listado de Postulaciones (§5.1).
 *
 * La consulta entrega el conjunto completo con su ranking y sus contadores; aquí solo se **presenta** ese conjunto
 * según lo que la persona elige (decisión Q5 del paso 11 de la Fase 2). No decide nada de negocio: «Requieren
 * revisión» son las pendientes con la marca, como las cuenta la consulta.
 */

export type PestanaPostulaciones =
  'PENDIENTES' | 'REQUIEREN_REVISION' | 'APROBADAS' | 'RECHAZADAS' | 'TODAS';

/** `PUNTAJE` es el ranking (el orden de la consulta); `FECHA`, de la más reciente a la más antigua. */
export type OrdenPostulaciones = 'PUNTAJE' | 'FECHA';

export interface FiltrosPostulaciones {
  pestana: PestanaPostulaciones;
  /** Vacío = todas las áreas. */
  idArea: string;
  /** Vacío = todas las especialidades. */
  idEspecialidad: string;
  /** Día inicial del rango, `AAAA-MM-DD`, incluido; vacío = sin límite. */
  desde: string;
  /** Día final del rango, `AAAA-MM-DD`, incluido; vacío = sin límite. */
  hasta: string;
  busqueda: string;
  orden: OrdenPostulaciones;
}

/** Abre en «Pendientes», ordenada por puntaje (§5.1). */
export const FILTROS_INICIALES: FiltrosPostulaciones = {
  pestana: 'PENDIENTES',
  idArea: '',
  idEspecialidad: '',
  desde: '',
  hasta: '',
  busqueda: '',
  orden: 'PUNTAJE',
};

/** Minúsculas y sin tildes: «Óscar» se encuentra buscando «oscar». */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function enPestana(fila: FilaPostulacion, pestana: PestanaPostulaciones): boolean {
  switch (pestana) {
    case 'PENDIENTES':
      return fila.estado === 'PENDIENTE';
    case 'REQUIEREN_REVISION':
      return fila.estado === 'PENDIENTE' && fila.requiereRevision;
    case 'APROBADAS':
      return fila.estado === 'APROBADA';
    case 'RECHAZADAS':
      return fila.estado === 'RECHAZADA';
    case 'TODAS':
      return true;
  }
}

/** Las filas que cumplen la pestaña y los filtros, en el orden elegido. No modifica la lista recibida. */
export function filtrarPostulaciones(
  filas: readonly FilaPostulacion[],
  filtros: FiltrosPostulaciones,
): FilaPostulacion[] {
  const texto = normalizar(filtros.busqueda);
  const resultado = filas.filter(
    (f) =>
      enPestana(f, filtros.pestana) &&
      (filtros.idArea === '' || f.area?.id === filtros.idArea) &&
      (filtros.idEspecialidad === '' || f.especialidad?.id === filtros.idEspecialidad) &&
      (filtros.desde === '' || f.dia >= filtros.desde) &&
      (filtros.hasta === '' || f.dia <= filtros.hasta) &&
      (texto === '' ||
        normalizar(f.nombre).includes(texto) ||
        normalizar(f.correo).includes(texto)),
  );
  if (filtros.orden === 'FECHA') {
    return [...resultado].sort(
      (a, b) => b.fecha.getTime() - a.fecha.getTime() || a.id.localeCompare(b.id),
    );
  }
  return resultado;
}

export interface OpcionDeFiltro {
  id: string;
  nombre: string;
}

const porNombre = (a: OpcionDeFiltro, b: OpcionDeFiltro) => a.nombre.localeCompare(b.nombre, 'es');

/** Las áreas que aparecen en las postulaciones, sin repetir y por nombre. */
export function opcionesDeArea(filas: readonly FilaPostulacion[]): OpcionDeFiltro[] {
  const vistas = new Map<string, OpcionDeFiltro>();
  for (const f of filas) if (f.area) vistas.set(f.area.id, f.area);
  return [...vistas.values()].sort(porNombre);
}

/** Las especialidades que aparecen en las postulaciones (de un área si se elige), sin repetir y por nombre. */
export function opcionesDeEspecialidad(
  filas: readonly FilaPostulacion[],
  idArea: string,
): OpcionDeFiltro[] {
  const vistas = new Map<string, OpcionDeFiltro>();
  for (const f of filas) {
    if (f.especialidad && (idArea === '' || f.area?.id === idArea)) {
      vistas.set(f.especialidad.id, f.especialidad);
    }
  }
  return [...vistas.values()].sort(porNombre);
}

/** ¿Hay algún filtro o búsqueda aplicados además de la pestaña? (para el mensaje del estado vacío) */
export function hayFiltros(filtros: FiltrosPostulaciones): boolean {
  return (
    filtros.idArea !== '' ||
    filtros.idEspecialidad !== '' ||
    filtros.desde !== '' ||
    filtros.hasta !== '' ||
    filtros.busqueda.trim() !== ''
  );
}

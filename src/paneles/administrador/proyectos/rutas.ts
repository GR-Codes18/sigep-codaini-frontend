import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';

/** El módulo Proyectos y sus páginas; el Administrador controla su ciclo de vida (§5.4). */
export const RUTA_PROYECTOS = `${PREFIJO_POR_ROL.ADMINISTRADOR}/proyectos`;

/** Las pestañas del detalle de un proyecto, en el parámetro `?pestana=` (permite enlazarlas). */
export const PESTANAS_DEL_PROYECTO = ['resumen', 'equipo'] as const;
export type PestanaDelProyecto = (typeof PESTANAS_DEL_PROYECTO)[number];

export const PESTANA_INICIAL: PestanaDelProyecto = 'resumen';

export function rutaDeDetalleDeProyecto(idProyecto: string, pestana?: PestanaDelProyecto): string {
  const base = `${RUTA_PROYECTOS}/${idProyecto}`;
  return pestana === undefined || pestana === PESTANA_INICIAL ? base : `${base}?pestana=${pestana}`;
}

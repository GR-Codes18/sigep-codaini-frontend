import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';

/** El módulo Postulaciones y sus páginas; solo el Administrador lo usa (§5.1). */
export const RUTA_POSTULACIONES = `${PREFIJO_POR_ROL.ADMINISTRADOR}/postulaciones`;

export const rutaDeDetalleDePostulacion = (idPostulante: string) =>
  `${RUTA_POSTULACIONES}/${idPostulante}`;

/** La sub-sección de criterios, áreas y especialidades (§5.1). */
export const RUTA_CRITERIOS = `${RUTA_POSTULACIONES}/criterios`;

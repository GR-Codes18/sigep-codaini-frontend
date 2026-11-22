import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';

/** El módulo Supervisores y sus páginas; solo el Administrador lo usa (§5.3). */
export const RUTA_SUPERVISORES = `${PREFIJO_POR_ROL.ADMINISTRADOR}/supervisores`;

export const rutaDeDetalleDeSupervisor = (idSupervisor: string) =>
  `${RUTA_SUPERVISORES}/${idSupervisor}`;

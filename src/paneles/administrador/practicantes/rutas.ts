import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';

/** El módulo Practicantes y sus páginas; solo el Administrador lo usa (§5.2). */
export const RUTA_PRACTICANTES = `${PREFIJO_POR_ROL.ADMINISTRADOR}/practicantes`;

export const rutaDeDetalleDePracticante = (idPracticante: string) =>
  `${RUTA_PRACTICANTES}/${idPracticante}`;

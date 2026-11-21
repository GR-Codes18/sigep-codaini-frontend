import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';

/** Practicantes a cargo, del Supervisor (§9.1.2): la vista transversal de las personas de sus proyectos. */
export const RUTA_PRACTICANTES_A_CARGO = `${PREFIJO_POR_ROL.SUPERVISOR}/practicantes`;

/** El detalle (de solo lectura) de un practicante a cargo. */
export const rutaDeDetalleDePracticanteACargo = (idPracticante: string) =>
  `${RUTA_PRACTICANTES_A_CARGO}/${idPracticante}`;

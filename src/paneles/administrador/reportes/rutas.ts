import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';

/** El módulo Reportes (§5.6): dos pestañas, en el parámetro `?pestana=` (permite enlazarlas). */
export const RUTA_REPORTES = `${PREFIJO_POR_ROL.ADMINISTRADOR}/reportes`;

export const PESTANAS_DE_REPORTES = ['insights', 'indicadores'] as const;
export type PestanaDeReportes = (typeof PESTANAS_DE_REPORTES)[number];

export const PESTANA_INICIAL: PestanaDeReportes = 'insights';

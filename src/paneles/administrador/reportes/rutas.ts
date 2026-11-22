import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';
import type { Rol } from '@/domain';

/** El módulo Reportes (§5.6): dos pestañas, en el parámetro `?pestana=` (permite enlazarlas). */
export const RUTA_REPORTES = `${PREFIJO_POR_ROL.ADMINISTRADOR}/reportes`;

/** Reportes lo comparten el Administrador (§5.6) y el Supervisor (§9.1.4, con datos solo de sus proyectos). */
export const rutaDeReportes = (rol: Rol = 'ADMINISTRADOR') => `${PREFIJO_POR_ROL[rol]}/reportes`;

export const PESTANAS_DE_REPORTES = ['insights', 'indicadores'] as const;
export type PestanaDeReportes = (typeof PESTANAS_DE_REPORTES)[number];

export const PESTANA_INICIAL: PestanaDeReportes = 'insights';

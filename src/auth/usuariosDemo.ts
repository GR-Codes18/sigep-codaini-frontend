import type { Id, Rol } from '@/domain';

/** IDs estables de las cuentas de la semilla que representan cada acceso rápido. */
export const IDS_ACCESO_RAPIDO: Readonly<Record<Rol, Id>> = {
  ADMINISTRADOR: 'demo-admin',
  SUPERVISOR: 'demo-supervisor',
  PRACTICANTE: 'demo-practicante',
};

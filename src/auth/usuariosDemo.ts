import type { Rol, UsuarioSesion } from './tipos';

// Credenciales de DEMOSTRACIÓN del prototipo (no son secretos reales).
// PROVISIONAL: se reemplazan por la semilla de data/ cuando exista.
export const CONTRASENA_DEMO = 'demo12345';

export type CuentaDemo = UsuarioSesion & { contrasena: string };

export const CUENTAS_DEMO: Record<Rol, CuentaDemo> = {
  ADMINISTRADOR: {
    id: 'demo-admin',
    nombre: 'Administrador Demo',
    correo: 'admin@codaini.demo',
    rol: 'ADMINISTRADOR',
    debe_cambiar_contrasena: false,
    contrasena: CONTRASENA_DEMO,
  },
  SUPERVISOR: {
    id: 'demo-supervisor',
    nombre: 'Supervisor Demo',
    correo: 'supervisor@codaini.demo',
    rol: 'SUPERVISOR',
    debe_cambiar_contrasena: false,
    contrasena: CONTRASENA_DEMO,
  },
  PRACTICANTE: {
    id: 'demo-practicante',
    nombre: 'Practicante Demo',
    correo: 'practicante@codaini.demo',
    rol: 'PRACTICANTE',
    debe_cambiar_contrasena: false,
    contrasena: CONTRASENA_DEMO,
  },
};

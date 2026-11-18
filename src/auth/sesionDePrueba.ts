import type { Rol, UsuarioSesion } from './tipos';

/** Sesiones de las cuentas de demostración de la semilla. **Solo las importan los tests.** */
const SESIONES: Record<Rol, UsuarioSesion> = {
  ADMINISTRADOR: {
    id: 'demo-admin',
    nombre: 'Administrador Demo',
    correo: 'admin@codaini.demo',
    rol: 'ADMINISTRADOR',
    debe_cambiar_contrasena: false,
  },
  SUPERVISOR: {
    id: 'demo-supervisor',
    nombre: 'Supervisor Demo',
    correo: 'supervisor@codaini.demo',
    rol: 'SUPERVISOR',
    debe_cambiar_contrasena: false,
  },
  PRACTICANTE: {
    id: 'demo-practicante',
    nombre: 'Practicante Demo',
    correo: 'practicante@codaini.demo',
    rol: 'PRACTICANTE',
    debe_cambiar_contrasena: false,
  },
};

export const sesionDePrueba = (rol: Rol): UsuarioSesion => ({ ...SESIONES[rol] });

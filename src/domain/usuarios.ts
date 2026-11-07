/**
 * Personas con cuenta: tabla base `Usuario` y sus detalles por rol.
 *
 * `Practicante` y `Supervisor` comparten la PK `id_usuario`. No hay detalle
 * para el Administrador: usa `Usuario` directamente.
 */

import type { Fecha, FechaHora, Id } from './comunes';
import type { EstadoUsuario, Rol } from './enumeraciones';

export interface Usuario {
  id: Id;
  nombre: string;
  correo: string;
  celular: string;
  /** Nunca se registra en el historial. */
  contrasena: string;
  rol: Rol;
  estado: EstadoUsuario;
  debe_cambiar_contrasena: boolean;
  fecha_alta: FechaHora;
}

export interface Practicante {
  /** PK; referencia a `Usuario.id`. */
  id_usuario: Id;
  discord: string | null;
  cuenta_github: string | null;
  disponibilidad_horaria: number | null;
  id_area_tecnica: Id;
  id_especialidad: Id;
  fecha_ingreso: Fecha;
  fecha_fin_prevista: Fecha;
  /** Postulación de origen. */
  id_postulante: Id;
}

export interface Supervisor {
  /** PK; referencia a `Usuario.id`. */
  id_usuario: Id;
  discord: string | null;
  cuenta_github: string | null;
}

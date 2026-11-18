/**
 * Entorno de los servicios: de dónde salen el almacén, la hora, los IDs, la demora y GitHub.
 *
 * Cada servicio recibe al final un `entorno` con este valor por defecto
 * (`tomarTarea(entrada, entorno = ENTORNO)`): producción no pasa nada y las pruebas pasan uno
 * propio (almacén en memoria, reloj fijo, IDs secuenciales y demora 0).
 */

import { useAlmacen, type EstadoAlmacen } from '@/data';
import type { Id } from '@/domain';
import { generarContrasenaTemporal } from './contrasena';
import { EVALUADOR_SIMULADO, type PuertoEvaluador } from './evaluador';
import { GITHUB_SIMULADO, type PuertoGitHub } from './github';

/**
 * Lo único que los servicios necesitan del almacén: leer y escribir con `transaccion`, y `restablecer` (solo lo usa
 * `restablecerDatosDemostracion`).
 */
export interface AlmacenServicio {
  getState: () => Pick<EstadoAlmacen, 'transaccion' | 'restablecer'>;
}

export interface Entorno {
  almacen: AlmacenServicio;
  /** El reloj: se llama una vez por operación, dentro de la transacción. */
  ahora: () => Date;
  /** ID nuevo con un prefijo: `evt`, `ntf`, `tar`… */
  generarId: (prefijo: string) => Id;
  /** Demora simulada de red al inicio de cada llamada, en milisegundos. */
  demoraMs: number;
  /** GitHub (simulado en el prototipo; las pruebas inyectan otras respuestas). */
  github: PuertoGitHub;
  /** El modelo que juzga los criterios de una postulación (simulado en el prototipo). */
  evaluador: PuertoEvaluador;
  /** Contraseña temporal de una cuenta nueva. */
  generarContrasena: () => string;
}

export const DEMORA_PREDETERMINADA_MS = 600;

export const ENTORNO: Entorno = {
  almacen: useAlmacen,
  ahora: () => new Date(),
  generarId: (prefijo) => `${prefijo}-${crypto.randomUUID()}`,
  demoraMs: DEMORA_PREDETERMINADA_MS,
  github: GITHUB_SIMULADO,
  evaluador: EVALUADOR_SIMULADO,
  generarContrasena: () => generarContrasenaTemporal(),
};

/** El entorno por defecto con algunas piezas cambiadas. */
export function crearEntorno(cambios: Partial<Entorno> = {}): Entorno {
  return { ...ENTORNO, ...cambios };
}

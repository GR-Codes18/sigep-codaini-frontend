/**
 * Validaciones de datos de contacto que comparten los servicios de cuentas (Fase 2, paso 8B; propuesta §8.2).
 *
 *   - Correo: formato válido y **único** entre todas las cuentas, sin distinguir mayúsculas ni espacios.
 *   - Celular (decisión F7-A): nueve dígitos que empiezan con 9, como los de la semilla. Mi perfil (paso 10)
 *     lo reutiliza.
 */

import { z } from 'zod';
import type { Id, Usuario } from '@/domain';

export const esquemaCorreo = z.string().trim().pipe(z.email('Escribe un correo válido.'));

export const esquemaCelular = z
  .string()
  .trim()
  .regex(/^9\d{8}$/, 'El celular debe tener 9 dígitos y empezar con 9.');

/** Para comparar correos: sin mayúsculas ni espacios alrededor. */
export function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}

/** ¿Hay otra cuenta con ese correo? `exceptoId` deja fuera a la propia persona al editar. */
export function correoEnUso(
  usuarios: readonly Pick<Usuario, 'id' | 'correo'>[],
  correo: string,
  exceptoId?: Id,
): boolean {
  const buscado = normalizarCorreo(correo);
  return usuarios.some((u) => u.id !== exceptoId && normalizarCorreo(u.correo) === buscado);
}

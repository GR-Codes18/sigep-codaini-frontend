import { z } from 'zod';
import type { CampoDelPerfil } from '@/domain';
import { esquemaCelular, esquemaCorreo, LARGO_MINIMO_CONTRASENA } from '@/services';

/**
 * Los campos del formulario de Mi perfil llevan los nombres de los datos (`cuenta_github`, `disponibilidad_horaria`) y
 * todos son texto: lo que se escribe. La conversión a número, o a «vacío quita el dato», la hace la pantalla al enviar.
 */
export type CampoPerfil = CampoDelPerfil;
export type DatosPerfil = Record<CampoPerfil, string>;

/**
 * Validación en el formulario, solo de los campos que dan error al instante. El correo y el celular **reutilizan los
 * esquemas del servicio** (una sola regla); Discord, GitHub y la disponibilidad los valida el servicio y su error sale
 * junto al campo.
 */
const ESQUEMA_DEL_CAMPO: Partial<Record<CampoPerfil, z.ZodType<string>>> = {
  nombre: z.string().trim().min(1, 'Escribe tu nombre.'),
  correo: esquemaCorreo,
  celular: esquemaCelular,
};

/** Valida los campos editables y devuelve el valor ya recortado, o el primer error de cada campo. */
export function validarCamposDelPerfil(
  datos: DatosPerfil,
  editables: readonly CampoPerfil[],
): { ok: true; datos: DatosPerfil } | { ok: false; errores: Partial<Record<CampoPerfil, string>> } {
  const errores: Partial<Record<CampoPerfil, string>> = {};
  const limpios: DatosPerfil = { ...datos };
  for (const campo of editables) {
    const esquema = ESQUEMA_DEL_CAMPO[campo];
    if (esquema === undefined) continue;
    const analisis = esquema.safeParse(datos[campo]);
    if (analisis.success) limpios[campo] = analisis.data;
    else errores[campo] = analisis.error.issues[0]?.message ?? 'Dato no válido.';
  }
  return Object.keys(errores).length === 0 ? { ok: true, datos: limpios } : { ok: false, errores };
}

export const esquemaContrasena = z
  .object({
    actual: z.string().min(1, 'Ingresa tu contraseña actual'),
    nueva: z.string().min(LARGO_MINIMO_CONTRASENA, `Mínimo ${LARGO_MINIMO_CONTRASENA} caracteres`),
    confirmacion: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .refine((d) => d.nueva === d.confirmacion, {
    path: ['confirmacion'],
    message: 'Las contraseñas no coinciden',
  })
  .refine((d) => d.nueva !== d.actual, {
    path: ['nueva'],
    message: 'Debe ser distinta de la actual',
  });
export type DatosContrasena = z.infer<typeof esquemaContrasena>;

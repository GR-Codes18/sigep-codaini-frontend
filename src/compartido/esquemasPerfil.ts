import { z } from 'zod';

export const esquemaPerfil = z.object({
  nombre: z.string().trim().min(1, 'Ingresa tu nombre'),
  correo: z.string().trim().min(1, 'Ingresa tu correo').pipe(z.email('Ingresa un correo válido')),
  celular: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{7,15}$/, 'Ingresa un celular válido'),
  discord: z.string().trim(),
  github: z.string().trim(),
  disponibilidad: z.coerce
    .number()
    .int('Debe ser un número entero')
    .positive('Debe ser mayor que 0'),
});
export type DatosPerfil = z.infer<typeof esquemaPerfil>;
export type CampoPerfil = keyof DatosPerfil;

export const esquemaContrasena = z
  .object({
    actual: z.string().min(1, 'Ingresa tu contraseña actual'),
    nueva: z.string().min(8, 'Mínimo 8 caracteres'),
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

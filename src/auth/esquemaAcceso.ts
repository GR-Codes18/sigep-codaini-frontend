import { z } from 'zod';

export const esquemaAcceso = z.object({
  correo: z.string().trim().min(1, 'Ingresa tu correo').pipe(z.email('Ingresa un correo válido')),
  contrasena: z.string().min(1, 'Ingresa tu contraseña'),
});
export type DatosAcceso = z.infer<typeof esquemaAcceso>;

import { z } from 'zod';

// PROVISIONAL: se reemplaza por los tipos de domain/ cuando entre feat/fase1-tipos.
export const esquemaRol = z.enum(['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE']);
export type Rol = z.infer<typeof esquemaRol>;

export const esquemaUsuarioSesion = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  correo: z.string().min(1),
  rol: esquemaRol,
  debe_cambiar_contrasena: z.boolean(),
});
export type UsuarioSesion = z.infer<typeof esquemaUsuarioSesion>;

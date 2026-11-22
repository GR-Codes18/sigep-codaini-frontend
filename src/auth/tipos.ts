import { z } from 'zod';
import { ROLES, type Rol as RolDominio, type Usuario } from '@/domain';

export const esquemaRol = z.enum(ROLES);
export type Rol = RolDominio;

export const esquemaUsuarioSesion = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  correo: z.string().min(1),
  rol: esquemaRol,
  debe_cambiar_contrasena: z.boolean(),
});
export type UsuarioSesion = Pick<
  Usuario,
  'id' | 'nombre' | 'correo' | 'rol' | 'debe_cambiar_contrasena'
>;

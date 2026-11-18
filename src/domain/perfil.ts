/**
 * Campos de «Mi perfil» por rol (propuesta §8.2).
 *
 * Qué datos personales tiene cada rol y cuáles puede editar:
 *   - Practicante: nombre, correo, celular, Discord, GitHub y disponibilidad; los edita todos.
 *   - Supervisor: nombre y correo (solo lectura: los fija el Administrador), y celular, Discord y GitHub, que edita.
 *   - Administrador: nombre, correo y celular. No tiene Discord, GitHub ni disponibilidad: esos campos **no existen**
 *     para su rol, así que no se muestran (no se trata de campos bloqueados).
 *
 * Quién puede editar cada campo no se repite aquí: lo decide `puede()` con la acción `EDITAR_*_PROPIO` de ese campo.
 * Esta función solo dice qué campos existen para el rol y, de ellos, cuáles son editables ahora. Un usuario INACTIVO no
 * puede editar nada.
 *
 * No importa React, Zustand, `data/` ni `services/`.
 */

import type { Rol } from './enumeraciones';
import { puede } from './permisos';
import type { AccionPermiso } from './permisos';
import type { Usuario } from './usuarios';

/** Los nombres son los de los datos (`cuenta_github`, `disponibilidad_horaria`). */
export const CAMPOS_DEL_PERFIL = [
  'nombre',
  'correo',
  'celular',
  'discord',
  'cuenta_github',
  'disponibilidad_horaria',
] as const;

export type CampoDelPerfil = (typeof CAMPOS_DEL_PERFIL)[number];

export interface CampoPerfilDisponible {
  campo: CampoDelPerfil;
  editable: boolean;
}

/** Los campos que tiene cada rol, en el orden en que se muestran. */
const CAMPOS_POR_ROL: Readonly<Record<Rol, readonly CampoDelPerfil[]>> = {
  PRACTICANTE: CAMPOS_DEL_PERFIL,
  SUPERVISOR: ['nombre', 'correo', 'celular', 'discord', 'cuenta_github'],
  ADMINISTRADOR: ['nombre', 'correo', 'celular'],
};

const ACCION_POR_CAMPO: Readonly<Record<CampoDelPerfil, AccionPermiso>> = {
  nombre: 'EDITAR_NOMBRE_PROPIO',
  correo: 'EDITAR_CORREO_PROPIO',
  celular: 'EDITAR_CELULAR_PROPIO',
  discord: 'EDITAR_DISCORD_PROPIO',
  cuenta_github: 'EDITAR_GITHUB_PROPIO',
  disponibilidad_horaria: 'EDITAR_DISPONIBILIDAD_PROPIA',
};

/** Los campos de Mi perfil de `usuario`: los que existen para su rol y, de ellos, los que puede editar. */
export function camposDelPerfil(usuario: Usuario): CampoPerfilDisponible[] {
  return CAMPOS_POR_ROL[usuario.rol].map((campo) => ({
    campo,
    editable: puede(usuario, ACCION_POR_CAMPO[campo], { usuario_objetivo: usuario }).permitido,
  }));
}

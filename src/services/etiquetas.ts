/**
 * Etiquetas de los elementos del historial: copia del ID legible y del título o nombre, para que el
 * evento se siga entendiendo aunque el elemento cambie o desaparezca. Mismo formato que la semilla.
 */

import {
  formatearIdLegible,
  type Postulante,
  type Proyecto,
  type Tarea,
  type Usuario,
} from '@/domain';

/** `PL2D-018 · Menú principal` */
export function etiquetaTarea(
  proyecto: Pick<Proyecto, 'codigo'>,
  tarea: Pick<Tarea, 'numero' | 'titulo'>,
): string {
  const id = formatearIdLegible(proyecto.codigo, tarea.numero);
  if (!id.ok) throw new Error(id.mensaje);
  return `${id.id} · ${tarea.titulo}`;
}

/** `PL2D · Plataforma 2D: Aventura Andina` */
export function etiquetaProyecto(proyecto: Pick<Proyecto, 'codigo' | 'nombre'>): string {
  return `${proyecto.codigo} · ${proyecto.nombre}`;
}

export function etiquetaUsuario(usuario: Pick<Usuario, 'nombre'>): string {
  return usuario.nombre;
}

export function etiquetaPostulante(postulante: Pick<Postulante, 'nombre'>): string {
  return postulante.nombre;
}

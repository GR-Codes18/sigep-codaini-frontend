/**
 * Piezas comunes de las consultas con alcance por rol (Fase 2, paso 11).
 *
 * Una consulta **lee** y nunca escribe (`ejecutarConsulta`). El orden de comprobación es el de los
 * servicios, para que el mismo caso dé el mismo código:
 *
 *   Zod → actor inexistente (`NO_ENCONTRADO`) → actor INACTIVO (`USUARIO_INACTIVO`) → vista del rol
 *   (`ROL_NO_PERMITIDO`) → recurso inexistente (`NO_ENCONTRADO`) → `puede()` sobre el recurso
 *   (`FUERA_DE_ALCANCE`) → proyección.
 *
 * Los **listados** filtran por alcance en silencio (lo ajeno no aparece) y un listado vacío es un
 * éxito: alimenta el estado vacío de la pantalla. Los **detalles** por id fallan con
 * `NO_ENCONTRADO` si no existe y `FUERA_DE_ALCANCE` si es ajeno (decisión Q3-A, igual que los
 * servicios de escritura).
 *
 * Cuando el contenido visible cambia según el rol, la consulta devuelve una variante distinta
 * (`vista`), de modo que el tipo de cada variante **no tiene** los campos que ese rol no debe ver.
 */

import { z } from 'zod';
import type { DatosAlmacen } from '@/data';
import {
  devolucionVigente,
  estaVencida,
  etiquetaPRVisible,
  formatearIdLegible,
  puede,
  type EstadoPR,
  type EstadoTarea,
  type Asignacion,
  type EventoHistorial,
  type Fecha,
  type FechaHora,
  type Id,
  type Proyecto,
  type Rol,
  type Tarea,
  type Usuario,
} from '@/domain';
import { obtenerActor } from '../actor';
import { fallo, exito, denegar, type Resultado } from '../resultado';
import { asignacionesDe, esquemaId } from '../tareas/comun';

// ── Entradas ─────────────────────────────────────────────────────────────────────────────────

export const esquemaEntradaActor = z.object({ idActor: esquemaId });
export const esquemaEntradaProyecto = z.object({ idActor: esquemaId, idProyecto: esquemaId });

export type EntradaConActor = z.input<typeof esquemaEntradaActor>;
export type EntradaConProyecto = z.input<typeof esquemaEntradaProyecto>;

// ── Actor y vista del rol ────────────────────────────────────────────────────────────────────

/** El actor existe y está ACTIVO; si no, `NO_ENCONTRADO` o `USUARIO_INACTIVO`. */
export function cargarActorActivo(
  datos: Pick<DatosAlmacen, 'usuarios'>,
  idActor: Id,
): Resultado<Usuario> {
  const actor = obtenerActor(datos, idActor);
  if (!actor.ok) return actor;
  if (actor.valor.estado !== 'ACTIVO') return fallo('USUARIO_INACTIVO');
  return actor;
}

/**
 * Esta vista es de ciertos roles (`ROL_NO_PERMITIDO` para los demás). Elige **qué proyección** ve
 * cada rol; qué proyectos o tareas entran en ella lo decide `puede()` con cada recurso.
 */
export function exigirRol(actor: Pick<Usuario, 'rol'>, roles: readonly Rol[]): Resultado<null> {
  return roles.includes(actor.rol) ? exito(null) : fallo('ROL_NO_PERMITIDO');
}

// ── Alcance de proyectos ─────────────────────────────────────────────────────────────────────

type AccionDeProyecto = 'VER_PROYECTO' | 'VER_PRACTICANTES' | 'VER_RESUMEN_PROYECTO_ANTERIOR';

/** Los proyectos que `actor` puede abrir (`VER_PROYECTO`), en el orden del almacén. */
export function proyectosVisibles(
  datos: Pick<DatosAlmacen, 'proyectos' | 'asignaciones'>,
  actor: Usuario,
): Proyecto[] {
  const asignaciones = asignacionesDe(datos, actor.id);
  return datos.proyectos.filter(
    (proyecto) => puede(actor, 'VER_PROYECTO', { proyecto, asignaciones }).permitido,
  );
}

/** Un proyecto por id con el permiso `accion`: `NO_ENCONTRADO` si no existe, el código de `puede()` si no. */
export function cargarProyectoConPermiso(
  datos: Pick<DatosAlmacen, 'proyectos' | 'asignaciones'>,
  actor: Usuario,
  idProyecto: Id,
  accion: AccionDeProyecto,
): Resultado<Proyecto> {
  const proyecto = datos.proyectos.find((p) => p.id === idProyecto);
  if (proyecto === undefined) return fallo('NO_ENCONTRADO');
  const permiso = puede(actor, accion, { proyecto, asignaciones: asignacionesDe(datos, actor.id) });
  if (!permiso.permitido) return denegar(permiso);
  return exito(proyecto);
}

// ── Nombres y autores ────────────────────────────────────────────────────────────────────────

/** Nombre de una persona; si el dato está roto, su id (nunca falla). */
export function nombreDe(usuarios: readonly Pick<Usuario, 'id' | 'nombre'>[], id: Id): string {
  return usuarios.find((u) => u.id === id)?.nombre ?? id;
}

/** Persona resumida: lo mínimo que muestra cualquier pantalla (sin correo ni celular). */
export interface PersonaResumen {
  id: Id;
  nombre: string;
}

export function personaDe(
  usuarios: readonly Pick<Usuario, 'id' | 'nombre'>[],
  id: Id,
): PersonaResumen {
  return { id, nombre: nombreDe(usuarios, id) };
}

export interface EventoConAutor {
  evento: EventoHistorial;
  /** Nombre de quien lo hizo, o «Sistema». */
  autor_nombre: string;
  /** `null` cuando el autor es el Sistema. */
  autor_rol: Rol | null;
}

/** Eventos más recientes primero, con el autor resuelto. */
export function conAutor(
  usuarios: readonly Pick<Usuario, 'id' | 'nombre' | 'rol'>[],
  eventos: readonly EventoHistorial[],
): EventoConAutor[] {
  return [...eventos]
    .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha) || (a.id < b.id ? 1 : -1))
    .map((evento) => {
      if (evento.autor.tipo === 'SISTEMA') {
        return { evento, autor_nombre: 'Sistema', autor_rol: null };
      }
      const idAutor = evento.autor.id_usuario;
      const autor = usuarios.find((u) => u.id === idAutor);
      return { evento, autor_nombre: autor?.nombre ?? idAutor, autor_rol: autor?.rol ?? null };
    });
}

// ── Tareas del tablero ───────────────────────────────────────────────────────────────────────

/** La tarea tal como la pinta una tarjeta del tablero o una fila de un listado. */
export interface TareaDeTablero {
  id: Id;
  numero: number;
  /** `CODIGO-NNN`, ya formateado. */
  id_legible: string;
  titulo: string;
  estado: EstadoTarea;
  fecha_limite: Fecha;
  /** Fecha límite pasada y tarea no terminada. */
  vencida: boolean;
  fecha_termino: FechaHora | null;
  id_practicante: Id | null;
  /** Nombre del responsable; `null` = «Sin asignar». */
  responsable: string | null;
  /** La tarea es de quien consulta (para el filtro «Solo mis tareas»). */
  es_mia: boolean;
  requiere_supervision: boolean;
  /** Etiqueta del PR **ya filtrada por la regla de visibilidad** (§7.3). */
  etiqueta_pr_visible: EstadoPR | null;
  /** Marca «Devuelta con observaciones». */
  devuelta: boolean;
}

/**
 * Proyecta una tarea para `actor`. Un Practicante solo ve la marca «Devuelta con observaciones» en
 * **sus** tareas (§9.2.1): en las ajenas llega `false`.
 */
export function aTareaDeTablero(
  datos: Pick<DatosAlmacen, 'usuarios' | 'historial'>,
  actor: Pick<Usuario, 'id' | 'rol'>,
  proyecto: Pick<Proyecto, 'codigo'>,
  tarea: Tarea,
  hoy: Fecha,
): TareaDeTablero {
  const id = formatearIdLegible(proyecto.codigo, tarea.numero);
  const esMia = tarea.id_practicante === actor.id;
  const puedeVerMarca = actor.rol !== 'PRACTICANTE' || esMia;
  return {
    id: tarea.id,
    numero: tarea.numero,
    id_legible: id.ok ? id.id : `${proyecto.codigo}-${tarea.numero}`,
    titulo: tarea.titulo,
    estado: tarea.estado,
    fecha_limite: tarea.fecha_limite,
    vencida: estaVencida(tarea, hoy),
    fecha_termino: tarea.fecha_termino,
    id_practicante: tarea.id_practicante,
    responsable:
      tarea.id_practicante === null ? null : nombreDe(datos.usuarios, tarea.id_practicante),
    es_mia: esMia,
    requiere_supervision: tarea.requiere_supervision,
    etiqueta_pr_visible: etiquetaPRVisible(tarea),
    devuelta: puedeVerMarca && devolucionVigente(tarea.id, datos.historial),
  };
}

// ── Tareas con su proyecto ───────────────────────────────────────────────────────────────────

export interface ProyectoResumen {
  id: Id;
  codigo: string;
  nombre: string;
}

export function resumenDeProyecto(
  proyecto: Pick<Proyecto, 'id' | 'codigo' | 'nombre'>,
): ProyectoResumen {
  return { id: proyecto.id, codigo: proyecto.codigo, nombre: proyecto.nombre };
}

/** Una tarea del tablero con el proyecto al que pertenece (para los listados transversales). */
export type TareaConProyecto = TareaDeTablero & { proyecto: ProyectoResumen };

export function aTareaConProyecto(
  datos: Pick<DatosAlmacen, 'usuarios' | 'historial'>,
  actor: Pick<Usuario, 'id' | 'rol'>,
  proyecto: Pick<Proyecto, 'id' | 'codigo' | 'nombre'>,
  tarea: Tarea,
  hoy: Fecha,
): TareaConProyecto {
  return {
    ...aTareaDeTablero(datos, actor, proyecto, tarea, hoy),
    proyecto: resumenDeProyecto(proyecto),
  };
}

export interface TareaConSuProyecto {
  tarea: Tarea;
  proyecto: Proyecto;
}

/** Las tareas que `actor` puede abrir (`VER_TAREA`), en el orden del almacén, con su proyecto. */
export function tareasVisibles(
  datos: Pick<DatosAlmacen, 'tareas' | 'proyectos' | 'asignaciones'>,
  actor: Usuario,
): TareaConSuProyecto[] {
  const asignaciones = asignacionesDe(datos, actor.id);
  const proyectos = new Map(datos.proyectos.map((p) => [p.id, p]));
  return datos.tareas.flatMap((tarea) => {
    const proyecto = proyectos.get(tarea.id_proyecto);
    if (proyecto === undefined) return [];
    return puede(actor, 'VER_TAREA', { proyecto, tarea, asignaciones }).permitido
      ? [{ tarea, proyecto }]
      : [];
  });
}

export interface TareaCargada {
  tarea: Tarea;
  proyecto: Proyecto;
  /** Asignaciones **de quien consulta**, listas para las reglas de `domain/`. */
  asignaciones: Asignacion[];
}

/** Una tarea por id con `VER_TAREA`: `NO_ENCONTRADO` si no existe y `FUERA_DE_ALCANCE` si es ajena. */
export function cargarTareaConPermiso(
  datos: Pick<DatosAlmacen, 'tareas' | 'proyectos' | 'asignaciones'>,
  actor: Usuario,
  idTarea: Id,
): Resultado<TareaCargada> {
  const tarea = datos.tareas.find((t) => t.id === idTarea);
  if (tarea === undefined) return fallo('NO_ENCONTRADO');
  const proyecto = datos.proyectos.find((p) => p.id === tarea.id_proyecto);
  if (proyecto === undefined) return fallo('NO_ENCONTRADO');
  const asignaciones = asignacionesDe(datos, actor.id);
  const permiso = puede(actor, 'VER_TAREA', { proyecto, tarea, asignaciones });
  if (!permiso.permitido) return denegar(permiso);
  return exito({ tarea, proyecto, asignaciones });
}

/** Los eventos de una tarea, con su autor, del más reciente al más antiguo. */
export function eventosDeLaTarea(
  datos: Pick<DatosAlmacen, 'historial' | 'usuarios'>,
  idTarea: Id,
): EventoConAutor[] {
  return conAutor(
    datos.usuarios,
    datos.historial.filter((e) => e.elemento.tipo === 'TAREA' && e.elemento.id === idTarea),
  );
}

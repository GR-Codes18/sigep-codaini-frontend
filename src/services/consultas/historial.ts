/**
 * Consultas del historial (Fase 2, paso 11D; propuesta §5.7).
 *
 *   - `listarHistorial`: la vista global, **solo del Administrador** (`VER_HISTORIAL_GLOBAL`). Es la única
 *     consulta de lectura que recibe filtros (rango de fechas, autor, categoría, tipo de elemento, proyecto y
 *     texto): el historial es lo que más crece y filtrarlo es parte de su definición (decisión Q5-A).
 *   - `obtenerLineaDeTiempo`: la línea de tiempo de una tarea, un proyecto o una persona, con el alcance de
 *     quien mira. «Lo suyo» del Practicante son los eventos de los que es autor (Q8-A) y los eventos de
 *     cuenta (`CUENTA_*`) de otras personas **nunca** salen para el Supervisor ni el Practicante.
 *
 * Los eventos son inmutables y no se guardan contraseñas (§5.7): estas consultas solo leen.
 */

import { z } from 'zod';
import type { DatosAlmacen } from '@/data';
import {
  ACCIONES_POR_CATEGORIA,
  TIPOS_ELEMENTO,
  hoyEn,
  type CategoriaEvento,
  type EventoHistorial,
  type Id,
  type TipoAccionHistorial,
  type TipoElemento,
  type Usuario,
} from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { fallo, validarEntrada, type Resultado } from '../resultado';
import { esFechaDeCalendario, esquemaId } from '../tareas/comun';
import { ejecutarConsulta } from '../transaccional';
import {
  cargarActorActivo,
  cargarProyectoConPermiso,
  cargarTareaConPermiso,
  conAutor,
  existeElemento,
  exigirPermisoDeModulo,
  type EventoConAutor,
} from './comun';
import { proyectosDelSupervisor } from './practicantes';

// ── Categoría de un evento ───────────────────────────────────────────────────────────────────

const CATEGORIAS = Object.keys(ACCIONES_POR_CATEGORIA) as [CategoriaEvento, ...CategoriaEvento[]];

/** La categoría de una acción (no se guarda: se deriva de `ACCIONES_POR_CATEGORIA`). */
export function categoriaDeAccion(accion: TipoAccionHistorial): CategoriaEvento {
  const categoria = CATEGORIAS.find((c) =>
    (ACCIONES_POR_CATEGORIA[c] as readonly string[]).includes(accion),
  );
  // Todas las acciones tienen categoría: `TipoAccionHistorial` se deriva de ese mismo mapa.
  return categoria as CategoriaEvento;
}

// ── Historial global ─────────────────────────────────────────────────────────────────────────

/** Valor de `id_autor` para los eventos automáticos del Sistema. */
export const FILTRO_AUTOR_SISTEMA = 'SISTEMA';

const esquemaFecha = z.string().refine(esFechaDeCalendario, 'La fecha no es válida (AAAA-MM-DD).');

const esquemaFiltros = z
  .object({
    /** Primer día (inclusive), fecha de calendario en hora de Perú. */
    desde: esquemaFecha.optional(),
    /** Último día (inclusive). */
    hasta: esquemaFecha.optional(),
    /** Id de la persona autora, o `FILTRO_AUTOR_SISTEMA`. */
    id_autor: esquemaId.optional(),
    categoria: z.enum(CATEGORIAS).optional(),
    tipo_elemento: z.enum(TIPOS_ELEMENTO).optional(),
    id_proyecto: esquemaId.optional(),
    /** Texto libre (por ejemplo, un ID de tarea): sin distinguir mayúsculas ni tildes. */
    texto: z.string().optional(),
  })
  .refine((f) => f.desde === undefined || f.hasta === undefined || f.desde <= f.hasta, {
    message: 'La fecha inicial no puede ser posterior a la final.',
    path: ['desde'],
  });

const esquemaEntradaHistorial = z.object({
  idActor: esquemaId,
  filtros: esquemaFiltros.optional(),
});
export type EntradaListarHistorial = z.input<typeof esquemaEntradaHistorial>;
export type FiltrosHistorial = NonNullable<EntradaListarHistorial['filtros']>;

export type EventoDeHistorial = EventoConAutor & { categoria: CategoriaEvento };

export interface ListadoHistorial {
  /** Del más reciente al más antiguo. */
  eventos: EventoDeHistorial[];
}

/** Minúsculas y sin tildes, para comparar texto. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function listarHistorial(
  entrada: EntradaListarHistorial,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<ListadoHistorial>> {
  return ejecutarConsulta(entorno, ({ datos }) => {
    const valida = validarEntrada(esquemaEntradaHistorial, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const modulo = exigirPermisoDeModulo(actor.valor, 'VER_HISTORIAL_GLOBAL');
    if (!modulo.ok) return modulo;

    const filtros = valida.valor.filtros ?? {};
    const texto = normalizar(filtros.texto ?? '');

    const coincideAutor = (e: EventoHistorial) =>
      filtros.id_autor === undefined ||
      (filtros.id_autor === FILTRO_AUTOR_SISTEMA
        ? e.autor.tipo === 'SISTEMA'
        : e.autor.tipo === 'USUARIO' && e.autor.id_usuario === filtros.id_autor);

    const candidatos = datos.historial.filter((e) => {
      const dia = hoyEn(e.fecha);
      return (
        (filtros.desde === undefined || dia >= filtros.desde) &&
        (filtros.hasta === undefined || dia <= filtros.hasta) &&
        coincideAutor(e) &&
        (filtros.categoria === undefined ||
          categoriaDeAccion(e.tipo_accion) === filtros.categoria) &&
        (filtros.tipo_elemento === undefined || e.elemento.tipo === filtros.tipo_elemento) &&
        (filtros.id_proyecto === undefined || e.id_proyecto === filtros.id_proyecto)
      );
    });

    const eventos = conAutor(datos.usuarios, candidatos)
      .filter(({ evento, autor_nombre }) =>
        [
          evento.elemento.etiqueta,
          evento.elemento.id,
          evento.tipo_accion,
          evento.nota ?? '',
          autor_nombre,
        ]
          .map(normalizar)
          .some((campo) => campo.includes(texto)),
      )
      .map((e): EventoDeHistorial => ({
        ...e,
        categoria: categoriaDeAccion(e.evento.tipo_accion),
      }));

    return { ok: true, valor: { eventos } };
  });
}

// ── Línea de tiempo ──────────────────────────────────────────────────────────────────────────

const esquemaEntradaLinea = z.object({
  idActor: esquemaId,
  elemento: z.object({ tipo: z.enum(TIPOS_ELEMENTO), id: esquemaId }),
});
export type EntradaObtenerLineaDeTiempo = z.input<typeof esquemaEntradaLinea>;

export interface LineaDeTiempo {
  elemento: { tipo: TipoElemento; id: Id };
  /** Del más reciente al más antiguo. */
  eventos: EventoConAutor[];
}

const esDeCuentaPropia = (e: EventoHistorial) =>
  (ACCIONES_POR_CATEGORIA.CUENTA_PROPIA as readonly string[]).includes(e.tipo_accion);

const esAutor = (e: EventoHistorial, id: Id) =>
  e.autor.tipo === 'USUARIO' && e.autor.id_usuario === id;

/** ¿Tiene esa persona alguna asignación (vigente o con baja) en alguno de estos proyectos? */
function tieneAsignacionEn(
  datos: Pick<DatosAlmacen, 'asignaciones'>,
  idPersona: Id,
  proyectos: ReadonlySet<Id>,
): boolean {
  return datos.asignaciones.some(
    (a) => a.id_practicante === idPersona && proyectos.has(a.id_proyecto),
  );
}

type EventosVisibles = Resultado<EventoHistorial[]>;

/** Administrador: todo lo que toca al elemento. */
function eventosDelAdministrador(datos: DatosAlmacen, tipo: TipoElemento, id: Id): EventosVisibles {
  const eventos = datos.historial.filter(
    (e) =>
      (e.elemento.tipo === tipo && e.elemento.id === id) ||
      (tipo === 'PROYECTO' && e.id_proyecto === id) ||
      (tipo === 'USUARIO' && esAutor(e, id)),
  );
  // Una tarea eliminada ya no existe, pero su historial se conserva: solo es `NO_ENCONTRADO` si no hay nada.
  if (eventos.length === 0 && !existeElemento(datos, tipo, id)) return fallo('NO_ENCONTRADO');
  return { ok: true, valor: eventos };
}

function eventosDelSupervisor(
  datos: DatosAlmacen,
  yo: Usuario,
  tipo: TipoElemento,
  id: Id,
): EventosVisibles {
  const propios = new Set(proyectosDelSupervisor(datos, yo).map((p) => p.id));
  const enSusProyectos = (e: EventoHistorial) =>
    e.id_proyecto !== null && propios.has(e.id_proyecto);

  if (tipo === 'TAREA') {
    const tarea = cargarTareaConPermiso(datos, yo, id);
    if (!tarea.ok) return tarea;
    return {
      ok: true,
      valor: datos.historial.filter(
        (e) => e.elemento.tipo === 'TAREA' && e.elemento.id === id && enSusProyectos(e),
      ),
    };
  }
  if (tipo === 'PROYECTO') {
    const proyecto = cargarProyectoConPermiso(datos, yo, id, 'VER_PROYECTO');
    if (!proyecto.ok) return proyecto;
    return { ok: true, valor: datos.historial.filter((e) => e.id_proyecto === id) };
  }
  if (tipo === 'USUARIO') {
    if (!existeElemento(datos, 'USUARIO', id)) return fallo('NO_ENCONTRADO');
    if (id !== yo.id && !tieneAsignacionEn(datos, id, propios)) return fallo('FUERA_DE_ALCANCE');
    return { ok: true, valor: datos.historial.filter((e) => esAutor(e, id) && enSusProyectos(e)) };
  }
  return fallo('FUERA_DE_ALCANCE');
}

function eventosDelPracticante(
  datos: DatosAlmacen,
  yo: Usuario,
  tipo: TipoElemento,
  id: Id,
): EventosVisibles {
  if (tipo === 'TAREA') {
    // La línea completa de cualquier tarea que pueda abrir, también la de un compañero (§6.7).
    const tarea = cargarTareaConPermiso(datos, yo, id);
    if (!tarea.ok) return tarea;
    return {
      ok: true,
      valor: datos.historial.filter((e) => e.elemento.tipo === 'TAREA' && e.elemento.id === id),
    };
  }
  if (tipo === 'PROYECTO') {
    // «Mi actividad» en el proyecto: lo que él hizo, sin la del resto del equipo.
    const proyecto = cargarProyectoConPermiso(datos, yo, id, 'VER_PROYECTO');
    if (!proyecto.ok) return proyecto;
    return {
      ok: true,
      valor: datos.historial.filter((e) => e.id_proyecto === id && esAutor(e, yo.id)),
    };
  }
  if (tipo === 'USUARIO') {
    if (!existeElemento(datos, 'USUARIO', id)) return fallo('NO_ENCONTRADO');
    if (id !== yo.id) return fallo('FUERA_DE_ALCANCE');
    return { ok: true, valor: datos.historial.filter((e) => esAutor(e, yo.id)) };
  }
  return fallo('FUERA_DE_ALCANCE');
}

export function obtenerLineaDeTiempo(
  entrada: EntradaObtenerLineaDeTiempo,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<LineaDeTiempo>> {
  return ejecutarConsulta(entorno, ({ datos }) => {
    const valida = validarEntrada(esquemaEntradaLinea, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const yo = actor.valor;
    const { tipo, id } = valida.valor.elemento;

    const visibles: EventosVisibles =
      yo.rol === 'ADMINISTRADOR'
        ? eventosDelAdministrador(datos, tipo, id)
        : yo.rol === 'SUPERVISOR'
          ? eventosDelSupervisor(datos, yo, tipo, id)
          : eventosDelPracticante(datos, yo, tipo, id);
    if (!visibles.ok) return visibles;

    // Los eventos de cuenta (nombre, correo, contraseña) son de su dueño: nadie más los ve, salvo el Administrador.
    const eventos =
      yo.rol === 'ADMINISTRADOR'
        ? visibles.valor
        : visibles.valor.filter((e) => !esDeCuentaPropia(e) || esAutor(e, yo.id));

    return {
      ok: true,
      valor: { elemento: { tipo, id }, eventos: conAutor(datos.usuarios, eventos) },
    };
  });
}

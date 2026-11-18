/**
 * Consultas de tareas (Fase 2, paso 11B; propuesta §5.5, §6.7, §9.1.3 y §9.2).
 *
 * Alcance (lo decide `puede(VER_TAREA)` con cada tarea):
 *   - Administrador: todas.
 *   - Supervisor: las de sus proyectos.
 *   - Practicante: las de sus proyectos vigentes (solo lectura las ajenas) y las que él tuvo a su cargo.
 *
 * Las acciones del detalle las calcula `accionesDeTarea` de `domain/`: la pantalla no decide qué
 * botón mostrar. Ninguna consulta escribe en `data/`.
 */

import { z } from 'zod';
import type { DatosAlmacen } from '@/data';
import {
  accionesDeTarea,
  diasEsperando,
  devolucionVigente,
  hoyEn,
  observacionDevolucionVigente,
  ordenarTareasEnCurso,
  ordenarTerminadas,
  prPorAtender,
  puede,
  vecesDevuelta,
  ESTADOS_TAREA,
  type AccionDisponible,
  type EstadoPR,
  type EstadoTarea,
  type Fecha,
  type FechaHora,
  type Id,
  type Proyecto,
  type Tarea,
  type Usuario,
} from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { asignacionesDe, esquemaId } from '../tareas/comun';
import { ejecutarConsulta } from '../transaccional';
import {
  aTareaConProyecto,
  cargarActorActivo,
  cargarTareaConPermiso,
  esquemaEntradaActor,
  eventosDeLaTarea,
  exigirRol,
  personaDe,
  proyectosVisibles,
  resumenDeProyecto,
  tareasVisibles,
  type EntradaConActor,
  type EventoConAutor,
  type PersonaResumen,
  type ProyectoResumen,
  type TareaConProyecto,
} from './comun';

// ── Listado transversal ──────────────────────────────────────────────────────────────────────

export type TareaListado = TareaConProyecto & {
  /** Días completos esperando supervisión; `null` si no está en esa columna. */
  dias_esperando: number | null;
};

export interface ListadoTareas {
  /** Por código de proyecto y número. Las pestañas y los filtros los aplica la pantalla. */
  tareas: TareaListado[];
  /** Para las pestañas: Todas, Disponibles, En progreso, Esperando supervisión y Terminadas. */
  contadores: Record<EstadoTarea | 'TODAS', number>;
}

/** Una fila del listado de tareas: la tarjeta con su proyecto y los días que lleva esperando supervisión. */
export function aTareaListado(
  datos: Pick<DatosAlmacen, 'usuarios' | 'historial'>,
  actor: Pick<Usuario, 'id' | 'rol'>,
  proyecto: Proyecto,
  tarea: Tarea,
  hoy: Fecha,
  ahora: FechaHora,
): TareaListado {
  return {
    ...aTareaConProyecto(datos, actor, proyecto, tarea, hoy),
    dias_esperando: diasEsperando(tarea, datos.historial, ahora),
  };
}

/** La cola de revisión: la que más tiempo lleva esperando primero (`dias_esperando` nulo, al final). */
export function porMasTiempoEsperando(a: TareaListado, b: TareaListado): number {
  return (
    (b.dias_esperando ?? -1) - (a.dias_esperando ?? -1) ||
    a.proyecto.codigo.localeCompare(b.proyecto.codigo) ||
    a.numero - b.numero
  );
}

/** La vista transversal de tareas (§5.5, §9.1.3), con el alcance de quien consulta. */
export function listarTareas(
  entrada: EntradaConActor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<ListadoTareas>> {
  return ejecutarConsulta(entorno, ({ datos, marca }) => {
    const valida = validarEntrada(esquemaEntradaActor, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;

    const hoy = hoyEn(marca.ahora);
    const tareas = tareasVisibles(datos, actor.valor)
      .map(({ tarea, proyecto }) =>
        aTareaListado(datos, actor.valor, proyecto, tarea, hoy, marca.ahora),
      )
      .sort((a, b) => a.proyecto.codigo.localeCompare(b.proyecto.codigo) || a.numero - b.numero);

    const contadores = { TODAS: tareas.length } as ListadoTareas['contadores'];
    for (const estado of ESTADOS_TAREA) {
      contadores[estado] = tareas.filter((t) => t.estado === estado).length;
    }
    return { ok: true, valor: { tareas, contadores } };
  });
}

// ── Detalle ──────────────────────────────────────────────────────────────────────────────────

export interface PullRequestDeTarea {
  etiqueta: EstadoPR;
  /**
   * Enlace al PR. Con la etiqueta «Pendiente» es `null` aunque la tarea conserve una URL (un PR fusionado
   * que se recalculó al volver a enviarla): esa URL no es el PR vigente.
   */
  url: string | null;
  rama_origen: string | null;
  rama_base: string | null;
}

export interface TareaDetalleVista {
  id: Id;
  numero: number;
  id_legible: string;
  titulo: string;
  descripcion: string;
  estado: EstadoTarea;
  fecha_limite: Fecha;
  vencida: boolean;
  fecha_termino: FechaHora | null;
  proyecto: ProyectoResumen & { estado: 'ACTIVO' | 'EN_PAUSA' | 'FINALIZADO' };
  responsable: PersonaResumen | null;
  es_mia: boolean;
  requiere_supervision: boolean;
  requiere_pr: boolean;
  /** `null` cuando la etiqueta no se muestra (§7.3): no hay datos de PR que enseñar. */
  pull_request: PullRequestDeTarea | null;
  /** Marca «Devuelta con observaciones». Un Practicante no la ve en tareas ajenas. */
  devuelta: boolean;
  /** Nota de la devolución vigente; `null` si no hay marca o si el Practicante no la puede ver. */
  observacion: string | null;
  dias_esperando: number | null;
  /** Lo que `quien consulta` puede hacer ahora (vacío = solo lectura). */
  acciones: AccionDisponible[];
  solo_lectura: boolean;
  /** Línea de tiempo de la tarea, del más reciente al más antiguo. */
  eventos: EventoConAutor[];
}

const esquemaEntradaTarea = z.object({ idActor: esquemaId, idTarea: esquemaId });
export type EntradaConTarea = z.input<typeof esquemaEntradaTarea>;

/** El detalle de una tarea que `VER_TAREA` permite abrir. */
export function obtenerTarea(
  entrada: EntradaConTarea,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<TareaDetalleVista>> {
  return ejecutarConsulta(entorno, ({ datos, marca }) => {
    const valida = validarEntrada(esquemaEntradaTarea, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const cargada = cargarTareaConPermiso(datos, actor.valor, valida.valor.idTarea);
    if (!cargada.ok) return cargada;
    const { tarea, proyecto, asignaciones } = cargada.valor;
    const yo = actor.valor;

    const fila = aTareaConProyecto(datos, yo, proyecto, tarea, hoyEn(marca.ahora));
    // El Practicante ve la marca y la nota solo en sus tareas (§9.2.1); `fila.devuelta` ya lo aplica.
    const observacion = fila.devuelta
      ? observacionDevolucionVigente(tarea.id, datos.historial)
      : null;
    const acciones = accionesDeTarea(tarea, yo, { proyecto, asignaciones });
    const pr = fila.etiqueta_pr_visible;

    return {
      ok: true,
      valor: {
        id: tarea.id,
        numero: tarea.numero,
        id_legible: fila.id_legible,
        titulo: tarea.titulo,
        descripcion: tarea.descripcion,
        estado: tarea.estado,
        fecha_limite: tarea.fecha_limite,
        vencida: fila.vencida,
        fecha_termino: tarea.fecha_termino,
        proyecto: { ...fila.proyecto, estado: proyecto.estado },
        responsable:
          tarea.id_practicante === null ? null : personaDe(datos.usuarios, tarea.id_practicante),
        es_mia: fila.es_mia,
        requiere_supervision: tarea.requiere_supervision,
        requiere_pr: tarea.requiere_pr,
        pull_request:
          pr === null
            ? null
            : {
                etiqueta: pr,
                url: pr === 'PENDIENTE' ? null : tarea.url_pull_request,
                rama_origen: tarea.rama_origen,
                rama_base: tarea.rama_base,
              },
        devuelta: fila.devuelta,
        observacion,
        dias_esperando: diasEsperando(tarea, datos.historial, marca.ahora),
        acciones,
        solo_lectura: acciones.length === 0,
        eventos: eventosDeLaTarea(datos, tarea.id),
      },
    };
  });
}

// ── Mi historial ─────────────────────────────────────────────────────────────────────────────

export type TareaDeHistorial = TareaConProyecto & {
  /** Cuántas veces se la devolvió el supervisor. */
  veces_devuelta: number;
};

export interface MiHistorial {
  /** Las que terminé, de la más reciente a la más antigua. */
  tareas: TareaDeHistorial[];
  /** Los proyectos en los que estuve asignado (vigentes y anteriores), para el filtro. */
  proyectos: ProyectoResumen[];
}

const esquemaEntradaHistorial = z.object({
  idActor: esquemaId,
  id_proyecto: esquemaId.optional(),
});
export type EntradaListarMiHistorial = z.input<typeof esquemaEntradaHistorial>;

/**
 * Solo Practicante (§9.2.2): las tareas que terminó, de todos sus proyectos, también los anteriores. No
 * incluye las que liberó (vuelven a DISPONIBLE y pierden al responsable); una reabierta sale mientras
 * está en progreso y vuelve al terminarse.
 */
export function listarMiHistorial(
  entrada: EntradaListarMiHistorial,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<MiHistorial>> {
  return ejecutarConsulta(entorno, ({ datos, marca }) => {
    const valida = validarEntrada(esquemaEntradaHistorial, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const rol = exigirRol(actor.valor, ['PRACTICANTE']);
    if (!rol.ok) return rol;
    const yo = actor.valor;

    const asignaciones = asignacionesDe(datos, yo.id);
    const proyectos = datos.proyectos.filter((p) =>
      asignaciones.some((a) => a.id_proyecto === p.id),
    );

    const idFiltro = valida.valor.id_proyecto;
    if (idFiltro !== undefined) {
      const elegido = datos.proyectos.find((p) => p.id === idFiltro);
      if (elegido === undefined) return fallo('NO_ENCONTRADO');
      const permiso = puede(yo, 'VER_RESUMEN_PROYECTO_ANTERIOR', {
        proyecto: elegido,
        asignaciones,
      });
      if (!permiso.permitido) return denegar(permiso);
    }

    const hoy = hoyEn(marca.ahora);
    const mias = datos.tareas.filter(
      (t) => t.id_practicante === yo.id && (idFiltro === undefined || t.id_proyecto === idFiltro),
    );
    const tareas = ordenarTerminadas(mias).flatMap((tarea): TareaDeHistorial[] => {
      const proyecto = datos.proyectos.find((p) => p.id === tarea.id_proyecto);
      if (proyecto === undefined) return [];
      return [
        {
          ...aTareaConProyecto(datos, yo, proyecto, tarea, hoy),
          veces_devuelta: vecesDevuelta(tarea.id, datos.historial),
        },
      ];
    });

    return { ok: true, valor: { tareas, proyectos: proyectos.map(resumenDeProyecto) } };
  });
}

// ── Inicio del Practicante ───────────────────────────────────────────────────────────────────

/** Mis tareas en un proyecto vigente (asignación vigente y proyecto no FINALIZADO). */
export function misTareasVigentes(
  datos: Pick<DatosAlmacen, 'tareas' | 'proyectos' | 'asignaciones'>,
  yo: Usuario,
): Tarea[] {
  const vigentes = new Map(proyectosVisibles(datos, yo).map((p) => [p.id, p]));
  return datos.tareas.filter((t) => t.id_practicante === yo.id && vigentes.has(t.id_proyecto));
}

/** Sus tareas en progreso de los proyectos vigentes, en el orden de §9.2.3 (devueltas, vencidas, fecha límite). */
export function tareasEnCursoDe(datos: DatosAlmacen, yo: Usuario, hoy: Fecha): TareaConProyecto[] {
  const mias = misTareasVigentes(datos, yo);
  const devueltas = new Set(
    mias.filter((t) => devolucionVigente(t.id, datos.historial)).map((t) => t.id),
  );
  return ordenarTareasEnCurso(mias, devueltas).flatMap((tarea): TareaConProyecto[] => {
    const proyecto = datos.proyectos.find((p) => p.id === tarea.id_proyecto);
    return proyecto === undefined ? [] : [aTareaConProyecto(datos, yo, proyecto, tarea, hoy)];
  });
}

/** Sus tareas con la etiqueta de PR visible Pendiente o Con conflictos, en proyectos vigentes. */
export function prsPorAtenderDe(datos: DatosAlmacen, yo: Usuario, hoy: Fecha): TareaConProyecto[] {
  return prPorAtender(misTareasVigentes(datos, yo)).flatMap((tarea): TareaConProyecto[] => {
    const proyecto = datos.proyectos.find((p) => p.id === tarea.id_proyecto);
    return proyecto === undefined ? [] : [aTareaConProyecto(datos, yo, proyecto, tarea, hoy)];
  });
}

export interface MisTareasEnCurso {
  /** En el orden de §9.2.3: primero las devueltas, luego las vencidas y luego por fecha límite. */
  tareas: TareaConProyecto[];
}

/** Solo Practicante: sus tareas EN_PROGRESO en sus proyectos vigentes (la carga, §6.6). */
export function listarMisTareasEnCurso(
  entrada: EntradaConActor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<MisTareasEnCurso>> {
  return ejecutarConsulta(entorno, ({ datos, marca }) => {
    const valida = validarEntrada(esquemaEntradaActor, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const rol = exigirRol(actor.valor, ['PRACTICANTE']);
    if (!rol.ok) return rol;
    const yo = actor.valor;

    return { ok: true, valor: { tareas: tareasEnCursoDe(datos, yo, hoyEn(marca.ahora)) } };
  });
}

export interface PullRequestsPorAtender {
  /** Con la etiqueta visible Pendiente o Con conflictos, por fecha límite. */
  tareas: TareaConProyecto[];
}

/**
 * Solo Practicante (§9.2.3): sus tareas cuya etiqueta de PR **visible** es Pendiente o Con conflictos, en
 * sus proyectos vigentes (en un proyecto finalizado ya no puede crear ni resolver nada). Consulta
 * `estado_pr`, no la columna del tablero.
 */
export function listarPullRequestsPorAtender(
  entrada: EntradaConActor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<PullRequestsPorAtender>> {
  return ejecutarConsulta(entorno, ({ datos, marca }) => {
    const valida = validarEntrada(esquemaEntradaActor, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const rol = exigirRol(actor.valor, ['PRACTICANTE']);
    if (!rol.ok) return rol;
    const yo = actor.valor;

    return { ok: true, valor: { tareas: prsPorAtenderDe(datos, yo, hoyEn(marca.ahora)) } };
  });
}

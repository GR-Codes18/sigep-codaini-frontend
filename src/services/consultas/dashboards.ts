/**
 * Los tres resúmenes de entrada (Fase 2, paso 11E; propuesta §5.9, §9.1.5 y §9.2.3): el Dashboard del
 * Administrador, el del Supervisor y el Inicio del Practicante.
 *
 * **No calculan nada propio** (§5.9): componen lo que ya resuelven las consultas de los pasos 11A a 11D, para que
 * haya una sola fuente de alertas y de números. Reutilizan `insightsVisibles` (alertas), `aTareaListado` y
 * `porMasTiempoEsperando` (cola de revisión), `practicantesACargoDe`, `filasDePostulaciones`, `practicantesPorArea`,
 * `tareasEnCursoDe`, `prsPorAtenderDe` y las reglas de `domain/` (`ordenarReuniones`, `avanceProyecto`,
 * `situacionPracticante`).
 *
 * Cada una es de un solo rol (`ROL_NO_PERMITIDO` para los demás). El estado vacío total (un supervisor sin
 * proyectos, un practicante sin proyecto vigente) es un **éxito** con `vacio: true` y sin tarjetas: la pantalla
 * muestra un solo mensaje. Ninguna consulta escribe en `data/`.
 */

import type { DatosAlmacen } from '@/data';
import {
  avanceProyecto,
  estaVencida,
  hoyEn,
  ordenarReuniones,
  situacionPracticante,
  type EstadoProyecto,
  type FechaHora,
  type Proporcion,
  type Proyecto,
  type ReunionProxima,
  type Usuario,
} from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { exito, validarEntrada, type Resultado } from '../resultado';
import { umbralesDe } from '../seguimiento/comun';
import { ejecutarConsulta } from '../transaccional';
import {
  cargarActorActivo,
  esquemaEntradaActor,
  exigirRol,
  proyectosVisibles,
  resumenDeProyecto,
  type EntradaConActor,
  type ProyectoResumen,
  type TareaConProyecto,
} from './comun';
import { filasDePostulaciones, type PostulacionListado } from './postulaciones';
import {
  practicantesACargoDe,
  practicantesConCuenta,
  proyectosDelSupervisor,
} from './practicantes';
import {
  insightsVisibles,
  practicantesPorArea,
  type InsightVista,
  type PracticantesDeArea,
} from './reportes';
import {
  aTareaListado,
  misTareasVigentes,
  porMasTiempoEsperando,
  prsPorAtenderDe,
  tareasEnCursoDe,
  type TareaListado,
} from './tareas';

/** Cuántas alertas, tareas por revisar y postulaciones muestran los bloques de los resúmenes (§5.9, §9.1.5). */
export const MAXIMO_ALERTAS = 5;
export const MAXIMO_POR_REVISAR = 5;
export const MAXIMO_POSTULACIONES = 5;

// ── Bloques compartidos ──────────────────────────────────────────────────────────────────────

export interface ReunionDeResumen extends ReunionProxima {
  proyecto: ProyectoResumen;
}

export interface AvanceDeProyecto {
  proyecto: ProyectoResumen;
  estado: EstadoProyecto;
  /** Tareas terminadas sobre el total; `null` si el proyecto no tiene tareas. */
  avance: Proporcion | null;
}

export interface TareasEsperando {
  /** Las que esperan una decisión del supervisor. */
  total: number;
  /** De ellas, las que llevan el plazo de «Supervisión demorada» de Configuración o más (hoy, 3 días). */
  demoradas: number;
}

export interface AlertasDeResumen {
  /** Los insights vigentes **no revisados**, de Crítico a Informativo y los más antiguos primero. */
  alertas: InsightVista[];
  /** Cuántas alertas activas hay en total (las que no caben en el tope). */
  total_alertas: number;
}

/** El plazo de «Supervisión demorada» vigente; `CONFIGURACION_INVALIDA` si el parámetro falta. */
function plazoDeDemora(datos: Pick<DatosAlmacen, 'parametros'>): Resultado<number> {
  const umbrales = umbralesDe(datos.parametros);
  return umbrales.ok ? exito(umbrales.valor.INSIGHT_SUPERVISION_DEMORADA_DIAS) : umbrales;
}

function alertasDe(
  datos: DatosAlmacen,
  actor: Usuario,
  ahora: FechaHora,
): Resultado<AlertasDeResumen> {
  const insights = insightsVisibles(datos, actor, ahora);
  if (!insights.ok) return insights;
  const activos = insights.valor.filter((i) => !i.revisado);
  return exito({ alertas: activos.slice(0, MAXIMO_ALERTAS), total_alertas: activos.length });
}

/** Los proyectos sin finalizar: los que tienen reunión y avance (en pausa, «todo lo demás sigue igual», §5.4). */
function sinFinalizar(proyectos: readonly Proyecto[]): Proyecto[] {
  return proyectos.filter((p) => p.estado !== 'FINALIZADO');
}

function reunionesDe(proyectos: readonly Proyecto[], ahora: FechaHora): ReunionDeResumen[] {
  return ordenarReuniones(proyectos, ahora).flatMap((reunion) => {
    const proyecto = proyectos.find((p) => p.id === reunion.id_proyecto);
    return proyecto === undefined ? [] : [{ ...reunion, proyecto: resumenDeProyecto(proyecto) }];
  });
}

function avancesDe(datos: Pick<DatosAlmacen, 'tareas'>, proyectos: readonly Proyecto[]) {
  return proyectos.map((p): AvanceDeProyecto => ({
    proyecto: resumenDeProyecto(p),
    estado: p.estado,
    avance: avanceProyecto(p.id, datos.tareas),
  }));
}

/** Las tareas de estos proyectos que esperan supervisión: la cola completa, la más antigua primero. */
function colaDeRevision(
  datos: DatosAlmacen,
  actor: Usuario,
  proyectos: readonly Proyecto[],
  hoy: string,
  ahora: FechaHora,
): TareaListado[] {
  return proyectos
    .flatMap((proyecto) =>
      datos.tareas
        .filter((t) => t.id_proyecto === proyecto.id && t.estado === 'ESPERANDO_SUPERVISION')
        .map((tarea) => aTareaListado(datos, actor, proyecto, tarea, hoy, ahora)),
    )
    .sort(porMasTiempoEsperando);
}

function contarEsperando(cola: readonly TareaListado[], plazo: number): TareasEsperando {
  return {
    total: cola.length,
    demoradas: cola.filter((t) => t.dias_esperando !== null && t.dias_esperando >= plazo).length,
  };
}

function contarPorEstado(proyectos: readonly Proyecto[]) {
  return {
    activos: proyectos.filter((p) => p.estado === 'ACTIVO').length,
    en_pausa: proyectos.filter((p) => p.estado === 'EN_PAUSA').length,
  };
}

// ── Dashboard del Administrador ──────────────────────────────────────────────────────────────

export interface DashboardAdministrador {
  tarjetas: {
    /** Pendientes y, de ellas, las que requieren revisión manual. */
    postulaciones: { pendientes: number; requieren_revision: number };
    proyectos: { activos: number; en_pausa: number };
    /** Activos (incluye a los «Sin proyecto») y, de ellos, los que no tienen proyecto. */
    practicantes: { activos: number; sin_proyecto: number };
    tareas_esperando_supervision: TareasEsperando;
  };
  /** El plazo de «Supervisión demorada» con el que se cuentan las `demoradas`. */
  plazo_demora_dias: number;
  /** Las pendientes de mayor puntaje (§5.9). */
  postulaciones_pendientes: PostulacionListado[];
  /** La cola de tareas esperando supervisión, la que más lleva primero. */
  por_revisar: TareaListado[];
  alertas: InsightVista[];
  total_alertas: number;
  practicantes_por_area: PracticantesDeArea[];
  proximas_reuniones: ReunionDeResumen[];
  avance_proyectos: AvanceDeProyecto[];
}

export function obtenerDashboardAdministrador(
  entrada: EntradaConActor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<DashboardAdministrador>> {
  return ejecutarConsulta(entorno, ({ datos, marca }) => {
    const valida = validarEntrada(esquemaEntradaActor, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const rol = exigirRol(actor.valor, ['ADMINISTRADOR']);
    if (!rol.ok) return rol;
    const yo = actor.valor;

    const plazo = plazoDeDemora(datos);
    if (!plazo.ok) return plazo;
    const alertas = alertasDe(datos, yo, marca.ahora);
    if (!alertas.ok) return alertas;

    const hoy = hoyEn(marca.ahora);
    const pendientes = filasDePostulaciones(datos).filter((p) => p.estado === 'PENDIENTE');
    const situaciones = practicantesConCuenta(datos).map(({ usuario }) =>
      situacionPracticante(usuario, datos.asignaciones, datos.proyectos),
    );
    const cola = colaDeRevision(datos, yo, datos.proyectos, hoy, marca.ahora);
    const enCurso = sinFinalizar(datos.proyectos);

    return {
      ok: true,
      valor: {
        tarjetas: {
          postulaciones: {
            pendientes: pendientes.length,
            requieren_revision: pendientes.filter((p) => p.requiere_revision_manual).length,
          },
          proyectos: contarPorEstado(datos.proyectos),
          practicantes: {
            activos: situaciones.filter((s) => s.estado === 'ACTIVO').length,
            sin_proyecto: situaciones.filter((s) => s.sin_proyecto).length,
          },
          tareas_esperando_supervision: contarEsperando(cola, plazo.valor),
        },
        plazo_demora_dias: plazo.valor,
        postulaciones_pendientes: pendientes.slice(0, MAXIMO_POSTULACIONES),
        por_revisar: cola.slice(0, MAXIMO_POR_REVISAR),
        alertas: alertas.valor.alertas,
        total_alertas: alertas.valor.total_alertas,
        practicantes_por_area: practicantesPorArea(datos),
        proximas_reuniones: reunionesDe(enCurso, marca.ahora),
        avance_proyectos: avancesDe(datos, enCurso),
      },
    };
  });
}

// ── Dashboard del Supervisor ─────────────────────────────────────────────────────────────────

export interface DashboardSupervisor {
  vacio: false;
  tarjetas: {
    tareas_esperando_supervision: TareasEsperando;
    proyectos: { activos: number; en_pausa: number };
    /** Practicantes a cargo activos y, de ellos, los que no tienen tareas en progreso. */
    practicantes: { activos: number; sin_tareas_en_progreso: number };
    /** Sin terminar y con la fecha límite pasada; de ellas, las que no tienen responsable. */
    tareas_vencidas: { total: number; sin_asignar: number };
  };
  plazo_demora_dias: number;
  /** Las que más tiempo llevan esperando su supervisión (§9.1.5). */
  por_revisar: TareaListado[];
  alertas: InsightVista[];
  total_alertas: number;
  proximas_reuniones: ReunionDeResumen[];
  avance_proyectos: AvanceDeProyecto[];
}

/** Un Supervisor sin proyectos: un solo mensaje, sin tarjetas. */
export interface DashboardSupervisorVacio {
  vacio: true;
}

export function obtenerDashboardSupervisor(
  entrada: EntradaConActor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<DashboardSupervisor | DashboardSupervisorVacio>> {
  return ejecutarConsulta<DashboardSupervisor | DashboardSupervisorVacio>(
    entorno,
    ({ datos, marca }) => {
      const valida = validarEntrada(esquemaEntradaActor, entrada);
      if (!valida.ok) return valida;
      const actor = cargarActorActivo(datos, valida.valor.idActor);
      if (!actor.ok) return actor;
      const rol = exigirRol(actor.valor, ['SUPERVISOR']);
      if (!rol.ok) return rol;
      const yo = actor.valor;

      const suyos = proyectosDelSupervisor(datos, yo);
      if (suyos.length === 0) return { ok: true, valor: { vacio: true } };

      const plazo = plazoDeDemora(datos);
      if (!plazo.ok) return plazo;
      const alertas = alertasDe(datos, yo, marca.ahora);
      if (!alertas.ok) return alertas;

      const hoy = hoyEn(marca.ahora);
      const ids = new Set(suyos.map((p) => p.id));
      const cola = colaDeRevision(datos, yo, suyos, hoy, marca.ahora);
      const activos = practicantesACargoDe(datos, yo).filter((p) => p.situacion === 'ACTIVO');
      const vencidas = datos.tareas.filter((t) => ids.has(t.id_proyecto) && estaVencida(t, hoy));
      const enCurso = sinFinalizar(suyos);

      return {
        ok: true,
        valor: {
          vacio: false,
          tarjetas: {
            tareas_esperando_supervision: contarEsperando(cola, plazo.valor),
            proyectos: contarPorEstado(suyos),
            practicantes: {
              activos: activos.length,
              sin_tareas_en_progreso: activos.filter((p) => p.carga === 0).length,
            },
            tareas_vencidas: {
              total: vencidas.length,
              sin_asignar: vencidas.filter((t) => t.id_practicante === null).length,
            },
          },
          plazo_demora_dias: plazo.valor,
          por_revisar: cola.slice(0, MAXIMO_POR_REVISAR),
          alertas: alertas.valor.alertas,
          total_alertas: alertas.valor.total_alertas,
          proximas_reuniones: reunionesDe(enCurso, marca.ahora),
          avance_proyectos: avancesDe(datos, enCurso),
        },
      };
    },
  );
}

// ── Inicio del Practicante ───────────────────────────────────────────────────────────────────

export interface InicioPracticante {
  vacio: false;
  tarjetas: {
    /** La carga, sin límite (§6.6). */
    en_progreso: number;
    /** De ellas, las devueltas con observaciones. */
    devueltas: number;
    esperando_supervision: number;
    /** Disponibles en sus proyectos **activos**: un proyecto en pausa no cuenta. */
    disponibles: number;
  };
  /** Devueltas, luego vencidas y luego por fecha límite (§9.2.3). */
  en_curso: TareaConProyecto[];
  pull_requests_por_atender: TareaConProyecto[];
  proximas_reuniones: ReunionDeResumen[];
}

/** Un Practicante sin proyecto vigente: un solo mensaje, sin tarjetas. */
export interface InicioPracticanteVacio {
  vacio: true;
}

export function obtenerInicioPracticante(
  entrada: EntradaConActor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<InicioPracticante | InicioPracticanteVacio>> {
  return ejecutarConsulta<InicioPracticante | InicioPracticanteVacio>(
    entorno,
    ({ datos, marca }) => {
      const valida = validarEntrada(esquemaEntradaActor, entrada);
      if (!valida.ok) return valida;
      const actor = cargarActorActivo(datos, valida.valor.idActor);
      if (!actor.ok) return actor;
      const rol = exigirRol(actor.valor, ['PRACTICANTE']);
      if (!rol.ok) return rol;
      const yo = actor.valor;

      const vigentes = proyectosVisibles(datos, yo);
      if (vigentes.length === 0) return { ok: true, valor: { vacio: true } };

      const hoy = hoyEn(marca.ahora);
      const enCurso = tareasEnCursoDe(datos, yo, hoy);
      const activos = new Set(vigentes.filter((p) => p.estado === 'ACTIVO').map((p) => p.id));

      return {
        ok: true,
        valor: {
          vacio: false,
          tarjetas: {
            en_progreso: enCurso.length,
            devueltas: enCurso.filter((t) => t.devuelta).length,
            esperando_supervision: misTareasVigentes(datos, yo).filter(
              (t) => t.estado === 'ESPERANDO_SUPERVISION',
            ).length,
            disponibles: datos.tareas.filter(
              (t) => t.estado === 'DISPONIBLE' && activos.has(t.id_proyecto),
            ).length,
          },
          en_curso: enCurso,
          pull_requests_por_atender: prsPorAtenderDe(datos, yo, hoy),
          proximas_reuniones: reunionesDe(sinFinalizar(vigentes), marca.ahora),
        },
      };
    },
  );
}

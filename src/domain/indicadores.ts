/**
 * Indicadores de Reportes (Fase 1, paso 9; propuesta §5.6, §9.1.4 y §11).
 *
 * Los indicadores no se guardan: se calculan cada vez a partir del historial, el estado actual de
 * las tareas y el momento del cálculo (`ahora`), que llega por parámetro. Esta capa no lee el
 * reloj ni importa React, Zustand, `data/` ni `services/`.
 *
 * Reglas acordadas por los autores (detalle en DECISIONES.md, paso 9):
 *   - Hitos: tomada = `TAREA_TOMADA`; enviada = `TAREA_ENVIADA_A_SUPERVISION`; devuelta =
 *     `TAREA_DEVUELTA`; terminada = tarea que hoy está TERMINADA, anclada en su `fecha_termino`.
 *     `TAREA_REABIERTA` no es una devolución. Los eventos de tareas que ya no existen (eliminadas)
 *     no cuentan: solo se miran las tareas de `datos.tareas`.
 *   - Tiempo de ciclo neto: suma de los tramos que van de cada `TOMADA` o `REABIERTA` a la
 *     siguiente `LIBERADA`, `TERMINADA` o `APROBADA`. Enviar y devolver no cortan el tramo.
 *   - Espera de supervisión: una muestra por cada envío ya respondido, anclada en la respuesta.
 *   - Tasa de devolución: tareas con al menos un envío del periodo devuelto / tareas con al menos
 *     un envío en el periodo. El ancla es el envío; un envío sin respuesta cuenta en el
 *     denominador.
 *   - Periodo: `dias` días de calendario en hora de Perú (entero de 1 a 365), incluido hoy, desde
 *     las 00:00 del primer día hasta `ahora`.
 *   - Sin muestras el resultado es `null` (los conteos dan 0). Las duraciones van en días con un
 *     decimal y los porcentajes enteros, con las mitades hacia arriba.
 *   - Alcance: los proyectos con `puede(usuario, 'VER_REPORTES', { proyecto })`, finalizados
 *     incluidos. Las métricas de cada fila solo cuentan tareas y eventos de esos proyectos (y del
 *     filtro). El resultado no tiene datos de postulaciones ni de área técnica.
 *   - Filas por practicante: quienes tienen una asignación a un proyecto del alcance que se cruza
 *     con el periodo, es decir, con alta no posterior a hoy y baja nula o desde el primer día.
 *
 * Orden de comprobación de `indicadoresParaUsuario`: `ahora` → periodo → alcance → filtro →
 * cálculo.
 */

import type { FechaHora, Id } from './comunes';
import type { TipoAccionHistorial } from './enumeraciones';
import type { AutorEvento, EventoHistorial } from './historial';
import { puede } from './permisos';
import type { Asignacion, Proyecto } from './proyectos';
import type { Tarea } from './tareas';
import {
  MS_POR_DIA,
  aFechaHora,
  diasCompletos,
  esAhoraValido,
  hoyEn,
  inicioDelDia,
  ultimaFecha,
} from './tiempo';
import type { Usuario } from './usuarios';

/** Códigos de error de esta capa. */
export const CODIGOS_INDICADORES = ['AHORA_INVALIDO', 'PERIODO_INVALIDO'] as const;

export type CodigoIndicadores = (typeof CODIGOS_INDICADORES)[number];

/** Periodo por defecto del selector de Reportes (§5.6). No es un parámetro de Configuración. */
export const DIAS_PERIODO_PREDETERMINADO = 30;

/**
 * Tope del periodo: un año. Sin tope, un número enorme saca la fecha del rango de `Date` y
 * `toISOString` lanza `RangeError` en vez de devolver `PERIODO_INVALIDO`.
 */
export const DIAS_PERIODO_MAXIMO = 365;

/** Un porcentaje siempre acompañado de lo que lo explica. */
export interface Proporcion {
  numerador: number;
  denominador: number;
  /** Entero, con las mitades hacia arriba. */
  porcentaje: number;
}

/** Datos sobre los que se calculan los indicadores. `tareas` ya no incluye las eliminadas. */
export interface DatosIndicadores {
  proyectos: readonly Proyecto[];
  asignaciones: readonly Asignacion[];
  tareas: readonly Tarea[];
  historial: readonly EventoHistorial[];
}

export interface FiltroIndicadores {
  /** Días del periodo, incluido hoy; entero de 1 a `DIAS_PERIODO_MAXIMO`. */
  dias: number;
  /** Un proyecto del alcance, o `null` para todos. */
  id_proyecto: Id | null;
}

export interface PeriodoIndicadores {
  desde: FechaHora;
  hasta: FechaHora;
  dias: number;
}

/** Un envío a supervisión con su respuesta (`fin`), o abierto (`fin: null`). Tiempos en ms. */
export interface EnvioSupervision {
  inicio: number;
  fin: number | null;
  devuelta: boolean;
  autor_envio: AutorEvento;
}

export interface ResumenIndicadores {
  tareas_terminadas: number;
  /** Días con un decimal, o `null` sin muestras. */
  tiempo_ciclo_dias: number | null;
  espera_supervision_dias: number | null;
  tasa_devolucion: Proporcion | null;
}

export interface IndicadoresProyecto extends ResumenIndicadores {
  id_proyecto: Id;
  avance: Proporcion | null;
  ultima_actividad: FechaHora | null;
}

export interface IndicadoresPracticante {
  id_practicante: Id;
  tareas_terminadas: number;
  tiempo_ciclo_dias: number | null;
  tasa_devolucion: Proporcion | null;
  carga: number;
  ultima_actividad: FechaHora | null;
}

export type ResultadoIndicadores =
  | {
      ok: true;
      periodo: PeriodoIndicadores;
      resumen: ResumenIndicadores;
      por_proyecto: IndicadoresProyecto[];
      por_practicante: IndicadoresPracticante[];
    }
  | { ok: false; codigo: CodigoIndicadores; mensaje: string };

interface PeriodoMs {
  desde: number;
  hasta: number;
}

const INICIOS_TRAMO: readonly TipoAccionHistorial[] = ['TAREA_TOMADA', 'TAREA_REABIERTA'];
const FINES_TRAMO: readonly TipoAccionHistorial[] = [
  'TAREA_LIBERADA',
  'TAREA_TERMINADA',
  'TAREA_APROBADA',
];
const RESPUESTAS_SUPERVISION: readonly TipoAccionHistorial[] = ['TAREA_APROBADA', 'TAREA_DEVUELTA'];

function proporcion(numerador: number, denominador: number): Proporcion | null {
  return denominador === 0
    ? null
    : { numerador, denominador, porcentaje: Math.round((100 * numerador) / denominador) };
}

/** Promedio de duraciones en ms, en días con un decimal; `null` sin muestras. */
function promedioEnDias(duraciones: readonly number[]): number | null {
  if (duraciones.length === 0) return null;
  const suma = duraciones.reduce((a, b) => a + b, 0);
  return Math.round((10 * suma) / (duraciones.length * MS_POR_DIA)) / 10;
}

function enPeriodo(ms: number, periodo: PeriodoMs): boolean {
  return ms >= periodo.desde && ms <= periodo.hasta;
}

function porFecha(a: EventoHistorial, b: EventoHistorial): number {
  return Date.parse(a.fecha) - Date.parse(b.fecha);
}

function esAutor(autor: AutorEvento, idUsuario: Id): boolean {
  return autor.tipo === 'USUARIO' && autor.id_usuario === idUsuario;
}

/** Eventos de una tarea en orden cronológico. Devuelve una copia: no ordena `historial`. */
function eventosDeTarea(idTarea: Id, historial: readonly EventoHistorial[]): EventoHistorial[] {
  return historial
    .filter((e) => e.elemento.tipo === 'TAREA' && e.elemento.id === idTarea)
    .sort(porFecha);
}

/** Avance de un proyecto: terminadas sobre el total. `null` si no tiene tareas. */
export function avanceProyecto(idProyecto: Id, tareas: readonly Tarea[]): Proporcion | null {
  const delProyecto = tareas.filter((t) => t.id_proyecto === idProyecto);
  return proporcion(delProyecto.filter((t) => t.estado === 'TERMINADA').length, delProyecto.length);
}

/**
 * Tiempo de ciclo neto de una tarea TERMINADA, en ms: la suma de los tramos que van de cada
 * `TOMADA` o `REABIERTA` a la siguiente `LIBERADA`, `TERMINADA` o `APROBADA`, hasta su
 * `fecha_termino`. `null` si no está terminada o si no hay ningún tramo cerrado.
 */
export function tiempoCicloMs(tarea: Tarea, historial: readonly EventoHistorial[]): number | null {
  if (tarea.estado !== 'TERMINADA' || tarea.fecha_termino === null) return null;
  const termino = Date.parse(tarea.fecha_termino);
  let inicio: number | null = null;
  let total = 0;
  let hubo = false;
  for (const e of eventosDeTarea(tarea.id, historial)) {
    const ms = Date.parse(e.fecha);
    if (ms > termino) break;
    if (INICIOS_TRAMO.includes(e.tipo_accion)) {
      if (inicio === null) inicio = ms;
    } else if (FINES_TRAMO.includes(e.tipo_accion) && inicio !== null) {
      total += ms - inicio;
      inicio = null;
      hubo = true;
    }
  }
  return hubo ? total : null;
}

/**
 * Los envíos a supervisión de una tarea, en orden, cada uno con su respuesta (aprobada o
 * devuelta) o abierto si aún no la tiene. Una respuesta sin envío abierto no forma tramo.
 */
export function enviosASupervision(
  idTarea: Id,
  historial: readonly EventoHistorial[],
): EnvioSupervision[] {
  const envios: EnvioSupervision[] = [];
  for (const e of eventosDeTarea(idTarea, historial)) {
    const abierto = envios.at(-1);
    if (e.tipo_accion === 'TAREA_ENVIADA_A_SUPERVISION') {
      envios.push({
        inicio: Date.parse(e.fecha),
        fin: null,
        devuelta: false,
        autor_envio: e.autor,
      });
    } else if (
      RESPUESTAS_SUPERVISION.includes(e.tipo_accion) &&
      abierto !== undefined &&
      abierto.fin === null
    ) {
      abierto.fin = Date.parse(e.fecha);
      abierto.devuelta = e.tipo_accion === 'TAREA_DEVUELTA';
    }
  }
  return envios;
}

/** Instante del último envío a supervisión de la tarea, o `null` si nunca se envió. */
export function instanteUltimoEnvio(
  idTarea: Id,
  historial: readonly EventoHistorial[],
): number | null {
  return ultimaFecha(
    historial.filter(
      (e) =>
        e.tipo_accion === 'TAREA_ENVIADA_A_SUPERVISION' &&
        e.elemento.tipo === 'TAREA' &&
        e.elemento.id === idTarea,
    ),
  );
}

/**
 * Días completos que una tarea lleva esperando supervisión, contados desde su último envío.
 * `null` si no está en ESPERANDO_SUPERVISION o si no hay evento de envío. `ahora` debe ser
 * válido (lo comprueba quien llama).
 */
export function diasEsperando(
  tarea: Pick<Tarea, 'id' | 'estado'>,
  historial: readonly EventoHistorial[],
  ahora: FechaHora,
): number | null {
  if (tarea.estado !== 'ESPERANDO_SUPERVISION') return null;
  const envio = instanteUltimoEnvio(tarea.id, historial);
  return envio === null ? null : diasCompletos(envio, Date.parse(ahora));
}

/** Cuántas veces se devolvió una tarea. Reabrir no cuenta. */
export function vecesDevuelta(idTarea: Id, historial: readonly EventoHistorial[]): number {
  return historial.filter(
    (e) =>
      e.tipo_accion === 'TAREA_DEVUELTA' &&
      e.elemento.tipo === 'TAREA' &&
      e.elemento.id === idTarea,
  ).length;
}

/**
 * Proyectos que cuentan para la carga de un practicante: los de sus asignaciones vigentes (sin
 * `fecha_baja`) que no están FINALIZADO, en el orden de sus asignaciones. Incluye los EN_PAUSA.
 */
export function proyectosDeCarga(
  idPracticante: Id,
  asignaciones: readonly Asignacion[],
  proyectos: readonly Pick<Proyecto, 'id' | 'estado'>[],
): Id[] {
  const vigentes = new Set(
    asignaciones
      .filter((a) => a.id_practicante === idPracticante && a.fecha_baja === null)
      .map((a) => a.id_proyecto),
  );
  return [...vigentes].filter((id) => {
    const p = proyectos.find((candidato) => candidato.id === id);
    return p !== undefined && p.estado !== 'FINALIZADO';
  });
}

/** Carga de un practicante: sus tareas EN_PROGRESO en los proyectos indicados (§6.6). */
export function cargaDePracticante(
  idPracticante: Id,
  tareas: readonly Tarea[],
  idsProyecto: readonly Id[],
): number {
  return tareas.filter(
    (t) =>
      t.id_practicante === idPracticante &&
      t.estado === 'EN_PROGRESO' &&
      idsProyecto.includes(t.id_proyecto),
  ).length;
}

/** Última acción registrada por una persona (no las que otras hacen sobre ella), o `null`. */
export function ultimaActividadDeUsuario(
  idUsuario: Id,
  historial: readonly EventoHistorial[],
): FechaHora | null {
  const ms = ultimaFecha(historial.filter((e) => esAutor(e.autor, idUsuario)));
  return ms === null ? null : aFechaHora(ms);
}

/** Último evento registrado en un proyecto, de cualquier autor, o `null`. */
export function ultimaActividadDeProyecto(
  idProyecto: Id,
  historial: readonly EventoHistorial[],
): FechaHora | null {
  const ms = ultimaFecha(historial.filter((e) => e.id_proyecto === idProyecto));
  return ms === null ? null : aFechaHora(ms);
}

/** Tareas TERMINADA cuya `fecha_termino` cae en el periodo (y, si se indica, de ese responsable). */
function terminadasEnPeriodo(
  tareas: readonly Tarea[],
  periodo: PeriodoMs,
  idPracticante?: Id,
): Tarea[] {
  return tareas.filter(
    (t) =>
      t.estado === 'TERMINADA' &&
      t.fecha_termino !== null &&
      enPeriodo(Date.parse(t.fecha_termino), periodo) &&
      (idPracticante === undefined || t.id_practicante === idPracticante),
  );
}

/** Duraciones de ciclo (ms) de las tareas dadas; las que no tienen tramo cerrado no aportan. */
function muestrasCiclo(tareas: readonly Tarea[], historial: readonly EventoHistorial[]): number[] {
  return tareas.flatMap((t) => {
    const ms = tiempoCicloMs(t, historial);
    return ms === null ? [] : [ms];
  });
}

/** Duraciones de espera (ms) de los envíos respondidos dentro del periodo. */
function muestrasEspera(
  tareas: readonly Tarea[],
  enviosDe: ReadonlyMap<Id, EnvioSupervision[]>,
  periodo: PeriodoMs,
): number[] {
  return tareas.flatMap((t) =>
    (enviosDe.get(t.id) ?? []).flatMap((s) =>
      s.fin !== null && enPeriodo(s.fin, periodo) ? [s.fin - s.inicio] : [],
    ),
  );
}

/**
 * Tasa de devolución: tareas con algún envío del periodo devuelto / tareas con algún envío en el
 * periodo. Con `idPracticante`, solo cuentan los envíos de los que es autor.
 */
function tasaDevolucion(
  tareas: readonly Tarea[],
  enviosDe: ReadonlyMap<Id, EnvioSupervision[]>,
  periodo: PeriodoMs,
  idPracticante?: Id,
): Proporcion | null {
  let enviadas = 0;
  let devueltas = 0;
  for (const tarea of tareas) {
    const enviosPeriodo = (enviosDe.get(tarea.id) ?? [])
      .filter((s) => enPeriodo(s.inicio, periodo))
      .filter((s) => idPracticante === undefined || esAutor(s.autor_envio, idPracticante));
    if (enviosPeriodo.length === 0) continue;
    enviadas += 1;
    if (enviosPeriodo.some((s) => s.devuelta)) devueltas += 1;
  }
  return proporcion(devueltas, enviadas);
}

function resumenDe(
  tareas: readonly Tarea[],
  historial: readonly EventoHistorial[],
  enviosDe: ReadonlyMap<Id, EnvioSupervision[]>,
  periodo: PeriodoMs,
): ResumenIndicadores {
  const terminadas = terminadasEnPeriodo(tareas, periodo);
  return {
    tareas_terminadas: terminadas.length,
    tiempo_ciclo_dias: promedioEnDias(muestrasCiclo(terminadas, historial)),
    espera_supervision_dias: promedioEnDias(muestrasEspera(tareas, enviosDe, periodo)),
    tasa_devolucion: tasaDevolucion(tareas, enviosDe, periodo),
  };
}

/**
 * Los indicadores que ve `usuario`: tarjetas generales, tabla por proyecto y tabla por
 * practicante, sobre sus proyectos (todos para el Administrador, los suyos para el Supervisor,
 * ninguno para el Practicante o un usuario INACTIVO, que reciben el resultado vacío sin error).
 */
export function indicadoresParaUsuario(
  usuario: Usuario,
  datos: DatosIndicadores,
  filtro: FiltroIndicadores,
  ahora: FechaHora,
): ResultadoIndicadores {
  if (!esAhoraValido(ahora)) {
    return {
      ok: false,
      codigo: 'AHORA_INVALIDO',
      mensaje: 'El momento del cálculo debe ser una fecha y hora ISO 8601 en UTC (terminada en Z).',
    };
  }
  if (!Number.isInteger(filtro.dias) || filtro.dias < 1 || filtro.dias > DIAS_PERIODO_MAXIMO) {
    return {
      ok: false,
      codigo: 'PERIODO_INVALIDO',
      mensaje: `El periodo debe ser un número entero de días, entre 1 y ${DIAS_PERIODO_MAXIMO}.`,
    };
  }

  const hoy = hoyEn(ahora);
  const desde = inicioDelDia(hoy) - (filtro.dias - 1) * MS_POR_DIA;
  const periodo: PeriodoMs = { desde, hasta: Date.parse(ahora) };
  const primerDia = hoyEn(aFechaHora(desde));

  const alcance = datos.proyectos.filter(
    (p) => puede(usuario, 'VER_REPORTES', { proyecto: p }).permitido,
  );
  const visibles = alcance.filter(
    (p) => filtro.id_proyecto === null || p.id === filtro.id_proyecto,
  );
  const idsVisibles = new Set(visibles.map((p) => p.id));

  const tareasVisibles = datos.tareas.filter((t) => idsVisibles.has(t.id_proyecto));
  const historialVisible = datos.historial.filter(
    (e) => e.id_proyecto !== null && idsVisibles.has(e.id_proyecto),
  );
  const idsTareas = tareasVisibles.map((t) => t.id);
  const enviosDe = new Map(
    idsTareas.map((id): [Id, EnvioSupervision[]] => [id, enviosASupervision(id, datos.historial)]),
  );

  const resumen = resumenDe(tareasVisibles, datos.historial, enviosDe, periodo);

  const por_proyecto = visibles.map((p): IndicadoresProyecto => {
    const tareasDelProyecto = tareasVisibles.filter((t) => t.id_proyecto === p.id);
    return {
      id_proyecto: p.id,
      ...resumenDe(tareasDelProyecto, datos.historial, enviosDe, periodo),
      avance: avanceProyecto(p.id, tareasVisibles),
      ultima_actividad: ultimaActividadDeProyecto(p.id, historialVisible),
    };
  });

  const idsPracticantes = [
    ...new Set(
      datos.asignaciones
        .filter(
          (a) =>
            idsVisibles.has(a.id_proyecto) &&
            a.fecha_alta <= hoy &&
            (a.fecha_baja === null || a.fecha_baja >= primerDia),
        )
        .map((a) => a.id_practicante),
    ),
  ];
  const por_practicante = idsPracticantes.map((id): IndicadoresPracticante => {
    const terminadas = terminadasEnPeriodo(tareasVisibles, periodo, id);
    return {
      id_practicante: id,
      tareas_terminadas: terminadas.length,
      tiempo_ciclo_dias: promedioEnDias(muestrasCiclo(terminadas, datos.historial)),
      tasa_devolucion: tasaDevolucion(tareasVisibles, enviosDe, periodo, id),
      carga: cargaDePracticante(
        id,
        tareasVisibles,
        proyectosDeCarga(id, datos.asignaciones, visibles),
      ),
      ultima_actividad: ultimaActividadDeUsuario(id, historialVisible),
    };
  });

  return {
    ok: true,
    periodo: { desde: aFechaHora(desde), hasta: ahora, dias: filtro.dias },
    resumen,
    por_proyecto,
    por_practicante,
  };
}

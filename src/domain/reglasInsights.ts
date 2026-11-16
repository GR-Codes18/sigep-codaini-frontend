/**
 * Reglas de insights (Fase 1, paso 8; propuesta §5.6, §5.8, §9.1.4 y §11).
 *
 * Los insights no se guardan: se calculan cada vez a partir de los datos, los umbrales vigentes
 * de Configuración y el momento del cálculo (`ahora`), que llega por parámetro. Esta capa no lee
 * el reloj ni importa React, Zustand, `data/` ni `services/`.
 *
 * Reglas acordadas por los autores (detalle en DECISIONES.md, paso 8):
 *   - Los umbrales se cumplen al alcanzarse (≥), salvo la carga máxima («más de»: >). Los días son
 *     periodos completos de 24 h (`diasCompletos`, con `Math.floor`: 6 d 23 h = 6).
 *   - `hoy` sale de `ahora` cortando el día en la hora de Perú (UTC−5 fijo, sin horario de verano);
 *     una `Fecha` sin hora vale como el inicio de ese día en la hora de Perú.
 *   - Vencida = `fecha_limite < hoy` y no TERMINADA. El 25 % se calcula sobre el total de tareas.
 *   - Actividad del practicante = eventos de los que es autor; actividad del proyecto = eventos con
 *     su `id_proyecto`, de cualquier autor.
 *   - Posible atraso: solo proyectos ACTIVO con tareas; el tramo de avance solo si la fecha de fin
 *     es posterior a la de inicio, con el último día incluido y comparación entera (sin coma
 *     flotante). `fecha_deteccion = ahora` en los dos tramos y en la carga.
 *   - «Revisado» es por usuario: la revisión más reciente de esa persona, mientras la severidad no
 *     suba y no pasen 7 días completos.
 *   - Alcance: la misma lista y la misma función que `puede('MARCAR_INSIGHT_REVISADO')`.
 *   - El tiempo en pausa no se descuenta (riesgo aceptado).
 *
 * Orden de comprobación: `ahora` → umbrales (cada clave en el orden del catálogo y después las
 * relaciones) → las 7 reglas en el orden de `TIPOS_REGLA_INSIGHT` → orden final. Para un usuario:
 * eso → alcance → revisiones (filtrar y marcar conservan el orden).
 */

import type { Fecha, FechaHora, Id } from './comunes';
import { CATALOGO_PARAMETROS } from './configuracion';
import type { ClaveParametro } from './configuracion';
import { TIPOS_REGLA_INSIGHT } from './enumeraciones';
import type { Severidad, TipoReglaInsight } from './enumeraciones';
import type { EventoHistorial } from './historial';
import { formatearIdLegible } from './idLegible';
import type { Insight, InsightRevision } from './insights';
import { REGLAS_INSIGHT_VISIBLES, insightEnAlcance } from './permisos';
import type { Postulante } from './postulaciones';
import type { Asignacion, Proyecto } from './proyectos';
import type { Tarea } from './tareas';
import type { Practicante, Usuario } from './usuarios';

/** Códigos de error de esta capa. */
export const CODIGOS_INSIGHTS = ['AHORA_INVALIDO', 'UMBRAL_INVALIDO'] as const;

export type CodigoInsights = (typeof CODIGOS_INSIGHTS)[number];

/** Las 10 claves de Seguimiento del catálogo; no hay claves propias de esta capa. */
export type ClaveUmbralInsight = Extract<ClaveParametro, `INSIGHT_${string}`>;

/** Valores vigentes de los umbrales; el servicio los arma desde Configuración. */
export type UmbralesInsight = Record<ClaveUmbralInsight, number>;

/** Datos sobre los que se calculan los insights. `tareas` ya no incluye las eliminadas. */
export interface DatosInsights {
  usuarios: readonly Usuario[];
  practicantes: readonly Practicante[];
  proyectos: readonly Proyecto[];
  asignaciones: readonly Asignacion[];
  tareas: readonly Tarea[];
  historial: readonly EventoHistorial[];
  postulantes: readonly Postulante[];
}

export type ResultadoInsights =
  | { ok: true; insights: Insight[] }
  | { ok: false; codigo: 'AHORA_INVALIDO'; mensaje: string }
  | { ok: false; codigo: 'UMBRAL_INVALIDO'; clave: ClaveUmbralInsight; mensaje: string };

export type ErrorUmbral = Extract<ResultadoInsights, { codigo: 'UMBRAL_INVALIDO' }>;

/** Hora de Perú (UTC−5 todo el año): corta el día de `hoy` y de las fechas sin hora. */
export const DESFASE_ZONA_HORARIA_MS = -5 * 60 * 60 * 1000;

/** Un insight revisado reaparece a los 7 días si la condición sigue (§5.6; no es un parámetro). */
export const DIAS_REAPARICION_INSIGHT = 7;

const MS_POR_DIA = 86_400_000;

/** ISO 8601 en UTC, como lo da `new Date().toISOString()` (los milisegundos son opcionales). */
const FORMATO_AHORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

const RANGO_SEVERIDAD: Record<Severidad, number> = { INFORMATIVO: 1, ATENCION: 2, CRITICO: 3 };

/** Límites de cada umbral (decisión 18 del paso 8). */
const LIMITES_UMBRAL: Record<ClaveUmbralInsight, { minimo: number; maximo: number }> = {
  INSIGHT_INACTIVO_DIAS: { minimo: 1, maximo: Infinity },
  INSIGHT_INACTIVO_CRITICO_DIAS: { minimo: 1, maximo: Infinity },
  INSIGHT_CARGA_MAXIMA_TAREAS: { minimo: 0, maximo: Infinity },
  INSIGHT_CARGA_MINIMA_TAREAS: { minimo: 0, maximo: Infinity },
  INSIGHT_ATRASO_PUNTOS: { minimo: 1, maximo: 100 },
  INSIGHT_ATRASO_PORCENTAJE: { minimo: 1, maximo: 100 },
  INSIGHT_PROYECTO_SIN_ACTIVIDAD_DIAS: { minimo: 1, maximo: Infinity },
  INSIGHT_SUPERVISION_DEMORADA_DIAS: { minimo: 1, maximo: Infinity },
  INSIGHT_POSTULACION_DIAS: { minimo: 1, maximo: Infinity },
  INSIGHT_FIN_PRACTICA_DIAS: { minimo: 1, maximo: Infinity },
};

const NOMBRE_UMBRAL: Record<ClaveUmbralInsight, string> = {
  INSIGHT_INACTIVO_DIAS: 'Días sin actividad (atención)',
  INSIGHT_INACTIVO_CRITICO_DIAS: 'Días sin actividad (crítico)',
  INSIGHT_CARGA_MAXIMA_TAREAS: 'Carga máxima de tareas',
  INSIGHT_CARGA_MINIMA_TAREAS: 'Carga mínima de tareas',
  INSIGHT_ATRASO_PUNTOS: 'Puntos de atraso',
  INSIGHT_ATRASO_PORCENTAJE: 'Porcentaje de tareas vencidas',
  INSIGHT_PROYECTO_SIN_ACTIVIDAD_DIAS: 'Días de proyecto sin actividad',
  INSIGHT_SUPERVISION_DEMORADA_DIAS: 'Días de supervisión demorada',
  INSIGHT_POSTULACION_DIAS: 'Días de postulación sin decidir',
  INSIGHT_FIN_PRACTICA_DIAS: 'Anticipación del fin de práctica',
};

/** Las claves de umbral en el orden del catálogo de Configuración. */
const CLAVES_UMBRAL = CATALOGO_PARAMETROS.map((parametro) => parametro.clave).filter(
  (clave): clave is ClaveUmbralInsight => clave in LIMITES_UMBRAL,
);

function errorUmbral(clave: ClaveUmbralInsight, mensaje: string): ErrorUmbral {
  return { ok: false, codigo: 'UMBRAL_INVALIDO', clave, mensaje };
}

function textoRango(minimo: number, maximo: number): string {
  return maximo === Infinity ? `mayor o igual que ${minimo}` : `entre ${minimo} y ${maximo}`;
}

/** Valida los 10 umbrales: cada clave en el orden del catálogo y después las relaciones. */
export function validarUmbrales(umbrales: UmbralesInsight): { ok: true } | ErrorUmbral {
  for (const clave of CLAVES_UMBRAL) {
    const valor = umbrales[clave];
    const { minimo, maximo } = LIMITES_UMBRAL[clave];
    if (!Number.isInteger(valor) || valor < minimo || valor > maximo) {
      return errorUmbral(
        clave,
        `«${NOMBRE_UMBRAL[clave]}» debe ser un número entero ${textoRango(minimo, maximo)}.`,
      );
    }
  }
  if (!(umbrales.INSIGHT_CARGA_MINIMA_TAREAS < umbrales.INSIGHT_CARGA_MAXIMA_TAREAS)) {
    return errorUmbral(
      'INSIGHT_CARGA_MINIMA_TAREAS',
      'La carga mínima de tareas debe ser menor que la carga máxima.',
    );
  }
  if (!(umbrales.INSIGHT_INACTIVO_CRITICO_DIAS > umbrales.INSIGHT_INACTIVO_DIAS)) {
    return errorUmbral(
      'INSIGHT_INACTIVO_CRITICO_DIAS',
      'Los días sin actividad para «crítico» deben ser más que los de «atención».',
    );
  }
  return { ok: true };
}

/** Días completos de 24 h entre dos instantes en milisegundos (6 d 23 h = 6). */
function diasCompletos(desde: number, hasta: number): number {
  return Math.floor((hasta - desde) / MS_POR_DIA);
}

/**
 * Fecha de calendario de `ahora` en la hora de Perú. `ahora` debe ser válido:
 * `calcularInsights` lo comprueba antes de llamarla.
 */
export function hoyEn(ahora: FechaHora): Fecha {
  return new Date(Date.parse(ahora) + DESFASE_ZONA_HORARIA_MS).toISOString().slice(0, 10);
}

/** Inicio del día `fecha` en la hora de Perú, en milisegundos (`NaN` si la fecha no es válida). */
function inicioDelDia(fecha: Fecha): number {
  return Date.parse(`${fecha}T00:00:00.000Z`) - DESFASE_ZONA_HORARIA_MS;
}

/** Días de calendario entre dos fechas (`NaN` si alguna no es válida). */
function diasEntreFechas(desde: Fecha, hasta: Fecha): number {
  return (Date.parse(hasta) - Date.parse(desde)) / MS_POR_DIA;
}

/** Instante del evento más reciente, o `null` si no hay eventos. */
function ultimaFecha(eventos: readonly EventoHistorial[]): number | null {
  return eventos.length === 0 ? null : Math.max(...eventos.map((e) => Date.parse(e.fecha)));
}

function aFechaHora(ms: number): FechaHora {
  return new Date(ms).toISOString();
}

function textoDias(n: number): string {
  return n === 1 ? '1 día' : `${n} días`;
}

function textoTareas(n: number): string {
  return n === 1 ? '1 tarea' : `${n} tareas`;
}

function idsUnicos(ids: readonly Id[]): Id[] {
  return [...new Set(ids)];
}

/** Una tarea está vencida si su fecha límite ya pasó y no está terminada (vencer hoy no cuenta). */
export function estaVencida(tarea: Pick<Tarea, 'estado' | 'fecha_limite'>, hoy: Fecha): boolean {
  return tarea.estado !== 'TERMINADA' && tarea.fecha_limite < hoy;
}

interface ContextoCalculo {
  datos: DatosInsights;
  umbrales: UmbralesInsight;
  ahora: FechaHora;
  ahoraMs: number;
  hoy: Fecha;
  proyectoPorId: ReadonlyMap<Id, Proyecto>;
}

function practicantesActivos(datos: DatosInsights): Usuario[] {
  return datos.usuarios.filter((u) => u.estado === 'ACTIVO' && u.rol === 'PRACTICANTE');
}

function asignacionesVigentes(idPracticante: Id, datos: DatosInsights): Asignacion[] {
  return datos.asignaciones.filter(
    (a) => a.fecha_baja === null && a.id_practicante === idPracticante,
  );
}

/** Proyectos de sus asignaciones vigentes, en cualquier estado. */
function proyectosVigentes(idPracticante: Id, ctx: ContextoCalculo): Proyecto[] {
  return idsUnicos(asignacionesVigentes(idPracticante, ctx.datos).map((a) => a.id_proyecto))
    .map((id) => ctx.proyectoPorId.get(id))
    .filter((p): p is Proyecto => p !== undefined);
}

function reglaPracticanteInactivo(ctx: ContextoCalculo): Insight[] {
  const { umbrales } = ctx;
  const insights: Insight[] = [];
  for (const usuario of practicantesActivos(ctx.datos)) {
    const vigentesActivas = asignacionesVigentes(usuario.id, ctx.datos).filter(
      (a) => ctx.proyectoPorId.get(a.id_proyecto)?.estado === 'ACTIVO',
    );
    if (vigentesActivas.length === 0) continue;

    const inicioAsignacion = Math.min(...vigentesActivas.map((a) => inicioDelDia(a.fecha_alta)));
    const ultimoPropio = ultimaFecha(
      ctx.datos.historial.filter(
        (e) => e.autor.tipo === 'USUARIO' && e.autor.id_usuario === usuario.id,
      ),
    );
    const referencia = Math.max(ultimoPropio ?? -Infinity, inicioAsignacion);
    const dias = diasCompletos(referencia, ctx.ahoraMs);
    if (dias < umbrales.INSIGHT_INACTIVO_DIAS) continue;

    const severidad = dias >= umbrales.INSIGHT_INACTIVO_CRITICO_DIAS ? 'CRITICO' : 'ATENCION';
    const umbral = `umbral: ${textoDias(umbrales.INSIGHT_INACTIVO_DIAS)}; crítico desde ${textoDias(umbrales.INSIGHT_INACTIVO_CRITICO_DIAS)}`;
    const motivo =
      ultimoPropio !== null && ultimoPropio >= inicioAsignacion
        ? `Su última acción registrada fue hace ${textoDias(dias)} (${umbral}).`
        : `No registra acciones desde su asignación, hace ${textoDias(dias)} (${umbral}).`;
    insights.push({
      tipo_regla: 'PRACTICANTE_INACTIVO',
      severidad,
      titulo: `${usuario.nombre} sin actividad hace ${textoDias(dias)}`,
      motivo,
      elemento: { tipo: 'USUARIO', id: usuario.id },
      fecha_deteccion: aFechaHora(referencia + umbrales.INSIGHT_INACTIVO_DIAS * MS_POR_DIA),
      revisado: false,
      ids_proyecto: idsUnicos(vigentesActivas.map((a) => a.id_proyecto)),
    });
  }
  return insights;
}

function reglaCargaDesbalanceada(ctx: ContextoCalculo): Insight[] {
  const { umbrales } = ctx;
  const insights: Insight[] = [];
  for (const usuario of practicantesActivos(ctx.datos)) {
    const vigentes = proyectosVigentes(usuario.id, ctx);
    const idsActivos = vigentes.filter((p) => p.estado === 'ACTIVO').map((p) => p.id);
    const idsCarga = vigentes.filter((p) => p.estado !== 'FINALIZADO').map((p) => p.id);
    if (idsActivos.length === 0) continue;

    const carga = ctx.datos.tareas.filter(
      (t) =>
        t.id_practicante === usuario.id &&
        t.estado === 'EN_PROGRESO' &&
        idsCarga.includes(t.id_proyecto),
    ).length;
    const conDisponibles = vigentes.filter(
      (p) =>
        idsActivos.includes(p.id) &&
        ctx.datos.tareas.some((t) => t.estado === 'DISPONIBLE' && t.id_proyecto === p.id),
    );
    const hayDisponibles = conDisponibles.length > 0;
    const excedida = carga > umbrales.INSIGHT_CARGA_MAXIMA_TAREAS;
    const sinTrabajo = carga <= umbrales.INSIGHT_CARGA_MINIMA_TAREAS && hayDisponibles;
    if (!excedida && !sinTrabajo) continue;

    const motivo = excedida
      ? `Tiene ${textoTareas(carga)} «En progreso» en sus proyectos; el máximo es ${umbrales.INSIGHT_CARGA_MAXIMA_TAREAS}.`
      : `Tiene ${textoTareas(carga)} «En progreso» y hay tareas disponibles en: ${conDisponibles.map((p) => p.nombre).join(', ')}.`;
    insights.push({
      tipo_regla: 'CARGA_DESBALANCEADA',
      severidad: 'ATENCION',
      titulo: `${usuario.nombre} tiene ${textoTareas(carga)} en progreso`,
      motivo,
      elemento: { tipo: 'USUARIO', id: usuario.id },
      fecha_deteccion: ctx.ahora,
      revisado: false,
      ids_proyecto: idsCarga,
    });
  }
  return insights;
}

function reglaPosibleAtraso(ctx: ContextoCalculo): Insight[] {
  const { umbrales } = ctx;
  const insights: Insight[] = [];
  for (const proyecto of ctx.datos.proyectos.filter((p) => p.estado === 'ACTIVO')) {
    const tareasProyecto = ctx.datos.tareas.filter((t) => t.id_proyecto === proyecto.id);
    const n = tareasProyecto.length;
    if (n === 0) continue;

    const k = tareasProyecto.filter((t) => t.estado === 'TERMINADA').length;
    const vencidas = tareasProyecto.filter((t) => estaVencida(t, ctx.hoy)).length;
    const porVencidas = 100 * vencidas >= umbrales.INSIGHT_ATRASO_PORCENTAJE * n;

    let porAvance = false;
    let esperado = 0;
    if (proyecto.fecha_fin_prevista > proyecto.fecha_inicio) {
      const d = diasEntreFechas(proyecto.fecha_inicio, proyecto.fecha_fin_prevista) + 1;
      const t = Math.min(Math.max(diasEntreFechas(proyecto.fecha_inicio, ctx.hoy), 0), d);
      // Enteros: (t/d − k/n) × 100 ≥ P  ⇔  100·t·n − 100·k·d ≥ P·d·n, sin coma flotante.
      porAvance = 100 * t * n - 100 * k * d >= umbrales.INSIGHT_ATRASO_PUNTOS * d * n;
      esperado = (100 * t) / d;
    }
    if (!porAvance && !porVencidas) continue;

    const real = (100 * k) / n;
    const motivos: string[] = [];
    if (porAvance) {
      motivos.push(
        `Avance real ${Math.round(real)} % frente a ${Math.round(esperado)} % esperado (${Math.round(esperado - real)} puntos; umbral ${umbrales.INSIGHT_ATRASO_PUNTOS}).`,
      );
    }
    if (porVencidas) {
      motivos.push(
        `${vencidas} de ${n} tareas vencidas (${Math.round((100 * vencidas) / n)} %; umbral ${umbrales.INSIGHT_ATRASO_PORCENTAJE} %).`,
      );
    }
    insights.push({
      tipo_regla: 'POSIBLE_ATRASO_PROYECTO',
      severidad: 'CRITICO',
      titulo: `Posible atraso en ${proyecto.nombre}`,
      motivo: motivos.join(' '),
      elemento: { tipo: 'PROYECTO', id: proyecto.id },
      fecha_deteccion: ctx.ahora,
      revisado: false,
      ids_proyecto: [proyecto.id],
    });
  }
  return insights;
}

function reglaProyectoSinActividad(ctx: ContextoCalculo): Insight[] {
  const { umbrales } = ctx;
  const insights: Insight[] = [];
  for (const proyecto of ctx.datos.proyectos.filter((p) => p.estado === 'ACTIVO')) {
    const conEquipo = ctx.datos.asignaciones.some(
      (a) => a.id_proyecto === proyecto.id && a.fecha_baja === null,
    );
    if (!conEquipo) continue;

    const ultimo = ultimaFecha(ctx.datos.historial.filter((e) => e.id_proyecto === proyecto.id));
    const referencia = ultimo ?? inicioDelDia(proyecto.fecha_inicio);
    const dias = diasCompletos(referencia, ctx.ahoraMs);
    if (dias < umbrales.INSIGHT_PROYECTO_SIN_ACTIVIDAD_DIAS) continue;

    const umbral = `umbral: ${textoDias(umbrales.INSIGHT_PROYECTO_SIN_ACTIVIDAD_DIAS)}`;
    insights.push({
      tipo_regla: 'PROYECTO_SIN_ACTIVIDAD',
      severidad: 'ATENCION',
      titulo: `${proyecto.nombre} sin actividad hace ${textoDias(dias)}`,
      motivo:
        ultimo !== null
          ? `La última acción registrada en el proyecto fue hace ${textoDias(dias)} (${umbral}).`
          : `No registra acciones desde su fecha de inicio, hace ${textoDias(dias)} (${umbral}).`,
      elemento: { tipo: 'PROYECTO', id: proyecto.id },
      fecha_deteccion: aFechaHora(
        referencia + umbrales.INSIGHT_PROYECTO_SIN_ACTIVIDAD_DIAS * MS_POR_DIA,
      ),
      revisado: false,
      ids_proyecto: [proyecto.id],
    });
  }
  return insights;
}

function reglaSupervisionDemorada(ctx: ContextoCalculo): Insight[] {
  const { umbrales } = ctx;
  const insights: Insight[] = [];
  for (const tarea of ctx.datos.tareas.filter((t) => t.estado === 'ESPERANDO_SUPERVISION')) {
    const proyecto = ctx.proyectoPorId.get(tarea.id_proyecto);
    if (proyecto === undefined || proyecto.estado === 'FINALIZADO') continue;

    const envio = ultimaFecha(
      ctx.datos.historial.filter(
        (e) =>
          e.tipo_accion === 'TAREA_ENVIADA_A_SUPERVISION' &&
          e.elemento.tipo === 'TAREA' &&
          e.elemento.id === tarea.id,
      ),
    );
    if (envio === null) continue;
    const dias = diasCompletos(envio, ctx.ahoraMs);
    if (dias < umbrales.INSIGHT_SUPERVISION_DEMORADA_DIAS) continue;

    const id = formatearIdLegible(proyecto.codigo, tarea.numero);
    const etiqueta = id.ok ? id.id : tarea.titulo;
    const supervisor = ctx.datos.usuarios.find((u) => u.id === proyecto.id_supervisor);
    insights.push({
      tipo_regla: 'SUPERVISION_DEMORADA',
      severidad: 'ATENCION',
      titulo: `${etiqueta} espera supervisión hace ${textoDias(dias)}`,
      motivo: `«${tarea.titulo}» se envió a supervisión hace ${textoDias(dias)} (umbral: ${textoDias(umbrales.INSIGHT_SUPERVISION_DEMORADA_DIAS)}). Supervisor: ${supervisor?.nombre ?? 'sin supervisor'}.`,
      elemento: { tipo: 'TAREA', id: tarea.id },
      fecha_deteccion: aFechaHora(envio + umbrales.INSIGHT_SUPERVISION_DEMORADA_DIAS * MS_POR_DIA),
      revisado: false,
      ids_proyecto: [tarea.id_proyecto],
    });
  }
  return insights;
}

function reglaPostulacionesSinDecidir(ctx: ContextoCalculo): Insight[] {
  const { umbrales } = ctx;
  const insights: Insight[] = [];
  for (const postulante of ctx.datos.postulantes.filter((p) => p.estado === 'PENDIENTE')) {
    const reconsiderada = ultimaFecha(
      ctx.datos.historial.filter(
        (e) =>
          e.tipo_accion === 'POSTULACION_RECONSIDERADA' &&
          e.elemento.tipo === 'POSTULANTE' &&
          e.elemento.id === postulante.id,
      ),
    );
    const referencia = Math.max(
      Date.parse(postulante.fecha_postulacion),
      reconsiderada ?? -Infinity,
    );
    const dias = diasCompletos(referencia, ctx.ahoraMs);
    if (dias < umbrales.INSIGHT_POSTULACION_DIAS) continue;

    insights.push({
      tipo_regla: 'POSTULACIONES_SIN_DECIDIR',
      severidad: 'ATENCION',
      titulo: `Postulación de ${postulante.nombre} sin decidir hace ${textoDias(dias)}`,
      motivo: `Está pendiente desde hace ${textoDias(dias)} (umbral: ${textoDias(umbrales.INSIGHT_POSTULACION_DIAS)}).`,
      elemento: { tipo: 'POSTULANTE', id: postulante.id },
      fecha_deteccion: aFechaHora(referencia + umbrales.INSIGHT_POSTULACION_DIAS * MS_POR_DIA),
      revisado: false,
      ids_proyecto: [],
    });
  }
  return insights;
}

function reglaFinPractica(ctx: ContextoCalculo): Insight[] {
  const { umbrales } = ctx;
  const insights: Insight[] = [];
  for (const usuario of practicantesActivos(ctx.datos)) {
    const detalle = ctx.datos.practicantes.find((p) => p.id_usuario === usuario.id);
    if (detalle === undefined) continue;

    const fin = detalle.fecha_fin_prevista;
    const faltan = diasEntreFechas(ctx.hoy, fin);
    if (Number.isNaN(faltan) || faltan > umbrales.INSIGHT_FIN_PRACTICA_DIAS) continue;

    const severidad = faltan < 0 ? 'CRITICO' : 'INFORMATIVO';
    const inicioCondicion =
      severidad === 'CRITICO'
        ? inicioDelDia(fin) + MS_POR_DIA
        : inicioDelDia(fin) - umbrales.INSIGHT_FIN_PRACTICA_DIAS * MS_POR_DIA;
    const vigentes = proyectosVigentes(usuario.id, ctx);
    insights.push({
      tipo_regla: 'FIN_PRACTICA',
      severidad,
      titulo:
        faltan < 0
          ? `${usuario.nombre} superó su fecha de fin hace ${textoDias(-faltan)}`
          : faltan === 0
            ? `${usuario.nombre} finaliza su práctica hoy`
            : `${usuario.nombre} finaliza su práctica en ${textoDias(faltan)}`,
      motivo:
        faltan < 0
          ? `Fecha de fin prevista: ${fin}; la práctica sigue sin finalizar.`
          : `Fecha de fin prevista: ${fin} (anticipación: ${textoDias(umbrales.INSIGHT_FIN_PRACTICA_DIAS)}).`,
      elemento: { tipo: 'USUARIO', id: usuario.id },
      fecha_deteccion: aFechaHora(inicioCondicion),
      revisado: false,
      ids_proyecto: vigentes.filter((p) => p.estado !== 'FINALIZADO').map((p) => p.id),
    });
  }
  return insights;
}

/** Una función por regla; el `Record` obliga a que estén las 7. */
const REGLAS: Record<TipoReglaInsight, (ctx: ContextoCalculo) => Insight[]> = {
  PRACTICANTE_INACTIVO: reglaPracticanteInactivo,
  CARGA_DESBALANCEADA: reglaCargaDesbalanceada,
  POSIBLE_ATRASO_PROYECTO: reglaPosibleAtraso,
  PROYECTO_SIN_ACTIVIDAD: reglaProyectoSinActividad,
  SUPERVISION_DEMORADA: reglaSupervisionDemorada,
  POSTULACIONES_SIN_DECIDIR: reglaPostulacionesSinDecidir,
  FIN_PRACTICA: reglaFinPractica,
};

function compararTexto(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Orden de §5.6: severidad (CRÍTICO, ATENCIÓN, INFORMATIVO) y, en la misma severidad, el más
 * antiguo primero; luego el orden de las reglas y el id del elemento. Devuelve una copia.
 */
export function ordenarInsights(insights: readonly Insight[]): Insight[] {
  return [...insights].sort(
    (a, b) =>
      RANGO_SEVERIDAD[b.severidad] - RANGO_SEVERIDAD[a.severidad] ||
      Date.parse(a.fecha_deteccion) - Date.parse(b.fecha_deteccion) ||
      TIPOS_REGLA_INSIGHT.indexOf(a.tipo_regla) - TIPOS_REGLA_INSIGHT.indexOf(b.tipo_regla) ||
      compararTexto(a.elemento.id, b.elemento.id),
  );
}

/** Calcula los insights de las 7 reglas (todos con `revisado: false`), ya ordenados. */
export function calcularInsights(
  datos: DatosInsights,
  umbrales: UmbralesInsight,
  ahora: FechaHora,
): ResultadoInsights {
  if (!FORMATO_AHORA.test(ahora) || Number.isNaN(Date.parse(ahora))) {
    return {
      ok: false,
      codigo: 'AHORA_INVALIDO',
      mensaje: 'El momento del cálculo debe ser una fecha y hora ISO 8601 en UTC (terminada en Z).',
    };
  }
  const validacion = validarUmbrales(umbrales);
  if (!validacion.ok) return validacion;

  const ahoraMs = Date.parse(ahora);
  const ctx: ContextoCalculo = {
    datos,
    umbrales,
    ahora,
    ahoraMs,
    hoy: hoyEn(ahora),
    proyectoPorId: new Map(datos.proyectos.map((p) => [p.id, p])),
  };
  const insights = TIPOS_REGLA_INSIGHT.flatMap((tipo) => REGLAS[tipo](ctx));
  return { ok: true, insights: ordenarInsights(insights) };
}

/**
 * Marca `revisado` según las revisiones de `idUsuario`: la más reciente de esa persona para la
 * misma regla y el mismo elemento, mientras la severidad no suba y no pasen 7 días completos.
 */
export function aplicarRevisiones(
  insights: readonly Insight[],
  revisiones: readonly InsightRevision[],
  idUsuario: Id,
  ahora: FechaHora,
): Insight[] {
  const ahoraMs = Date.parse(ahora);
  return insights.map((i) => {
    const propia = revisiones
      .filter(
        (r) =>
          r.id_usuario === idUsuario &&
          r.tipo_regla === i.tipo_regla &&
          r.elemento.tipo === i.elemento.tipo &&
          r.elemento.id === i.elemento.id,
      )
      .reduce<InsightRevision | null>(
        (ultima, r) =>
          ultima === null || Date.parse(r.fecha) > Date.parse(ultima.fecha) ? r : ultima,
        null,
      );
    const revisado =
      propia !== null &&
      RANGO_SEVERIDAD[i.severidad] <= RANGO_SEVERIDAD[propia.severidad_al_revisar] &&
      diasCompletos(Date.parse(propia.fecha), ahoraMs) < DIAS_REAPARICION_INSIGHT;
    return { ...i, revisado };
  });
}

/**
 * Lo que `usuario` puede ver: nada si está INACTIVO; las reglas de su rol
 * (`REGLAS_INSIGHT_VISIBLES`) y, si es Supervisor, solo con algún proyecto suyo.
 */
export function filtrarInsightsPorAlcance(
  insights: readonly Insight[],
  usuario: Usuario,
  proyectos: readonly Pick<Proyecto, 'id' | 'id_supervisor'>[],
): Insight[] {
  if (usuario.estado !== 'ACTIVO') return [];
  const visibles = REGLAS_INSIGHT_VISIBLES[usuario.rol];
  return insights.filter(
    (i) =>
      visibles.includes(i.tipo_regla) &&
      (usuario.rol !== 'SUPERVISOR' || insightEnAlcance(i, proyectos, usuario)),
  );
}

/** La función que usa el servicio: calcular → alcance → revisiones del usuario que mira. */
export function insightsParaUsuario(
  usuario: Usuario,
  datos: DatosInsights,
  umbrales: UmbralesInsight,
  revisiones: readonly InsightRevision[],
  ahora: FechaHora,
): ResultadoInsights {
  const calculados = calcularInsights(datos, umbrales, ahora);
  if (!calculados.ok) return calculados;
  const visibles = filtrarInsightsPorAlcance(calculados.insights, usuario, datos.proyectos);
  return { ok: true, insights: aplicarRevisiones(visibles, revisiones, usuario.id, ahora) };
}

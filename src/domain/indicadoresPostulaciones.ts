/**
 * Indicadores de postulaciones de Reportes (Fase 2, paso 11D; propuesta §5.6).
 *
 * La propuesta nombra dos tarjetas que no definía: «postulaciones decididas» y «puntaje promedio por área».
 * Los autores cerraron su definición (decisión Q7-A):
 *   - **Decidida en el periodo:** la postulación está hoy APROBADA o RECHAZADA y su decisión (el evento
 *     `POSTULACION_APROBADA` o `POSTULACION_RECHAZADA` más reciente) cae dentro del periodo, con los dos
 *     extremos incluidos. Una postulación reconsiderada que sigue pendiente no cuenta; una que se rechazó,
 *     se reconsideró y se aprobó cuenta por la fecha de la aprobación.
 *   - **Puntaje promedio por área técnica:** el promedio del puntaje final (`puntaje_total`) de esas
 *     postulaciones decididas, agrupadas por el área del postulante. Usa la evaluación más reciente de cada
 *     una; las que no tienen evaluación **no entran** en el promedio (sí en «decididas»). Sin datos, `null`
 *     («Sin datos», no cero).
 *
 * El promedio se da con un decimal, con las mitades hacia arriba y sin coma flotante, igual que los
 * promedios de tiempo de §5.6. Recibe los datos por parámetro; no decide quién puede verlo (eso es de
 * `puede('VER_REPORTES')` y de la consulta). No importa React, Zustand, `data/` ni `services/`.
 */

import type { FechaHora, Id } from './comunes';
import type { EventoHistorial } from './historial';
import type { PostulacionEvaluacion, Postulante } from './postulaciones';

export interface DatosIndicadoresPostulaciones {
  postulantes: readonly Pick<Postulante, 'id' | 'estado' | 'id_area_tecnica'>[];
  evaluaciones: readonly Pick<
    PostulacionEvaluacion,
    'id_postulante' | 'puntaje_total' | 'fecha_evaluacion'
  >[];
  historial: readonly EventoHistorial[];
  /** Las áreas que salen en el resultado, en este orden. */
  areas: readonly Id[];
}

export interface PeriodoPostulaciones {
  desde: FechaHora;
  hasta: FechaHora;
}

export interface IndicadoresPostulacionesArea {
  id_area_tecnica: Id;
  /** Postulaciones decididas en el periodo cuyo postulante es de esta área. */
  decididas: number;
  /** De ellas, las que tienen evaluación (las que entran en el promedio). */
  evaluadas: number;
  /** Con un decimal; `null` si ninguna tiene evaluación. */
  puntaje_promedio: number | null;
}

export interface IndicadoresPostulaciones {
  /** Todas las decididas en el periodo, de cualquier área. */
  decididas: number;
  por_area: IndicadoresPostulacionesArea[];
}

const ACCIONES_DE_DECISION = ['POSTULACION_APROBADA', 'POSTULACION_RECHAZADA'] as const;

/** Promedio con un decimal, mitades hacia arriba, sin coma flotante en la suma ni en el redondeo. */
function promedioConUnDecimal(suma: number, cantidad: number): number | null {
  if (cantidad === 0) return null;
  // suma / cantidad con un decimal = floor((2 * 10 * suma + cantidad) / (2 * cantidad)) / 10
  return Math.floor((20 * suma + cantidad) / (2 * cantidad)) / 10;
}

/** El instante de la última decisión (aprobar o rechazar) de cada postulante, en milisegundos. */
function decisiones(historial: readonly EventoHistorial[]): Map<Id, number> {
  const ultimas = new Map<Id, number>();
  for (const e of historial) {
    if (e.elemento.tipo !== 'POSTULANTE') continue;
    if (!(ACCIONES_DE_DECISION as readonly string[]).includes(e.tipo_accion)) continue;
    const ms = Date.parse(e.fecha);
    const previa = ultimas.get(e.elemento.id);
    if (previa === undefined || ms > previa) ultimas.set(e.elemento.id, ms);
  }
  return ultimas;
}

/** La evaluación más reciente de cada postulante. */
function evaluacionesVigentes(
  evaluaciones: DatosIndicadoresPostulaciones['evaluaciones'],
): Map<Id, number> {
  const por = new Map<Id, { fecha: number; puntaje: number }>();
  for (const e of evaluaciones) {
    const fecha = Date.parse(e.fecha_evaluacion);
    const previa = por.get(e.id_postulante);
    if (previa === undefined || fecha > previa.fecha) {
      por.set(e.id_postulante, { fecha, puntaje: e.puntaje_total });
    }
  }
  return new Map([...por].map(([id, { puntaje }]) => [id, puntaje]));
}

export function indicadoresDePostulaciones(
  datos: DatosIndicadoresPostulaciones,
  periodo: PeriodoPostulaciones,
): IndicadoresPostulaciones {
  const desde = Date.parse(periodo.desde);
  const hasta = Date.parse(periodo.hasta);
  const ultimaDecision = decisiones(datos.historial);
  const puntajes = evaluacionesVigentes(datos.evaluaciones);

  const decididas = datos.postulantes.filter((p) => {
    if (p.estado !== 'APROBADA' && p.estado !== 'RECHAZADA') return false;
    const ms = ultimaDecision.get(p.id);
    return ms !== undefined && ms >= desde && ms <= hasta;
  });

  return {
    decididas: decididas.length,
    por_area: datos.areas.map((id_area_tecnica): IndicadoresPostulacionesArea => {
      const delArea = decididas.filter((p) => p.id_area_tecnica === id_area_tecnica);
      const conPuntaje = delArea.flatMap((p) => {
        const puntaje = puntajes.get(p.id);
        return puntaje === undefined ? [] : [puntaje];
      });
      return {
        id_area_tecnica,
        decididas: delArea.length,
        evaluadas: conPuntaje.length,
        puntaje_promedio: promedioConUnDecimal(
          conPuntaje.reduce((suma, p) => suma + p, 0),
          conPuntaje.length,
        ),
      };
    }),
  };
}

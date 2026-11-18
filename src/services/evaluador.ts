/**
 * El «modelo de lenguaje» que juzga cada criterio de una postulación (propuesta §10.1).
 *
 * En el sistema real el modelo recibe el CV y los criterios del área y de la especialidad y dice, criterio
 * por criterio, si se cumple y una observación breve; el **sistema** hace la suma (`calcularPuntaje`).
 * En el prototipo no hay modelo ni CV real: `EVALUADOR_SIMULADO` decide con un hash del postulante y
 * del criterio. Es **determinista** (el mismo postulante y los mismos criterios dan siempre lo mismo,
 * como pide §10.1: «explicable y repetible») y cumple cerca del 70 % de los criterios. Las pruebas
 * inyectan otro evaluador con juicios fijos para llegar a los bordes de la banda.
 */

import type { CriterioEvaluacion, JuicioCriterio, Postulante } from '@/domain';

export interface PuertoEvaluador {
  /** Un juicio por cada criterio recibido, en el mismo orden. */
  juzgar: (
    postulante: Pick<Postulante, 'id' | 'cv'>,
    criterios: readonly CriterioEvaluacion[],
  ) => JuicioCriterio[];
}

/** Porcentaje aproximado de criterios que el evaluador simulado da por cumplidos. */
export const PORCENTAJE_CUMPLIDO_SIMULADO = 70;

export const OBSERVACION_CUMPLIDO = 'Se evidencia en el CV del postulante.';
export const OBSERVACION_NO_CUMPLIDO = 'No se encontró evidencia en el CV.';

/** FNV-1a de 32 bits: simple, estable entre ejecuciones y sin dependencias. */
function hash(texto: string): number {
  let valor = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    valor ^= texto.charCodeAt(i);
    valor = Math.imul(valor, 0x01000193) >>> 0;
  }
  return valor;
}

export const EVALUADOR_SIMULADO: PuertoEvaluador = {
  juzgar: (postulante, criterios) =>
    criterios.map((criterio) => {
      const cumplido = hash(`${postulante.id}|${criterio.id}`) % 100 < PORCENTAJE_CUMPLIDO_SIMULADO;
      return {
        id_criterio: criterio.id,
        cumplido,
        observacion: cumplido ? OBSERVACION_CUMPLIDO : OBSERVACION_NO_CUMPLIDO,
      };
    }),
};

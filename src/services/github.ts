/**
 * Puerto de GitHub (§7.6), simulado en el prototipo (§7.7). Decisión D4-A del paso 5.
 *
 * Los servicios no hablan con GitHub directamente: usan `entorno.github`. En el sub-paso 5B solo
 * hace falta consultar el estado de un PR existente; el paso 6 suma listar ramas, crear y cerrar.
 *
 * Es **síncrono** porque la operación de `ejecutarServicio` corre dentro de la transacción del
 * almacén, que es síncrona, y el GitHub simulado siempre responde al recalcular (S1 del paso 5 de
 * la Fase 1). Con un backend real se reemplaza toda la capa `services/`, no solo este puerto.
 */

import type { ConsultaGitHub, Tarea } from '@/domain';

/** Lo que la simulación necesita de la tarea: la URL del PR y el último estado conocido. */
export type TareaConsultable = Pick<Tarea, 'url_pull_request' | 'estado_pr'>;

export interface PuertoGitHub {
  /**
   * Estado actual en GitHub del PR de la tarea: abierto (con o sin conflictos), fusionado o
   * cerrado. Solo se llama si `necesitaConsultaGitHub(tarea)`: la tarea requiere PR y ya tuvo uno.
   */
  consultarPullRequest(tarea: TareaConsultable): ConsultaGitHub;
}

/**
 * GitHub simulado: responde lo último que el sistema sabe de ese PR. Un `PENDIENTE` con URL es un
 * PR viejo ya fusionado (el recálculo «fusionado → PENDIENTE» conserva la URL), así que responde
 * fusionado. Una URL sin `estado_pr` no puede existir: es un dato roto y lanza.
 */
export function consultaSimulada(tarea: TareaConsultable): ConsultaGitHub {
  if (tarea.url_pull_request === null || tarea.estado_pr === null) {
    throw new Error('GitHub simulado: la tarea no tiene un Pull Request que consultar.');
  }
  switch (tarea.estado_pr) {
    case 'CREADO':
      return { estado: 'ABIERTO', conflictos: false };
    case 'CON_CONFLICTOS':
      return { estado: 'ABIERTO', conflictos: true };
    case 'FUSIONADO':
    case 'PENDIENTE':
      return { estado: 'FUSIONADO' };
    case 'CERRADO':
      return { estado: 'CERRADO' };
  }
}

export const GITHUB_SIMULADO: PuertoGitHub = { consultarPullRequest: consultaSimulada };

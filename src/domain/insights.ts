/**
 * Insights calculados por reglas y su registro de revisión.
 */

import type { FechaHora, Id, ReferenciaElemento } from './comunes';
import type { Severidad, TipoReglaInsight } from './enumeraciones';

/** No se guarda: se calcula a partir de las reglas y la configuración. */
export interface Insight {
  tipo_regla: TipoReglaInsight;
  severidad: Severidad;
  titulo: string;
  motivo: string;
  elemento: ReferenciaElemento;
  fecha_deteccion: FechaHora;
  revisado: boolean;
  /**
   * Todos los proyectos relacionados con el elemento afectado (un practicante
   * en dos proyectos lleva ambos); `[]` solo cuando el insight es de un postulante.
   */
  ids_proyecto: Id[];
}

export interface InsightRevision {
  id: Id;
  tipo_regla: TipoReglaInsight;
  elemento: ReferenciaElemento;
  severidad_al_revisar: Severidad;
  fecha: FechaHora;
  id_usuario: Id;
  nota: string | null;
}

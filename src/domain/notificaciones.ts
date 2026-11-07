/**
 * Notificaciones internas del sistema.
 */

import type { FechaHora, Id, ReferenciaElemento } from './comunes';
import type { TipoNotificacion } from './enumeraciones';

export interface Notificacion {
  id: Id;
  id_destinatario: Id;
  tipo: TipoNotificacion;
  mensaje: string;
  elemento: ReferenciaElemento;
  fecha: FechaHora;
  leida: boolean;
}

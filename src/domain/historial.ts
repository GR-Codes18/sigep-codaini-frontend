/**
 * Eventos inmutables del historial de actividad.
 *
 * La categoría no se guarda: se deriva de `tipo_accion` con
 * `ACCIONES_POR_CATEGORIA`.
 */

import type { FechaHora, Id, ReferenciaElemento } from './comunes';
import type { TipoAccionHistorial } from './enumeraciones';

export interface CambioRegistrado {
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
}

export type ElementoAfectado = ReferenciaElemento & { etiqueta: string };

export type AutorEvento = { tipo: 'USUARIO'; id_usuario: Id } | { tipo: 'SISTEMA' };

export interface EventoHistorial {
  id: Id;
  fecha: FechaHora;
  autor: AutorEvento;
  tipo_accion: TipoAccionHistorial;
  elemento: ElementoAfectado;
  id_proyecto: Id | null;
  cambios: CambioRegistrado[];
  nota: string | null;
}

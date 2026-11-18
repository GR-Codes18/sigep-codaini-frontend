/**
 * Del resultado negativo de `domain/cicloVida.ts` y `domain/reactivacion.ts` a un fallo con mensaje.
 *
 * El dominio devuelve el código y, en los bloqueos con conteo, una `cantidad`. El texto en español lo
 * pone `services/`: el de la tabla `MENSAJES`, o uno con la cantidad cuando la hay («Tiene 2 proyectos
 * activos o en pausa: reasígnalos antes de desactivarlo.»). Los códigos que ya traen `mensaje` (los de
 * reactivación) pasan tal cual.
 */

import type { ErrorCicloVida, ErrorReactivacion } from '@/domain';
import { fallo, type CamposConError, type Fallo } from './resultado';

function plural(cantidad: number, singular: string, plurales: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plurales}`;
}

function conCantidad(codigo: string, cantidad: number): string | undefined {
  switch (codigo) {
    case 'TAREAS_ESPERANDO_SUPERVISION':
      return `El proyecto tiene ${plural(cantidad, 'tarea esperando supervisión', 'tareas esperando supervisión')}: resuélvelas antes de finalizarlo.`;
    case 'SUPERVISOR_CON_PROYECTOS':
      return `El supervisor tiene ${plural(cantidad, 'proyecto activo o en pausa', 'proyectos activos o en pausa')}: reasígnalos antes de desactivarlo.`;
    default:
      return undefined;
  }
}

export function denegarCicloVida(
  error: ErrorCicloVida | ErrorReactivacion,
  campos?: CamposConError,
): Fallo {
  const cantidad = 'cantidad' in error ? error.cantidad : undefined;
  const mensaje =
    cantidad === undefined
      ? 'mensaje' in error
        ? error.mensaje
        : undefined
      : conCantidad(error.codigo, cantidad);
  return fallo(error.codigo, mensaje, campos);
}

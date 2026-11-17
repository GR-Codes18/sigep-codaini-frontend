/**
 * Ejecución de un servicio: demora → transacción → resultado.
 *
 * `ejecutarServicio` espera la demora simulada al inicio y después, dentro de una única
 * `transaccion` del almacén, toma la marca de tiempo y corre la operación del servicio con los
 * datos vigentes (el permiso, el estado de la tarea y las reglas se comprueban ahí, no antes).
 *   - Si la operación devuelve un error, no se escribe nada.
 *   - Si devuelve `{ ok: true, valor, cambios }`, todo se escribe en una sola operación atómica.
 *   - Si algo lanza una excepción, no se escribe nada y el resultado es `ERROR_INESPERADO`
 *     (mensaje genérico para la pantalla; el detalle va a la consola).
 */

import type { CambiosAlmacen, DatosAlmacen } from '@/data';
import type { EventoHistorial, Notificacion } from '@/domain';
import type { Entorno } from './entorno';
import { simularDemora } from './demora';
import { agregarEventos } from './historial';
import { crearMarca, type Marca } from './marca';
import { agregarNotificaciones } from './notificaciones';
import { exito, fallo, type Fallo, type Resultado } from './resultado';

export interface ContextoOperacion {
  /** Los datos vigentes en el momento de escribir. No se deben mutar. */
  datos: DatosAlmacen;
  /** Un único instante para todo lo que esta operación escribe. */
  marca: Marca;
  entorno: Entorno;
}

/** Lo que devuelve la operación de un servicio: un éxito con sus cambios, o un error. */
export type SalidaOperacion<T> = { ok: true; valor: T; cambios: CambiosAlmacen } | Fallo;

export async function ejecutarServicio<T>(
  entorno: Entorno,
  operacion: (contexto: ContextoOperacion) => SalidaOperacion<T>,
): Promise<Resultado<T>> {
  try {
    await simularDemora(entorno.demoraMs);
    const caja: { resultado: Resultado<T> | null } = { resultado: null };
    entorno.almacen.getState().transaccion((datos) => {
      const marca = crearMarca(entorno.ahora());
      const salida = operacion({ datos, marca, entorno });
      if (!salida.ok) {
        caja.resultado = salida;
        return null;
      }
      caja.resultado = exito(salida.valor);
      return salida.cambios;
    });
    return caja.resultado ?? fallo('ERROR_INESPERADO');
  } catch (error) {
    console.error('SIGEP: error inesperado en un servicio.', error);
    return fallo('ERROR_INESPERADO');
  }
}

/**
 * Suma los eventos y las notificaciones a los cambios de la operación, para escribirlos junto con
 * ellos en la misma operación atómica. No cambia el historial ni las notificaciones originales.
 */
export function conEfectos(
  datos: Pick<DatosAlmacen, 'historial' | 'notificaciones'>,
  cambios: CambiosAlmacen,
  efectos: {
    eventos?: readonly EventoHistorial[];
    notificaciones?: readonly Notificacion[];
  },
): CambiosAlmacen {
  const resultado: CambiosAlmacen = { ...cambios };
  const eventos = efectos.eventos ?? [];
  const notificaciones = efectos.notificaciones ?? [];
  if (eventos.length > 0) resultado.historial = agregarEventos(datos.historial, ...eventos);
  if (notificaciones.length > 0) {
    resultado.notificaciones = agregarNotificaciones(datos.notificaciones, ...notificaciones);
  }
  return resultado;
}

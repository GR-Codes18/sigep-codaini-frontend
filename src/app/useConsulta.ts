import { useEffect, useState } from 'react';
import { useAlmacen } from '@/data';
import type { Resultado } from '@/services';

export interface EstadoConsulta<T> {
  /** El valor de la última respuesta correcta; `null` mientras no llega o si falló. */
  valor: T | null;
  /** Mensaje del servicio si la consulta falló. */
  error: string | null;
  /** Todavía no llegó la primera respuesta de esta consulta. */
  cargando: boolean;
}

interface Respuesta<T> {
  origen: () => Promise<Resultado<T>>;
  resultado: Resultado<T>;
}

/**
 * Lee con una consulta de `services/consultas/` y la repite cuando cambia el almacén (una acción propia, el aviso de
 * otra persona…). El almacén se usa **solo como señal de cambio** y se queda aquí: las pantallas no lo leen.
 *
 * - `ejecutar` debe ser estable (`useCallback`) y cambia cuando cambia lo que se consulta (otra tarea, otro proyecto).
 *   Con `null` no se consulta nada.
 * - Mientras llega una respuesta nueva de la misma consulta se conserva la anterior, sin parpadeo; la respuesta de una
 *   consulta anterior (otra tarea) nunca se muestra, y una respuesta que llega tarde no pisa a otra más reciente.
 */
export function useConsulta<T>(ejecutar: (() => Promise<Resultado<T>>) | null): EstadoConsulta<T> {
  const senal = useAlmacen((estado) => estado.datos);
  const [respuesta, setRespuesta] = useState<Respuesta<T> | null>(null);

  useEffect(() => {
    if (ejecutar === null) return;
    let vigente = true;
    void ejecutar().then((resultado) => {
      if (vigente) setRespuesta({ origen: ejecutar, resultado });
    });
    return () => {
      vigente = false;
    };
  }, [ejecutar, senal]);

  if (ejecutar === null) return { valor: null, error: null, cargando: false };
  const actual = respuesta !== null && respuesta.origen === ejecutar ? respuesta.resultado : null;
  if (actual === null) return { valor: null, error: null, cargando: true };
  return actual.ok
    ? { valor: actual.valor, error: null, cargando: false }
    : { valor: null, error: actual.mensaje, cargando: false };
}

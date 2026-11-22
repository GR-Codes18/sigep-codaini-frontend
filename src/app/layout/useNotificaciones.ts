import { useEffect, useState } from 'react';
import { aNotificacionItem } from '@/app/adaptadores';
import { useSesionActiva } from '@/auth/useSesionActiva';
import type { NotificacionItem } from '@/compartido/CampanaNotificaciones';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { ENTORNO, listarNotificaciones, type Entorno } from '@/services';

export interface OpcionesNotificaciones {
  /** La campana pide las últimas 8. */
  limite?: number;
  soloNoLeidas?: boolean;
}

export interface NotificacionesDeLaPersona {
  /** Las más recientes primero, ya filtradas y limitadas por la consulta. */
  items: NotificacionItem[];
  /** Cuántas suyas siguen sin leer, sin importar el filtro ni el límite (punto verde de la campana). */
  noLeidas: number;
  /** Cuántas cumplen el filtro, antes del límite. */
  total: number;
  /** Todavía no llegó la primera respuesta. */
  cargando: boolean;
  /** Mensaje del servicio si la consulta falló. */
  error: string | null;
}

interface Respuesta {
  idUsuario: Id;
  items: NotificacionItem[];
  noLeidas: number;
  total: number;
  error: string | null;
}

/**
 * Notificaciones de la persona con sesión, leídas con `listarNotificaciones` (la consulta decide el alcance, el
 * orden y si el enlace está activo; el adaptador solo las presenta).
 *
 * Vuelve a consultar al montarse y cada vez que cambia la lista de notificaciones del almacén. Esa lista se usa
 * solo como señal de cambio y se queda aquí: los componentes no leen el almacén. Mientras llega una respuesta nueva se
 * conserva la anterior (sin parpadeo), y una respuesta que llega tarde no pisa a otra más reciente.
 */
export function useNotificaciones(
  { limite, soloNoLeidas }: OpcionesNotificaciones = {},
  entorno: Entorno = ENTORNO,
): NotificacionesDeLaPersona {
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;
  const rol = sesion?.rol ?? null;
  const senal = useAlmacen((estado) => estado.datos.notificaciones);
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);

  useEffect(() => {
    if (idUsuario === null || rol === null) return;
    let vigente = true;
    void listarNotificaciones(
      {
        idActor: idUsuario,
        ...(limite !== undefined ? { limite } : {}),
        ...(soloNoLeidas === true ? { solo_no_leidas: true } : {}),
      },
      entorno,
    ).then((resultado) => {
      if (!vigente) return;
      if (!resultado.ok) {
        setRespuesta({ idUsuario, items: [], noLeidas: 0, total: 0, error: resultado.mensaje });
        return;
      }
      const { notificaciones, no_leidas, total } = resultado.valor;
      setRespuesta({
        idUsuario,
        items: notificaciones.map((n) => aNotificacionItem(n, { idUsuario, rol })),
        noLeidas: no_leidas,
        total,
        error: null,
      });
    });
    return () => {
      vigente = false;
    };
  }, [senal, idUsuario, rol, limite, soloNoLeidas, entorno]);

  // Una respuesta de otra persona (cambió la sesión) no se muestra.
  const actual = respuesta !== null && respuesta.idUsuario === idUsuario ? respuesta : null;
  return {
    items: actual?.items ?? [],
    noLeidas: actual?.noLeidas ?? 0,
    total: actual?.total ?? 0,
    cargando: actual === null,
    error: actual?.error ?? null,
  };
}

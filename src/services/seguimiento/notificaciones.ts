/**
 * Marcar notificaciones como leídas (Fase 2, paso 10B; propuesta §8.1).
 *
 * Las notificaciones son **privadas de su destinatario**. La matriz de permisos (§4) no tiene una fila para esto, así
 * que no hay una acción en `puede()` (decisión de los autores): el servicio exige que quien actúa exista y esté
 * ACTIVO, y que la notificación sea suya; una ajena responde `NO_ENCONTRADO`, igual que una que no existe, para no
 * revelar que está. Son idempotentes: si ya estaba leída (o no había nada pendiente) devuelven éxito sin escribir
 * nada. Nada se borra y no deja evento de historial.
 */

import { z } from 'zod';
import type { DatosAlmacen } from '@/data';
import type { Id, Notificacion, Usuario } from '@/domain';
import { obtenerActor } from '../actor';
import { ENTORNO, type Entorno } from '../entorno';
import { exito, fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';
import { ejecutarServicio } from '../transaccional';

const esquemaUna = z.object({ idActor: esquemaId, idNotificacion: esquemaId });
const esquemaTodas = z.object({ idActor: esquemaId });

export type EntradaMarcarNotificacionLeida = z.input<typeof esquemaUna>;
export type EntradaMarcarTodasLeidas = z.input<typeof esquemaTodas>;

export interface TodasMarcadasLeidas {
  /** Cuántas estaban sin leer y se marcaron ahora. */
  marcadas: number;
}

/** El actor, solo si su cuenta está activa. */
function actorActivo(datos: Pick<DatosAlmacen, 'usuarios'>, idActor: Id): Resultado<Usuario> {
  const actor = obtenerActor(datos, idActor);
  if (!actor.ok) return actor;
  return actor.valor.estado === 'ACTIVO' ? exito(actor.valor) : fallo('USUARIO_INACTIVO');
}

export function marcarNotificacionLeida(
  entrada: EntradaMarcarNotificacionLeida,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Notificacion>> {
  return ejecutarServicio(entorno, ({ datos }) => {
    const valida = validarEntrada(esquemaUna, entrada);
    if (!valida.ok) return valida;
    const actor = actorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;

    const aviso = datos.notificaciones.find(
      (n) => n.id === valida.valor.idNotificacion && n.id_destinatario === actor.valor.id,
    );
    if (aviso === undefined) return fallo('NO_ENCONTRADO');
    if (aviso.leida) return { ok: true, valor: aviso, cambios: null };

    const leida: Notificacion = { ...aviso, leida: true };
    return {
      ok: true,
      valor: leida,
      cambios: {
        notificaciones: datos.notificaciones.map((n) => (n.id === aviso.id ? leida : n)),
      },
    };
  });
}

export function marcarTodasLeidas(
  entrada: EntradaMarcarTodasLeidas,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<TodasMarcadasLeidas>> {
  return ejecutarServicio(entorno, ({ datos }) => {
    const valida = validarEntrada(esquemaTodas, entrada);
    if (!valida.ok) return valida;
    const actor = actorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;

    const pendientes = datos.notificaciones.filter(
      (n) => n.id_destinatario === actor.valor.id && !n.leida,
    );
    if (pendientes.length === 0) return { ok: true, valor: { marcadas: 0 }, cambios: null };

    return {
      ok: true,
      valor: { marcadas: pendientes.length },
      cambios: {
        notificaciones: datos.notificaciones.map((n) =>
          n.id_destinatario === actor.valor.id && !n.leida ? { ...n, leida: true } : n,
        ),
      },
    };
  });
}

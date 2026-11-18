/**
 * Creación de notificaciones (§8.1).
 *
 * Regla central: la persona que realizó la acción no recibe aviso de su propia acción. También se
 * quitan los destinatarios repetidos. Quién debe recibir cada aviso lo decide el servicio con la
 * tabla de §8.1; esto solo aplica lo común. Un destinatario que no existe o un mensaje vacío son
 * errores de programación: lanzan, y como van dentro de la transacción no se escribe nada.
 */

import type {
  AutorEvento,
  Id,
  Notificacion,
  ReferenciaElemento,
  TipoNotificacion,
  Usuario,
} from '@/domain';
import { z } from 'zod';
import { obtenerActor } from './actor';
import { ENTORNO, type Entorno } from './entorno';
import type { Marca } from './marca';
import { fallo, validarEntrada, type Resultado } from './resultado';
import { ejecutarServicio } from './transaccional';

export interface EntradaNotificacion {
  /** Quien hizo la acción. `SISTEMA` o `null` si no la hizo ninguna persona. */
  autor: AutorEvento | null;
  destinatarios: readonly Id[];
  tipo: TipoNotificacion;
  mensaje: string;
  /** El elemento al que lleva el aviso. En asignaciones es el proyecto. */
  elemento: ReferenciaElemento;
}

export function crearNotificaciones(
  entrada: EntradaNotificacion,
  usuarios: readonly Pick<Usuario, 'id'>[],
  marca: Marca,
  generarId: (prefijo: string) => Id,
): Notificacion[] {
  if (entrada.mensaje.trim() === '') {
    throw new Error(`La notificación ${entrada.tipo} necesita un mensaje.`);
  }
  const existentes = new Set(usuarios.map((u) => u.id));
  const destinatarios = [...new Set(entrada.destinatarios)];
  for (const id of destinatarios) {
    if (!existentes.has(id)) {
      throw new Error(`El destinatario ${id} de la notificación ${entrada.tipo} no existe.`);
    }
  }
  const autor = entrada.autor?.tipo === 'USUARIO' ? entrada.autor.id_usuario : null;
  return destinatarios
    .filter((id) => id !== autor)
    .map((id) => ({
      id: generarId('ntf'),
      id_destinatario: id,
      tipo: entrada.tipo,
      mensaje: entrada.mensaje,
      elemento: { ...entrada.elemento },
      fecha: marca.ahora,
      leida: false,
    }));
}

/** Notificaciones con las nuevas al final. Devuelve una lista nueva; no cambia la original. */
export function agregarNotificaciones(
  existentes: readonly Notificacion[],
  ...nuevas: readonly Notificacion[]
): Notificacion[] {
  return [...existentes, ...nuevas];
}

const esquemaId = z.string().trim().min(1);

const esquemaMarcarUna = z.object({
  idActor: esquemaId,
  idNotificacion: esquemaId,
});

const esquemaMarcarTodas = z.object({
  idActor: esquemaId,
});

export type EntradaMarcarNotificacionLeida = z.input<typeof esquemaMarcarUna>;
export type EntradaMarcarTodasNotificacionesLeidas = z.input<typeof esquemaMarcarTodas>;

function actorActivo(datos: { usuarios: Usuario[] }, idActor: Id): Resultado<Usuario> {
  const resultado = obtenerActor(datos, idActor);
  if (!resultado.ok) return resultado;
  if (resultado.valor.estado !== 'ACTIVO') return fallo('USUARIO_INACTIVO');
  return resultado;
}

export function marcarNotificacionLeida(
  entrada: EntradaMarcarNotificacionLeida,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<void>> {
  return ejecutarServicio(entorno, ({ datos }) => {
    const validacion = validarEntrada(esquemaMarcarUna, entrada);
    if (!validacion.ok) return validacion;

    const actor = actorActivo(datos, validacion.valor.idActor);
    if (!actor.ok) return actor;

    const notificacion = datos.notificaciones.find(
      (item) =>
        item.id === validacion.valor.idNotificacion && item.id_destinatario === actor.valor.id,
    );
    if (notificacion === undefined) return fallo('NO_ENCONTRADO');
    if (notificacion.leida) return { ok: true, valor: undefined, cambios: {} };

    return {
      ok: true,
      valor: undefined,
      cambios: {
        notificaciones: datos.notificaciones.map((item) =>
          item.id === notificacion.id ? { ...item, leida: true } : item,
        ),
      },
    };
  });
}

export function marcarTodasNotificacionesLeidas(
  entrada: EntradaMarcarTodasNotificacionesLeidas,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<void>> {
  return ejecutarServicio(entorno, ({ datos }) => {
    const validacion = validarEntrada(esquemaMarcarTodas, entrada);
    if (!validacion.ok) return validacion;

    const actor = actorActivo(datos, validacion.valor.idActor);
    if (!actor.ok) return actor;

    const tieneSinLeer = datos.notificaciones.some(
      (item) => item.id_destinatario === actor.valor.id && !item.leida,
    );
    if (!tieneSinLeer) return { ok: true, valor: undefined, cambios: {} };

    return {
      ok: true,
      valor: undefined,
      cambios: {
        notificaciones: datos.notificaciones.map((item) =>
          item.id_destinatario === actor.valor.id ? { ...item, leida: true } : item,
        ),
      },
    };
  });
}

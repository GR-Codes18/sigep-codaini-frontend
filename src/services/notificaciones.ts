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
import type { Marca } from './marca';

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

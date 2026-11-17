/**
 * Registro de la semilla: junta los eventos del historial y las notificaciones que van
 * generando las demás piezas y, al cerrar, los ordena en el tiempo y les pone su ID.
 *
 * Solo sirve para armar los datos iniciales. Las reglas del sistema (notificar, registrar)
 * viven en `services/`; aquí se repite únicamente lo mínimo para que la semilla sea coherente:
 * quien hace la acción no se notifica a sí mismo.
 */

import type {
  AutorEvento,
  CambioRegistrado,
  ElementoAfectado,
  EventoHistorial,
  FechaHora,
  Id,
  Notificacion,
  ReferenciaElemento,
  TipoAccionHistorial,
  TipoNotificacion,
} from '@/domain';

const MS_POR_DIA = 86_400_000;

export interface EntradaEvento {
  fecha: FechaHora;
  autor: AutorEvento;
  tipo_accion: TipoAccionHistorial;
  elemento: ElementoAfectado;
  id_proyecto: Id | null;
  cambios?: CambioRegistrado[];
  nota?: string | null;
}

export interface EntradaNotificacion {
  fecha: FechaHora;
  /** Quien hizo la acción; `null` si no la hizo nadie (proceso del sistema). */
  autor: AutorEvento | null;
  destinatarios: readonly Id[];
  tipo: TipoNotificacion;
  mensaje: string;
  elemento: ReferenciaElemento;
}

export interface Registro {
  evento: (entrada: EntradaEvento) => void;
  notificar: (entrada: EntradaNotificacion) => void;
  /** Ordena por fecha (estable), asigna IDs y marca como leídas las de hace 3 días o más. */
  cerrar: (ahora: FechaHora) => { historial: EventoHistorial[]; notificaciones: Notificacion[] };
}

const DIAS_PARA_DAR_POR_LEIDA = 3;

const numero = (n: number) => String(n).padStart(4, '0');

function ordenarPorFecha<T extends { fecha: FechaHora }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha));
}

export function crearRegistro(): Registro {
  const eventos: Omit<EventoHistorial, 'id'>[] = [];
  const avisos: Omit<Notificacion, 'id' | 'leida'>[] = [];

  return {
    evento: (entrada) => {
      eventos.push({
        fecha: entrada.fecha,
        autor: entrada.autor,
        tipo_accion: entrada.tipo_accion,
        elemento: entrada.elemento,
        id_proyecto: entrada.id_proyecto,
        cambios: entrada.cambios ?? [],
        nota: entrada.nota ?? null,
      });
    },
    notificar: (entrada) => {
      const destinatarios = new Set(entrada.destinatarios);
      for (const id_destinatario of destinatarios) {
        if (entrada.autor?.tipo === 'USUARIO' && entrada.autor.id_usuario === id_destinatario) {
          continue;
        }
        avisos.push({
          id_destinatario,
          tipo: entrada.tipo,
          mensaje: entrada.mensaje,
          elemento: entrada.elemento,
          fecha: entrada.fecha,
        });
      }
    },
    cerrar: (ahora) => {
      const limite = Date.parse(ahora) - DIAS_PARA_DAR_POR_LEIDA * MS_POR_DIA;
      return {
        historial: ordenarPorFecha(eventos).map((e, i) => ({ id: `evt-${numero(i + 1)}`, ...e })),
        notificaciones: ordenarPorFecha(avisos).map((a, i) => ({
          id: `ntf-${numero(i + 1)}`,
          ...a,
          leida: Date.parse(a.fecha) <= limite,
        })),
      };
    },
  };
}

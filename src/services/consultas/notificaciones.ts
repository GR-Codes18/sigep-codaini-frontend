/**
 * Consulta de notificaciones (Fase 2, paso 11D; propuesta §8.1).
 *
 * Las notificaciones son **privadas de su destinatario**: la consulta solo trae las de quien consulta, sea
 * cual sea su rol (no hay una fila en la matriz de §4, igual que marcarlas como leídas). El enlace de cada
 * una está activo solo si el elemento **existe y quien mira puede abrirlo** (decisión Q9.4): así la pantalla no
 * lleva a una página que respondería `FUERA_DE_ALCANCE`. Nada se borra y la consulta no escribe.
 */

import { z } from 'zod';
import type { DatosAlmacen } from '@/data';
import {
  puede,
  puedeEnRol,
  type Notificacion,
  type ReferenciaElemento,
  type Usuario,
} from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { validarEntrada, type Resultado } from '../resultado';
import { asignacionesDe, esquemaId } from '../tareas/comun';
import { ejecutarConsulta } from '../transaccional';
import { cargarActorActivo, existeElemento } from './comun';
import { proyectosDelSupervisor } from './practicantes';

/** A qué pantalla lleva el enlace; `null` = enlace desactivado (el elemento no existe o no puede abrirlo). */
export type DestinoDeNotificacion = 'DETALLE' | 'RESUMEN_PROYECTO_ANTERIOR' | null;

export type NotificacionVista = Omit<Notificacion, 'id_destinatario'> & {
  destino: DestinoDeNotificacion;
  enlace_activo: boolean;
};

export interface ListadoNotificaciones {
  /** Las más recientes primero, ya filtradas y limitadas. */
  notificaciones: NotificacionVista[];
  /** Cuántas notificaciones **suyas** siguen sin leer (para el punto de la campana), sin importar el filtro. */
  no_leidas: number;
  /** Cuántas cumplen el filtro, antes de aplicar `limite` (para «Ver todas»). */
  total: number;
}

const esquemaEntrada = z.object({
  idActor: esquemaId,
  solo_no_leidas: z.boolean().optional(),
  /** La campana pide las últimas 8. */
  limite: z
    .number()
    .int('El límite debe ser un número entero.')
    .min(1, 'El límite debe ser al menos 1.')
    .optional(),
});
export type EntradaListarNotificaciones = z.input<typeof esquemaEntrada>;

/** Dónde puede abrir `actor` el elemento de un aviso. */
function destinoDe(
  datos: DatosAlmacen,
  actor: Usuario,
  elemento: ReferenciaElemento,
): DestinoDeNotificacion {
  if (!existeElemento(datos, elemento.tipo, elemento.id)) return null;
  const asignaciones = asignacionesDe(datos, actor.id);

  switch (elemento.tipo) {
    case 'TAREA': {
      const tarea = datos.tareas.find((t) => t.id === elemento.id);
      const proyecto = datos.proyectos.find((p) => p.id === tarea?.id_proyecto);
      if (tarea === undefined || proyecto === undefined) return null;
      return puede(actor, 'VER_TAREA', { proyecto, tarea, asignaciones }).permitido
        ? 'DETALLE'
        : null;
    }
    case 'PROYECTO': {
      const proyecto = datos.proyectos.find((p) => p.id === elemento.id);
      if (proyecto === undefined) return null;
      if (puede(actor, 'VER_PROYECTO', { proyecto, asignaciones }).permitido) return 'DETALLE';
      return puede(actor, 'VER_RESUMEN_PROYECTO_ANTERIOR', { proyecto, asignaciones }).permitido
        ? 'RESUMEN_PROYECTO_ANTERIOR'
        : null;
    }
    case 'USUARIO': {
      if (elemento.id === actor.id) return 'DETALLE';
      if (actor.rol === 'ADMINISTRADOR') return 'DETALLE';
      if (actor.rol === 'SUPERVISOR') {
        const propios = new Set(proyectosDelSupervisor(datos, actor).map((p) => p.id));
        return datos.asignaciones.some(
          (a) => a.id_practicante === elemento.id && propios.has(a.id_proyecto),
        )
          ? 'DETALLE'
          : null;
      }
      return null;
    }
    case 'POSTULANTE':
      return puedeEnRol(actor, 'VER_POSTULACIONES').permitido ? 'DETALLE' : null;
    case 'AREA_TECNICA':
    case 'ESPECIALIDAD':
    case 'CRITERIO_EVALUACION':
      return puedeEnRol(actor, 'GESTIONAR_CRITERIOS_EVALUACION').permitido ? 'DETALLE' : null;
    case 'PARAMETRO_CONFIGURACION':
      return puedeEnRol(actor, 'GESTIONAR_CONFIGURACION').permitido ? 'DETALLE' : null;
  }
}

export function listarNotificaciones(
  entrada: EntradaListarNotificaciones,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<ListadoNotificaciones>> {
  return ejecutarConsulta(entorno, ({ datos }) => {
    const valida = validarEntrada(esquemaEntrada, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const yo = actor.valor;

    const propias = datos.notificaciones.filter((n) => n.id_destinatario === yo.id);
    const filtradas = (
      valida.valor.solo_no_leidas === true ? propias.filter((n) => !n.leida) : propias
    ).sort(
      (a, b) =>
        Date.parse(b.fecha) - Date.parse(a.fecha) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
    );

    const notificaciones = filtradas.slice(0, valida.valor.limite).map((n): NotificacionVista => {
      const destino = destinoDe(datos, yo, n.elemento);
      return {
        id: n.id,
        tipo: n.tipo,
        mensaje: n.mensaje,
        elemento: { ...n.elemento },
        fecha: n.fecha,
        leida: n.leida,
        destino,
        enlace_activo: destino !== null,
      };
    });

    return {
      ok: true,
      valor: {
        notificaciones,
        no_leidas: propias.filter((n) => !n.leida).length,
        total: filtradas.length,
      },
    };
  });
}

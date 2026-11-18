/**
 * Acciones disponibles en el detalle de una tarea (Fase 2, paso 11A; propuesta §6.7).
 *
 * §6.7: *«la función única de reglas decide cuáles botones se muestran»*. Esta función reúne en
 * un solo lugar lo que ya deciden las reglas de `domain/`: las siete transiciones (§6.2), editar
 * los datos, cambiar «Requiere supervisión» y «Requiere PR», eliminar, y crear o cerrar el Pull
 * Request. No agrega ninguna regla nueva: pregunta a cada una con el texto **todavía no escrito**
 * (`undefined`), así que una acción que exige motivo o nota sigue disponible y devuelve qué texto
 * exige para que la interfaz abra el modal.
 *
 * Quien no tiene permiso sobre la tarea (por ejemplo, un practicante frente a la tarea de un
 * compañero) recibe `[]`: el detalle queda en solo lectura (§6.7, último punto).
 *
 * El orden es estable: primero las transiciones en el orden de §6.2, luego editar, las opciones,
 * el Pull Request y, al final, eliminar (la acción destructiva).
 *
 * La función solo devuelve **qué** se puede hacer; las etiquetas y los botones son de la
 * interfaz. No importa React, Zustand, `data/` ni `services/`.
 */

import {
  puedeCambiarRequierePR,
  puedeCambiarRequiereSupervision,
  puedeEditarDatosTarea,
  puedeEliminarTarea,
} from './edicionTarea';
import { puedeCerrarPullRequest, puedeCrearPullRequest } from './estadoPR';
import type { TextoExigido } from './permisos';
import type { Tarea } from './tareas';
import { transicionesDisponibles } from './transiciones';
import type { AccionTransicion, ContextoTransicion } from './transiciones';
import type { Usuario } from './usuarios';

/** Acciones de la tarea que no son transiciones de estado. */
export const ACCIONES_TAREA_ADICIONALES = [
  'EDITAR_DATOS',
  'CAMBIAR_REQUIERE_SUPERVISION',
  'ACTIVAR_REQUIERE_PR',
  'DESACTIVAR_REQUIERE_PR',
  'CREAR_PULL_REQUEST',
  'CERRAR_PULL_REQUEST',
  'ELIMINAR',
] as const;

export type AccionTareaAdicional = (typeof ACCIONES_TAREA_ADICIONALES)[number];

export type AccionDeTarea = AccionTransicion | AccionTareaAdicional;

export interface AccionDisponible {
  accion: AccionDeTarea;
  /** Texto que la interfaz debe pedir antes de ejecutarla; `null` si no pide ninguno. */
  exige_texto: TextoExigido;
}

/**
 * Las acciones que `usuario` puede ejecutar ahora sobre `tarea`, en el orden descrito arriba.
 * `contexto.asignaciones` son las de quien actúa, igual que en `transicionesDisponibles`.
 */
export function accionesDeTarea(
  tarea: Tarea,
  usuario: Usuario,
  contexto: ContextoTransicion,
): AccionDisponible[] {
  const acciones: AccionDisponible[] = transicionesDisponibles(tarea, usuario, contexto).map(
    ({ transicion, exige_texto }) => ({ accion: transicion, exige_texto }),
  );

  const editar = puedeEditarDatosTarea(tarea, usuario, contexto);
  if (editar.permitido) {
    acciones.push({ accion: 'EDITAR_DATOS', exige_texto: editar.exige_texto });
  }

  const supervision = puedeCambiarRequiereSupervision(tarea, usuario, contexto);
  if (supervision.permitido) {
    acciones.push({ accion: 'CAMBIAR_REQUIERE_SUPERVISION', exige_texto: supervision.exige_texto });
  }

  // «Requiere PR» ofrece solo el cambio que tiene sentido: desactivar si está activo y activar si no.
  const cambioPR = puedeCambiarRequierePR(tarea, usuario, contexto, !tarea.requiere_pr);
  if (cambioPR.permitido) {
    acciones.push({
      accion: tarea.requiere_pr ? 'DESACTIVAR_REQUIERE_PR' : 'ACTIVAR_REQUIERE_PR',
      exige_texto: cambioPR.exige_texto,
    });
  }

  const crearPR = puedeCrearPullRequest(tarea, usuario, contexto);
  if (crearPR.permitido) {
    acciones.push({ accion: 'CREAR_PULL_REQUEST', exige_texto: crearPR.exige_texto });
  }

  const cerrarPR = puedeCerrarPullRequest(tarea, usuario, contexto);
  if (cerrarPR.permitido) {
    acciones.push({ accion: 'CERRAR_PULL_REQUEST', exige_texto: cerrarPR.exige_texto });
  }

  const eliminar = puedeEliminarTarea(tarea, usuario, contexto);
  if (eliminar.permitido) {
    acciones.push({ accion: 'ELIMINAR', exige_texto: eliminar.exige_texto });
  }

  return acciones;
}

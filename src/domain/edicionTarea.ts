/**
 * Reglas de edición de una tarea y de sus dos opciones (Fase 1, paso 4).
 *
 * Cubre cuatro decisiones de la propuesta que `puede()` no puede tomar porque dependen del
 * estado de la tarea o de si ya hubo un Pull Request:
 *   - editar título, descripción y fecha límite (§6.4);
 *   - cambiar «Requiere supervisión» (§6.3);
 *   - activar o desactivar «Requiere PR» (§4 y §7.5);
 *   - eliminar una tarea DISPONIBLE sin Pull Request (§6.4).
 *
 * Orden de comprobación, detenido en la primera negativa:
 *   `puede()` → estado → `tuvoPullRequest` → texto.
 *
 * «Requiere PR» es la única excepción al estado: §4 no lo restringe por el estado de la tarea,
 * así que solo se miran el PR existente y el motivo. Eliminar mira el estado antes que el PR y
 * editar datos / «Requiere supervisión» no miran el PR.
 *
 * `tuvoPullRequest` es `url_pull_request !== null`: un PR **cerrado** también cuenta como «ya
 * hubo PR», porque la URL se conserva al cerrar, devolver o reabrir.
 *
 * El resultado de edición añade `avisar_responsable`, que solo puede ser `true` en
 * `puedeEditarDatosTarea` cuando la tarea está EN_PROGRESO y tiene responsable (§6.4). Las demás
 * funciones lo devuelven en `false`.
 *
 * Si `valor` coincide con `tarea.requiere_pr`, `domain/` **no decide**: un cambio que no cambia
 * nada se rechaza en Zod o en el servicio, no aquí (ver `DECISIONES.md`).
 *
 * No importa React, Zustand, `data/` ni `services/`.
 */

import type { CodigoDenegacion, TextoExigido } from './permisos';
import { puede } from './permisos';
import type { Tarea } from './tareas';
import { TEXTO_OBLIGATORIO, validarTexto } from './transiciones';
import type { ContextoTransicion } from './transiciones';
import type { Usuario } from './usuarios';

/** Códigos que añade la capa de edición. Los de `puede()` se conservan tal cual. */
export const CODIGOS_EDICION = [
  'TAREA_NO_EDITABLE',
  'TAREA_YA_TIENE_PR',
  'TAREA_NO_ELIMINABLE',
  TEXTO_OBLIGATORIO,
] as const;

export type CodigoEdicionPropio = (typeof CODIGOS_EDICION)[number];
export type CodigoEdicion = CodigoDenegacion | CodigoEdicionPropio;

/**
 * Resultado de una regla de edición. `avisar_responsable` solo puede ser `true` al editar los
 * datos de una tarea EN_PROGRESO con responsable; en el resto de las reglas es `false`.
 */
export type ResultadoEdicion =
  | { permitido: true; exige_texto: TextoExigido; avisar_responsable: boolean }
  | { permitido: false; codigo: CodigoEdicion };

/**
 * ¿La tarea ya tuvo un Pull Request? Un PR cerrado cuenta: la URL se conserva y el historial
 * debe seguir sabiendo que hubo trabajo.
 */
export function tuvoPullRequest(tarea: Pick<Tarea, 'url_pull_request'>): boolean {
  return tarea.url_pull_request !== null;
}

/**
 * ¿Puede el usuario editar título, descripción y fecha límite? §6.4: solo mientras la tarea está
 * DISPONIBLE o EN_PROGRESO. Los tres campos comparten la misma regla, por eso la función no
 * recibe cuál se edita.
 *
 * Si la tarea está EN_PROGRESO, el servicio debe avisar al practicante responsable: por eso el
 * resultado devuelve `avisar_responsable`.
 */
export function puedeEditarDatosTarea(
  tarea: Tarea,
  usuario: Usuario,
  contexto: ContextoTransicion,
): ResultadoEdicion {
  // 1. Quién: rol, alcance, identidad y proyecto FINALIZADO viven en `puede()`.
  const permiso = puede(usuario, 'EDITAR_DATOS_TAREA', {
    proyecto: contexto.proyecto,
    tarea,
  });
  if (!permiso.permitido) {
    return permiso;
  }

  // 2. Estado: «Esperando supervisión» y «Terminada» no se editan (§6.4).
  if (tarea.estado !== 'DISPONIBLE' && tarea.estado !== 'EN_PROGRESO') {
    return { permitido: false, codigo: 'TAREA_NO_EDITABLE' };
  }

  return {
    permitido: true,
    exige_texto: permiso.exige_texto,
    avisar_responsable: tarea.estado === 'EN_PROGRESO' && tarea.id_practicante !== null,
  };
}

/**
 * ¿Puede el usuario cambiar «Requiere supervisión»? §6.3: solo Supervisor y Administrador, y
 * solo mientras la tarea no esté ESPERANDO_SUPERVISION ni TERMINADA. No mira el PR ni pide texto.
 */
export function puedeCambiarRequiereSupervision(
  tarea: Tarea,
  usuario: Usuario,
  contexto: ContextoTransicion,
): ResultadoEdicion {
  // 1. Quién: `puede()` ya limita a Administrador y Supervisor del proyecto.
  const permiso = puede(usuario, 'CAMBIAR_REQUIERE_SUPERVISION', {
    proyecto: contexto.proyecto,
    tarea,
  });
  if (!permiso.permitido) {
    return permiso;
  }

  // 2. Estado: las mismas dos ventanas que editar los datos (§6.3).
  if (tarea.estado !== 'DISPONIBLE' && tarea.estado !== 'EN_PROGRESO') {
    return { permitido: false, codigo: 'TAREA_NO_EDITABLE' };
  }

  return { permitido: true, exige_texto: permiso.exige_texto, avisar_responsable: false };
}

/**
 * ¿Puede el usuario activar (`valor === true`) o desactivar (`valor === false`) «Requiere PR»?
 *
 * §4 y §7.5: Administrador y Supervisor pueden ambas cosas si aún no hubo PR; el Practicante
 * responsable solo desactivar y con motivo. La condición «aún no hubo PR» se comprueba para los
 * tres roles, después de `puede()` y antes del texto: un PR existente pesa más que un motivo
 * faltante.
 *
 * El estado de la tarea **no** se mira aquí (§4 no lo restringe). Si la tarea está en
 * ESPERANDO_SUPERVISION o TERMINADA con `estado_pr === null`, la activación se permite y el paso
 * 5 la dejará en PENDIENTE.
 */
export function puedeCambiarRequierePR(
  tarea: Tarea,
  usuario: Usuario,
  contexto: ContextoTransicion,
  valor: boolean,
  motivo?: string,
): ResultadoEdicion {
  const accion = valor ? 'ACTIVAR_REQUIERE_PR' : 'DESACTIVAR_REQUIERE_PR';

  // 1. Quién: el rol decide además si exige motivo (Practicante al desactivar).
  const permiso = puede(usuario, accion, {
    proyecto: contexto.proyecto,
    tarea,
    asignaciones: contexto.asignaciones,
  });
  if (!permiso.permitido) {
    return permiso;
  }

  // 2. Condición: sin estado de por medio, «ya hubo PR» se comprueba para los tres roles.
  if (tuvoPullRequest(tarea)) {
    return { permitido: false, codigo: 'TAREA_YA_TIENE_PR' };
  }

  // 3. Texto: solo el Practicante que desactiva envía motivo obligatorio.
  if (validarTexto({ motivo }, permiso.exige_texto) !== null) {
    return { permitido: false, codigo: TEXTO_OBLIGATORIO };
  }

  return { permitido: true, exige_texto: permiso.exige_texto, avisar_responsable: false };
}

/**
 * ¿Puede el usuario eliminar la tarea? §6.4: solo si está DISPONIBLE y nunca tuvo Pull Request.
 * El motivo es obligatorio para Administrador y Supervisor (`puede()` lo exige).
 *
 * El orden es `puede()` → estado → PR → texto: una tarea que no está DISPONIBLE responde
 * `TAREA_NO_ELIMINABLE` aunque además tenga PR. No se lee el historial: la URL es la única
 * prueba de trabajo realizado que necesita esta regla.
 */
export function puedeEliminarTarea(
  tarea: Tarea,
  usuario: Usuario,
  contexto: ContextoTransicion,
  motivo?: string,
): ResultadoEdicion {
  // 1. Quién: Administrador o Supervisor del proyecto, con motivo.
  const permiso = puede(usuario, 'ELIMINAR_TAREA', {
    proyecto: contexto.proyecto,
    tarea,
  });
  if (!permiso.permitido) {
    return permiso;
  }

  // 2. Estado: solo una tarea DISPONIBLE.
  if (tarea.estado !== 'DISPONIBLE') {
    return { permitido: false, codigo: 'TAREA_NO_ELIMINABLE' };
  }

  // 3. Condición: una tarea con trabajo realizado nunca se elimina.
  if (tuvoPullRequest(tarea)) {
    return { permitido: false, codigo: 'TAREA_YA_TIENE_PR' };
  }

  // 4. Texto: motivo no vacío.
  if (validarTexto({ motivo }, permiso.exige_texto) !== null) {
    return { permitido: false, codigo: TEXTO_OBLIGATORIO };
  }

  return { permitido: true, exige_texto: permiso.exige_texto, avisar_responsable: false };
}

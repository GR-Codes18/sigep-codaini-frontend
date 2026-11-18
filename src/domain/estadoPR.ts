/**
 * Máquina del estado del Pull Request (Fase 1, paso 5).
 *
 * `siguienteEstadoPR` es la única fuente de la tabla de §7.4: recibe la tarea y un evento y
 * devuelve el nuevo `estado_pr`. El estado del PR va por separado del de la tarea (§7.1), así que
 * esta función nunca cambia `Tarea.estado`, ni la URL ni las ramas (las escribe el servicio).
 *
 * `domain/` no consulta GitHub. Cuando un evento depende de GitHub, el servicio hace la consulta
 * (simulada en el prototipo) y pasa el resultado como `ConsultaGitHub`. `necesitaConsultaGitHub`
 * le dice al servicio cuándo debe hacerla al volver a llegar.
 *
 * Decisiones de los autores (2026-11-13):
 *   - Una tarea que llega a ESPERANDO_SUPERVISION o TERMINADA sin «Requiere PR» deja `estado_pr`
 *     como estaba (`null` la primera vez). Si después se activa la opción, C1 lo pasa a PENDIENTE.
 *   - «No requiere PR» solo cambia `requiere_pr`: `estado_pr` se conserva y `etiquetaPRVisible`
 *     lo oculta.
 *   - Crear y cerrar un PR solo se puede con la etiqueta visible: tarea ESPERANDO_SUPERVISION o
 *     TERMINADA con `requiere_pr` activo.
 *
 * «Llegar» es solo ENVIAR_A_SUPERVISION o MARCAR_TERMINADA. APROBAR no recalcula: §7.4 dice
 * «Terminada (sin supervisión)», y la tarea supervisada ya llegó al pasar a ESPERANDO_SUPERVISION.
 *
 * Crear y cerrar comprueban, en este orden y detenidos en la primera negativa:
 *   `puede()` → estado de la tarea → `requiere_pr` → `estado_pr` → texto.
 *
 * No importa React, Zustand, `data/` ni `services/`.
 */

import type { EstadoPR, EstadoTarea } from './enumeraciones';
import type { CodigoDenegacion, TextoExigido } from './permisos';
import { puede } from './permisos';
import type { Tarea } from './tareas';
import type { ContextoTransicion } from './transiciones';
import { TEXTO_OBLIGATORIO, validarTexto } from './transiciones';
import type { Usuario } from './usuarios';

/** Códigos que añade la capa del PR. Los de `puede()` se conservan tal cual. */
export const CODIGOS_PR = [
  'TAREA_SIN_ETIQUETA_PR',
  'TAREA_NO_REQUIERE_PR',
  'ESTADO_PR_NO_APLICA',
  'FALTA_CONSULTA_GITHUB',
  TEXTO_OBLIGATORIO,
] as const;

export type CodigoPRPropio = (typeof CODIGOS_PR)[number];

/** Lo que GitHub responde sobre un PR existente (§7.6: abierto, fusionado o cerrado, y conflictos). */
export type ConsultaGitHub =
  { estado: 'ABIERTO'; conflictos: boolean } | { estado: 'FUSIONADO' } | { estado: 'CERRADO' };

/** Resultado de crear un PR: uno nuevo o uno que ya existía para esas ramas (§7.5). */
export type ResultadoCreacionPR = 'NUEVO' | 'EXISTENTE_ABIERTO' | 'EXISTENTE_FUSIONADO';

/** Los eventos de la tabla de §7.4. */
export type EventoPR =
  /**
   * La tarea llega a ESPERANDO_SUPERVISION o TERMINADA (ENVIAR_A_SUPERVISION o MARCAR_TERMINADA).
   * Si ya hubo PR, `github` es obligatorio: ver `necesitaConsultaGitHub`.
   */
  | { tipo: 'TAREA_ENVIADA_O_TERMINADA'; github?: ConsultaGitHub }
  /** El servicio creó el PR o detectó uno existente. Un error al crear no es un evento. */
  | { tipo: 'PR_CREADO'; resultado: ResultadoCreacionPR }
  /** GitHub informa conflictos, su resolución, la fusión o el cierre. */
  | { tipo: 'GITHUB_INFORMA'; consulta: ConsultaGitHub }
  /** Alguien cerró el PR desde el sistema (ver `puedeCerrarPullRequest`). */
  | { tipo: 'PR_CERRADO_DESDE_SISTEMA' }
  /** Se activó (`true`) o desactivó (`false`) «Requiere PR» (ver `puedeCambiarRequierePR`). */
  | { tipo: 'REQUIERE_PR_CAMBIADO'; valor: boolean };

export type CodigoEventoPR = Extract<
  CodigoPRPropio,
  'ESTADO_PR_NO_APLICA' | 'FALTA_CONSULTA_GITHUB'
>;

/** `aplica: true` puede devolver el mismo `estado_pr`: el servicio decide si hubo cambio. */
export type ResultadoEventoPR =
  { aplica: true; estado_pr: EstadoPR | null } | { aplica: false; codigo: CodigoEventoPR };

export type CodigoAccionPR = CodigoDenegacion | Exclude<CodigoPRPropio, 'FALTA_CONSULTA_GITHUB'>;

export type ResultadoAccionPR =
  { permitido: true; exige_texto: TextoExigido } | { permitido: false; codigo: CodigoAccionPR };

/** Datos de la tarea que mira la máquina. */
export type TareaPR = Pick<Tarea, 'estado' | 'requiere_pr' | 'estado_pr' | 'url_pull_request'>;

/** Estados de la tarea en los que existe la etiqueta del PR (§7.3). */
const ESTADOS_CON_ETIQUETA: readonly EstadoTarea[] = ['ESPERANDO_SUPERVISION', 'TERMINADA'];

/** Desde dónde se crea un PR: aún no existe o el anterior se cerró sin fusionar (§7.3). */
const ESTADOS_PR_PARA_CREAR: readonly EstadoPR[] = ['PENDIENTE', 'CERRADO'];

/** Desde dónde se cierra o cambia un PR: abierto, con o sin conflictos (§7.5). */
const ESTADOS_PR_ABIERTO: readonly EstadoPR[] = ['CREADO', 'CON_CONFLICTOS'];

function incluye(estados: readonly EstadoPR[], estado: EstadoPR | null): boolean {
  return estado !== null && estados.includes(estado);
}

function aplica(estado_pr: EstadoPR | null): ResultadoEventoPR {
  return { aplica: true, estado_pr };
}

const NO_APLICA: ResultadoEventoPR = { aplica: false, codigo: 'ESTADO_PR_NO_APLICA' };

/** PR abierto: CREADO, o CON_CONFLICTOS si GitHub detecta conflictos. */
function estadoAbierto(consulta: { conflictos: boolean }): EstadoPR {
  return consulta.conflictos ? 'CON_CONFLICTOS' : 'CREADO';
}

/**
 * Recalcular al volver a llegar (§7.4, fila «se devuelve o se reabre»): un PR fusionado vuelve a
 * PENDIENTE porque las correcciones van en un PR nuevo.
 */
function recalcularAlLlegar(consulta: ConsultaGitHub): EstadoPR {
  switch (consulta.estado) {
    case 'ABIERTO':
      return estadoAbierto(consulta);
    case 'FUSIONADO':
      return 'PENDIENTE';
    case 'CERRADO':
      return 'CERRADO';
  }
}

/** Aviso de GitHub sobre un PR abierto: conflictos, resolución, fusión o cierre (§7.4). */
function estadoInformado(consulta: ConsultaGitHub): EstadoPR {
  switch (consulta.estado) {
    case 'ABIERTO':
      return estadoAbierto(consulta);
    case 'FUSIONADO':
      return 'FUSIONADO';
    case 'CERRADO':
      return 'CERRADO';
  }
}

/**
 * ¿La etiqueta del PR se muestra? §7.3: solo en ESPERANDO_SUPERVISION o TERMINADA y con «Requiere
 * PR» activo. Devuelve la etiqueta o `null` si no se muestra.
 */
export function etiquetaPRVisible(
  tarea: Pick<Tarea, 'estado' | 'requiere_pr' | 'estado_pr'>,
): EstadoPR | null {
  if (!tarea.requiere_pr || !ESTADOS_CON_ETIQUETA.includes(tarea.estado)) {
    return null;
  }
  return tarea.estado_pr;
}

/**
 * ¿El servicio debe consultar GitHub antes de avisar que la tarea llegó? Solo si la tarea requiere
 * PR y ya tuvo uno: sin URL no hay nada que consultar y el resultado es PENDIENTE.
 */
export function necesitaConsultaGitHub(
  tarea: Pick<Tarea, 'requiere_pr' | 'url_pull_request'>,
): boolean {
  return tarea.requiere_pr && tarea.url_pull_request !== null;
}

/**
 * Nuevo `estado_pr` tras un evento de §7.4. Pura y sin usuario: los permisos de crear, cerrar y
 * cambiar «Requiere PR» se deciden antes, con `puedeCrearPullRequest`, `puedeCerrarPullRequest` y
 * `puedeCambiarRequierePR`.
 */
export function siguienteEstadoPR(tarea: TareaPR, evento: EventoPR): ResultadoEventoPR {
  switch (evento.tipo) {
    case 'TAREA_ENVIADA_O_TERMINADA': {
      // Sin «Requiere PR» no hay etiqueta: se conserva lo que había (`null` la primera vez).
      if (!tarea.requiere_pr) return aplica(tarea.estado_pr);
      // Nunca hubo PR: primera llegada (`null`) o vuelta con PENDIENTE.
      if (tarea.url_pull_request === null) return aplica('PENDIENTE');
      // Ya hubo PR: solo GitHub sabe cómo está. Nunca se adivina.
      if (evento.github === undefined) {
        return { aplica: false, codigo: 'FALTA_CONSULTA_GITHUB' };
      }
      return aplica(recalcularAlLlegar(evento.github));
    }

    case 'PR_CREADO': {
      if (!incluye(ESTADOS_PR_PARA_CREAR, tarea.estado_pr)) return NO_APLICA;
      return aplica(evento.resultado === 'EXISTENTE_FUSIONADO' ? 'FUSIONADO' : 'CREADO');
    }

    case 'GITHUB_INFORMA': {
      // FUSIONADO es final; desde CERRADO solo se sale creando otro PR.
      if (!incluye(ESTADOS_PR_ABIERTO, tarea.estado_pr)) return NO_APLICA;
      return aplica(estadoInformado(evento.consulta));
    }

    case 'PR_CERRADO_DESDE_SISTEMA': {
      // Un PR fusionado no se puede cerrar (§7.5).
      if (!incluye(ESTADOS_PR_ABIERTO, tarea.estado_pr)) return NO_APLICA;
      return aplica('CERRADO');
    }

    case 'REQUIERE_PR_CAMBIADO': {
      // C1: activar en una tarea que ya llegó sin «Requiere PR» la deja en PENDIENTE.
      if (evento.valor && tarea.estado_pr === null && ESTADOS_CON_ETIQUETA.includes(tarea.estado)) {
        return aplica('PENDIENTE');
      }
      // Desactivar conserva el valor (lo oculta `etiquetaPRVisible`); activar antes de llegar
      // deja `null` hasta la llegada.
      return aplica(tarea.estado_pr);
    }
  }
}

/** Etiqueta visible: estado de la tarea primero, `requiere_pr` después. */
function comprobarEtiqueta(tarea: Tarea): CodigoAccionPR | null {
  if (!ESTADOS_CON_ETIQUETA.includes(tarea.estado)) return 'TAREA_SIN_ETIQUETA_PR';
  if (!tarea.requiere_pr) return 'TAREA_NO_REQUIERE_PR';
  return null;
}

/**
 * ¿Puede el usuario crear un PR? §4 y §7.2: solo el practicante responsable, con la etiqueta
 * visible y en PENDIENTE o CERRADO («Crear nuevo PR»). No exige texto.
 */
export function puedeCrearPullRequest(
  tarea: Tarea,
  usuario: Usuario,
  contexto: ContextoTransicion,
): ResultadoAccionPR {
  // 1. Quién: rol, alcance, responsable y proyecto FINALIZADO viven en `puede()`.
  const permiso = puede(usuario, 'CREAR_PULL_REQUEST', {
    proyecto: contexto.proyecto,
    tarea,
    asignaciones: contexto.asignaciones,
  });
  if (!permiso.permitido) return permiso;

  // 2. Estado de la tarea y «Requiere PR».
  const etiqueta = comprobarEtiqueta(tarea);
  if (etiqueta !== null) return { permitido: false, codigo: etiqueta };

  // 3. Estado del PR: no se crea un segundo PR.
  if (!incluye(ESTADOS_PR_PARA_CREAR, tarea.estado_pr)) {
    return { permitido: false, codigo: 'ESTADO_PR_NO_APLICA' };
  }

  return { permitido: true, exige_texto: permiso.exige_texto };
}

/**
 * ¿Puede el usuario cerrar el PR desde el sistema? §7.5: practicante responsable, Supervisor o
 * Administrador, con la etiqueta visible en CREADO o CON_CONFLICTOS y con motivo.
 *
 * El estado del PR va antes que el texto: un PR fusionado con motivo vacío responde
 * `ESTADO_PR_NO_APLICA`, no `TEXTO_OBLIGATORIO`.
 */
export function puedeCerrarPullRequest(
  tarea: Tarea,
  usuario: Usuario,
  contexto: ContextoTransicion,
  motivo?: string,
): ResultadoAccionPR {
  // 1. Quién.
  const permiso = puede(usuario, 'CERRAR_PULL_REQUEST', {
    proyecto: contexto.proyecto,
    tarea,
    asignaciones: contexto.asignaciones,
  });
  if (!permiso.permitido) return permiso;

  // 2. Estado de la tarea y «Requiere PR».
  const etiqueta = comprobarEtiqueta(tarea);
  if (etiqueta !== null) return { permitido: false, codigo: etiqueta };

  // 3. Estado del PR: solo uno abierto.
  if (!incluye(ESTADOS_PR_ABIERTO, tarea.estado_pr)) {
    return { permitido: false, codigo: 'ESTADO_PR_NO_APLICA' };
  }

  // 4. Texto: motivo no vacío (si ya se escribió).
  if (validarTexto({ motivo }, permiso.exige_texto) !== null) {
    return { permitido: false, codigo: TEXTO_OBLIGATORIO };
  }

  return { permitido: true, exige_texto: permiso.exige_texto };
}

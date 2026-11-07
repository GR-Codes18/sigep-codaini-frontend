/**
 * Transiciones de tarea: la tabla de §6.2 y sus condiciones.
 *
 * Es la única fuente de verdad de los cambios de estado de una tarea. Cada transición declara
 * su estado de origen, su estado de destino y la **acción de permiso** de §4 que decide quién
 * puede ejecutarla. Así la capa de transiciones no repite roles, alcance, identidad, usuario
 * activo ni proyecto FINALIZADO: todo eso lo resuelve `puede()`.
 *
 * Lo que esta capa añade es lo que `puede()` deliberadamente no mira:
 *   - que la tarea esté en el estado de origen;
 *   - que el proyecto no esté EN_PAUSA al tomar una tarea (§6.2 y §6.8);
 *   - que `requiere_supervision` seleccione ENVIAR_A_SUPERVISION o MARCAR_TERMINADA;
 *   - que el motivo o la nota no lleguen vacíos cuando `puede()` los exige.
 *
 * Orden de comprobación: `puede()` → estado → condición → texto. `puede()` va primero para
 * conservar sus códigos y no revelar la pausa del proyecto ni la marca de supervisión a quien
 * no tiene alcance.
 *
 * Texto: `undefined` en el campo exigido significa «todavía no se escribió»; la transición
 * sigue disponible y el resultado devuelve `exige_texto` para que la interfaz abra el modal.
 * La cadena vacía o solo espacios ya es un error (`TEXTO_OBLIGATORIO`).
 *
 * La marca «Devuelta con observaciones» **no** vive aquí: no es un estado y se deriva del
 * historial. Su regla está registrada en `DECISIONES.md` y la función llega en la Fase 4.
 *
 * No importa React, Zustand, `data/` ni `services/`.
 */

import type { EstadoTarea } from './enumeraciones';
import type { AccionPermiso, CodigoDenegacion, TextoExigido } from './permisos';
import { puede } from './permisos';
import type { Asignacion, Proyecto } from './proyectos';
import type { Tarea } from './tareas';
import type { Usuario } from './usuarios';

/**
 * Las siete transiciones de §6.2, en el orden de la tabla. No existe ninguna otra.
 */
export const ACCIONES_TRANSICION = [
  'TOMAR',
  'LIBERAR',
  'ENVIAR_A_SUPERVISION',
  'MARCAR_TERMINADA',
  'APROBAR',
  'DEVOLVER',
  'REABRIR',
] as const;

export type AccionTransicion = (typeof ACCIONES_TRANSICION)[number];

/**
 * Códigos que añade la capa de transiciones. Los de `puede()` se conservan tal cual.
 */
export const CODIGOS_TRANSICION = [
  'TRANSICION_NO_APLICA',
  'TAREA_NO_REQUIERE_SUPERVISION',
  'TAREA_REQUIERE_SUPERVISION',
  'PROYECTO_EN_PAUSA',
  'TEXTO_OBLIGATORIO',
] as const;

export type CodigoTransicionPropio = (typeof CODIGOS_TRANSICION)[number];
export type CodigoTransicion = CodigoDenegacion | CodigoTransicionPropio;

export type ResultadoTransicion =
  { permitido: true; exige_texto: TextoExigido } | { permitido: false; codigo: CodigoTransicion };

/** Contexto de una transición: el proyecto de la tarea y las asignaciones de quien actúa. */
export interface ContextoTransicion {
  proyecto: Proyecto;
  /** Asignaciones del usuario que actúa, no las del proyecto. */
  asignaciones: Asignacion[];
}

/** Texto que el llamador ya escribió. Los dos campos son opcionales. */
export interface TextoTransicion {
  motivo?: string;
  nota?: string;
}

export interface TransicionDisponible {
  transicion: AccionTransicion;
  exige_texto: TextoExigido;
}

export interface DefinicionTransicion {
  desde: EstadoTarea;
  hacia: EstadoTarea;
  /** Acción de §4 que decide quién puede hacerla. */
  accion: AccionPermiso;
}

/**
 * Catálogo de §6.2. `ENVIAR_TAREA` cubre las dos salidas de EN_PROGRESO porque §4 las agrupa
 * como «Enviar a supervisión o marcar como terminada»; la condición de `requiere_supervision`
 * decide cuál de las dos aplica.
 */
export const TRANSICIONES_TAREA: Record<AccionTransicion, DefinicionTransicion> = {
  TOMAR: { desde: 'DISPONIBLE', hacia: 'EN_PROGRESO', accion: 'TOMAR_TAREA' },
  LIBERAR: { desde: 'EN_PROGRESO', hacia: 'DISPONIBLE', accion: 'LIBERAR_TAREA' },
  ENVIAR_A_SUPERVISION: {
    desde: 'EN_PROGRESO',
    hacia: 'ESPERANDO_SUPERVISION',
    accion: 'ENVIAR_TAREA',
  },
  MARCAR_TERMINADA: { desde: 'EN_PROGRESO', hacia: 'TERMINADA', accion: 'ENVIAR_TAREA' },
  APROBAR: { desde: 'ESPERANDO_SUPERVISION', hacia: 'TERMINADA', accion: 'APROBAR_TAREA' },
  DEVOLVER: { desde: 'ESPERANDO_SUPERVISION', hacia: 'EN_PROGRESO', accion: 'DEVOLVER_TAREA' },
  REABRIR: { desde: 'TERMINADA', hacia: 'EN_PROGRESO', accion: 'REABRIR_TAREA' },
};

/**
 * Condiciones propias de §6.2. No mira rol, alcance ni identidad: eso ya lo decidió `puede()`.
 */
function condicionDe(
  transicion: AccionTransicion,
  tarea: Tarea,
  proyecto: Proyecto,
): CodigoTransicionPropio | null {
  if (transicion === 'TOMAR' && proyecto.estado === 'EN_PAUSA') {
    return 'PROYECTO_EN_PAUSA';
  }
  if (transicion === 'ENVIAR_A_SUPERVISION' && !tarea.requiere_supervision) {
    return 'TAREA_NO_REQUIERE_SUPERVISION';
  }
  if (transicion === 'MARCAR_TERMINADA' && tarea.requiere_supervision) {
    return 'TAREA_REQUIERE_SUPERVISION';
  }
  return null;
}

/** Devuelve el texto del campo que exige la acción, si el llamador lo escribió. */
function textoDe(texto: TextoTransicion | undefined, exigido: TextoExigido): string | undefined {
  if (exigido === 'MOTIVO') return texto?.motivo;
  if (exigido === 'NOTA') return texto?.nota;
  return undefined;
}

/**
 * Solo rechaza cuando el llamador envió el campo y quedó vacío o con espacios. Si no lo envió,
 * la transición queda pendiente de texto y `puedeTransicionar` devuelve `exige_texto`.
 */
function validarTexto(
  texto: TextoTransicion | undefined,
  exigido: TextoExigido,
): CodigoTransicionPropio | null {
  const valor = textoDe(texto, exigido);
  if (valor === undefined) return null;
  return valor.trim() === '' ? 'TEXTO_OBLIGATORIO' : null;
}

/**
 * ¿Puede este usuario ejecutar esta transición sobre esta tarea?
 *
 * Se detiene en la primera negativa: `puede()` → estado → condición → texto.
 */
export function puedeTransicionar(
  tarea: Tarea,
  usuario: Usuario,
  contexto: ContextoTransicion,
  transicion: AccionTransicion,
  texto?: TextoTransicion,
): ResultadoTransicion {
  const definicion = TRANSICIONES_TAREA[transicion];

  // 1. Quién: toda la matriz de §4 vive en `puede()`.
  const contextoPermiso = {
    proyecto: contexto.proyecto,
    tarea,
    asignaciones: contexto.asignaciones,
  };
  const permiso = puede(usuario, definicion.accion, contextoPermiso);
  if (!permiso.permitido) {
    return permiso;
  }

  // 2. Estado: la transición debe salir del estado actual.
  if (tarea.estado !== definicion.desde) {
    return { permitido: false, codigo: 'TRANSICION_NO_APLICA' };
  }

  // 3. Condición propia de §6.2 (pausa, requiere_supervision).
  const condicion = condicionDe(transicion, tarea, contexto.proyecto);
  if (condicion !== null) {
    return { permitido: false, codigo: condicion };
  }

  // 4. Texto: solo se valida si el llamador ya lo envió.
  const textoInvalido = validarTexto(texto, permiso.exige_texto);
  if (textoInvalido !== null) {
    return { permitido: false, codigo: textoInvalido };
  }

  return { permitido: true, exige_texto: permiso.exige_texto };
}

/**
 * Transiciones que el usuario puede ejecutar ahora, en el orden de §6.2.
 *
 * No tiene ningún `switch` de roles: filtra el catálogo por el estado actual y delega cada
 * caso en `puedeTransicionar`.
 */
export function transicionesDisponibles(
  tarea: Tarea,
  usuario: Usuario,
  contexto: ContextoTransicion,
): TransicionDisponible[] {
  const disponibles: TransicionDisponible[] = [];

  for (const transicion of ACCIONES_TRANSICION) {
    if (TRANSICIONES_TAREA[transicion].desde !== tarea.estado) continue;

    const resultado = puedeTransicionar(tarea, usuario, contexto, transicion);
    if (resultado.permitido) {
      disponibles.push({ transicion, exige_texto: resultado.exige_texto });
    }
  }

  return disponibles;
}

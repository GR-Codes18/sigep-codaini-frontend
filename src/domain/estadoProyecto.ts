/**
 * Estado de un proyecto: pausar, reanudar y reactivar (Fase 2, paso 9B; propuesta §5.4).
 *
 * Las transiciones del estado de un proyecto son cuatro y solo las hace el Administrador, con una **nota
 * obligatoria**:
 *   - PAUSAR:    ACTIVO → EN_PAUSA.
 *   - REANUDAR:  EN_PAUSA → ACTIVO.
 *   - FINALIZAR: ACTIVO o EN_PAUSA → FINALIZADO (con sus efectos, en `cicloVida.ts`: `finalizarProyecto`).
 *   - REACTIVAR: FINALIZADO → ACTIVO. Exige que el supervisor del proyecto esté ACTIVO («siempre con un supervisor
 *     activo», §5.4): un proyecto finalizado puede haber quedado con un supervisor inactivo, porque desactivar a
 *     un supervisor ignora los proyectos finalizados.
 *
 * Complementa a `cicloVida.ts` sin cambiarlo. Estas funciones solo deciden; el servicio aplica el cambio de estado,
 * registra el evento y avisa al equipo. Los textos: igual que en las transiciones, `undefined` en la nota significa
 * «todavía no se escribió» (la acción queda permitida y devuelve qué texto exige); vacío o solo espacios es
 * `TEXTO_OBLIGATORIO`. El servicio debe rechazar si `exige_texto` no es `null` y falta.
 *
 * Orden de comprobación: `puede()` → estado del proyecto → (reactivar) supervisor activo → texto.
 *
 * No importa React, Zustand, `data/` ni `services/`.
 */

import type { EstadoProyecto } from './enumeraciones';
import { puede } from './permisos';
import type { CodigoDenegacion, TextoExigido } from './permisos';
import type { Proyecto } from './proyectos';
import { TEXTO_OBLIGATORIO, validarTexto } from './transiciones';
import type { TextoTransicion } from './transiciones';
import type { Usuario } from './usuarios';

export const ACCIONES_ESTADO_PROYECTO = ['PAUSAR', 'REANUDAR', 'FINALIZAR', 'REACTIVAR'] as const;

export type AccionEstadoProyecto = (typeof ACCIONES_ESTADO_PROYECTO)[number];

export const CODIGOS_ESTADO_PROYECTO = [
  'PROYECTO_NO_ACTIVO',
  'PROYECTO_NO_EN_PAUSA',
  'PROYECTO_NO_FINALIZADO',
  'SUPERVISOR_DEL_PROYECTO_INACTIVO',
] as const;

export type CodigoEstadoProyectoPropio = (typeof CODIGOS_ESTADO_PROYECTO)[number];
export type CodigoEstadoProyecto =
  CodigoDenegacion | typeof TEXTO_OBLIGATORIO | CodigoEstadoProyectoPropio;

/** Los códigos propios traen su `mensaje`; los de `puede()` y `TEXTO_OBLIGATORIO` salen de `services/`. */
export type ErrorEstadoProyecto = { ok: false; codigo: CodigoEstadoProyecto; mensaje?: string };

export type ResultadoEstadoProyecto =
  { ok: true; exige_texto: TextoExigido; estado_nuevo: EstadoProyecto } | ErrorEstadoProyecto;

const MENSAJES_PROPIOS: Record<CodigoEstadoProyectoPropio, string> = {
  PROYECTO_NO_ACTIVO: 'Solo se puede pausar un proyecto activo.',
  PROYECTO_NO_EN_PAUSA: 'Solo se puede reanudar un proyecto en pausa.',
  PROYECTO_NO_FINALIZADO: 'Solo se puede reactivar un proyecto finalizado.',
  SUPERVISOR_DEL_PROYECTO_INACTIVO:
    'El supervisor del proyecto está inactivo: reactívalo antes de reactivar el proyecto.',
};

function error(codigo: CodigoEstadoProyectoPropio): ErrorEstadoProyecto {
  return { ok: false, codigo, mensaje: MENSAJES_PROPIOS[codigo] };
}

/** Pausar un proyecto activo (§5.4): nadie puede tomar tareas nuevas. Exige una nota. */
export function puedePausarProyecto(
  usuario: Usuario,
  proyecto: Proyecto,
  texto?: TextoTransicion,
): ResultadoEstadoProyecto {
  const permiso = puede(usuario, 'PAUSAR_PROYECTO', { proyecto });
  if (!permiso.permitido) return { ok: false, codigo: permiso.codigo };
  if (proyecto.estado !== 'ACTIVO') return error('PROYECTO_NO_ACTIVO');
  if (validarTexto(texto, permiso.exige_texto) !== null)
    return { ok: false, codigo: TEXTO_OBLIGATORIO };
  return { ok: true, exige_texto: permiso.exige_texto, estado_nuevo: 'EN_PAUSA' };
}

/** Reanudar un proyecto en pausa (§5.4). Exige una nota. */
export function puedeReanudarProyecto(
  usuario: Usuario,
  proyecto: Proyecto,
  texto?: TextoTransicion,
): ResultadoEstadoProyecto {
  const permiso = puede(usuario, 'REANUDAR_PROYECTO', { proyecto });
  if (!permiso.permitido) return { ok: false, codigo: permiso.codigo };
  if (proyecto.estado !== 'EN_PAUSA') return error('PROYECTO_NO_EN_PAUSA');
  if (validarTexto(texto, permiso.exige_texto) !== null)
    return { ok: false, codigo: TEXTO_OBLIGATORIO };
  return { ok: true, exige_texto: permiso.exige_texto, estado_nuevo: 'ACTIVO' };
}

/**
 * Reactivar un proyecto finalizado (§5.4): vuelve a ACTIVO y las asignaciones, que nunca se cerraron, recuperan su
 * acceso. `supervisor` es la cuenta del supervisor del proyecto (`undefined` si no existe): debe ser SUPERVISOR y
 * estar ACTIVA. Exige una nota.
 */
export function puedeReactivarProyecto(
  usuario: Usuario,
  proyecto: Proyecto,
  supervisor: Usuario | undefined,
  texto?: TextoTransicion,
): ResultadoEstadoProyecto {
  const permiso = puede(usuario, 'REACTIVAR_PROYECTO', { proyecto });
  if (!permiso.permitido) return { ok: false, codigo: permiso.codigo };
  if (proyecto.estado !== 'FINALIZADO') return error('PROYECTO_NO_FINALIZADO');
  if (
    supervisor === undefined ||
    supervisor.rol !== 'SUPERVISOR' ||
    supervisor.estado !== 'ACTIVO'
  ) {
    return error('SUPERVISOR_DEL_PROYECTO_INACTIVO');
  }
  if (validarTexto(texto, permiso.exige_texto) !== null)
    return { ok: false, codigo: TEXTO_OBLIGATORIO };
  return { ok: true, exige_texto: permiso.exige_texto, estado_nuevo: 'ACTIVO' };
}

/**
 * Las acciones de estado que tiene sentido ofrecer con el proyecto en este estado (los botones que la pantalla puede
 * mostrar). Solo mira el estado: quién puede lo decide `puede()`, y reactivar además exige un supervisor activo
 * (`puedeReactivarProyecto`).
 */
export function accionesDeEstadoDisponibles(estado: EstadoProyecto): AccionEstadoProyecto[] {
  switch (estado) {
    case 'ACTIVO':
      return ['PAUSAR', 'FINALIZAR'];
    case 'EN_PAUSA':
      return ['REANUDAR', 'FINALIZAR'];
    case 'FINALIZADO':
      return ['REACTIVAR'];
  }
}

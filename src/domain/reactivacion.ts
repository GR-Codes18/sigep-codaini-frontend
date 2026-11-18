/**
 * Reactivación de personas (Fase 2, paso 8A; propuesta §5.2 y §5.3).
 *
 *   - Reactivar la práctica de un practicante FINALIZADO (su cuenta está INACTIVA): vuelve a «Activo» con
 *     una nota obligatoria. Sus asignaciones antiguas **no** se reactivan: queda «Sin proyecto» y se le
 *     asigna de nuevo.
 *   - Reactivar a un supervisor INACTIVO: no exige texto.
 *
 * Complementa a `cicloVida.ts` (que ya tiene finalizar práctica y desactivar supervisor) sin cambiarlo. Estas
 * funciones solo deciden; el servicio aplica el cambio de estado y registra el evento.
 *
 * Texto: igual que en las transiciones, `undefined` en el campo exigido significa «todavía no se
 * escribió» (la acción queda permitida y devuelve qué texto exige); vacío o solo espacios es
 * `TEXTO_OBLIGATORIO`. El servicio debe rechazar si `exige_texto` no es `null` y falta.
 *
 * Orden de comprobación: `puede()` → estado de la persona → texto.
 *
 * No importa React, Zustand, `data/` ni `services/`.
 */

import { puede } from './permisos';
import type { CodigoDenegacion, TextoExigido } from './permisos';
import { TEXTO_OBLIGATORIO, validarTexto } from './transiciones';
import type { TextoTransicion } from './transiciones';
import type { Usuario } from './usuarios';

export const CODIGOS_REACTIVACION = ['PRACTICANTE_NO_FINALIZADO', 'SUPERVISOR_YA_ACTIVO'] as const;

export type CodigoReactivacionPropio = (typeof CODIGOS_REACTIVACION)[number];
export type CodigoReactivacion =
  CodigoDenegacion | typeof TEXTO_OBLIGATORIO | CodigoReactivacionPropio;

/** Los códigos propios traen su `mensaje`; los de `puede()` y `TEXTO_OBLIGATORIO` salen de `services/`. */
export type ErrorReactivacion = { ok: false; codigo: CodigoReactivacion; mensaje?: string };

export type ResultadoReactivacion = { ok: true; exige_texto: TextoExigido } | ErrorReactivacion;

/** Reactivar la práctica de un practicante finalizado (§5.2). Exige una nota. */
export function reactivarPractica(
  usuario: Usuario,
  objetivo: Usuario,
  texto?: TextoTransicion,
): ResultadoReactivacion {
  const permiso = puede(usuario, 'REACTIVAR_PRACTICA', { usuario_objetivo: objetivo });
  if (!permiso.permitido) return { ok: false, codigo: permiso.codigo };

  if (objetivo.estado !== 'INACTIVO') {
    return {
      ok: false,
      codigo: 'PRACTICANTE_NO_FINALIZADO',
      mensaje: 'Solo se puede reactivar a un practicante con la práctica finalizada.',
    };
  }

  if (validarTexto(texto, permiso.exige_texto) !== null) {
    return { ok: false, codigo: TEXTO_OBLIGATORIO };
  }
  return { ok: true, exige_texto: permiso.exige_texto };
}

/** Reactivar a un supervisor inactivo (§5.3). No exige texto. */
export function reactivarSupervisor(usuario: Usuario, objetivo: Usuario): ResultadoReactivacion {
  const permiso = puede(usuario, 'REACTIVAR_SUPERVISOR', { usuario_objetivo: objetivo });
  if (!permiso.permitido) return { ok: false, codigo: permiso.codigo };

  if (objetivo.estado !== 'INACTIVO') {
    return {
      ok: false,
      codigo: 'SUPERVISOR_YA_ACTIVO',
      mensaje: 'Solo se puede reactivar a un supervisor inactivo.',
    };
  }
  return { ok: true, exige_texto: permiso.exige_texto };
}

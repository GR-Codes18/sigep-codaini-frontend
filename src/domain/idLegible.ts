/**
 * ID legible de las tareas, `CODIGO-NNN` (Fase 1, paso 6; propuesta §5.4, §5.5 y §11).
 *
 * Tres piezas puras:
 *   - `validarCodigoProyecto`: formato y unicidad del código del proyecto;
 *   - `siguienteNumeroTarea`: el próximo correlativo a partir de `ultimo_numero_tarea`;
 *   - `formatearIdLegible`: `CODIGO-NNN` con el número rellenado con ceros.
 *
 * Reglas acordadas por los autores:
 *   - Código: de 3 a 5 caracteres, solo mayúsculas A-Z y dígitos (`/^[A-Z0-9]{3,5}$/`).
 *     `domain/` valida y **no convierte ni recorta**: `pl2d` y ` PL2D` son inválidos. Si la
 *     pantalla quiere pasar a mayúsculas o recortar, lo hace antes de llamar aquí.
 *   - Unicidad: comparación literal contra la lista que entrega el servicio. Los proyectos
 *     FINALIZADOS cuentan: nunca se borran, así que un código nunca se libera.
 *   - Orden de comprobación: vacío → caracteres → longitud → duplicado. El formato va siempre
 *     antes que el duplicado.
 *   - Número: correlativo `ultimo_numero_tarea + 1`, nunca `max(numero) + 1`, para no reutilizar
 *     el número de una tarea eliminada. Mínimo 3 dígitos y **sin tope**: 999 → `999`,
 *     1000 → `1000`.
 *   - `siguienteNumeroTarea` no muta el proyecto: el servicio guarda `ultimo_numero_tarea` y crea
 *     la tarea con `numero` en una sola operación.
 *
 * No importa React, Zustand, `data/` ni `services/`.
 */

import type { Proyecto } from './proyectos';

export const CODIGO_PROYECTO_MIN = 3;
export const CODIGO_PROYECTO_MAX = 5;
/** Mínimo de dígitos del número; no es un tope (después de 999 el número crece). */
export const DIGITOS_MINIMOS_NUMERO = 3;

/** Códigos de error de esta capa. */
export const CODIGOS_ID_LEGIBLE = [
  'CODIGO_PROYECTO_VACIO',
  'CARACTERES_INVALIDOS',
  'LONGITUD_INVALIDA',
  'CODIGO_DUPLICADO',
  'NUMERO_INVALIDO',
  'ULTIMO_NUMERO_INVALIDO',
] as const;

export type CodigoIdLegible = (typeof CODIGOS_ID_LEGIBLE)[number];

export type ResultadoCodigoProyecto =
  { valido: true } | { valido: false; codigo: CodigoIdLegible; mensaje: string };

export type ResultadoSiguienteNumero =
  | { ok: true; numero: number; ultimo_numero_tarea: number }
  | { ok: false; codigo: CodigoIdLegible; mensaje: string };

export type ResultadoIdLegible =
  { ok: true; id: string } | { ok: false; codigo: CodigoIdLegible; mensaje: string };

const SOLO_MAYUSCULAS_Y_DIGITOS = /^[A-Z0-9]+$/;

/**
 * Valida el código de un proyecto nuevo. `codigosExistentes` son los códigos de **todos** los
 * proyectos, también los finalizados; el servicio arma la lista.
 */
export function validarCodigoProyecto(
  codigo: string,
  codigosExistentes: readonly string[],
): ResultadoCodigoProyecto {
  // `trim()` solo decide qué mensaje dar a un texto vacío; el valor validado no se recorta.
  if (codigo.trim() === '') {
    return {
      valido: false,
      codigo: 'CODIGO_PROYECTO_VACIO',
      mensaje: 'El código del proyecto es obligatorio.',
    };
  }
  if (!SOLO_MAYUSCULAS_Y_DIGITOS.test(codigo)) {
    return {
      valido: false,
      codigo: 'CARACTERES_INVALIDOS',
      mensaje: 'El código solo puede tener letras mayúsculas sin tildes y números, sin espacios.',
    };
  }
  if (codigo.length < CODIGO_PROYECTO_MIN || codigo.length > CODIGO_PROYECTO_MAX) {
    return {
      valido: false,
      codigo: 'LONGITUD_INVALIDA',
      mensaje: `El código debe tener entre ${CODIGO_PROYECTO_MIN} y ${CODIGO_PROYECTO_MAX} caracteres.`,
    };
  }
  if (codigosExistentes.includes(codigo)) {
    return {
      valido: false,
      codigo: 'CODIGO_DUPLICADO',
      mensaje: 'Ya existe un proyecto con ese código.',
    };
  }
  return { valido: true };
}

/**
 * Siguiente número de tarea del proyecto. No muta `proyecto`: el servicio escribe
 * `ultimo_numero_tarea` y crea la tarea con `numero`.
 */
export function siguienteNumeroTarea(
  proyecto: Pick<Proyecto, 'ultimo_numero_tarea'>,
): ResultadoSiguienteNumero {
  const ultimo = proyecto.ultimo_numero_tarea;
  if (!Number.isInteger(ultimo) || ultimo < 0) {
    return {
      ok: false,
      codigo: 'ULTIMO_NUMERO_INVALIDO',
      mensaje: 'El contador de tareas del proyecto no es válido.',
    };
  }
  const numero = ultimo + 1;
  return { ok: true, numero, ultimo_numero_tarea: numero };
}

/**
 * `CODIGO-NNN`. No valida el código (eso es de `validarCodigoProyecto`); solo rechaza un número
 * que no sea entero ≥ 1 para no producir nunca un ID mal formado.
 */
export function formatearIdLegible(codigo: string, numero: number): ResultadoIdLegible {
  if (!Number.isInteger(numero) || numero < 1) {
    return {
      ok: false,
      codigo: 'NUMERO_INVALIDO',
      mensaje: 'El número de la tarea debe ser un entero mayor o igual a 1.',
    };
  }
  return { ok: true, id: `${codigo}-${String(numero).padStart(DIGITOS_MINIMOS_NUMERO, '0')}` };
}

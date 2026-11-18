/**
 * Validación de una sección de Configuración (Fase 2, paso 10C, parte 1; propuesta §5.8).
 *
 * Pura: recibe los valores de la sección (todos, ya mezclados con los vigentes por el servicio) y dice si se pueden
 * guardar. No lee el catálogo de valores iniciales ni el almacén, y no cambia lo que recibe.
 *
 *   - **Evaluación:** la banda de puntaje ambiguo (mínimo y máximo, enteros de 0 a 100, mínimo menor que el máximo) y la
 *     proporción de la nota (área y especialidad, enteros de 0 a 100 que suman exactamente 100).
 *   - **Prácticas:** la duración (entero de 1 a `DURACION_MAXIMA_MESES`) y el aviso previo (entero de 1 a
 *     `AVISO_MAXIMO_DIAS`).
 *   - **Seguimiento:** los 10 umbrales de insights; las reglas son las de `validarUmbrales`, sin repetirlas.
 *
 * Orden de comprobación: forma (cada parámetro de la sección existe y es del tipo esperado) → valores, en el orden
 * del catálogo → relaciones (mínimo < máximo, suma 100, y las de `validarUmbrales`). Devuelve el **primer** error, con
 * la clave del parámetro y, si aplica, el campo, para que el formulario lo muestre junto a su casilla. Los valores de
 * otras secciones que lleguen de más se ignoran.
 *
 * No importa React, Zustand, `data/` ni `services/`.
 */

import {
  CATALOGO_PARAMETROS,
  type ClaveParametro,
  type SeccionConfiguracion,
  type ValorParametro,
} from './configuracion';
import { AVISO_MAXIMO_DIAS, DURACION_MAXIMA_MESES } from './practicas';
import { validarUmbrales, type ClaveUmbralInsight, type ErrorUmbral } from './reglasInsights';

/** Códigos de error de esta capa (los de los umbrales de Seguimiento son `UMBRAL_INVALIDO`, de `validarUmbrales`). */
export const CODIGOS_CONFIGURACION = [
  'PARAMETRO_INVALIDO',
  'VALOR_NO_ENTERO',
  'VALOR_FUERA_DE_RANGO',
  'BANDA_MINIMO_NO_MENOR',
  'PROPORCION_NO_SUMA_100',
] as const;

export type CodigoConfiguracion = (typeof CODIGOS_CONFIGURACION)[number];

/** Campo del parámetro que falla; `null` cuando el error es del parámetro entero (la suma, la forma). */
export type CampoConfiguracion = 'valor' | 'minimo' | 'maximo' | 'area' | 'especialidad';

export interface ErrorConfiguracion {
  ok: false;
  codigo: CodigoConfiguracion;
  clave: ClaveParametro;
  campo: CampoConfiguracion | null;
  mensaje: string;
}

export type ResultadoConfiguracion = { ok: true } | ErrorConfiguracion | ErrorUmbral;

/** Los valores de una sección, por clave. Los que no son de la sección se ignoran. */
export type ValoresConfiguracion = Partial<Record<ClaveParametro, ValorParametro>>;

/** Rango de los puntos de la banda y de la proporción. */
const MINIMO_PUNTOS = 0;
const MAXIMO_PUNTOS = 100;
const SUMA_PROPORCION = 100;

/** Las claves de una sección, en el orden del catálogo. */
export function clavesDeSeccion(seccion: SeccionConfiguracion): ClaveParametro[] {
  return CATALOGO_PARAMETROS.filter((p) => p.seccion === seccion).map((p) => p.clave);
}

function error(
  codigo: CodigoConfiguracion,
  clave: ClaveParametro,
  campo: CampoConfiguracion | null,
  mensaje: string,
): ErrorConfiguracion {
  return { ok: false, codigo, clave, campo, mensaje };
}

/** Un entero dentro de un rango; si no, el error de su clave y su campo. */
function comprobarEntero(
  valor: number,
  limites: { minimo: number; maximo: number },
  donde: { clave: ClaveParametro; campo: CampoConfiguracion },
  etiqueta: string,
): ErrorConfiguracion | null {
  if (!Number.isInteger(valor)) {
    return error(
      'VALOR_NO_ENTERO',
      donde.clave,
      donde.campo,
      `${etiqueta} debe ser un número entero.`,
    );
  }
  if (valor < limites.minimo || valor > limites.maximo) {
    return error(
      'VALOR_FUERA_DE_RANGO',
      donde.clave,
      donde.campo,
      `${etiqueta} debe estar entre ${limites.minimo} y ${limites.maximo}.`,
    );
  }
  return null;
}

function formaInvalida(clave: ClaveParametro): ErrorConfiguracion {
  return error(
    'PARAMETRO_INVALIDO',
    clave,
    null,
    `El parámetro ${clave} falta o no tiene el formato esperado.`,
  );
}

/** Que cada parámetro de la sección exista y sea del tipo del catálogo (número, rango o proporción). */
function comprobarForma(
  seccion: SeccionConfiguracion,
  valores: ValoresConfiguracion,
): ErrorConfiguracion | null {
  for (const parametro of CATALOGO_PARAMETROS) {
    if (parametro.seccion !== seccion) continue;
    const valor = valores[parametro.clave];
    if (valor?.tipo !== parametro.valor.tipo) return formaInvalida(parametro.clave);
    const numeros =
      valor.tipo === 'numero'
        ? [valor.valor]
        : valor.tipo === 'rango'
          ? [valor.minimo, valor.maximo]
          : [valor.area, valor.especialidad];
    if (numeros.some((n) => typeof n !== 'number')) return formaInvalida(parametro.clave);
  }
  return null;
}

const PUNTOS = { minimo: MINIMO_PUNTOS, maximo: MAXIMO_PUNTOS };

function validarEvaluacion(valores: ValoresConfiguracion): ResultadoConfiguracion {
  const banda = valores.EVALUACION_BANDA_AMBIGUA;
  if (banda?.tipo === 'rango') {
    const clave = 'EVALUACION_BANDA_AMBIGUA';
    const minimo = comprobarEntero(
      banda.minimo,
      PUNTOS,
      { clave, campo: 'minimo' },
      'El mínimo de la banda de puntaje ambiguo',
    );
    if (minimo !== null) return minimo;
    const maximo = comprobarEntero(
      banda.maximo,
      PUNTOS,
      { clave, campo: 'maximo' },
      'El máximo de la banda de puntaje ambiguo',
    );
    if (maximo !== null) return maximo;
    if (!(banda.minimo < banda.maximo)) {
      return error(
        'BANDA_MINIMO_NO_MENOR',
        clave,
        'minimo',
        'El mínimo de la banda de puntaje ambiguo debe ser menor que el máximo.',
      );
    }
  }

  const proporcion = valores.EVALUACION_PROPORCION;
  if (proporcion?.tipo === 'proporcion') {
    const clave = 'EVALUACION_PROPORCION';
    const area = comprobarEntero(
      proporcion.area,
      PUNTOS,
      { clave, campo: 'area' },
      'El porcentaje del área',
    );
    if (area !== null) return area;
    const especialidad = comprobarEntero(
      proporcion.especialidad,
      PUNTOS,
      { clave, campo: 'especialidad' },
      'El porcentaje de la especialidad',
    );
    if (especialidad !== null) return especialidad;
    if (proporcion.area + proporcion.especialidad !== SUMA_PROPORCION) {
      return error(
        'PROPORCION_NO_SUMA_100',
        clave,
        null,
        `Los porcentajes del área y de la especialidad deben sumar ${SUMA_PROPORCION}.`,
      );
    }
  }
  return { ok: true };
}

function validarPracticas(valores: ValoresConfiguracion): ResultadoConfiguracion {
  const duracion = valores.PRACTICA_DURACION_MESES;
  if (duracion?.tipo === 'numero') {
    const fallo = comprobarEntero(
      duracion.valor,
      { minimo: 1, maximo: DURACION_MAXIMA_MESES },
      { clave: 'PRACTICA_DURACION_MESES', campo: 'valor' },
      'La duración de la práctica (en meses)',
    );
    if (fallo !== null) return fallo;
  }
  const aviso = valores.PRACTICA_AVISO_FIN_DIAS;
  if (aviso?.tipo === 'numero') {
    const fallo = comprobarEntero(
      aviso.valor,
      { minimo: 1, maximo: AVISO_MAXIMO_DIAS },
      { clave: 'PRACTICA_AVISO_FIN_DIAS', campo: 'valor' },
      'Los días de anticipación del aviso de fin de práctica',
    );
    if (fallo !== null) return fallo;
  }
  return { ok: true };
}

function validarSeguimiento(valores: ValoresConfiguracion): ResultadoConfiguracion {
  const umbrales: Partial<Record<ClaveUmbralInsight, number>> = {};
  for (const clave of clavesDeSeccion('SEGUIMIENTO')) {
    const valor = valores[clave];
    // La forma ya se comprobó: cada clave de Seguimiento es un número.
    if (valor?.tipo === 'numero') umbrales[clave as ClaveUmbralInsight] = valor.valor;
  }
  return validarUmbrales(umbrales as Record<ClaveUmbralInsight, number>);
}

export function validarSeccionConfiguracion(
  seccion: SeccionConfiguracion,
  valores: ValoresConfiguracion,
): ResultadoConfiguracion {
  const forma = comprobarForma(seccion, valores);
  if (forma !== null) return forma;
  switch (seccion) {
    case 'EVALUACION':
      return validarEvaluacion(valores);
    case 'PRACTICAS':
      return validarPracticas(valores);
    case 'SEGUIMIENTO':
      return validarSeguimiento(valores);
    default: {
      const imposible: never = seccion;
      throw new Error(`Sección de Configuración desconocida: ${String(imposible)}`);
    }
  }
}

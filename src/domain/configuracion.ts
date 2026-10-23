/**
 * Parámetros ajustables de Configuración (§5.8) y sus valores iniciales.
 *
 * Solo tipos y constantes: las validaciones (banda mínimo < máximo, proporción
 * que suma 100 y límites de cada número) viven en Zod y en `services/`.
 */

import type { Id } from './comunes';

/** Secciones de Configuración; permiten «restaurar por sección» (§5.8). */
export const SECCIONES_CONFIGURACION = ['EVALUACION', 'PRACTICAS', 'SEGUIMIENTO'] as const;
export type SeccionConfiguracion = (typeof SECCIONES_CONFIGURACION)[number];

export type ValorParametro =
  | { tipo: 'numero'; valor: number }
  | { tipo: 'rango'; minimo: number; maximo: number }
  | { tipo: 'proporcion'; area: number; especialidad: number };

/** Entrada del catálogo: clave, sección y valor inicial. */
export interface ParametroCatalogo {
  clave: string;
  seccion: SeccionConfiguracion;
  valor: ValorParametro;
}

/**
 * Catálogo de parámetros con sus valores iniciales. `ClaveParametro` se deriva
 * de aquí, así que agregar una clave obliga a declarar su sección y su valor.
 */
export const CATALOGO_PARAMETROS = [
  /** Banda de puntaje ambiguo; Zod y servicios validan mínimo < máximo. */
  {
    clave: 'EVALUACION_BANDA_AMBIGUA',
    seccion: 'EVALUACION',
    valor: { tipo: 'rango', minimo: 50, maximo: 69 },
  },
  /** Proporción de la nota; Zod y servicios validan que sume 100. */
  {
    clave: 'EVALUACION_PROPORCION',
    seccion: 'EVALUACION',
    valor: { tipo: 'proporcion', area: 40, especialidad: 60 },
  },
  {
    clave: 'PRACTICA_DURACION_MESES',
    seccion: 'PRACTICAS',
    valor: { tipo: 'numero', valor: 4 },
  },
  {
    clave: 'PRACTICA_AVISO_FIN_DIAS',
    seccion: 'PRACTICAS',
    valor: { tipo: 'numero', valor: 14 },
  },
  {
    clave: 'INSIGHT_INACTIVO_DIAS',
    seccion: 'SEGUIMIENTO',
    valor: { tipo: 'numero', valor: 7 },
  },
  {
    clave: 'INSIGHT_INACTIVO_CRITICO_DIAS',
    seccion: 'SEGUIMIENTO',
    valor: { tipo: 'numero', valor: 14 },
  },
  /** Se dispara con más de N tareas EN_PROGRESO. */
  {
    clave: 'INSIGHT_CARGA_MAXIMA_TAREAS',
    seccion: 'SEGUIMIENTO',
    valor: { tipo: 'numero', valor: 3 },
  },
  /**
   * Se dispara cuando tiene N o menos tareas EN_PROGRESO y su proyecto tiene
   * tareas disponibles.
   */
  {
    clave: 'INSIGHT_CARGA_MINIMA_TAREAS',
    seccion: 'SEGUIMIENTO',
    valor: { tipo: 'numero', valor: 0 },
  },
  {
    clave: 'INSIGHT_ATRASO_PUNTOS',
    seccion: 'SEGUIMIENTO',
    valor: { tipo: 'numero', valor: 20 },
  },
  {
    clave: 'INSIGHT_ATRASO_PORCENTAJE',
    seccion: 'SEGUIMIENTO',
    valor: { tipo: 'numero', valor: 25 },
  },
  {
    clave: 'INSIGHT_PROYECTO_SIN_ACTIVIDAD_DIAS',
    seccion: 'SEGUIMIENTO',
    valor: { tipo: 'numero', valor: 7 },
  },
  {
    clave: 'INSIGHT_SUPERVISION_DEMORADA_DIAS',
    seccion: 'SEGUIMIENTO',
    valor: { tipo: 'numero', valor: 3 },
  },
  {
    clave: 'INSIGHT_POSTULACION_DIAS',
    seccion: 'SEGUIMIENTO',
    valor: { tipo: 'numero', valor: 5 },
  },
  /**
   * Anticipación del insight «Fin de práctica». «Vencida» no es un parámetro:
   * es la condición de días > 0, con severidad Crítico.
   */
  {
    clave: 'INSIGHT_FIN_PRACTICA_DIAS',
    seccion: 'SEGUIMIENTO',
    valor: { tipo: 'numero', valor: 14 },
  },
] as const satisfies readonly ParametroCatalogo[];

export type ClaveParametro = (typeof CATALOGO_PARAMETROS)[number]['clave'];

export interface ParametroConfiguracion {
  /**
   * PK. Su valor es la clave del parámetro y coincide con `clave`; en
   * `ReferenciaElemento` con `tipo: 'PARAMETRO_CONFIGURACION'`, el `id` es esa clave.
   */
  id: Id;
  clave: ClaveParametro;
  valor: ValorParametro;
  valor_predeterminado: ValorParametro;
}

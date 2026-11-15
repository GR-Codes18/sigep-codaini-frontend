/**
 * Puntaje de una postulación (Fase 1, paso 7; propuesta §5.1, §5.8, §10.1 y §11).
 *
 * El modelo (simulado en `services/`) solo juzga cada criterio: si se cumple y una observación.
 * Esta función hace la suma, como pide §10.1 («el sistema, no el modelo, calcula el puntaje»).
 *
 * Reglas acordadas por los autores:
 *   - Bloques: ÁREA = criterios activos del área del postulante con `id_especialidad === null`;
 *     ESPECIALIDAD = criterios activos de su especialidad. Los inactivos o ajenos no cuentan.
 *   - Cada criterio cumplido aporta su peso completo; uno no cumplido aporta 0 (sin créditos
 *     parciales). El puntaje de un bloque es la suma de sus pesos cumplidos.
 *   - Pesos enteros mayores que 0 que suman 100 por bloque; si no, error explícito y no se calcula.
 *   - Nota final = (area% × puntaje_area + especialidad% × puntaje_especialidad) / 100, redondeada
 *     al entero más cercano con las mitades hacia arriba (69,5 → 70).
 *   - Marca «Requiere revisión manual»: un criterio obligatorio no cumplido (solo marca; no anula
 *     su bloque) o la nota **ya redondeada** dentro de la banda, con ambos extremos incluidos.
 *   - La banda y la proporción llegan por parámetro (el servicio pasa los valores vigentes de
 *     Configuración); se validan de forma defensiva: enteros entre 0 y 100, proporción que suma
 *     100 y banda con mínimo < máximo.
 *   - Supuesto: el modelo entrega un solo juicio por criterio; los duplicados no se modelan.
 *   - No genera la justificación, IDs ni fechas: eso es de la evaluación simulada (Fase 2).
 *
 * Orden de comprobación: proporción → banda → bloque ÁREA (sin criterios → peso inválido →
 * suma ≠ 100 → juicio faltante) → bloque ESPECIALIDAD (igual) → cálculo → marca.
 *
 * No importa React, Zustand, `data/` ni `services/`.
 */

import type { Id } from './comunes';
import type { ValorParametro } from './configuracion';
import type { BloqueCriterio } from './enumeraciones';
import type { CriterioEvaluacion, PostulacionEvaluacionDetalle } from './postulaciones';

/** Códigos de error de esta capa. */
export const CODIGOS_PUNTAJE = [
  'PROPORCION_INVALIDA',
  'BANDA_INVALIDA',
  'BLOQUE_SIN_CRITERIOS',
  'PESO_INVALIDO',
  'PESOS_NO_SUMAN_100',
  'JUICIO_FALTANTE',
] as const;

export type CodigoPuntaje = (typeof CODIGOS_PUNTAJE)[number];

/** Por qué se puso la marca. No se guarda: `PostulacionEvaluacion` solo tiene el booleano. */
export const MOTIVOS_REVISION = ['CRITERIO_OBLIGATORIO', 'BANDA_AMBIGUA'] as const;

export type MotivoRevision = (typeof MOTIVOS_REVISION)[number];

/** Valor del parámetro `EVALUACION_BANDA_AMBIGUA`, sin la etiqueta `tipo`. */
export type BandaAmbigua = Omit<Extract<ValorParametro, { tipo: 'rango' }>, 'tipo'>;

/** Valor del parámetro `EVALUACION_PROPORCION`, sin la etiqueta `tipo`. */
export type ProporcionNota = Omit<Extract<ValorParametro, { tipo: 'proporcion' }>, 'tipo'>;

/** Lo que el modelo dice de un criterio. */
export interface JuicioCriterio {
  id_criterio: Id;
  cumplido: boolean;
  observacion: string | null;
}

export interface EntradaPuntaje {
  /** Área técnica del postulante. */
  id_area_tecnica: Id;
  /** Especialidad del postulante. */
  id_especialidad: Id;
  /** Catálogo de criterios; aquí se eligen los de cada bloque. */
  criterios: readonly CriterioEvaluacion[];
  juicios: readonly JuicioCriterio[];
  banda: BandaAmbigua;
  proporcion: ProporcionNota;
}

/** Una fila del desglose; el servicio le agrega `id` e `id_evaluacion` al guardarla. */
export type DetallePuntaje = Omit<PostulacionEvaluacionDetalle, 'id' | 'id_evaluacion'>;

export type ResultadoPuntaje =
  | {
      ok: true;
      puntaje_area: number;
      puntaje_especialidad: number;
      puntaje_total: number;
      requiere_revision_manual: boolean;
      motivos_revision: MotivoRevision[];
      detalles: DetallePuntaje[];
    }
  | {
      ok: false;
      codigo: CodigoPuntaje;
      mensaje: string;
      /** Bloque que falló; `null` si el error es de la banda o de la proporción. */
      bloque: BloqueCriterio | null;
    };

type ErrorPuntaje = Extract<ResultadoPuntaje, { ok: false }>;

type ResultadoBloque =
  | { ok: true; puntaje: number; detalles: DetallePuntaje[]; obligatorio_incumplido: boolean }
  | ErrorPuntaje;

const NOMBRE_BLOQUE: Record<BloqueCriterio, string> = {
  AREA: 'del área',
  ESPECIALIDAD: 'de la especialidad',
};

const PUNTAJE_BLOQUE = 100;

function esEnteroEntre(valor: number, minimo: number, maximo: number): boolean {
  return Number.isInteger(valor) && valor >= minimo && valor <= maximo;
}

function fallo(
  codigo: CodigoPuntaje,
  mensaje: string,
  bloque: BloqueCriterio | null,
): ErrorPuntaje {
  return { ok: false, codigo, mensaje, bloque };
}

function validarProporcion(proporcion: ProporcionNota): ErrorPuntaje | null {
  const { area, especialidad } = proporcion;
  if (
    !esEnteroEntre(area, 0, 100) ||
    !esEnteroEntre(especialidad, 0, 100) ||
    area + especialidad !== 100
  ) {
    return fallo(
      'PROPORCION_INVALIDA',
      'La proporción entre área y especialidad debe ser de números enteros que sumen 100.',
      null,
    );
  }
  return null;
}

function validarBanda(banda: BandaAmbigua): ErrorPuntaje | null {
  const { minimo, maximo } = banda;
  if (!esEnteroEntre(minimo, 0, 100) || !esEnteroEntre(maximo, 0, 100) || minimo >= maximo) {
    return fallo(
      'BANDA_INVALIDA',
      'La banda de puntaje ambiguo debe ser de números enteros entre 0 y 100, con el mínimo menor que el máximo.',
      null,
    );
  }
  return null;
}

function criteriosDelBloque(entrada: EntradaPuntaje, bloque: BloqueCriterio): CriterioEvaluacion[] {
  return entrada.criterios.filter((c) =>
    bloque === 'AREA'
      ? c.activo && c.id_area_tecnica === entrada.id_area_tecnica && c.id_especialidad === null
      : c.activo && c.id_especialidad === entrada.id_especialidad,
  );
}

function evaluarBloque(entrada: EntradaPuntaje, bloque: BloqueCriterio): ResultadoBloque {
  const criterios = criteriosDelBloque(entrada, bloque);
  const nombre = NOMBRE_BLOQUE[bloque];

  if (criterios.length === 0) {
    return fallo('BLOQUE_SIN_CRITERIOS', `El bloque ${nombre} no tiene criterios activos.`, bloque);
  }
  if (criterios.some((c) => !Number.isInteger(c.peso) || c.peso <= 0)) {
    return fallo(
      'PESO_INVALIDO',
      `Los pesos del bloque ${nombre} deben ser números enteros mayores que 0.`,
      bloque,
    );
  }
  if (criterios.reduce((suma, c) => suma + c.peso, 0) !== PUNTAJE_BLOQUE) {
    return fallo(
      'PESOS_NO_SUMAN_100',
      `Los pesos de los criterios activos del bloque ${nombre} deben sumar ${PUNTAJE_BLOQUE}.`,
      bloque,
    );
  }

  const detalles: DetallePuntaje[] = [];
  let obligatorio_incumplido = false;
  for (const c of criterios) {
    const juicio = entrada.juicios.find((j) => j.id_criterio === c.id);
    if (juicio === undefined) {
      return fallo(
        'JUICIO_FALTANTE',
        `Falta la evaluación del criterio «${c.nombre}» del bloque ${nombre}.`,
        bloque,
      );
    }
    if (c.obligatorio && !juicio.cumplido) obligatorio_incumplido = true;
    detalles.push({
      id_criterio: c.id,
      bloque,
      nombre_criterio: c.nombre,
      peso: c.peso,
      cumplido: juicio.cumplido,
      puntaje_obtenido: juicio.cumplido ? c.peso : 0,
      observacion: juicio.observacion,
    });
  }

  const puntaje = detalles.reduce((suma, d) => suma + d.puntaje_obtenido, 0);
  return { ok: true, puntaje, detalles, obligatorio_incumplido };
}

/**
 * Calcula el puntaje y la marca de una postulación. No muta la entrada ni guarda nada: el
 * servicio crea `PostulacionEvaluacion` y sus detalles con el resultado.
 */
export function calcularPuntaje(entrada: EntradaPuntaje): ResultadoPuntaje {
  const errorParametros = validarProporcion(entrada.proporcion) ?? validarBanda(entrada.banda);
  if (errorParametros !== null) return errorParametros;

  const area = evaluarBloque(entrada, 'AREA');
  if (!area.ok) return area;
  const especialidad = evaluarBloque(entrada, 'ESPECIALIDAD');
  if (!especialidad.ok) return especialidad;

  // Se multiplica con enteros y se divide al final: `0.3 * 11 + 0.7 * 66` da 49,4999… en coma
  // flotante y se redondearía a 49, mientras que `(30 * 11 + 70 * 66) / 100` da 49,5 exacto → 50.
  const puntaje_total = Math.round(
    (entrada.proporcion.area * area.puntaje +
      entrada.proporcion.especialidad * especialidad.puntaje) /
      100,
  );

  const motivos_revision: MotivoRevision[] = [];
  if (area.obligatorio_incumplido || especialidad.obligatorio_incumplido) {
    motivos_revision.push('CRITERIO_OBLIGATORIO');
  }
  if (puntaje_total >= entrada.banda.minimo && puntaje_total <= entrada.banda.maximo) {
    motivos_revision.push('BANDA_AMBIGUA');
  }

  return {
    ok: true,
    puntaje_area: area.puntaje,
    puntaje_especialidad: especialidad.puntaje,
    puntaje_total,
    requiere_revision_manual: motivos_revision.length > 0,
    motivos_revision,
    detalles: [...area.detalles, ...especialidad.detalles],
  };
}

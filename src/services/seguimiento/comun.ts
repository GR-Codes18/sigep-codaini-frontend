/**
 * Piezas comunes del seguimiento (Fase 2, paso 10B; propuesta §5.6 y §5.8).
 *
 * Los insights no se guardan: se calculan con las reglas de `domain/`, los umbrales vigentes de Configuración y el
 * momento de la operación. `calcularInsightsVigentes` es esa receta; la usan los servicios de este paso y la
 * usarán las consultas del paso 11 (los dashboards y Reportes), para que haya una sola forma de calcularlos.
 *
 * Devuelve **todos** los insights, sin filtrar por rol ni por alcance: quien lo llama decide qué ve cada persona
 * (`filtrarInsightsPorAlcance`, `puede()`) y aplica las revisiones de quien mira (`aplicarRevisiones`).
 */

import type { DatosAlmacen } from '@/data';
import {
  CATALOGO_PARAMETROS,
  calcularInsights,
  type ClaveUmbralInsight,
  type FechaHora,
  type Insight,
  type ParametroConfiguracion,
  type UmbralesInsight,
} from '@/domain';
import { denegar, exito, fallo, type Resultado } from '../resultado';

const ES_UMBRAL = (clave: string): clave is ClaveUmbralInsight => clave.startsWith('INSIGHT_');

/**
 * Los 10 umbrales de Seguimiento tal como están en Configuración. Si falta uno, o no es un número, es un dato roto
 * (`CONFIGURACION_INVALIDA`); los límites de cada valor los comprueba `domain/` al calcular (`UMBRAL_INVALIDO`).
 */
export function umbralesDe(
  parametros: readonly Pick<ParametroConfiguracion, 'clave' | 'valor'>[],
): Resultado<UmbralesInsight> {
  const umbrales: Partial<Record<ClaveUmbralInsight, number>> = {};
  for (const { clave } of CATALOGO_PARAMETROS) {
    if (!ES_UMBRAL(clave)) continue;
    const valor = parametros.find((p) => p.clave === clave)?.valor;
    if (valor?.tipo !== 'numero') return fallo('CONFIGURACION_INVALIDA');
    umbrales[clave] = valor.valor;
  }
  return exito(umbrales as UmbralesInsight);
}

export function calcularInsightsVigentes(
  datos: Pick<
    DatosAlmacen,
    | 'usuarios'
    | 'practicantes'
    | 'proyectos'
    | 'asignaciones'
    | 'tareas'
    | 'historial'
    | 'postulantes'
    | 'parametros'
  >,
  ahora: FechaHora,
): Resultado<Insight[]> {
  const umbrales = umbralesDe(datos.parametros);
  if (!umbrales.ok) return umbrales;
  // `tareas` ya no trae las eliminadas: eliminar una tarea la quita de la colección y deja su rastro en el historial.
  const calculo = calcularInsights(
    {
      usuarios: datos.usuarios,
      practicantes: datos.practicantes,
      proyectos: datos.proyectos,
      asignaciones: datos.asignaciones,
      tareas: datos.tareas,
      historial: datos.historial,
      postulantes: datos.postulantes,
    },
    umbrales.valor,
    ahora,
  );
  return calculo.ok ? exito(calculo.insights) : denegar(calculo);
}

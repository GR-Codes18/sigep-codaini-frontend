import { CATALOGO_PARAMETROS, type ParametroConfiguracion } from '@/domain';

/**
 * Parámetros de configuración con sus valores iniciales. `id === clave` y el
 * valor predeterminado es una copia independiente del valor.
 */
export function crearParametros(): ParametroConfiguracion[] {
  return CATALOGO_PARAMETROS.map((parametro) => ({
    id: parametro.clave,
    clave: parametro.clave,
    valor: structuredClone(parametro.valor),
    valor_predeterminado: structuredClone(parametro.valor),
  }));
}

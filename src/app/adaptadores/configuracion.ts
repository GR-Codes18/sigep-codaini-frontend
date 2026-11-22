import type { ClaveParametro, SeccionConfiguracion, ValorParametro } from '@/domain';
import type { ConfiguracionVista, ParametroVista } from '@/services';

export const ETIQUETA_SECCION: Record<SeccionConfiguracion, string> = {
  EVALUACION: 'Evaluación de postulaciones',
  PRACTICAS: 'Prácticas',
  SEGUIMIENTO: 'Seguimiento',
};

/** Una frase por sección para el encabezado; solo describe, no decide nada. */
export const DESCRIPCION_SECCION: Record<SeccionConfiguracion, string> = {
  EVALUACION: 'Cómo se interpreta la nota de una postulación.',
  PRACTICAS: 'Duración de la práctica y aviso de su fin.',
  SEGUIMIENTO:
    'Umbrales de las siete reglas de insights; también aplican a los insights que ve el Supervisor.',
};

/** La unidad que acompaña a cada casilla numérica. */
const UNIDAD: Partial<Record<ClaveParametro, string>> = {
  EVALUACION_BANDA_AMBIGUA: 'puntos',
  PRACTICA_DURACION_MESES: 'meses',
  PRACTICA_AVISO_FIN_DIAS: 'días',
  INSIGHT_INACTIVO_DIAS: 'días',
  INSIGHT_INACTIVO_CRITICO_DIAS: 'días',
  INSIGHT_CARGA_MAXIMA_TAREAS: 'tareas',
  INSIGHT_CARGA_MINIMA_TAREAS: 'tareas',
  INSIGHT_ATRASO_PUNTOS: 'puntos',
  INSIGHT_ATRASO_PORCENTAJE: '%',
  INSIGHT_PROYECTO_SIN_ACTIVIDAD_DIAS: 'días',
  INSIGHT_SUPERVISION_DEMORADA_DIAS: 'días',
  INSIGHT_POSTULACION_DIAS: 'días',
  INSIGHT_FIN_PRACTICA_DIAS: 'días',
};

export type NombreCampo = 'valor' | 'minimo' | 'maximo' | 'area' | 'especialidad';

export interface CampoParaVista {
  nombre: NombreCampo;
  etiqueta: string;
  /** El valor vigente, como texto de la casilla. */
  valor: string;
}

export interface ParametroParaVista {
  clave: ClaveParametro;
  etiqueta: string;
  unidad: string | null;
  campos: CampoParaVista[];
  /** «50 a 69», «40 % / 60 %», «14 días». */
  predeterminadoTexto: string;
  esPredeterminado: boolean;
}

export interface SeccionParaVista {
  seccion: SeccionConfiguracion;
  titulo: string;
  descripcion: string;
  parametros: ParametroParaVista[];
  /** Todos los parámetros de la sección valen lo predeterminado: no hay nada que restaurar. */
  todoPredeterminado: boolean;
}

function camposDe(valor: ValorParametro): CampoParaVista[] {
  switch (valor.tipo) {
    case 'numero':
      return [{ nombre: 'valor', etiqueta: 'Valor', valor: String(valor.valor) }];
    case 'rango':
      return [
        { nombre: 'minimo', etiqueta: 'Mínimo', valor: String(valor.minimo) },
        { nombre: 'maximo', etiqueta: 'Máximo', valor: String(valor.maximo) },
      ];
    case 'proporcion':
      return [
        { nombre: 'area', etiqueta: 'Área (%)', valor: String(valor.area) },
        { nombre: 'especialidad', etiqueta: 'Especialidad (%)', valor: String(valor.especialidad) },
      ];
  }
}

function textoPredeterminado(clave: ClaveParametro, valor: ValorParametro): string {
  const unidad = UNIDAD[clave];
  switch (valor.tipo) {
    case 'numero':
      return unidad === undefined ? String(valor.valor) : `${valor.valor} ${unidad}`;
    case 'rango':
      return `${valor.minimo} a ${valor.maximo}`;
    case 'proporcion':
      return `${valor.area} % / ${valor.especialidad} %`;
  }
}

function aParametro(p: ParametroVista): ParametroParaVista {
  return {
    clave: p.clave,
    etiqueta: p.etiqueta,
    unidad: UNIDAD[p.clave] ?? null,
    campos: camposDe(p.valor),
    predeterminadoTexto: textoPredeterminado(p.clave, p.valor_predeterminado),
    esPredeterminado: p.es_predeterminado,
  };
}

/** Las secciones de `obtenerConfiguracion` a la pantalla. Solo presenta: no valida ni decide nada. */
export function aConfiguracion(vista: ConfiguracionVista): SeccionParaVista[] {
  return vista.secciones.map((s) => ({
    seccion: s.seccion,
    titulo: ETIQUETA_SECCION[s.seccion],
    descripcion: DESCRIPCION_SECCION[s.seccion],
    parametros: s.parametros.map(aParametro),
    todoPredeterminado: s.parametros.every((p) => p.es_predeterminado),
  }));
}

/**
 * El texto de una casilla a número. Una casilla vacía o que no es un número da `NaN` y es el servicio quien lo
 * rechaza («Escribe un número.»); un decimal se envía tal cual y el servicio dice que debe ser entero.
 */
export function textoANumero(texto: string): number {
  const limpio = texto.trim().replace(',', '.');
  return limpio === '' ? Number.NaN : Number(limpio);
}

/** Los textos de las casillas de un parámetro al valor que recibe `guardarConfiguracionSeccion`. */
export function aValorParametro(
  parametro: ParametroParaVista,
  textos: Partial<Record<NombreCampo, string>>,
): ValorParametro {
  const n = (campo: NombreCampo) => textoANumero(textos[campo] ?? '');
  const primero = parametro.campos[0]?.nombre;
  if (primero === 'valor') return { tipo: 'numero', valor: n('valor') };
  if (primero === 'minimo') return { tipo: 'rango', minimo: n('minimo'), maximo: n('maximo') };
  return { tipo: 'proporcion', area: n('area'), especialidad: n('especialidad') };
}

export interface ErroresDeParametro {
  /** El error de una casilla concreta, por nombre de campo. */
  porCampo: Partial<Record<NombreCampo, string>>;
  /** El error del parámetro entero (la suma de la proporción, la relación entre dos umbrales…). */
  general: string | null;
}

const CAMPOS: readonly NombreCampo[] = ['valor', 'minimo', 'maximo', 'area', 'especialidad'];

/**
 * Los `campos` de un error del servicio, por parámetro. Las claves llegan como `CLAVE` (el parámetro entero o su
 * único valor), `CLAVE.campo` (una casilla) o, si falló la forma, `valores.CLAVE[.campo]`. Lo que no es de un parámetro
 * conocido queda en `sueltos`.
 */
export function erroresPorParametro(
  campos: Readonly<Record<string, string>> | undefined,
  claves: readonly ClaveParametro[],
): { porClave: Partial<Record<ClaveParametro, ErroresDeParametro>>; sueltos: string[] } {
  const porClave: Partial<Record<ClaveParametro, ErroresDeParametro>> = {};
  const sueltos: string[] = [];
  for (const [llave, mensaje] of Object.entries(campos ?? {})) {
    const partes = llave.replace(/^valores\./, '').split('.');
    const clave = claves.find((c) => c === partes[0]);
    if (clave === undefined) {
      sueltos.push(mensaje);
      continue;
    }
    const entrada = (porClave[clave] ??= { porCampo: {}, general: null });
    const campo = CAMPOS.find((c) => c === partes[1]);
    if (campo === undefined) {
      entrada.general ??= mensaje;
    } else {
      entrada.porCampo[campo] ??= mensaje;
    }
  }
  return { porClave, sueltos };
}

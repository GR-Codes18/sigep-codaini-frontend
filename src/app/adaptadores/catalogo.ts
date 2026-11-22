import type { TipoCriterio } from '@/domain';
import type { CatalogoEvaluacion } from '@/services';

export interface CriterioDeBloque {
  id: string;
  nombre: string;
  tipo: TipoCriterio;
  peso: number;
  obligatorio: boolean;
  activo: boolean;
}

export interface BloqueParaVista {
  /** Todos, también los desactivados: nada se borra (§5.1). */
  criterios: CriterioDeBloque[];
  /** «Suma actual: N/100», solo con los criterios activos. */
  suma: number;
  /** Con los criterios activos guardados se puede calcular un puntaje: solo así se puede activar su dueño. */
  valido: boolean;
  /** Por qué no es válido; `null` si lo es. */
  mensajeInvalido: string | null;
}

export interface EspecialidadParaVista {
  id: string;
  nombre: string;
  activo: boolean;
  bloque: BloqueParaVista;
}

export interface AreaParaVista {
  id: string;
  nombre: string;
  activo: boolean;
  /** Los criterios generales del área. */
  bloque: BloqueParaVista;
  especialidades: EspecialidadParaVista[];
}

export interface CatalogoParaVista {
  areas: AreaParaVista[];
}

type BloqueDeConsulta = CatalogoEvaluacion['areas'][number]['bloque'];

function aBloque(bloque: BloqueDeConsulta): BloqueParaVista {
  return {
    criterios: bloque.criterios.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      tipo: c.tipo,
      peso: c.peso,
      obligatorio: c.obligatorio,
      activo: c.activo,
    })),
    suma: bloque.suma_actual,
    valido: bloque.valido,
    mensajeInvalido: bloque.mensaje_invalido,
  };
}

/**
 * El catálogo de `listarCatalogoEvaluacion` al modelo de presentación (áreas, especialidades y sus bloques de criterios).
 * Solo renombra: si un bloque es válido y su suma salen de la consulta, que usa la regla de `domain/`.
 */
export function aCatalogo(catalogo: CatalogoEvaluacion): CatalogoParaVista {
  return {
    areas: catalogo.areas.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      activo: a.activo,
      bloque: aBloque(a.bloque),
      especialidades: a.especialidades.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        activo: e.activo,
        bloque: aBloque(e.bloque),
      })),
    })),
  };
}

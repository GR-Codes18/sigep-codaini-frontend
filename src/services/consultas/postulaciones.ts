/**
 * Consultas de postulaciones, criterios de evaluación y Configuración (Fase 2, paso 11C; propuesta §5.1 y
 * §5.8). Todas son solo del Administrador y comprueban su permiso de módulo con `puedeEnRol`:
 * `VER_POSTULACIONES`, `GESTIONAR_CRITERIOS_EVALUACION` y `GESTIONAR_CONFIGURACION`. Ninguna escribe.
 *
 * El puntaje y el desglose son los que guardó la evaluación: cambiar los criterios o la Configuración no
 * recalcula nada (§5.1).
 */

import { z } from 'zod';
import type { DatosAlmacen } from '@/data';
import {
  SECCIONES_CONFIGURACION,
  clavesDeSeccion,
  decisionesDisponibles,
  validarBloqueCriterios,
  sumaPesosActivos,
  type AccionDecisionPostulacion,
  type BloqueCriterio,
  type ClaveParametro,
  type CodigoBloqueCriterios,
  type CriterioEvaluacion,
  type EstadoPostulacion,
  type FechaHora,
  type Id,
  type PostulacionEvaluacion,
  type Postulante,
  type SeccionConfiguracion,
  type ValorParametro,
} from '@/domain';
import { bloqueDeArea, bloqueDeEspecialidad } from '../catalogoEvaluacion/comun';
import { igualValor } from '../configuracion/comun';
import { ENTORNO, type Entorno } from '../entorno';
import { etiquetaParametro } from '../etiquetas';
import { fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';
import { ejecutarConsulta } from '../transaccional';
import {
  cargarActorActivo,
  conAutor,
  esquemaEntradaActor,
  exigirPermisoDeModulo,
  nombreDeCatalogo,
  type EntradaConActor,
  type EventoConAutor,
} from './comun';

interface Nombre {
  id: Id;
  nombre: string;
}

/** La evaluación más reciente de un postulante, o `undefined` si todavía no se evaluó. */
function evaluacionDe(
  datos: Pick<DatosAlmacen, 'evaluaciones'>,
  idPostulante: Id,
): PostulacionEvaluacion | undefined {
  return datos.evaluaciones
    .filter((e) => e.id_postulante === idPostulante)
    .sort((a, b) => b.fecha_evaluacion.localeCompare(a.fecha_evaluacion))[0];
}

// ── Postulaciones: listado ───────────────────────────────────────────────────────────────────

export interface PostulacionListado {
  id: Id;
  nombre: string;
  correo: string;
  area: Nombre | null;
  especialidad: Nombre | null;
  fecha_postulacion: FechaHora;
  estado: EstadoPostulacion;
  /** Nota final de la evaluación; `null` si todavía no se evaluó. */
  puntaje: number | null;
  /** La marca «Requiere revisión manual»; `false` si no hay evaluación. */
  requiere_revision_manual: boolean;
}

export interface ListadoPostulaciones {
  /** Por puntaje de mayor a menor (es el ranking, §5.1); las sin evaluar al final. */
  postulaciones: PostulacionListado[];
  /** `REQUIEREN_REVISION` son las **pendientes** con la marca de revisión manual. */
  contadores: {
    TODAS: number;
    PENDIENTES: number;
    REQUIEREN_REVISION: number;
    APROBADAS: number;
    RECHAZADAS: number;
  };
}

/** Las postulaciones con su puntaje y su marca, por puntaje de mayor a menor (el ranking de §5.1). */
export function filasDePostulaciones(
  datos: Pick<DatosAlmacen, 'postulantes' | 'evaluaciones' | 'areas_tecnicas' | 'especialidades'>,
): PostulacionListado[] {
  return datos.postulantes
    .map((p): PostulacionListado => {
      const evaluacion = evaluacionDe(datos, p.id);
      return {
        id: p.id,
        nombre: p.nombre,
        correo: p.correo,
        area: nombreDeCatalogo(datos.areas_tecnicas, p.id_area_tecnica),
        especialidad: nombreDeCatalogo(datos.especialidades, p.id_especialidad),
        fecha_postulacion: p.fecha_postulacion,
        estado: p.estado,
        puntaje: evaluacion?.puntaje_total ?? null,
        requiere_revision_manual: evaluacion?.requiere_revision_manual ?? false,
      };
    })
    .sort(
      (a, b) =>
        (b.puntaje ?? -1) - (a.puntaje ?? -1) ||
        a.fecha_postulacion.localeCompare(b.fecha_postulacion) ||
        a.id.localeCompare(b.id),
    );
}

export function listarPostulaciones(
  entrada: EntradaConActor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<ListadoPostulaciones>> {
  return ejecutarConsulta(entorno, ({ datos }) => {
    const valida = validarEntrada(esquemaEntradaActor, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const modulo = exigirPermisoDeModulo(actor.valor, 'VER_POSTULACIONES');
    if (!modulo.ok) return modulo;

    const postulaciones = filasDePostulaciones(datos);

    const por = (estado: EstadoPostulacion) => postulaciones.filter((p) => p.estado === estado);
    return {
      ok: true,
      valor: {
        postulaciones,
        contadores: {
          TODAS: postulaciones.length,
          PENDIENTES: por('PENDIENTE').length,
          REQUIEREN_REVISION: por('PENDIENTE').filter((p) => p.requiere_revision_manual).length,
          APROBADAS: por('APROBADA').length,
          RECHAZADAS: por('RECHAZADA').length,
        },
      },
    };
  });
}

// ── Postulaciones: detalle ───────────────────────────────────────────────────────────────────

export interface CriterioEvaluado {
  nombre: string;
  peso: number;
  cumplido: boolean;
  puntaje_obtenido: number;
  observacion: string | null;
}

export interface EvaluacionDetalle {
  puntaje_total: number;
  puntaje_area: number;
  puntaje_especialidad: number;
  justificacion: string;
  requiere_revision_manual: boolean;
  fecha_evaluacion: FechaHora;
  /** El desglose con el que se evaluó, separado en los dos bloques (§5.1). */
  bloques: Record<BloqueCriterio, CriterioEvaluado[]>;
}

export interface PostulacionDetalle {
  postulante: Pick<Postulante, 'id' | 'nombre' | 'correo' | 'celular' | 'fecha_postulacion'> & {
    area: Nombre | null;
    especialidad: Nombre | null;
    cv: Postulante['cv'];
  };
  estado: EstadoPostulacion;
  /** `null` si todavía no se evaluó. */
  evaluacion: EvaluacionDetalle | null;
  /** Recibida, evaluada, aprobada, rechazada…, del más reciente al más antiguo. */
  eventos: EventoConAutor[];
  /** La cuenta de practicante que nació de esta postulación (si fue aprobada). */
  practicante: Nombre | null;
  /**
   * Las decisiones que se pueden tomar ahora, según su estado (`decisionesDisponibles` de `domain/`): pendiente →
   * aprobar y rechazar; rechazada → reconsiderar; aprobada → ninguna. La pantalla no lo deduce del estado.
   */
  decisiones: AccionDecisionPostulacion[];
}

const esquemaEntradaPostulacion = z.object({ idActor: esquemaId, idPostulante: esquemaId });
export type EntradaConPostulacion = z.input<typeof esquemaEntradaPostulacion>;

export function obtenerPostulacion(
  entrada: EntradaConPostulacion,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<PostulacionDetalle>> {
  return ejecutarConsulta(entorno, ({ datos }) => {
    const valida = validarEntrada(esquemaEntradaPostulacion, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const modulo = exigirPermisoDeModulo(actor.valor, 'VER_POSTULACIONES');
    if (!modulo.ok) return modulo;

    const p = datos.postulantes.find((x) => x.id === valida.valor.idPostulante);
    if (p === undefined) return fallo('NO_ENCONTRADO');

    const evaluacion = evaluacionDe(datos, p.id);
    const criteriosDe = (bloque: BloqueCriterio): CriterioEvaluado[] =>
      evaluacion === undefined
        ? []
        : datos.detalles_evaluacion
            .filter((d) => d.id_evaluacion === evaluacion.id && d.bloque === bloque)
            .map((d) => ({
              nombre: d.nombre_criterio,
              peso: d.peso,
              cumplido: d.cumplido,
              puntaje_obtenido: d.puntaje_obtenido,
              observacion: d.observacion,
            }));
    const practicante = datos.practicantes.find((x) => x.id_postulante === p.id);

    return {
      ok: true,
      valor: {
        postulante: {
          id: p.id,
          nombre: p.nombre,
          correo: p.correo,
          celular: p.celular,
          fecha_postulacion: p.fecha_postulacion,
          area: nombreDeCatalogo(datos.areas_tecnicas, p.id_area_tecnica),
          especialidad: nombreDeCatalogo(datos.especialidades, p.id_especialidad),
          cv: p.cv,
        },
        estado: p.estado,
        evaluacion:
          evaluacion === undefined
            ? null
            : {
                puntaje_total: evaluacion.puntaje_total,
                puntaje_area: evaluacion.puntaje_area,
                puntaje_especialidad: evaluacion.puntaje_especialidad,
                justificacion: evaluacion.justificacion,
                requiere_revision_manual: evaluacion.requiere_revision_manual,
                fecha_evaluacion: evaluacion.fecha_evaluacion,
                bloques: { AREA: criteriosDe('AREA'), ESPECIALIDAD: criteriosDe('ESPECIALIDAD') },
              },
        eventos: conAutor(
          datos.usuarios,
          datos.historial.filter((e) => e.elemento.tipo === 'POSTULANTE' && e.elemento.id === p.id),
        ),
        practicante:
          practicante === undefined
            ? null
            : {
                id: practicante.id_usuario,
                nombre: nombreDeUsuario(datos, practicante.id_usuario),
              },
        decisiones: decisionesDisponibles(p.estado),
      },
    };
  });
}

function nombreDeUsuario(datos: Pick<DatosAlmacen, 'usuarios'>, id: Id): string {
  return datos.usuarios.find((u) => u.id === id)?.nombre ?? id;
}

// ── Catálogo de evaluación ───────────────────────────────────────────────────────────────────

/** Los criterios de un bloque y si, con sus pesos activos, el bloque permite calcular un puntaje. */
export interface BloqueDeCriterios {
  /** Todos, también los desactivados (nada se borra). */
  criterios: CriterioEvaluacion[];
  /** «Suma actual: N/100», solo con los criterios activos. */
  suma_actual: number;
  /** `true` si pesos enteros mayores que 0 suman 100: solo entonces se puede activar el área o la especialidad. */
  valido: boolean;
  /** Por qué no es válido; `null` si lo es. */
  codigo_invalido: CodigoBloqueCriterios | null;
  mensaje_invalido: string | null;
}

export interface EspecialidadDeCatalogo extends Nombre {
  activo: boolean;
  bloque: BloqueDeCriterios;
}

export interface AreaDeCatalogo extends Nombre {
  activo: boolean;
  bloque: BloqueDeCriterios;
  especialidades: EspecialidadDeCatalogo[];
}

export interface CatalogoEvaluacion {
  areas: AreaDeCatalogo[];
}

function bloqueDe(criterios: CriterioEvaluacion[], bloque: BloqueCriterio): BloqueDeCriterios {
  const r = validarBloqueCriterios(criterios, bloque);
  return {
    criterios,
    suma_actual: sumaPesosActivos(criterios),
    valido: r.ok,
    codigo_invalido: r.ok ? null : r.codigo,
    mensaje_invalido: r.ok ? null : r.mensaje,
  };
}

/** Áreas, especialidades y criterios con su «Suma actual N/100» (`GESTIONAR_CRITERIOS_EVALUACION`). */
export function listarCatalogoEvaluacion(
  entrada: EntradaConActor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<CatalogoEvaluacion>> {
  return ejecutarConsulta(entorno, ({ datos }) => {
    const valida = validarEntrada(esquemaEntradaActor, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const modulo = exigirPermisoDeModulo(actor.valor, 'GESTIONAR_CRITERIOS_EVALUACION');
    if (!modulo.ok) return modulo;

    const areas = datos.areas_tecnicas.map((area): AreaDeCatalogo => ({
      id: area.id,
      nombre: area.nombre,
      activo: area.activo,
      bloque: bloqueDe(bloqueDeArea(datos.criterios, area.id), 'AREA'),
      especialidades: datos.especialidades
        .filter((e) => e.id_area_tecnica === area.id)
        .map((e) => ({
          id: e.id,
          nombre: e.nombre,
          activo: e.activo,
          bloque: bloqueDe(bloqueDeEspecialidad(datos.criterios, e.id), 'ESPECIALIDAD'),
        })),
    }));
    return { ok: true, valor: { areas } };
  });
}

// ── Configuración ────────────────────────────────────────────────────────────────────────────

export interface ParametroVista {
  clave: ClaveParametro;
  /** El nombre en español para el título del campo y el historial. */
  etiqueta: string;
  valor: ValorParametro;
  valor_predeterminado: ValorParametro;
  /** `true` si el valor vigente es el predeterminado (para habilitar «Restaurar»). */
  es_predeterminado: boolean;
}

export interface SeccionVista {
  seccion: SeccionConfiguracion;
  parametros: ParametroVista[];
}

export interface ConfiguracionVista {
  /** Evaluación, Prácticas y Seguimiento, con sus parámetros en el orden del catálogo. */
  secciones: SeccionVista[];
}

/** Valores vigentes y predeterminados de cada sección (`GESTIONAR_CONFIGURACION`). */
export function obtenerConfiguracion(
  entrada: EntradaConActor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<ConfiguracionVista>> {
  return ejecutarConsulta(entorno, ({ datos }) => {
    const valida = validarEntrada(esquemaEntradaActor, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const modulo = exigirPermisoDeModulo(actor.valor, 'GESTIONAR_CONFIGURACION');
    if (!modulo.ok) return modulo;

    const secciones: SeccionVista[] = [];
    for (const seccion of SECCIONES_CONFIGURACION) {
      const parametros: ParametroVista[] = [];
      for (const clave of clavesDeSeccion(seccion)) {
        const guardado = datos.parametros.find((x) => x.clave === clave);
        // Un parámetro ausente es un dato roto: `restaurar` lo arregla desde Configuración.
        if (guardado === undefined) return fallo('CONFIGURACION_INVALIDA');
        parametros.push({
          clave,
          etiqueta: etiquetaParametro(clave),
          valor: structuredClone(guardado.valor),
          valor_predeterminado: structuredClone(guardado.valor_predeterminado),
          es_predeterminado: igualValor(guardado.valor, guardado.valor_predeterminado),
        });
      }
      secciones.push({ seccion, parametros });
    }
    return { ok: true, valor: { secciones } };
  });
}

/**
 * Ciclo de vida (Fase 1, paso 10; propuesta §5.2, §5.3, §5.4 y §8.1).
 *
 * Funciones puras que dicen si una acción de ciclo de vida se puede hacer y qué efectos produce.
 * No escriben nada: el servicio de la Fase 2 aplica los efectos (bajas, tareas liberadas con un
 * registro por cada una, notificaciones). No importa React, Zustand, `data/` ni `services/`.
 *
 * Reglas acordadas por los autores (detalle en DECISIONES.md, paso 10):
 *   - Un proyecto FINALIZADO es historia cerrada: no se asigna, no se quita a nadie y no se cambia
 *     de supervisor hasta reactivarlo. Esa guarda vive aquí y no en `puede()`, que sigue decidiendo
 *     solo quién puede (los códigos y la guarda de las 14 acciones de tareas no cambian).
 *   - Finalizar la práctica da baja a todas las asignaciones vigentes (también en un proyecto
 *     FINALIZADO) y libera las tareas EN_PROGRESO del practicante; las ESPERANDO_SUPERVISION se
 *     quedan. Avisa a los supervisores de los proyectos donde se liberó alguna tarea.
 *   - Finalizar el proyecto se bloquea con tareas ESPERANDO_SUPERVISION (decisiones pendientes del
 *     supervisor); libera las EN_PROGRESO y fija `fecha_fin_real`. No cierra las asignaciones. Se
 *     puede desde ACTIVO o EN_PAUSA.
 *   - Un supervisor con proyectos ACTIVO o EN_PAUSA no se desactiva: primero se reasignan.
 *   - «Hoy» es la fecha de calendario de `ahora` en hora de Perú (UTC−5).
 *
 * Texto: como en las transiciones, `undefined` en el campo exigido significa «todavía no se
 * escribió»: la acción queda permitida y devuelve `exige_texto` y los `efectos` (sirven para el
 * aviso «Tiene N tareas en progreso que serán liberadas»). Vacío o solo espacios es
 * `TEXTO_OBLIGATORIO`. El servicio debe pasar SIEMPRE el texto y rechazar si `exige_texto` no es
 * `null` y falta.
 *
 * Orden de comprobación (se detiene en la primera negativa): `ahora` (si la función lo usa) →
 * `puede()` → proyecto FINALIZADO (asignar, quitar y cambiar de supervisor) → estado de la persona
 * o del proyecto → condición (con su cantidad) → texto.
 */

import type { Fecha, FechaHora, Id } from './comunes';
import type { EstadoProyecto } from './enumeraciones';
import { puede } from './permisos';
import type { CodigoDenegacion, TextoExigido } from './permisos';
import type { Asignacion, Proyecto } from './proyectos';
import type { Tarea } from './tareas';
import { esAhoraValido, hoyEn } from './tiempo';
import { TEXTO_OBLIGATORIO, validarTexto } from './transiciones';
import type { TextoTransicion } from './transiciones';
import type { Usuario } from './usuarios';

/** Códigos de error propios de esta capa; los de `puede()` y `TEXTO_OBLIGATORIO` se conservan. */
export const CODIGOS_CICLO_VIDA = [
  'AHORA_INVALIDO',
  'PRACTICANTE_YA_FINALIZADO',
  'PROYECTO_YA_FINALIZADO',
  'TAREAS_ESPERANDO_SUPERVISION',
  'SUPERVISOR_CON_PROYECTOS',
  'SUPERVISOR_YA_INACTIVO',
  'PRACTICANTE_NO_ACTIVO',
  'ASIGNACION_VIGENTE_EXISTENTE',
  'ASIGNACION_NO_VIGENTE',
  'SUPERVISOR_NO_VALIDO',
  'MISMO_SUPERVISOR',
] as const;

export type CodigoCicloVidaPropio = (typeof CODIGOS_CICLO_VIDA)[number];
export type CodigoCicloVida = CodigoDenegacion | typeof TEXTO_OBLIGATORIO | CodigoCicloVidaPropio;

/** `cantidad` solo viene en los bloqueos con conteo (tareas esperando, proyectos del supervisor). */
export interface ErrorCicloVida {
  ok: false;
  codigo: CodigoCicloVida;
  cantidad?: number;
}

/** Estados de un proyecto que impiden desactivar a su supervisor: todo menos FINALIZADO. */
const ESTADOS_QUE_IMPIDEN_DESACTIVAR: readonly EstadoProyecto[] = ['ACTIVO', 'EN_PAUSA'];

export interface DatosFinalizarPractica {
  proyectos: readonly Proyecto[];
  asignaciones: readonly Asignacion[];
  tareas: readonly Tarea[];
}

export interface EfectosFinalizarPractica {
  /** Ids de las asignaciones vigentes del practicante, en cualquier proyecto. */
  asignaciones_a_cerrar: Id[];
  fecha_baja: Fecha;
  /** Sus tareas EN_PROGRESO: pasan a DISPONIBLE, con un registro por cada una. */
  tareas_a_liberar: Id[];
  /** Supervisores de los proyectos donde se liberó alguna tarea, sin repetir. */
  supervisores_a_avisar: Id[];
}

export interface EfectosFinalizarProyecto {
  /** Las tareas EN_PROGRESO del proyecto: pasan a DISPONIBLE, con un registro por cada una. */
  tareas_a_liberar: Id[];
  fecha_fin_real: Fecha;
}

export interface EfectosQuitarPracticante {
  asignacion_a_cerrar: Id;
  /** Las tareas EN_PROGRESO del practicante en ESE proyecto. */
  tareas_a_liberar: Id[];
}

export type ResultadoFinalizarPractica =
  { ok: true; exige_texto: TextoExigido; efectos: EfectosFinalizarPractica } | ErrorCicloVida;

export type ResultadoFinalizarProyecto =
  { ok: true; exige_texto: TextoExigido; efectos: EfectosFinalizarProyecto } | ErrorCicloVida;

export type ResultadoQuitarPracticante =
  { ok: true; exige_texto: TextoExigido; efectos: EfectosQuitarPracticante } | ErrorCicloVida;

/** Resultado de las acciones sin efectos que calcular. */
export type ResultadoSimple = { ok: true; exige_texto: TextoExigido } | ErrorCicloVida;

function error(codigo: CodigoCicloVida, cantidad?: number): ErrorCicloVida {
  return cantidad === undefined ? { ok: false, codigo } : { ok: false, codigo, cantidad };
}

function esVigente(a: Asignacion, idPracticante: Id): boolean {
  return a.id_practicante === idPracticante && a.fecha_baja === null;
}

/**
 * Finalizar la práctica de un practicante (§5.2): da baja a sus asignaciones vigentes y libera
 * sus tareas EN_PROGRESO. Exige un motivo.
 */
export function finalizarPractica(
  usuario: Usuario,
  objetivo: Usuario,
  datos: DatosFinalizarPractica,
  ahora: FechaHora,
  texto?: TextoTransicion,
): ResultadoFinalizarPractica {
  if (!esAhoraValido(ahora)) return error('AHORA_INVALIDO');

  const permiso = puede(usuario, 'FINALIZAR_PRACTICA', { usuario_objetivo: objetivo });
  if (!permiso.permitido) return error(permiso.codigo);

  if (objetivo.estado !== 'ACTIVO') return error('PRACTICANTE_YA_FINALIZADO');

  if (validarTexto(texto, permiso.exige_texto) !== null) return error(TEXTO_OBLIGATORIO);

  const tareasALiberar = datos.tareas.filter(
    (t) => t.id_practicante === objetivo.id && t.estado === 'EN_PROGRESO',
  );
  const supervisores = tareasALiberar.flatMap((t) => {
    const proyecto = datos.proyectos.find((p) => p.id === t.id_proyecto);
    return proyecto === undefined ? [] : [proyecto.id_supervisor];
  });
  return {
    ok: true,
    exige_texto: permiso.exige_texto,
    efectos: {
      asignaciones_a_cerrar: datos.asignaciones
        .filter((a) => esVigente(a, objetivo.id))
        .map((a) => a.id),
      fecha_baja: hoyEn(ahora),
      tareas_a_liberar: tareasALiberar.map((t) => t.id),
      supervisores_a_avisar: [...new Set(supervisores)],
    },
  };
}

/**
 * Finalizar un proyecto (§5.4): se bloquea con tareas ESPERANDO_SUPERVISION; libera las
 * EN_PROGRESO y fija la fecha real de finalización. No cierra las asignaciones. Exige una nota.
 */
export function finalizarProyecto(
  usuario: Usuario,
  proyecto: Proyecto,
  tareas: readonly Tarea[],
  ahora: FechaHora,
  texto?: TextoTransicion,
): ResultadoFinalizarProyecto {
  if (!esAhoraValido(ahora)) return error('AHORA_INVALIDO');

  const permiso = puede(usuario, 'FINALIZAR_PROYECTO', { proyecto });
  if (!permiso.permitido) return error(permiso.codigo);

  if (proyecto.estado === 'FINALIZADO') return error('PROYECTO_YA_FINALIZADO');

  const delProyecto = tareas.filter((t) => t.id_proyecto === proyecto.id);
  const esperando = delProyecto.filter((t) => t.estado === 'ESPERANDO_SUPERVISION').length;
  if (esperando > 0) return error('TAREAS_ESPERANDO_SUPERVISION', esperando);

  if (validarTexto(texto, permiso.exige_texto) !== null) return error(TEXTO_OBLIGATORIO);

  return {
    ok: true,
    exige_texto: permiso.exige_texto,
    efectos: {
      tareas_a_liberar: delProyecto.filter((t) => t.estado === 'EN_PROGRESO').map((t) => t.id),
      fecha_fin_real: hoyEn(ahora),
    },
  };
}

/**
 * Desactivar a un supervisor (§5.3): se bloquea mientras tenga proyectos ACTIVO o EN_PAUSA; el
 * error trae cuántos son.
 */
export function desactivarSupervisor(
  usuario: Usuario,
  objetivo: Usuario,
  proyectos: readonly Proyecto[],
): ResultadoSimple {
  const permiso = puede(usuario, 'DESACTIVAR_SUPERVISOR', { usuario_objetivo: objetivo });
  if (!permiso.permitido) return error(permiso.codigo);

  if (objetivo.estado !== 'ACTIVO') return error('SUPERVISOR_YA_INACTIVO');

  const pendientes = proyectos.filter(
    (p) => p.id_supervisor === objetivo.id && ESTADOS_QUE_IMPIDEN_DESACTIVAR.includes(p.estado),
  ).length;
  if (pendientes > 0) return error('SUPERVISOR_CON_PROYECTOS', pendientes);

  return { ok: true, exige_texto: permiso.exige_texto };
}

/**
 * Asignar un practicante a un proyecto (§5.4). `asignaciones` son las de todos los practicantes
 * (el servicio las entrega). Un proyecto FINALIZADO se reactiva antes.
 */
export function puedeAsignarPracticante(
  usuario: Usuario,
  proyecto: Proyecto,
  practicante: Usuario,
  asignaciones: readonly Asignacion[],
): ResultadoSimple {
  const permiso = puede(usuario, 'ASIGNAR_PRACTICANTE', { proyecto });
  if (!permiso.permitido) return error(permiso.codigo);

  if (proyecto.estado === 'FINALIZADO') return error('PROYECTO_FINALIZADO');

  if (practicante.rol !== 'PRACTICANTE' || practicante.estado !== 'ACTIVO') {
    return error('PRACTICANTE_NO_ACTIVO');
  }
  if (asignaciones.some((a) => esVigente(a, practicante.id) && a.id_proyecto === proyecto.id)) {
    return error('ASIGNACION_VIGENTE_EXISTENTE');
  }
  return { ok: true, exige_texto: permiso.exige_texto };
}

/**
 * Quitar a un practicante de un proyecto (§5.4): su asignación recibe baja y se liberan sus
 * tareas EN_PROGRESO de ese proyecto.
 */
export function puedeQuitarPracticante(
  usuario: Usuario,
  proyecto: Proyecto,
  idPracticante: Id,
  asignaciones: readonly Asignacion[],
  tareas: readonly Tarea[],
): ResultadoQuitarPracticante {
  const permiso = puede(usuario, 'QUITAR_PRACTICANTE', { proyecto });
  if (!permiso.permitido) return error(permiso.codigo);

  if (proyecto.estado === 'FINALIZADO') return error('PROYECTO_FINALIZADO');

  const asignacion = asignaciones.find(
    (a) => esVigente(a, idPracticante) && a.id_proyecto === proyecto.id,
  );
  if (asignacion === undefined) return error('ASIGNACION_NO_VIGENTE');

  return {
    ok: true,
    exige_texto: permiso.exige_texto,
    efectos: {
      asignacion_a_cerrar: asignacion.id,
      tareas_a_liberar: tareas
        .filter(
          (t) =>
            t.id_proyecto === proyecto.id &&
            t.id_practicante === idPracticante &&
            t.estado === 'EN_PROGRESO',
        )
        .map((t) => t.id),
    },
  };
}

/**
 * Cambiar el supervisor de un proyecto (§5.3 y §5.4): el nuevo debe ser un supervisor ACTIVO y
 * distinto del actual. Las tareas ESPERANDO_SUPERVISION pasan con el proyecto.
 */
export function puedeCambiarSupervisor(
  usuario: Usuario,
  proyecto: Proyecto,
  nuevoSupervisor: Usuario,
): ResultadoSimple {
  const permiso = puede(usuario, 'CAMBIAR_SUPERVISOR', { proyecto });
  if (!permiso.permitido) return error(permiso.codigo);

  if (proyecto.estado === 'FINALIZADO') return error('PROYECTO_FINALIZADO');

  if (nuevoSupervisor.rol !== 'SUPERVISOR' || nuevoSupervisor.estado !== 'ACTIVO') {
    return error('SUPERVISOR_NO_VALIDO');
  }
  if (nuevoSupervisor.id === proyecto.id_supervisor) return error('MISMO_SUPERVISOR');

  return { ok: true, exige_texto: permiso.exige_texto };
}

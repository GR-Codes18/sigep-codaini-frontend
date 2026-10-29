/**
 * Permisos por rol: la matriz de §4 convertida en un contrato de acciones.
 *
 * `puede()` decide **solo quién** puede intentar una acción: rol, alcance (proyecto del
 * supervisor, asignación vigente del practicante, proyectos del insight), identidad
 * (responsable de la tarea, cuenta propia) y usuario `ACTIVO`. Además devuelve si hace falta
 * motivo o nota.
 *
 * NO decide si el estado de la tarea o del proyecto permite la operación, ni si la tarea ya
 * tiene un Pull Request: eso lo resuelven las transiciones y reglas de los pasos 3 a 5. Por eso
 * su resultado **no basta para mostrar un botón**: la interfaz debe consultar también esas
 * funciones. Única excepción de estado: un proyecto FINALIZADO bloquea las acciones que cambian
 * tareas (§6.8); la vía es reactivarlo.
 *
 * Orden de comprobación (se detiene en la primera negativa):
 *   1. usuario ACTIVO      -> USUARIO_INACTIVO
 *   2. rol permitido       -> ROL_NO_PERMITIDO
 *   3. alcance             -> FUERA_DE_ALCANCE
 *   4. identidad           -> NO_ES_EL_RESPONSABLE o NO_ES_TU_CUENTA
 *   5. proyecto FINALIZADO -> PROYECTO_FINALIZADO
 *   6. texto exigido       -> 'MOTIVO', 'NOTA' o null
 *
 * El alcance se comprueba SIEMPRE antes que la identidad: quien está fuera del proyecto recibe
 * `FUERA_DE_ALCANCE`, nunca `NO_ES_EL_RESPONSABLE`, para no revelar que la tarea existe. Los
 * códigos tampoco distinguen entre un recurso inexistente y uno ajeno: el servicio resuelve la
 * entidad antes de preguntar.
 *
 * La vigencia de una asignación es `fecha_baja === null` y se calcula aquí, no en servicios ni
 * pantallas. En las acciones de proyecto, `asignaciones` son las del usuario que actúa (para el
 * Administrador y el Supervisor, `[]`).
 */

import type { Insight } from './insights';
import type { Asignacion, Proyecto } from './proyectos';
import type { Tarea } from './tareas';
import type { Usuario } from './usuarios';

export const ACCIONES_PERMISO = [
  // Tareas y Pull Requests
  'CREAR_TAREA',
  'EDITAR_DATOS_TAREA',
  'TOMAR_TAREA',
  'LIBERAR_TAREA',
  'ENVIAR_TAREA',
  'APROBAR_TAREA',
  'DEVOLVER_TAREA',
  'REABRIR_TAREA',
  'ELIMINAR_TAREA',
  'CAMBIAR_REQUIERE_SUPERVISION',
  'ACTIVAR_REQUIERE_PR',
  'DESACTIVAR_REQUIERE_PR',
  'CREAR_PULL_REQUEST',
  'CERRAR_PULL_REQUEST',
  'VER_TAREA',
  // Proyectos y equipo
  'CREAR_PROYECTO',
  'EDITAR_DATOS_PROYECTO',
  'CAMBIAR_RAMA_BASE',
  'DEFINIR_REUNION',
  'GESTIONAR_ENLACES',
  'CAMBIAR_SUPERVISOR',
  'ASIGNAR_PRACTICANTE',
  'QUITAR_PRACTICANTE',
  'PAUSAR_PROYECTO',
  'REANUDAR_PROYECTO',
  'FINALIZAR_PROYECTO',
  'REACTIVAR_PROYECTO',
  'VER_PROYECTO',
  'VER_RESUMEN_PROYECTO_ANTERIOR',
  'VER_PRACTICANTES',
  // Personas y cuentas
  'APROBAR_POSTULACION',
  'RECHAZAR_POSTULACION',
  'RECONSIDERAR_POSTULACION',
  'GESTIONAR_CRITERIOS_EVALUACION',
  'CREAR_SUPERVISOR',
  'RESTABLECER_CONTRASENA',
  'FINALIZAR_PRACTICA',
  'REACTIVAR_PRACTICA',
  'EDITAR_DATOS_PRACTICA',
  'EDITAR_NOMBRE_PROPIO',
  'EDITAR_CORREO_PROPIO',
  'EDITAR_CELULAR_PROPIO',
  'EDITAR_DISCORD_PROPIO',
  'EDITAR_GITHUB_PROPIO',
  'EDITAR_DISPONIBILIDAD_PROPIA',
  'EDITAR_CREDENCIAL_SUPERVISOR',
  'DESACTIVAR_SUPERVISOR',
  'REACTIVAR_SUPERVISOR',
  'CAMBIAR_CONTRASENA_PROPIA',
  // Seguimiento y sistema
  'VER_REPORTES',
  'MARCAR_INSIGHT_REVISADO',
  'NOTIFICAR_DESDE_INSIGHT',
  'VER_HISTORIAL_GLOBAL',
  'GESTIONAR_CONFIGURACION',
  'RESTABLECER_DATOS_DEMOSTRACION',
] as const;

export type AccionPermiso = (typeof ACCIONES_PERMISO)[number];

export const AMBITOS_PERMISO = ['PROYECTO', 'PROPIO', 'GLOBAL'] as const;
export type AmbitoPermiso = (typeof AMBITOS_PERMISO)[number];

/**
 * Ámbito de cada acción, para las pruebas de alcance y para no repetir comprobaciones:
 * `PROYECTO` depende de un proyecto concreto (o de `insight.ids_proyecto`), `PROPIO` solo de la
 * propia cuenta y `GLOBAL` solo del rol y, si aplica, del objetivo.
 */
export const AMBITO_POR_ACCION = {
  // Tareas y Pull Requests
  CREAR_TAREA: 'PROYECTO',
  EDITAR_DATOS_TAREA: 'PROYECTO',
  TOMAR_TAREA: 'PROYECTO',
  LIBERAR_TAREA: 'PROYECTO',
  ENVIAR_TAREA: 'PROYECTO',
  APROBAR_TAREA: 'PROYECTO',
  DEVOLVER_TAREA: 'PROYECTO',
  REABRIR_TAREA: 'PROYECTO',
  ELIMINAR_TAREA: 'PROYECTO',
  CAMBIAR_REQUIERE_SUPERVISION: 'PROYECTO',
  ACTIVAR_REQUIERE_PR: 'PROYECTO',
  DESACTIVAR_REQUIERE_PR: 'PROYECTO',
  CREAR_PULL_REQUEST: 'PROYECTO',
  CERRAR_PULL_REQUEST: 'PROYECTO',
  VER_TAREA: 'PROYECTO',
  // Proyectos y equipo
  CREAR_PROYECTO: 'GLOBAL',
  EDITAR_DATOS_PROYECTO: 'PROYECTO',
  CAMBIAR_RAMA_BASE: 'PROYECTO',
  DEFINIR_REUNION: 'PROYECTO',
  GESTIONAR_ENLACES: 'PROYECTO',
  CAMBIAR_SUPERVISOR: 'PROYECTO',
  ASIGNAR_PRACTICANTE: 'PROYECTO',
  QUITAR_PRACTICANTE: 'PROYECTO',
  PAUSAR_PROYECTO: 'PROYECTO',
  REANUDAR_PROYECTO: 'PROYECTO',
  FINALIZAR_PROYECTO: 'PROYECTO',
  REACTIVAR_PROYECTO: 'PROYECTO',
  VER_PROYECTO: 'PROYECTO',
  VER_RESUMEN_PROYECTO_ANTERIOR: 'PROYECTO',
  VER_PRACTICANTES: 'PROYECTO',
  // Personas y cuentas
  APROBAR_POSTULACION: 'GLOBAL',
  RECHAZAR_POSTULACION: 'GLOBAL',
  RECONSIDERAR_POSTULACION: 'GLOBAL',
  GESTIONAR_CRITERIOS_EVALUACION: 'GLOBAL',
  CREAR_SUPERVISOR: 'GLOBAL',
  RESTABLECER_CONTRASENA: 'GLOBAL',
  FINALIZAR_PRACTICA: 'GLOBAL',
  REACTIVAR_PRACTICA: 'GLOBAL',
  EDITAR_DATOS_PRACTICA: 'GLOBAL',
  EDITAR_NOMBRE_PROPIO: 'PROPIO',
  EDITAR_CORREO_PROPIO: 'PROPIO',
  EDITAR_CELULAR_PROPIO: 'PROPIO',
  EDITAR_DISCORD_PROPIO: 'PROPIO',
  EDITAR_GITHUB_PROPIO: 'PROPIO',
  EDITAR_DISPONIBILIDAD_PROPIA: 'PROPIO',
  EDITAR_CREDENCIAL_SUPERVISOR: 'GLOBAL',
  DESACTIVAR_SUPERVISOR: 'GLOBAL',
  REACTIVAR_SUPERVISOR: 'GLOBAL',
  CAMBIAR_CONTRASENA_PROPIA: 'PROPIO',
  // Seguimiento y sistema
  VER_REPORTES: 'PROYECTO',
  MARCAR_INSIGHT_REVISADO: 'PROYECTO',
  NOTIFICAR_DESDE_INSIGHT: 'PROYECTO',
  VER_HISTORIAL_GLOBAL: 'GLOBAL',
  GESTIONAR_CONFIGURACION: 'GLOBAL',
  RESTABLECER_DATOS_DEMOSTRACION: 'GLOBAL',
} as const satisfies Record<AccionPermiso, AmbitoPermiso>;

/** Contexto de una consulta o acción sobre un proyecto concreto. */
interface ContextoProyecto {
  proyecto: Proyecto;
  /** Asignaciones del usuario que actúa, no las del proyecto. */
  asignaciones: Asignacion[];
}

/** Contexto de una acción sobre una tarea hecha por un practicante. */
interface ContextoTarea {
  proyecto: Proyecto;
  tarea: Tarea;
  /** Asignaciones del usuario que actúa. */
  asignaciones: Asignacion[];
}

/** Contexto de una acción sobre una tarea que solo pueden hacer Admin o Supervisor. */
interface ContextoTareaSinAsignaciones {
  proyecto: Proyecto;
  tarea: Tarea;
}

/** Contexto de una acción sobre una persona. */
interface ContextoPersona {
  usuario_objetivo: Usuario;
}

/** Contexto de las acciones sobre insights: solo lo que decide el permiso. */
interface ContextoInsight {
  insight: Pick<Insight, 'ids_proyecto' | 'tipo_regla'>;
}

/** Acciones que no necesitan contexto: deciden solo por rol. */
type SinContexto = Record<string, never>;

/**
 * Contexto de cada acción. Al construir `ContextoPorAccion` como un tipo mapeado sobre
 * `AccionPermiso`, si falta una acción el proyecto no compila.
 */
type ContextoDeAccion = {
  // Tareas y Pull Requests
  CREAR_TAREA: { proyecto: Proyecto };
  EDITAR_DATOS_TAREA: ContextoTareaSinAsignaciones;
  TOMAR_TAREA: ContextoTarea;
  LIBERAR_TAREA: ContextoTarea;
  ENVIAR_TAREA: ContextoTarea;
  APROBAR_TAREA: ContextoTareaSinAsignaciones;
  DEVOLVER_TAREA: ContextoTareaSinAsignaciones;
  REABRIR_TAREA: ContextoTareaSinAsignaciones;
  ELIMINAR_TAREA: ContextoTareaSinAsignaciones;
  CAMBIAR_REQUIERE_SUPERVISION: ContextoTareaSinAsignaciones;
  ACTIVAR_REQUIERE_PR: ContextoTareaSinAsignaciones;
  DESACTIVAR_REQUIERE_PR: ContextoTarea;
  CREAR_PULL_REQUEST: ContextoTarea;
  CERRAR_PULL_REQUEST: ContextoTarea;
  VER_TAREA: ContextoTarea;
  // Proyectos y equipo
  CREAR_PROYECTO: SinContexto;
  EDITAR_DATOS_PROYECTO: { proyecto: Proyecto };
  CAMBIAR_RAMA_BASE: { proyecto: Proyecto };
  DEFINIR_REUNION: { proyecto: Proyecto };
  GESTIONAR_ENLACES: { proyecto: Proyecto };
  CAMBIAR_SUPERVISOR: { proyecto: Proyecto };
  ASIGNAR_PRACTICANTE: { proyecto: Proyecto };
  QUITAR_PRACTICANTE: { proyecto: Proyecto };
  PAUSAR_PROYECTO: { proyecto: Proyecto };
  REANUDAR_PROYECTO: { proyecto: Proyecto };
  FINALIZAR_PROYECTO: { proyecto: Proyecto };
  REACTIVAR_PROYECTO: { proyecto: Proyecto };
  VER_PROYECTO: ContextoProyecto;
  VER_RESUMEN_PROYECTO_ANTERIOR: ContextoProyecto;
  VER_PRACTICANTES: ContextoProyecto;
  // Personas y cuentas
  APROBAR_POSTULACION: SinContexto;
  RECHAZAR_POSTULACION: SinContexto;
  RECONSIDERAR_POSTULACION: SinContexto;
  GESTIONAR_CRITERIOS_EVALUACION: SinContexto;
  CREAR_SUPERVISOR: SinContexto;
  RESTABLECER_CONTRASENA: ContextoPersona;
  FINALIZAR_PRACTICA: ContextoPersona;
  REACTIVAR_PRACTICA: ContextoPersona;
  EDITAR_DATOS_PRACTICA: ContextoPersona;
  EDITAR_NOMBRE_PROPIO: ContextoPersona;
  EDITAR_CORREO_PROPIO: ContextoPersona;
  EDITAR_CELULAR_PROPIO: ContextoPersona;
  EDITAR_DISCORD_PROPIO: ContextoPersona;
  EDITAR_GITHUB_PROPIO: ContextoPersona;
  EDITAR_DISPONIBILIDAD_PROPIA: ContextoPersona;
  EDITAR_CREDENCIAL_SUPERVISOR: ContextoPersona;
  DESACTIVAR_SUPERVISOR: ContextoPersona;
  REACTIVAR_SUPERVISOR: ContextoPersona;
  CAMBIAR_CONTRASENA_PROPIA: ContextoPersona;
  // Seguimiento y sistema
  VER_REPORTES: { proyecto: Proyecto };
  MARCAR_INSIGHT_REVISADO: ContextoInsight;
  NOTIFICAR_DESDE_INSIGHT: ContextoInsight;
  VER_HISTORIAL_GLOBAL: SinContexto;
  GESTIONAR_CONFIGURACION: SinContexto;
  RESTABLECER_DATOS_DEMOSTRACION: SinContexto;
};

/** Contexto tipado de cada acción: `ContextoPorAccion['VER_TAREA']`, etc. */
export type ContextoPorAccion = {
  [A in AccionPermiso]: ContextoDeAccion[A];
};

/**
 * Unión discriminada `{ accion, contexto }`. Permite escribir la tabla de pruebas sin perder
 * el tipado y sirve de base para `puede()` en el paso 2B.
 */
export type SolicitudPermiso = {
  [A in AccionPermiso]: { accion: A; contexto: ContextoPorAccion[A] };
}[AccionPermiso];

export const CODIGOS_DENEGACION = [
  'USUARIO_INACTIVO',
  'ROL_NO_PERMITIDO',
  'FUERA_DE_ALCANCE',
  'NO_ES_EL_RESPONSABLE',
  'NO_ES_TU_CUENTA',
  'PROYECTO_FINALIZADO',
] as const;

export type CodigoDenegacion = (typeof CODIGOS_DENEGACION)[number];

/**
 * Resultado de un permiso. `exige_texto` solo aparece cuando se permite; el servicio es quien
 * comprueba que el motivo o la nota lleguen.
 */
export type ResultadoPermiso =
  | { permitido: true; exige_texto: 'MOTIVO' | 'NOTA' | null }
  | { permitido: false; codigo: CodigoDenegacion };

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
 * Orden de comprobación (se detiene en la primera negativa). Vive entero en `puede()`, que
 * delega en `comprobarAlcance`, `comprobarIdentidad` y `finalizadoBloquea`, en ese orden:
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
 * `PROYECTO_FINALIZADO` está reservado a las 14 acciones que cambian tareas. Un practicante con
 * asignación vigente en un proyecto FINALIZADO recibe `FUERA_DE_ALCANCE` en `VER_PROYECTO`,
 * `VER_PRACTICANTES` y `VER_TAREA`: «vigente y no finalizado» es una regla de alcance, no la
 * guarda del paso 5. **La interfaz no debe usar `PROYECTO_FINALIZADO` para mostrar «proyecto
 * finalizado»**: ese texto sale del estado del proyecto, no del permiso.
 *
 * Un contexto incoherente (`tarea.id_proyecto !== proyecto.id`) nunca concede acceso: se
 * deniega como `FUERA_DE_ALCANCE` al inicio de `comprobarAlcance`, incluso para el
 * Administrador.
 *
 * La vigencia de una asignación es `fecha_baja === null` y se calcula aquí, no en servicios ni
 * pantallas. En las acciones de proyecto, `asignaciones` son las del usuario que actúa (para el
 * Administrador y el Supervisor, `[]`).
 */

import type { Id } from './comunes';
import type { Rol, TipoReglaInsight } from './enumeraciones';
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

/**
 * Contexto de las acciones sobre insights: solo lo que decide el permiso.
 *
 * `proyectos` son los del usuario que actúa, resueltos por el servicio. Sin ellos `domain/` no
 * puede saber si un `id_proyecto` del insight es suyo, y la regla «al menos un proyecto del
 * Supervisor» quedaría sin comprobar.
 */
interface ContextoInsight {
  insight: Pick<Insight, 'ids_proyecto' | 'tipo_regla'>;
  proyectos: Pick<Proyecto, 'id' | 'id_supervisor'>[];
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
 * el tipado y es lo que reciben las tres comprobaciones de `puede()`: así el `switch` estrecha
 * `contexto` sin conversiones por caso.
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

/** Texto que el servicio debe exigir para completar la acción. */
export type TextoExigido = 'MOTIVO' | 'NOTA' | null;

/**
 * Resultado de un permiso. `exige_texto` solo aparece cuando se permite; el servicio es quien
 * comprueba que el motivo o la nota lleguen.
 */
export type ResultadoPermiso =
  { permitido: true; exige_texto: TextoExigido } | { permitido: false; codigo: CodigoDenegacion };

/**
 * Regla de una acción: las dos últimas columnas de la matriz de §4 (quién puede y qué texto
 * exige). El alcance y la identidad, que dependen del contexto, viven en `comprobarAlcance` y
 * `comprobarIdentidad`.
 */
interface ReglaAccion {
  roles: readonly Rol[];
  /**
   * Texto obligatorio. `porRol` cuando depende de quién actúa: `LIBERAR_TAREA` (Administrador y
   * Supervisor) y `DESACTIVAR_REQUIERE_PR` (solo Practicante). Los roles ausentes no exigen
   * texto.
   */
  texto?: TextoExigido | { porRol: Partial<Record<Rol, TextoExigido>> };
}

/**
 * Matriz de §4 por acción. Es un `Record` total: una acción nueva no compila hasta que declare
 * sus roles y su texto.
 */
const REGLAS_POR_ACCION: Record<AccionPermiso, ReglaAccion> = {
  // Tareas y Pull Requests
  CREAR_TAREA: { roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
  EDITAR_DATOS_TAREA: { roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
  TOMAR_TAREA: { roles: ['PRACTICANTE'] },
  LIBERAR_TAREA: {
    roles: ['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'],
    texto: { porRol: { ADMINISTRADOR: 'MOTIVO', SUPERVISOR: 'MOTIVO' } },
  },
  ENVIAR_TAREA: { roles: ['PRACTICANTE'] },
  APROBAR_TAREA: { roles: ['SUPERVISOR'] },
  DEVOLVER_TAREA: { roles: ['SUPERVISOR'], texto: 'NOTA' },
  REABRIR_TAREA: { roles: ['ADMINISTRADOR', 'SUPERVISOR'], texto: 'NOTA' },
  ELIMINAR_TAREA: { roles: ['ADMINISTRADOR', 'SUPERVISOR'], texto: 'MOTIVO' },
  CAMBIAR_REQUIERE_SUPERVISION: { roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
  ACTIVAR_REQUIERE_PR: { roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
  DESACTIVAR_REQUIERE_PR: {
    roles: ['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'],
    texto: { porRol: { PRACTICANTE: 'MOTIVO' } },
  },
  CREAR_PULL_REQUEST: { roles: ['PRACTICANTE'] },
  CERRAR_PULL_REQUEST: {
    roles: ['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'],
    texto: 'MOTIVO',
  },
  VER_TAREA: { roles: ['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'] },
  // Proyectos y equipo
  CREAR_PROYECTO: { roles: ['ADMINISTRADOR'] },
  EDITAR_DATOS_PROYECTO: { roles: ['ADMINISTRADOR'] },
  CAMBIAR_RAMA_BASE: { roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
  DEFINIR_REUNION: { roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
  GESTIONAR_ENLACES: { roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
  CAMBIAR_SUPERVISOR: { roles: ['ADMINISTRADOR'] },
  ASIGNAR_PRACTICANTE: { roles: ['ADMINISTRADOR'] },
  QUITAR_PRACTICANTE: { roles: ['ADMINISTRADOR'] },
  PAUSAR_PROYECTO: { roles: ['ADMINISTRADOR'], texto: 'NOTA' },
  REANUDAR_PROYECTO: { roles: ['ADMINISTRADOR'], texto: 'NOTA' },
  FINALIZAR_PROYECTO: { roles: ['ADMINISTRADOR'], texto: 'NOTA' },
  REACTIVAR_PROYECTO: { roles: ['ADMINISTRADOR'], texto: 'NOTA' },
  VER_PROYECTO: { roles: ['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'] },
  VER_RESUMEN_PROYECTO_ANTERIOR: { roles: ['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'] },
  VER_PRACTICANTES: { roles: ['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'] },
  // Personas y cuentas
  APROBAR_POSTULACION: { roles: ['ADMINISTRADOR'] },
  RECHAZAR_POSTULACION: { roles: ['ADMINISTRADOR'], texto: 'MOTIVO' },
  RECONSIDERAR_POSTULACION: { roles: ['ADMINISTRADOR'], texto: 'NOTA' },
  GESTIONAR_CRITERIOS_EVALUACION: { roles: ['ADMINISTRADOR'] },
  CREAR_SUPERVISOR: { roles: ['ADMINISTRADOR'] },
  RESTABLECER_CONTRASENA: { roles: ['ADMINISTRADOR'] },
  FINALIZAR_PRACTICA: { roles: ['ADMINISTRADOR'], texto: 'MOTIVO' },
  REACTIVAR_PRACTICA: { roles: ['ADMINISTRADOR'], texto: 'NOTA' },
  EDITAR_DATOS_PRACTICA: { roles: ['ADMINISTRADOR'] },
  EDITAR_NOMBRE_PROPIO: { roles: ['ADMINISTRADOR', 'PRACTICANTE'] },
  EDITAR_CORREO_PROPIO: { roles: ['ADMINISTRADOR', 'PRACTICANTE'] },
  EDITAR_CELULAR_PROPIO: { roles: ['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'] },
  EDITAR_DISCORD_PROPIO: { roles: ['SUPERVISOR', 'PRACTICANTE'] },
  EDITAR_GITHUB_PROPIO: { roles: ['SUPERVISOR', 'PRACTICANTE'] },
  EDITAR_DISPONIBILIDAD_PROPIA: { roles: ['PRACTICANTE'] },
  EDITAR_CREDENCIAL_SUPERVISOR: { roles: ['ADMINISTRADOR'] },
  DESACTIVAR_SUPERVISOR: { roles: ['ADMINISTRADOR'] },
  REACTIVAR_SUPERVISOR: { roles: ['ADMINISTRADOR'] },
  CAMBIAR_CONTRASENA_PROPIA: { roles: ['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'] },
  // Seguimiento y sistema
  VER_REPORTES: { roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
  MARCAR_INSIGHT_REVISADO: { roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
  NOTIFICAR_DESDE_INSIGHT: { roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
  VER_HISTORIAL_GLOBAL: { roles: ['ADMINISTRADOR'] },
  GESTIONAR_CONFIGURACION: { roles: ['ADMINISTRADOR'] },
  RESTABLECER_DATOS_DEMOSTRACION: { roles: ['ADMINISTRADOR'] },
};

/** Reglas de insight desde las que cada rol puede notificar (§5.6). */
const REGLAS_NOTIFICABLES: Record<Rol, readonly TipoReglaInsight[]> = {
  ADMINISTRADOR: ['PRACTICANTE_INACTIVO', 'SUPERVISION_DEMORADA'],
  SUPERVISOR: ['PRACTICANTE_INACTIVO'],
  PRACTICANTE: [],
};

/**
 * Acciones que cambian tareas: la tabla «Tareas y Pull Requests» de §4 sin `VER_TAREA`,
 * incluidas las de Pull Request. En un proyecto FINALIZADO se deniegan a los tres roles (§6.8).
 * El tipo se deriva de la lista, así que este arreglo es la única fuente.
 */
const ACCIONES_QUE_CAMBIAN_TAREA = [
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
] as const satisfies readonly AccionPermiso[];

type AccionQueCambiaTarea = (typeof ACCIONES_QUE_CAMBIAN_TAREA)[number];

/**
 * Miembros de `SolicitudPermiso` que cambian tareas. `finalizadoBloquea` lee
 * `contexto.proyecto` sobre este `Extract`: si alguna de las 14 no trae `proyecto` en su
 * contexto, el proyecto no compila.
 */
type SolicitudQueCambiaTarea = Extract<SolicitudPermiso, { accion: AccionQueCambiaTarea }>;

const CAMBIA_TAREA: ReadonlySet<AccionPermiso> = new Set<AccionPermiso>(ACCIONES_QUE_CAMBIAN_TAREA);

/** Asignación vigente del practicante **en ese proyecto** (`fecha_baja === null`). */
function tieneAsignacionVigente(
  asignaciones: readonly Asignacion[],
  idPracticante: Id,
  idProyecto: Id,
): boolean {
  return asignaciones.some(
    (asignacion) =>
      asignacion.id_proyecto === idProyecto &&
      asignacion.id_practicante === idPracticante &&
      asignacion.fecha_baja === null,
  );
}

/** La tarea está asignada a quien actúa. */
function esResponsable(tarea: Tarea, usuario: Usuario): boolean {
  return tarea.id_practicante === usuario.id;
}

/** El proyecto tiene a quien actúa como supervisor. */
function proyectoEsDelSupervisor(proyecto: Proyecto, usuario: Usuario): boolean {
  return proyecto.id_supervisor === usuario.id;
}

/**
 * Alcance de un insight para el Supervisor: algún proyecto de `proyectos` (los del usuario que
 * actúa) es suyo y está entre los `ids_proyecto` del insight. Con `ids_proyecto` vacío nunca hay
 * alcance.
 */
function insightEnAlcance(
  insight: Pick<Insight, 'ids_proyecto'>,
  proyectos: readonly Pick<Proyecto, 'id' | 'id_supervisor'>[],
  usuario: Usuario,
): boolean {
  return proyectos.some(
    (proyecto) =>
      proyecto.id_supervisor === usuario.id && insight.ids_proyecto.includes(proyecto.id),
  );
}

/**
 * Marca de imposibilidad: solo se alcanza si una acción nueva quedó sin regla de alcance, y
 * entonces el proyecto no compila.
 */
function assertNunca(valor: never): never {
  throw new Error(`Acción de permiso sin regla de alcance: ${String(valor)}`);
}

/**
 * Paso 3: coherencia del contexto y alcance. Recibe la unión discriminada para que el `switch`
 * estreche `contexto` sin conversiones por caso.
 */
function comprobarAlcance(usuario: Usuario, solicitud: SolicitudPermiso): CodigoDenegacion | null {
  // Un contexto incoherente nunca concede acceso, ni al Administrador.
  if (
    'tarea' in solicitud.contexto &&
    'proyecto' in solicitud.contexto &&
    solicitud.contexto.tarea.id_proyecto !== solicitud.contexto.proyecto.id
  ) {
    return 'FUERA_DE_ALCANCE';
  }

  switch (solicitud.accion) {
    // Administrador sin alcance; Supervisor, solo en sus proyectos.
    case 'CREAR_TAREA':
    case 'EDITAR_DATOS_TAREA':
    case 'APROBAR_TAREA':
    case 'DEVOLVER_TAREA':
    case 'REABRIR_TAREA':
    case 'ELIMINAR_TAREA':
    case 'CAMBIAR_REQUIERE_SUPERVISION':
    case 'ACTIVAR_REQUIERE_PR':
    case 'CAMBIAR_RAMA_BASE':
    case 'DEFINIR_REUNION':
    case 'GESTIONAR_ENLACES':
    case 'VER_REPORTES':
      return usuario.rol === 'SUPERVISOR' &&
        !proyectoEsDelSupervisor(solicitud.contexto.proyecto, usuario)
        ? 'FUERA_DE_ALCANCE'
        : null;

    // Admin sin alcance; Supervisor, el suyo; Practicante, asignación vigente en ESTE proyecto.
    // La identidad de responsable llega en el paso 4.
    case 'TOMAR_TAREA':
    case 'ENVIAR_TAREA':
    case 'LIBERAR_TAREA':
    case 'DESACTIVAR_REQUIERE_PR':
    case 'CREAR_PULL_REQUEST':
    case 'CERRAR_PULL_REQUEST':
      if (usuario.rol === 'SUPERVISOR') {
        return proyectoEsDelSupervisor(solicitud.contexto.proyecto, usuario)
          ? null
          : 'FUERA_DE_ALCANCE';
      }
      return usuario.rol === 'PRACTICANTE' &&
        !tieneAsignacionVigente(
          solicitud.contexto.asignaciones,
          usuario.id,
          solicitud.contexto.proyecto.id,
        )
        ? 'FUERA_DE_ALCANCE'
        : null;

    // Solo Administrador, sin alcance de proyecto. La identidad de las acciones «propias» se
    // comprueba en el paso 4.
    case 'CREAR_PROYECTO':
    case 'EDITAR_DATOS_PROYECTO':
    case 'CAMBIAR_SUPERVISOR':
    case 'ASIGNAR_PRACTICANTE':
    case 'QUITAR_PRACTICANTE':
    case 'PAUSAR_PROYECTO':
    case 'REANUDAR_PROYECTO':
    case 'FINALIZAR_PROYECTO':
    case 'REACTIVAR_PROYECTO':
    case 'APROBAR_POSTULACION':
    case 'RECHAZAR_POSTULACION':
    case 'RECONSIDERAR_POSTULACION':
    case 'GESTIONAR_CRITERIOS_EVALUACION':
    case 'CREAR_SUPERVISOR':
    case 'EDITAR_NOMBRE_PROPIO':
    case 'EDITAR_CORREO_PROPIO':
    case 'EDITAR_CELULAR_PROPIO':
    case 'EDITAR_DISCORD_PROPIO':
    case 'EDITAR_GITHUB_PROPIO':
    case 'EDITAR_DISPONIBILIDAD_PROPIA':
    case 'CAMBIAR_CONTRASENA_PROPIA':
    case 'VER_HISTORIAL_GLOBAL':
    case 'GESTIONAR_CONFIGURACION':
    case 'RESTABLECER_DATOS_DEMOSTRACION':
      return null;

    case 'VER_PROYECTO':
    case 'VER_PRACTICANTES': {
      const { proyecto, asignaciones } = solicitud.contexto;
      if (usuario.rol === 'SUPERVISOR') {
        return proyectoEsDelSupervisor(proyecto, usuario) ? null : 'FUERA_DE_ALCANCE';
      }
      if (
        usuario.rol === 'PRACTICANTE' &&
        (proyecto.estado === 'FINALIZADO' ||
          !tieneAsignacionVigente(asignaciones, usuario.id, proyecto.id))
      ) {
        return 'FUERA_DE_ALCANCE';
      }
      return null;
    }

    case 'VER_RESUMEN_PROYECTO_ANTERIOR': {
      const { proyecto, asignaciones } = solicitud.contexto;
      if (usuario.rol === 'SUPERVISOR') {
        return proyectoEsDelSupervisor(proyecto, usuario) ? null : 'FUERA_DE_ALCANCE';
      }
      if (
        usuario.rol === 'PRACTICANTE' &&
        !asignaciones.some(
          (asignacion) =>
            asignacion.id_proyecto === proyecto.id && asignacion.id_practicante === usuario.id,
        )
      ) {
        return 'FUERA_DE_ALCANCE';
      }
      return null;
    }

    case 'VER_TAREA': {
      const { proyecto, tarea, asignaciones } = solicitud.contexto;
      if (usuario.rol === 'SUPERVISOR') {
        return proyectoEsDelSupervisor(proyecto, usuario) ? null : 'FUERA_DE_ALCANCE';
      }
      if (usuario.rol === 'PRACTICANTE') {
        const esSuya = esResponsable(tarea, usuario);
        const enProyectoVigente =
          proyecto.estado !== 'FINALIZADO' &&
          tieneAsignacionVigente(asignaciones, usuario.id, proyecto.id);
        if (!esSuya && !enProyectoVigente) return 'FUERA_DE_ALCANCE';
      }
      return null;
    }

    // Objetivo de persona: el rol del objetivo forma parte del alcance.
    case 'RESTABLECER_CONTRASENA':
      return solicitud.contexto.usuario_objetivo.rol === 'ADMINISTRADOR'
        ? 'FUERA_DE_ALCANCE'
        : null;

    case 'EDITAR_CREDENCIAL_SUPERVISOR':
    case 'DESACTIVAR_SUPERVISOR':
    case 'REACTIVAR_SUPERVISOR':
      return solicitud.contexto.usuario_objetivo.rol === 'SUPERVISOR' ? null : 'FUERA_DE_ALCANCE';

    case 'FINALIZAR_PRACTICA':
    case 'REACTIVAR_PRACTICA':
    case 'EDITAR_DATOS_PRACTICA':
      return solicitud.contexto.usuario_objetivo.rol === 'PRACTICANTE' ? null : 'FUERA_DE_ALCANCE';

    // Insights: la regla notificable se comprueba antes del alcance porque es de rol (paso 2).
    case 'MARCAR_INSIGHT_REVISADO':
      return usuario.rol === 'SUPERVISOR' &&
        !insightEnAlcance(solicitud.contexto.insight, solicitud.contexto.proyectos, usuario)
        ? 'FUERA_DE_ALCANCE'
        : null;

    case 'NOTIFICAR_DESDE_INSIGHT': {
      const { insight, proyectos } = solicitud.contexto;
      if (!REGLAS_NOTIFICABLES[usuario.rol].includes(insight.tipo_regla)) {
        return 'ROL_NO_PERMITIDO';
      }
      if (usuario.rol === 'SUPERVISOR' && !insightEnAlcance(insight, proyectos, usuario)) {
        return 'FUERA_DE_ALCANCE';
      }
      return null;
    }

    default:
      return assertNunca(solicitud);
  }
}

/** Paso 4: identidad. Solo se detiene en las acciones que exigen ser alguien en concreto. */
function comprobarIdentidad(
  usuario: Usuario,
  solicitud: SolicitudPermiso,
): CodigoDenegacion | null {
  switch (solicitud.accion) {
    case 'LIBERAR_TAREA':
    case 'ENVIAR_TAREA':
    case 'DESACTIVAR_REQUIERE_PR':
    case 'CREAR_PULL_REQUEST':
    case 'CERRAR_PULL_REQUEST':
      return usuario.rol === 'PRACTICANTE' && !esResponsable(solicitud.contexto.tarea, usuario)
        ? 'NO_ES_EL_RESPONSABLE'
        : null;

    case 'EDITAR_NOMBRE_PROPIO':
    case 'EDITAR_CORREO_PROPIO':
    case 'EDITAR_CELULAR_PROPIO':
    case 'EDITAR_DISCORD_PROPIO':
    case 'EDITAR_GITHUB_PROPIO':
    case 'EDITAR_DISPONIBILIDAD_PROPIA':
    case 'CAMBIAR_CONTRASENA_PROPIA':
      return solicitud.contexto.usuario_objetivo.id === usuario.id ? null : 'NO_ES_TU_CUENTA';

    default:
      return null;
  }
}

/** Paso 5: un proyecto FINALIZADO bloquea las 14 acciones que cambian tareas (§6.8). */
function finalizadoBloquea(solicitud: SolicitudPermiso): CodigoDenegacion | null {
  if (!esSolicitudQueCambiaTarea(solicitud)) return null;
  return solicitud.contexto.proyecto.estado === 'FINALIZADO' ? 'PROYECTO_FINALIZADO' : null;
}

function esSolicitudQueCambiaTarea(
  solicitud: SolicitudPermiso,
): solicitud is SolicitudQueCambiaTarea {
  return CAMBIA_TAREA.has(solicitud.accion);
}

/** Paso 6: texto que el servicio debe exigir a este rol. */
function textoDe(regla: ReglaAccion, rol: Rol): TextoExigido {
  const texto = regla.texto;
  if (texto === undefined || texto === null) return null;
  if (typeof texto === 'string') return texto;
  return texto.porRol[rol] ?? null;
}

/**
 * ¿Puede este usuario intentar esta acción? Decide solo quién (pasos 1 a 6 de la cabecera) y
 * no mira el estado de la tarea, la pausa del proyecto ni la existencia de un Pull Request.
 */
export function puede<A extends AccionPermiso>(
  usuario: Usuario,
  accion: A,
  contexto: ContextoPorAccion[A],
): ResultadoPermiso {
  if (usuario.estado !== 'ACTIVO') {
    return { permitido: false, codigo: 'USUARIO_INACTIVO' };
  }

  const regla = REGLAS_POR_ACCION[accion];
  if (!regla.roles.includes(usuario.rol)) {
    return { permitido: false, codigo: 'ROL_NO_PERMITIDO' };
  }

  // `accion` y `contexto` son parámetros independientes y TypeScript no los correlaciona; se
  // unen una sola vez en la unión discriminada del contrato. Es la única conversión del paso.
  const solicitud = { accion, contexto } as SolicitudPermiso;

  // El orden de la cabecera, detenido en la primera negativa.
  const denegacion =
    comprobarAlcance(usuario, solicitud) ??
    comprobarIdentidad(usuario, solicitud) ??
    finalizadoBloquea(solicitud);

  if (denegacion !== null) {
    return { permitido: false, codigo: denegacion };
  }

  return { permitido: true, exige_texto: textoDe(regla, usuario.rol) };
}

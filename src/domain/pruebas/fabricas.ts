/**
 * Fábricas de datos para las pruebas de `domain/`. **Solo las importan los tests**: no las usa
 * el código de la aplicación.
 *
 * No contienen ninguna expectativa de permiso: construyen un mundo coherente (un proyecto del
 * supervisor que actúa, un practicante con asignación vigente y responsable de la tarea, una
 * persona objetivo del rol correcto) y dejan que la tabla de la prueba decida qué se espera.
 * `variante` sirve para retirar el alcance sin cambiar nada más.
 */

import type { Id } from '../comunes';
import type { Rol } from '../enumeraciones';
import type { Insight } from '../insights';
import type { Asignacion, Proyecto } from '../proyectos';
import type { Tarea } from '../tareas';
import type { Usuario } from '../usuarios';
import type { AccionPermiso, ContextoPorAccion } from '../permisos';

/** IDs fijos y legibles: al fallar una prueba, el mensaje dice qué entidad era. */
export const IDS = {
  admin: 'u-admin',
  supervisor: 'u-supervisor',
  supervisorAjeno: 'u-supervisor-ajeno',
  practicante: 'u-practicante',
  practicanteAjeno: 'u-practicante-ajeno',
  proyecto: 'p-proyecto',
  proyectoAjeno: 'p-proyecto-ajeno',
  tarea: 't-tarea',
  tareaAjena: 't-tarea-ajena',
  asignacion: 'a-asignacion',
  asignacionAnterior: 'a-asignacion-anterior',
  insight: 'i-insight',
} as const;

const ID_POR_ROL: Record<Rol, Id> = {
  ADMINISTRADOR: IDS.admin,
  SUPERVISOR: IDS.supervisor,
  PRACTICANTE: IDS.practicante,
};

export function usuario(rol: Rol, cambios: Partial<Usuario> = {}): Usuario {
  return {
    id: ID_POR_ROL[rol],
    nombre: `Persona ${rol}`,
    correo: `${rol.toLowerCase()}@codaini.test`,
    celular: '999 999 999',
    contrasena: 'temporal-1234',
    rol,
    estado: 'ACTIVO',
    debe_cambiar_contrasena: false,
    fecha_alta: '2026-01-15T14:00:00.000Z',
    ...cambios,
  };
}

export function proyecto(cambios: Partial<Proyecto> = {}): Proyecto {
  return {
    id: IDS.proyecto,
    nombre: 'Proyecto de prueba',
    codigo: 'PRB',
    descripcion: 'Proyecto de las pruebas de permisos.',
    fecha_inicio: '2026-02-01',
    fecha_fin_prevista: '2026-06-30',
    fecha_fin_real: null,
    estado: 'ACTIVO',
    dia_reunion: 'LUNES',
    hora_reunion: '10:00',
    repositorio_url: 'https://github.com/codaini/proyecto-prueba',
    rama_base: 'main',
    id_supervisor: IDS.supervisor,
    ultimo_numero_tarea: 1,
    ...cambios,
  };
}

export function tarea(cambios: Partial<Tarea> = {}): Tarea {
  return {
    id: IDS.tarea,
    numero: 1,
    titulo: 'Tarea de prueba',
    descripcion: 'Tarea de las pruebas de permisos.',
    fecha_limite: '2026-05-15',
    id_proyecto: IDS.proyecto,
    id_practicante: IDS.practicante,
    estado: 'EN_PROGRESO',
    requiere_supervision: false,
    requiere_pr: true,
    estado_pr: null,
    rama_origen: null,
    rama_base: null,
    url_pull_request: null,
    fecha_termino: null,
    ...cambios,
  };
}

export function asignacion(cambios: Partial<Asignacion> = {}): Asignacion {
  return {
    id: IDS.asignacion,
    id_practicante: IDS.practicante,
    id_proyecto: IDS.proyecto,
    fecha_alta: '2026-02-01',
    fecha_baja: null,
    ...cambios,
  };
}

export function insight(
  cambios: Partial<Pick<Insight, 'ids_proyecto' | 'tipo_regla'>> = {},
): Pick<Insight, 'ids_proyecto' | 'tipo_regla'> {
  return {
    ids_proyecto: [IDS.proyecto],
    tipo_regla: 'PRACTICANTE_INACTIVO',
    ...cambios,
  };
}

/** Cómo se retira el alcance en los barridos de las pruebas. */
export type VarianteDeAlcance =
  /** Todo coherente: el rol tiene el proyecto, la asignación o la identidad que necesita. */
  | 'NORMAL'
  /** El proyecto es de otro supervisor. */
  | 'AJENO'
  /** El practicante no tiene ninguna asignación. */
  | 'SIN_ASIGNACION'
  /** Su asignación a este proyecto tiene `fecha_baja`. */
  | 'CON_BAJA'
  /** Tiene asignación vigente, pero en otro proyecto. */
  | 'OTRO_PROYECTO'
  /** El insight no tiene proyectos o el usuario no tiene proyectos. */
  | 'SIN_PROYECTOS';

interface Mundo {
  usuario: Usuario;
  proyecto: Proyecto;
  tarea: Tarea;
  asignaciones: Asignacion[];
  insight: Pick<Insight, 'ids_proyecto' | 'tipo_regla'>;
  proyectosDelUsuario: Pick<Proyecto, 'id' | 'id_supervisor'>[];
}

function asignacionesDe(
  usuarioQueActua: Usuario,
  variante: VarianteDeAlcance,
  proyectoBase: Proyecto,
): Asignacion[] {
  if (usuarioQueActua.rol !== 'PRACTICANTE') return [];

  const base = asignacion({
    id_practicante: usuarioQueActua.id,
    id_proyecto: proyectoBase.id,
  });

  switch (variante) {
    case 'SIN_ASIGNACION':
      return [];
    case 'CON_BAJA':
      return [{ ...base, id: IDS.asignacionAnterior, fecha_baja: '2026-04-30' }];
    case 'OTRO_PROYECTO':
      return [{ ...base, id_proyecto: IDS.proyectoAjeno }];
    default:
      return [base];
  }
}

function mundo(
  usuarioQueActua: Usuario,
  variante: VarianteDeAlcance,
  cambiosDelProyecto: Partial<Proyecto>,
): Mundo {
  const esSupervisor = usuarioQueActua.rol === 'SUPERVISOR';
  const proyectoBase = proyecto({
    id_supervisor: esSupervisor
      ? variante === 'AJENO'
        ? IDS.supervisorAjeno
        : usuarioQueActua.id
      : IDS.supervisor,
    ...cambiosDelProyecto,
  });

  const tareaBase = tarea({
    id_practicante: usuarioQueActua.rol === 'PRACTICANTE' ? usuarioQueActua.id : IDS.practicante,
  });

  const proyectosDelUsuario =
    esSupervisor && variante !== 'SIN_PROYECTOS'
      ? [
          {
            id: variante === 'AJENO' ? IDS.proyectoAjeno : proyectoBase.id,
            id_supervisor: usuarioQueActua.id,
          },
        ]
      : [];

  return {
    usuario: usuarioQueActua,
    proyecto: proyectoBase,
    tarea: tareaBase,
    asignaciones: asignacionesDe(usuarioQueActua, variante, proyectoBase),
    insight: insight(variante === 'SIN_PROYECTOS' ? { ids_proyecto: [] } : {}),
    proyectosDelUsuario,
  };
}

/**
 * Contexto tipado de cada acción. Al ser un tipo mapeado sobre `AccionPermiso`, si falta una
 * acción el proyecto no compila; y cada entrada está obligada a devolver la forma exacta de su
 * `ContextoPorAccion`, así que el escenario no puede "inventar" campos.
 */
type ConstructorContexto = {
  [A in AccionPermiso]: (mundo: Mundo) => ContextoPorAccion[A];
};

const CONTEXTOS: ConstructorContexto = {
  // Tareas y Pull Requests
  CREAR_TAREA: ({ proyecto: proyectoDelContexto }) => ({ proyecto: proyectoDelContexto }),
  EDITAR_DATOS_TAREA: ({ proyecto: proyectoDelContexto, tarea: tareaDelContexto }) => ({
    proyecto: proyectoDelContexto,
    tarea: tareaDelContexto,
  }),
  TOMAR_TAREA: ({ proyecto: proyectoDelContexto, tarea: tareaDelContexto, asignaciones }) => ({
    proyecto: proyectoDelContexto,
    tarea: tareaDelContexto,
    asignaciones,
  }),
  LIBERAR_TAREA: ({ proyecto: proyectoDelContexto, tarea: tareaDelContexto, asignaciones }) => ({
    proyecto: proyectoDelContexto,
    tarea: tareaDelContexto,
    asignaciones,
  }),
  ENVIAR_TAREA: ({ proyecto: proyectoDelContexto, tarea: tareaDelContexto, asignaciones }) => ({
    proyecto: proyectoDelContexto,
    tarea: tareaDelContexto,
    asignaciones,
  }),
  APROBAR_TAREA: ({ proyecto: proyectoDelContexto, tarea: tareaDelContexto }) => ({
    proyecto: proyectoDelContexto,
    tarea: tareaDelContexto,
  }),
  DEVOLVER_TAREA: ({ proyecto: proyectoDelContexto, tarea: tareaDelContexto }) => ({
    proyecto: proyectoDelContexto,
    tarea: tareaDelContexto,
  }),
  REABRIR_TAREA: ({ proyecto: proyectoDelContexto, tarea: tareaDelContexto }) => ({
    proyecto: proyectoDelContexto,
    tarea: tareaDelContexto,
  }),
  ELIMINAR_TAREA: ({ proyecto: proyectoDelContexto, tarea: tareaDelContexto }) => ({
    proyecto: proyectoDelContexto,
    tarea: tareaDelContexto,
  }),
  CAMBIAR_REQUIERE_SUPERVISION: ({ proyecto: proyectoDelContexto, tarea: tareaDelContexto }) => ({
    proyecto: proyectoDelContexto,
    tarea: tareaDelContexto,
  }),
  ACTIVAR_REQUIERE_PR: ({ proyecto: proyectoDelContexto, tarea: tareaDelContexto }) => ({
    proyecto: proyectoDelContexto,
    tarea: tareaDelContexto,
  }),
  DESACTIVAR_REQUIERE_PR: ({
    proyecto: proyectoDelContexto,
    tarea: tareaDelContexto,
    asignaciones,
  }) => ({ proyecto: proyectoDelContexto, tarea: tareaDelContexto, asignaciones }),
  CREAR_PULL_REQUEST: ({
    proyecto: proyectoDelContexto,
    tarea: tareaDelContexto,
    asignaciones,
  }) => ({ proyecto: proyectoDelContexto, tarea: tareaDelContexto, asignaciones }),
  CERRAR_PULL_REQUEST: ({
    proyecto: proyectoDelContexto,
    tarea: tareaDelContexto,
    asignaciones,
  }) => ({ proyecto: proyectoDelContexto, tarea: tareaDelContexto, asignaciones }),
  VER_TAREA: ({ proyecto: proyectoDelContexto, tarea: tareaDelContexto, asignaciones }) => ({
    proyecto: proyectoDelContexto,
    tarea: tareaDelContexto,
    asignaciones,
  }),
  // Proyectos y equipo
  CREAR_PROYECTO: () => ({}),
  EDITAR_DATOS_PROYECTO: ({ proyecto: proyectoDelContexto }) => ({
    proyecto: proyectoDelContexto,
  }),
  CAMBIAR_RAMA_BASE: ({ proyecto: proyectoDelContexto }) => ({ proyecto: proyectoDelContexto }),
  DEFINIR_REUNION: ({ proyecto: proyectoDelContexto }) => ({ proyecto: proyectoDelContexto }),
  GESTIONAR_ENLACES: ({ proyecto: proyectoDelContexto }) => ({ proyecto: proyectoDelContexto }),
  CAMBIAR_SUPERVISOR: ({ proyecto: proyectoDelContexto }) => ({ proyecto: proyectoDelContexto }),
  ASIGNAR_PRACTICANTE: ({ proyecto: proyectoDelContexto }) => ({
    proyecto: proyectoDelContexto,
  }),
  QUITAR_PRACTICANTE: ({ proyecto: proyectoDelContexto }) => ({ proyecto: proyectoDelContexto }),
  PAUSAR_PROYECTO: ({ proyecto: proyectoDelContexto }) => ({ proyecto: proyectoDelContexto }),
  REANUDAR_PROYECTO: ({ proyecto: proyectoDelContexto }) => ({ proyecto: proyectoDelContexto }),
  FINALIZAR_PROYECTO: ({ proyecto: proyectoDelContexto }) => ({ proyecto: proyectoDelContexto }),
  REACTIVAR_PROYECTO: ({ proyecto: proyectoDelContexto }) => ({ proyecto: proyectoDelContexto }),
  VER_PROYECTO: ({ proyecto: proyectoDelContexto, asignaciones }) => ({
    proyecto: proyectoDelContexto,
    asignaciones,
  }),
  VER_RESUMEN_PROYECTO_ANTERIOR: ({ proyecto: proyectoDelContexto, asignaciones }) => ({
    proyecto: proyectoDelContexto,
    asignaciones,
  }),
  VER_PRACTICANTES: ({ proyecto: proyectoDelContexto, asignaciones }) => ({
    proyecto: proyectoDelContexto,
    asignaciones,
  }),
  // Personas y cuentas
  APROBAR_POSTULACION: () => ({}),
  RECHAZAR_POSTULACION: () => ({}),
  RECONSIDERAR_POSTULACION: () => ({}),
  GESTIONAR_CRITERIOS_EVALUACION: () => ({}),
  CREAR_SUPERVISOR: () => ({}),
  RESTABLECER_CONTRASENA: () => ({ usuario_objetivo: usuario('PRACTICANTE') }),
  FINALIZAR_PRACTICA: () => ({ usuario_objetivo: usuario('PRACTICANTE') }),
  REACTIVAR_PRACTICA: () => ({ usuario_objetivo: usuario('PRACTICANTE') }),
  EDITAR_DATOS_PRACTICA: () => ({ usuario_objetivo: usuario('PRACTICANTE') }),
  EDITAR_NOMBRE_PROPIO: ({ usuario: usuarioQueActua }) => ({
    usuario_objetivo: usuarioQueActua,
  }),
  EDITAR_CORREO_PROPIO: ({ usuario: usuarioQueActua }) => ({
    usuario_objetivo: usuarioQueActua,
  }),
  EDITAR_CELULAR_PROPIO: ({ usuario: usuarioQueActua }) => ({
    usuario_objetivo: usuarioQueActua,
  }),
  EDITAR_DISCORD_PROPIO: ({ usuario: usuarioQueActua }) => ({
    usuario_objetivo: usuarioQueActua,
  }),
  EDITAR_GITHUB_PROPIO: ({ usuario: usuarioQueActua }) => ({
    usuario_objetivo: usuarioQueActua,
  }),
  EDITAR_DISPONIBILIDAD_PROPIA: ({ usuario: usuarioQueActua }) => ({
    usuario_objetivo: usuarioQueActua,
  }),
  EDITAR_CREDENCIAL_SUPERVISOR: () => ({ usuario_objetivo: usuario('SUPERVISOR') }),
  DESACTIVAR_SUPERVISOR: () => ({ usuario_objetivo: usuario('SUPERVISOR') }),
  REACTIVAR_SUPERVISOR: () => ({ usuario_objetivo: usuario('SUPERVISOR') }),
  CAMBIAR_CONTRASENA_PROPIA: ({ usuario: usuarioQueActua }) => ({
    usuario_objetivo: usuarioQueActua,
  }),
  // Seguimiento y sistema
  VER_REPORTES: ({ proyecto: proyectoDelContexto }) => ({ proyecto: proyectoDelContexto }),
  MARCAR_INSIGHT_REVISADO: ({ insight: insightDelContexto, proyectosDelUsuario }) => ({
    insight: insightDelContexto,
    proyectos: proyectosDelUsuario,
  }),
  NOTIFICAR_DESDE_INSIGHT: ({ insight: insightDelContexto, proyectosDelUsuario }) => ({
    insight: insightDelContexto,
    proyectos: proyectosDelUsuario,
  }),
  VER_HISTORIAL_GLOBAL: () => ({}),
  GESTIONAR_CONFIGURACION: () => ({}),
  RESTABLECER_DATOS_DEMOSTRACION: () => ({}),
};

/**
 * Contexto coherente para `accion` cuando actúa `usuarioQueActua`. `NORMAL` es el escenario en
 * el que el rol tiene todo lo que necesita; las demás variantes retiran un solo elemento.
 * `cambiosDelProyecto` permite cambiar el estado del proyecto (por ejemplo a `FINALIZADO`) sin
 * tocar el resto del escenario.
 */
export function contextoPara<A extends AccionPermiso>(
  accion: A,
  usuarioQueActua: Usuario,
  variante: VarianteDeAlcance = 'NORMAL',
  cambiosDelProyecto: Partial<Proyecto> = {},
): ContextoPorAccion[A] {
  return CONTEXTOS[accion](mundo(usuarioQueActua, variante, cambiosDelProyecto));
}

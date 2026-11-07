/**
 * Enumeraciones y listas constantes del dominio.
 *
 * Cada enumeración es un arreglo `as const` y su tipo se deriva de él.
 * No se usan `enum` de TypeScript porque `tsconfig.app.json` activa
 * `erasableSyntaxOnly` y `verbatimModuleSyntax`.
 */

export const ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'] as const;
export type Rol = (typeof ROLES)[number];

export const ESTADOS_USUARIO = ['ACTIVO', 'INACTIVO'] as const;
export type EstadoUsuario = (typeof ESTADOS_USUARIO)[number];

/**
 * Estado de presentación del practicante. No se guarda: se deriva de
 * `Usuario.estado` (`ACTIVO` -> `ACTIVO`, `INACTIVO` -> `FINALIZADO`).
 */
export const ESTADOS_PRACTICANTE = ['ACTIVO', 'FINALIZADO'] as const;
export type EstadoPracticante = (typeof ESTADOS_PRACTICANTE)[number];

export const ESTADOS_TAREA = [
  'DISPONIBLE',
  'EN_PROGRESO',
  'ESPERANDO_SUPERVISION',
  'TERMINADA',
] as const;
export type EstadoTarea = (typeof ESTADOS_TAREA)[number];

export const ESTADOS_PR = [
  'PENDIENTE',
  'CREADO',
  'CON_CONFLICTOS',
  'FUSIONADO',
  'CERRADO',
] as const;
export type EstadoPR = (typeof ESTADOS_PR)[number];

export const ESTADOS_POSTULACION = ['PENDIENTE', 'APROBADA', 'RECHAZADA'] as const;
export type EstadoPostulacion = (typeof ESTADOS_POSTULACION)[number];

export const ESTADOS_PROYECTO = ['ACTIVO', 'EN_PAUSA', 'FINALIZADO'] as const;
export type EstadoProyecto = (typeof ESTADOS_PROYECTO)[number];

export const TIPOS_CRITERIO = [
  'TECNOLOGIA',
  'ACADEMICO',
  'DISPONIBILIDAD',
  'PALABRA_CLAVE',
] as const;
export type TipoCriterio = (typeof TIPOS_CRITERIO)[number];

export const BLOQUES_CRITERIO = ['AREA', 'ESPECIALIDAD'] as const;
export type BloqueCriterio = (typeof BLOQUES_CRITERIO)[number];

export const DIAS_SEMANA = [
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
  'DOMINGO',
] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

export const TIPOS_ELEMENTO = [
  'USUARIO',
  'PROYECTO',
  'TAREA',
  'POSTULANTE',
  'AREA_TECNICA',
  'ESPECIALIDAD',
  'CRITERIO_EVALUACION',
  'PARAMETRO_CONFIGURACION',
] as const;
export type TipoElemento = (typeof TIPOS_ELEMENTO)[number];

export const SEVERIDADES = ['CRITICO', 'ATENCION', 'INFORMATIVO'] as const;
export type Severidad = (typeof SEVERIDADES)[number];

export const TIPOS_REGLA_INSIGHT = [
  'PRACTICANTE_INACTIVO',
  'CARGA_DESBALANCEADA',
  'POSIBLE_ATRASO_PROYECTO',
  'PROYECTO_SIN_ACTIVIDAD',
  'SUPERVISION_DEMORADA',
  'POSTULACIONES_SIN_DECIDIR',
  'FIN_PRACTICA',
] as const;
export type TipoReglaInsight = (typeof TIPOS_REGLA_INSIGHT)[number];

/**
 * Acciones del historial agrupadas por categoría. Es la única fuente de
 * `TipoAccionHistorial` y `CategoriaEvento`; la categoría no se guarda en
 * `EventoHistorial`, se deriva de la acción.
 */
export const ACCIONES_POR_CATEGORIA = {
  POSTULACIONES: [
    'POSTULACION_RECIBIDA',
    'POSTULACION_EVALUADA',
    'POSTULACION_APROBADA',
    'POSTULACION_RECHAZADA',
    'POSTULACION_RECONSIDERADA',
  ],
  EVALUACION: [
    'AREA_TECNICA_CREADA',
    'AREA_TECNICA_EDITADA',
    'AREA_TECNICA_ACTIVADA',
    'AREA_TECNICA_DESACTIVADA',
    'ESPECIALIDAD_CREADA',
    'ESPECIALIDAD_EDITADA',
    'ESPECIALIDAD_ACTIVADA',
    'ESPECIALIDAD_DESACTIVADA',
    'CRITERIO_CREADO',
    'CRITERIO_EDITADO',
    'CRITERIO_ACTIVADO',
    'CRITERIO_DESACTIVADO',
    'PARAMETRO_CONFIGURACION_CAMBIADO',
  ],
  PRACTICANTES: [
    'PRACTICANTE_CREADO',
    'PRACTICANTE_DATOS_PRACTICA_EDITADOS',
    'PRACTICANTE_CONTRASENA_RESTABLECIDA',
    'PRACTICANTE_ASIGNADO_A_PROYECTO',
    'PRACTICANTE_QUITADO_DE_PROYECTO',
    'PRACTICANTE_FINALIZADO',
    'PRACTICANTE_REACTIVADO',
  ],
  SUPERVISORES: [
    'SUPERVISOR_CREADO',
    'SUPERVISOR_EDITADO',
    'SUPERVISOR_CONTRASENA_RESTABLECIDA',
    'SUPERVISOR_PROYECTOS_REASIGNADOS',
    'SUPERVISOR_DESACTIVADO',
    'SUPERVISOR_REACTIVADO',
  ],
  PROYECTOS: [
    'PROYECTO_CREADO',
    'PROYECTO_EDITADO',
    'PROYECTO_SUPERVISOR_CAMBIADO',
    'PROYECTO_REUNION_CAMBIADA',
    'PROYECTO_REPOSITORIO_CAMBIADO',
    'PROYECTO_RAMA_BASE_CAMBIADA',
    'PROYECTO_ENLACE_AGREGADO',
    'PROYECTO_ENLACE_QUITADO',
    'PROYECTO_ENLACE_EDITADO',
    'PROYECTO_PAUSADO',
    'PROYECTO_REANUDADO',
    'PROYECTO_FINALIZADO',
    'PROYECTO_REACTIVADO',
  ],
  TAREAS: [
    'TAREA_CREADA',
    'TAREA_EDITADA',
    'TAREA_OPCIONES_CAMBIADAS',
    'TAREA_TOMADA',
    'TAREA_LIBERADA',
    'TAREA_ENVIADA_A_SUPERVISION',
    'TAREA_TERMINADA',
    'TAREA_APROBADA',
    'TAREA_DEVUELTA',
    'TAREA_REABIERTA',
    'TAREA_ELIMINADA',
  ],
  PULL_REQUEST: [
    'PULL_REQUEST_CREADO',
    'PULL_REQUEST_ESTADO_ACTUALIZADO',
    'PULL_REQUEST_CERRADO_DESDE_EL_SISTEMA',
    'PULL_REQUEST_NO_REQUERIDO',
  ],
  CUENTA_PROPIA: ['CUENTA_NOMBRE_CAMBIADO', 'CUENTA_CORREO_CAMBIADO', 'CUENTA_CONTRASENA_CAMBIADA'],
} as const;

export type CategoriaEvento = keyof typeof ACCIONES_POR_CATEGORIA;
export type TipoAccionHistorial = (typeof ACCIONES_POR_CATEGORIA)[CategoriaEvento][number];

export const TIPOS_NOTIFICACION = [
  'TAREA_ENVIADA_A_SUPERVISION',
  'PULL_REQUEST_NO_REQUERIDO_POR_PRACTICANTE',
  'TAREA_APROBADA',
  'TAREA_DEVUELTA',
  'TAREA_REABIERTA',
  'TAREA_LIBERADA',
  'TAREA_EDITADA_EN_PROGRESO',
  'PULL_REQUEST_CON_CONFLICTOS',
  'PULL_REQUEST_CERRADO_POR_OTRA_PERSONA',
  'ASIGNADO_A_PROYECTO',
  'QUITADO_DE_PROYECTO',
  'REUNION_SEMANAL_CAMBIADA',
  'PROYECTO_PAUSADO',
  'PROYECTO_REANUDADO',
  'PROYECTO_FINALIZADO',
  'PRACTICA_PROXIMA_A_FINALIZAR',
  'PRACTICA_FINALIZADA_CON_TAREAS_LIBERADAS',
  'NOTIFICACION_DESDE_INSIGHT',
] as const;
export type TipoNotificacion = (typeof TIPOS_NOTIFICACION)[number];

/**
 * Barril de `domain/`: tipos, enumeraciones y constantes compartidas.
 */

export type { Fecha, FechaHora, Hora, Id, ReferenciaElemento } from './comunes';

export {
  ACCIONES_POR_CATEGORIA,
  BLOQUES_CRITERIO,
  DIAS_SEMANA,
  ESTADOS_POSTULACION,
  ESTADOS_PR,
  ESTADOS_PRACTICANTE,
  ESTADOS_PROYECTO,
  ESTADOS_TAREA,
  ESTADOS_USUARIO,
  ROLES,
  SEVERIDADES,
  TIPOS_CRITERIO,
  TIPOS_ELEMENTO,
  TIPOS_NOTIFICACION,
  TIPOS_REGLA_INSIGHT,
} from './enumeraciones';

export type {
  BloqueCriterio,
  CategoriaEvento,
  DiaSemana,
  EstadoPostulacion,
  EstadoPracticante,
  EstadoProyecto,
  EstadoPR,
  EstadoTarea,
  EstadoUsuario,
  Rol,
  Severidad,
  TipoAccionHistorial,
  TipoCriterio,
  TipoElemento,
  TipoNotificacion,
  TipoReglaInsight,
} from './enumeraciones';

export type { Practicante, Supervisor, Usuario } from './usuarios';
export type { Asignacion, EnlaceProyecto, Proyecto } from './proyectos';
export type { Tarea } from './tareas';
export type {
  ArchivoCV,
  AreaTecnica,
  CriterioEvaluacion,
  Especialidad,
  PostulacionEvaluacion,
  PostulacionEvaluacionDetalle,
  Postulante,
} from './postulaciones';
export type { AutorEvento, CambioRegistrado, ElementoAfectado, EventoHistorial } from './historial';
export type { Notificacion } from './notificaciones';
export type { Insight, InsightRevision } from './insights';
export { CATALOGO_PARAMETROS, SECCIONES_CONFIGURACION } from './configuracion';
export type {
  ClaveParametro,
  ParametroCatalogo,
  ParametroConfiguracion,
  SeccionConfiguracion,
  ValorParametro,
} from './configuracion';
export {
  ACCIONES_PERMISO,
  AMBITO_POR_ACCION,
  AMBITOS_PERMISO,
  CODIGOS_DENEGACION,
  puede,
} from './permisos';
export type {
  AccionPermiso,
  AmbitoPermiso,
  CodigoDenegacion,
  ContextoPorAccion,
  ResultadoPermiso,
  SolicitudPermiso,
  TextoExigido,
} from './permisos';

export {
  ACCIONES_TRANSICION,
  CODIGOS_TRANSICION,
  TEXTO_OBLIGATORIO,
  TRANSICIONES_TAREA,
  devolucionVigente,
  puedeTransicionar,
  transicionesDisponibles,
  validarTexto,
} from './transiciones';
export type {
  AccionTransicion,
  CodigoTransicion,
  CodigoTransicionPropio,
  ContextoTransicion,
  DefinicionTransicion,
  ResultadoTransicion,
  TextoTransicion,
  TransicionDisponible,
} from './transiciones';

export {
  CODIGOS_EDICION,
  puedeCambiarRequierePR,
  puedeCambiarRequiereSupervision,
  puedeEditarDatosTarea,
  puedeEliminarTarea,
  tuvoPullRequest,
} from './edicionTarea';
export type { CodigoEdicion, CodigoEdicionPropio, ResultadoEdicion } from './edicionTarea';

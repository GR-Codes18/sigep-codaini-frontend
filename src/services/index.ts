/**
 * Barril de `services/`: utilidades comunes a todos los servicios (Fase 2, paso 4) y servicios por
 * módulo (desde el paso 5).
 */

export { obtenerActor } from './actor';
export { simularDemora } from './demora';
export { DEMORA_PREDETERMINADA_MS, ENTORNO, crearEntorno } from './entorno';
export type { AlmacenServicio, Entorno } from './entorno';
export {
  GITHUB_SIMULADO,
  consultaSimulada,
  crearPullRequestSimulado,
  ramaConConflictos,
  ramaEliminada,
  ramasSimuladas,
} from './github';
export type {
  PRConocido,
  PuertoGitHub,
  RepositorioPR,
  RespuestaCrearPR,
  SolicitudPR,
  TareaConsultable,
} from './github';
export { generarContrasenaTemporal } from './contrasena';
export { EVALUADOR_SIMULADO } from './evaluador';
export type { PuertoEvaluador } from './evaluador';
export { etiquetaPostulante, etiquetaProyecto, etiquetaTarea, etiquetaUsuario } from './etiquetas';
export {
  AUTOR_SISTEMA,
  agregarEventos,
  autorDe,
  cambio,
  crearEvento,
  diferencias,
} from './historial';
export type { EntradaEvento } from './historial';
export { crearMarca } from './marca';
export type { Marca } from './marca';
export { agregarNotificaciones, crearNotificaciones } from './notificaciones';
export type { EntradaNotificacion } from './notificaciones';
export {
  MENSAJES,
  MENSAJE_GENERICO,
  denegar,
  exito,
  fallo,
  mensajeDe,
  validarEntrada,
} from './resultado';
export type { CamposConError, ErrorServicio, Fallo, Resultado } from './resultado';
export { conEfectos, ejecutarConsulta, ejecutarServicio } from './transaccional';
export type { ContextoOperacion, SalidaOperacion } from './transaccional';

// Servicios por módulo
export {
  aprobarPostulacion,
  evaluarPostulacion,
  rechazarPostulacion,
  reconsiderarPostulacion,
} from './postulaciones';
export type {
  EntradaAprobarPostulacion,
  EntradaEvaluarPostulacion,
  EntradaReconsiderarPostulacion,
  EntradaRechazarPostulacion,
  EvaluacionCreada,
  PostulacionAprobada,
} from './postulaciones';
export {
  NOTA_PR_VINCULADO,
  cerrarPullRequest,
  crearPullRequest,
  listarRamasParaPullRequest,
} from './pullRequests';
export type {
  EntradaCerrarPR,
  EntradaCrearPullRequest,
  EntradaListarRamas,
  PullRequestCreado,
} from './pullRequests';
export {
  aprobarTarea,
  cambiarRequierePR,
  cambiarRequiereSupervision,
  crearTarea,
  devolverTarea,
  editarTarea,
  eliminarTarea,
  enviarTareaASupervision,
  liberarTarea,
  marcarTareaTerminada,
  reabrirTarea,
  tomarTarea,
} from './tareas';
export type {
  EntradaConNota,
  EntradaCrearTarea,
  EntradaEditarTarea,
  EntradaEliminarTarea,
  EntradaLiberar,
  EntradaRequierePR,
  EntradaRequiereSupervision,
  EntradaTransicion,
} from './tareas';

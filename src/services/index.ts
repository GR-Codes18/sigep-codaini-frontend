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
export {
  etiquetaParametro,
  etiquetaPostulante,
  etiquetaProyecto,
  etiquetaTarea,
  etiquetaUsuario,
} from './etiquetas';
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

export { denegarCicloVida } from './cicloVida';
export {
  LARGO_MINIMO_CONTRASENA,
  accesoRapido,
  aSesionUsuario,
  cambiarMiContrasena,
  correoEnUso,
  editarMiPerfil,
  esquemaCelular,
  esquemaCorreo,
  iniciarSesion,
  normalizarCorreo,
  restablecerContrasena,
} from './cuentas';
export type {
  ContrasenaRestablecida,
  EntradaAccesoRapido,
  EntradaCambiarMiContrasena,
  EntradaEditarMiPerfil,
  EntradaIniciarSesion,
  EntradaRestablecerContrasena,
  SesionUsuario,
} from './cuentas';

// Servicios por módulo
export {
  guardarConfiguracionSeccion,
  restablecerDatosDemostracion,
  restaurarSeccionConfiguracion,
} from './configuracion';
export type {
  DatosRestablecidos,
  EntradaGuardarConfiguracionSeccion,
  EntradaRestablecerDatosDemostracion,
  EntradaRestaurarConfiguracionSeccion,
  SeccionGuardada,
} from './configuracion';
export {
  calcularInsightsVigentes,
  marcarInsightRevisado,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  notificarDesdeInsight,
  umbralesDe,
} from './seguimiento';
export type {
  EntradaMarcarInsightRevisado,
  EntradaMarcarNotificacionLeida,
  EntradaMarcarTodasLeidas,
  EntradaNotificarDesdeInsight,
  InsightNotificado,
  TodasMarcadasLeidas,
} from './seguimiento';
export {
  agregarEnlace,
  cambiarRamaBase,
  cambiarSupervisor,
  crearProyecto,
  finalizarProyecto,
  pausarProyecto,
  reactivarProyecto,
  reanudarProyecto,
  reasignarProyectosDeSupervisor,
  definirReunion,
  editarDatosProyecto,
  editarEnlace,
  equipoDelProyecto,
  esquemaDescripcionProyecto,
  esquemaDiaReunion,
  esquemaFechaProyecto,
  esquemaHoraReunion,
  esquemaNombreEnlace,
  esquemaNombreProyecto,
  esquemaRamaBase,
  esquemaRepositorio,
  esquemaUrlEnlace,
  quitarEnlace,
  textoReunion,
} from './proyectos';
export type {
  EntradaAgregarEnlace,
  EntradaCambiarEstadoProyecto,
  EntradaCambiarRamaBase,
  EntradaCambiarSupervisor,
  EntradaReasignarProyectosDeSupervisor,
  ProyectoFinalizado,
  EntradaCrearProyecto,
  EntradaDefinirReunion,
  EntradaEditarDatosProyecto,
  EntradaEditarEnlace,
  EntradaQuitarEnlace,
} from './proyectos';
export {
  crearSupervisor,
  desactivarSupervisor,
  editarSupervisor,
  reactivarSupervisor,
} from './supervisores';
export type {
  EntradaCambiarEstadoSupervisor,
  EntradaCrearSupervisor,
  EntradaEditarSupervisor,
  SupervisorCreado,
} from './supervisores';
export {
  asignarPracticantes,
  editarDatosPractica,
  emitirAvisosFinDePractica,
  finalizarPractica,
  quitarPracticante,
  reactivarPractica,
} from './practicantes';
export type {
  AvisosFinDePractica,
  EntradaAsignarPracticantes,
  EntradaEditarDatosPractica,
  EntradaFinalizarPractica,
  EntradaQuitarPracticante,
  EntradaReactivarPractica,
  PracticaFinalizada,
} from './practicantes';
export {
  cambiarActivoAreaTecnica,
  cambiarActivoEspecialidad,
  crearAreaTecnica,
  crearEspecialidad,
  editarAreaTecnica,
  editarEspecialidad,
  guardarCriteriosDeBloque,
} from './catalogoEvaluacion';
export type {
  EntradaCambiarActivoAreaTecnica,
  EntradaCambiarActivoEspecialidad,
  EntradaCrearAreaTecnica,
  EntradaCrearEspecialidad,
  EntradaEditarAreaTecnica,
  EntradaEditarEspecialidad,
  EntradaGuardarCriteriosDeBloque,
} from './catalogoEvaluacion';
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

// Consultas con alcance por rol (paso 11)
export {
  MAXIMO_ALERTAS,
  MAXIMO_POR_REVISAR,
  MAXIMO_POSTULACIONES,
  obtenerDashboardAdministrador,
  obtenerDashboardSupervisor,
  obtenerInicioPracticante,
  FILTRO_AUTOR_SISTEMA,
  categoriaDeAccion,
  listarHistorial,
  listarInsights,
  listarNotificaciones,
  obtenerIndicadores,
  obtenerLineaDeTiempo,
  practicantesPorArea,
  listarCatalogoEvaluacion,
  listarPostulaciones,
  listarPracticantes,
  listarPracticantesACargo,
  listarSupervisores,
  obtenerConfiguracion,
  obtenerPostulacion,
  obtenerPracticante,
  obtenerPracticanteACargo,
  obtenerSupervisor,
  ACTIVIDAD_RECIENTE_MAXIMA,
  listarMiHistorial,
  listarMisProyectos,
  listarMisTareasEnCurso,
  listarProyectos,
  listarPullRequestsPorAtender,
  listarTareas,
  listarTerminadasDeProyecto,
  obtenerEquipoProyecto,
  obtenerProyecto,
  obtenerResumenProyectoAnterior,
  obtenerTableroProyecto,
  obtenerTarea,
} from './consultas';
export type {
  AlertasDeResumen,
  AvanceDeProyecto,
  DashboardAdministrador,
  DashboardSupervisor,
  DashboardSupervisorVacio,
  InicioPracticante,
  InicioPracticanteVacio,
  ReunionDeResumen,
  TareasEsperando,
  DestinoDeNotificacion,
  EntradaListarHistorial,
  EntradaListarInsights,
  EntradaListarNotificaciones,
  EntradaObtenerIndicadores,
  EntradaObtenerLineaDeTiempo,
  EventoDeHistorial,
  FiltrosHistorial,
  IndicadoresAdministrador,
  IndicadoresPracticanteVista,
  IndicadoresProyectoVista,
  IndicadoresSupervisor,
  IndicadoresVista,
  InsightVista,
  LineaDeTiempo,
  ListadoHistorial,
  ListadoInsights,
  ListadoNotificaciones,
  NotificacionVista,
  PostulacionesPorArea,
  PracticantesDeArea,
  AreaDeCatalogo,
  BloqueDeCriterios,
  CatalogoEvaluacion,
  CatalogoNombre,
  ConfiguracionVista,
  CriterioEvaluado,
  EntradaConPostulacion,
  EntradaConPracticante,
  EntradaConSupervisor,
  EspecialidadDeCatalogo,
  EvaluacionDetalle,
  FinDePractica,
  ListadoPostulaciones,
  ListadoPracticantes,
  ListadoPracticantesACargo,
  ListadoSupervisores,
  ParametroVista,
  ParticipacionACargo,
  ParticipacionEnProyectoDePracticante,
  PostulacionDetalle,
  PostulacionListado,
  PracticanteACargoDetalle,
  PracticanteACargoListado,
  PracticanteDetalle,
  PracticanteListado,
  ProyectoACargo,
  ProyectoAnteriorDeSupervisor,
  SeccionVista,
  SituacionACargo,
  SupervisorDetalle,
  SupervisorListado,
  CompaneroDeEquipo,
  DatosDeProyecto,
  EntradaConActor,
  EntradaConProyecto,
  EntradaConTarea,
  EntradaListarMiHistorial,
  EnlaceDeProyecto,
  EquipoProyecto,
  EquipoProyectoGestion,
  EquipoProyectoPracticante,
  EventoConAutor,
  ExMiembroDelEquipo,
  ListadoProyectos,
  ListadoTareas,
  MiHistorial,
  MiembroDelEquipo,
  MisProyectos,
  MisTareasEnCurso,
  MotivoProyectoAnterior,
  ParticipacionEnProyecto,
  PersonaResumen,
  ProyectoResumen,
  ProyectoAnterior,
  ProyectoDePracticante,
  ProyectoListado,
  PullRequestDeTarea,
  PullRequestsPorAtender,
  ReunionDeProyecto,
  ResumenProyecto,
  ResumenProyectoAnterior,
  ResumenProyectoGestion,
  ResumenProyectoPracticante,
  SupervisorDeEquipo,
  TableroProyecto,
  TareaConProyecto,
  TareaDeHistorial,
  TareaDeTablero,
  TareaDetalleVista,
  TareaListado,
  TerminadasDeProyecto,
} from './consultas';

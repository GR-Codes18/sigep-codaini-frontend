export type {
  EntradaConActor,
  EntradaConProyecto,
  EventoConAutor,
  PersonaResumen,
  TareaDeTablero,
} from './comun';
export {
  ACTIVIDAD_RECIENTE_MAXIMA,
  listarMisProyectos,
  listarProyectos,
  listarTerminadasDeProyecto,
  obtenerEquipoProyecto,
  obtenerProyecto,
  obtenerResumenProyectoAnterior,
  obtenerTableroProyecto,
} from './proyectos';
export type {
  CompaneroDeEquipo,
  DatosDeProyecto,
  EnlaceDeProyecto,
  EquipoProyecto,
  EquipoProyectoGestion,
  EquipoProyectoPracticante,
  ExMiembroDelEquipo,
  ListadoProyectos,
  MiembroDelEquipo,
  MisProyectos,
  MotivoProyectoAnterior,
  ParticipacionEnProyecto,
  ProyectoAnterior,
  ProyectoDePracticante,
  ProyectoListado,
  ReunionDeProyecto,
  ResumenProyecto,
  ResumenProyectoAnterior,
  ResumenProyectoGestion,
  ResumenProyectoPracticante,
  SupervisorDeEquipo,
  TableroProyecto,
  TerminadasDeProyecto,
} from './proyectos';
export {
  listarMiHistorial,
  listarMisTareasEnCurso,
  listarPullRequestsPorAtender,
  listarTareas,
  obtenerTarea,
} from './tareas';
export type {
  EntradaConTarea,
  EntradaListarMiHistorial,
  ListadoTareas,
  MiHistorial,
  MisTareasEnCurso,
  PullRequestDeTarea,
  PullRequestsPorAtender,
  TareaDeHistorial,
  TareaDetalleVista,
  TareaListado,
} from './tareas';
export type { ProyectoResumen, TareaConProyecto } from './comun';
export {
  listarPracticantes,
  listarPracticantesACargo,
  listarProyectosAsignables,
  obtenerPracticante,
  obtenerPracticanteACargo,
} from './practicantes';
export type {
  AccionPracticante,
  CatalogoNombre,
  ProyectosAsignables,
  EntradaConPracticante,
  FinDePractica,
  ListadoPracticantes,
  ListadoPracticantesACargo,
  ParticipacionACargo,
  ParticipacionEnProyectoDePracticante,
  PracticanteACargoDetalle,
  PracticanteACargoListado,
  PracticanteDetalle,
  PracticanteListado,
  SituacionACargo,
} from './practicantes';
export { listarSupervisores, obtenerSupervisor } from './supervisores';
export type {
  EntradaConSupervisor,
  ListadoSupervisores,
  ProyectoACargo,
  ProyectoAnteriorDeSupervisor,
  SupervisorDetalle,
  SupervisorListado,
} from './supervisores';
export {
  listarCatalogoEvaluacion,
  listarPostulaciones,
  obtenerConfiguracion,
  obtenerPostulacion,
} from './postulaciones';
export type {
  AreaDeCatalogo,
  BloqueDeCriterios,
  CatalogoEvaluacion,
  ConfiguracionVista,
  CriterioEvaluado,
  EntradaConPostulacion,
  EspecialidadDeCatalogo,
  EvaluacionDetalle,
  ListadoPostulaciones,
  ParametroVista,
  PostulacionDetalle,
  PostulacionListado,
  SeccionVista,
} from './postulaciones';
export {
  FILTRO_AUTOR_SISTEMA,
  categoriaDeAccion,
  listarHistorial,
  obtenerLineaDeTiempo,
} from './historial';
export type {
  EntradaListarHistorial,
  EntradaObtenerLineaDeTiempo,
  EventoDeHistorial,
  FiltrosHistorial,
  LineaDeTiempo,
  ListadoHistorial,
} from './historial';
export { obtenerMiPerfil } from './perfil';
export type { MiPerfil, PracticaDelPerfil } from './perfil';
export { listarNotificaciones } from './notificaciones';
export type {
  DestinoDeNotificacion,
  EntradaListarNotificaciones,
  ListadoNotificaciones,
  NotificacionVista,
} from './notificaciones';
export { listarInsights, obtenerIndicadores, practicantesPorArea } from './reportes';
export type {
  EntradaListarInsights,
  EntradaObtenerIndicadores,
  IndicadoresAdministrador,
  IndicadoresPracticanteVista,
  IndicadoresProyectoVista,
  IndicadoresSupervisor,
  IndicadoresVista,
  InsightVista,
  ListadoInsights,
  PostulacionesPorArea,
  PracticantesDeArea,
} from './reportes';
export {
  MAXIMO_ALERTAS,
  MAXIMO_POR_REVISAR,
  MAXIMO_POSTULACIONES,
  obtenerDashboardAdministrador,
  obtenerDashboardSupervisor,
  obtenerInicioPracticante,
} from './dashboards';
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
} from './dashboards';

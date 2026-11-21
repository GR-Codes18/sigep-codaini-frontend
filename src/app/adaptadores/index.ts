export { aEventosLinea, AUTOR_DESCONOCIDO } from './eventos';
export {
  aNotificacionItem,
  rutaDeNotificacion,
  RUTA_DE_DETALLE,
  RUTA_DE_MODULO,
  RUTA_MI_PERFIL,
  type ContextoNotificacion,
} from './notificacion';
export {
  aCatalogo,
  type AreaParaVista,
  type BloqueParaVista,
  type CatalogoParaVista,
  type CriterioDeBloque,
  type EspecialidadParaVista,
} from './catalogo';
export { aPerfil, type PerfilParaVista } from './perfil';
export {
  aDetallePostulacion,
  aPostulaciones,
  type ContadoresPostulaciones,
  type CriterioParaVista,
  type DetalleParaVista,
  type EvaluacionParaVista,
  type FilaPostulacion,
  type PostulacionesParaVista,
} from './postulaciones';
export {
  aDatosProyecto,
  aEquipoProyecto,
  aProyectos,
  aResumenProyecto,
  type AvanceParaVista,
  type CicloDeVidaParaVista,
  type DatosProyectoParaVista,
  type EnlaceParaVista,
  type EquipoParaVista,
  type ExMiembroParaVista,
  type FilaProyecto,
  type MiembroParaVista,
  type ProyectosParaVista,
  type ResumenParaVista,
  type TareasDeEstadoParaVista,
} from './proyectos';
export {
  aDetallePracticante,
  aPracticantes,
  duracionDePracticaMeses,
  type ContadoresPracticantes,
  type DetallePracticanteParaVista,
  type FilaPracticante,
  type FinParaVista,
  type ParticipacionParaVista,
  type PracticantesParaVista,
  type TareaDePracticanteParaVista,
} from './practicantes';
export {
  aDetalleSupervisor,
  aSupervisores,
  type ContadoresSupervisores,
  type DetalleSupervisorParaVista,
  type FilaSupervisor,
  type ProyectoACargoParaVista,
  type ProyectoAnteriorParaVista,
  type SupervisoresParaVista,
  type TareaPorRevisarParaVista,
} from './supervisores';
export {
  aIndicadores,
  aInsights,
  diaVisiblePeru,
  SIN_DATOS,
  textoDias,
  textoProporcion,
  textoUltimaActividad,
  type FilaIndicadorPracticante,
  type FilaIndicadorProyecto,
  type IndicadoresParaVista,
  type PracticantesPorAreaParaVista,
  type PuntajePorAreaParaVista,
  ETIQUETA_REGLA,
  ETIQUETA_SEVERIDAD,
  rutaDelElemento,
  type FilaInsight,
  type InsightsParaVista,
} from './reportes';
export { aTareaDetalle } from './tarea';
export { aTareas, type FilaTarea, type TareasParaVista } from './tareas';
export { aTablero, aTareaTablero, aTareasTerminadas, type TableroParaVista } from './tablero';
export {
  aHistorial,
  CATEGORIAS_DE_HISTORIAL,
  ETIQUETA_ACCION,
  ETIQUETA_CATEGORIA,
  ETIQUETA_TIPO_ELEMENTO,
  fechaHoraPeru,
  TIPOS_ELEMENTO_DE_HISTORIAL,
  type CambioParaVista,
  type FilaHistorial,
  type HistorialParaVista,
} from './historial';
export {
  aConfiguracion,
  aValorParametro,
  DESCRIPCION_SECCION,
  erroresPorParametro,
  ETIQUETA_SECCION,
  textoANumero,
  type CampoParaVista,
  type ErroresDeParametro,
  type NombreCampo,
  type ParametroParaVista,
  type SeccionParaVista,
} from './configuracion';
export {
  aDashboard,
  type DashboardParaVista,
  type FilaAvance,
  type FilaPorRevisar,
  type FilaPostulacionDashboard,
  type FilaReunion,
  type TarjetasDashboard,
} from './dashboard';

/**
 * Barril de `services/`: utilidades comunes a todos los servicios (Fase 2, paso 4) y servicios por
 * módulo (desde el paso 5).
 */

export { obtenerActor } from './actor';
export { simularDemora } from './demora';
export { DEMORA_PREDETERMINADA_MS, ENTORNO, crearEntorno } from './entorno';
export type { AlmacenServicio, Entorno } from './entorno';
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
export { conEfectos, ejecutarServicio } from './transaccional';
export type { ContextoOperacion, SalidaOperacion } from './transaccional';

// Servicios por módulo
export { crearTarea, editarTarea, eliminarTarea } from './tareas';
export type { EntradaCrearTarea, EntradaEditarTarea, EntradaEliminarTarea } from './tareas';

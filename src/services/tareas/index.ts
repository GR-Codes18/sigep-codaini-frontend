/**
 * Barril de los servicios de tareas (Fase 2, paso 5).
 */

export { crearTarea, editarTarea, eliminarTarea } from './datosTarea';
export type { EntradaCrearTarea, EntradaEditarTarea, EntradaEliminarTarea } from './datosTarea';
export { cambiarRequierePR, cambiarRequiereSupervision } from './opciones';
export type { EntradaRequierePR, EntradaRequiereSupervision } from './opciones';
export {
  aprobarTarea,
  devolverTarea,
  enviarTareaASupervision,
  liberarTarea,
  marcarTareaTerminada,
  reabrirTarea,
  tomarTarea,
} from './transiciones';
export type { EntradaConNota, EntradaLiberar, EntradaTransicion } from './transiciones';

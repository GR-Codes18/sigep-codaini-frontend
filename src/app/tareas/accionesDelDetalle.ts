import type { AccionDeTarea, AccionDisponible, Id } from '@/domain';
import {
  aprobarTarea,
  cambiarRequierePR,
  cambiarRequiereSupervision,
  cerrarPullRequest,
  devolverTarea,
  eliminarTarea,
  enviarTareaASupervision,
  ENTORNO,
  liberarTarea,
  marcarTareaTerminada,
  reabrirTarea,
  tomarTarea,
  type Entorno,
  type Resultado,
} from '@/services';
import type { AccionTarea, TareaDetalle } from '@/compartido/DetalleTarea';

/**
 * Qué se hace al pulsar cada acción que la consulta ofrece (`obtenerTarea.acciones`, §6.7).
 *
 * Aquí solo vive la **presentación** (clave, etiqueta, si es destructiva) y a qué servicio llama cada una. Qué acciones
 * se ofrecen, y si piden motivo o nota, lo decide `domain/` y llega en `AccionDisponible`; este archivo no consulta
 * permisos ni estados. La tabla está tipada con `Record<AccionDeTarea, …>`: si el dominio agrega una acción, no compila
 * hasta que se la describa.
 */
interface Contexto {
  idActor: Id;
  tarea: TareaDetalle;
  /** El motivo o la nota que escribió la persona; `undefined` si la acción no pidió texto. */
  texto: string | undefined;
  entorno: Entorno;
}

interface Definicion {
  clave: string;
  etiqueta: (tarea: TareaDetalle) => string;
  destructivo?: boolean;
  mensajeExito?: string;
  /** Sin `ejecutar` la acción abre otra pieza de la pantalla (el modal de PR, el formulario): la maneja la página. */
  ejecutar?: (contexto: Contexto) => Promise<Resultado<unknown>>;
}

const entradaDe = ({ idActor, tarea }: Contexto) => ({ idActor, idTarea: tarea.id });

const DEFINICIONES: Record<AccionDeTarea, Definicion> = {
  TOMAR: {
    clave: 'tomar',
    etiqueta: () => 'Tomar tarea',
    ejecutar: (c) => tomarTarea(entradaDe(c), c.entorno),
  },
  LIBERAR: {
    clave: 'liberar',
    etiqueta: () => 'Liberar',
    ejecutar: (c) => liberarTarea({ ...entradaDe(c), motivo: c.texto }, c.entorno),
  },
  ENVIAR_A_SUPERVISION: {
    clave: 'enviar',
    etiqueta: () => 'Enviar a supervisión',
    ejecutar: (c) => enviarTareaASupervision(entradaDe(c), c.entorno),
  },
  MARCAR_TERMINADA: {
    clave: 'terminar',
    etiqueta: () => 'Marcar como terminada',
    ejecutar: (c) => marcarTareaTerminada(entradaDe(c), c.entorno),
  },
  APROBAR: {
    clave: 'aprobar',
    etiqueta: () => 'Aprobar',
    ejecutar: (c) => aprobarTarea(entradaDe(c), c.entorno),
  },
  DEVOLVER: {
    clave: 'devolver',
    etiqueta: () => 'Devolver',
    ejecutar: (c) => devolverTarea({ ...entradaDe(c), nota: c.texto }, c.entorno),
  },
  REABRIR: {
    clave: 'reabrir',
    etiqueta: () => 'Reabrir',
    ejecutar: (c) => reabrirTarea({ ...entradaDe(c), nota: c.texto }, c.entorno),
  },
  EDITAR_DATOS: { clave: 'editar', etiqueta: () => 'Editar' },
  CAMBIAR_REQUIERE_SUPERVISION: {
    clave: 'cambiar_requiere_supervision',
    etiqueta: (t) => (t.requiereSupervision ? 'Desactivar supervisión' : 'Activar supervisión'),
    ejecutar: (c) =>
      cambiarRequiereSupervision(
        { ...entradaDe(c), valor: !c.tarea.requiereSupervision },
        c.entorno,
      ),
  },
  ACTIVAR_REQUIERE_PR: {
    clave: 'requiere_pr',
    etiqueta: () => 'Requiere PR',
    ejecutar: (c) =>
      cambiarRequierePR({ ...entradaDe(c), valor: true, motivo: c.texto }, c.entorno),
  },
  DESACTIVAR_REQUIERE_PR: {
    clave: 'no_requiere_pr',
    etiqueta: () => 'No requiere PR',
    ejecutar: (c) =>
      cambiarRequierePR({ ...entradaDe(c), valor: false, motivo: c.texto }, c.entorno),
  },
  CREAR_PULL_REQUEST: {
    clave: 'crear_pr',
    etiqueta: (t) => (t.estadoPr === 'CERRADO' ? 'Crear nuevo Pull Request' : 'Crear Pull Request'),
  },
  CERRAR_PULL_REQUEST: {
    clave: 'cerrar_pr',
    etiqueta: () => 'Cerrar Pull Request',
    destructivo: true,
    ejecutar: (c) => cerrarPullRequest({ ...entradaDe(c), motivo: c.texto }, c.entorno),
  },
  ELIMINAR: {
    clave: 'eliminar',
    etiqueta: () => 'Eliminar',
    destructivo: true,
    mensajeExito: 'Tarea eliminada',
    ejecutar: (c) => eliminarTarea({ ...entradaDe(c), motivo: c.texto }, c.entorno),
  },
};

/**
 * Las acciones que la consulta ofrece, listas para `DetalleTarea`. Sin acciones queda en solo lectura. El orden es el de
 * `domain/` (transiciones, editar, opciones, Pull Request y, al final, eliminar).
 */
export function aAccionesTarea(
  acciones: readonly AccionDisponible[],
  tarea: TareaDetalle,
  idActor: Id,
  entorno: Entorno = ENTORNO,
): AccionTarea[] {
  return acciones.map(({ accion, exige_texto: exigeTexto }) => {
    const definicion = DEFINICIONES[accion];
    const { ejecutar } = definicion;
    return {
      clave: definicion.clave,
      etiqueta: definicion.etiqueta(tarea),
      ...(definicion.destructivo ? { destructivo: true } : {}),
      ...(definicion.mensajeExito ? { mensajeExito: definicion.mensajeExito } : {}),
      ...(exigeTexto !== null
        ? {
            pedirMotivo: {
              etiqueta: exigeTexto === 'MOTIVO' ? 'Motivo' : 'Nota',
              obligatorio: true,
            },
          }
        : {}),
      ...(ejecutar
        ? { ejecutar: (texto?: string) => ejecutar({ idActor, tarea, texto, entorno }) }
        : {}),
    };
  });
}

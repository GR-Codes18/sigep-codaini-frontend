import { parseISO } from 'date-fns';
import type { EstadoPostulacion, EstadoTarea, Rol, TipoAccionHistorial } from '@/domain';
import type { EventoLinea } from '@/compartido/LineaTiempo';
import type { EventoConAutor } from '@/services';

/** Texto de la línea de tiempo de una tarea (sus eventos y los de Pull Request) y de una postulación. */
const ACCION_POR_TIPO: Partial<Record<TipoAccionHistorial, string>> = {
  TAREA_CREADA: 'Tarea creada',
  TAREA_EDITADA: 'Datos de la tarea actualizados',
  TAREA_OPCIONES_CAMBIADAS: 'Opciones de tarea actualizadas',
  TAREA_TOMADA: 'Tomada',
  TAREA_LIBERADA: 'Liberada',
  TAREA_ENVIADA_A_SUPERVISION: 'Enviada a supervisión',
  TAREA_TERMINADA: 'Terminada',
  TAREA_APROBADA: 'Aprobada',
  TAREA_DEVUELTA: 'Devuelta',
  TAREA_REABIERTA: 'Reabierta',
  TAREA_ELIMINADA: 'Tarea eliminada',
  PULL_REQUEST_CREADO: 'Pull Request creado',
  PULL_REQUEST_ESTADO_ACTUALIZADO: 'Estado del Pull Request actualizado',
  PULL_REQUEST_CERRADO_DESDE_EL_SISTEMA: 'Pull Request cerrado desde el sistema',
  PULL_REQUEST_NO_REQUERIDO: 'Pull Request marcado como no requerido',
  POSTULACION_RECIBIDA: 'Postulación recibida',
  POSTULACION_EVALUADA: 'Evaluada por la IA',
  POSTULACION_APROBADA: 'Aprobada',
  POSTULACION_RECHAZADA: 'Rechazada',
  POSTULACION_RECONSIDERADA: 'Reconsiderada',
  PRACTICANTE_ASIGNADO_A_PROYECTO: 'Asignado a un proyecto',
  PRACTICANTE_QUITADO_DE_PROYECTO: 'Quitado de un proyecto',
  PRACTICANTE_DATOS_PRACTICA_EDITADOS: 'Datos de la práctica actualizados',
  PRACTICANTE_CONTRASENA_RESTABLECIDA: 'Contraseña restablecida',
  PRACTICANTE_FINALIZADO: 'Práctica finalizada',
  PRACTICANTE_REACTIVADO: 'Práctica reactivada',
};

/** Estados que aparecen en el resumen de un cambio: los de una tarea y los de una postulación. */
const ETIQUETA_ESTADO: Record<EstadoTarea | EstadoPostulacion, string> = {
  DISPONIBLE: 'Disponible',
  EN_PROGRESO: 'En progreso',
  ESPERANDO_SUPERVISION: 'Esperando supervisión',
  TERMINADA: 'Terminada',
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
};

const ETIQUETA_ROL: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  SUPERVISOR: 'Supervisor',
  PRACTICANTE: 'Practicante',
};

const SIN_RESUMEN_DE_ESTADO: ReadonlySet<TipoAccionHistorial> = new Set([
  'PRACTICANTE_FINALIZADO',
  'PRACTICANTE_REACTIVADO',
]);

export const AUTOR_DESCONOCIDO = 'Usuario desconocido';

function etiquetaEstado(estado: string | null): string {
  if (estado === null) return '—';
  return ETIQUETA_ESTADO[estado as EstadoTarea | EstadoPostulacion] ?? estado;
}

/**
 * «Nombre (Rol)», «Sistema» para lo automático, y «Usuario desconocido» si la cuenta ya no se encuentra: la
 * consulta devuelve entonces el ID como nombre y nunca se muestra.
 */
function etiquetaAutor({ evento, autor_nombre, autor_rol }: EventoConAutor): string {
  if (evento.autor.tipo === 'SISTEMA') return 'Sistema';
  if (autor_rol === null) return AUTOR_DESCONOCIDO;
  return `${autor_nombre} (${ETIQUETA_ROL[autor_rol]})`;
}

/**
 * Eventos de `obtenerTarea` a la línea de tiempo. Conserva el orden recibido (el componente ordena) y no deriva
 * nada del historial: la acción, el cambio de estado y la nota salen del propio evento.
 */
export function aEventosLinea(eventos: readonly EventoConAutor[]): EventoLinea[] {
  return eventos.map((item) => {
    const { evento } = item;
    // Finalizar o reactivar la práctica ya lo dice la acción: «Activo → Inactivo» no es un estado que se muestre.
    const cambioEstado = SIN_RESUMEN_DE_ESTADO.has(evento.tipo_accion)
      ? undefined
      : evento.cambios.find((cambio) => cambio.campo === 'estado');
    return {
      id: evento.id,
      fecha: parseISO(evento.fecha),
      autor: etiquetaAutor(item),
      accion: ACCION_POR_TIPO[evento.tipo_accion] ?? evento.tipo_accion,
      ...(cambioEstado
        ? {
            resumen: `${etiquetaEstado(cambioEstado.valor_anterior)} → ${etiquetaEstado(cambioEstado.valor_nuevo)}`,
          }
        : {}),
      ...(evento.nota ? { nota: evento.nota } : {}),
    };
  });
}

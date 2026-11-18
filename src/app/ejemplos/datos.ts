import { parseISO } from 'date-fns';
import {
  formatearIdLegible,
  type EventoHistorial,
  type Proyecto,
  type Tarea,
  type TipoAccionHistorial,
  type Usuario,
} from '@/domain';
import type { TareaDetalle } from '@/compartido/DetalleTarea';
import type { EventoLinea } from '@/compartido/LineaTiempo';

const ETIQUETA_ESTADO = new Map<string, string>([
  ['DISPONIBLE', 'Disponible'],
  ['EN_PROGRESO', 'En progreso'],
  ['ESPERANDO_SUPERVISION', 'Esperando supervisión'],
  ['TERMINADA', 'Terminada'],
]);

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
};

const ETIQUETA_ROL: Record<Usuario['rol'], string> = {
  ADMINISTRADOR: 'Administrador',
  SUPERVISOR: 'Supervisor',
  PRACTICANTE: 'Practicante',
};

function etiquetaEstado(estado: string | null): string {
  return estado ? (ETIQUETA_ESTADO.get(estado) ?? estado) : '—';
}

function etiquetaAutor(autor: EventoHistorial['autor'], usuarios: readonly Usuario[]): string {
  if (autor.tipo === 'SISTEMA') return 'Sistema';
  const usuario = usuarios.find((item) => item.id === autor.id_usuario);
  return usuario
    ? `${usuario.nombre} (${ETIQUETA_ROL[usuario.rol]})`
    : `Usuario no disponible (${autor.id_usuario})`;
}

function idLegibleDeTarea(
  proyecto: Pick<Proyecto, 'codigo'>,
  tarea: Pick<Tarea, 'numero'>,
): string {
  const resultado = formatearIdLegible(proyecto.codigo, tarea.numero);
  if (!resultado.ok) throw new Error(resultado.mensaje);
  return resultado.id;
}

export function tareaDetalleDesdeAlmacen(
  tarea: Tarea,
  proyecto: Proyecto,
  usuarios: readonly Usuario[],
): TareaDetalle {
  const responsable =
    tarea.id_practicante === null
      ? undefined
      : (usuarios.find((usuario) => usuario.id === tarea.id_practicante)?.nombre ??
        `Usuario no disponible (${tarea.id_practicante})`);

  return {
    id: tarea.id,
    idLegible: idLegibleDeTarea(proyecto, tarea),
    numero: tarea.numero,
    titulo: tarea.titulo,
    descripcion: tarea.descripcion,
    estado: tarea.estado,
    idProyecto: tarea.id_proyecto,
    proyecto: proyecto.nombre,
    idPracticante: tarea.id_practicante,
    ...(responsable ? { responsable } : {}),
    fechaLimite: tarea.fecha_limite,
    requiereSupervision: tarea.requiere_supervision,
    requierePr: tarea.requiere_pr,
    estadoPr: tarea.estado_pr,
    ...(tarea.fecha_termino ? { fechaTermino: tarea.fecha_termino } : {}),
    ...(tarea.url_pull_request ? { urlPr: tarea.url_pull_request } : {}),
    ...(tarea.rama_origen ? { ramaOrigen: tarea.rama_origen } : {}),
    ...(tarea.rama_base ? { ramaBase: tarea.rama_base } : {}),
  };
}

export function eventosDeTarea(
  historial: readonly EventoHistorial[],
  idTarea: string,
  usuarios: readonly Usuario[],
): EventoLinea[] {
  return historial
    .filter((evento) => evento.elemento.tipo === 'TAREA' && evento.elemento.id === idTarea)
    .map((evento) => {
      const cambioEstado = evento.cambios.find((cambio) => cambio.campo === 'estado');
      const resumen = cambioEstado
        ? `${etiquetaEstado(cambioEstado.valor_anterior)} → ${etiquetaEstado(cambioEstado.valor_nuevo)}`
        : undefined;

      return {
        id: evento.id,
        fecha: parseISO(evento.fecha),
        autor: etiquetaAutor(evento.autor, usuarios),
        accion: ACCION_POR_TIPO[evento.tipo_accion] ?? evento.tipo_accion,
        resumen,
        nota: evento.nota ?? undefined,
      };
    });
}

export function observacionDevolucionVigente(
  historial: readonly EventoHistorial[],
  idTarea: string,
): string | undefined {
  return (
    historial
      .filter(
        (evento) =>
          evento.elemento.tipo === 'TAREA' &&
          evento.elemento.id === idTarea &&
          evento.tipo_accion === 'TAREA_DEVUELTA',
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha))[0]?.nota ?? undefined
  );
}

import { format } from 'date-fns';
import type { AccionTransicion, Asignacion, Proyecto, Tarea, Usuario } from '@/domain';
import { puede, transicionesDisponibles } from '@/domain';
import type { AccionTarea, TareaDetalle } from '@/compartido/DetalleTarea';

interface ContextoAcciones {
  usuario: Usuario;
  proyecto: Proyecto;
  asignaciones: Asignacion[];
}

const PRESENTACION_TRANSICION: Record<AccionTransicion, Omit<AccionTarea, 'pedirMotivo'>> = {
  TOMAR: { clave: 'tomar', etiqueta: 'Tomar tarea' },
  LIBERAR: { clave: 'liberar', etiqueta: 'Liberar' },
  ENVIAR_A_SUPERVISION: { clave: 'enviar', etiqueta: 'Enviar a supervisión' },
  MARCAR_TERMINADA: { clave: 'terminar', etiqueta: 'Marcar como terminada' },
  APROBAR: { clave: 'aprobar', etiqueta: 'Aprobar' },
  DEVOLVER: { clave: 'devolver', etiqueta: 'Devolver' },
  REABRIR: { clave: 'reabrir', etiqueta: 'Reabrir' },
};

function aTareaDominio(tarea: TareaDetalle): Tarea {
  return {
    id: tarea.id,
    numero: tarea.numero,
    titulo: tarea.titulo,
    descripcion: tarea.descripcion,
    fecha_limite: format(tarea.fechaLimite, 'yyyy-MM-dd'),
    id_proyecto: tarea.idProyecto,
    id_practicante: tarea.idPracticante,
    estado: tarea.estado,
    requiere_supervision: tarea.requiereSupervision,
    requiere_pr: tarea.requierePr,
    estado_pr: tarea.estadoPr ?? null,
    rama_origen: tarea.ramaOrigen ?? null,
    rama_base: tarea.ramaBase ?? null,
    url_pull_request: tarea.urlPr ?? null,
    fecha_termino: null,
  };
}

function textoExigido(exige: 'MOTIVO' | 'NOTA') {
  return {
    etiqueta: exige === 'MOTIVO' ? 'Motivo' : 'Nota',
    obligatorio: true,
  };
}

export function accionesDeTarea(tarea: TareaDetalle, contexto: ContextoAcciones): AccionTarea[] {
  const tareaDominio = aTareaDominio(tarea);
  const contextoPermiso = {
    proyecto: contexto.proyecto,
    tarea: tareaDominio,
    asignaciones: contexto.asignaciones,
  };
  const acciones: AccionTarea[] = transicionesDisponibles(tareaDominio, contexto.usuario, {
    proyecto: contexto.proyecto,
    asignaciones: contexto.asignaciones,
  }).map(({ transicion, exige_texto }) => ({
    ...PRESENTACION_TRANSICION[transicion],
    ...(exige_texto ? { pedirMotivo: textoExigido(exige_texto) } : {}),
  }));

  if (
    tarea.estado === 'DISPONIBLE' &&
    !tarea.estadoPr &&
    puede(contexto.usuario, 'ELIMINAR_TAREA', contextoPermiso).permitido
  ) {
    acciones.push({
      clave: 'eliminar',
      etiqueta: 'Eliminar',
      destructivo: true,
      pedirMotivo: textoExigido('MOTIVO'),
    });
  }

  const enFaseDePr = tarea.estado === 'ESPERANDO_SUPERVISION' || tarea.estado === 'TERMINADA';
  if (
    enFaseDePr &&
    tarea.requierePr &&
    tarea.estadoPr === 'PENDIENTE' &&
    puede(contexto.usuario, 'CREAR_PULL_REQUEST', contextoPermiso).permitido
  ) {
    acciones.push({ clave: 'crear_pr', etiqueta: 'Crear Pull Request' });
  }

  return acciones;
}

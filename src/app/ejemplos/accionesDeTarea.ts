import type { AccionTransicion, Asignacion, Proyecto, Tarea, Usuario } from '@/domain';
import {
  puede,
  puedeCambiarRequierePR,
  TEXTO_OBLIGATORIO,
  transicionesDisponibles,
} from '@/domain';
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
    fecha_limite: tarea.fechaLimite,
    id_proyecto: tarea.idProyecto,
    id_practicante: tarea.idPracticante,
    estado: tarea.estado,
    requiere_supervision: tarea.requiereSupervision,
    requiere_pr: tarea.requierePr,
    estado_pr: tarea.estadoPr ?? null,
    rama_origen: tarea.ramaOrigen ?? null,
    rama_base: tarea.ramaBase ?? null,
    url_pull_request: tarea.urlPr ?? null,
    fecha_termino: tarea.fechaTermino ?? null,
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

  const reglaDesactivarPR =
    contexto.usuario.rol === 'PRACTICANTE' && tarea.estado === 'EN_PROGRESO' && tarea.requierePr
      ? puedeCambiarRequierePR(tareaDominio, contexto.usuario, contextoPermiso, false)
      : null;
  if (
    reglaDesactivarPR !== null &&
    (reglaDesactivarPR.permitido ||
      (!reglaDesactivarPR.permitido && reglaDesactivarPR.codigo === TEXTO_OBLIGATORIO))
  ) {
    acciones.push({
      clave: 'no_requiere_pr',
      etiqueta: 'No requiere PR',
      pedirMotivo: textoExigido('MOTIVO'),
      deshabilitada: true,
      avisoDeshabilitacion: 'Disponible cuando se conecte el servicio de tareas.',
    });
  }

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

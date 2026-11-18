import type { AccionTransicion, Asignacion, Proyecto, Tarea, Usuario } from '@/domain';
import {
  aprobarTarea,
  cambiarRequierePR,
  cambiarRequiereSupervision,
  cerrarPullRequest,
  devolverTarea,
  eliminarTarea,
  enviarTareaASupervision,
  liberarTarea,
  marcarTareaTerminada,
  reabrirTarea,
  tomarTarea,
  type Resultado,
} from '@/services';
import type { Tarea as TareaDominio, Id } from '@/domain';
import {
  puede,
  puedeCerrarPullRequest,
  puedeCambiarRequierePR,
  puedeCambiarRequiereSupervision,
  puedeCrearPullRequest,
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

type EjecutorTransicion = (
  idActor: Id,
  idTarea: Id,
  texto?: string,
) => Promise<Resultado<TareaDominio>>;

const EJECUTORES_TRANSICION: Record<AccionTransicion, EjecutorTransicion> = {
  TOMAR: (idActor, idTarea) => tomarTarea({ idActor, idTarea }),
  LIBERAR: (idActor, idTarea, motivo) => liberarTarea({ idActor, idTarea, motivo }),
  ENVIAR_A_SUPERVISION: (idActor, idTarea) => enviarTareaASupervision({ idActor, idTarea }),
  MARCAR_TERMINADA: (idActor, idTarea) => marcarTareaTerminada({ idActor, idTarea }),
  APROBAR: (idActor, idTarea) => aprobarTarea({ idActor, idTarea }),
  DEVOLVER: (idActor, idTarea, nota) => devolverTarea({ idActor, idTarea, nota }),
  REABRIR: (idActor, idTarea, nota) => reabrirTarea({ idActor, idTarea, nota }),
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
    ejecutar: (texto) => EJECUTORES_TRANSICION[transicion](contexto.usuario.id, tarea.id, texto),
  }));

  const reglaSupervision = puedeCambiarRequiereSupervision(
    tareaDominio,
    contexto.usuario,
    contextoPermiso,
  );
  if (reglaSupervision.permitido) {
    acciones.push({
      clave: 'cambiar_requiere_supervision',
      etiqueta: tarea.requiereSupervision ? 'Desactivar supervisión' : 'Activar supervisión',
      ejecutar: () =>
        cambiarRequiereSupervision({
          idActor: contexto.usuario.id,
          idTarea: tarea.id,
          valor: !tarea.requiereSupervision,
        }),
    });
  }

  const valorRequierePR = !tarea.requierePr;
  const reglaPR =
    contexto.usuario.rol !== 'PRACTICANTE' || (tarea.estado === 'EN_PROGRESO' && tarea.requierePr)
      ? puedeCambiarRequierePR(tareaDominio, contexto.usuario, contextoPermiso, valorRequierePR)
      : null;
  if (
    reglaPR !== null &&
    (reglaPR.permitido || (!reglaPR.permitido && reglaPR.codigo === TEXTO_OBLIGATORIO))
  ) {
    const exigeMotivo = reglaPR.permitido
      ? reglaPR.exige_texto === 'MOTIVO'
      : reglaPR.codigo === TEXTO_OBLIGATORIO;
    acciones.push({
      clave: tarea.requierePr ? 'no_requiere_pr' : 'requiere_pr',
      etiqueta: tarea.requierePr ? 'No requiere PR' : 'Requiere PR',
      ...(exigeMotivo ? { pedirMotivo: textoExigido('MOTIVO') } : {}),
      ejecutar: (motivo) =>
        cambiarRequierePR({
          idActor: contexto.usuario.id,
          idTarea: tarea.id,
          valor: valorRequierePR,
          motivo,
        }),
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
      mensajeExito: 'Tarea eliminada',
      ejecutar: (motivo) =>
        eliminarTarea({
          idActor: contexto.usuario.id,
          idTarea: tarea.id,
          motivo,
        }),
    });
  }

  const enFaseDePr = tarea.estado === 'ESPERANDO_SUPERVISION' || tarea.estado === 'TERMINADA';
  const reglaCerrarPR = puedeCerrarPullRequest(tareaDominio, contexto.usuario, contextoPermiso);
  if (reglaCerrarPR.permitido) {
    acciones.push({
      clave: 'cerrar_pr',
      etiqueta: 'Cerrar Pull Request',
      destructivo: true,
      pedirMotivo: textoExigido('MOTIVO'),
      ejecutar: (motivo) =>
        cerrarPullRequest({
          idActor: contexto.usuario.id,
          idTarea: tarea.id,
          motivo,
        }),
    });
  }

  const reglaCrearPR = puedeCrearPullRequest(tareaDominio, contexto.usuario, contextoPermiso);
  if (enFaseDePr && reglaCrearPR.permitido) {
    acciones.push({
      clave: 'crear_pr',
      etiqueta: tarea.estadoPr === 'CERRADO' ? 'Crear nuevo Pull Request' : 'Crear Pull Request',
    });
  }

  return acciones;
}

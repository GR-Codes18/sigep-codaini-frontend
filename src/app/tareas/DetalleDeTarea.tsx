import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { aEventosLinea, aTareaDetalle } from '@/app/adaptadores';
import { aAccionesTarea } from '@/app/tareas/accionesDelDetalle';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { DetalleTarea } from '@/compartido/DetalleTarea';
import { FormularioTarea } from '@/compartido/FormularioTarea';
import { ModalCrearPR, type DatosPR } from '@/compartido/ModalCrearPR';
import { Button } from '@/compartido/ui/button';
import { Skeleton } from '@/compartido/ui/skeleton';
import {
  crearPullRequest,
  ENTORNO,
  fallo,
  listarRamasParaPullRequest,
  NOTA_PR_VINCULADO,
  obtenerTarea,
  type Entorno,
} from '@/services';

interface Props {
  idTarea: string;
  /** Qué dice el botón para volver («Volver al tablero», «Volver al listado»…). */
  etiquetaVolver: string;
  onVolver: () => void;
  /**
   * Si la página que lo aloja cuelga de un proyecto, una tarea de otro proyecto no se muestra ahí: se dice que no se
   * encontró en este proyecto (la dirección no puede mezclar un proyecto con una tarea ajena).
   */
  idProyectoEsperado?: string;
  /** Solo lo cambian las pruebas. */
  entorno?: Entorno;
}

/**
 * El detalle de una tarea con todo lo que lo rodea (§6.7): la consulta `obtenerTarea`, los botones que ofrece según el
 * estado y el rol (mapeados a los servicios en `accionesDelDetalle.ts`), el formulario de edición y el modal de «Crear
 * Pull Request». No filtra ni decide nada: el alcance, las acciones y las etiquetas salen de la consulta. Lo aloja la
 * página de cada módulo (Proyectos y, más adelante, Tareas), que decide a dónde vuelve «Volver».
 */
export function DetalleDeTarea({
  idTarea,
  etiquetaVolver,
  onVolver,
  idProyectoEsperado,
  entorno = ENTORNO,
}: Props) {
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;
  const [editando, setEditando] = useState(false);
  const [crearPr, setCrearPr] = useState(false);

  const cargar = useCallback(
    () => obtenerTarea({ idActor: idUsuario ?? '', idTarea }, entorno),
    [entorno, idUsuario, idTarea],
  );
  const tarea = useConsulta(idUsuario === null ? null : cargar);

  const listarRamas = useCallback(() => {
    if (idUsuario === null) return Promise.resolve(fallo('NO_ENCONTRADO'));
    return listarRamasParaPullRequest({ idActor: idUsuario, idTarea }, entorno);
  }, [entorno, idTarea, idUsuario]);
  const crearPRDesdeModal = useCallback(
    async (datos: DatosPR) => {
      if (idUsuario === null) return fallo('NO_ENCONTRADO');
      const resultado = await crearPullRequest(
        {
          idActor: idUsuario,
          idTarea,
          rama_origen: datos.ramaOrigen,
          titulo: datos.titulo,
          descripcion: datos.descripcion,
        },
        entorno,
      );
      if (resultado.ok) {
        if (resultado.valor.vinculado) toast.info(NOTA_PR_VINCULADO);
        else toast.success('Pull Request creado');
      }
      return resultado;
    },
    [entorno, idTarea, idUsuario],
  );

  if (idUsuario === null) return null;

  const ajena =
    idProyectoEsperado !== undefined &&
    tarea.valor !== null &&
    tarea.valor.proyecto.id !== idProyectoEsperado;
  if (tarea.error || ajena) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onVolver}>
          {etiquetaVolver}
        </Button>
        <p role="alert" className="text-sm text-danger-text">
          {tarea.error ?? 'No se encontró la tarea en este proyecto.'}
        </p>
      </div>
    );
  }
  if (tarea.valor === null) {
    return (
      <div className="space-y-2" role="status" aria-label="Cargando la tarea">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  const vista = tarea.valor;
  const detalle = aTareaDetalle(vista);

  if (editando) {
    return (
      <div className="space-y-4">
        <h2 className="text-text">Editar {detalle.idLegible}</h2>
        <FormularioTarea
          modo="editar"
          idActor={idUsuario}
          idTarea={detalle.id}
          proyectos={[{ id: detalle.idProyecto, nombre: detalle.proyecto }]}
          valoresIniciales={{
            idProyecto: detalle.idProyecto,
            titulo: detalle.titulo,
            descripcion: detalle.descripcion,
            fechaLimite: detalle.fechaLimite,
          }}
          onCancelar={() => setEditando(false)}
          entorno={entorno}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={onVolver}>
        {etiquetaVolver}
      </Button>
      <DetalleTarea
        key={detalle.id}
        tarea={detalle}
        acciones={aAccionesTarea(vista.acciones, detalle, idUsuario, entorno)}
        eventos={aEventosLinea(vista.eventos)}
        onEjecutar={async (clave) => {
          if (clave === 'crear_pr') setCrearPr(true);
          else if (clave === 'editar') setEditando(true);
          else throw new Error('La acción de tarea no está disponible.');
        }}
      />
      <ModalCrearPR
        abierto={crearPr}
        onCerrar={() => setCrearPr(false)}
        tituloPropuesto={`${detalle.idLegible} ${detalle.titulo}`}
        plantillaDescripcion="Qué se hizo:"
        onListarRamas={listarRamas}
        ramaBase={vista.proyecto.rama_base}
        onCrear={crearPRDesdeModal}
      />
    </div>
  );
}

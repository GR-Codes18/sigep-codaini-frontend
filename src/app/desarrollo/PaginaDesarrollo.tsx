import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { aEventosLinea, aTablero, aTareaDetalle, aTareasTerminadas } from '@/app/adaptadores';
import { aAccionesTarea } from '@/app/tareas/accionesDelDetalle';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { DetalleTarea } from '@/compartido/DetalleTarea';
import { EstadoVacio } from '@/compartido/EstadoVacio';
import { FormularioTarea } from '@/compartido/FormularioTarea';
import { ListadoTerminadas } from '@/compartido/ListadoTerminadas';
import { ModalCrearPR, type DatosPR } from '@/compartido/ModalCrearPR';
import { TableroKanban } from '@/compartido/TableroKanban';
import { Button } from '@/compartido/ui/button';
import { Label } from '@/compartido/ui/label';
import { Skeleton } from '@/compartido/ui/skeleton';
import {
  crearPullRequest,
  ENTORNO,
  exito,
  fallo,
  listarMisProyectos,
  listarProyectos,
  listarRamasParaPullRequest,
  listarTerminadasDeProyecto,
  NOTA_PR_VINCULADO,
  obtenerTableroProyecto,
  obtenerTarea,
  type Entorno,
  type Resultado,
} from '@/services';

// TEMPORAL (plan Fase 4, paso 11): se elimina al terminar la Fase 7.

interface OpcionProyecto {
  id: string;
  nombre: string;
  codigo: string;
}

const CARGANDO = (
  <div className="space-y-2" role="status" aria-label="Cargando">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
  </div>
);

function AvisoDeError({ mensaje }: { mensaje: string }) {
  return (
    <p role="alert" className="text-sm text-danger-text">
      {mensaje}
    </p>
  );
}

/**
 * Contenedor temporal de integración: el tablero de un proyecto, su detalle de tarea y «Ver todas las terminadas», todo
 * leído con `services/consultas/` y con las acciones por `services/`. No filtra ni decide nada: el alcance por rol, los
 * botones del detalle y las etiquetas salen de las consultas. `entorno` solo lo cambian las pruebas.
 */
export function PaginaDesarrollo({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;
  const rol = sesion?.rol ?? null;

  const [eleccion, setEleccion] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [verTerminadas, setVerTerminadas] = useState(false);
  const [crearPr, setCrearPr] = useState(false);

  // Los proyectos que cada rol puede abrir los decide la consulta de su rol.
  const cargarProyectos = useCallback(async (): Promise<Resultado<OpcionProyecto[]>> => {
    if (idUsuario === null || rol === null) return fallo('NO_ENCONTRADO');
    if (rol === 'PRACTICANTE') {
      const resultado = await listarMisProyectos({ idActor: idUsuario }, entorno);
      return resultado.ok
        ? exito(resultado.valor.vigentes.map(({ id, nombre, codigo }) => ({ id, nombre, codigo })))
        : resultado;
    }
    const resultado = await listarProyectos({ idActor: idUsuario }, entorno);
    return resultado.ok
      ? exito(resultado.valor.proyectos.map(({ id, nombre, codigo }) => ({ id, nombre, codigo })))
      : resultado;
  }, [entorno, idUsuario, rol]);
  const proyectos = useConsulta(idUsuario === null ? null : cargarProyectos);
  const opciones = proyectos.valor ?? [];
  const idProyecto = opciones.some((p) => p.id === eleccion) ? eleccion : (opciones[0]?.id ?? null);

  const cargarTablero = useCallback(
    () =>
      obtenerTableroProyecto({ idActor: idUsuario ?? '', idProyecto: idProyecto ?? '' }, entorno),
    [entorno, idUsuario, idProyecto],
  );
  const tablero = useConsulta(idUsuario === null || idProyecto === null ? null : cargarTablero);

  const cargarTerminadas = useCallback(
    () =>
      listarTerminadasDeProyecto(
        { idActor: idUsuario ?? '', idProyecto: idProyecto ?? '' },
        entorno,
      ),
    [entorno, idUsuario, idProyecto],
  );
  const terminadas = useConsulta(
    idUsuario === null || idProyecto === null || !verTerminadas ? null : cargarTerminadas,
  );

  const cargarTarea = useCallback(
    () => obtenerTarea({ idActor: idUsuario ?? '', idTarea: abierta ?? '' }, entorno),
    [entorno, idUsuario, abierta],
  );
  const tarea = useConsulta(idUsuario === null || abierta === null ? null : cargarTarea);

  const idTareaAbierta = abierta;
  const listarRamas = useCallback(() => {
    if (idUsuario === null || idTareaAbierta === null)
      return Promise.resolve(fallo('NO_ENCONTRADO'));
    return listarRamasParaPullRequest({ idActor: idUsuario, idTarea: idTareaAbierta }, entorno);
  }, [entorno, idTareaAbierta, idUsuario]);
  const crearPRDesdeModal = useCallback(
    async (datos: DatosPR) => {
      if (idUsuario === null || idTareaAbierta === null) return fallo('NO_ENCONTRADO');
      const resultado = await crearPullRequest(
        {
          idActor: idUsuario,
          idTarea: idTareaAbierta,
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
    [entorno, idTareaAbierta, idUsuario],
  );

  if (idUsuario === null || rol === null) return null;

  function abrir(id: string) {
    setAbierta(id);
    setEditando(false);
  }

  function volverAlTablero() {
    setAbierta(null);
    setEditando(false);
    setVerTerminadas(false);
  }

  function contenido() {
    if (proyectos.error) return <AvisoDeError mensaje={proyectos.error} />;
    if (proyectos.cargando) return CARGANDO;
    if (idProyecto === null) {
      return <EstadoVacio titulo="No tienes proyectos para mostrar" />;
    }

    if (abierta !== null) {
      if (tarea.error) {
        return (
          <div className="space-y-4">
            <Button variant="outline" onClick={volverAlTablero}>
              Volver al tablero
            </Button>
            <AvisoDeError mensaje={tarea.error} />
          </div>
        );
      }
      if (tarea.valor === null) return CARGANDO;
      const vista = tarea.valor;
      const detalle = aTareaDetalle(vista);

      if (editando) {
        return (
          <div className="space-y-4">
            <h2 className="text-text">Editar {detalle.idLegible}</h2>
            <FormularioTarea
              modo="editar"
              idActor={idUsuario ?? ''}
              idTarea={detalle.id}
              proyectos={[{ id: detalle.idProyecto, nombre: detalle.proyecto }]}
              valoresIniciales={{
                idProyecto: detalle.idProyecto,
                titulo: detalle.titulo,
                descripcion: detalle.descripcion,
                fechaLimite: detalle.fechaLimite,
              }}
              onCancelar={() => setEditando(false)}
            />
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setAbierta(null)}>
            {verTerminadas ? 'Volver al listado' : 'Volver al tablero'}
          </Button>
          <DetalleTarea
            key={detalle.id}
            tarea={detalle}
            acciones={aAccionesTarea(vista.acciones, detalle, idUsuario ?? '', entorno)}
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

    if (verTerminadas) {
      if (terminadas.error) return <AvisoDeError mensaje={terminadas.error} />;
      if (terminadas.valor === null) return CARGANDO;
      return (
        <ListadoTerminadas
          tareas={aTareasTerminadas(terminadas.valor)}
          onAbrir={abrir}
          onVolver={volverAlTablero}
        />
      );
    }

    if (tablero.error) return <AvisoDeError mensaje={tablero.error} />;
    if (tablero.valor === null) return CARGANDO;
    const { tareas, totalTerminadas } = aTablero(tablero.valor);
    return (
      <TableroKanban
        tareas={tareas}
        totalTerminadas={totalTerminadas}
        onAbrir={abrir}
        permitirSoloMias={rol === 'PRACTICANTE'}
        onVerTerminadas={() => setVerTerminadas(true)}
      />
    );
  }

  return (
    <section className="space-y-6">
      <h1 className="text-text">Desarrollo: tablero y detalle (temporal)</h1>
      <p className="text-sm text-text-2">
        Entra con otro rol para ver cómo cambian los botones del detalle. Rol actual: {rol}.
      </p>
      {opciones.length > 0 && (
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="desarrollo-proyecto">Proyecto</Label>
          <select
            id="desarrollo-proyecto"
            value={idProyecto ?? ''}
            onChange={(e) => {
              setEleccion(e.target.value);
              volverAlTablero();
            }}
            className="h-8 w-full rounded-md border border-input bg-surface px-2.5 text-sm text-text"
          >
            {opciones.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo} · {p.nombre}
              </option>
            ))}
          </select>
        </div>
      )}
      {contenido()}
    </section>
  );
}

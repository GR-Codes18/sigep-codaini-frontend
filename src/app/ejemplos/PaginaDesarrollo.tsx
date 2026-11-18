import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { devolucionVigente, etiquetaPRVisible, puede } from '@/domain';
import { DetalleTarea } from '@/compartido/DetalleTarea';
import { ModalCrearPR, type DatosPR } from '@/compartido/ModalCrearPR';
import { TableroKanban, type TareaTablero } from '@/compartido/TableroKanban';
import { Button } from '@/compartido/ui/button';
import { useAlmacen } from '@/data';
import { crearPullRequest, fallo, listarRamasParaPullRequest, NOTA_PR_VINCULADO } from '@/services';
import { accionesDeTarea } from './accionesDeTarea';
import { eventosDeTarea, observacionDevolucionVigente, tareaDetalleDesdeAlmacen } from './datos';

// TEMPORAL (plan Fase 4, paso 11): se elimina al terminar la Fase 7.
const ID_PROYECTO_DEMO = 'pry-pl2d';

export function PaginaDesarrollo() {
  const idUsuario = useAlmacenSesion((s) => s.usuario?.id ?? null);
  const usuarios = useAlmacen((s) => s.datos.usuarios);
  const proyectos = useAlmacen((s) => s.datos.proyectos);
  const tareasAlmacen = useAlmacen((s) => s.datos.tareas);
  const asignaciones = useAlmacen((s) => s.datos.asignaciones);
  const historialAlmacen = useAlmacen((s) => s.datos.historial);
  const usuarioAlmacen = usuarios.find((item) => item.id === idUsuario);
  const proyecto = proyectos.find((item) => item.id === ID_PROYECTO_DEMO);
  const tareasBase = proyecto
    ? tareasAlmacen
        .filter((item) => item.id_proyecto === proyecto.id)
        .map((item) => tareaDetalleDesdeAlmacen(item, proyecto, usuarios))
    : [];
  const [abierta, setAbierta] = useState<string | null>(null);
  const [crearPr, setCrearPr] = useState(false);
  const listarRamas = useCallback(() => {
    if (idUsuario === null || abierta === null) return Promise.resolve(fallo('NO_ENCONTRADO'));
    return listarRamasParaPullRequest({ idActor: idUsuario, idTarea: abierta });
  }, [abierta, idUsuario]);
  const crearPRDesdeModal = useCallback(
    async (datos: DatosPR) => {
      if (idUsuario === null || abierta === null) return fallo('NO_ENCONTRADO');
      const resultado = await crearPullRequest({
        idActor: idUsuario,
        idTarea: abierta,
        rama_origen: datos.ramaOrigen,
        titulo: datos.titulo,
        descripcion: datos.descripcion,
      });
      if (resultado.ok) {
        if (resultado.valor.vinculado) toast.info(NOTA_PR_VINCULADO);
        else toast.success('Pull Request creado');
      }
      return resultado;
    },
    [abierta, idUsuario],
  );
  if (idUsuario === null) return null;
  if (!usuarioAlmacen) {
    return <p role="alert">No se encontró el usuario de la sesión en los datos del sistema.</p>;
  }
  if (!proyecto) {
    return <p role="alert">No se encontró el proyecto de demostración PL2D.</p>;
  }

  const usuario = usuarioAlmacen;
  const asignacionesUsuario = asignaciones.filter(
    (asignacion) => asignacion.id_practicante === usuario.id,
  );
  const permisoVerProyecto = puede(usuario, 'VER_PROYECTO', {
    proyecto,
    asignaciones: asignacionesUsuario,
  });
  if (!permisoVerProyecto.permitido) {
    return <p role="alert">No tienes acceso al proyecto de demostración PL2D.</p>;
  }

  const tareas = tareasBase;
  const historial = historialAlmacen;
  const tareasConDevolucion = tareas.map((tarea) => {
    const devuelta = devolucionVigente(tarea.id, historial);
    return {
      ...tarea,
      devuelta,
      observacion: devuelta ? observacionDevolucionVigente(historial, tarea.id) : undefined,
    };
  });
  const tarea = tareasConDevolucion.find((t) => t.id === abierta);

  const tablero: TareaTablero[] = tareasConDevolucion.map((t) => ({
    id: t.id,
    idLegible: t.idLegible,
    titulo: t.titulo,
    estado: t.estado,
    responsable: t.responsable,
    esMia: t.idPracticante === usuario.id,
    fechaLimite: t.fechaLimite,
    fechaTermino: t.fechaTermino ? new Date(t.fechaTermino) : undefined,
    requiereSupervision: t.requiereSupervision,
    estadoPr: etiquetaPRVisible({
      estado: t.estado,
      requiere_pr: t.requierePr,
      estado_pr: t.estadoPr,
    }),
    devuelta: t.devuelta,
  }));

  async function ejecutar(clave: string): Promise<void> {
    if (clave !== 'crear_pr') {
      throw new Error('La acción de tarea no está disponible.');
    }
    setCrearPr(true);
  }

  return (
    <section className="space-y-6">
      <h1 className="text-text">Desarrollo: tablero y detalle (temporal)</h1>
      <p className="text-sm text-text-2">
        Entra con otro rol para ver cómo cambian los botones del detalle. Rol actual: {usuario.rol}.
      </p>

      {tarea ? (
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setAbierta(null)}>
            Volver al tablero
          </Button>
          <DetalleTarea
            tarea={tarea}
            acciones={accionesDeTarea(tarea, {
              usuario,
              proyecto,
              asignaciones: asignacionesUsuario,
            })}
            eventos={eventosDeTarea(historial, tarea.id, usuarios)}
            onEjecutar={ejecutar}
          />
          <ModalCrearPR
            abierto={crearPr}
            onCerrar={() => setCrearPr(false)}
            tituloPropuesto={`${tarea.idLegible} ${tarea.titulo}`}
            plantillaDescripcion="Qué se hizo:"
            onListarRamas={listarRamas}
            ramaBase={proyecto.rama_base}
            onCrear={crearPRDesdeModal}
          />
        </div>
      ) : (
        <TableroKanban
          tareas={tablero}
          onAbrir={setAbierta}
          permitirSoloMias={usuario.rol === 'PRACTICANTE'}
          onVerTerminadas={() => toast.info('Aquí irá el listado completo')}
        />
      )}
    </section>
  );
}

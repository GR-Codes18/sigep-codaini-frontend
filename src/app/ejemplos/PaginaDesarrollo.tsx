import { useState } from 'react';
import { toast } from 'sonner';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import type { EstadoTarea, EventoHistorial, TipoAccionHistorial } from '@/domain';
import { devolucionVigente, etiquetaPRVisible } from '@/domain';
import { DetalleTarea } from '@/compartido/DetalleTarea';
import { ModalCrearPR } from '@/compartido/ModalCrearPR';
import { TableroKanban, type TareaTablero } from '@/compartido/TableroKanban';
import { Button } from '@/compartido/ui/button';
import { useAlmacen } from '@/data';
import { accionesDeTarea } from './accionesDeTarea';
import { eventosDeTarea, observacionDevolucionVigente, tareaDetalleDesdeAlmacen } from './datos';

// TEMPORAL (plan Fase 4, paso 11): se elimina al terminar la Fase 7.
const RAMAS = ['feat/login', 'feat/menu', 'fix/tema'];
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
  const [tareasLocales, setTareasLocales] = useState<typeof tareasBase | null>(null);
  const [historialLocal, setHistorialLocal] = useState<EventoHistorial[]>([]);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [crearPr, setCrearPr] = useState(false);
  if (idUsuario === null) return null;
  if (!usuarioAlmacen) {
    return <p role="alert">No se encontró el usuario de la sesión en los datos del sistema.</p>;
  }
  if (!proyecto) {
    return <p role="alert">No se encontró el proyecto de demostración PL2D.</p>;
  }

  const usuario = usuarioAlmacen;
  const tareas = tareasLocales ?? tareasBase;
  const historial = [...historialAlmacen, ...historialLocal];
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

  const SIGUIENTE: Record<
    string,
    { estado: EstadoTarea; tipoAccion: TipoAccionHistorial; quitarResponsable?: boolean }
  > = {
    tomar: { estado: 'EN_PROGRESO', tipoAccion: 'TAREA_TOMADA' },
    liberar: { estado: 'DISPONIBLE', tipoAccion: 'TAREA_LIBERADA', quitarResponsable: true },
    enviar: { estado: 'ESPERANDO_SUPERVISION', tipoAccion: 'TAREA_ENVIADA_A_SUPERVISION' },
    terminar: { estado: 'TERMINADA', tipoAccion: 'TAREA_TERMINADA' },
    aprobar: { estado: 'TERMINADA', tipoAccion: 'TAREA_APROBADA' },
    devolver: { estado: 'EN_PROGRESO', tipoAccion: 'TAREA_DEVUELTA' },
    reabrir: { estado: 'EN_PROGRESO', tipoAccion: 'TAREA_REABIERTA' },
  };

  async function ejecutar(clave: string, nota?: string) {
    if (!tarea) return;
    if (clave === 'crear_pr') {
      setCrearPr(true);
      return;
    }
    if (clave === 'eliminar') {
      setTareasLocales((ts) => (ts ?? tareas).filter((t) => t.id !== tarea.id));
      setAbierta(null);
      toast.success('Tarea eliminada');
      return;
    }
    const sig = SIGUIENTE[clave];
    if (!sig) return;
    const evento: EventoHistorial = {
      id: crypto.randomUUID(),
      fecha: new Date().toISOString(),
      autor: { tipo: 'USUARIO', id_usuario: usuario.id },
      tipo_accion: sig.tipoAccion,
      elemento: {
        tipo: 'TAREA',
        id: tarea.id,
        etiqueta: `${tarea.idLegible} · ${tarea.titulo}`,
      },
      id_proyecto: tarea.idProyecto,
      cambios: [{ campo: 'estado', valor_anterior: tarea.estado, valor_nuevo: sig.estado }],
      nota: nota ?? null,
    };
    setHistorialLocal((eventos) => [...eventos, evento]);
    setTareasLocales((ts) =>
      (ts ?? tareas).map((t) =>
        t.id === tarea.id
          ? {
              ...t,
              estado: sig.estado,
              responsable: sig.quitarResponsable ? undefined : (t.responsable ?? usuario.nombre),
              idPracticante: sig.quitarResponsable ? null : (t.idPracticante ?? usuario.id),
              ...(sig.estado === 'TERMINADA' ? { fechaTermino: new Date().toISOString() } : {}),
            }
          : t,
      ),
    );
    toast.success('Acción aplicada');
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
              asignaciones: asignaciones.filter(
                (asignacion) => asignacion.id_practicante === usuario.id,
              ),
            })}
            eventos={eventosDeTarea(historial, tarea.id, usuarios)}
            onEjecutar={ejecutar}
          />
          <ModalCrearPR
            abierto={crearPr}
            onCerrar={() => setCrearPr(false)}
            tituloPropuesto={`${tarea.idLegible} ${tarea.titulo}`}
            plantillaDescripcion="Qué se hizo:"
            ramas={RAMAS}
            ramaBase={proyecto.rama_base}
            onCrear={async () => {
              setTareasLocales((ts) =>
                (ts ?? tareas).map((t) => (t.id === tarea.id ? { ...t, estadoPr: 'CREADO' } : t)),
              );
              toast.success('Pull Request creado');
            }}
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

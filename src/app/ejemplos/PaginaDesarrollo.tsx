import { useState } from 'react';
import { toast } from 'sonner';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import type { UsuarioSesion } from '@/auth/tipos';
import type { EstadoTarea, EventoHistorial, TipoAccionHistorial, Usuario } from '@/domain';
import { devolucionVigente } from '@/domain';
import { DetalleTarea } from '@/compartido/DetalleTarea';
import { ModalCrearPR } from '@/compartido/ModalCrearPR';
import { TableroKanban, type TareaTablero } from '@/compartido/TableroKanban';
import { Button } from '@/compartido/ui/button';
import { accionesDeTarea } from './accionesDeTarea';
import {
  ASIGNACIONES_EJEMPLO,
  eventosDeTarea,
  HISTORIAL_EJEMPLO,
  observacionDevolucionVigente,
  proyectoPorId,
  TAREAS_EJEMPLO,
} from './datos';

// TEMPORAL (plan Fase 4, paso 11): se elimina al terminar la Fase 7.
const RAMAS = ['feat/login', 'feat/menu', 'fix/tema'];

function usuarioDeSesion(usuario: UsuarioSesion): Usuario {
  return {
    ...usuario,
    celular: '',
    contrasena: '',
    estado: 'ACTIVO',
    fecha_alta: new Date().toISOString(),
  };
}

export function PaginaDesarrollo() {
  const usuarioSesion = useAlmacenSesion((s) => s.usuario);
  const [tareas, setTareas] = useState(TAREAS_EJEMPLO);
  const [historial, setHistorial] = useState(HISTORIAL_EJEMPLO);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [crearPr, setCrearPr] = useState(false);
  if (!usuarioSesion) return null;
  const usuario = usuarioDeSesion(usuarioSesion);

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
    titulo: t.titulo,
    estado: t.estado,
    responsable: t.responsable,
    esMia: t.idPracticante === usuario.id,
    fechaLimite: t.fechaLimite,
    fechaTermino: t.estado === 'TERMINADA' ? new Date() : undefined,
    requiereSupervision: t.requiereSupervision,
    estadoPr: t.estadoPr,
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
      setTareas((ts) => ts.filter((t) => t.id !== tarea.id));
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
      elemento: { tipo: 'TAREA', id: tarea.id, etiqueta: `${tarea.id} · ${tarea.titulo}` },
      id_proyecto: tarea.idProyecto,
      cambios: [{ campo: 'estado', valor_anterior: tarea.estado, valor_nuevo: sig.estado }],
      nota: nota ?? null,
    };
    setHistorial((eventos) => [...eventos, evento]);
    setTareas((ts) =>
      ts.map((t) =>
        t.id === tarea.id
          ? {
              ...t,
              estado: sig.estado,
              responsable: sig.quitarResponsable ? undefined : (t.responsable ?? usuario.nombre),
              idPracticante: sig.quitarResponsable ? null : (t.idPracticante ?? usuario.id),
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
              proyecto: proyectoPorId(tarea.idProyecto),
              asignaciones:
                usuario.rol === 'PRACTICANTE'
                  ? ASIGNACIONES_EJEMPLO.filter(
                      (asignacion) => asignacion.id_practicante === usuario.id,
                    )
                  : [],
            })}
            eventos={eventosDeTarea(historial, tarea.id)}
            onEjecutar={ejecutar}
          />
          <ModalCrearPR
            abierto={crearPr}
            onCerrar={() => setCrearPr(false)}
            tituloPropuesto={`${tarea.id} ${tarea.titulo}`}
            plantillaDescripcion="Qué se hizo:"
            ramas={RAMAS}
            ramaBase="main"
            onCrear={async () => {
              setTareas((ts) =>
                ts.map((t) => (t.id === tarea.id ? { ...t, estadoPr: 'CREADO' } : t)),
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

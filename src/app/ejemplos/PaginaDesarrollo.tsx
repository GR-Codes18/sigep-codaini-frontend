import { useState } from 'react';
import { toast } from 'sonner';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { DetalleTarea } from '@/compartido/DetalleTarea';
import { ModalCrearPR } from '@/compartido/ModalCrearPR';
import { TableroKanban, type TareaTablero } from '@/compartido/TableroKanban';
import { Button } from '@/compartido/ui/button';
import { accionesProvisionales } from './accionesProvisionales';
import { EVENTOS_EJEMPLO, TAREAS_EJEMPLO } from './datos';

// TEMPORAL (plan Fase 4, paso 11): se elimina al terminar la Fase 7.
const RAMAS = ['feat/login', 'feat/menu', 'fix/tema'];

export function PaginaDesarrollo() {
  const rol = useAlmacenSesion((s) => s.usuario?.rol);
  const [tareas, setTareas] = useState(TAREAS_EJEMPLO);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [crearPr, setCrearPr] = useState(false);
  if (!rol) return null;

  const tarea = tareas.find((t) => t.id === abierta);

  const tablero: TareaTablero[] = tareas.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    estado: t.estado as TareaTablero['estado'],
    responsable: t.responsable,
    esMia: t.responsable === 'Practicante Demo',
    fechaLimite: t.fechaLimite,
    fechaTermino: t.estado === 'TERMINADA' ? new Date() : undefined,
    requiereSupervision: t.requiereSupervision,
    estadoPr: t.estadoPr,
    devuelta: t.devuelta,
  }));

  // Transiciones simuladas solo para ver el flujo; la regla real vendrá de domain/.
  const SIGUIENTE: Record<string, { estado: string; quitarResponsable?: boolean }> = {
    tomar: { estado: 'EN_PROGRESO' },
    liberar: { estado: 'DISPONIBLE', quitarResponsable: true },
    enviar: { estado: 'ESPERANDO_SUPERVISION' },
    terminar: { estado: 'TERMINADA' },
    aprobar: { estado: 'TERMINADA' },
    devolver: { estado: 'EN_PROGRESO' },
    reabrir: { estado: 'EN_PROGRESO' },
  };

  async function ejecutar(clave: string) {
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
    setTareas((ts) =>
      ts.map((t) =>
        t.id === tarea.id
          ? {
              ...t,
              estado: sig.estado,
              responsable: sig.quitarResponsable
                ? undefined
                : (t.responsable ?? 'Practicante Demo'),
              devuelta: clave === 'devolver',
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
        Entra con otro rol para ver cómo cambian los botones del detalle. Rol actual: {rol}.
      </p>

      {tarea ? (
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setAbierta(null)}>
            Volver al tablero
          </Button>
          <DetalleTarea
            tarea={tarea}
            acciones={accionesProvisionales(tarea, {
              rol,
              esResponsable: tarea.responsable === 'Practicante Demo' && rol === 'PRACTICANTE',
              proyectoEnPausa: tarea.proyecto === 'Juego móvil',
            })}
            eventos={EVENTOS_EJEMPLO}
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
          permitirSoloMias={rol === 'PRACTICANTE'}
          onVerTerminadas={() => toast.info('Aquí irá el listado completo')}
        />
      )}
    </section>
  );
}

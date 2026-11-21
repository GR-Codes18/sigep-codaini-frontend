import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { aTablero, aTareasTerminadas } from '@/app/adaptadores';
import { DialogoNuevaTarea } from '@/app/tareas/DialogoNuevaTarea';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { ListadoTerminadas } from '@/compartido/ListadoTerminadas';
import { TableroKanban } from '@/compartido/TableroKanban';
import { Button } from '@/compartido/ui/button';
import { Skeleton } from '@/compartido/ui/skeleton';
import type { Id } from '@/domain';
import {
  ENTORNO,
  listarTerminadasDeProyecto,
  obtenerTableroProyecto,
  type Entorno,
} from '@/services';
import { rutaDeDetalleDeTarea } from './rutas';

interface Props {
  idActor: Id;
  proyecto: { id: Id; nombre: string };
  entorno?: Entorno;
}

const CARGANDO = (
  <div className="space-y-2" role="status" aria-label="Cargando el tablero">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
  </div>
);

/**
 * La pestaña «Tablero» del proyecto (§5.4 y §6.8): las cuatro columnas, con «Ver todas las terminadas» y, para quien
 * puede, «Nueva tarea» con el proyecto ya fijado. Un clic en una tarjeta o en una fila abre el detalle de la tarea:
 * ninguna acción se ejecuta desde el tablero (§6.7). Con el proyecto finalizado el tablero es de solo lectura y en
 * pausa nadie toma tareas nuevas (lo hacen cumplir los servicios; aquí solo se avisa). Lee con `obtenerTableroProyecto`
 * y `listarTerminadasDeProyecto`; no decide nada.
 */
export function TableroDelProyecto({ idActor, proyecto, entorno = ENTORNO }: Props) {
  const navegar = useNavigate();
  const { sesion } = useSesionActiva();
  const [verTerminadas, setVerTerminadas] = useState(false);
  const [creando, setCreando] = useState(false);

  const cargarTablero = useCallback(
    () => obtenerTableroProyecto({ idActor, idProyecto: proyecto.id }, entorno),
    [entorno, idActor, proyecto.id],
  );
  const tablero = useConsulta(cargarTablero);

  const cargarTerminadas = useCallback(
    () => listarTerminadasDeProyecto({ idActor, idProyecto: proyecto.id }, entorno),
    [entorno, idActor, proyecto.id],
  );
  const terminadas = useConsulta(verTerminadas ? cargarTerminadas : null);

  const abrir = (idTarea: string) =>
    navegar(rutaDeDetalleDeTarea(proyecto.id, idTarea, sesion?.rol));

  if (tablero.error) {
    return (
      <p role="alert" className="text-sm text-danger-text">
        {tablero.error}
      </p>
    );
  }
  if (tablero.valor === null) return CARGANDO;
  const vista = aTablero(tablero.valor);

  if (verTerminadas) {
    if (terminadas.error) {
      return (
        <p role="alert" className="text-sm text-danger-text">
          {terminadas.error}
        </p>
      );
    }
    if (terminadas.valor === null) return CARGANDO;
    return (
      <ListadoTerminadas
        tareas={aTareasTerminadas(terminadas.valor)}
        onAbrir={abrir}
        onVolver={() => setVerTerminadas(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {vista.estadoProyecto === 'FINALIZADO' && (
        <p
          role="note"
          className="rounded-xl border border-border bg-surface p-3 text-sm text-text-2"
        >
          Este proyecto está finalizado: el tablero es de solo lectura.
        </p>
      )}
      {vista.estadoProyecto === 'EN_PAUSA' && (
        <p
          role="note"
          className="rounded-xl border border-border bg-surface p-3 text-sm text-text-2"
        >
          Este proyecto está en pausa: nadie puede tomar tareas nuevas.
        </p>
      )}

      {vista.puedeCrearTarea && (
        <div className="flex justify-end">
          <Button type="button" onClick={() => setCreando(true)}>
            Nueva tarea
          </Button>
        </div>
      )}

      <TableroKanban
        tareas={vista.tareas}
        totalTerminadas={vista.totalTerminadas}
        permitirSoloMias={sesion?.rol === 'PRACTICANTE'}
        onAbrir={abrir}
        onVerTerminadas={() => setVerTerminadas(true)}
      />

      {creando && (
        <DialogoNuevaTarea
          idActor={idActor}
          proyectos={[{ id: proyecto.id, nombre: proyecto.nombre }]}
          idProyectoInicial={proyecto.id}
          descripcion={`La tarea se crea en ${proyecto.nombre}. El título, la descripción y la fecha límite se pueden editar mientras esté disponible o en progreso.`}
          onCerrar={() => setCreando(false)}
          entorno={entorno}
        />
      )}
    </div>
  );
}

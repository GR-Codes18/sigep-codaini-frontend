import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useConsulta } from '@/app/useConsulta';
import { Button } from '@/compartido/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/compartido/ui/dialog';
import { Skeleton } from '@/compartido/ui/skeleton';
import type { Id } from '@/domain';
import {
  asignarPracticantes,
  ENTORNO,
  listarPracticantesAsignables,
  type Entorno,
} from '@/services';

interface Props {
  idActor: Id;
  proyecto: { id: Id; nombre: string };
  onCerrar: () => void;
  entorno?: Entorno;
}

const plural = (n: number, singular: string, plurales: string) =>
  `${n} ${n === 1 ? singular : plurales}`;

/**
 * «Asignar practicantes» (§5.4): la lista de practicantes activos con su carga actual, para elegir uno o varios y
 * confirmar. Quién se ofrece lo decide `listarPracticantesAsignables` (con `puedeAsignarPracticante`); la lista de pares
 * se aplica entera o ninguna con `asignarPracticantes`, y su error se muestra sin cerrar el diálogo. Cada practicante
 * recibe un aviso (lo hace el servicio).
 */
export function AsignarPracticantes({ idActor, proyecto, onCerrar, entorno = ENTORNO }: Props) {
  const cargar = useCallback(
    () => listarPracticantesAsignables({ idActor, idProyecto: proyecto.id }, entorno),
    [entorno, idActor, proyecto.id],
  );
  const consulta = useConsulta(cargar);
  const [elegidos, setElegidos] = useState<ReadonlySet<Id>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [asignando, setAsignando] = useState(false);

  const practicantes = consulta.valor?.practicantes ?? [];

  const alternar = (id: Id) =>
    setElegidos((actuales) => {
      const siguientes = new Set(actuales);
      if (siguientes.has(id)) siguientes.delete(id);
      else siguientes.add(id);
      return siguientes;
    });

  async function confirmar() {
    setError(null);
    setAsignando(true);
    try {
      // Se envían en el orden de la lista, no en el que se marcaron.
      const resultado = await asignarPracticantes(
        {
          idActor,
          asignaciones: practicantes
            .filter((p) => elegidos.has(p.id))
            .map((p) => ({ idPracticante: p.id, idProyecto: proyecto.id })),
        },
        entorno,
      );
      if (!resultado.ok) {
        setError(resultado.mensaje);
        return;
      }
      toast.success(
        resultado.valor.length === 1
          ? 'Practicante asignado'
          : `${resultado.valor.length} practicantes asignados`,
      );
      onCerrar();
    } finally {
      setAsignando(false);
    }
  }

  function lista() {
    if (consulta.error) {
      return (
        <p role="alert" className="text-sm text-danger-text">
          {consulta.error}
        </p>
      );
    }
    if (consulta.valor === null) {
      return (
        <div className="space-y-2" role="status" aria-label="Cargando los practicantes">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      );
    }
    if (practicantes.length === 0) {
      return (
        <p className="text-sm text-text-2">No hay practicantes a quienes se pueda asignar ahora.</p>
      );
    }
    return (
      <ul className="max-h-72 space-y-1 overflow-y-auto" aria-label="Practicantes disponibles">
        {practicantes.map((p) => (
          <li key={p.id}>
            <label className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={elegidos.has(p.id)}
                disabled={asignando}
                onChange={() => alternar(p.id)}
              />
              <span>
                <span className="font-medium text-text">{p.nombre}</span>
                <span className="block text-xs text-text-2">
                  {p.correo} · {p.especialidad ?? 'Sin especialidad'} ·{' '}
                  {plural(p.carga, 'tarea en progreso', 'tareas en progreso')}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && !asignando && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar practicantes</DialogTitle>
          <DialogDescription>
            Elige uno o varios practicantes para {proyecto.nombre}. La carga es el total de tareas
            en progreso en todos sus proyectos. Cada uno recibirá un aviso.
          </DialogDescription>
        </DialogHeader>

        {lista()}

        {error && (
          <p role="alert" className="text-sm text-danger-text">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCerrar} disabled={asignando}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} disabled={elegidos.size === 0 || asignando}>
            {asignando ? 'Asignando…' : 'Asignar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { asignarPracticantes, ENTORNO, listarProyectosAsignables, type Entorno } from '@/services';

interface Props {
  idActor: Id;
  practicante: { id: Id; nombre: string };
  onCerrar: () => void;
  entorno?: Entorno;
}

/**
 * «Asignar a proyecto» (§5.2): el Administrador elige uno o varios de los proyectos a los que se puede asignar a la
 * persona y confirma. Qué proyectos se ofrecen lo decide `listarProyectosAsignables` (con las reglas de `domain/`); la
 * lista de pares se aplica entera o ninguna con `asignarPracticantes`, y su error se muestra sin cerrar el diálogo.
 */
export function AsignarAProyecto({ idActor, practicante, onCerrar, entorno = ENTORNO }: Props) {
  const cargar = useCallback(
    () => listarProyectosAsignables({ idActor, idPracticante: practicante.id }, entorno),
    [entorno, idActor, practicante.id],
  );
  const consulta = useConsulta(cargar);
  const [elegidos, setElegidos] = useState<ReadonlySet<Id>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [asignando, setAsignando] = useState(false);

  const proyectos = consulta.valor?.proyectos ?? [];

  const alternar = (idProyecto: Id) =>
    setElegidos((actuales) => {
      const siguientes = new Set(actuales);
      if (siguientes.has(idProyecto)) siguientes.delete(idProyecto);
      else siguientes.add(idProyecto);
      return siguientes;
    });

  async function confirmar() {
    setError(null);
    setAsignando(true);
    try {
      // Se envían en el orden en que aparecen en la lista, no en el que se marcaron.
      const resultado = await asignarPracticantes(
        {
          idActor,
          asignaciones: proyectos
            .filter((p) => elegidos.has(p.id))
            .map((p) => ({ idPracticante: practicante.id, idProyecto: p.id })),
        },
        entorno,
      );
      if (!resultado.ok) {
        setError(resultado.mensaje);
        return;
      }
      toast.success(
        resultado.valor.length === 1
          ? 'Practicante asignado al proyecto'
          : `Practicante asignado a ${resultado.valor.length} proyectos`,
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
        <div className="space-y-2" role="status" aria-label="Cargando los proyectos">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      );
    }
    if (proyectos.length === 0) {
      return (
        <p className="text-sm text-text-2">
          No hay proyectos a los que se pueda asignar a esta persona.
        </p>
      );
    }
    return (
      <ul className="space-y-1" aria-label="Proyectos disponibles">
        {proyectos.map((p) => (
          <li key={p.id}>
            <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text hover:bg-surface-2">
              <input
                type="checkbox"
                checked={elegidos.has(p.id)}
                disabled={asignando}
                onChange={() => alternar(p.id)}
              />
              <span className="font-medium">{p.nombre}</span>
              <span className="text-text-2">{p.codigo}</span>
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
          <DialogTitle>Asignar a proyecto</DialogTitle>
          <DialogDescription>
            Elige uno o varios proyectos para {practicante.nombre}. Recibirá un aviso por cada uno.
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

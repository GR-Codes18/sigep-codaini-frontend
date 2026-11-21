import { useState } from 'react';
import { toast } from 'sonner';
import type { ProyectoACargoParaVista } from '@/app/adaptadores';
import { Button } from '@/compartido/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/compartido/ui/dialog';
import type { Id } from '@/domain';
import {
  ENTORNO,
  reasignarProyectosDeSupervisor,
  type Entorno,
  type PersonaResumen,
} from '@/services';

interface Props {
  idActor: Id;
  supervisor: { id: Id; nombre: string };
  /** Sus proyectos activos y en pausa: los que hay que reasignar. */
  proyectos: readonly ProyectoACargoParaVista[];
  /** A quién se pueden reasignar; lo decide `domain/` y llega con la consulta. */
  destinos: readonly PersonaResumen[];
  onCerrar: () => void;
  entorno?: Entorno;
}

const CLASE_SELECT =
  'h-8 w-full rounded-md border border-input bg-surface px-2.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-focus';

/**
 * «Reasignar proyectos» (§5.3): muestra los proyectos activos y en pausa del supervisor y pide elegir un nuevo supervisor
 * para cada uno. Se aplica todo o nada con `reasignarProyectosDeSupervisor`; si el servicio rechaza algún proyecto, se
 * muestra su mensaje sin cerrar el diálogo y no se escribe nada. Las tareas que esperan supervisión pasan con el proyecto
 * (lo hace el servicio).
 */
export function ReasignarProyectos({
  idActor,
  supervisor,
  proyectos,
  destinos,
  onCerrar,
  entorno = ENTORNO,
}: Props) {
  const [elegidos, setElegidos] = useState<Readonly<Record<Id, Id>>>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const completo = proyectos.every((p) => elegidos[p.proyecto.id]);

  async function confirmar() {
    setError(null);
    setGuardando(true);
    try {
      const resultado = await reasignarProyectosDeSupervisor(
        {
          idActor,
          idSupervisor: supervisor.id,
          reasignaciones: proyectos.map((p) => ({
            idProyecto: p.proyecto.id,
            idNuevoSupervisor: elegidos[p.proyecto.id]!,
          })),
        },
        entorno,
      );
      if (!resultado.ok) {
        setError(resultado.mensaje);
        return;
      }
      toast.success(
        resultado.valor.length === 1
          ? 'Proyecto reasignado'
          : `${resultado.valor.length} proyectos reasignados`,
      );
      onCerrar();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && !guardando && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reasignar proyectos</DialogTitle>
          <DialogDescription>
            Elige un nuevo supervisor para cada proyecto de {supervisor.nombre}. Sus tareas que
            esperan supervisión pasan al nuevo supervisor junto con el proyecto.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3" aria-label="Proyectos a reasignar">
          {proyectos.map((p) => {
            const id = `reasignar-${p.proyecto.id}`;
            return (
              <li key={p.proyecto.id} className="space-y-1">
                <label htmlFor={id} className="text-sm font-medium text-text">
                  {p.proyecto.nombre} <span className="text-text-2">{p.proyecto.codigo}</span>
                </label>
                <select
                  id={id}
                  value={elegidos[p.proyecto.id] ?? ''}
                  disabled={guardando}
                  className={CLASE_SELECT}
                  onChange={(e) =>
                    setElegidos((actuales) => ({ ...actuales, [p.proyecto.id]: e.target.value }))
                  }
                >
                  <option value="">Elige un supervisor</option>
                  {destinos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>

        {error && (
          <p role="alert" className="text-sm text-danger-text">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} disabled={!completo || guardando}>
            {guardando ? 'Reasignando…' : 'Reasignar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

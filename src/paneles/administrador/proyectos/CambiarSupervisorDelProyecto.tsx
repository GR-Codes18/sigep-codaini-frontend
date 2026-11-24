import { CampoDeFormulario } from '@/compartido/CampoDeFormulario';
import { CLASE_CAMPO } from '@/compartido/estiloCampo';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { cambiarSupervisor, ENTORNO, type Entorno, type PersonaResumen } from '@/services';

interface Props {
  idActor: Id;
  proyecto: { id: Id; nombre: string; supervisor: PersonaResumen };
  /** A quién se puede cambiar: lo decide `domain/` (`puedeCambiarSupervisor`) y llega con la consulta. */
  destinos: readonly PersonaResumen[];
  onCerrar: () => void;
  entorno?: Entorno;
}

/**
 * «Cambiar supervisor» de un proyecto (§5.3 y §5.4): el mismo cuadro de la reasignación del módulo Supervisores, para un
 * solo proyecto. Las tareas que esperan supervisión pasan con el proyecto y se avisa al supervisor que entra y al que sale
 * (lo hace el servicio). Quién puede recibirlo lo decide la consulta; el servicio vuelve a comprobarlo y su mensaje queda
 * en el diálogo.
 */
export function CambiarSupervisorDelProyecto({
  idActor,
  proyecto,
  destinos,
  onCerrar,
  entorno = ENTORNO,
}: Props) {
  const [elegido, setElegido] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function confirmar() {
    setError(null);
    setGuardando(true);
    try {
      const resultado = await cambiarSupervisor(
        { idActor, idProyecto: proyecto.id, idNuevoSupervisor: elegido },
        entorno,
      );
      if (!resultado.ok) {
        setError(resultado.mensaje);
        return;
      }
      toast.success('Supervisor del proyecto cambiado');
      onCerrar();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && !guardando && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar supervisor</DialogTitle>
          <DialogDescription>
            Elige al nuevo supervisor de {proyecto.nombre}. Las tareas que esperan supervisión pasan
            con el proyecto, y se avisa a quien entra y a quien sale.
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-text-2">
          Supervisor actual:{' '}
          <span className="font-medium text-text">{proyecto.supervisor.nombre}</span>
        </p>
        <CampoDeFormulario htmlFor="nuevo-supervisor-proyecto" etiqueta="Nuevo supervisor">
          <select
            id="nuevo-supervisor-proyecto"
            value={elegido}
            disabled={guardando}
            className={CLASE_CAMPO}
            onChange={(e) => setElegido(e.target.value)}
          >
            <option value="">Elige un supervisor</option>
            {destinos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        </CampoDeFormulario>

        {error && (
          <p role="alert" className="text-sm text-danger-text">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} disabled={elegido === '' || guardando}>
            {guardando ? 'Cambiando…' : 'Cambiar supervisor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

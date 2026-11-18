import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/compartido/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/compartido/ui/dialog';
import { Label } from '@/compartido/ui/label';
import { Textarea } from '@/compartido/ui/textarea';

export interface OpcionMotivo {
  etiqueta: string;
  obligatorio: boolean;
  minimo?: number;
}

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  etiquetaConfirmar: string;
  destructivo?: boolean;
  pedirMotivo?: OpcionMotivo | false;
  onConfirmar: (motivo?: string) => void | Promise<void>;
}

const MENSAJE_GENERICO = 'No se pudo completar la acción. Inténtalo de nuevo.';

function Contenido({
  onCerrar,
  titulo,
  descripcion,
  etiquetaConfirmar,
  destructivo,
  pedirMotivo,
  onConfirmar,
}: Omit<Props, 'abierto'>) {
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minimo = pedirMotivo ? (pedirMotivo.minimo ?? 1) : 0;
  const motivoValido = pedirMotivo
    ? !pedirMotivo.obligatorio || z.string().trim().min(minimo).safeParse(motivo).success
    : true;

  async function confirmar() {
    setError(null);
    setProcesando(true);
    try {
      await onConfirmar(pedirMotivo ? motivo.trim() : undefined);
      onCerrar();
    } catch (e) {
      // No se cierra: el usuario ve el error y puede reintentar.
      setError(e instanceof Error && e.message ? e.message : MENSAJE_GENERICO);
      setProcesando(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{titulo}</DialogTitle>
        {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
      </DialogHeader>

      {pedirMotivo && (
        <div className="space-y-1.5">
          <Label htmlFor="motivo-confirmacion">
            {pedirMotivo.etiqueta}
            {pedirMotivo.obligatorio ? '' : ' (opcional)'}
          </Label>
          <Textarea
            id="motivo-confirmacion"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={procesando}
            rows={3}
          />
          {pedirMotivo.obligatorio && minimo > 1 && (
            <p className="text-xs text-text-2">Mínimo {minimo} caracteres.</p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger-text">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar} disabled={procesando}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant={destructivo ? 'destructive' : 'default'}
          onClick={confirmar}
          disabled={!motivoValido || procesando}
        >
          {procesando ? 'Procesando…' : etiquetaConfirmar}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function ModalConfirmacion({ abierto, onCerrar, ...resto }: Props) {
  return (
    <Dialog open={abierto} onOpenChange={(valor) => !valor && onCerrar()}>
      {/* El contenido se desmonta al cerrar: motivo y error se reinician solos. */}
      <Contenido onCerrar={onCerrar} {...resto} />
    </Dialog>
  );
}

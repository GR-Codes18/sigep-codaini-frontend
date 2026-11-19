import { useState } from 'react';
import { Button } from '@/compartido/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/compartido/ui/dialog';

export interface ContrasenaTemporal {
  /** Nombre del practicante que recibe la cuenta. */
  nombre: string;
  /** El correo es su usuario de acceso. */
  correo: string;
  contrasena: string;
  /** Título del modal; por defecto, el de una cuenta recién creada. Restablecer una contraseña pone el suyo. */
  titulo?: string;
}

interface Props {
  /** `null` = cerrado. La contraseña solo vive aquí, mientras el modal está abierto. */
  datos: ContrasenaTemporal | null;
  onCerrar: () => void;
}

function Contenido({ datos, onCerrar }: { datos: ContrasenaTemporal; onCerrar: () => void }) {
  const [copia, setCopia] = useState<'NO' | 'SI' | 'ERROR'>('NO');

  async function copiar() {
    try {
      await navigator.clipboard.writeText(datos.contrasena);
      setCopia('SI');
    } catch {
      setCopia('ERROR');
    }
  }

  return (
    <DialogContent showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>{datos.titulo ?? 'Cuenta de practicante creada'}</DialogTitle>
        <DialogDescription>
          Entrégale a {datos.nombre} su acceso por fuera del sistema (WhatsApp o Discord). El
          sistema no envía correos.
        </DialogDescription>
      </DialogHeader>

      <dl className="space-y-3 rounded-md border border-border bg-surface-2 p-3 text-sm">
        <div>
          <dt className="text-text-2">Usuario (correo)</dt>
          <dd className="text-text select-all">{datos.correo}</dd>
        </div>
        <div>
          <dt className="text-text-2">Contraseña temporal</dt>
          <dd
            aria-label="Contraseña temporal"
            className="text-base font-semibold tracking-wider text-text select-all"
          >
            {datos.contrasena}
          </dd>
        </div>
      </dl>

      <p className="text-sm text-text">
        Esta contraseña se muestra <strong>una sola vez</strong>: al cerrar esta ventana ya no se
        podrá ver. La persona debe cambiarla al ingresar.
      </p>

      {copia === 'SI' && (
        <p role="status" className="text-sm text-link">
          Contraseña copiada.
        </p>
      )}
      {copia === 'ERROR' && (
        <p role="alert" className="text-sm text-danger-text">
          No se pudo copiar. Selecciónala y cópiala a mano antes de cerrar.
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={copiar}>
          Copiar contraseña
        </Button>
        <Button type="button" onClick={onCerrar}>
          Entendido
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/**
 * Muestra la contraseña temporal de una cuenta recién creada **una sola vez** (§5.1, §8.3). El padre la guarda solo
 * mientras el modal está abierto; no se persiste ni se escribe en ningún otro lugar.
 */
export function ModalContrasenaTemporal({ datos, onCerrar }: Props) {
  return (
    // Cerrar sin querer perdería la contraseña: Escape y el clic fuera no cierran (`onOpenChange` ignora todo intento);
    // solo cierra «Entendido».
    <Dialog open={datos !== null} onOpenChange={() => {}}>
      {/* El contenido se desmonta al cerrar: la copia y el estado de «copiada» se reinician solos. */}
      {datos !== null && <Contenido datos={datos} onCerrar={onCerrar} />}
    </Dialog>
  );
}

import type { ReactNode } from 'react';
import { Label } from '@/compartido/ui/label';
import { cn } from '@/compartido/utils';

interface Props {
  /** El `id` del control que va dentro: la etiqueta se asocia a él. */
  htmlFor: string;
  etiqueta: string;
  /** Ayuda de una línea bajo el control. */
  ayuda?: string;
  /** Error bajo el control, en rojo legible. */
  error?: string;
  /** `true` pone la etiqueta a la izquierda del control, en una sola línea. */
  enLinea?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Un campo con su etiqueta pequeña encima (o al lado con `enLinea`), su ayuda y su error (Fase 8, módulo 8.3). El
 * control va dentro; para que se vea igual en todo el sistema usa `Input` o `CLASE_CAMPO`.
 */
export function CampoDeFormulario({
  htmlFor,
  etiqueta,
  ayuda,
  error,
  enLinea = false,
  className,
  children,
}: Props) {
  return (
    <div className={cn(enLinea ? 'flex items-center gap-2' : 'space-y-1', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium whitespace-nowrap text-text-2">
        {etiqueta}
      </Label>
      {children}
      {ayuda && !error && <p className="text-xs text-text-2">{ayuda}</p>}
      {error && (
        <p role="alert" className="text-xs text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/compartido/utils';

interface Props {
  titulo: string;
  descripcion?: string;
  icono?: LucideIcon;
  accion?: ReactNode;
  /** Sin caja propia, para ir dentro de un panel que ya tiene la suya. */
  plano?: boolean;
}

export function EstadoVacio({ titulo, descripcion, icono: Icono, accion, plano = false }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 px-6 text-center',
        plano ? 'py-6' : 'rounded-xl border border-border bg-surface py-10',
      )}
    >
      {Icono && <Icono className="size-6 text-text-2" strokeWidth={1.5} aria-hidden="true" />}
      <p className="text-sm font-medium text-text">{titulo}</p>
      {descripcion && <p className="text-sm text-text-2">{descripcion}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}

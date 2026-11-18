import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  descripcion?: string;
  icono?: LucideIcon;
  accion?: ReactNode;
}

export function EstadoVacio({ titulo, descripcion, icono: Icono, accion }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface px-6 py-10 text-center">
      {Icono && <Icono className="size-6 text-text-2" strokeWidth={1.5} aria-hidden="true" />}
      <p className="text-sm font-medium text-text">{titulo}</p>
      {descripcion && <p className="text-sm text-text-2">{descripcion}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}

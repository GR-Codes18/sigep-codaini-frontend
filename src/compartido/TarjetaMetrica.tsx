import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/compartido/utils';

interface Props {
  titulo: string;
  valor: number | string;
  apoyo: string;
  icono: LucideIcon;
  /** Solo la tarjeta que pide atención lleva color. */
  atencion?: 'ambar' | 'rojo';
  /** Enlace al módulo con el filtro ya aplicado. */
  enlace?: string;
}

export function TarjetaMetrica({ titulo, valor, apoyo, icono: Icono, atencion, enlace }: Props) {
  const contenido = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-2">{titulo}</p>
        <span
          className={cn(
            'flex size-8 items-center justify-center rounded-[8px]',
            atencion === 'ambar' && 'bg-state-warning-bg text-state-warning-text',
            atencion === 'rojo' && 'bg-state-danger-bg text-state-danger-text',
            !atencion && 'bg-surface-2 text-text-2',
          )}
        >
          <Icono className="size-4" strokeWidth={1.5} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-text tabular-nums">{valor}</p>
      <p className="mt-1 truncate text-xs text-text-2">{apoyo}</p>
    </>
  );

  const clases = 'bg-surface border-border block rounded-xl border p-4';

  return enlace ? (
    <Link
      to={enlace}
      className={cn(
        clases,
        'outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-focus',
      )}
    >
      {contenido}
    </Link>
  ) : (
    <div className={clases}>{contenido}</div>
  );
}

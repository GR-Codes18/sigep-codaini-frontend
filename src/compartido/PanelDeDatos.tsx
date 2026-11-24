import { useId, type ReactNode } from 'react';
import { cn } from '@/compartido/utils';

interface Props {
  /** El título de la sección, dentro de la tarjeta. Da nombre a la región. */
  titulo: string;
  /** Si el nombre de la región debe ser otro que el título (por ejemplo, uno más completo). */
  nombre?: string;
  /** Acciones o datos del título, a la derecha. */
  acciones?: ReactNode;
  /** Sin relleno: el contenido (una tabla) llega a los bordes y solo el título lleva relleno. */
  sinRelleno?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Un bloque de una pantalla (Fase 8, módulo 8.3): UNA caja con su título dentro (`text-base font-semibold`) y
 * relleno `p-3`. Nada de cajas anidadas: lo de dentro se separa con espacio o con líneas finas.
 */
export function PanelDeDatos({
  titulo,
  nombre,
  acciones,
  sinRelleno = false,
  className,
  children,
}: Props) {
  const idTitulo = useId();
  return (
    <section
      aria-labelledby={nombre === undefined ? idTitulo : undefined}
      aria-label={nombre}
      className={cn(
        'rounded-xl border border-border bg-surface',
        sinRelleno ? 'overflow-hidden' : 'p-3',
        className,
      )}
    >
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2',
          sinRelleno && 'px-3 pt-3',
        )}
      >
        <h2 id={idTitulo} className="text-base font-semibold text-text">
          {titulo}
        </h2>
        {acciones}
      </div>
      <div className={cn('mt-3', !sinRelleno && 'space-y-3')}>{children}</div>
    </section>
  );
}

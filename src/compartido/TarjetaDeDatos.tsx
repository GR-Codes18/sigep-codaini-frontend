import type { ReactNode } from 'react';
import { cn } from '@/compartido/utils';

/**
 * La tarjeta de datos: borde fino, esquinas redondeadas, un título corto y, dentro, filas «etiqueta → valor». Es el estilo
 * de las secciones del detalle de una tarea (por ejemplo, la del Pull Request) y de `TarjetaProyecto`, para que todas las
 * pantallas de datos se vean igual. Solo usa las variables del tema. Se combina con `FilasDeDatos`.
 */
export function TarjetaDeDatos({
  titulo,
  accion,
  destacada = false,
  className,
  children,
}: {
  titulo: string;
  /** Un enlace o dato corto a la derecha del título. */
  accion?: ReactNode;
  /** Resalta la tarjeta con un borde de acento a la izquierda (por ejemplo, el supervisor del proyecto). */
  destacada?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={titulo}
      className={cn(
        'flex h-full flex-col gap-2 rounded-xl border border-border bg-surface p-3',
        destacada && 'border-l-4 border-l-primary',
        className,
      )}
    >
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-text">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

export interface FilaDeDatos {
  etiqueta: string;
  valor: ReactNode;
}

/**
 * Las filas de una tarjeta de datos: la etiqueta, en gris y a la izquierda, y el valor a la derecha, separadas por líneas
 * finas. Un valor largo (una dirección) se parte en vez de ensanchar la tarjeta.
 */
export function FilasDeDatos({ filas, className }: { filas: FilaDeDatos[]; className?: string }) {
  return (
    <dl className={cn('divide-y divide-border text-sm', className)}>
      {filas.map((f) => (
        <div
          key={f.etiqueta}
          className="flex items-baseline justify-between gap-4 py-1.5 first:pt-0 last:pb-0"
        >
          <dt className="shrink-0 text-text-2">{f.etiqueta}</dt>
          <dd className="min-w-0 text-right break-words text-text">{f.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

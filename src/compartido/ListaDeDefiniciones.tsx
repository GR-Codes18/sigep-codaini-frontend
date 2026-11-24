import type { ReactNode } from 'react';

export interface Definicion {
  etiqueta: string;
  valor: ReactNode;
}

interface Props {
  items: Definicion[];
  /**
   * `rejilla`: 1 columna en móvil, 2 en tablet y 3 en escritorio. `filas`: una fila por dato (etiqueta a la
   * izquierda, valor a la derecha) separadas por una línea fina, para columnas estrechas.
   */
  disposicion?: 'rejilla' | 'filas';
}

/** Datos clave/valor (Fase 8, módulo 8.3): etiqueta `text-xs text-text-2` y valor `text-sm`, con `gap-y-2`. */
export function ListaDeDefiniciones({ items, disposicion = 'rejilla' }: Props) {
  if (disposicion === 'filas') {
    return (
      <dl className="divide-y divide-border">
        {items.map((i) => (
          <div
            key={i.etiqueta}
            className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-baseline gap-x-3 py-2 first:pt-0 last:pb-0"
          >
            <dt className="text-xs text-text-2">{i.etiqueta}</dt>
            <dd className="min-w-0 text-sm break-words text-text">{i.valor}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => (
        <div key={i.etiqueta} className="min-w-0">
          <dt className="text-xs text-text-2">{i.etiqueta}</dt>
          <dd className="text-sm break-words text-text">{i.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

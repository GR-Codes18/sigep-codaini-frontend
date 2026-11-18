import type { ReactNode } from 'react';
import { EstadoVacio } from '@/compartido/EstadoVacio';
import { cn } from '@/compartido/utils';

export interface Columna<T> {
  clave: string;
  encabezado: string;
  celda: (fila: T) => ReactNode;
  className?: string;
}

interface Props<T> {
  columnas: Columna<T>[];
  filas: T[];
  claveFila: (fila: T) => string;
  /** Clic en la fila = abrir el detalle (nunca acciones en la fila). */
  onAbrir?: (fila: T) => void;
  vacio: { titulo: string; descripcion?: string };
}

export function TablaCompacta<T>({ columnas, filas, claveFila, onAbrir, vacio }: Props<T>) {
  if (filas.length === 0) {
    return <EstadoVacio titulo={vacio.titulo} descripcion={vacio.descripcion} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full border-collapse text-[13px] tabular-nums">
        <thead className="bg-surface-2">
          <tr>
            {columnas.map((c) => (
              <th
                key={c.clave}
                scope="col"
                className={cn('h-11 px-4 text-left font-semibold text-text-2', c.className)}
              >
                {c.encabezado}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr
              key={claveFila(fila)}
              tabIndex={onAbrir ? 0 : undefined}
              onClick={onAbrir ? () => onAbrir(fila) : undefined}
              onKeyDown={
                onAbrir
                  ? (e) => {
                      if (e.key === 'Enter') onAbrir(fila);
                    }
                  : undefined
              }
              className={cn(
                'h-11 border-t border-border',
                onAbrir &&
                  'cursor-pointer hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-focus',
              )}
            >
              {columnas.map((c) => (
                <td key={c.clave} className={cn('px-4 text-text', c.className)}>
                  {c.celda(fila)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

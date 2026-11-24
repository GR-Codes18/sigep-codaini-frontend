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
  /** Sin borde ni radio propios: para ponerla dentro de un `PanelDeDatos` sin relleno y no anidar cajas. */
  sinCaja?: boolean;
}

export function TablaCompacta<T>({
  columnas,
  filas,
  claveFila,
  onAbrir,
  vacio,
  sinCaja = false,
}: Props<T>) {
  if (filas.length === 0) {
    return <EstadoVacio titulo={vacio.titulo} descripcion={vacio.descripcion} plano={sinCaja} />;
  }

  return (
    <div
      className={cn(
        'overflow-x-auto',
        sinCaja ? 'border-t border-border' : 'rounded-xl border border-border bg-surface',
      )}
    >
      <table className="w-full border-collapse text-[13px] tabular-nums">
        <thead className="bg-surface-2">
          <tr>
            {columnas.map((c) => (
              <th
                key={c.clave}
                scope="col"
                className={cn('h-9 px-3 text-left text-xs font-semibold text-text-2', c.className)}
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
                'border-t border-border',
                onAbrir &&
                  'cursor-pointer hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-focus',
              )}
            >
              {columnas.map((c) => (
                <td key={c.clave} className={cn('px-3 py-2 text-text', c.className)}>
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

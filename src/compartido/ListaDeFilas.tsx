import type { ReactNode } from 'react';
import { cn } from '@/compartido/utils';

/** Una lista de filas separadas por línea fina, para ir dentro de un `PanelDeDatos` (Fase 8, módulo 8.3). */
export function ListaDeFilas({ children, rotulo }: { children: ReactNode; rotulo?: string }) {
  return (
    <ul aria-label={rotulo} className="divide-y divide-border">
      {children}
    </ul>
  );
}

/** Una fila de `ListaDeFilas`: lo principal a la izquierda y lo secundario a la derecha; baja de línea si no cabe. */
export function FilaDeLista({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <li
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-sm first:pt-0 last:pb-0',
        className,
      )}
    >
      {children}
    </li>
  );
}

import type { ReactNode } from 'react';

/** La nota al pie de una tabla (Fase 8, módulo 8.3): una línea de `text-xs text-text-2` bajo su contenedor. */
export function PieDeTabla({ children }: { children: ReactNode }) {
  return <p className="text-xs text-text-2">{children}</p>;
}

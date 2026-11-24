import type { ComponentProps } from 'react';

/**
 * La tarjeta de filtros de un listado (Fase 8, módulo 8.3): una sola caja con los campos en una fila, que baja de
 * línea en pantallas estrechas. Cada campo lleva su etiqueta pequeña encima con `CampoDeFormulario`.
 */
export function BarraDeFiltros({ children, ...atributos }: ComponentProps<'div'>) {
  return (
    <div
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-3"
      {...atributos}
    >
      {children}
    </div>
  );
}

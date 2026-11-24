import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  /** Una línea que dice para qué sirve la pantalla. */
  subtitulo?: string;
  /** Las acciones de la pantalla, a la derecha (debajo del título en móvil). Como mucho una primaria. */
  acciones?: ReactNode;
}

/**
 * Cabecera de las pantallas de módulo (Fase 8, módulo 8.3): el `h1` de la página, un subtítulo de una línea y las
 * acciones a la derecha.
 */
export function CabeceraDePagina({ titulo, subtitulo, acciones }: Props) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0 space-y-0.5">
        <h1 className="text-xl font-semibold text-text">{titulo}</h1>
        {subtitulo && <p className="text-xs text-text-2">{subtitulo}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  );
}

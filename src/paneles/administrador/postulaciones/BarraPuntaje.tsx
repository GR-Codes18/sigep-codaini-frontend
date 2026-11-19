interface Props {
  /** Nota final de 0 a 100; `null` si todavía no se evaluó. */
  puntaje: number | null;
}

/**
 * El puntaje de la IA como número y barra (§5.1). Solo tokens de color: la barra usa el color de acción sobre el
 * tono de las cabeceras. Sin evaluación no hay barra, solo un guion.
 */
export function BarraPuntaje({ puntaje }: Props) {
  if (puntaje === null) {
    return <span className="text-text-2">Sin evaluar</span>;
  }
  const ancho = Math.min(100, Math.max(0, puntaje));
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-right font-medium text-text tabular-nums">{puntaje}</span>
      <div
        role="progressbar"
        aria-label="Puntaje de la IA"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={puntaje}
        className="h-2 w-24 overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${ancho}%` }} />
      </div>
    </div>
  );
}

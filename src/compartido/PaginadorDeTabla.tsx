import { Button } from '@/compartido/ui/button';

interface Props {
  /** Página actual, desde 0. */
  pagina: number;
  tamano: number;
  total: number;
  onCambiar: (pagina: number) => void;
}

/**
 * El pie de una tabla paginada (Fase 8): «Mostrando 1–25 de N» a la izquierda y «Anterior» y «Siguiente» a la derecha.
 * Sin filas no se dibuja. La página la guarda quien lo usa; aquí solo se calcula el rango y se piden los cambios.
 */
export function PaginadorDeTabla({ pagina, tamano, total, onCambiar }: Props) {
  if (total === 0) return null;
  const ultima = Math.max(0, Math.ceil(total / tamano) - 1);
  const actual = Math.min(pagina, ultima);
  const desde = actual * tamano + 1;
  const hasta = Math.min(total, (actual + 1) * tamano);
  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-text-2 tabular-nums">
        Mostrando {desde}–{hasta} de {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={actual === 0}
          onClick={() => onCambiar(actual - 1)}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={actual >= ultima}
          onClick={() => onCambiar(actual + 1)}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}

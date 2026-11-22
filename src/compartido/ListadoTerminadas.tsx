import { useState } from 'react';
import { format } from 'date-fns';
import { BarraBusqueda } from '@/compartido/BarraBusqueda';
import { EstadoVacio } from '@/compartido/EstadoVacio';
import type { TareaTablero } from '@/compartido/TableroKanban';
import { Button } from '@/compartido/ui/button';

interface Props {
  /** Todas las terminadas del proyecto, de la más reciente a la más antigua (así llegan de la consulta). */
  tareas: TareaTablero[];
  onAbrir: (id: string) => void;
  onVolver: () => void;
}

/** «Ver todas las terminadas» (§6.8): el listado completo con búsqueda por título o ID. Clic = abrir el detalle. */
export function ListadoTerminadas({ tareas, onAbrir, onVolver }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const texto = busqueda.trim().toLowerCase();
  const visibles =
    texto === ''
      ? tareas
      : tareas.filter(
          (t) =>
            t.titulo.toLowerCase().includes(texto) || t.idLegible.toLowerCase().includes(texto),
        );

  return (
    <section aria-label="Tareas terminadas" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-text">Tareas terminadas ({tareas.length})</h2>
        <Button type="button" variant="outline" onClick={onVolver}>
          Volver al tablero
        </Button>
      </div>
      <BarraBusqueda
        valor={busqueda}
        onCambiar={setBusqueda}
        placeholder="Buscar por título o ID"
      />
      {tareas.length === 0 ? (
        <EstadoVacio titulo="Este proyecto todavía no tiene tareas terminadas" />
      ) : visibles.length === 0 ? (
        <EstadoVacio
          titulo="No hay tareas que coincidan"
          descripcion="Prueba con otro título o con el ID de la tarea."
        />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {visibles.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onAbrir(t.id)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-focus"
              >
                <span className="min-w-0">
                  <span className="block text-xs text-text-2 tabular-nums">{t.idLegible}</span>
                  <span className="block truncate text-sm font-medium text-text">{t.titulo}</span>
                  {t.responsable && (
                    <span className="block text-xs text-text-2">{t.responsable}</span>
                  )}
                </span>
                {t.fechaTermino && (
                  <span className="text-xs whitespace-nowrap text-text-2 tabular-nums">
                    Terminada el {format(t.fechaTermino, 'dd/MM/yyyy')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

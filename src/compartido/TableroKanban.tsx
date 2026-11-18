import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Insignia } from '@/compartido/Insignia';
import { Button } from '@/compartido/ui/button';
import { cn } from '@/compartido/utils';

/** Forma provisional: se reemplaza por el tipo Tarea de domain/ cuando entre feat/fase1-tipos. */
export interface TareaTablero {
  id: string;
  titulo: string;
  estado: 'DISPONIBLE' | 'EN_PROGRESO' | 'ESPERANDO_SUPERVISION' | 'TERMINADA';
  responsable?: string;
  /** Para marcar "Solo mis tareas". */
  esMia?: boolean;
  fechaLimite: Date;
  fechaTermino?: Date;
  requiereSupervision: boolean;
  /** Solo se pasa en tareas ESPERANDO_SUPERVISION o TERMINADA que requieren PR. */
  estadoPr?: string;
  devuelta?: boolean;
}

interface Props {
  tareas: TareaTablero[];
  onAbrir: (id: string) => void;
  /** Muestra el filtro "Solo mis tareas" (Practicante). */
  permitirSoloMias?: boolean;
  onVerTerminadas: () => void;
  hoy?: Date;
}

const COLUMNAS: { estado: TareaTablero['estado']; titulo: string; borde: string }[] = [
  { estado: 'DISPONIBLE', titulo: 'Disponible', borde: 'border-t-state-neutral' },
  { estado: 'EN_PROGRESO', titulo: 'En progreso', borde: 'border-t-state-info' },
  {
    estado: 'ESPERANDO_SUPERVISION',
    titulo: 'Esperando supervisión',
    borde: 'border-t-state-warning',
  },
  { estado: 'TERMINADA', titulo: 'Terminada', borde: 'border-t-state-success' },
];

const MAX_TERMINADAS = 5;

function Tarjeta({
  t,
  hoy,
  onAbrir,
}: {
  t: TareaTablero;
  hoy: Date;
  onAbrir: (id: string) => void;
}) {
  const vencida = t.estado !== 'TERMINADA' && t.fechaLimite < hoy;
  return (
    <button
      type="button"
      onClick={() => onAbrir(t.id)}
      className="w-full space-y-2 rounded-xl border border-border bg-surface p-3 text-left outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-focus"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-text-2 tabular-nums">{t.id}</span>
        {t.requiereSupervision && (
          <ShieldCheck
            className="size-4 text-text-2"
            strokeWidth={1.5}
            aria-label="Requiere supervisión"
          />
        )}
      </div>
      <p className="text-sm font-medium text-text">{t.titulo}</p>
      {t.responsable && <p className="text-xs text-text-2">{t.responsable}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        {t.estadoPr && <Insignia tipo="pr" estado={t.estadoPr} />}
        {t.devuelta && <Insignia tipo="marca" estado="DEVUELTA" />}
      </div>
      <p className={cn('text-xs tabular-nums', vencida ? 'text-danger-text' : 'text-text-2')}>
        Límite {t.fechaLimite.toLocaleDateString('es-PE')}
      </p>
    </button>
  );
}

export function TableroKanban({
  tareas,
  onAbrir,
  permitirSoloMias,
  onVerTerminadas,
  hoy = new Date(),
}: Props) {
  const [soloMias, setSoloMias] = useState(false);
  const visibles = soloMias ? tareas.filter((t) => t.esMia) : tareas;

  return (
    <div className="space-y-4">
      {permitirSoloMias && (
        <Button
          type="button"
          variant={soloMias ? 'default' : 'outline'}
          aria-pressed={soloMias}
          onClick={() => setSoloMias((v) => !v)}
        >
          Solo mis tareas
        </Button>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNAS.map(({ estado, titulo, borde }) => {
          const deColumna = visibles.filter((t) => t.estado === estado);
          const mostradas =
            estado === 'TERMINADA'
              ? [...deColumna]
                  .sort(
                    (a, b) => (b.fechaTermino?.getTime() ?? 0) - (a.fechaTermino?.getTime() ?? 0),
                  )
                  .slice(0, MAX_TERMINADAS)
              : deColumna;

          return (
            <section
              key={estado}
              aria-label={titulo}
              className={cn(
                'space-y-3 rounded-xl border border-t-4 border-border bg-surface-2 p-3',
                borde,
              )}
            >
              <h2 className="flex items-center justify-between text-sm font-semibold text-text">
                {titulo}
                <span className="text-xs text-text-2 tabular-nums">{deColumna.length}</span>
              </h2>
              {mostradas.map((t) => (
                <Tarjeta key={t.id} t={t} hoy={hoy} onAbrir={onAbrir} />
              ))}
              {estado === 'TERMINADA' && deColumna.length > MAX_TERMINADAS && (
                <button
                  type="button"
                  onClick={onVerTerminadas}
                  className="text-sm font-medium text-link underline underline-offset-2"
                >
                  Ver todas las terminadas
                </button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

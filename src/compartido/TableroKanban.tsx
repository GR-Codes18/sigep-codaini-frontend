import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ShieldCheck } from 'lucide-react';
import type { EstadoPR, Fecha } from '@/domain';
import { Insignia } from '@/compartido/Insignia';
import { Button } from '@/compartido/ui/button';
import { cn } from '@/compartido/utils';

/** Datos de presentación por tarjeta; `id` conserva el identificador interno de dominio. */
export interface TareaTablero {
  id: string;
  idLegible: string;
  titulo: string;
  estado: 'DISPONIBLE' | 'EN_PROGRESO' | 'ESPERANDO_SUPERVISION' | 'TERMINADA';
  responsable?: string;
  /** Para marcar "Solo mis tareas". */
  esMia?: boolean;
  fechaLimite: Fecha;
  /** Fecha límite pasada y tarea no terminada: la decide `domain/` y la entrega la consulta. */
  vencida: boolean;
  fechaTermino?: Date;
  requiereSupervision: boolean;
  /** La etiqueta visible según §7.3; la decide la consulta (`null` si no se muestra). */
  estadoPr?: EstadoPR | null;
  devuelta?: boolean;
}

interface Props {
  /** Las tareas de las cuatro columnas; las terminadas ya vienen recortadas a las 5 más recientes (§6.8). */
  tareas: TareaTablero[];
  /** Cuántas terminadas tiene el proyecto en total; si no se pasa, se cuentan las recibidas. */
  totalTerminadas?: number;
  onAbrir: (id: string) => void;
  /** Muestra el filtro "Solo mis tareas" (Practicante). */
  permitirSoloMias?: boolean;
  onVerTerminadas: () => void;
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

function Tarjeta({ t, onAbrir }: { t: TareaTablero; onAbrir: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onAbrir(t.id)}
      className="w-full space-y-2 rounded-xl border border-border bg-surface p-3 text-left outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-focus"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-text-2 tabular-nums">{t.idLegible}</span>
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
      <p className={cn('text-xs tabular-nums', t.vencida ? 'text-danger-text' : 'text-text-2')}>
        Límite {format(parseISO(t.fechaLimite), 'dd/MM/yyyy')}
      </p>
    </button>
  );
}

export function TableroKanban({
  tareas,
  totalTerminadas,
  onAbrir,
  permitirSoloMias,
  onVerTerminadas,
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

      {/*
        Altura (igual en los tres paneles):
        - Pantalla ancha (xl): las cuatro columnas miden lo mismo, tomado de la ventana (su alto menos el encabezado, las
          pestañas y los márgenes; nunca menos de 22 rem), y solo scrollea la lista de tarjetas de cada columna: la página no.
        - Tablet (md): dos columnas por fila, con la misma altura dentro de la fila y la lista limitada a 26 rem con su scroll.
        - Móvil: las columnas se apilan y fluyen sin scroll propio. En 390 px un scroll dentro de otro scroll atrapa el dedo y
          se usa peor que dejar correr la página.
      */}
      <div className="grid gap-4 md:grid-cols-2 xl:h-[max(22rem,calc(100dvh-21rem))] xl:grid-cols-4 xl:grid-rows-1">
        {COLUMNAS.map(({ estado, titulo, borde }) => {
          const mostradas = visibles.filter((t) => t.estado === estado);
          const total =
            estado === 'TERMINADA' && !soloMias
              ? Math.max(totalTerminadas ?? 0, mostradas.length)
              : mostradas.length;

          return (
            <section
              key={estado}
              aria-label={titulo}
              className={cn(
                'flex min-h-0 flex-col rounded-xl border border-t-4 border-border bg-surface-2',
                borde,
              )}
            >
              {/* El encabezado (nombre y contador) queda fijo: solo scrollean las tarjetas. */}
              <h2 className="flex shrink-0 items-center justify-between px-3 pt-3 pb-2 text-sm font-semibold text-text">
                {titulo}
                <span className="text-xs text-text-2 tabular-nums">{total}</span>
              </h2>
              {/* El relleno deja sitio al anillo de foco de las tarjetas, que el scroll recortaría. Barra de scroll fina. */}
              <div
                className={cn(
                  'min-h-0 flex-1 space-y-3 px-3 pt-1 pb-3 md:max-h-[26rem] md:overflow-y-auto xl:max-h-none',
                  '[scrollbar-width:thin] [scrollbar-color:var(--border)_transparent]',
                )}
              >
                {mostradas.map((t) => (
                  <Tarjeta key={t.id} t={t} onAbrir={onAbrir} />
                ))}
              </div>
              {estado === 'TERMINADA' && total > mostradas.length && (
                <div className="shrink-0 border-t border-border px-3 py-2">
                  <button
                    type="button"
                    onClick={onVerTerminadas}
                    className="text-sm font-medium text-link underline underline-offset-2"
                  >
                    Ver todas las terminadas
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

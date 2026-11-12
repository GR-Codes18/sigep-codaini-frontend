import { Bell, Info } from 'lucide-react';
import { Popover } from 'radix-ui';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/compartido/utils';

/** Forma provisional: se reemplaza por el tipo Notificacion de domain/. */
export interface NotificacionItem {
  id: string;
  texto: string;
  fecha: Date;
  leida: boolean;
  ruta?: string;
  /** false si el elemento ya no existe (el texto se conserva, el enlace se desactiva). */
  existe: boolean;
}

interface Props {
  notificaciones: NotificacionItem[];
  onAbrir: (n: NotificacionItem) => void;
  onMarcarTodas: () => void;
  onVerTodas: () => void;
}

const MAXIMO = 8;

export function CampanaNotificaciones({
  notificaciones,
  onAbrir,
  onMarcarTodas,
  onVerTodas,
}: Props) {
  const sinLeer = notificaciones.filter((n) => !n.leida).length;
  const ultimas = [...notificaciones]
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
    .slice(0, MAXIMO);

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={sinLeer > 0 ? `Notificaciones (${sinLeer} sin leer)` : 'Notificaciones'}
        className="relative rounded-md p-2 text-text-2 outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-focus"
      >
        <Bell className="size-5" strokeWidth={1.5} aria-hidden="true" />
        {sinLeer > 0 && (
          <span
            className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary"
            aria-hidden="true"
          />
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 w-80 rounded-xl border border-border bg-surface shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold text-text">Notificaciones</p>
            <button
              type="button"
              onClick={onMarcarTodas}
              disabled={sinLeer === 0}
              className="text-xs font-medium text-link underline underline-offset-2 disabled:opacity-50"
            >
              Marcar todas como leídas
            </button>
          </div>

          {ultimas.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-2">No tienes notificaciones.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {ultimas.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onAbrir(n)}
                    aria-disabled={!n.existe || !n.ruta}
                    className={cn(
                      'flex w-full gap-2 px-3 py-2 text-left hover:bg-surface-2',
                      (!n.existe || !n.ruta) && 'cursor-default',
                    )}
                  >
                    <Info
                      className="mt-0.5 size-4 shrink-0 text-text-2"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block text-sm',
                          n.leida ? 'text-text-2' : 'font-medium text-text',
                        )}
                      >
                        {n.texto}
                      </span>
                      <span className="text-xs text-text-2">
                        {formatDistanceToNow(n.fecha, { addSuffix: true, locale: es })}
                      </span>
                    </span>
                    {!n.leida && (
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                        aria-label="No leída"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-border px-3 py-2 text-center">
            <button
              type="button"
              onClick={onVerTodas}
              className="text-sm font-medium text-link underline underline-offset-2"
            >
              Ver todas
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

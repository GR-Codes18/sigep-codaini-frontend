import { Link } from 'react-router';
import { Insignia } from '@/compartido/Insignia';
import { cn } from '@/compartido/utils';

interface Props {
  nombre: string;
  codigo: string;
  estado: string;
  /** Avance de 0 a 100. No se muestra en la variante atenuada. */
  avance?: number;
  detalles: { etiqueta: string; valor: string; resaltar?: boolean }[];
  enlace: string;
  /** Proyectos anteriores: atenuada, sin barra de avance. */
  atenuada?: boolean;
}

export function TarjetaProyecto({
  nombre,
  codigo,
  estado,
  avance,
  detalles,
  enlace,
  atenuada,
}: Props) {
  return (
    <Link
      to={enlace}
      className={cn(
        'block rounded-xl border border-border bg-surface p-4 outline-none focus-visible:ring-2 focus-visible:ring-focus',
        atenuada ? 'opacity-60' : 'hover:bg-surface-2',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-text">{nombre}</p>
          <p className="text-xs text-text-2">{codigo}</p>
        </div>
        <Insignia tipo="proyecto" estado={estado} />
      </div>

      {!atenuada && avance !== undefined && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, avance))}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-text-2 tabular-nums">Avance {avance}%</p>
        </div>
      )}

      <dl className="mt-4 space-y-1 text-sm">
        {detalles.map((d) => (
          <div key={d.etiqueta} className="flex justify-between gap-2">
            <dt className="text-text-2">{d.etiqueta}</dt>
            <dd
              className={cn(
                'text-right text-text',
                d.resaltar && 'font-medium text-state-warning-text',
              )}
            >
              {d.valor}
            </dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}

import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { AvatarIniciales } from '@/compartido/AvatarIniciales';

const CLASE_VOLVER =
  'inline-flex items-center gap-1 rounded-md text-sm font-medium text-link hover:underline focus-visible:ring-2 focus-visible:ring-focus';

interface Props {
  /** El camino de vuelta: un enlace (`a`) o una acción (`onClick`, por ejemplo volver a donde se estaba). */
  volver?: { etiqueta: string; a?: string; onClick?: () => void };
  titulo: string;
  /** Si se da, muestra el avatar con las iniciales de esa persona junto al título. */
  avatarDe?: string;
  /** Insignias de estado, junto al título. */
  insignias?: ReactNode;
  /** Una línea de metadatos bajo el título. */
  metadatos?: ReactNode;
  /** Las acciones de la pantalla: a la derecha del título y debajo de él en móvil. */
  acciones?: ReactNode;
}

/**
 * Cabecera de las pantallas de detalle (Fase 8, módulo 8.3): enlace de vuelta arriba; debajo, avatar opcional, el
 * `h1`, las insignias y una línea de metadatos; las acciones a la derecha. El `h1` y las insignias comparten
 * contenedor.
 */
export function CabeceraDeDetalle({
  volver,
  titulo,
  avatarDe,
  insignias,
  metadatos,
  acciones,
}: Props) {
  return (
    <header className="space-y-2">
      {volver &&
        (volver.a !== undefined ? (
          <Link to={volver.a} className={CLASE_VOLVER}>
            <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden="true" />
            {volver.etiqueta}
          </Link>
        ) : (
          <button type="button" onClick={volver.onClick} className={CLASE_VOLVER}>
            <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden="true" />
            {volver.etiqueta}
          </button>
        ))}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          {avatarDe !== undefined && (
            <AvatarIniciales nombre={avatarDe} className="size-11 text-sm" />
          )}
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-text">{titulo}</h1>
              {insignias}
            </div>
            {metadatos && <p className="text-xs text-text-2">{metadatos}</p>}
          </div>
        </div>
        {acciones && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
            {acciones}
          </div>
        )}
      </div>
    </header>
  );
}

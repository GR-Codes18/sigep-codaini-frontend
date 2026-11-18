import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { EstadoVacio } from '@/compartido/EstadoVacio';

export interface EventoLinea {
  id: string;
  fecha: Date;
  /** Nombre y rol, o "Sistema" para acciones automáticas. */
  autor: string;
  accion: string;
  /** Ej.: "En progreso → Esperando supervisión". */
  resumen?: string;
  /** Motivo o nota, si la acción lo pidió. */
  nota?: string;
}

interface Props {
  eventos: EventoLinea[];
  vacio?: string;
}

export function LineaTiempo({ eventos, vacio = 'Aún no hay actividad registrada.' }: Props) {
  if (eventos.length === 0) return <EstadoVacio titulo={vacio} />;

  const ordenados = [...eventos].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  return (
    <ol className="space-y-4 border-l border-border pl-4">
      {ordenados.map((e) => (
        <li key={e.id} className="relative">
          <span
            className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-text-2"
            aria-hidden="true"
          />
          <p className="text-sm text-text">
            <span className="font-medium">{e.accion}</span>
            <span className="text-text-2"> · {e.autor}</span>
          </p>
          {e.resumen && <p className="text-xs text-text-2">{e.resumen}</p>}
          {e.nota && <p className="mt-1 text-sm text-text">“{e.nota}”</p>}
          <time dateTime={e.fecha.toISOString()} className="text-xs text-text-2 tabular-nums">
            {format(e.fecha, 'd MMM yyyy, HH:mm', { locale: es })}
          </time>
        </li>
      ))}
    </ol>
  );
}

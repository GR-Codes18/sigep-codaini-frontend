import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { EstadoVacio } from '@/compartido/EstadoVacio';
import { PestanasConContador } from '@/compartido/PestanasConContador';
import { Skeleton } from '@/compartido/ui/skeleton';
import { marcarNotificacionLeida, marcarTodasLeidas } from '@/services';
import { useNotificaciones } from './useNotificaciones';

export function PaginaNotificaciones() {
  const [pestana, setPestana] = useState('todas');
  const navegar = useNavigate();
  const { sesion } = useSesionActiva();
  const todas = useNotificaciones();
  const sinLeer = useNotificaciones({ soloNoLeidas: true });
  if (!sesion) return null;
  const idUsuario = sesion.id;
  const vista = pestana === 'todas' ? todas : sinLeer;

  async function marcarTodas() {
    const resultado = await marcarTodasLeidas({ idActor: idUsuario });
    if (!resultado.ok) toast.error(resultado.mensaje);
  }

  return (
    <section className="space-y-4">
      <h1 className="text-text">Notificaciones</h1>
      <button
        type="button"
        onClick={marcarTodas}
        disabled={todas.noLeidas === 0}
        className="text-sm font-medium text-link underline underline-offset-2 disabled:opacity-50"
      >
        Marcar todas como leídas
      </button>
      <PestanasConContador
        valor={pestana}
        onCambiar={setPestana}
        pestanas={[
          { valor: 'todas', etiqueta: 'Todas', contador: todas.total },
          { valor: 'sin-leer', etiqueta: 'No leídas', contador: todas.noLeidas },
        ]}
      />
      {vista.error ? (
        <p role="alert" className="text-sm text-danger-text">
          {vista.error}
        </p>
      ) : vista.cargando ? (
        <div className="space-y-2" role="status" aria-label="Cargando notificaciones">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : vista.items.length === 0 ? (
        <EstadoVacio titulo="No tienes notificaciones" />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {vista.items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                disabled={!n.existe || !n.ruta}
                onClick={async () => {
                  const resultado = await marcarNotificacionLeida({
                    idActor: idUsuario,
                    idNotificacion: n.id,
                  });
                  if (!resultado.ok) {
                    toast.error(resultado.mensaje);
                    return;
                  }
                  if (n.existe && n.ruta) navegar(n.ruta);
                }}
                aria-disabled={!n.existe || !n.ruta}
                className="flex w-full justify-between gap-4 px-4 py-3 text-left hover:bg-surface-2"
              >
                <span className={n.leida ? 'text-sm text-text-2' : 'text-sm font-medium text-text'}>
                  {n.texto}
                </span>
                <span className="text-xs whitespace-nowrap text-text-2">
                  {formatDistanceToNow(n.fecha, { addSuffix: true, locale: es })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

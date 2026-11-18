import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { EstadoVacio } from '@/compartido/EstadoVacio';
import { PestanasConContador } from '@/compartido/PestanasConContador';
import { useAlmacen } from '@/data';
import { marcarNotificacionLeida, marcarTodasLeidas } from '@/services';
import { notificacionesParaVista } from './notificacionVista';

export function PaginaNotificaciones() {
  const [pestana, setPestana] = useState('todas');
  const navegar = useNavigate();
  const { sesion } = useSesionActiva();
  const datos = useAlmacen((s) => s.datos);
  if (!sesion) return null;
  const idUsuario = sesion.id;
  const notificaciones = notificacionesParaVista(datos, idUsuario, sesion.rol);
  const sinLeer = notificaciones.filter((n) => !n.leida);
  const lista = [...(pestana === 'todas' ? notificaciones : sinLeer)].sort(
    (a, b) => b.fecha.getTime() - a.fecha.getTime(),
  );

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
        disabled={sinLeer.length === 0}
        className="text-sm font-medium text-link underline underline-offset-2 disabled:opacity-50"
      >
        Marcar todas como leídas
      </button>
      <PestanasConContador
        valor={pestana}
        onCambiar={setPestana}
        pestanas={[
          { valor: 'todas', etiqueta: 'Todas', contador: notificaciones.length },
          { valor: 'sin-leer', etiqueta: 'No leídas', contador: sinLeer.length },
        ]}
      />
      {lista.length === 0 ? (
        <EstadoVacio titulo="No tienes notificaciones" />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {lista.map((n) => (
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

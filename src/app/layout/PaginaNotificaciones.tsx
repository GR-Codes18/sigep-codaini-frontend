import { useState } from 'react';
import { useNavigate } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { EstadoVacio } from '@/compartido/EstadoVacio';
import { PestanasConContador } from '@/compartido/PestanasConContador';
import { useAlmacenNotificaciones } from '@/app/ejemplos/almacenNotificaciones';

export function PaginaNotificaciones() {
  const [pestana, setPestana] = useState('todas');
  const navegar = useNavigate();
  const { notificaciones, marcarLeida } = useAlmacenNotificaciones();
  const sinLeer = notificaciones.filter((n) => !n.leida);
  const lista = [...(pestana === 'todas' ? notificaciones : sinLeer)].sort(
    (a, b) => b.fecha.getTime() - a.fecha.getTime(),
  );

  return (
    <section className="space-y-4">
      <h1 className="text-text">Notificaciones</h1>
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
                onClick={() => {
                  marcarLeida(n.id);
                  if (n.existe && n.ruta) navegar(n.ruta);
                }}
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

import { NavLink } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { MENU_POR_ROL } from '@/app/menus';
import { cn } from '@/compartido/utils';

export function BarraLateral() {
  const rol = useAlmacenSesion((s) => s.usuario?.rol);
  if (!rol) return null;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="p-4">
        {/* PROVISIONAL: se reemplaza por el isotipo real de CODAINI (negro, en recuadro blanco). */}
        <div className="flex size-12 items-center justify-center rounded-md bg-white p-1.5">
          <span className="text-[10px] font-semibold text-neutral-900">LOGO</span>
        </div>
      </div>

      <nav aria-label="Menú principal" className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {MENU_POR_ROL[rol].map((grupo, i) => (
          <div key={grupo.etiqueta ?? i} className="space-y-1">
            {grupo.etiqueta && (
              <p className="px-3 text-xs font-semibold text-text-2 uppercase">{grupo.etiqueta}</p>
            )}
            {grupo.items.map(({ etiqueta, ruta, icono: Icono }) => (
              <NavLink
                key={ruta}
                to={ruta}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm',
                    isActive
                      ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                      : 'text-text hover:bg-surface-2',
                  )
                }
              >
                <Icono className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span className="truncate">{etiqueta}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

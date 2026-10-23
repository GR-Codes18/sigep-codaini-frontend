import { Bell, ChevronDown, LogOut, User } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useLocation, useNavigate } from 'react-router';
import { AlternadorTema } from '@/app/tema/AlternadorTema';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';
import { etiquetaDeRuta } from '@/app/menus';

const ITEM =
  'text-text hover:bg-surface-2 focus:bg-surface-2 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none';

export function BarraSuperior() {
  const usuario = useAlmacenSesion((s) => s.usuario);
  const cerrarSesion = useAlmacenSesion((s) => s.cerrarSesion);
  const { pathname } = useLocation();
  const navegar = useNavigate();
  if (!usuario) return null;

  const nombrePanel = { ADMINISTRADOR: 'Administrador', SUPERVISOR: 'Supervisor', PRACTICANTE: 'Practicante' }[
    usuario.rol
  ];
  const seccion = etiquetaDeRuta(usuario.rol, pathname);

  return (
    <header className="bg-surface border-border flex h-14 items-center justify-between border-b px-6">
      <nav aria-label="Ruta de navegación" className="text-text-2 text-sm">
        {nombrePanel}
        {seccion && (
          <>
            <span className="mx-2">/</span>
            <span className="text-text">{seccion}</span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-2">
        <AlternadorTema />
        {/* Sin funcionalidad todavía: las notificaciones llegan en la Fase 4, paso 9. */}
        <button
          type="button"
          aria-label="Notificaciones"
          className="text-text-2 hover:bg-surface-2 rounded-md p-2"
        >
          <Bell className="size-5" strokeWidth={1.5} aria-hidden="true" />
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="hover:bg-surface-2 text-text flex items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none">
            <span className="bg-surface-2 border-border flex size-7 items-center justify-center rounded-full border text-xs font-semibold">
              {usuario.nombre.slice(0, 1)}
            </span>
            <span className="hidden sm:inline">{usuario.nombre}</span>
            <ChevronDown className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="bg-surface border-border z-50 min-w-44 rounded-xl border p-1 shadow-sm"
            >
              <DropdownMenu.Item
                className={ITEM}
                onSelect={() => navegar(`${PREFIJO_POR_ROL[usuario.rol]}/perfil`)}
              >
                <User className="size-4" strokeWidth={1.5} aria-hidden="true" /> Mi perfil
              </DropdownMenu.Item>
              <DropdownMenu.Item className={ITEM} onSelect={cerrarSesion}>
                <LogOut className="size-4" strokeWidth={1.5} aria-hidden="true" /> Cerrar sesión
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
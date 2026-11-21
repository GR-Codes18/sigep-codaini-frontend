import { cn } from '@/compartido/utils';

/** Las iniciales de un nombre: la primera letra de las dos primeras palabras, en mayúsculas. */
function inicialesDe(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  return palabras
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

/**
 * Un avatar con las iniciales de la persona, sin foto: círculo con los colores de acento del tema. Es decorativo
 * (`aria-hidden`): el nombre ya está escrito al lado.
 */
export function AvatarIniciales({ nombre, className }: { nombre: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-active-bg text-xs font-semibold text-active-text',
        className,
      )}
    >
      {inicialesDe(nombre) || '?'}
    </span>
  );
}

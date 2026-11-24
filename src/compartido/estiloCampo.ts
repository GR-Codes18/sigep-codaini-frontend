/**
 * Único estilo de campo del sistema (Fase 8, módulo 8.3): lo usan `ui/input` y los `<select>` nativos de los
 * filtros. 36 px de alto en móvil y 32 px en escritorio; el borde usa `--input`.
 */
export const CLASE_CAMPO =
  'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-border/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 sm:h-8 md:text-sm dark:bg-border/30 dark:disabled:bg-border/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40';

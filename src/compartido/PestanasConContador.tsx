import { Tabs } from 'radix-ui';
import { cn } from '@/compartido/utils';

export interface Pestana {
  valor: string;
  etiqueta: string;
  contador?: number;
  /** Resalta el contador en ámbar (por ejemplo, "Esperando supervisión" con tareas). */
  resaltar?: boolean;
}

interface Props {
  pestanas: Pestana[];
  valor: string;
  onCambiar: (valor: string) => void;
}

export function PestanasConContador({ pestanas, valor, onCambiar }: Props) {
  return (
    <Tabs.Root value={valor} onValueChange={onCambiar}>
      <Tabs.List className="flex gap-1 overflow-x-auto border-b border-border">
        {pestanas.map((p) => (
          <Tabs.Trigger
            key={p.valor}
            value={p.valor}
            className={cn(
              'flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm whitespace-nowrap text-text-2 outline-none hover:text-text',
              'focus-visible:ring-2 focus-visible:ring-focus',
              'data-[state=active]:border-primary data-[state=active]:font-medium data-[state=active]:text-text',
            )}
          >
            {p.etiqueta}
            {p.contador !== undefined && (
              <span
                className={cn(
                  'rounded-md px-1.5 text-xs tabular-nums',
                  p.resaltar && p.contador > 0
                    ? 'bg-state-warning-bg text-state-warning-text'
                    : 'bg-surface-2 text-text-2',
                )}
              >
                {p.contador}
              </span>
            )}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}

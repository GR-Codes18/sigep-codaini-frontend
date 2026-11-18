import { Search } from 'lucide-react';
import { Input } from '@/compartido/ui/input';

interface Props {
  valor: string;
  onCambiar: (valor: string) => void;
  placeholder?: string;
}

export function BarraBusqueda({ valor, onCambiar, placeholder = 'Buscar…' }: Props) {
  return (
    <div className="relative max-w-xs flex-1">
      <Search
        className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-2"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <Input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}

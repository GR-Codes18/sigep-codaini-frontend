import { Search } from 'lucide-react';
import { Input } from '@/compartido/ui/input';
import { cn } from '@/compartido/utils';

interface Props {
  valor: string;
  onCambiar: (valor: string) => void;
  placeholder?: string;
  /** Para asociar una etiqueta visible (`CampoDeFormulario`) al campo. */
  id?: string;
  /** Clases del contenedor; por defecto ocupa el ancho disponible hasta `max-w-xs`. */
  className?: string;
}

export function BarraBusqueda({ valor, onCambiar, placeholder = 'Buscar…', id, className }: Props) {
  return (
    <div className={cn('relative max-w-xs flex-1', className)}>
      <Search
        className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-2"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <Input
        id={id}
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

import { CabeceraDePagina } from '@/compartido/CabeceraDePagina';
import { EstadoVacio } from '@/compartido/EstadoVacio';

export function PaginaVacia({ titulo }: { titulo: string }) {
  return (
    <section className="space-y-3">
      <CabeceraDePagina titulo={titulo} />
      <EstadoVacio titulo="Esta sección se construirá en una fase posterior." />
    </section>
  );
}

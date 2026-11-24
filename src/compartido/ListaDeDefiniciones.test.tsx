import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ListaDeDefiniciones } from './ListaDeDefiniciones';

const items = [
  { etiqueta: 'Correo', valor: 'ana@codaini.test' },
  { etiqueta: 'Celular', valor: '999 111 222' },
];

describe('ListaDeDefiniciones', () => {
  it('muestra cada etiqueta con su valor', () => {
    render(<ListaDeDefiniciones items={items} />);

    expect(screen.getByText('Correo').tagName).toBe('DT');
    expect(screen.getByText('ana@codaini.test').tagName).toBe('DD');
    expect(screen.getAllByRole('term')).toHaveLength(2);
  });

  it('la rejilla es de 1 columna en móvil, 2 en tablet y 3 en escritorio', () => {
    const { container } = render(<ListaDeDefiniciones items={items} />);

    expect(container.querySelector('dl')).toHaveClass('sm:grid-cols-2', 'lg:grid-cols-3');
  });

  it('en disposición de filas separa cada dato con una línea fina', () => {
    const { container } = render(<ListaDeDefiniciones items={items} disposicion="filas" />);

    expect(container.querySelector('dl')).toHaveClass('divide-y');
    expect(screen.getByText('999 111 222')).toBeInTheDocument();
  });
});

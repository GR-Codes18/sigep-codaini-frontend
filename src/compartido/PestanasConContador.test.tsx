import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PestanasConContador } from './PestanasConContador';

const PESTANAS = [
  { valor: 'a', etiqueta: 'Uno', contador: 3 },
  { valor: 'b', etiqueta: 'Dos' },
];

describe('PestanasConContador', () => {
  it('muestra las pestañas con su contador', () => {
    render(<PestanasConContador pestanas={PESTANAS} valor="a" onCambiar={() => {}} />);

    expect(screen.getByRole('tab', { name: /Uno/ })).toHaveTextContent('3');
    expect(screen.getByRole('tab', { name: 'Dos' })).toBeInTheDocument();
  });

  it('muestra el control de la derecha, fuera de la lista de pestañas', () => {
    render(
      <PestanasConContador
        pestanas={PESTANAS}
        valor="a"
        onCambiar={() => {}}
        acciones={<button type="button">Ordenar</button>}
      />,
    );

    const boton = screen.getByRole('button', { name: 'Ordenar' });
    expect(boton).toBeInTheDocument();
    expect(screen.getByRole('tablist')).not.toContainElement(boton);
  });
});

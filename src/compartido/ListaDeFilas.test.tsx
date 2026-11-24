import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FilaDeLista, ListaDeFilas } from './ListaDeFilas';

describe('ListaDeFilas', () => {
  it('es una lista con una fila por elemento, separadas por línea fina', () => {
    render(
      <ListaDeFilas rotulo="Proyectos">
        <FilaDeLista>Uno</FilaDeLista>
        <FilaDeLista>Dos</FilaDeLista>
      </ListaDeFilas>,
    );

    const lista = screen.getByRole('list', { name: 'Proyectos' });
    expect(lista).toHaveClass('divide-y');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaginadorDeTabla } from './PaginadorDeTabla';

describe('PaginadorDeTabla', () => {
  it('dice el rango y el total, y en la primera página no deja ir atrás', () => {
    render(<PaginadorDeTabla pagina={0} tamano={25} total={60} onCambiar={() => {}} />);

    expect(screen.getByText('Mostrando 1–25 de 60')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();
  });

  it('la última página muestra el resto y no deja ir adelante', () => {
    render(<PaginadorDeTabla pagina={2} tamano={25} total={60} onCambiar={() => {}} />);

    expect(screen.getByText('Mostrando 51–60 de 60')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
  });

  it('pide la página anterior o la siguiente', async () => {
    const usuario = userEvent.setup();
    const onCambiar = vi.fn();
    render(<PaginadorDeTabla pagina={1} tamano={25} total={60} onCambiar={onCambiar} />);

    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }));
    await usuario.click(screen.getByRole('button', { name: 'Anterior' }));

    expect(onCambiar).toHaveBeenNthCalledWith(1, 2);
    expect(onCambiar).toHaveBeenNthCalledWith(2, 0);
  });

  it('una página fuera de rango (por ejemplo, tras filtrar) se ajusta a la última', () => {
    render(<PaginadorDeTabla pagina={9} tamano={25} total={30} onCambiar={() => {}} />);

    expect(screen.getByText('Mostrando 26–30 de 30')).toBeInTheDocument();
  });

  it('con una sola página no hay a dónde ir, y sin filas no se dibuja', () => {
    const { rerender } = render(
      <PaginadorDeTabla pagina={0} tamano={25} total={10} onCambiar={() => {}} />,
    );
    expect(screen.getByText('Mostrando 1–10 de 10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();

    rerender(<PaginadorDeTabla pagina={0} tamano={25} total={0} onCambiar={() => {}} />);
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).not.toBeInTheDocument();
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarraPuntaje } from './BarraPuntaje';

describe('BarraPuntaje', () => {
  it('muestra el número y una barra con su valor', () => {
    render(<BarraPuntaje puntaje={86} />);

    expect(screen.getByText('86')).toBeInTheDocument();
    const barra = screen.getByRole('progressbar', { name: 'Puntaje de la IA' });
    expect(barra).toHaveAttribute('aria-valuenow', '86');
    expect(barra).toHaveAttribute('aria-valuemin', '0');
    expect(barra).toHaveAttribute('aria-valuemax', '100');
    expect(barra.firstElementChild).toHaveStyle({ width: '86%' });
  });

  it('los extremos 0 y 100 llenan nada o todo', () => {
    const { rerender } = render(<BarraPuntaje puntaje={0} />);
    expect(screen.getByRole('progressbar').firstElementChild).toHaveStyle({ width: '0%' });

    rerender(<BarraPuntaje puntaje={100} />);
    expect(screen.getByRole('progressbar').firstElementChild).toHaveStyle({ width: '100%' });
  });

  it('sin evaluación no hay barra: dice «Sin evaluar»', () => {
    render(<BarraPuntaje puntaje={null} />);

    expect(screen.getByText('Sin evaluar')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('un valor fuera de rango no desborda la barra', () => {
    const { rerender } = render(<BarraPuntaje puntaje={140} />);
    expect(screen.getByRole('progressbar').firstElementChild).toHaveStyle({ width: '100%' });

    rerender(<BarraPuntaje puntaje={-5} />);
    expect(screen.getByRole('progressbar').firstElementChild).toHaveStyle({ width: '0%' });
  });
});

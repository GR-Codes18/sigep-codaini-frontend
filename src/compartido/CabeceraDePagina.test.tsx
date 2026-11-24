import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CabeceraDePagina } from './CabeceraDePagina';

describe('CabeceraDePagina', () => {
  it('tiene un solo h1 con el título, el subtítulo y las acciones', () => {
    render(
      <CabeceraDePagina
        titulo="Postulaciones"
        subtitulo="Una línea de ayuda."
        acciones={<button type="button">Acción</button>}
      />,
    );

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Postulaciones' })).toBeInTheDocument();
    expect(screen.getByText('Una línea de ayuda.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument();
  });

  it('sin subtítulo ni acciones muestra solo el título', () => {
    render(<CabeceraDePagina titulo="Proyectos" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Proyectos' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

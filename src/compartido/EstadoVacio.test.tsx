import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EstadoVacio } from './EstadoVacio';

describe('EstadoVacio', () => {
  it('muestra título y descripción', () => {
    render(<EstadoVacio titulo="Sin tareas" descripcion="No tienes tareas en progreso" />);
    expect(screen.getByText('Sin tareas')).toBeInTheDocument();
    expect(screen.getByText('No tienes tareas en progreso')).toBeInTheDocument();
  });

  it('muestra la acción solo si se entrega', () => {
    const { rerender } = render(<EstadoVacio titulo="Vacío" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<EstadoVacio titulo="Vacío" accion={<button>Crear</button>} />);
    expect(screen.getByRole('button', { name: 'Crear' })).toBeInTheDocument();
  });
});

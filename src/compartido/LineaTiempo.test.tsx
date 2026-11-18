import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LineaTiempo } from './LineaTiempo';

describe('LineaTiempo', () => {
  it('muestra los eventos del más reciente al más antiguo', () => {
    render(
      <LineaTiempo
        eventos={[
          { id: '1', fecha: new Date(2026, 9, 1), autor: 'Sistema', accion: 'Creada' },
          {
            id: '2',
            fecha: new Date(2026, 9, 5),
            autor: 'Ana (Supervisor)',
            accion: 'Devuelta',
            nota: 'Falta probar',
          },
        ]}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Devuelta');
    expect(items[1]).toHaveTextContent('Creada');
    expect(screen.getByText('“Falta probar”')).toBeInTheDocument();
  });

  it('muestra el estado vacío sin eventos', () => {
    render(<LineaTiempo eventos={[]} />);
    expect(screen.getByText('Aún no hay actividad registrada.')).toBeInTheDocument();
  });
});

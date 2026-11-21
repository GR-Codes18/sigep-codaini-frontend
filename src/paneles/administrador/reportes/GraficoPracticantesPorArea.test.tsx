import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraficoPracticantesPorArea } from './GraficoPracticantesPorArea';

describe('GraficoPracticantesPorArea', () => {
  it('sin datos dice que no hay nada que graficar y no dibuja el gráfico', () => {
    render(<GraficoPracticantesPorArea datos={[]} />);

    expect(screen.getByRole('status')).toHaveTextContent('No hay practicantes por área');
    expect(screen.queryByTestId('grafico-practicantes-por-area')).toBeNull();
  });

  it('con datos dibuja el gráfico oculto a los lectores de pantalla (la tabla es la alternativa)', () => {
    render(<GraficoPracticantesPorArea datos={[{ area: 'Desarrollo', practicantes: 3 }]} />);

    expect(screen.getByTestId('grafico-practicantes-por-area')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});

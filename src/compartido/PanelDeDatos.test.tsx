import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PanelDeDatos } from './PanelDeDatos';

describe('PanelDeDatos', () => {
  it('es una región con el nombre de su título, que va dentro de la tarjeta', () => {
    render(
      <PanelDeDatos titulo="Datos del postulante">
        <p>Contenido</p>
      </PanelDeDatos>,
    );

    const region = screen.getByRole('region', { name: 'Datos del postulante' });
    expect(
      within(region).getByRole('heading', { level: 2, name: 'Datos del postulante' }),
    ).toBeInTheDocument();
    expect(within(region).getByText('Contenido')).toBeInTheDocument();
  });

  it('muestra las acciones del título', () => {
    render(
      <PanelDeDatos titulo="Evaluación" acciones={<button type="button">Ver</button>}>
        <p>x</p>
      </PanelDeDatos>,
    );

    const region = screen.getByRole('region', { name: 'Evaluación' });
    expect(within(region).getByRole('button', { name: 'Ver' })).toBeInTheDocument();
  });
});

describe('PanelDeDatos · variantes', () => {
  it('con `nombre` la región se llama así y no como el título', () => {
    render(
      <PanelDeDatos titulo="Por proyecto" nombre="Indicadores por proyecto">
        <p>x</p>
      </PanelDeDatos>,
    );

    expect(screen.getByRole('region', { name: 'Indicadores por proyecto' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Por proyecto' })).not.toBeInTheDocument();
  });

  it('sin relleno deja el contenido a los bordes y solo el título lleva relleno', () => {
    render(
      <PanelDeDatos titulo="Tabla" sinRelleno>
        <p>contenido</p>
      </PanelDeDatos>,
    );

    const region = screen.getByRole('region', { name: 'Tabla' });
    expect(region).not.toHaveClass('p-3');
    expect(screen.getByRole('heading', { name: 'Tabla' }).parentElement).toHaveClass('px-3');
  });
});

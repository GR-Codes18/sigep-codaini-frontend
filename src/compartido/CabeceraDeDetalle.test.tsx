import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { CabeceraDeDetalle } from './CabeceraDeDetalle';

function mostrar(propiedades: Partial<Parameters<typeof CabeceraDeDetalle>[0]> = {}) {
  render(
    <MemoryRouter>
      <CabeceraDeDetalle
        volver={{ a: '/administrador/postulaciones', etiqueta: 'Volver a postulaciones' }}
        titulo="Ana Pérez"
        {...propiedades}
      />
    </MemoryRouter>,
  );
}

describe('CabeceraDeDetalle', () => {
  it('tiene el enlace de vuelta con su nombre accesible y un solo h1', () => {
    mostrar();

    expect(screen.getByRole('link', { name: 'Volver a postulaciones' })).toHaveAttribute(
      'href',
      '/administrador/postulaciones',
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('el h1 comparte contenedor con las insignias y muestra metadatos, avatar y acciones', () => {
    mostrar({
      avatarDe: 'Ana Pérez',
      insignias: <span>Pendiente</span>,
      metadatos: 'Desarrollo · hace 3 días',
      acciones: <button type="button">Aprobar</button>,
    });

    expect(screen.getByRole('heading', { level: 1 }).parentElement).toHaveTextContent('Pendiente');
    expect(screen.getByText('AP')).toBeInTheDocument();
    expect(screen.getByText('Desarrollo · hace 3 días')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
  });

  it('sin avatar ni acciones no los dibuja', () => {
    mostrar();

    expect(screen.queryByText('AP')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('el orden de tabulación es: enlace de vuelta y luego las acciones', () => {
    mostrar({ acciones: <button type="button">Aprobar</button> });

    const enlace = screen.getByRole('link', { name: 'Volver a postulaciones' });
    const boton = screen.getByRole('button', { name: 'Aprobar' });
    expect(enlace.compareDocumentPosition(boton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

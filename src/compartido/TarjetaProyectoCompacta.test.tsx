import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Insignia } from './Insignia';
import { TarjetaProyecto } from './TarjetaProyecto';

function dentro(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const base = {
  nombre: 'Plataformas 2D',
  codigo: 'PL2D',
  estado: 'ACTIVO',
  detalles: [{ etiqueta: 'Supervisor', valor: 'Ana' }],
  enlace: '/practicante/proyectos/pry-pl2d',
};

describe('TarjetaProyecto: variante compacta', () => {
  it('sin la opción conserva el relleno y los espacios de siempre', () => {
    dentro(<TarjetaProyecto {...base} avance={40} />);

    const clases = screen.getByRole('link').className;
    expect(clases).toContain('p-4');
    expect(clases).not.toContain('p-3');
  });

  it('compacta usa menos relleno y menos aire entre bloques, con el mismo contenido', () => {
    dentro(<TarjetaProyecto {...base} avance={40} compacta />);

    const tarjeta = screen.getByRole('link');
    expect(tarjeta.className).toContain('p-3');
    expect(tarjeta.className).not.toContain('p-4');
    expect(tarjeta.querySelector('dl')!.className).toContain('mt-2');
    expect(tarjeta).toHaveTextContent('Plataformas 2D');
    expect(tarjeta).toHaveTextContent('Avance 40%');
  });

  it('la etiqueta puede ser la de mi participación («Ya no participas»)', () => {
    dentro(
      <TarjetaProyecto {...base} estado="YA_NO_PARTICIPAS" tipoEstado="participacion" atenuada />,
    );

    expect(screen.getByText('Ya no participas')).toBeInTheDocument();
  });
});

describe('Insignia: participación', () => {
  it('«Finalizado» y «Ya no participas» son neutras (grises)', () => {
    render(
      <>
        <Insignia tipo="participacion" estado="FINALIZADO" />
        <Insignia tipo="participacion" estado="YA_NO_PARTICIPAS" />
      </>,
    );

    expect(screen.getByText('Finalizado').className).toContain('state-neutral');
    expect(screen.getByText('Ya no participas').className).toContain('state-neutral');
  });
});

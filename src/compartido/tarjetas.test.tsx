import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { FileText } from 'lucide-react';
import { TarjetaMetrica } from './TarjetaMetrica';
import { TarjetaProyecto } from './TarjetaProyecto';

const dentroDeRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('TarjetaMetrica', () => {
  it('muestra título, valor y línea de apoyo', () => {
    dentroDeRouter(
      <TarjetaMetrica
        titulo="Postulaciones"
        valor={12}
        apoyo="3 requieren revisión"
        icono={FileText}
      />,
    );
    expect(screen.getByText('Postulaciones')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3 requieren revisión')).toBeInTheDocument();
  });

  it('es un enlace solo si recibe ruta', () => {
    dentroDeRouter(
      <TarjetaMetrica
        titulo="T"
        valor={1}
        apoyo="a"
        icono={FileText}
        enlace="/administrador/postulaciones"
      />,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/administrador/postulaciones');
  });
});

describe('TarjetaProyecto', () => {
  const base = {
    nombre: 'Plataforma 2D',
    codigo: 'PL2D',
    estado: 'ACTIVO',
    detalles: [{ etiqueta: 'Próxima reunión', valor: 'Sin definir' }],
    enlace: '/supervisor/proyectos/pl2d',
  };

  it('muestra la barra de avance en la variante normal', () => {
    dentroDeRouter(<TarjetaProyecto {...base} avance={40} />);
    expect(screen.getByText('Avance 40%')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('oculta el avance en la variante atenuada', () => {
    dentroDeRouter(<TarjetaProyecto {...base} avance={40} atenuada />);
    expect(screen.queryByText('Avance 40%')).not.toBeInTheDocument();
  });
});

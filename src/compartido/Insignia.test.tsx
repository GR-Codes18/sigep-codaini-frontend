import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Insignia } from './Insignia';

describe('Insignia', () => {
  it('muestra la etiqueta de cada tipo de estado', () => {
    render(
      <>
        <Insignia tipo="tarea" estado="ESPERANDO_SUPERVISION" />
        <Insignia tipo="postulacion" estado="RECHAZADA" />
        <Insignia tipo="proyecto" estado="EN_PAUSA" />
        <Insignia tipo="pr" estado="CON_CONFLICTOS" />
        <Insignia tipo="marca" estado="DEVUELTA" />
      </>,
    );
    expect(screen.getByText('Esperando supervisión')).toBeInTheDocument();
    expect(screen.getByText('Rechazada')).toBeInTheDocument();
    expect(screen.getByText('En pausa')).toBeInTheDocument();
    expect(screen.getByText('Con conflictos')).toBeInTheDocument();
    expect(screen.getByText('Devuelta con observaciones')).toBeInTheDocument();
  });

  it('el mismo nombre de estado cambia de color según el tipo (Pendiente)', () => {
    render(
      <>
        <Insignia tipo="postulacion" estado="PENDIENTE" />
        <Insignia tipo="pr" estado="PENDIENTE" />
      </>,
    );
    const [post, pr] = screen.getAllByText('Pendiente');
    expect(post.className).toContain('state-info');
    expect(pr.className).toContain('state-warning');
  });

  it('no muestra nada con un estado desconocido', () => {
    const { container } = render(<Insignia tipo="tarea" estado="INVENTADO" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('el catálogo de evaluación muestra «Activa» en verde e «Inactiva» en gris', () => {
    render(
      <>
        <Insignia tipo="catalogo" estado="ACTIVO" />
        <Insignia tipo="catalogo" estado="INACTIVO" />
      </>,
    );
    expect(screen.getByText('Activa').className).toContain('state-success');
    expect(screen.getByText('Inactiva').className).toContain('state-neutral');
  });

  it('el practicante es «Activo» (verde) o «Finalizado» (gris), y «Sin proyecto» es una marca ámbar', () => {
    render(
      <>
        <Insignia tipo="practicante" estado="ACTIVO" />
        <Insignia tipo="practicante" estado="FINALIZADO" />
        <Insignia tipo="practicante" estado="SIN_PROYECTO" />
      </>,
    );
    expect(screen.getByText('Activo').className).toContain('state-success');
    expect(screen.getByText('Finalizado').className).toContain('state-neutral');
    expect(screen.getByText('Sin proyecto').className).toContain('state-warning');
  });
});

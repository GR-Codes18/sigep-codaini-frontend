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
});

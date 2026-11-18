import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BarraBusqueda } from './BarraBusqueda';
import { PestanasConContador } from './PestanasConContador';
import { TablaCompacta } from './TablaCompacta';

describe('PestanasConContador', () => {
  it('muestra contadores y avisa al cambiar de pestaña', async () => {
    const user = userEvent.setup();
    const onCambiar = vi.fn();
    render(
      <PestanasConContador
        valor="a"
        onCambiar={onCambiar}
        pestanas={[
          { valor: 'a', etiqueta: 'Pendientes', contador: 3 },
          { valor: 'b', etiqueta: 'Aprobadas', contador: 0 },
        ]}
      />,
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Aprobadas/ }));
    expect(onCambiar).toHaveBeenCalledWith('b');
  });
});

describe('TablaCompacta', () => {
  const columnas = [{ clave: 'n', encabezado: 'Nombre', celda: (f: { n: string }) => f.n }];
  const vacio = { titulo: 'Sin datos' };

  it('muestra el estado vacío si no hay filas', () => {
    render(<TablaCompacta columnas={columnas} filas={[]} claveFila={(f) => f.n} vacio={vacio} />);
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
  });

  it('abre el detalle al hacer clic en una fila', async () => {
    const user = userEvent.setup();
    const onAbrir = vi.fn();
    render(
      <TablaCompacta
        columnas={columnas}
        filas={[{ n: 'Ana' }]}
        claveFila={(f) => f.n}
        onAbrir={onAbrir}
        vacio={vacio}
      />,
    );
    await user.click(screen.getByText('Ana'));
    expect(onAbrir).toHaveBeenCalledWith({ n: 'Ana' });
  });
});

describe('BarraBusqueda', () => {
  it('avisa lo que se escribe', async () => {
    const user = userEvent.setup();
    const onCambiar = vi.fn();
    render(<BarraBusqueda valor="" onCambiar={onCambiar} placeholder="Buscar por nombre" />);
    await user.type(screen.getByLabelText('Buscar por nombre'), 'a');
    expect(onCambiar).toHaveBeenCalledWith('a');
  });
});

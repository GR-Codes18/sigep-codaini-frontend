import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TableroKanban, type TareaTablero } from './TableroKanban';

const crear = (p: Partial<TareaTablero> & { id: string }): TareaTablero => ({
  idLegible: p.id,
  titulo: `Tarea ${p.id}`,
  estado: 'DISPONIBLE',
  fechaLimite: '2026-11-30',
  vencida: false,
  requiereSupervision: false,
  ...p,
});

describe('TableroKanban', () => {
  it('muestra las cuatro columnas', () => {
    render(<TableroKanban tareas={[]} onAbrir={() => {}} onVerTerminadas={() => {}} />);
    for (const n of ['Disponible', 'En progreso', 'Esperando supervisión', 'Terminada']) {
      expect(screen.getByRole('region', { name: n })).toBeInTheDocument();
    }
  });

  it('abre el detalle al hacer clic y no tiene botones de acción', async () => {
    const user = userEvent.setup();
    const onAbrir = vi.fn();
    render(
      <TableroKanban
        tareas={[crear({ id: 'tar-pl2d-001', idLegible: 'PL2D-001' })]}
        onAbrir={onAbrir}
        onVerTerminadas={() => {}}
      />,
    );
    await user.click(screen.getByText('Tarea tar-pl2d-001'));
    expect(onAbrir).toHaveBeenCalledWith('tar-pl2d-001');
    expect(
      screen.queryByRole('button', { name: /tomar|aprobar|devolver|liberar/i }),
    ).not.toBeInTheDocument();
  });

  it('muestra las terminadas que recibe, en el orden recibido, sin recortarlas ni reordenarlas', () => {
    const recibidas = ['C', 'A', 'B'].map((id) => crear({ id, estado: 'TERMINADA' }));
    render(<TableroKanban tareas={recibidas} onAbrir={() => {}} onVerTerminadas={() => {}} />);
    const col = screen.getByRole('region', { name: 'Terminada' });
    const titulos = within(col)
      .getAllByRole('button', { name: /Tarea [ABC]/ })
      .map((b) => b.textContent);
    expect(titulos[0]).toContain('Tarea C');
    expect(titulos[1]).toContain('Tarea A');
    expect(titulos[2]).toContain('Tarea B');
    expect(within(col).queryByText('Ver todas las terminadas')).not.toBeInTheDocument();
  });

  it('con más terminadas de las que muestra: el contador usa el total y aparece «Ver todas»', async () => {
    const user = userEvent.setup();
    const onVerTerminadas = vi.fn();
    const cinco = Array.from({ length: 5 }, (_, i) => crear({ id: `T-${i}`, estado: 'TERMINADA' }));
    render(
      <TableroKanban
        tareas={cinco}
        totalTerminadas={9}
        onAbrir={() => {}}
        onVerTerminadas={onVerTerminadas}
      />,
    );
    const col = screen.getByRole('region', { name: 'Terminada' });
    expect(within(col).getByRole('heading')).toHaveTextContent('9');
    expect(within(col).getAllByRole('button', { name: /Tarea T-/ })).toHaveLength(5);
    await user.click(within(col).getByText('Ver todas las terminadas'));
    expect(onVerTerminadas).toHaveBeenCalled();
  });

  it('con el total igual a lo mostrado no hay enlace «Ver todas»', () => {
    const cinco = Array.from({ length: 5 }, (_, i) => crear({ id: `T-${i}`, estado: 'TERMINADA' }));
    render(
      <TableroKanban
        tareas={cinco}
        totalTerminadas={5}
        onAbrir={() => {}}
        onVerTerminadas={() => {}}
      />,
    );
    expect(screen.queryByText('Ver todas las terminadas')).not.toBeInTheDocument();
  });

  it('"Solo mis tareas" filtra y solo aparece si se permite', async () => {
    const user = userEvent.setup();
    const tareas = [
      crear({ id: 'A', estado: 'EN_PROGRESO', esMia: true }),
      crear({ id: 'B', estado: 'EN_PROGRESO' }),
    ];
    const { rerender } = render(
      <TableroKanban tareas={tareas} onAbrir={() => {}} onVerTerminadas={() => {}} />,
    );
    expect(screen.queryByText('Solo mis tareas')).not.toBeInTheDocument();
    rerender(
      <TableroKanban
        tareas={tareas}
        onAbrir={() => {}}
        onVerTerminadas={() => {}}
        permitirSoloMias
      />,
    );
    await user.click(screen.getByText('Solo mis tareas'));
    expect(screen.getByText('Tarea A')).toBeInTheDocument();
    expect(screen.queryByText('Tarea B')).not.toBeInTheDocument();
  });

  it('marca en rojo la fecha según «vencida» de la consulta, sin calcularla', () => {
    render(
      <TableroKanban
        tareas={[
          crear({ id: 'a', idLegible: 'PL2D-001', fechaLimite: '2026-10-24', vencida: false }),
          crear({ id: 'b', idLegible: 'PL2D-002', fechaLimite: '2026-10-23', vencida: true }),
          crear({
            id: 'c',
            idLegible: 'PL2D-003',
            estado: 'TERMINADA',
            fechaLimite: '2026-10-23',
            vencida: false,
          }),
        ]}
        onAbrir={() => {}}
        onVerTerminadas={() => {}}
      />,
    );

    expect(screen.getByText('Límite 24/10/2026')).toHaveClass('text-text-2');
    const fechaAyer = screen.getAllByText('Límite 23/10/2026');
    expect(fechaAyer).toHaveLength(2);
    expect(fechaAyer[0]).toHaveClass('text-danger-text');
    expect(fechaAyer[1]).toHaveClass('text-text-2');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TableroKanban, type TareaTablero } from './TableroKanban';

const hoy = '2026-10-24';
const crear = (p: Partial<TareaTablero> & { id: string }): TareaTablero => ({
  idLegible: p.id,
  titulo: `Tarea ${p.id}`,
  estado: 'DISPONIBLE',
  fechaLimite: '2026-11-30',
  requiereSupervision: false,
  ...p,
});

describe('TableroKanban', () => {
  it('muestra las cuatro columnas', () => {
    render(<TableroKanban tareas={[]} onAbrir={() => {}} onVerTerminadas={() => {}} hoy={hoy} />);
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
        hoy={hoy}
      />,
    );
    await user.click(screen.getByText('Tarea tar-pl2d-001'));
    expect(onAbrir).toHaveBeenCalledWith('tar-pl2d-001');
    expect(
      screen.queryByRole('button', { name: /tomar|aprobar|devolver|liberar/i }),
    ).not.toBeInTheDocument();
  });

  it('en Terminada muestra solo las 5 más recientes y el enlace a todas', () => {
    const terminadas = Array.from({ length: 7 }, (_, i) =>
      crear({ id: `T-${i}`, estado: 'TERMINADA', fechaTermino: new Date(2026, 9, i + 1) }),
    );
    render(
      <TableroKanban tareas={terminadas} onAbrir={() => {}} onVerTerminadas={() => {}} hoy={hoy} />,
    );
    const col = screen.getByRole('region', { name: 'Terminada' });
    expect(within(col).getAllByRole('button', { name: /Tarea T-/ })).toHaveLength(5);
    expect(within(col).queryByText('Tarea T-0')).not.toBeInTheDocument();
    expect(within(col).getByText('Ver todas las terminadas')).toBeInTheDocument();
  });

  it('"Solo mis tareas" filtra y solo aparece si se permite', async () => {
    const user = userEvent.setup();
    const tareas = [
      crear({ id: 'A', estado: 'EN_PROGRESO', esMia: true }),
      crear({ id: 'B', estado: 'EN_PROGRESO' }),
    ];
    const { rerender } = render(
      <TableroKanban tareas={tareas} onAbrir={() => {}} onVerTerminadas={() => {}} hoy={hoy} />,
    );
    expect(screen.queryByText('Solo mis tareas')).not.toBeInTheDocument();
    rerender(
      <TableroKanban
        tareas={tareas}
        onAbrir={() => {}}
        onVerTerminadas={() => {}}
        hoy={hoy}
        permitirSoloMias
      />,
    );
    await user.click(screen.getByText('Solo mis tareas'));
    expect(screen.getByText('Tarea A')).toBeInTheDocument();
    expect(screen.queryByText('Tarea B')).not.toBeInTheDocument();
  });

  it('solo marca vencidas las fechas anteriores a hoy y nunca las terminadas', () => {
    render(
      <TableroKanban
        tareas={[
          crear({ id: 'hoy', idLegible: 'PL2D-001', fechaLimite: hoy }),
          crear({ id: 'vencida', idLegible: 'PL2D-002', fechaLimite: '2026-10-23' }),
          crear({
            id: 'terminada',
            idLegible: 'PL2D-003',
            estado: 'TERMINADA',
            fechaLimite: '2026-10-23',
          }),
        ]}
        onAbrir={() => {}}
        onVerTerminadas={() => {}}
        hoy={hoy}
      />,
    );

    expect(screen.getByText('Límite 24/10/2026')).toHaveClass('text-text-2');
    const fechaAyer = screen.getAllByText('Límite 23/10/2026');
    expect(fechaAyer).toHaveLength(2);
    expect(fechaAyer[0]).toHaveClass('text-danger-text');
    expect(fechaAyer[1]).toHaveClass('text-text-2');
  });
});

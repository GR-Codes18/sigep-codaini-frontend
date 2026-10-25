import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DetalleTarea, type TareaDetalle } from './DetalleTarea';

const tarea: TareaDetalle = {
  id: 'PL2D-003',
  titulo: 'Tablero Kanban',
  descripcion: 'Cuatro columnas',
  estado: 'ESPERANDO_SUPERVISION',
  proyecto: 'Plataforma 2D',
  fechaLimite: new Date(2026, 10, 30),
  requiereSupervision: true,
  requierePr: true,
};

describe('DetalleTarea', () => {
  it('sin acciones queda en solo lectura', () => {
    render(<DetalleTarea tarea={tarea} acciones={[]} eventos={[]} onEjecutar={async () => {}} />);
    expect(screen.getByText('Tablero Kanban')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('muestra solo los botones de las acciones recibidas y ejecuta las simples', async () => {
    const user = userEvent.setup();
    const onEjecutar = vi.fn().mockResolvedValue(undefined);
    render(
      <DetalleTarea
        tarea={tarea}
        acciones={[{ clave: 'aprobar', etiqueta: 'Aprobar' }]}
        eventos={[]}
        onEjecutar={onEjecutar}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Devolver' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Aprobar' }));
    expect(onEjecutar).toHaveBeenCalledWith('aprobar');
  });

  it('una acción con nota obligatoria abre el modal y envía la nota', async () => {
    const user = userEvent.setup();
    const onEjecutar = vi.fn().mockResolvedValue(undefined);
    render(
      <DetalleTarea
        tarea={tarea}
        acciones={[
          {
            clave: 'devolver',
            etiqueta: 'Devolver',
            pedirMotivo: { etiqueta: 'Nota', obligatorio: true, minimo: 5 },
          },
        ]}
        eventos={[]}
        onEjecutar={onEjecutar}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Devolver' }));
    const dialogo = screen.getByRole('dialog');
    await user.type(within(dialogo).getByLabelText('Nota'), 'Falta probar');
    await user.click(within(dialogo).getByRole('button', { name: 'Devolver' }));
    await waitFor(() => expect(onEjecutar).toHaveBeenCalledWith('devolver', 'Falta probar'));
  });
});

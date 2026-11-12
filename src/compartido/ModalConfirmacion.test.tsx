import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalConfirmacion } from './ModalConfirmacion';

const base = {
  abierto: true,
  titulo: 'Rechazar postulación',
  etiquetaConfirmar: 'Rechazar',
};

describe('ModalConfirmacion', () => {
  it('con motivo obligatorio, deshabilita confirmar hasta cumplir el mínimo', async () => {
    const user = userEvent.setup();
    render(
      <ModalConfirmacion
        {...base}
        onCerrar={() => {}}
        onConfirmar={() => {}}
        pedirMotivo={{ etiqueta: 'Motivo', obligatorio: true, minimo: 5 }}
      />,
    );
    const confirmar = screen.getByRole('button', { name: 'Rechazar' });
    expect(confirmar).toBeDisabled();
    await user.type(screen.getByLabelText('Motivo'), 'abc');
    expect(confirmar).toBeDisabled();
    await user.type(screen.getByLabelText('Motivo'), 'def');
    expect(confirmar).toBeEnabled();
  });

  it('confirma con el motivo y se cierra', async () => {
    const user = userEvent.setup();
    const onConfirmar = vi.fn();
    const onCerrar = vi.fn();
    render(
      <ModalConfirmacion
        {...base}
        onCerrar={onCerrar}
        onConfirmar={onConfirmar}
        pedirMotivo={{ etiqueta: 'Motivo', obligatorio: true, minimo: 3 }}
      />,
    );
    await user.type(screen.getByLabelText('Motivo'), '  perfil incompleto ');
    await user.click(screen.getByRole('button', { name: 'Rechazar' }));
    await waitFor(() => expect(onCerrar).toHaveBeenCalled());
    expect(onConfirmar).toHaveBeenCalledWith('perfil incompleto');
  });

  it('si la acción falla, muestra el error y no se cierra', async () => {
    const user = userEvent.setup();
    const onCerrar = vi.fn();
    render(
      <ModalConfirmacion
        {...base}
        onCerrar={onCerrar}
        onConfirmar={() => Promise.reject(new Error('La tarea ya fue tomada'))}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Rechazar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La tarea ya fue tomada');
    expect(onCerrar).not.toHaveBeenCalled();
  });

  it('sin motivo, confirma directamente', async () => {
    const user = userEvent.setup();
    const onConfirmar = vi.fn();
    render(<ModalConfirmacion {...base} onCerrar={() => {}} onConfirmar={onConfirmar} />);
    await user.click(screen.getByRole('button', { name: 'Rechazar' }));
    await waitFor(() => expect(onConfirmar).toHaveBeenCalledWith(undefined));
  });
});

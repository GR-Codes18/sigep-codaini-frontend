import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalCrearPR } from './ModalCrearPR';

const base = {
  abierto: true,
  tituloPropuesto: 'PL2D-018 Pantalla de login',
  plantillaDescripcion: 'Qué se hizo:',
  ramas: ['feat/login', 'feat/registro', 'fix/menu'],
  ramaBase: 'main',
};

describe('ModalCrearPR', () => {
  it('propone el título, muestra la rama base fija y el aviso', () => {
    render(<ModalCrearPR {...base} onCerrar={() => {}} onCrear={async () => {}} />);
    expect(screen.getByLabelText('Título')).toHaveValue('PL2D-018 Pantalla de login');
    expect(screen.getByLabelText('Rama base')).toHaveValue('main');
    expect(screen.getByLabelText('Rama base')).toBeDisabled();
    expect(screen.getByText('¿No ves tu rama? Asegúrate de haberla subido.')).toBeInTheDocument();
  });

  it('filtra las ramas con el buscador', async () => {
    const user = userEvent.setup();
    render(<ModalCrearPR {...base} onCerrar={() => {}} onCrear={async () => {}} />);
    await user.type(screen.getByLabelText('Rama de trabajo'), 'fix');
    expect(screen.getByRole('option', { name: 'fix/menu' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'feat/login' })).not.toBeInTheDocument();
  });

  it('exige elegir una rama antes de crear', async () => {
    const user = userEvent.setup();
    const onCrear = vi.fn();
    render(<ModalCrearPR {...base} onCerrar={() => {}} onCrear={onCrear} />);
    await user.click(screen.getByRole('button', { name: 'Crear PR' }));
    expect(await screen.findByText('Elige una rama de trabajo')).toBeInTheDocument();
    expect(onCrear).not.toHaveBeenCalled();
  });

  it('crea con los datos y se cierra', async () => {
    const user = userEvent.setup();
    const onCrear = vi.fn().mockResolvedValue(undefined);
    const onCerrar = vi.fn();
    render(<ModalCrearPR {...base} onCerrar={onCerrar} onCrear={onCrear} />);
    await user.click(screen.getByRole('button', { name: 'feat/login' }));
    await user.click(screen.getByRole('button', { name: 'Crear PR' }));
    await waitFor(() => expect(onCerrar).toHaveBeenCalled());
    expect(onCrear).toHaveBeenCalledWith({
      titulo: 'PL2D-018 Pantalla de login',
      descripcion: 'Qué se hizo:',
      ramaOrigen: 'feat/login',
    });
  });

  it('si falla, muestra el motivo y no se cierra', async () => {
    const user = userEvent.setup();
    const onCerrar = vi.fn();
    render(
      <ModalCrearPR
        {...base}
        onCerrar={onCerrar}
        onCrear={() => Promise.reject(new Error('Rama inexistente'))}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'feat/login' }));
    await user.click(screen.getByRole('button', { name: 'Crear PR' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Rama inexistente');
    expect(onCerrar).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalContrasenaTemporal, type ContrasenaTemporal } from './ModalContrasenaTemporal';

const DATOS: ContrasenaTemporal = {
  nombre: 'Ana Quispe',
  correo: 'ana@correo.demo',
  contrasena: 'Kp7mQx2NvB',
};

function simularPortapapeles(escribir: () => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn(escribir) },
    configurable: true,
  });
  return navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
}

describe('ModalContrasenaTemporal', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('cerrado (sin datos) no muestra nada', () => {
    render(<ModalContrasenaTemporal datos={null} onCerrar={() => {}} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('muestra el usuario, la contraseña temporal y a quién se la entrega', () => {
    render(<ModalContrasenaTemporal datos={DATOS} onCerrar={() => {}} />);

    const dialogo = screen.getByRole('dialog', { name: 'Cuenta de practicante creada' });
    expect(dialogo).toHaveTextContent('Ana Quispe');
    expect(dialogo).toHaveTextContent('ana@correo.demo');
    expect(screen.getByLabelText('Contraseña temporal')).toHaveTextContent('Kp7mQx2NvB');
  });

  it('con un título propio (al restablecer una contraseña) lo usa en lugar del de la cuenta creada', () => {
    render(
      <ModalContrasenaTemporal
        datos={{ ...DATOS, titulo: 'Contraseña restablecida' }}
        onCerrar={() => {}}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Contraseña restablecida' })).toBeInTheDocument();
    expect(screen.queryByText('Cuenta de practicante creada')).not.toBeInTheDocument();
  });

  it('avisa que se muestra una sola vez y que se entrega por fuera del sistema', () => {
    render(<ModalContrasenaTemporal datos={DATOS} onCerrar={() => {}} />);

    expect(screen.getByText(/una sola vez/)).toBeInTheDocument();
    expect(screen.getByText(/por fuera del sistema \(WhatsApp o Discord\)/)).toBeInTheDocument();
  });

  it('«Entendido» cierra', async () => {
    const user = userEvent.setup();
    const onCerrar = vi.fn();
    render(<ModalContrasenaTemporal datos={DATOS} onCerrar={onCerrar} />);

    await user.click(screen.getByRole('button', { name: 'Entendido' }));

    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('no se cierra por accidente: ni con Escape ni con un clic fuera ni con una «X»', async () => {
    const user = userEvent.setup();
    const onCerrar = vi.fn();
    render(<ModalContrasenaTemporal datos={DATOS} onCerrar={onCerrar} />);

    await user.keyboard('{Escape}');
    await user.click(document.querySelector('[data-slot="dialog-overlay"]') as HTMLElement);

    expect(onCerrar).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /close|cerrar/i })).not.toBeInTheDocument();
  });

  it('«Copiar contraseña» copia la contraseña y lo confirma', async () => {
    const user = userEvent.setup();
    const escribir = simularPortapapeles(async () => {});
    render(<ModalContrasenaTemporal datos={DATOS} onCerrar={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Copiar contraseña' }));

    expect(escribir).toHaveBeenCalledWith('Kp7mQx2NvB');
    expect(await screen.findByText('Contraseña copiada.')).toBeInTheDocument();
  });

  it('si no se puede copiar, avisa que se copie a mano y el modal sigue abierto', async () => {
    const user = userEvent.setup();
    simularPortapapeles(async () => {
      throw new Error('sin permiso');
    });
    render(<ModalContrasenaTemporal datos={DATOS} onCerrar={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Copiar contraseña' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo copiar');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña temporal')).toHaveTextContent('Kp7mQx2NvB');
  });

  it('al cerrar, la contraseña desaparece del documento', () => {
    const { rerender } = render(<ModalContrasenaTemporal datos={DATOS} onCerrar={() => {}} />);
    expect(screen.getByLabelText('Contraseña temporal')).toBeInTheDocument();

    rerender(<ModalContrasenaTemporal datos={null} onCerrar={() => {}} />);

    expect(screen.queryByText('Kp7mQx2NvB')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('Kp7mQx2NvB');
  });
});

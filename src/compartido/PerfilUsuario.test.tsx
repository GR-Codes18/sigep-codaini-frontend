import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PerfilUsuario } from './PerfilUsuario';

const valores = {
  nombre: 'Ana',
  correo: 'ana@codaini.demo',
  celular: '999888777',
  discord: 'ana#1',
  github: 'ana-dev',
  disponibilidad: 20,
};
const base = {
  cuenta: [{ etiqueta: 'Rol', valor: 'Supervisor' }],
  valores,
  onGuardarPerfil: async () => ({ ok: true as const, valor: { ...valores, disponibilidad: 20 } }),
  onCambiarContrasena: async () => ({ ok: true as const, valor: undefined }),
};

describe('PerfilUsuario', () => {
  it('solo permite editar los campos habilitados para el rol', () => {
    render(<PerfilUsuario {...base} editables={['celular', 'discord', 'github']} />);
    expect(screen.getByLabelText('Nombre')).toBeDisabled();
    expect(screen.getByLabelText('Correo')).toBeDisabled();
    expect(screen.getByLabelText('Celular')).toBeEnabled();
    expect(screen.queryByLabelText(/Disponibilidad/)).not.toBeInTheDocument();
  });

  it('valida el correo al guardar', async () => {
    const user = userEvent.setup();
    const onGuardarPerfil = vi.fn().mockResolvedValue({
      ok: true,
      valor: { ...valores, disponibilidad: 20 },
    });
    render(
      <PerfilUsuario
        {...base}
        onGuardarPerfil={onGuardarPerfil}
        editables={['nombre', 'correo', 'celular']}
      />,
    );
    const correo = screen.getByLabelText('Correo');
    await user.clear(correo);
    await user.type(correo, 'malo');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Ingresa un correo válido')).toBeInTheDocument();
    expect(onGuardarPerfil).not.toHaveBeenCalled();
  });

  it('exige contraseña nueva de 8+ caracteres, distinta y confirmada', async () => {
    const user = userEvent.setup();
    const onCambiarContrasena = vi.fn().mockResolvedValue({ ok: true, valor: undefined });
    render(<PerfilUsuario {...base} onCambiarContrasena={onCambiarContrasena} editables={[]} />);
    await user.type(screen.getByLabelText('Contraseña actual'), 'demo12345');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'corta');
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'otra');
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    expect(await screen.findByText('Mínimo 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(onCambiarContrasena).not.toHaveBeenCalled();
  });

  it('cambia la contraseña con datos válidos', async () => {
    const user = userEvent.setup();
    const onCambiarContrasena = vi.fn().mockResolvedValue({ ok: true, valor: undefined });
    render(<PerfilUsuario {...base} onCambiarContrasena={onCambiarContrasena} editables={[]} />);
    await user.type(screen.getByLabelText('Contraseña actual'), 'demo12345');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'nueva-clave-1');
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'nueva-clave-1');
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    expect(onCambiarContrasena).toHaveBeenCalledWith({
      actual: 'demo12345',
      nueva: 'nueva-clave-1',
      confirmacion: 'nueva-clave-1',
    });
  });

  it('muestra el error devuelto por el servicio y conserva los datos editados', async () => {
    const user = userEvent.setup();
    const onGuardarPerfil = vi.fn().mockResolvedValue({
      ok: false,
      codigo: 'CORREO_YA_REGISTRADO',
      mensaje: 'Este correo ya está asociado a otra cuenta.',
      campos: { correo: 'Este correo ya está asociado a otra cuenta.' },
    });
    render(
      <PerfilUsuario
        {...base}
        onGuardarPerfil={onGuardarPerfil}
        editables={['nombre', 'correo', 'celular']}
      />,
    );
    const nombre = screen.getByLabelText('Nombre');
    await user.clear(nombre);
    await user.type(nombre, 'Ana Nueva');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este correo ya está asociado a otra cuenta.',
    );
    expect(screen.getByLabelText('Correo')).toHaveAttribute('aria-invalid', 'true');
    expect(nombre).toHaveValue('Ana Nueva');
  });
});

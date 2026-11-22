import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CampoDelFormulario } from './PerfilUsuario';
import { PerfilUsuario } from './PerfilUsuario';
import type { DatosPerfil } from './esquemasPerfil';

const valores: DatosPerfil = {
  nombre: 'Ana',
  correo: 'ana@codaini.demo',
  celular: '999888777',
  discord: 'ana.dev',
  cuenta_github: 'ana-dev',
  disponibilidad_horaria: '20',
};

const todos = (editables: string[]): CampoDelFormulario[] =>
  (Object.keys(valores) as CampoDelFormulario['campo'][]).map((campo) => ({
    campo,
    editable: editables.includes(campo),
  }));

const base = {
  cuenta: [{ etiqueta: 'Rol', valor: 'Supervisor' }],
  valores,
  campos: todos(['nombre', 'correo', 'celular']),
  onGuardarPerfil: async () => ({ ok: true as const, valor: null }),
  onCambiarContrasena: async () => ({ ok: true as const, valor: undefined }),
};

describe('PerfilUsuario', () => {
  it('muestra solo los campos que recibe: los que el rol no tiene no aparecen', () => {
    render(
      <PerfilUsuario
        {...base}
        campos={[
          { campo: 'nombre', editable: true },
          { campo: 'correo', editable: true },
          { campo: 'celular', editable: true },
        ]}
      />,
    );

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.queryByLabelText('Usuario de Discord')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Cuenta de GitHub')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Disponibilidad/)).not.toBeInTheDocument();
  });

  it('los campos no editables se muestran en solo lectura y los demás se pueden editar', () => {
    render(
      <PerfilUsuario
        {...base}
        campos={[
          { campo: 'nombre', editable: false },
          { campo: 'correo', editable: false },
          { campo: 'celular', editable: true },
          { campo: 'discord', editable: true },
        ]}
      />,
    );

    expect(screen.getByLabelText('Nombre')).toBeDisabled();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana');
    expect(screen.getByLabelText('Correo')).toBeDisabled();
    expect(screen.getByLabelText('Celular')).toBeEnabled();
    expect(screen.getByLabelText('Usuario de Discord')).toBeEnabled();
  });

  it('muestra los datos de la cuenta', () => {
    render(
      <PerfilUsuario {...base} cuenta={[{ etiqueta: 'Fecha de alta', valor: '2 ene 2026' }]} />,
    );

    expect(screen.getByText('Fecha de alta')).toBeInTheDocument();
    expect(screen.getByText('2 ene 2026')).toBeInTheDocument();
  });

  it('valida el correo con la regla del servicio y no llama a guardar', async () => {
    const user = userEvent.setup();
    const onGuardarPerfil = vi.fn().mockResolvedValue({ ok: true, valor: null });
    render(<PerfilUsuario {...base} onGuardarPerfil={onGuardarPerfil} />);

    const correo = screen.getByLabelText('Correo');
    await user.clear(correo);
    await user.type(correo, 'malo');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Escribe un correo válido.')).toBeInTheDocument();
    expect(onGuardarPerfil).not.toHaveBeenCalled();
  });

  it.each(['12345678', '812345678', '9123456789', 'abcdefghi', '+51 999888777'])(
    'rechaza el celular «%s» con la regla del servicio (9 dígitos que empiezan con 9)',
    async (celular) => {
      const user = userEvent.setup();
      const onGuardarPerfil = vi.fn().mockResolvedValue({ ok: true, valor: null });
      render(<PerfilUsuario {...base} onGuardarPerfil={onGuardarPerfil} />);

      const campo = screen.getByLabelText('Celular');
      await user.clear(campo);
      await user.type(campo, celular);
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(
        await screen.findByText('El celular debe tener 9 dígitos y empezar con 9.'),
      ).toBeInTheDocument();
      expect(onGuardarPerfil).not.toHaveBeenCalled();
    },
  );

  it('acepta un celular válido y envía los valores recortados', async () => {
    const user = userEvent.setup();
    const onGuardarPerfil = vi.fn().mockResolvedValue({ ok: true, valor: null });
    render(<PerfilUsuario {...base} onGuardarPerfil={onGuardarPerfil} />);

    const nombre = screen.getByLabelText('Nombre');
    await user.clear(nombre);
    await user.type(nombre, '  Ana Nueva  ');
    const celular = screen.getByLabelText('Celular');
    await user.clear(celular);
    await user.type(celular, '911222333');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(onGuardarPerfil).toHaveBeenCalledWith({
      ...valores,
      nombre: 'Ana Nueva',
      celular: '911222333',
    });
  });

  it('un nombre vacío o de solo espacios no se envía', async () => {
    const user = userEvent.setup();
    const onGuardarPerfil = vi.fn().mockResolvedValue({ ok: true, valor: null });
    render(<PerfilUsuario {...base} onGuardarPerfil={onGuardarPerfil} />);

    const nombre = screen.getByLabelText('Nombre');
    await user.clear(nombre);
    await user.type(nombre, '   ');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Escribe tu nombre.')).toBeInTheDocument();
    expect(onGuardarPerfil).not.toHaveBeenCalled();
  });

  it('un campo de solo lectura no se valida: no bloquea guardar los demás', async () => {
    const user = userEvent.setup();
    const onGuardarPerfil = vi.fn().mockResolvedValue({ ok: true, valor: null });
    render(
      <PerfilUsuario
        {...base}
        valores={{ ...valores, correo: 'correo-heredado-sin-formato' }}
        campos={[
          { campo: 'nombre', editable: false },
          { campo: 'correo', editable: false },
          { campo: 'celular', editable: true },
        ]}
        onGuardarPerfil={onGuardarPerfil}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(onGuardarPerfil).toHaveBeenCalledTimes(1);
  });

  it('conserva lo que se está escribiendo si llegan los mismos valores en un objeto nuevo', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<PerfilUsuario {...base} />);

    const nombre = screen.getByLabelText('Nombre');
    await user.clear(nombre);
    await user.type(nombre, 'Ana a medias');
    rerender(<PerfilUsuario {...base} valores={{ ...valores }} />);

    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana a medias');
  });

  it('reinicia el formulario cuando los valores cambian de verdad', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<PerfilUsuario {...base} />);

    const nombre = screen.getByLabelText('Nombre');
    await user.clear(nombre);
    await user.type(nombre, 'Ana a medias');
    rerender(<PerfilUsuario {...base} valores={{ ...valores, nombre: 'Ana Guardada' }} />);

    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana Guardada');
  });

  it('exige contraseña nueva del largo del servicio, distinta y confirmada', async () => {
    const user = userEvent.setup();
    const onCambiarContrasena = vi.fn().mockResolvedValue({ ok: true, valor: undefined });
    render(<PerfilUsuario {...base} onCambiarContrasena={onCambiarContrasena} />);

    await user.type(screen.getByLabelText('Contraseña actual'), 'demo12345');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'corta');
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'otra');
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByText('Mínimo 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(onCambiarContrasena).not.toHaveBeenCalled();
  });

  it('la contraseña nueva no puede ser la actual', async () => {
    const user = userEvent.setup();
    const onCambiarContrasena = vi.fn().mockResolvedValue({ ok: true, valor: undefined });
    render(<PerfilUsuario {...base} onCambiarContrasena={onCambiarContrasena} />);

    await user.type(screen.getByLabelText('Contraseña actual'), 'demo12345');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'demo12345');
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'demo12345');
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByText('Debe ser distinta de la actual')).toBeInTheDocument();
    expect(onCambiarContrasena).not.toHaveBeenCalled();
  });

  it('cambia la contraseña con datos válidos y limpia el formulario', async () => {
    const user = userEvent.setup();
    const onCambiarContrasena = vi.fn().mockResolvedValue({ ok: true, valor: undefined });
    render(<PerfilUsuario {...base} onCambiarContrasena={onCambiarContrasena} />);

    await user.type(screen.getByLabelText('Contraseña actual'), 'demo12345');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'nueva-clave-1');
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'nueva-clave-1');
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(onCambiarContrasena).toHaveBeenCalledWith({
      actual: 'demo12345',
      nueva: 'nueva-clave-1',
      confirmacion: 'nueva-clave-1',
    });
    expect(await screen.findByLabelText('Contraseña actual')).toHaveValue('');
  });

  it('muestra el error devuelto por el servicio junto al campo y conserva los datos editados', async () => {
    const user = userEvent.setup();
    const onGuardarPerfil = vi.fn().mockResolvedValue({
      ok: false,
      codigo: 'CORREO_YA_REGISTRADO',
      mensaje: 'Ya existe una cuenta con ese correo.',
      campos: { correo: 'Ya existe una cuenta con ese correo.' },
    });
    render(<PerfilUsuario {...base} onGuardarPerfil={onGuardarPerfil} />);

    const nombre = screen.getByLabelText('Nombre');
    await user.clear(nombre);
    await user.type(nombre, 'Ana Nueva');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya existe una cuenta con ese correo.',
    );
    expect(screen.getByLabelText('Correo')).toHaveAttribute('aria-invalid', 'true');
    expect(nombre).toHaveValue('Ana Nueva');
  });
});

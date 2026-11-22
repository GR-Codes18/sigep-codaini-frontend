import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fallo } from '@/services';
import { FormularioNombre } from './FormularioNombre';

const ok = async () => ({ ok: true as const, valor: null });

function mostrar(props: Partial<Parameters<typeof FormularioNombre>[0]> = {}) {
  const onCancelar = vi.fn();
  const onGuardar = props.onGuardar ?? vi.fn(ok);
  render(
    <FormularioNombre
      etiqueta="Nombre del área"
      etiquetaGuardar="Guardar nombre"
      onCancelar={onCancelar}
      {...props}
      onGuardar={onGuardar}
    />,
  );
  return { onCancelar, onGuardar };
}

describe('FormularioNombre', () => {
  it('muestra el campo con su etiqueta y el valor inicial', () => {
    mostrar({ valorInicial: 'Software' });

    expect(screen.getByRole('form', { name: 'Nombre del área' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nombre del área' })).toHaveValue('Software');
  });

  it('envía lo escrito y, si sale bien, se cierra', async () => {
    const user = userEvent.setup();
    const { onGuardar, onCancelar } = mostrar();

    await user.type(screen.getByRole('textbox', { name: 'Nombre del área' }), 'Ciberseguridad');
    await user.click(screen.getByRole('button', { name: 'Guardar nombre' }));

    expect(onGuardar).toHaveBeenCalledWith('Ciberseguridad');
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it('Enter también envía', async () => {
    const user = userEvent.setup();
    const { onGuardar } = mostrar();

    await user.type(screen.getByRole('textbox', { name: 'Nombre del área' }), 'Redes{Enter}');

    expect(onGuardar).toHaveBeenCalledWith('Redes');
  });

  it('si el servicio rechaza, muestra su mensaje y el formulario sigue abierto con lo escrito', async () => {
    const user = userEvent.setup();
    const onGuardar = vi.fn(async () =>
      fallo('NOMBRE_DUPLICADO', 'Ya existe.', { nombre: 'Ya existe un área con ese nombre.' }),
    );
    const { onCancelar } = mostrar({ onGuardar });

    await user.type(screen.getByRole('textbox', { name: 'Nombre del área' }), 'Software');
    await user.click(screen.getByRole('button', { name: 'Guardar nombre' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe un área con ese nombre.');
    expect(screen.getByRole('textbox', { name: 'Nombre del área' })).toHaveValue('Software');
    expect(screen.getByRole('textbox', { name: 'Nombre del área' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(onCancelar).not.toHaveBeenCalled();
  });

  it('sin error por campo muestra el mensaje general', async () => {
    const user = userEvent.setup();
    const onGuardar = vi.fn(async () => fallo('NO_AUTORIZADO', 'No tienes permiso.'));
    mostrar({ onGuardar });

    await user.click(screen.getByRole('button', { name: 'Guardar nombre' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes permiso.');
  });

  it('el error desaparece al volver a intentar', async () => {
    const user = userEvent.setup();
    const onGuardar = vi
      .fn()
      .mockResolvedValueOnce(fallo('NOMBRE_DUPLICADO', 'Repetido.'))
      .mockResolvedValueOnce({ ok: true, valor: null });
    mostrar({ onGuardar });

    await user.click(screen.getByRole('button', { name: 'Guardar nombre' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar nombre' }));

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('«Cancelar» cierra sin enviar', async () => {
    const user = userEvent.setup();
    const { onGuardar, onCancelar } = mostrar();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancelar).toHaveBeenCalledTimes(1);
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it('mientras guarda deshabilita el campo y los botones', async () => {
    const user = userEvent.setup();
    let terminar: () => void = () => {};
    const onGuardar = vi.fn(
      () =>
        new Promise<{ ok: true; valor: null }>((resolver) => {
          terminar = () => resolver({ ok: true, valor: null });
        }),
    );
    mostrar({ onGuardar });

    await user.click(screen.getByRole('button', { name: 'Guardar nombre' }));

    expect(await screen.findByRole('button', { name: 'Guardando…' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Nombre del área' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    terminar();
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { crearSemilla } from '@/data/semilla';
import { useAlmacen } from '@/data';
import { PaginaPerfil } from './PaginaPerfil';
import { responsabilidadesPendientes } from './responsabilidadesPerfil';

const datosIniciales = crearSemilla(new Date('2026-11-17T18:30:00.000Z'));
const practicante = datosIniciales.usuarios.find((item) => item.rol === 'PRACTICANTE');
if (!practicante) throw new Error('La semilla debe incluir un practicante.');

describe('PaginaPerfil', () => {
  beforeEach(() => {
    localStorage.clear();
    useAlmacen.setState({ datos: datosIniciales });
    useAlmacenSesion.setState({
      usuario: {
        id: practicante.id,
        nombre: practicante.nombre,
        correo: practicante.correo,
        rol: practicante.rol,
        debe_cambiar_contrasena: practicante.debe_cambiar_contrasena,
      },
    });
  });

  it('muestra datos reales de cuenta y tareas pendientes derivadas del almacén', () => {
    render(
      <MemoryRouter>
        <PaginaPerfil />
      </MemoryRouter>,
    );
    const responsabilidades = responsabilidadesPendientes(practicante, datosIniciales);

    expect(screen.getByLabelText('Celular')).toHaveValue(practicante.celular);
    expect(screen.queryByDisplayValue('999888777')).not.toBeInTheDocument();
    expect(screen.getByText('Asignaciones y responsabilidades')).toBeInTheDocument();
    if (responsabilidades.length > 0) {
      expect(screen.getByText(responsabilidades[0].titulo)).toBeInTheDocument();
    } else {
      expect(screen.getByText('No tienes responsabilidades pendientes.')).toBeInTheDocument();
    }
  });

  it('guarda los cambios mediante el servicio y refleja el nuevo valor del almacén', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PaginaPerfil />
      </MemoryRouter>,
    );
    const celular = screen.getByLabelText('Celular');
    await user.clear(celular);
    await user.type(celular, '987654321');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(
        useAlmacen.getState().datos.usuarios.find((item) => item.id === practicante.id)?.celular,
      ).toBe('987654321');
    });
    expect(await screen.findByLabelText('Celular')).toHaveValue('987654321');
  });

  it('sin cambios no llama al servicio y lo dice', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PaginaPerfil />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(useAlmacen.getState().datos.usuarios).toEqual(datosIniciales.usuarios);
  });

  it('muestra junto al campo el error del servicio y no escribe', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PaginaPerfil />
      </MemoryRouter>,
    );
    const celular = screen.getByLabelText('Celular');
    await user.clear(celular);
    await user.type(celular, '12345678');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText(/9 dígitos|nueve dígitos|empiece con 9/i)).toBeInTheDocument();
    expect(
      useAlmacen.getState().datos.usuarios.find((item) => item.id === practicante.id)?.celular,
    ).toBe(practicante.celular);
  });

  it('cambia la contraseña, quita la marca temporal y refresca la sesión', async () => {
    useAlmacen.setState({
      datos: {
        ...datosIniciales,
        usuarios: datosIniciales.usuarios.map((item) =>
          item.id === practicante.id ? { ...item, debe_cambiar_contrasena: true } : item,
        ),
      },
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PaginaPerfil />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText('Contraseña actual'), practicante.contrasena);
    await user.type(screen.getByLabelText('Nueva contraseña'), 'nueva-clave-1');
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'nueva-clave-1');
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    await waitFor(() => {
      expect(useAlmacenSesion.getState().usuario?.debe_cambiar_contrasena).toBe(false);
    });
    expect(
      useAlmacen.getState().datos.usuarios.find((item) => item.id === practicante.id)?.contrasena,
    ).toBe('nueva-clave-1');
  });
});

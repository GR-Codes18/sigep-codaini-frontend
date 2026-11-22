import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { crearSemilla, useAlmacen } from '@/data';
import { PaginaAcceso } from './PaginaAcceso';
import { useAlmacenSesion } from './almacenSesion';

// Los servicios simulan una demora de red de 600 ms.
const ESPERA = { timeout: 3000 };

describe('PaginaAcceso', () => {
  beforeEach(() => {
    localStorage.clear();
    useAlmacenSesion.setState({ usuario: null });
    useAlmacen.setState({ datos: crearSemilla(new Date('2026-11-17T18:30:00.000Z')) });
  });

  it('muestra el aviso de autenticación simulada y los tres accesos rápidos', () => {
    render(<PaginaAcceso />);
    expect(screen.getByText('Prototipo: autenticación simulada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar como Administrador' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar como Supervisor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar como Practicante' })).toBeInTheDocument();
  });

  it('valida los campos vacíos sin abrir sesión', async () => {
    const user = userEvent.setup();
    render(<PaginaAcceso />);
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByText('Ingresa tu correo')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu contraseña')).toBeInTheDocument();
    expect(useAlmacenSesion.getState().usuario).toBeNull();
  });

  it('muestra un mensaje genérico con credenciales incorrectas', async () => {
    const user = userEvent.setup();
    render(<PaginaAcceso />);
    await user.type(screen.getByLabelText('Correo'), 'admin@codaini.demo');
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('alert', {}, ESPERA)).toHaveTextContent(
      'Correo o contraseña incorrectos',
    );
    expect(useAlmacenSesion.getState().usuario).toBeNull();
  });

  it('abre sesión con credenciales correctas', async () => {
    const user = userEvent.setup();
    render(<PaginaAcceso />);
    await user.type(screen.getByLabelText('Correo'), 'supervisor@codaini.demo');
    await user.type(screen.getByLabelText('Contraseña'), 'demo12345');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await waitFor(() => expect(useAlmacenSesion.getState().usuario).not.toBeNull(), ESPERA);
    expect(useAlmacenSesion.getState().usuario?.rol).toBe('SUPERVISOR');
    expect(useAlmacenSesion.getState().usuario).not.toHaveProperty('contrasena');
  });

  it('abre sesión con el acceso rápido de Practicante', async () => {
    const user = userEvent.setup();
    render(<PaginaAcceso />);
    await user.click(screen.getByRole('button', { name: 'Entrar como Practicante' }));
    await waitFor(() => expect(useAlmacenSesion.getState().usuario).not.toBeNull(), ESPERA);
    expect(useAlmacenSesion.getState().usuario?.id).toBe('demo-practicante');
    expect(useAlmacenSesion.getState().usuario?.rol).toBe('PRACTICANTE');
  });

  it('no permite iniciar sesión con una cuenta inactiva y lo dice solo si la contraseña es correcta', async () => {
    useAlmacen.getState().transaccion((datos) => ({
      usuarios: datos.usuarios.map((usuario) =>
        usuario.id === 'demo-practicante' ? { ...usuario, estado: 'INACTIVO' } : usuario,
      ),
    }));

    const user = userEvent.setup();
    render(<PaginaAcceso />);
    await user.type(screen.getByLabelText('Correo'), 'practicante@codaini.demo');
    await user.type(screen.getByLabelText('Contraseña'), 'demo12345');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Tu cuenta está inactiva');
    expect(useAlmacenSesion.getState().usuario).toBeNull();
  });

  it('con una contraseña falsa no revela que la cuenta está inactiva', async () => {
    useAlmacen.getState().transaccion((datos) => ({
      usuarios: datos.usuarios.map((usuario) =>
        usuario.id === 'demo-practicante' ? { ...usuario, estado: 'INACTIVO' } : usuario,
      ),
    }));

    const user = userEvent.setup();
    render(<PaginaAcceso />);
    await user.type(screen.getByLabelText('Correo'), 'practicante@codaini.demo');
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta1');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos');
    expect(useAlmacenSesion.getState().usuario).toBeNull();
  });

  it('muestra un error explícito si la cuenta del acceso rápido está inactiva', async () => {
    useAlmacen.getState().transaccion((datos) => ({
      usuarios: datos.usuarios.map((usuario) =>
        usuario.id === 'demo-practicante' ? { ...usuario, estado: 'INACTIVO' } : usuario,
      ),
    }));

    const user = userEvent.setup();
    render(<PaginaAcceso />);
    await user.click(screen.getByRole('button', { name: 'Entrar como Practicante' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Tu cuenta está inactiva');
    expect(useAlmacenSesion.getState().usuario).toBeNull();
  });
});

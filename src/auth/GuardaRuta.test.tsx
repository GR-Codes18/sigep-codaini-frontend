import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { GuardaRuta } from './GuardaRuta';
import { useAlmacenSesion } from './almacenSesion';
import { accesoRapido } from './iniciarSesion';
import { crearEntorno } from '@/services';
import { crearSemilla } from '@/data/semilla';
import { useAlmacen } from '@/data';

function renderEn(ruta: string) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/acceso" element={<p>Pantalla de acceso</p>} />
        <Route element={<GuardaRuta />}>
          <Route path="/practicante/inicio" element={<p>Inicio practicante</p>} />
          <Route path="/administrador/dashboard" element={<p>Dashboard admin</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('GuardaRuta', () => {
  const entorno = crearEntorno({ demoraMs: 0 });

  beforeEach(() => {
    localStorage.clear();
    useAlmacen.setState({ datos: crearSemilla(new Date('2026-11-17T18:30:00.000Z')) });
    useAlmacenSesion.setState({ usuario: null });
  });

  it('sin sesión redirige a /acceso', () => {
    renderEn('/practicante/inicio');
    expect(screen.getByText('Pantalla de acceso')).toBeInTheDocument();
  });

  it('deja pasar a un rol en su propio panel', async () => {
    const resultado = await accesoRapido('PRACTICANTE', entorno);
    if (!resultado.ok) throw new Error(resultado.mensaje);
    useAlmacenSesion.setState({ usuario: resultado.usuario });
    renderEn('/practicante/inicio');
    expect(screen.getByText('Inicio practicante')).toBeInTheDocument();
  });

  it('redirige a su inicio si entra al panel de otro rol', async () => {
    const resultado = await accesoRapido('PRACTICANTE', entorno);
    if (!resultado.ok) throw new Error(resultado.mensaje);
    useAlmacenSesion.setState({ usuario: resultado.usuario });
    renderEn('/administrador/dashboard');
    expect(screen.getByText('Inicio practicante')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard admin')).not.toBeInTheDocument();
  });

  it('cierra la sesión y redirige si la cuenta real está inactiva', async () => {
    const resultado = await accesoRapido('PRACTICANTE', entorno);
    if (!resultado.ok) throw new Error(resultado.mensaje);
    useAlmacenSesion.setState({ usuario: resultado.usuario });
    useAlmacen.getState().transaccion((datos) => ({
      usuarios: datos.usuarios.map((usuario) =>
        usuario.id === resultado.usuario.id ? { ...usuario, estado: 'INACTIVO' } : usuario,
      ),
    }));

    renderEn('/practicante/inicio');

    expect(screen.getByText('Pantalla de acceso')).toBeInTheDocument();
    await waitFor(() => expect(useAlmacenSesion.getState().usuario).toBeNull());
    expect(screen.queryByText('Inicio practicante')).not.toBeInTheDocument();
  });

  it('cierra la sesión si el rol de la cuenta cambió desde el inicio de sesión', async () => {
    const resultado = await accesoRapido('PRACTICANTE', entorno);
    if (!resultado.ok) throw new Error(resultado.mensaje);
    useAlmacenSesion.setState({ usuario: resultado.usuario });
    useAlmacen.getState().transaccion((datos) => ({
      usuarios: datos.usuarios.map((usuario) =>
        usuario.id === resultado.usuario.id ? { ...usuario, rol: 'ADMINISTRADOR' } : usuario,
      ),
    }));

    renderEn('/practicante/inicio');

    expect(screen.getByText('Pantalla de acceso')).toBeInTheDocument();
    await waitFor(() => expect(useAlmacenSesion.getState().usuario).toBeNull());
  });

  it('refresca el resumen persistido al cambiar los datos del usuario activo', async () => {
    const resultado = await accesoRapido('PRACTICANTE', entorno);
    if (!resultado.ok) throw new Error(resultado.mensaje);
    useAlmacenSesion.setState({ usuario: resultado.usuario });
    useAlmacen.getState().transaccion((datos) => ({
      usuarios: datos.usuarios.map((usuario) =>
        usuario.id === resultado.usuario.id
          ? { ...usuario, nombre: 'Nombre actualizado' }
          : usuario,
      ),
    }));

    renderEn('/practicante/inicio');

    await waitFor(() =>
      expect(useAlmacenSesion.getState().usuario?.nombre).toBe('Nombre actualizado'),
    );
    expect(screen.getByText('Inicio practicante')).toBeInTheDocument();
  });
});

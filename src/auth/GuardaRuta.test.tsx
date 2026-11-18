import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { GuardaRuta } from './GuardaRuta';
import { useAlmacenSesion } from './almacenSesion';
import { accesoRapido } from './iniciarSesion';
import { crearEntorno } from '@/services';

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
});

import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { accesoRapido } from '@/auth/iniciarSesion';
import type { Rol } from '@/auth/tipos';
import { FranjaContrasenaTemporal } from './FranjaContrasenaTemporal';

function abrirSesion(rol: Rol, debeCambiar: boolean) {
  useAlmacenSesion.setState({
    usuario: { ...accesoRapido(rol), debe_cambiar_contrasena: debeCambiar },
  });
}

function mostrar() {
  render(
    <MemoryRouter>
      <FranjaContrasenaTemporal />
    </MemoryRouter>,
  );
}

describe('FranjaContrasenaTemporal', () => {
  beforeEach(() => {
    localStorage.clear();
    useAlmacenSesion.setState({ usuario: null });
  });

  it('aparece para un practicante con contraseña temporal y lleva a su perfil', () => {
    abrirSesion('PRACTICANTE', true);
    mostrar();
    expect(screen.getByText(/contraseña temporal/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a mi perfil' })).toHaveAttribute(
      'href',
      '/practicante/perfil',
    );
  });

  it('aparece para un supervisor con contraseña temporal', () => {
    abrirSesion('SUPERVISOR', true);
    mostrar();
    expect(screen.getByRole('link', { name: 'Ir a mi perfil' })).toHaveAttribute(
      'href',
      '/supervisor/perfil',
    );
  });

  it('no aparece si ya cambió la contraseña', () => {
    abrirSesion('PRACTICANTE', false);
    mostrar();
    expect(screen.queryByText(/contraseña temporal/i)).not.toBeInTheDocument();
  });

  it('no aparece para el Administrador', () => {
    abrirSesion('ADMINISTRADOR', true);
    mostrar();
    expect(screen.queryByText(/contraseña temporal/i)).not.toBeInTheDocument();
  });
});

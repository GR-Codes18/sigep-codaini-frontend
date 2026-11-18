import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import type { Rol } from '@/auth/tipos';
import { crearSemilla, useAlmacen } from '@/data';
import { accesoRapido, crearEntorno } from '@/services';
import { FranjaContrasenaTemporal } from './FranjaContrasenaTemporal';

const entorno = crearEntorno({ demoraMs: 0 });

async function abrirSesion(rol: Rol, debeCambiar: boolean) {
  const resultado = await accesoRapido({ rol }, entorno);
  if (!resultado.ok) throw new Error(resultado.mensaje);
  useAlmacen.getState().transaccion((datos) => ({
    usuarios: datos.usuarios.map((usuario) =>
      usuario.id === resultado.valor.id
        ? { ...usuario, debe_cambiar_contrasena: debeCambiar }
        : usuario,
    ),
  }));
  useAlmacenSesion.setState({
    usuario: { ...resultado.valor, debe_cambiar_contrasena: debeCambiar },
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
    useAlmacen.setState({ datos: crearSemilla(new Date('2026-11-17T18:30:00.000Z')) });
    useAlmacenSesion.setState({ usuario: null });
  });

  it('aparece para un practicante con contraseña temporal y lleva a su perfil', async () => {
    await abrirSesion('PRACTICANTE', true);
    mostrar();
    expect(screen.getByText(/contraseña temporal/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a mi perfil' })).toHaveAttribute(
      'href',
      '/practicante/perfil',
    );
  });

  it('aparece para un supervisor con contraseña temporal', async () => {
    await abrirSesion('SUPERVISOR', true);
    mostrar();
    expect(screen.getByRole('link', { name: 'Ir a mi perfil' })).toHaveAttribute(
      'href',
      '/supervisor/perfil',
    );
  });

  it('no aparece si ya cambió la contraseña', async () => {
    await abrirSesion('PRACTICANTE', false);
    mostrar();
    expect(screen.queryByText(/contraseña temporal/i)).not.toBeInTheDocument();
  });

  it('no aparece para el Administrador', async () => {
    await abrirSesion('ADMINISTRADOR', true);
    mostrar();
    expect(screen.queryByText(/contraseña temporal/i)).not.toBeInTheDocument();
  });
});

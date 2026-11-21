import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, listarProyectos } from '@/services';
import { PaginaMisProyectos } from './PaginaMisProyectos';

const SUPERVISOR_3 = 'usr-sup-03'; // tiene un proyecto en pausa
const entorno = crearEntorno({ demoraMs: 0 });
const datos = () => useAlmacen.getState().datos;

function iniciarSesion(idUsuario: Id) {
  const u = datos().usuarios.find((x) => x.id === idUsuario)!;
  useAlmacenSesion.getState().abrirSesion({
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
    rol: u.rol,
    debe_cambiar_contrasena: u.debe_cambiar_contrasena,
  });
}

async function mostrar(busqueda: string, idUsuario: Id = SUPERVISOR_3) {
  iniciarSesion(idUsuario);
  render(
    <MemoryRouter initialEntries={[`/supervisor/proyectos${busqueda}`]}>
      <Routes>
        <Route path="/supervisor/proyectos" element={<PaginaMisProyectos entorno={entorno} />} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando proyectos' })).toBeNull(),
  );
}

const pestana = (nombre: RegExp) => screen.getByRole('tab', { name: nombre });

describe('Mis proyectos: la pestaña llega por la dirección (§9.1.5)', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('«?pestana=EN_PAUSA» abre en «En pausa», con su proyecto, y la pestaña se ve activa', async () => {
    const r = await listarProyectos({ idActor: SUPERVISOR_3 }, entorno);
    if (!r.ok) throw new Error(r.mensaje);
    const enPausa = r.valor.proyectos.find((p) => p.estado === 'EN_PAUSA')!;

    await mostrar('?pestana=EN_PAUSA');

    expect(pestana(/^En pausa/)).toHaveAttribute('data-state', 'active');
    expect(screen.getByRole('link', { name: new RegExp(enPausa.nombre) })).toBeInTheDocument();
  });

  it('el filtro que llega se puede quitar cambiando de pestaña', async () => {
    const usuario = userEvent.setup();
    await mostrar('?pestana=EN_PAUSA');

    await usuario.click(pestana(/^Activos/));

    expect(pestana(/^Activos/)).toHaveAttribute('data-state', 'active');
  });

  it('una pestaña desconocida se ignora y abre en «Activos», sin error', async () => {
    await mostrar('?pestana=no-existe');

    expect(pestana(/^Activos/)).toHaveAttribute('data-state', 'active');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('sin parámetros abre en «Activos», como siempre', async () => {
    await mostrar('');

    expect(pestana(/^Activos/)).toHaveAttribute('data-state', 'active');
  });
});

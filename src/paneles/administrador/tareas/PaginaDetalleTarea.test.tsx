import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno } from '@/services';
import { PaginaDetalleTarea } from './PaginaDetalleTarea';

const ADMIN = 'demo-admin';
const entorno = crearEntorno({ demoraMs: 0 });
const datos = () => useAlmacen.getState().datos;
const unaDisponible = () => datos().tareas.find((t) => t.estado === 'DISPONIBLE')!;

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

async function mostrar(idTarea: Id) {
  render(
    <MemoryRouter initialEntries={[`/administrador/tareas/${idTarea}`]}>
      <Routes>
        <Route
          path="/administrador/tareas/:idTarea"
          element={<PaginaDetalleTarea entorno={entorno} />}
        />
        <Route path="/administrador/tareas" element={<p>Listado abierto</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando la tarea' })).toBeNull(),
  );
}

describe('PaginaDetalleTarea (módulo Tareas)', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('muestra el detalle de la tarea, cualquiera sea su proyecto', async () => {
    const t = unaDisponible();
    await mostrar(t.id);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t.titulo);
  });

  it('ofrece al Administrador las acciones que decide `domain/`: editar y eliminar, no tomarla', async () => {
    await mostrar(unaDisponible().id);

    expect(screen.getByRole('button', { name: 'Editar' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Tomar tarea' })).not.toBeInTheDocument();
  });

  it('«Volver al listado» regresa al listado de tareas', async () => {
    const user = userEvent.setup();
    await mostrar(unaDisponible().id);

    await user.click(screen.getByRole('button', { name: 'Volver al listado' }));

    expect(screen.getByText('Listado abierto')).toBeInTheDocument();
  });

  it('editar guarda los cambios desde este detalle', async () => {
    const user = userEvent.setup();
    const t = unaDisponible();
    await mostrar(t.id);

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(await screen.findByLabelText('Título'), {
      target: { value: 'Título corregido' },
    });
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(datos().tareas.find((x) => x.id === t.id)!.titulo).toBe('Título corregido'),
    );
  });

  it('una tarea que no existe dice que no se encontró y se puede volver', async () => {
    const user = userEvent.setup();
    await mostrar('no-existe');

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Volver al listado' }));
    expect(screen.getByText('Listado abierto')).toBeInTheDocument();
  });
});

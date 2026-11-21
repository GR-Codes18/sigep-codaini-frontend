import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno } from '@/services';
import { PaginaDetalleTareaDeProyecto } from './PaginaDetalleTareaDeProyecto';

const ADMIN = 'demo-admin';
const ACTIVO = 'pry-pl2d';
const OTRO = 'pry-rsv';

const entorno = crearEntorno({ demoraMs: 0 });
const datos = () => useAlmacen.getState().datos;
const tarea = (id: Id) => datos().tareas.find((t) => t.id === id)!;
const unaDisponible = (idProyecto: Id) =>
  datos().tareas.find((t) => t.id_proyecto === idProyecto && t.estado === 'DISPONIBLE')!;

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

function Ubicacion() {
  const l = useLocation();
  return <p data-testid="ubicacion">{`${l.pathname}${l.search}`}</p>;
}

async function mostrar(idProyecto: Id, idTarea: Id) {
  render(
    <MemoryRouter initialEntries={[`/administrador/proyectos/${idProyecto}/tareas/${idTarea}`]}>
      <Routes>
        <Route
          path="/administrador/proyectos/:idProyecto/tareas/:idTarea"
          element={<PaginaDetalleTareaDeProyecto entorno={entorno} />}
        />
        <Route path="/administrador/proyectos/:idProyecto" element={<p>Proyecto abierto</p>} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando la tarea' })).toBeNull(),
  );
}

describe('PaginaDetalleTareaDeProyecto', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('muestra el detalle de la tarea: ID, título, descripción y línea de tiempo', async () => {
    const t = unaDisponible(ACTIVO);
    await mostrar(ACTIVO, t.id);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t.titulo);
    expect(screen.getByText(t.descripcion)).toBeInTheDocument();
  });

  it('ofrece al Administrador las acciones que decide `domain/` para esa tarea (editar y eliminar), no tomarla', async () => {
    const t = unaDisponible(ACTIVO);
    await mostrar(ACTIVO, t.id);

    expect(screen.getByRole('button', { name: 'Editar' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Tomar tarea' })).not.toBeInTheDocument();
  });

  it('«Volver al tablero» regresa al tablero de ese proyecto', async () => {
    const user = userEvent.setup();
    const t = unaDisponible(ACTIVO);
    await mostrar(ACTIVO, t.id);

    await user.click(screen.getByRole('button', { name: 'Volver al tablero' }));

    expect(screen.getByText('Proyecto abierto')).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion')).toHaveTextContent(
      `/administrador/proyectos/${ACTIVO}?pestana=tablero`,
    );
  });

  it('una tarea de otro proyecto no se muestra por esta dirección', async () => {
    const user = userEvent.setup();
    const ajena = unaDisponible(OTRO);
    await mostrar(ACTIVO, ajena.id);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se encontró la tarea en este proyecto.',
    );
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Volver al tablero' }));
    expect(screen.getByText('Proyecto abierto')).toBeInTheDocument();
  });

  it('una tarea que no existe dice que no se encontró', async () => {
    await mostrar(ACTIVO, 'no-existe');

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver al tablero' })).toBeVisible();
  });

  describe('editar', () => {
    it('abre el formulario con los datos actuales y guarda los cambios', async () => {
      const user = userEvent.setup();
      const t = unaDisponible(ACTIVO);
      await mostrar(ACTIVO, t.id);

      await user.click(screen.getByRole('button', { name: 'Editar' }));
      const titulo = await screen.findByLabelText('Título');
      expect(titulo).toHaveValue(t.titulo);
      fireEvent.change(titulo, { target: { value: 'Título corregido' } });
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() => expect(tarea(t.id).titulo).toBe('Título corregido'));
      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
        'Título corregido',
      );
      expect(
        datos().historial.some((e) => e.tipo_accion === 'TAREA_EDITADA' && e.elemento.id === t.id),
      ).toBe(true);
    });

    it('cancelar vuelve al detalle sin escribir', async () => {
      const user = userEvent.setup();
      const t = unaDisponible(ACTIVO);
      const antes = datos().tareas;
      await mostrar(ACTIVO, t.id);
      await user.click(screen.getByRole('button', { name: 'Editar' }));
      fireEvent.change(await screen.findByLabelText('Título'), {
        target: { value: 'No se guarda' },
      });

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(t.titulo);
      expect(datos().tareas).toBe(antes);
    });
  });

  describe('eliminar', () => {
    it('pide motivo y confirmación, elimina la tarea y el detalle deja de encontrarla', async () => {
      const user = userEvent.setup();
      const t = unaDisponible(ACTIVO);
      await mostrar(ACTIVO, t.id);

      await user.click(screen.getByRole('button', { name: 'Eliminar' }));
      const confirmacion = await screen.findByRole('dialog');
      await user.type(within(confirmacion).getByLabelText(/Motivo/), 'Se creó por error');
      await user.click(within(confirmacion).getByRole('button', { name: 'Eliminar' }));

      await waitFor(() => expect(datos().tareas.some((x) => x.id === t.id)).toBe(false));
      expect(
        datos().historial.some(
          (e) => e.tipo_accion === 'TAREA_ELIMINADA' && e.elemento.id === t.id,
        ),
      ).toBe(true);
      expect(await screen.findByRole('alert')).toBeInTheDocument();
    });
  });
});

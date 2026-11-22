import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno } from '@/services';
import { PaginaDetalleTareaDeProyecto } from '@/paneles/administrador/proyectos/PaginaDetalleTareaDeProyecto';

const SUPERVISOR = 'demo-supervisor';
const PL2D = 'pry-pl2d';

const entorno = crearEntorno({ demoraMs: 0 });
const datos = () => useAlmacen.getState().datos;
const tareaDe = (id: Id) => datos().tareas.find((t) => t.id === id)!;

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

function mostrar(idProyecto: Id, idTarea: Id) {
  iniciarSesion(SUPERVISOR);
  render(
    <MemoryRouter initialEntries={[`/supervisor/proyectos/${idProyecto}/tareas/${idTarea}`]}>
      <Routes>
        <Route
          path="/supervisor/proyectos/:idProyecto/tareas/:idTarea"
          element={<PaginaDetalleTareaDeProyecto entorno={entorno} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

/**
 * Las acciones del Supervisor desde el detalle de una tarea de su proyecto (§6.7, §9.1.1), con clics reales sobre la
 * pantalla y el almacén (sin simular los servicios). Antes las probaba la página temporal de desarrollo de la Fase 4.
 */
describe('Acciones del Supervisor en el detalle de una tarea', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('«Cerrar Pull Request» exige un motivo y deja el PR cerrado', async () => {
    const usuario = userEvent.setup();
    const tarea = datos().tareas.find(
      (t) => t.id_proyecto === PL2D && t.estado === 'TERMINADA' && t.estado_pr === 'CREADO',
    );
    if (!tarea) throw new Error('La semilla debe tener una tarea terminada con un PR abierto.');

    mostrar(PL2D, tarea.id);
    await usuario.click(await screen.findByRole('button', { name: 'Cerrar Pull Request' }));
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByRole('button', { name: 'Cerrar Pull Request' })).toBeDisabled();
    await usuario.type(
      within(dialogo).getByLabelText('Motivo'),
      'Se abrió desde una rama incorrecta',
    );
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cerrar Pull Request' }));

    await waitFor(() => expect(tareaDe(tarea.id).estado_pr).toBe('CERRADO'));
  });

  it('«Editar» cambia el título desde el detalle y lo muestra reflejado', async () => {
    const usuario = userEvent.setup();
    const tarea = datos().tareas.find((t) => t.id_proyecto === PL2D && t.estado === 'DISPONIBLE');
    if (!tarea) throw new Error('La semilla debe tener una tarea PL2D disponible.');

    mostrar(PL2D, tarea.id);
    await usuario.click(await screen.findByRole('button', { name: 'Editar' }));
    const titulo = await screen.findByLabelText('Título');
    await usuario.clear(titulo);
    await usuario.type(titulo, 'Título corregido desde la prueba');
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(tareaDe(tarea.id).titulo).toBe('Título corregido desde la prueba'));
    expect(
      await screen.findByRole('heading', { name: 'Título corregido desde la prueba' }),
    ).toBeInTheDocument();
  });
});

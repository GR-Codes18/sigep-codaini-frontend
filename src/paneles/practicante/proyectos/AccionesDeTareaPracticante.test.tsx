import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno } from '@/services';
import { PaginaDetalleTareaPracticante } from './PaginaDetalleTareaPracticante';

const PRACTICANTE = 'demo-practicante';
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

function mostrar(idUsuario: Id, idTarea: Id) {
  iniciarSesion(idUsuario);
  render(
    <MemoryRouter initialEntries={[`/practicante/proyectos/tareas/${idTarea}`]}>
      <Routes>
        <Route
          path="/practicante/proyectos/tareas/:idTarea"
          element={<PaginaDetalleTareaPracticante entorno={entorno} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

/**
 * Las acciones del Practicante desde el detalle de la tarea (§6.7), con clics reales sobre la pantalla y el almacén (sin
 * simular los servicios). Antes las probaba la página temporal de desarrollo de la Fase 4.
 */
describe('Acciones del Practicante en el detalle de una tarea', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('«Tomar tarea» la pasa a En progreso a su nombre y el detalle lo refleja en el historial', async () => {
    const usuario = userEvent.setup();
    const tarea = datos().tareas.find((t) => t.id_proyecto === PL2D && t.estado === 'DISPONIBLE');
    if (!tarea) throw new Error('La semilla debe contener una tarea PL2D disponible.');

    mostrar(PRACTICANTE, tarea.id);
    await usuario.click(await screen.findByRole('button', { name: 'Tomar tarea' }));

    await waitFor(() => expect(tareaDe(tarea.id).estado).toBe('EN_PROGRESO'));
    expect(tareaDe(tarea.id).id_practicante).toBe(PRACTICANTE);
    expect(await screen.findByText('Tomada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tomar tarea' })).not.toBeInTheDocument();
  });

  it('«Crear nuevo Pull Request» propone la rama base del proyecto cuando el anterior está cerrado y lo crea', async () => {
    const usuario = userEvent.setup();
    const tarea = datos().tareas.find((t) => t.id_proyecto === PL2D && t.estado_pr === 'CERRADO');
    if (!tarea?.id_practicante) throw new Error('La semilla debe tener una tarea con PR cerrado.');
    const proyecto = datos().proyectos.find((p) => p.id === PL2D)!;
    const rama = `feature/${proyecto.codigo.toLowerCase()}-${String(tarea.numero).padStart(3, '0')}`;

    mostrar(tarea.id_practicante, tarea.id);
    await usuario.click(await screen.findByRole('button', { name: 'Crear nuevo Pull Request' }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByLabelText('Rama base')).toHaveValue(proyecto.rama_base);
    await usuario.click(await screen.findByRole('button', { name: rama }));
    await usuario.click(screen.getByRole('button', { name: 'Crear PR' }));

    await waitFor(() =>
      expect(tareaDe(tarea.id)).toMatchObject({ estado_pr: 'CREADO', rama_origen: rama }),
    );
  });
});

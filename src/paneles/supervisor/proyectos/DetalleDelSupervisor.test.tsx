import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, obtenerTableroProyecto } from '@/services';
import { PaginaDetalleProyecto } from '@/paneles/administrador/proyectos/PaginaDetalleProyecto';
import { PaginaDetalleTareaDeProyecto } from '@/paneles/administrador/proyectos/PaginaDetalleTareaDeProyecto';
import {
  rutaDeDetalleDeProyecto,
  rutaDeDetalleDeTarea,
  rutaDeProyectos,
} from '@/paneles/administrador/proyectos/rutas';

const SUPERVISOR = 'demo-supervisor';
const MIO = 'pry-pl2d';
const AJENO = 'pry-dat';

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

function Ubicacion() {
  const l = useLocation();
  return <p data-testid="ubicacion">{`${l.pathname}${l.search}`}</p>;
}

async function mostrar(ruta: string) {
  iniciarSesion(SUPERVISOR);
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route
          path="/supervisor/proyectos/:idProyecto"
          element={<PaginaDetalleProyecto entorno={entorno} />}
        />
        <Route
          path="/supervisor/proyectos/:idProyecto/tareas/:idTarea"
          element={<PaginaDetalleTareaDeProyecto entorno={entorno} />}
        />
        <Route path="/supervisor/proyectos" element={<p>Listado abierto</p>} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
}

describe('Detalle de un proyecto del Supervisor (§9.1.1)', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('las direcciones se arman con el prefijo del rol, y sin rol son las del Administrador', () => {
    expect(rutaDeProyectos('SUPERVISOR')).toBe('/supervisor/proyectos');
    expect(rutaDeProyectos()).toBe('/administrador/proyectos');
    expect(rutaDeDetalleDeProyecto('p1', 'tablero', 'SUPERVISOR')).toBe(
      '/supervisor/proyectos/p1?pestana=tablero',
    );
    expect(rutaDeDetalleDeProyecto('p1')).toBe('/administrador/proyectos/p1');
    expect(rutaDeDetalleDeTarea('p1', 't1', 'SUPERVISOR')).toBe(
      '/supervisor/proyectos/p1/tareas/t1',
    );
    expect(rutaDeDetalleDeTarea('p1', 't1')).toBe('/administrador/proyectos/p1/tareas/t1');
  });

  it('tiene tres pestañas: Resumen, Tablero y Equipo', async () => {
    await mostrar(`/supervisor/proyectos/${MIO}`);

    expect(await screen.findByRole('tab', { name: 'Resumen' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tablero' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Equipo' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('puede cambiar la reunión, la rama base y los enlaces, pero no el ciclo de vida ni el equipo', async () => {
    await mostrar(`/supervisor/proyectos/${MIO}`);

    // Editar: solo los grupos que `puede()` le permite (reunión y rama base).
    expect(await screen.findByRole('button', { name: 'Editar proyecto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar enlace' })).toBeInTheDocument();
    for (const prohibido of [
      'Cambiar supervisor',
      'Pausar proyecto',
      'Reanudar proyecto',
      'Finalizar proyecto',
      'Reactivar proyecto',
      'Nuevo proyecto',
    ]) {
      expect(screen.queryByRole('button', { name: prohibido })).toBeNull();
    }
  });

  it('«Editar proyecto» ofrece solo la reunión y la rama base: nombre, código, descripción, fechas y repositorio, no', async () => {
    const usuario = userEvent.setup();
    await mostrar(`/supervisor/proyectos/${MIO}`);

    await usuario.click(await screen.findByRole('button', { name: 'Editar proyecto' }));

    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByLabelText('Rama base')).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Día de la reunión')).toBeInTheDocument();
    for (const campo of [
      'Nombre',
      'Código',
      'Descripción',
      'Fecha de inicio',
      'Fecha de fin prevista',
      'Repositorio',
      'Supervisor',
    ]) {
      expect(within(dialogo).queryByLabelText(campo)).toBeNull();
    }
  });

  it('en la pestaña Equipo no puede asignar ni quitar practicantes', async () => {
    const usuario = userEvent.setup();
    await mostrar(`/supervisor/proyectos/${MIO}`);

    await usuario.click(await screen.findByRole('tab', { name: 'Equipo' }));

    expect(
      await screen.findByRole('heading', { name: /practicantes activos/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Asignar practicantes' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Quitar a / })).toBeNull();
  });

  it('un proyecto ajeno, aunque se escriba su dirección, no muestra ningún dato', async () => {
    const ajeno = datos().proyectos.find((p) => p.id === AJENO)!;
    expect(ajeno.id_supervisor).not.toBe(SUPERVISOR);

    await mostrar(`/supervisor/proyectos/${AJENO}`);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(ajeno.nombre)).toBeNull();
    expect(screen.queryByText(ajeno.codigo)).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('«Volver a proyectos» regresa al listado del Supervisor', async () => {
    const usuario = userEvent.setup();
    await mostrar(`/supervisor/proyectos/${AJENO}`);

    await usuario.click(await screen.findByRole('link', { name: 'Volver a proyectos' }));

    expect(await screen.findByText('Listado abierto')).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('/supervisor/proyectos');
  });

  it('desde el tablero, una tarea abre su detalle bajo el prefijo del Supervisor', async () => {
    const usuario = userEvent.setup();
    const t = await obtenerTableroProyecto({ idActor: SUPERVISOR, idProyecto: MIO }, entorno);
    if (!t.ok) throw new Error(t.mensaje);
    const tarea = [...t.valor.disponibles, ...t.valor.en_progreso][0]!;
    await mostrar(`/supervisor/proyectos/${MIO}?pestana=tablero`);

    await usuario.click(await screen.findByRole('button', { name: new RegExp(tarea.titulo) }));

    await waitFor(() =>
      expect(screen.getByTestId('ubicacion')).toHaveTextContent(
        `/supervisor/proyectos/${MIO}/tareas/${tarea.id}`,
      ),
    );
  });
});

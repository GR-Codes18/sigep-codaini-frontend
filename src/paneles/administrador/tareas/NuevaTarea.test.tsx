import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno } from '@/services';
import { PaginaTareas } from './PaginaTareas';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const PRACTICANTE = 'demo-practicante';
const FINALIZADO = 'pry-tie';
const PL2D = 'pry-pl2d';
const RSV = 'pry-rsv';

const entorno = crearEntorno({ demoraMs: 0 });
const datos = () => useAlmacen.getState().datos;
const tareasDe = (idProyecto: Id) => datos().tareas.filter((t) => t.id_proyecto === idProyecto);

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

async function mostrar() {
  render(
    <MemoryRouter initialEntries={['/administrador/tareas']}>
      <Routes>
        <Route path="/administrador/tareas" element={<PaginaTareas entorno={entorno} />} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Cargando tareas' })).toBeNull());
}

async function abrir(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Nueva tarea' }));
  return await screen.findByRole('dialog', { name: 'Nueva tarea' });
}

function llenar(dialogo: HTMLElement, proyecto: Id, titulo: string) {
  fireEvent.change(within(dialogo).getByLabelText('Proyecto'), { target: { value: proyecto } });
  fireEvent.change(within(dialogo).getByLabelText('Título'), { target: { value: titulo } });
  fireEvent.change(within(dialogo).getByLabelText('Descripción'), {
    target: { value: 'Qué se espera y cuándo se considera terminada.' },
  });
  fireEvent.change(within(dialogo).getByLabelText('Fecha límite'), {
    target: { value: '2026-12-20' },
  });
}

describe('PaginaTareas: «Nueva tarea» desde el módulo', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('el Administrador ve el botón', async () => {
    await mostrar();

    expect(await screen.findByRole('button', { name: 'Nueva tarea' })).toBeVisible();
  });

  it('el formulario deja elegir el proyecto entre los no finalizados', async () => {
    const user = userEvent.setup();
    await mostrar();

    const dialogo = await abrir(user);

    const opciones = within(within(dialogo).getByLabelText('Proyecto') as HTMLElement)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)
      .filter(Boolean);
    const esperados = datos()
      .proyectos.filter((p) => p.estado !== 'FINALIZADO')
      .map((p) => p.id);
    expect([...opciones].sort()).toEqual([...esperados].sort());
    expect(opciones).not.toContain(FINALIZADO);
    expect(within(dialogo).getByLabelText('Proyecto')).toHaveValue('');
  });

  it('crea la tarea en el proyecto elegido, «Disponible» y sin responsable, y aparece en el listado', async () => {
    const user = userEvent.setup();
    const antes = tareasDe(RSV).length;
    await mostrar();
    const dialogo = await abrir(user);

    llenar(dialogo, RSV, 'Tarea creada desde el módulo');
    await user.click(within(dialogo).getByRole('button', { name: 'Crear tarea' }));

    await waitFor(() => expect(tareasDe(RSV)).toHaveLength(antes + 1));
    const nueva = tareasDe(RSV).find((t) => t.titulo === 'Tarea creada desde el módulo')!;
    expect(nueva.estado).toBe('DISPONIBLE');
    expect(nueva.id_practicante).toBeNull();
    expect(
      datos().historial.some((e) => e.tipo_accion === 'TAREA_CREADA' && e.elemento.id === nueva.id),
    ).toBe(true);
    expect(await screen.findByText('Tarea creada desde el módulo')).toBeVisible();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('un proyecto sin elegir lo rechaza el formulario, sin crear nada', async () => {
    const user = userEvent.setup();
    const antes = datos().tareas;
    await mostrar();
    const dialogo = await abrir(user);

    llenar(dialogo, '', 'Sin proyecto');
    await user.click(within(dialogo).getByRole('button', { name: 'Crear tarea' }));

    expect(
      (await within(dialogo).findAllByText(/./, { selector: 'p.text-danger-text' })).length,
    ).toBeGreaterThan(0);
    expect(datos().tareas).toBe(antes);
    expect(screen.getByRole('dialog', { name: 'Nueva tarea' })).toBeInTheDocument();
  });

  it('si el proyecto se finaliza con el formulario abierto, lo rechaza el servicio y no crea nada', async () => {
    const user = userEvent.setup();
    await mostrar();
    const dialogo = await abrir(user);
    llenar(dialogo, PL2D, 'No se podrá crear');
    useAlmacen.getState().transaccion((d) => ({
      proyectos: d.proyectos.map((p) =>
        p.id === PL2D ? { ...p, estado: 'FINALIZADO' as const } : p,
      ),
    }));
    const antes = datos().tareas;

    await user.click(within(dialogo).getByRole('button', { name: 'Crear tarea' }));

    expect(await within(dialogo).findByRole('alert')).toBeInTheDocument();
    expect(datos().tareas).toBe(antes);
  });

  it('cancelar no crea nada y al volver a abrir el formulario está vacío', async () => {
    const user = userEvent.setup();
    const antes = datos().tareas;
    await mostrar();
    const dialogo = await abrir(user);
    llenar(dialogo, PL2D, 'Se descarta');

    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(datos().tareas).toBe(antes);
    const otra = await abrir(user);
    expect(within(otra).getByLabelText('Título')).toHaveValue('');
  });

  it('sin proyectos donde crear (todos finalizados) no se ofrece el botón', async () => {
    useAlmacen.getState().transaccion((d) => ({
      proyectos: d.proyectos.map((p) => ({ ...p, estado: 'FINALIZADO' as const })),
    }));
    await mostrar();

    expect(screen.queryByRole('button', { name: 'Nueva tarea' })).not.toBeInTheDocument();
  });

  it('un Supervisor puede crear, pero solo entre sus proyectos', async () => {
    const user = userEvent.setup();
    useAlmacenSesion.getState().cerrarSesion();
    iniciarSesion(SUPERVISOR);
    await mostrar();

    const dialogo = await abrir(user);

    const opciones = within(within(dialogo).getByLabelText('Proyecto') as HTMLElement)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)
      .filter(Boolean);
    const suyos = datos()
      .proyectos.filter((p) => p.id_supervisor === SUPERVISOR && p.estado !== 'FINALIZADO')
      .map((p) => p.id);
    expect([...opciones].sort()).toEqual([...suyos].sort());
  });

  it('un Practicante no ve el botón: no crea tareas', async () => {
    useAlmacenSesion.getState().cerrarSesion();
    iniciarSesion(PRACTICANTE);
    await mostrar();

    expect(screen.queryByRole('button', { name: 'Nueva tarea' })).not.toBeInTheDocument();
  });
});

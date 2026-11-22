import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, obtenerPracticante } from '@/services';
import { PaginaDetallePracticante } from './PaginaDetallePracticante';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const CON_BAJA = 'usr-pra-03'; // pry-pl2d vigente; pry-tie con baja
const FINALIZADA = 'usr-pra-19';

const entorno = crearEntorno({ demoraMs: 0 });
const datos = () => useAlmacen.getState().datos;

function iniciarSesion(idUsuario: Id) {
  const usuario = datos().usuarios.find((u) => u.id === idUsuario)!;
  useAlmacenSesion.getState().abrirSesion({
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    debe_cambiar_contrasena: usuario.debe_cambiar_contrasena,
  });
}

function Ubicacion() {
  return <p data-testid="ubicacion">{useLocation().pathname}</p>;
}

async function mostrar(idPracticante: Id) {
  render(
    <MemoryRouter initialEntries={[`/administrador/practicantes/${idPracticante}`]}>
      <Routes>
        <Route
          path="/administrador/practicantes/:idPracticante"
          element={<PaginaDetallePracticante entorno={entorno} />}
        />
        <Route path="/administrador/practicantes" element={<p>Listado abierto</p>} />
        <Route path="/administrador/postulaciones/:id" element={<p>Postulación abierta</p>} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando el practicante' })).toBeNull(),
  );
}

async function consultar(id: Id) {
  const r = await obtenerPracticante({ idActor: ADMIN, idPracticante: id }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

describe('PaginaDetallePracticante', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('mientras llega la consulta muestra un estado de carga', () => {
    void mostrar(CON_BAJA);

    expect(screen.getByRole('status', { name: 'Cargando el practicante' })).toBeInTheDocument();
  });

  it('muestra el nombre, el estado y los datos personales de solo lectura', async () => {
    const detalle = await consultar(CON_BAJA);
    await mostrar(CON_BAJA);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      detalle.datos_personales.nombre,
    );
    const personales = screen.getByRole('region', { name: 'Datos personales' });
    expect(personales).toHaveTextContent(detalle.datos_personales.correo);
    expect(personales).toHaveTextContent(detalle.datos_personales.celular);
    expect(within(personales).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(personales).queryByRole('button')).not.toBeInTheDocument();
  });

  it('muestra los datos de la práctica: área, especialidad, ingreso y fin previsto', async () => {
    const detalle = await consultar(CON_BAJA);
    await mostrar(CON_BAJA);

    const practica = screen.getByRole('region', { name: 'Datos de la práctica' });
    expect(practica).toHaveTextContent(detalle.practica.area!.nombre);
    expect(practica).toHaveTextContent(detalle.practica.especialidad!.nombre);
    expect(practica).toHaveTextContent('Fecha de ingreso');
    expect(practica).toHaveTextContent('Fecha de fin prevista');
  });

  it('separa los proyectos actuales de los anteriores, con alta y baja', async () => {
    const detalle = await consultar(CON_BAJA);
    expect(detalle.proyectos_actuales.length).toBeGreaterThan(0);
    expect(detalle.proyectos_anteriores.length).toBeGreaterThan(0);
    await mostrar(CON_BAJA);

    const actuales = screen.getByRole('region', { name: 'Proyectos actuales' });
    for (const p of detalle.proyectos_actuales) {
      expect(actuales).toHaveTextContent(p.proyecto.nombre);
    }
    expect(actuales).toHaveTextContent('Baja: vigente');
    const anteriores = screen.getByRole('region', { name: 'Proyectos anteriores' });
    for (const p of detalle.proyectos_anteriores) {
      expect(anteriores).toHaveTextContent(p.proyecto.nombre);
    }
    expect(anteriores).not.toHaveTextContent('Baja: vigente');
  });

  it('lista sus tareas actuales y completadas', async () => {
    const detalle = await consultar(CON_BAJA);
    await mostrar(CON_BAJA);

    const actuales = screen.getByRole('region', { name: 'Tareas actuales' });
    for (const t of detalle.tareas_actuales) expect(actuales).toHaveTextContent(t.id_legible);
    const completadas = screen.getByRole('region', { name: 'Tareas completadas' });
    for (const t of detalle.tareas_completadas) expect(completadas).toHaveTextContent(t.id_legible);
  });

  it('un practicante sin proyecto ni tareas muestra los estados vacíos', async () => {
    useAlmacen.getState().transaccion((d) => ({
      asignaciones: d.asignaciones.filter((a) => a.id_practicante !== CON_BAJA),
      tareas: d.tareas.filter((t) => t.id_practicante !== CON_BAJA),
    }));
    await mostrar(CON_BAJA);

    expect(screen.getByText('No tiene un proyecto vigente.')).toBeInTheDocument();
    expect(screen.getByText('Aún no tiene proyectos anteriores.')).toBeInTheDocument();
    expect(screen.getByText('No tiene tareas en curso.')).toBeInTheDocument();
    expect(screen.getByText('Aún no tiene tareas completadas.')).toBeInTheDocument();
    expect(screen.getByText('Sin proyecto')).toBeInTheDocument();
  });

  it('muestra su línea de tiempo', async () => {
    await mostrar(CON_BAJA);

    expect(screen.getByRole('region', { name: 'Línea de tiempo' })).toBeInTheDocument();
  });

  it('enlaza con su postulación de origen', async () => {
    const user = userEvent.setup();
    const detalle = await consultar(CON_BAJA);
    await mostrar(CON_BAJA);

    await user.click(screen.getByRole('link', { name: /Ver la postulación de/ }));

    expect(screen.getByTestId('ubicacion')).toHaveTextContent(
      `/administrador/postulaciones/${detalle.postulacion_origen!.id}`,
    );
  });

  it('un practicante finalizado se ve como «Finalizado» y no como «Sin proyecto»', async () => {
    await mostrar(FINALIZADA);

    const cabecera = screen.getByRole('heading', { level: 1 }).closest('header')!;
    expect(within(cabecera).getByText('Finalizado')).toBeInTheDocument();
    expect(within(cabecera).queryByText('Sin proyecto')).not.toBeInTheDocument();
  });

  it('un practicante que no existe dice que no se encontró y vuelve al listado', async () => {
    const user = userEvent.setup();
    await mostrar('no-existe');

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Volver a practicantes' }));
    expect(screen.getByText('Listado abierto')).toBeInTheDocument();
  });

  it('un Supervisor no recibe el detalle', async () => {
    useAlmacenSesion.getState().cerrarSesion();
    iniciarSesion(SUPERVISOR);
    await mostrar(CON_BAJA);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Datos personales' })).not.toBeInTheDocument();
  });
});

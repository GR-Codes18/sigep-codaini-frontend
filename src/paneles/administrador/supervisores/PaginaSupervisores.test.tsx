import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, listarSupervisores } from '@/services';
import { PaginaSupervisores } from './PaginaSupervisores';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';

/** Sin la demora de red simulada, para no esperar 600 ms en cada consulta. */
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

function mostrar() {
  render(
    <MemoryRouter initialEntries={['/administrador/supervisores']}>
      <Routes>
        <Route
          path="/administrador/supervisores"
          element={<PaginaSupervisores entorno={entorno} />}
        />
        <Route path="/administrador/supervisores/:id" element={<p>Detalle abierto</p>} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
}

async function listo() {
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando supervisores' })).toBeNull(),
  );
}

const filasDeDatos = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);

async function consultar() {
  const r = await listarSupervisores({ idActor: ADMIN }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

/** Desactiva a un supervisor sin proyectos a cargo para que haya una pestaña «Inactivos» con filas. */
function desactivarUno() {
  const id = 'usr-sup-03';
  useAlmacen.getState().transaccion((d) => ({
    usuarios: d.usuarios.map((u) => (u.id === id ? { ...u, estado: 'INACTIVO' as const } : u)),
  }));
  return id;
}

describe('PaginaSupervisores', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('mientras llega la consulta muestra un estado de carga', () => {
    mostrar();

    expect(screen.getByRole('status', { name: 'Cargando supervisores' })).toBeInTheDocument();
  });

  it('abre en «Activos» con los contadores de la consulta en cada pestaña', async () => {
    desactivarUno();
    const { contadores } = await consultar();
    expect(contadores.INACTIVOS).toBeGreaterThan(0);
    mostrar();
    await listo();

    const activos = screen.getByRole('tab', { name: /Activos/ });
    expect(activos).toHaveAttribute('data-state', 'active');
    expect(activos).toHaveTextContent(String(contadores.ACTIVOS));
    expect(screen.getByRole('tab', { name: /Inactivos/ })).toHaveTextContent(
      String(contadores.INACTIVOS),
    );
    expect(screen.getByRole('tab', { name: /Todos/ })).toHaveTextContent(String(contadores.TODOS));
    expect(filasDeDatos()).toHaveLength(contadores.ACTIVOS);
  });

  it('cada pestaña muestra sus filas', async () => {
    const user = userEvent.setup();
    desactivarUno();
    const { contadores } = await consultar();
    mostrar();
    await listo();

    await user.click(screen.getByRole('tab', { name: /Inactivos/ }));
    expect(filasDeDatos()).toHaveLength(contadores.INACTIVOS);
    for (const fila of filasDeDatos()) expect(within(fila).getByText('Inactivo')).toBeVisible();

    await user.click(screen.getByRole('tab', { name: /Todos/ }));
    expect(filasDeDatos()).toHaveLength(contadores.TODOS);
  });

  it('muestra las columnas de §5.3', async () => {
    mostrar();
    await listo();

    const encabezados = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((c) => c.textContent);
    expect(encabezados).toEqual([
      'Supervisor',
      'Proyectos a cargo',
      'Practicantes a cargo',
      'Tareas por revisar',
      'Última actividad',
      'Estado',
      'Detalle',
    ]);
  });

  it('muestra los números de la consulta en cada fila', async () => {
    const { supervisores } = await consultar();
    mostrar();
    await listo();

    for (const s of supervisores.filter((x) => x.estado === 'ACTIVO')) {
      const fila = filasDeDatos().find((f) => f.textContent?.includes(s.correo))!;
      const celdas = within(fila).getAllByRole('cell');
      expect(celdas[1]).toHaveTextContent(String(s.proyectos_a_cargo));
      expect(celdas[2]).toHaveTextContent(String(s.practicantes_a_cargo));
      expect(celdas[3]).toHaveTextContent(String(s.tareas_por_revisar));
    }
  });

  it('resalta en ámbar las tareas por revisar solo cuando hay alguna', async () => {
    const { supervisores } = await consultar();
    const con = supervisores.find((s) => s.tareas_por_revisar > 0)!;
    const sin = supervisores.find((s) => s.tareas_por_revisar === 0 && s.estado === 'ACTIVO');
    expect(con).toBeDefined();
    mostrar();
    await listo();

    const celda = (correo: string) =>
      within(filasDeDatos().find((f) => f.textContent?.includes(correo))!).getAllByRole('cell')[3]!;
    expect(celda(con.correo).querySelector('.bg-state-warning-bg')).not.toBeNull();
    if (sin) expect(celda(sin.correo).querySelector('.bg-state-warning-bg')).toBeNull();
  });

  it('no ofrece acciones de escritura en el bloque de lectura', async () => {
    mostrar();
    await listo();

    expect(within(screen.getByRole('table')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('busca por nombre o correo, sin distinguir tildes ni mayúsculas', async () => {
    const user = userEvent.setup();
    const { supervisores } = await consultar();
    const elegido = supervisores.find((s) => s.estado === 'ACTIVO')!;
    mostrar();
    await listo();

    await user.type(
      screen.getByPlaceholderText('Buscar por nombre o correo'),
      elegido.correo.toUpperCase(),
    );

    const filas = filasDeDatos();
    expect(filas).toHaveLength(1);
    expect(filas[0]).toHaveTextContent(elegido.nombre);
  });

  it('una búsqueda sin resultados lo dice', async () => {
    const user = userEvent.setup();
    mostrar();
    await listo();

    await user.type(screen.getByPlaceholderText('Buscar por nombre o correo'), 'zzzzzz');

    expect(screen.getByText('Ningún supervisor coincide con la búsqueda')).toBeInTheDocument();
  });

  it('sin supervisores lo dice', async () => {
    useAlmacen.getState().transaccion((d) => ({
      usuarios: d.usuarios.filter((u) => u.rol !== 'SUPERVISOR'),
      supervisores: [],
      proyectos: [],
      asignaciones: [],
      tareas: [],
    }));
    mostrar();
    await listo();

    expect(screen.getByText('Aún no hay supervisores')).toBeInTheDocument();
  });

  it('una pestaña vacía dice lo suyo', async () => {
    const user = userEvent.setup();
    mostrar();
    await listo();

    await user.click(screen.getByRole('tab', { name: /Inactivos/ }));

    expect(screen.getByText('Aún no hay supervisores inactivos')).toBeInTheDocument();
  });

  it('un clic en la fila abre el detalle', async () => {
    const user = userEvent.setup();
    mostrar();
    await listo();

    await user.click(filasDeDatos()[0]!);

    expect(screen.getByText('Detalle abierto')).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion').textContent).toMatch(
      /^\/administrador\/supervisores\/.+/,
    );
  });

  it('«Ver detalle» navega una sola vez al detalle de esa persona', async () => {
    const user = userEvent.setup();
    const { supervisores } = await consultar();
    mostrar();
    await listo();

    const primero = filasDeDatos()[0]!;
    const id = supervisores.find((s) => primero.textContent?.includes(s.correo))!.id;
    await user.click(within(primero).getByRole('link', { name: /Ver detalle de/ }));

    expect(screen.getByTestId('ubicacion')).toHaveTextContent(`/administrador/supervisores/${id}`);
  });

  it('un Supervisor no recibe el listado y ve el error de la consulta', async () => {
    useAlmacenSesion.getState().cerrarSesion();
    iniciarSesion(SUPERVISOR);
    mostrar();
    await listo();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

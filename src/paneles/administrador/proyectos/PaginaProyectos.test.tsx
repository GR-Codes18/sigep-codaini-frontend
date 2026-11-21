import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, listarProyectos } from '@/services';
import { PaginaProyectos } from './PaginaProyectos';

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
    <MemoryRouter initialEntries={['/administrador/proyectos']}>
      <Routes>
        <Route path="/administrador/proyectos" element={<PaginaProyectos entorno={entorno} />} />
        <Route path="/administrador/proyectos/:id" element={<p>Detalle abierto</p>} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
}

async function listo() {
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando proyectos' })).toBeNull(),
  );
}

const filasDeDatos = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);

async function consultar() {
  const r = await listarProyectos({ idActor: ADMIN }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

describe('PaginaProyectos', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('mientras llega la consulta muestra un estado de carga', () => {
    mostrar();

    expect(screen.getByRole('status', { name: 'Cargando proyectos' })).toBeInTheDocument();
  });

  it('abre en «Activos» con los contadores de la consulta en cada pestaña', async () => {
    const { contadores } = await consultar();
    mostrar();
    await listo();

    const activos = screen.getByRole('tab', { name: /Activos/ });
    expect(activos).toHaveAttribute('data-state', 'active');
    expect(activos).toHaveTextContent(String(contadores.ACTIVO));
    expect(screen.getByRole('tab', { name: /En pausa/ })).toHaveTextContent(
      String(contadores.EN_PAUSA),
    );
    expect(screen.getByRole('tab', { name: /Finalizados/ })).toHaveTextContent(
      String(contadores.FINALIZADO),
    );
    expect(screen.getByRole('tab', { name: /Todos/ })).toHaveTextContent(String(contadores.TODOS));
    expect(filasDeDatos()).toHaveLength(contadores.ACTIVO);
  });

  it('cada pestaña muestra los proyectos de su estado', async () => {
    const user = userEvent.setup();
    const { contadores } = await consultar();
    mostrar();
    await listo();

    await user.click(screen.getByRole('tab', { name: /En pausa/ }));
    expect(filasDeDatos()).toHaveLength(contadores.EN_PAUSA);
    for (const fila of filasDeDatos()) expect(within(fila).getByText('En pausa')).toBeVisible();

    await user.click(screen.getByRole('tab', { name: /Finalizados/ }));
    expect(filasDeDatos()).toHaveLength(contadores.FINALIZADO);
    for (const fila of filasDeDatos()) expect(within(fila).getByText('Finalizado')).toBeVisible();

    await user.click(screen.getByRole('tab', { name: /Todos/ }));
    expect(filasDeDatos()).toHaveLength(contadores.TODOS);
  });

  it('muestra las columnas de §5.4', async () => {
    mostrar();
    await listo();

    const encabezados = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((c) => c.textContent);
    expect(encabezados).toEqual([
      'Proyecto',
      'Supervisor',
      'Practicantes activos',
      'Avance',
      'Esperando supervisión',
      'Próxima reunión',
      'Estado',
      'Detalle',
    ]);
  });

  it('muestra en cada fila los datos de la consulta: supervisor, practicantes y avance', async () => {
    const { proyectos } = await consultar();
    mostrar();
    await listo();

    for (const p of proyectos.filter((x) => x.estado === 'ACTIVO')) {
      const fila = filasDeDatos().find((f) => f.textContent?.includes(p.codigo))!;
      const celdas = within(fila).getAllByRole('cell');
      expect(celdas[1]).toHaveTextContent(p.supervisor.nombre);
      expect(celdas[2]).toHaveTextContent(String(p.practicantes_activos));
      expect(celdas[3]).toHaveTextContent(
        p.avance === null
          ? 'Sin tareas'
          : `${p.avance.numerador} de ${p.avance.denominador} · ${p.avance.porcentaje} %`,
      );
    }
  });

  it('una reunión sin definir dice «Sin definir»', async () => {
    useAlmacen.getState().transaccion((d) => ({
      proyectos: d.proyectos.map((p) => ({ ...p, dia_reunion: null, hora_reunion: null })),
    }));
    mostrar();
    await listo();

    for (const fila of filasDeDatos()) {
      expect(within(fila).getAllByRole('cell')[5]).toHaveTextContent('Sin definir');
    }
  });

  it('resalta en ámbar las tareas esperando supervisión solo cuando hay alguna', async () => {
    const { proyectos } = await consultar();
    const con = proyectos.find((p) => p.estado === 'ACTIVO' && p.tareas_esperando_supervision > 0);
    const sin = proyectos.find(
      (p) => p.estado === 'ACTIVO' && p.tareas_esperando_supervision === 0,
    );
    expect(con).toBeDefined();
    mostrar();
    await listo();

    const celda = (codigo: string) =>
      within(filasDeDatos().find((f) => f.textContent?.includes(codigo))!).getAllByRole('cell')[4]!;
    expect(celda(con!.codigo).querySelector('.bg-state-warning-bg')).not.toBeNull();
    if (sin) expect(celda(sin.codigo).querySelector('.bg-state-warning-bg')).toBeNull();
  });

  it('el Administrador ve «Nuevo proyecto»', async () => {
    mostrar();
    await listo();

    expect(await screen.findByRole('button', { name: 'Nuevo proyecto' })).toBeVisible();
  });

  it('busca por nombre, sin distinguir mayúsculas ni tildes', async () => {
    const user = userEvent.setup();
    const { proyectos } = await consultar();
    const elegido = proyectos.find((p) => p.estado === 'ACTIVO')!;
    mostrar();
    await listo();

    await user.type(screen.getByPlaceholderText('Buscar por nombre'), elegido.nombre.toUpperCase());

    const filas = filasDeDatos();
    expect(filas.length).toBeGreaterThan(0);
    expect(filas.some((f) => f.textContent?.includes(elegido.codigo))).toBe(true);
  });

  it('filtra por supervisor', async () => {
    const user = userEvent.setup();
    const { proyectos } = await consultar();
    const activos = proyectos.filter((p) => p.estado === 'ACTIVO');
    const supervisor = activos[0]!.supervisor;
    mostrar();
    await listo();

    await user.selectOptions(screen.getByLabelText('Supervisor'), supervisor.id);

    expect(filasDeDatos()).toHaveLength(
      activos.filter((p) => p.supervisor.id === supervisor.id).length,
    );
  });

  it('una búsqueda sin resultados lo dice', async () => {
    const user = userEvent.setup();
    mostrar();
    await listo();

    await user.type(screen.getByPlaceholderText('Buscar por nombre'), 'zzzzzz');

    expect(screen.getByText('Ningún proyecto coincide con los filtros')).toBeInTheDocument();
  });

  it('sin proyectos lo dice', async () => {
    useAlmacen.getState().transaccion(() => ({
      proyectos: [],
      asignaciones: [],
      tareas: [],
      enlaces_proyecto: [],
    }));
    mostrar();
    await listo();

    expect(screen.getByText('Aún no hay proyectos')).toBeInTheDocument();
  });

  it('una pestaña vacía dice lo suyo', async () => {
    const user = userEvent.setup();
    useAlmacen.getState().transaccion((d) => ({
      proyectos: d.proyectos.map((p) =>
        p.estado === 'EN_PAUSA' ? { ...p, estado: 'ACTIVO' as const } : p,
      ),
    }));
    mostrar();
    await listo();

    await user.click(screen.getByRole('tab', { name: /En pausa/ }));

    expect(screen.getByText('No hay proyectos en pausa')).toBeInTheDocument();
  });

  it('un clic en la fila abre el detalle', async () => {
    const user = userEvent.setup();
    mostrar();
    await listo();

    await user.click(filasDeDatos()[0]!);

    expect(screen.getByText('Detalle abierto')).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion').textContent).toMatch(/^\/administrador\/proyectos\/.+/);
  });

  it('«Ver detalle» navega una sola vez al detalle de ese proyecto', async () => {
    const user = userEvent.setup();
    const { proyectos } = await consultar();
    mostrar();
    await listo();

    const primero = filasDeDatos()[0]!;
    const id = proyectos.find((p) => primero.textContent?.includes(p.codigo))!.id;
    await user.click(within(primero).getByRole('link', { name: /Ver detalle de/ }));

    expect(screen.getByTestId('ubicacion')).toHaveTextContent(`/administrador/proyectos/${id}`);
  });

  it('un Supervisor usa su propio listado y no ve «Nuevo proyecto»: lo decide la consulta', async () => {
    useAlmacenSesion.getState().cerrarSesion();
    iniciarSesion(SUPERVISOR);
    mostrar();
    await listo();

    // La consulta le devuelve solo sus proyectos: la ruta del Administrador la protege `GuardaRuta`.
    const filas = await screen.findAllByRole('row');
    expect(filas.length).toBeGreaterThan(1);
    expect(screen.queryByRole('button', { name: 'Nuevo proyecto' })).not.toBeInTheDocument();
  });
});

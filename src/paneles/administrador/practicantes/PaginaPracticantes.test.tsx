import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, listarPracticantes } from '@/services';
import { PaginaPracticantes } from './PaginaPracticantes';

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
    <MemoryRouter initialEntries={['/administrador/practicantes']}>
      <Routes>
        <Route
          path="/administrador/practicantes"
          element={<PaginaPracticantes entorno={entorno} />}
        />
        <Route path="/administrador/practicantes/:id" element={<p>Detalle abierto</p>} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
}

async function listo() {
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando practicantes' })).toBeNull(),
  );
}

const filasDeDatos = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);

async function consultar() {
  const r = await listarPracticantes({ idActor: ADMIN }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

async function irA(user: ReturnType<typeof userEvent.setup>, pestana: RegExp) {
  await user.click(screen.getByRole('tab', { name: pestana }));
}

describe('PaginaPracticantes', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('mientras llega la consulta muestra un estado de carga', () => {
    mostrar();

    expect(screen.getByRole('status', { name: 'Cargando practicantes' })).toBeInTheDocument();
  });

  it('abre en «Activos» con los contadores de la consulta en cada pestaña', async () => {
    const { contadores } = await consultar();
    mostrar();
    await listo();

    const activos = screen.getByRole('tab', { name: /Activos/ });
    expect(activos).toHaveAttribute('data-state', 'active');
    expect(activos).toHaveTextContent(String(contadores.ACTIVOS));
    expect(screen.getByRole('tab', { name: /Sin proyecto/ })).toHaveTextContent(
      String(contadores.SIN_PROYECTO),
    );
    expect(screen.getByRole('tab', { name: /Finalizados/ })).toHaveTextContent(
      String(contadores.FINALIZADOS),
    );
    expect(screen.getByRole('tab', { name: /Todos/ })).toHaveTextContent(String(contadores.TODOS));
    expect(filasDeDatos()).toHaveLength(contadores.ACTIVOS);
  });

  it('«Activos» incluye a los «Sin proyecto»: se distinguen por su insignia', async () => {
    const { contadores } = await consultar();
    expect(contadores.SIN_PROYECTO).toBeGreaterThan(0);
    mostrar();
    await listo();

    const conInsignia = filasDeDatos().filter((f) => within(f).queryByText('Sin proyecto'));
    expect(conInsignia).toHaveLength(contadores.SIN_PROYECTO);
  });

  it('cada pestaña muestra sus filas', async () => {
    const user = userEvent.setup();
    const { contadores } = await consultar();
    mostrar();
    await listo();

    await irA(user, /Sin proyecto/);
    expect(filasDeDatos()).toHaveLength(contadores.SIN_PROYECTO);

    await irA(user, /Finalizados/);
    expect(filasDeDatos()).toHaveLength(contadores.FINALIZADOS);
    for (const fila of filasDeDatos()) expect(within(fila).getByText('Finalizado')).toBeVisible();

    await irA(user, /Todos/);
    expect(filasDeDatos()).toHaveLength(contadores.TODOS);
  });

  it('muestra las columnas de §5.2', async () => {
    mostrar();
    await listo();

    const encabezados = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((c) => c.textContent);
    expect(encabezados).toEqual([
      'Practicante',
      'Área y especialidad',
      'Proyectos activos',
      'Carga',
      'Última actividad',
      'Fin previsto',
      'Estado',
      'Detalle',
    ]);
  });

  it('no ofrece «Nuevo practicante»', async () => {
    mostrar();
    await listo();

    expect(screen.queryByRole('button', { name: /nuevo practicante/i })).not.toBeInTheDocument();
  });

  it('busca por nombre o correo, sin distinguir tildes ni mayúsculas', async () => {
    const user = userEvent.setup();
    const { practicantes } = await consultar();
    const elegido = practicantes.find((p) => p.situacion.estado === 'ACTIVO')!;
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

  it('filtra por área y por proyecto', async () => {
    const user = userEvent.setup();
    const { practicantes } = await consultar();
    const activos = practicantes.filter((p) => p.situacion.estado === 'ACTIVO');
    const area = activos.find((p) => p.area !== null)!.area!;
    mostrar();
    await listo();

    await user.selectOptions(screen.getByLabelText('Área técnica'), area.id);
    expect(filasDeDatos()).toHaveLength(activos.filter((p) => p.area?.id === area.id).length);

    await user.selectOptions(screen.getByLabelText('Área técnica'), '');
    const proyecto = activos.flatMap((p) => p.proyectos_activos)[0]!;
    await user.selectOptions(screen.getByLabelText('Proyecto'), proyecto.id);
    expect(filasDeDatos()).toHaveLength(
      activos.filter((p) => p.proyectos_activos.some((x) => x.id === proyecto.id)).length,
    );
  });

  it('una búsqueda sin resultados lo dice y sugiere quitar filtros', async () => {
    const user = userEvent.setup();
    mostrar();
    await listo();

    await user.type(screen.getByPlaceholderText('Buscar por nombre o correo'), 'zzzzzz');

    expect(screen.getByText('Ningún practicante coincide con los filtros')).toBeInTheDocument();
  });

  it('sin practicantes dice que nacen al aprobar una postulación', async () => {
    useAlmacen.getState().transaccion((d) => ({
      usuarios: d.usuarios.filter((u) => u.rol !== 'PRACTICANTE'),
      practicantes: [],
      asignaciones: [],
      tareas: [],
    }));
    mostrar();
    await listo();

    expect(screen.getByText('Aún no hay practicantes')).toBeInTheDocument();
    expect(screen.getByText('Un practicante nace al aprobar una postulación.')).toBeInTheDocument();
  });

  it('una pestaña vacía dice lo suyo', async () => {
    const user = userEvent.setup();
    useAlmacen.getState().transaccion((d) => ({
      usuarios: d.usuarios.map((u) => (u.rol === 'PRACTICANTE' ? { ...u, estado: 'ACTIVO' } : u)),
    }));
    mostrar();
    await listo();

    await irA(user, /Finalizados/);

    expect(
      screen.getByText('Aún no hay practicantes con la práctica finalizada'),
    ).toBeInTheDocument();
  });

  it('un clic en la fila abre el detalle', async () => {
    const user = userEvent.setup();
    mostrar();
    await listo();

    await user.click(filasDeDatos()[0]!);

    expect(screen.getByText('Detalle abierto')).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion').textContent).toMatch(
      /^\/administrador\/practicantes\/.+/,
    );
  });

  it('«Ver detalle» navega una sola vez al detalle de esa persona', async () => {
    const user = userEvent.setup();
    const { practicantes } = await consultar();
    mostrar();
    await listo();

    const primero = filasDeDatos()[0]!;
    const enlace = within(primero).getByRole('link', { name: /Ver detalle de/ });
    const id = practicantes.find((p) => primero.textContent?.includes(p.correo))!.id;
    await user.click(enlace);

    expect(screen.getByTestId('ubicacion')).toHaveTextContent(`/administrador/practicantes/${id}`);
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

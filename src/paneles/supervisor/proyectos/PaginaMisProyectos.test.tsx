import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, listarProyectos } from '@/services';
import { PaginaMisProyectos } from './PaginaMisProyectos';

const SUPERVISOR = 'demo-supervisor';
const SUPERVISOR_2 = 'usr-sup-02';
const SUPERVISOR_3 = 'usr-sup-03';

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

async function mostrar(idUsuario: Id = SUPERVISOR) {
  iniciarSesion(idUsuario);
  render(
    <MemoryRouter initialEntries={['/supervisor/proyectos']}>
      <Routes>
        <Route path="/supervisor/proyectos" element={<PaginaMisProyectos entorno={entorno} />} />
        <Route path="/supervisor/proyectos/:idProyecto" element={<p>Detalle abierto</p>} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando proyectos' })).toBeNull(),
  );
}

async function consulta(idActor: Id) {
  const r = await listarProyectos({ idActor }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

/** Las tarjetas: cada una es un enlace al detalle del proyecto. */
const tarjetas = () => screen.queryAllByRole('listitem');
const tarjeta = (nombre: string) => screen.getByRole('link', { name: new RegExp(nombre) });

describe('Mis proyectos (Supervisor)', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('abre en «Activos» con sus proyectos en tarjetas, no en tabla', async () => {
    await mostrar();
    const mios = await consulta(SUPERVISOR);
    const activos = mios.proyectos.filter((p) => p.estado === 'ACTIVO');
    expect(activos.length).toBeGreaterThan(0);

    expect(screen.getByRole('heading', { name: 'Mis proyectos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Activos/ })).toHaveAttribute('data-state', 'active');
    expect(tarjetas()).toHaveLength(activos.length);
    for (const p of activos) expect(tarjeta(p.nombre)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('sin columna ni filtro de supervisor y sin «Nuevo proyecto»', async () => {
    await mostrar();

    expect(screen.queryByRole('columnheader')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByLabelText(/supervisor/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /nuevo proyecto/i })).toBeNull();
  });

  it('las pestañas Activos, En pausa, Finalizados y Todos llevan los contadores de la consulta', async () => {
    await mostrar();
    const mios = await consulta(SUPERVISOR);

    for (const [nombre, valor] of [
      ['Activos', mios.contadores.ACTIVO],
      ['En pausa', mios.contadores.EN_PAUSA],
      ['Finalizados', mios.contadores.FINALIZADO],
      ['Todos', mios.contadores.TODOS],
    ] as const) {
      expect(screen.getByRole('tab', { name: new RegExp(`^${nombre}`) })).toHaveTextContent(
        String(valor),
      );
    }
  });

  it('solo aparecen sus proyectos: ningún nombre de proyectos ajenos llega a la pantalla', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    const ajenos = datos().proyectos.filter((p) => p.id_supervisor !== SUPERVISOR);
    expect(ajenos.length).toBeGreaterThan(0);

    await usuario.click(screen.getByRole('tab', { name: /^Todos/ }));

    const mios = datos().proyectos.filter((p) => p.id_supervisor === SUPERVISOR);
    await waitFor(() => expect(tarjetas()).toHaveLength(mios.length));
    for (const p of ajenos) {
      expect(screen.queryByText(p.nombre)).toBeNull();
      expect(screen.queryByText(p.codigo)).toBeNull();
    }
  });

  it('cada tarjeta trae nombre, código, estado, avance, practicantes, tareas por supervisar y reunión; sin vencidas', async () => {
    await mostrar();
    const mios = await consulta(SUPERVISOR);
    const p = mios.proyectos.find((x) => x.estado === 'ACTIVO')!;

    const t = tarjeta(p.nombre);
    expect(t).toHaveTextContent(p.codigo);
    expect(t).toHaveTextContent('Activo');
    expect(t).toHaveTextContent(/Avance/);
    expect(t).toHaveTextContent('Practicantes activos');
    expect(t).toHaveTextContent('Esperando tu supervisión');
    expect(t).toHaveTextContent('Próxima reunión');
    // Las vencidas se ven en el Resumen del detalle, no en la tarjeta.
    expect(t.textContent ?? '').not.toMatch(/vencid/i);
  });

  it('las tareas por supervisar se resaltan en ámbar solo si hay alguna', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    await usuario.click(screen.getByRole('tab', { name: /^Todos/ }));
    const mios = await consulta(SUPERVISOR);
    await waitFor(() => expect(tarjetas()).toHaveLength(mios.proyectos.length));

    for (const p of mios.proyectos) {
      const valor = within(tarjeta(p.nombre)).getByText('Esperando tu supervisión')
        .nextElementSibling as HTMLElement;
      expect(valor).toHaveTextContent(String(p.tareas_esperando_supervision));
      expect(valor.className.includes('state-warning-text')).toBe(
        p.tareas_esperando_supervision > 0,
      );
    }
    // La semilla trae proyectos de los dos casos.
    expect(mios.proyectos.some((p) => p.tareas_esperando_supervision > 0)).toBe(true);
  });

  it('un proyecto sin practicantes dice «Sin practicantes asignados» y no ofrece ningún botón', async () => {
    await mostrar(SUPERVISOR_2);
    const mios = await consulta(SUPERVISOR_2);
    const sinEquipo = mios.proyectos.find(
      (p) => p.estado === 'ACTIVO' && p.practicantes_activos === 0,
    )!;
    expect(sinEquipo).toBeDefined();

    expect(tarjeta(sinEquipo.nombre)).toHaveTextContent('Sin practicantes asignados');
    expect(within(tarjeta(sinEquipo.nombre)).queryByRole('button')).toBeNull();
  });

  it('«Finalizados» y «En pausa» muestran lo que corresponde', async () => {
    const usuario = userEvent.setup();
    await mostrar(SUPERVISOR_2);
    const finalizado = (await consulta(SUPERVISOR_2)).proyectos.find(
      (p) => p.estado === 'FINALIZADO',
    )!;

    await usuario.click(screen.getByRole('tab', { name: /^Finalizados/ }));
    await waitFor(() => expect(tarjetas()).toHaveLength(1));
    expect(tarjeta(finalizado.nombre)).toHaveTextContent('Finalizado');
  });

  it('un supervisor con un proyecto en pausa lo ve en «En pausa»', async () => {
    const usuario = userEvent.setup();
    await mostrar(SUPERVISOR_3);
    const mios = await consulta(SUPERVISOR_3);
    const enPausa = mios.proyectos.find((p) => p.estado === 'EN_PAUSA')!;

    await usuario.click(screen.getByRole('tab', { name: /^En pausa/ }));

    await waitFor(() => expect(tarjeta(enPausa.nombre)).toBeInTheDocument());
  });

  it('la búsqueda por nombre filtra las tarjetas y, sin coincidencias, lo dice', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    const activos = (await consulta(SUPERVISOR)).proyectos.filter((p) => p.estado === 'ACTIVO');
    expect(activos.length).toBeGreaterThan(1);

    await usuario.type(screen.getByRole('searchbox'), activos[0]!.nombre.slice(0, 6));
    await waitFor(() => expect(tarjetas().length).toBeLessThan(activos.length));
    expect(tarjeta(activos[0]!.nombre)).toBeInTheDocument();

    await usuario.clear(screen.getByRole('searchbox'));
    await usuario.type(screen.getByRole('searchbox'), 'zzz-no-existe');
    expect(await screen.findByText('Ningún proyecto coincide con la búsqueda')).toBeInTheDocument();
  });

  it('un supervisor recién creado, sin proyectos, ve un mensaje y no un error', async () => {
    useAlmacen.getState().transaccion((d) => ({
      proyectos: d.proyectos.filter((p) => p.id_supervisor !== SUPERVISOR),
    }));
    await mostrar();

    expect(await screen.findByText('Aún no tienes proyectos asignados')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('un clic en la tarjeta lleva al detalle del proyecto, bajo el prefijo del Supervisor', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    const p = (await consulta(SUPERVISOR)).proyectos.find((x) => x.estado === 'ACTIVO')!;

    await usuario.click(tarjeta(p.nombre));

    expect(await screen.findByText('Detalle abierto')).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion')).toHaveTextContent(`/supervisor/proyectos/${p.id}`);
  });
});

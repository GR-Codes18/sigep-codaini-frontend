import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import { crearEntorno, listarHistorial, type FiltrosHistorial } from '@/services';
import { PaginaHistorial } from './PaginaHistorial';

const ADMIN = 'demo-admin';
const entorno = crearEntorno({ demoraMs: 0 });

function iniciarSesion() {
  const u = useAlmacen.getState().datos.usuarios.find((x) => x.id === ADMIN)!;
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
    <MemoryRouter initialEntries={['/administrador/historial']}>
      <Routes>
        <Route path="/administrador/historial" element={<PaginaHistorial entorno={entorno} />} />
        <Route path="/administrador/*" element={<p>Detalle abierto</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando el historial' })).toBeNull(),
  );
}

async function esperados(filtros: FiltrosHistorial = {}) {
  const r = await listarHistorial({ idActor: ADMIN, filtros }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor.eventos;
}

/** Las filas de datos de la tabla (sin el encabezado). */
const filas = () => screen.queryAllByRole('row').slice(1);

describe('Historial de actividad', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion();
  });

  it('lista los eventos con fecha y hora, autor, acción, elemento y cambio, sin acciones sobre ellos', async () => {
    await mostrar();
    const todos = await esperados();

    expect(screen.getByRole('heading', { name: 'Historial de actividad' })).toBeInTheDocument();
    for (const e of ['Fecha y hora', 'Autor', 'Acción', 'Elemento', 'Cambio']) {
      expect(screen.getByRole('columnheader', { name: e })).toBeInTheDocument();
    }
    expect(filas()).toHaveLength(todos.length);
    // Eventos inmutables: ni editar ni borrar.
    expect(screen.queryByRole('button', { name: /editar|borrar|eliminar/i })).toBeNull();
  });

  it('ofrece los filtros de §5.7: fechas, autor, categoría, tipo de elemento, proyecto y búsqueda', async () => {
    await mostrar();

    expect(screen.getByLabelText('Desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument();
    expect(screen.getByLabelText('Autor')).toBeInTheDocument();
    expect(screen.getByLabelText('Categoría')).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo de elemento')).toBeInTheDocument();
    expect(screen.getByLabelText('Proyecto')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    // Las ocho categorías de la propuesta (más «Todas»).
    expect(within(screen.getByLabelText('Categoría')).getAllByRole('option')).toHaveLength(9);
  });

  it('el filtro por categoría muestra lo que devuelve la consulta', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    const todos = await esperados();
    const esperadas = await esperados({ categoria: 'TAREAS' });
    expect(esperadas.length).toBeGreaterThan(0);
    expect(esperadas.length).toBeLessThan(todos.length);

    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'TAREAS');

    await waitFor(() => expect(filas()).toHaveLength(esperadas.length));
  });

  it('el autor «Sistema» deja solo los eventos automáticos', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    const del_sistema = await esperados({ id_autor: 'SISTEMA' });

    await usuario.selectOptions(screen.getByLabelText('Autor'), 'SISTEMA');

    await waitFor(() => expect(filas()).toHaveLength(del_sistema.length));
    for (const fila of filas()) expect(within(fila).getByText('Sistema')).toBeInTheDocument();
  });

  it('la búsqueda de texto filtra por el ID o el título del elemento', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    const todos = await esperados();
    const etiqueta = todos[0]!.evento.elemento.etiqueta;
    const esperadas = await esperados({ texto: etiqueta });

    await usuario.type(screen.getByRole('searchbox'), etiqueta);

    await waitFor(() => expect(filas()).toHaveLength(esperadas.length));
  });

  it('una fecha inicial posterior a la final muestra el error del servicio', async () => {
    const usuario = userEvent.setup();
    await mostrar();

    await usuario.type(screen.getByLabelText('Desde'), '2026-11-10');
    await usuario.type(screen.getByLabelText('Hasta'), '2026-11-01');

    expect(await screen.findByRole('alert')).toHaveTextContent(/Revisa los datos ingresados/i);
  });

  it('un filtro sin coincidencias lo dice y «Limpiar filtros» vuelve a todos los eventos', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    const todos = await esperados();

    await usuario.type(screen.getByRole('searchbox'), 'zzz-no-existe');
    expect(await screen.findByText('Ningún evento coincide con los filtros')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    await waitFor(() => expect(filas()).toHaveLength(todos.length));
  });

  it('un clic en la fila abre el detalle con el valor anterior y el nuevo de cada campo', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    const todos = await esperados();
    const indice = todos.findIndex((e) => e.evento.cambios.length > 0);
    expect(indice).toBeGreaterThanOrEqual(0);
    const cambio = todos[indice]!.evento.cambios[0]!;

    await usuario.click(filas()[indice]!);

    const detalle = await screen.findByRole('dialog');
    expect(
      within(detalle).getByRole('columnheader', { name: 'Valor anterior' }),
    ).toBeInTheDocument();
    expect(within(detalle).getByRole('columnheader', { name: 'Valor nuevo' })).toBeInTheDocument();
    expect(within(detalle).getAllByRole('row').length).toBeGreaterThan(1);
    expect(cambio.campo.length).toBeGreaterThan(0);
    // Solo lectura: el detalle no ofrece acciones sobre el evento, solo cerrarlo.
    expect(within(detalle).queryByRole('button', { name: /editar|borrar|eliminar/i })).toBeNull();
  });

  it('el detalle muestra el motivo o la nota cuando el evento la tiene', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    const todos = await esperados();
    const indice = todos.findIndex((e) => e.evento.nota !== null && e.evento.nota !== '');
    expect(indice).toBeGreaterThanOrEqual(0);

    await usuario.click(filas()[indice]!);

    const detalle = await screen.findByRole('dialog');
    expect(within(detalle).getByText(`“${todos[indice]!.evento.nota}”`)).toBeInTheDocument();
  });

  it('el enlace del elemento lleva a su detalle sin abrir el panel', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    const enlace = screen.getAllByRole('link')[0]!;

    await usuario.click(enlace);

    expect(await screen.findByText('Detalle abierto')).toBeInTheDocument();
  });
});

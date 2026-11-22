import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import { crearEntorno, listarProyectos, obtenerIndicadores } from '@/services';
import { PaginaReportes } from './PaginaReportes';

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
    <MemoryRouter initialEntries={['/administrador/reportes?pestana=indicadores']}>
      <Routes>
        <Route path="/administrador/reportes" element={<PaginaReportes entorno={entorno} />} />
        <Route path="/administrador/*" element={<p>Detalle abierto</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando los indicadores' })).toBeNull(),
  );
}

describe('Reportes: pestaña «Indicadores»', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion();
  });

  it('abre con 30 días, el periodo en hora de Perú y las tablas por proyecto y por practicante', async () => {
    await mostrar();

    expect(screen.getByLabelText('Periodo (días)')).toHaveValue(30);
    expect(screen.getByText(/Del .+ al .+ · hora de Perú/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Indicadores por proyecto' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Indicadores por practicante' })).toBeInTheDocument();
  });

  it('un atajo cambia el periodo y repite la consulta', async () => {
    const usuario = userEvent.setup();
    await mostrar();

    await usuario.click(screen.getByRole('button', { name: '90 días' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '90 días' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
    expect(screen.getByLabelText('Periodo (días)')).toHaveValue(90);
  });

  it('un periodo fuera de 1 a 365 muestra el error del servicio', async () => {
    const usuario = userEvent.setup();
    await mostrar();

    const campo = screen.getByLabelText('Periodo (días)');
    await usuario.clear(campo);
    await usuario.type(campo, '400');
    await usuario.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('un periodo válido escrito a mano se aplica', async () => {
    const usuario = userEvent.setup();
    await mostrar();

    const campo = screen.getByLabelText('Periodo (días)');
    await usuario.clear(campo);
    await usuario.type(campo, '15');
    await usuario.click(screen.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '30 días' })).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('practicantes por área: el gráfico es una ayuda y la tabla es la alternativa accesible', async () => {
    await mostrar();

    const region = screen.getByRole('region', { name: 'Practicantes por área' });
    expect(within(region).getByTestId('grafico-practicantes-por-area')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(within(region).getByRole('columnheader', { name: 'Área' })).toBeInTheDocument();
    expect(within(region).getAllByRole('row').length).toBeGreaterThan(1);
  });

  it('el selector de proyecto abre en «Todos los proyectos» y ofrece los proyectos que entrega la consulta', async () => {
    await mostrar();

    const select = screen.getByLabelText('Proyecto');
    expect(select).toHaveValue('');
    const r = await listarProyectos({ idActor: ADMIN }, entorno);
    if (!r.ok) throw new Error(r.mensaje);
    await waitFor(() =>
      expect(within(select).getAllByRole('option')).toHaveLength(r.valor.proyectos.length + 1),
    );
  });

  it('el filtro por proyecto deja solo ese proyecto en la tabla', async () => {
    const usuario = userEvent.setup();
    await mostrar();

    const select = screen.getByLabelText('Proyecto');
    await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(2));
    const opcion = within(select).getAllByRole('option')[1]!;
    await usuario.selectOptions(select, opcion);

    await waitFor(() => {
      const region = screen.getByRole('region', { name: 'Indicadores por proyecto' });
      expect(within(region).getAllByRole('row')).toHaveLength(2);
    });
    const region = screen.getByRole('region', { name: 'Indicadores por proyecto' });
    expect(within(region).getByText(opcion.textContent!)).toBeInTheDocument();
  });

  it('el gráfico por área respeta el proyecto elegido: la tabla alternativa cuenta solo a sus practicantes', async () => {
    const usuario = userEvent.setup();
    await mostrar();

    const lista = await listarProyectos({ idActor: ADMIN }, entorno);
    if (!lista.ok) throw new Error(lista.mensaje);
    // Un proyecto con equipo asignado: así el filtrado no coincide con el total de la organización.
    const idProyecto = lista.valor.proyectos[0]!.id;
    const esperado = await obtenerIndicadores({ idActor: ADMIN, id_proyecto: idProyecto }, entorno);
    if (!esperado.ok || esperado.valor.vista !== 'ADMINISTRADOR') throw new Error('sin datos');
    const areas = esperado.valor.practicantes_por_area;

    const select = screen.getByLabelText('Proyecto');
    await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(1));
    await usuario.selectOptions(select, idProyecto);

    const region = screen.getByRole('region', { name: 'Practicantes por área' });
    await waitFor(() => {
      const filas = within(region).getAllByRole('row').slice(1);
      expect(filas.map((f) => f.textContent)).toEqual(
        areas.map((a) => a.area.nombre + a.practicantes),
      );
    });
    expect(within(region).getByTestId('grafico-practicantes-por-area')).toBeInTheDocument();
  });

  it('enlaza los proyectos a su detalle y muestra «Sin datos» o porcentajes, nunca vacío', async () => {
    await mostrar();

    expect(screen.getAllByText(/Sin datos|Sin actividad|\d+ %/).length).toBeGreaterThan(0);
    const region = screen.getByRole('region', { name: 'Indicadores por proyecto' });
    expect(within(region).getAllByRole('link').length).toBeGreaterThan(0);
  });
});

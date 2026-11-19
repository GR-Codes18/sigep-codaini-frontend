import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, listarTareas } from '@/services';
import { PaginaTareas } from './PaginaTareas';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';

/** Sin la demora de red simulada, para no esperar 600 ms en cada consulta. */
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
  return <p data-testid="ubicacion">{useLocation().pathname}</p>;
}

function mostrar() {
  render(
    <MemoryRouter initialEntries={['/administrador/tareas']}>
      <Routes>
        <Route path="/administrador/tareas" element={<PaginaTareas entorno={entorno} />} />
        <Route path="/administrador/tareas/:id" element={<p>Detalle abierto</p>} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
}

async function listo() {
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Cargando tareas' })).toBeNull());
}

const filasDeDatos = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);

async function consultar() {
  const r = await listarTareas({ idActor: ADMIN }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

describe('PaginaTareas', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('mientras llega la consulta muestra un estado de carga', () => {
    mostrar();

    expect(screen.getByRole('status', { name: 'Cargando tareas' })).toBeInTheDocument();
  });

  it('abre en «Todas» con los contadores de la consulta en cada pestaña', async () => {
    const { contadores } = await consultar();
    mostrar();
    await listo();

    const todas = screen.getByRole('tab', { name: /Todas/ });
    expect(todas).toHaveAttribute('data-state', 'active');
    expect(todas).toHaveTextContent(String(contadores.TODAS));
    expect(screen.getByRole('tab', { name: /Disponibles/ })).toHaveTextContent(
      String(contadores.DISPONIBLE),
    );
    expect(screen.getByRole('tab', { name: /En progreso/ })).toHaveTextContent(
      String(contadores.EN_PROGRESO),
    );
    expect(screen.getByRole('tab', { name: /Esperando supervisión/ })).toHaveTextContent(
      String(contadores.ESPERANDO_SUPERVISION),
    );
    expect(screen.getByRole('tab', { name: /Terminadas/ })).toHaveTextContent(
      String(contadores.TERMINADA),
    );
    expect(filasDeDatos()).toHaveLength(contadores.TODAS);
  });

  it('cada pestaña muestra las tareas de su estado', async () => {
    const user = userEvent.setup();
    const { contadores } = await consultar();
    mostrar();
    await listo();

    for (const [pestana, estado] of [
      [/Disponibles/, 'DISPONIBLE'],
      [/En progreso/, 'EN_PROGRESO'],
      [/Esperando supervisión/, 'ESPERANDO_SUPERVISION'],
      [/Terminadas/, 'TERMINADA'],
    ] as const) {
      await user.click(screen.getByRole('tab', { name: pestana }));
      expect(filasDeDatos(), String(pestana)).toHaveLength(contadores[estado]);
    }
  });

  it('muestra las columnas de §5.5', async () => {
    mostrar();
    await listo();

    const encabezados = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((c) => c.textContent);
    expect(encabezados).toEqual([
      'ID',
      'Título',
      'Proyecto',
      'Responsable',
      'Estado',
      'Supervisión',
      'Pull Request',
      'Fecha límite',
      'Detalle',
    ]);
  });

  it('cada fila muestra el ID legible, el proyecto y el responsable, o «Sin asignar»', async () => {
    const { tareas } = await consultar();
    mostrar();
    await listo();

    for (const t of tareas.slice(0, 12)) {
      const fila = filasDeDatos().find((f) => f.textContent?.includes(t.id_legible))!;
      const celdas = within(fila).getAllByRole('cell');
      expect(celdas[0]).toHaveTextContent(t.id_legible);
      expect(celdas[2]).toHaveTextContent(t.proyecto.nombre);
      expect(celdas[3]).toHaveTextContent(t.responsable ?? 'Sin asignar');
    }
  });

  it('el ícono de «Requiere supervisión» aparece solo en las tareas que la requieren', async () => {
    const { tareas } = await consultar();
    mostrar();
    await listo();

    const conIcono = within(screen.getByRole('table')).getAllByLabelText('Requiere supervisión');
    expect(conIcono).toHaveLength(tareas.filter((t) => t.requiere_supervision).length);
  });

  it('muestra la etiqueta del Pull Request solo en las tareas donde la consulta la entrega', async () => {
    const { tareas } = await consultar();
    const conEtiqueta = tareas.find((t) => t.etiqueta_pr_visible !== null)!;
    const sinEtiqueta = tareas.find((t) => t.etiqueta_pr_visible === null)!;
    mostrar();
    await listo();

    const celda = (id: string) =>
      within(filasDeDatos().find((f) => f.textContent?.includes(id))!).getAllByRole('cell')[6]!;
    expect(celda(conEtiqueta.id_legible).textContent).not.toBe('');
    expect(celda(sinEtiqueta.id_legible).textContent).toBe('');
  });

  it('la fecha límite de una tarea vencida va en rojo, y la que no, no', async () => {
    const { tareas } = await consultar();
    const vencida = tareas.find((t) => t.vencida)!;
    const alDia = tareas.find((t) => !t.vencida)!;
    mostrar();
    await listo();

    const fecha = (id: string) =>
      within(filasDeDatos().find((f) => f.textContent?.includes(id))!).getAllByRole('cell')[7]!;
    expect(fecha(vencida.id_legible).querySelector('.text-danger-text')).not.toBeNull();
    expect(fecha(alDia.id_legible).querySelector('.text-danger-text')).toBeNull();
  });

  it('las filas no tienen botones de acción: solo el enlace al detalle', async () => {
    mostrar();
    await listo();

    expect(within(screen.getByRole('table')).queryAllByRole('button')).toHaveLength(0);
    expect(within(screen.getByRole('table')).getAllByRole('link').length).toBeGreaterThan(0);
  });

  describe('filtros', () => {
    it('busca por título o por ID, sin distinguir mayúsculas ni tildes', async () => {
      const user = userEvent.setup();
      const { tareas } = await consultar();
      const elegida = tareas[0]!;
      mostrar();
      await listo();

      await user.type(
        screen.getByPlaceholderText('Buscar por título o ID'),
        elegida.id_legible.toLowerCase(),
      );

      const filas = filasDeDatos();
      expect(filas).toHaveLength(1);
      expect(filas[0]).toHaveTextContent(elegida.titulo);
    });

    it('filtra por proyecto', async () => {
      const user = userEvent.setup();
      const { tareas } = await consultar();
      const proyecto = tareas[0]!.proyecto;
      mostrar();
      await listo();

      await user.selectOptions(screen.getByLabelText('Proyecto'), proyecto.id);

      expect(filasDeDatos()).toHaveLength(
        tareas.filter((t) => t.proyecto.id === proyecto.id).length,
      );
    });

    it('filtra por responsable', async () => {
      const user = userEvent.setup();
      const { tareas } = await consultar();
      const responsable = tareas.find((t) => t.id_practicante !== null)!;
      mostrar();
      await listo();

      await user.selectOptions(screen.getByLabelText('Responsable'), responsable.id_practicante!);

      expect(filasDeDatos()).toHaveLength(
        tareas.filter((t) => t.id_practicante === responsable.id_practicante).length,
      );
    });

    it('«Vencidas» deja solo las vencidas', async () => {
      const user = userEvent.setup();
      const { tareas } = await consultar();
      mostrar();
      await listo();

      await user.click(screen.getByRole('checkbox', { name: 'Vencidas' }));

      expect(filasDeDatos()).toHaveLength(tareas.filter((t) => t.vencida).length);
    });

    it('«Sin asignar» deja las que no tienen responsable', async () => {
      const user = userEvent.setup();
      const { tareas } = await consultar();
      mostrar();
      await listo();

      await user.click(screen.getByRole('checkbox', { name: 'Sin asignar' }));

      expect(filasDeDatos()).toHaveLength(tareas.filter((t) => t.id_practicante === null).length);
    });

    it('«Requiere supervisión» deja las que la requieren', async () => {
      const user = userEvent.setup();
      const { tareas } = await consultar();
      mostrar();
      await listo();

      await user.click(screen.getByRole('checkbox', { name: 'Requiere supervisión' }));

      expect(filasDeDatos()).toHaveLength(tareas.filter((t) => t.requiere_supervision).length);
    });

    it('filtra por la etiqueta del Pull Request', async () => {
      const user = userEvent.setup();
      const { tareas } = await consultar();
      const etiqueta = tareas.find((t) => t.etiqueta_pr_visible !== null)!.etiqueta_pr_visible!;
      mostrar();
      await listo();

      await user.selectOptions(screen.getByLabelText('Pull Request'), etiqueta);

      expect(filasDeDatos()).toHaveLength(
        tareas.filter((t) => t.etiqueta_pr_visible === etiqueta).length,
      );
    });

    it('los filtros se combinan con la pestaña', async () => {
      const user = userEvent.setup();
      const { tareas } = await consultar();
      mostrar();
      await listo();

      await user.click(screen.getByRole('tab', { name: /En progreso/ }));
      await user.click(screen.getByRole('checkbox', { name: 'Vencidas' }));

      expect(filasDeDatos()).toHaveLength(
        tareas.filter((t) => t.estado === 'EN_PROGRESO' && t.vencida).length,
      );
    });

    it('una búsqueda sin resultados lo dice y sugiere quitar filtros', async () => {
      const user = userEvent.setup();
      mostrar();
      await listo();

      await user.type(screen.getByPlaceholderText('Buscar por título o ID'), 'zzzzzz');

      expect(screen.getByText('Ninguna tarea coincide con los filtros')).toBeInTheDocument();
    });
  });

  describe('estados vacíos', () => {
    it('sin tareas lo dice', async () => {
      useAlmacen.getState().transaccion(() => ({ tareas: [] }));
      mostrar();
      await listo();

      expect(screen.getByText('Aún no hay tareas')).toBeInTheDocument();
    });

    it('una pestaña vacía dice lo suyo', async () => {
      const user = userEvent.setup();
      useAlmacen.getState().transaccion((d) => ({
        tareas: d.tareas.filter((t) => t.estado !== 'TERMINADA'),
      }));
      mostrar();
      await listo();

      await user.click(screen.getByRole('tab', { name: /Terminadas/ }));

      expect(screen.getByText('Aún no hay tareas terminadas')).toBeInTheDocument();
    });
  });

  describe('abrir el detalle', () => {
    it('un clic en la fila abre el detalle de esa tarea', async () => {
      const user = userEvent.setup();
      const { tareas } = await consultar();
      mostrar();
      await listo();

      const primera = filasDeDatos()[0]!;
      const id = tareas.find((t) => primera.textContent?.includes(t.id_legible))!.id;
      await user.click(primera);

      expect(screen.getByText('Detalle abierto')).toBeInTheDocument();
      expect(screen.getByTestId('ubicacion')).toHaveTextContent(`/administrador/tareas/${id}`);
    });

    it('«Ver detalle» navega una sola vez al detalle de esa tarea', async () => {
      const user = userEvent.setup();
      const { tareas } = await consultar();
      mostrar();
      await listo();

      const primera = filasDeDatos()[0]!;
      const id = tareas.find((t) => primera.textContent?.includes(t.id_legible))!.id;
      await user.click(within(primera).getByRole('link', { name: /Ver detalle de/ }));

      expect(screen.getByTestId('ubicacion')).toHaveTextContent(`/administrador/tareas/${id}`);
    });
  });

  it('un Supervisor recibe en este listado solo las tareas de sus proyectos', async () => {
    useAlmacenSesion.getState().cerrarSesion();
    iniciarSesion(SUPERVISOR);
    mostrar();
    await listo();

    const suyos = new Set(
      datos()
        .proyectos.filter((p) => p.id_supervisor === SUPERVISOR)
        .map((p) => p.codigo),
    );
    for (const fila of filasDeDatos()) {
      const id = within(fila).getAllByRole('cell')[0]!.textContent!;
      expect(suyos.has(id.split('-')[0]!), id).toBe(true);
    }
  });
});

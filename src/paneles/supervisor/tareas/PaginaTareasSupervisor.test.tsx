import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { textoDiasEsperando } from '@/app/adaptadores';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, listarTareas } from '@/services';
import { PaginaDetalleTarea } from '@/paneles/administrador/tareas/PaginaDetalleTarea';
import { PaginaTareas } from '@/paneles/administrador/tareas/PaginaTareas';

const SUPERVISOR = 'demo-supervisor';
const SUPERVISOR_SIN_COLA = 'usr-sup-02';

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

async function mostrar(idUsuario: Id = SUPERVISOR, ruta = '/supervisor/tareas') {
  iniciarSesion(idUsuario);
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/supervisor/tareas" element={<PaginaTareas entorno={entorno} />} />
        <Route
          path="/supervisor/tareas/:idTarea"
          element={<PaginaDetalleTarea entorno={entorno} />}
        />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
}

async function esperarLista() {
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Cargando tareas' })).toBeNull());
}

async function consulta(idActor: Id) {
  const r = await listarTareas({ idActor }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

const pestana = (nombre: RegExp) => screen.getByRole('tab', { name: nombre });
const filas = () => screen.queryAllByRole('row').slice(1);

describe('Tareas del Supervisor (§9.1.3)', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  describe('la pestaña inicial', () => {
    it('abre en «Esperando supervisión» si hay tareas ahí', async () => {
      const v = await consulta(SUPERVISOR);
      expect(v.contadores.ESPERANDO_SUPERVISION).toBeGreaterThan(0);

      await mostrar();
      await esperarLista();

      await waitFor(() =>
        expect(pestana(/^Esperando supervisión/)).toHaveAttribute('data-state', 'active'),
      );
      expect(filas()).toHaveLength(v.contadores.ESPERANDO_SUPERVISION);
    });

    it('abre en «Todas» si no hay tareas esperando su supervisión', async () => {
      const v = await consulta(SUPERVISOR_SIN_COLA);
      expect(v.contadores.ESPERANDO_SUPERVISION).toBe(0);

      await mostrar(SUPERVISOR_SIN_COLA);
      await esperarLista();

      expect(pestana(/^Todas/)).toHaveAttribute('data-state', 'active');
    });

    it('una pestaña pedida en la dirección gana a la del rol', async () => {
      await mostrar(SUPERVISOR, '/supervisor/tareas?pestana=EN_PROGRESO');
      await esperarLista();

      expect(pestana(/^En progreso/)).toHaveAttribute('data-state', 'active');
    });

    it('«Esperando supervisión» lleva contador y se resalta en ámbar si tiene tareas', async () => {
      const v = await consulta(SUPERVISOR);
      await mostrar();
      await esperarLista();

      const contador = within(pestana(/^Esperando supervisión/)).getByText(/^\d+$/);
      expect(contador).toHaveTextContent(String(v.contadores.ESPERANDO_SUPERVISION));
      expect(contador.className).toContain('state-warning');
    });

    it('sin tareas esperando, el contador no se resalta', async () => {
      await mostrar(SUPERVISOR_SIN_COLA);
      await esperarLista();

      const contador = within(pestana(/^Esperando supervisión/)).getByText(/^\d+$/);
      expect(contador).toHaveTextContent('0');
      expect(contador.className).not.toContain('state-warning');
    });
  });

  describe('mientras llegan los contadores', () => {
    const lento = crearEntorno({ demoraMs: 40 });

    function mostrarLento(idUsuario: Id) {
      iniciarSesion(idUsuario);
      render(
        <MemoryRouter initialEntries={['/supervisor/tareas']}>
          <Routes>
            <Route path="/supervisor/tareas" element={<PaginaTareas entorno={lento} />} />
          </Routes>
        </MemoryRouter>,
      );
    }

    it('solo muestra el esqueleto de carga: no se ve la pestaña «Todas» antes de la que corresponde', async () => {
      mostrarLento(SUPERVISOR);

      expect(screen.getByRole('status', { name: 'Cargando tareas' })).toBeInTheDocument();
      expect(screen.queryByRole('tab')).toBeNull();
      expect(screen.queryByLabelText('Proyecto')).toBeNull();

      // Las pestañas aparecen ya con la inicial elegida: nunca estuvo activa otra.
      await waitFor(() => expect(screen.queryAllByRole('tab').length).toBeGreaterThan(0));
      expect(pestana(/^Esperando supervisión/)).toHaveAttribute('data-state', 'active');
      expect(pestana(/^Todas/)).toHaveAttribute('data-state', 'inactive');
      expect(screen.queryByRole('status', { name: 'Cargando tareas' })).toBeNull();
    });

    it('un supervisor sin cola abre en «Todas» al tener los contadores', async () => {
      mostrarLento(SUPERVISOR_SIN_COLA);

      expect(screen.queryByRole('tab')).toBeNull();
      await waitFor(() => expect(screen.queryAllByRole('tab').length).toBeGreaterThan(0));
      expect(pestana(/^Todas/)).toHaveAttribute('data-state', 'active');
    });
  });

  describe('«Días esperando»', () => {
    it('la columna aparece en «Esperando supervisión» y en ninguna otra pestaña', async () => {
      const usuario = userEvent.setup();
      await mostrar();
      await esperarLista();

      await waitFor(() =>
        expect(screen.getByRole('columnheader', { name: 'Días esperando' })).toBeInTheDocument(),
      );

      await usuario.click(pestana(/^Todas/));
      await waitFor(() =>
        expect(screen.queryByRole('columnheader', { name: 'Días esperando' })).toBeNull(),
      );
      await usuario.click(pestana(/^En progreso/));
      expect(screen.queryByRole('columnheader', { name: 'Días esperando' })).toBeNull();
    });

    it('cada fila dice cuántos días lleva esperando, según la consulta', async () => {
      const v = await consulta(SUPERVISOR);
      await mostrar();
      await esperarLista();
      await waitFor(() => expect(filas().length).toBeGreaterThan(0));

      const esperando = v.tareas.filter((t) => t.estado === 'ESPERANDO_SUPERVISION');
      for (const t of esperando) {
        const fila = filas().find((f) => within(f).queryByText(t.id_legible) !== null)!;
        expect(fila).toHaveTextContent(textoDiasEsperando(t.dias_esperando));
      }
    });
  });

  it('las filas no tienen botones de acción: aprobar y devolver son solo del detalle (§6.7)', async () => {
    await mostrar();
    await esperarLista();
    await waitFor(() => expect(filas().length).toBeGreaterThan(0));

    expect(
      screen.queryByRole('button', { name: /aprobar|devolver|liberar|reabrir|eliminar/i }),
    ).toBeNull();
  });

  it('sin tareas esperando su supervisión, la pestaña lo dice con su mensaje', async () => {
    const usuario = userEvent.setup();
    await mostrar(SUPERVISOR_SIN_COLA);
    await esperarLista();

    await usuario.click(pestana(/^Esperando supervisión/));

    expect(
      await screen.findByText('No tienes tareas esperando tu supervisión'),
    ).toBeInTheDocument();
  });

  describe('solo tareas de sus proyectos', () => {
    it('el listado, «Todas», trae únicamente tareas de sus proyectos', async () => {
      const usuario = userEvent.setup();
      await mostrar();
      await esperarLista();
      await usuario.click(pestana(/^Todas/));

      const misProyectos = new Set(
        datos()
          .proyectos.filter((p) => p.id_supervisor === SUPERVISOR)
          .map((p) => p.id),
      );
      const ajenas = datos().tareas.filter((t) => !misProyectos.has(t.id_proyecto));
      expect(ajenas.length).toBeGreaterThan(0);
      const propias = datos().tareas.filter(
        (t) => misProyectos.has(t.id_proyecto) && t.estado !== undefined,
      );
      await waitFor(() => expect(filas().length).toBeGreaterThan(0));
      expect(filas().length).toBeLessThanOrEqual(propias.length);
      for (const t of ajenas.slice(0, 20)) {
        expect(screen.queryByText(t.titulo)).toBeNull();
      }
    });

    it('los filtros de proyecto y de responsable solo ofrecen los suyos', async () => {
      const usuario = userEvent.setup();
      await mostrar();
      await esperarLista();
      await usuario.click(pestana(/^Todas/));

      const proyectos = within(screen.getByLabelText('Proyecto')).getAllByRole('option').slice(1);
      const nombresPropios = datos()
        .proyectos.filter((p) => p.id_supervisor === SUPERVISOR)
        .map((p) => p.nombre);
      for (const o of proyectos) expect(nombresPropios).toContain(o.textContent);
      const ajenos = datos().proyectos.filter((p) => p.id_supervisor !== SUPERVISOR);
      for (const p of ajenos) {
        expect(within(screen.getByLabelText('Proyecto')).queryByText(p.nombre)).toBeNull();
      }
    });

    it('la dirección del detalle de una tarea ajena no muestra nada de la tarea', async () => {
      const mios = new Set(
        datos()
          .proyectos.filter((p) => p.id_supervisor === SUPERVISOR)
          .map((p) => p.id),
      );
      const ajena = datos().tareas.find((t) => !mios.has(t.id_proyecto))!;

      await mostrar(SUPERVISOR, `/supervisor/tareas/${ajena.id}`);

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.queryByText(ajena.titulo)).toBeNull();
      expect(screen.queryByRole('button', { name: /aprobar|devolver/i })).toBeNull();
    });
  });

  describe('el detalle', () => {
    async function primeraEsperando() {
      const v = await consulta(SUPERVISOR);
      return v.tareas.find((t) => t.estado === 'ESPERANDO_SUPERVISION')!;
    }

    it('un clic en la fila abre el detalle bajo el prefijo del Supervisor y «Volver» regresa al listado', async () => {
      const usuario = userEvent.setup();
      const t = await primeraEsperando();
      await mostrar();
      await esperarLista();
      await waitFor(() => expect(filas().length).toBeGreaterThan(0));

      await usuario.click(filas().find((f) => within(f).queryByText(t.id_legible) !== null)!);

      await waitFor(() =>
        expect(screen.getByTestId('ubicacion')).toHaveTextContent(`/supervisor/tareas/${t.id}`),
      );
      await usuario.click(await screen.findByRole('button', { name: /Volver al listado/ }));
      await waitFor(() =>
        expect(screen.getByTestId('ubicacion')).toHaveTextContent(/^\/supervisor\/tareas$/),
      );
    });

    it('en una tarea esperando su supervisión ofrece Aprobar y Devolver', async () => {
      const t = await primeraEsperando();

      await mostrar(SUPERVISOR, `/supervisor/tareas/${t.id}`);

      expect(await screen.findByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Devolver' })).toBeInTheDocument();
    });

    it('con el proyecto en pausa todavía puede aprobar y devolver lo que estaba en revisión', async () => {
      const t = await primeraEsperando();
      useAlmacen.getState().transaccion((d) => ({
        proyectos: d.proyectos.map((p) =>
          p.id === t.proyecto.id ? { ...p, estado: 'EN_PAUSA' as const } : p,
        ),
      }));

      await mostrar(SUPERVISOR, `/supervisor/tareas/${t.id}`);

      expect(await screen.findByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Devolver' })).toBeInTheDocument();
    });
  });

  describe('«Nueva tarea»', () => {
    it('solo ofrece sus proyectos', async () => {
      const usuario = userEvent.setup();
      const v = await consulta(SUPERVISOR);
      expect(v.proyectos_para_crear.length).toBeGreaterThan(0);
      await mostrar();
      await esperarLista();

      await usuario.click(await screen.findByRole('button', { name: 'Nueva tarea' }));

      const dialogo = await screen.findByRole('dialog');
      const opciones = within(within(dialogo).getByLabelText('Proyecto'))
        .getAllByRole('option')
        .map((o) => o.textContent ?? '');
      for (const p of v.proyectos_para_crear) {
        expect(opciones.some((o) => o.includes(p.nombre))).toBe(true);
      }
      const ajenos = datos().proyectos.filter((p) => p.id_supervisor !== SUPERVISOR);
      for (const p of ajenos) {
        expect(opciones.some((o) => o.includes(p.nombre))).toBe(false);
      }
    });
  });
});

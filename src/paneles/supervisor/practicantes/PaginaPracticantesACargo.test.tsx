import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, listarPracticantesACargo } from '@/services';
import { PaginaPracticantesACargo } from './PaginaPracticantesACargo';

const SUPERVISOR = 'demo-supervisor';

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
    <MemoryRouter initialEntries={['/supervisor/practicantes']}>
      <Routes>
        <Route
          path="/supervisor/practicantes"
          element={<PaginaPracticantesACargo entorno={entorno} />}
        />
        <Route path="/supervisor/practicantes/:idPracticante" element={<p>Detalle abierto</p>} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando practicantes' })).toBeNull(),
  );
}

async function consulta(idActor: Id = SUPERVISOR) {
  const r = await listarPracticantesACargo({ idActor }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

const filas = () => screen.queryAllByRole('row').slice(1);
const pestana = (nombre: RegExp) => screen.getByRole('tab', { name: nombre });

describe('Practicantes a cargo (Supervisor, §9.1.2)', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('abre en «Activos» con una tabla de sus practicantes, con las columnas de §9.1.2', async () => {
    await mostrar();
    const v = await consulta();
    expect(v.contadores.ACTIVOS).toBeGreaterThan(0);

    expect(screen.getByRole('heading', { name: 'Practicantes a cargo' })).toBeInTheDocument();
    expect(pestana(/^Activos/)).toHaveAttribute('data-state', 'active');
    for (const c of [
      'Practicante',
      'Especialidad',
      'Proyectos',
      'Carga',
      'Esperando mi revisión',
      'Última actividad',
      'Detalle',
    ]) {
      expect(screen.getByRole('columnheader', { name: c })).toBeInTheDocument();
    }
    expect(filas()).toHaveLength(v.contadores.ACTIVOS);
  });

  it('las pestañas Activos y Anteriores llevan los contadores de la consulta', async () => {
    await mostrar();
    const v = await consulta();

    expect(pestana(/^Activos/)).toHaveTextContent(String(v.contadores.ACTIVOS));
    expect(pestana(/^Anteriores/)).toHaveTextContent(String(v.contadores.ANTERIORES));
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('cada fila trae nombre y correo, especialidad, proyectos suyos, carga y revisión, sin área técnica', async () => {
    await mostrar();
    const v = await consulta();
    const p = v.practicantes.find((x) => x.situacion === 'ACTIVO')!;

    const fila = filas().find((f) => within(f).queryByText(p.correo) !== null)!;
    expect(fila).toHaveTextContent(p.nombre);
    expect(fila).toHaveTextContent(p.especialidad ?? 'Sin especialidad');
    for (const x of p.proyectos.filter((y) => y.fecha_baja === null)) {
      expect(fila).toHaveTextContent(x.proyecto.nombre);
    }
    // El Supervisor no ve el área técnica.
    expect(screen.queryByRole('columnheader', { name: /área/i })).toBeNull();
  });

  it('una persona en dos de sus proyectos aparece en una sola fila con ambos', async () => {
    const mios = datos().proyectos.filter((p) => p.id_supervisor === SUPERVISOR);
    expect(mios.length).toBeGreaterThanOrEqual(2);
    const asignada = datos().asignaciones.find(
      (a) => a.id_proyecto === mios[0]!.id && a.fecha_baja === null,
    )!;
    // La misma persona en el segundo proyecto del Supervisor (si ya estaba, no se duplica).
    if (
      !datos().asignaciones.some(
        (a) =>
          a.id_practicante === asignada.id_practicante &&
          a.id_proyecto === mios[1]!.id &&
          a.fecha_baja === null,
      )
    ) {
      useAlmacen.getState().transaccion((d) => ({
        asignaciones: [
          ...d.asignaciones,
          { ...asignada, id: 'asg-prueba', id_proyecto: mios[1]!.id },
        ],
      }));
    }
    await mostrar();
    const nombre = datos().usuarios.find((u) => u.id === asignada.id_practicante)!.nombre;

    const suyas = filas().filter((f) => within(f).queryByText(nombre) !== null);
    expect(suyas).toHaveLength(1);
    expect(suyas[0]).toHaveTextContent(mios[0]!.nombre);
    expect(suyas[0]).toHaveTextContent(mios[1]!.nombre);
  });

  it('solo aparecen practicantes de sus proyectos: ningún dato de personas ajenas llega a la pantalla', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    const v = await consulta();
    const mios = new Set(v.practicantes.map((p) => p.id));
    const ajenos = datos()
      .practicantes.filter((p) => !mios.has(p.id_usuario))
      .map((p) => datos().usuarios.find((u) => u.id === p.id_usuario)!);
    expect(ajenos.length).toBeGreaterThan(0);

    for (const pestanaActual of [/^Activos/, /^Anteriores/]) {
      await usuario.click(pestana(pestanaActual));
      for (const a of ajenos) {
        expect(screen.queryByText(a.nombre)).toBeNull();
        expect(screen.queryByText(a.correo)).toBeNull();
      }
    }
  });

  it('el filtro de proyecto solo ofrece los suyos y filtra', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    const mios = datos().proyectos.filter((p) => p.id_supervisor === SUPERVISOR);
    const select = screen.getByLabelText('Proyecto');

    const opciones = within(select).getAllByRole('option').slice(1);
    for (const o of opciones) expect(mios.map((p) => p.nombre)).toContain(o.textContent);
    for (const p of datos().proyectos.filter((x) => x.id_supervisor !== SUPERVISOR)) {
      expect(within(select).queryByText(p.nombre)).toBeNull();
    }

    await usuario.selectOptions(select, opciones[0]!);
    await waitFor(() => expect(filas().length).toBeGreaterThan(0));
    for (const f of filas()) expect(f).toHaveTextContent(opciones[0]!.textContent!);
  });

  it('la búsqueda filtra por nombre o por correo', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    const v = await consulta();
    const p = v.practicantes.find((x) => x.situacion === 'ACTIVO')!;

    await usuario.type(screen.getByRole('searchbox'), p.correo);
    await waitFor(() => expect(filas()).toHaveLength(1));
    expect(filas()[0]).toHaveTextContent(p.nombre);

    await usuario.clear(screen.getByRole('searchbox'));
    await usuario.type(screen.getByRole('searchbox'), 'zzz-no-existe');
    expect(
      await screen.findByText('Ningún practicante coincide con los filtros'),
    ).toBeInTheDocument();
  });

  it('en «Anteriores» aparecen quienes ya salieron de sus proyectos, con la fecha de baja', async () => {
    const usuario = userEvent.setup();
    const mios = datos().proyectos.filter((p) => p.id_supervisor === SUPERVISOR);
    const asignada = datos().asignaciones.find(
      (a) => a.id_proyecto === mios[0]!.id && a.fecha_baja === null,
    )!;
    // Se da de baja a una persona de un solo proyecto suyo para que quede en «Anteriores».
    useAlmacen.getState().transaccion((d) => ({
      asignaciones: d.asignaciones.map((a) =>
        a.id_practicante === asignada.id_practicante && mios.some((p) => p.id === a.id_proyecto)
          ? { ...a, fecha_baja: '2026-11-10' }
          : a,
      ),
    }));
    await mostrar();
    const nombre = datos().usuarios.find((u) => u.id === asignada.id_practicante)!.nombre;

    await usuario.click(pestana(/^Anteriores/));

    const fila = (await screen.findAllByRole('row')).find(
      (f) => within(f).queryByText(nombre) !== null,
    )!;
    expect(fila).toHaveTextContent('10 nov 2026');
    expect(screen.getByRole('columnheader', { name: 'Fecha de baja' })).toBeInTheDocument();
  });

  it('no ofrece ninguna acción de gestión: ni asignar, ni finalizar, ni reactivar, ni restablecer contraseña', async () => {
    await mostrar();

    expect(
      screen.queryByRole('button', {
        name: /asignar|finalizar|reactivar|restablecer|notificar|nuevo/i,
      }),
    ).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('un supervisor sin practicantes en sus proyectos ve el mensaje y no un error', async () => {
    useAlmacen.getState().transaccion((d) => ({
      asignaciones: d.asignaciones.filter(
        (a) => !d.proyectos.some((p) => p.id === a.id_proyecto && p.id_supervisor === SUPERVISOR),
      ),
    }));
    await mostrar();

    expect(
      await screen.findByText('Aún no tienes practicantes asignados en tus proyectos'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('un clic en la fila abre el detalle bajo el prefijo del Supervisor', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    const p = (await consulta()).practicantes.find((x) => x.situacion === 'ACTIVO')!;

    await usuario.click(filas().find((f) => within(f).queryByText(p.correo) !== null)!);

    expect(await screen.findByText('Detalle abierto')).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion')).toHaveTextContent(`/supervisor/practicantes/${p.id}`);
  });
});

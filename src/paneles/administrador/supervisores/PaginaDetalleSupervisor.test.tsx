import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, obtenerSupervisor } from '@/services';
import { PaginaDetalleSupervisor } from './PaginaDetalleSupervisor';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // pry-pl2d y pry-rsv
const CON_ANTERIORES = 'usr-sup-02'; // pry-tie (finalizado) y pry-dat

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

async function mostrar(idSupervisor: Id) {
  render(
    <MemoryRouter initialEntries={[`/administrador/supervisores/${idSupervisor}`]}>
      <Routes>
        <Route
          path="/administrador/supervisores/:idSupervisor"
          element={<PaginaDetalleSupervisor entorno={entorno} />}
        />
        <Route path="/administrador/supervisores" element={<p>Listado abierto</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando el supervisor' })).toBeNull(),
  );
}

async function consultar(id: Id) {
  const r = await obtenerSupervisor({ idActor: ADMIN, idSupervisor: id }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

describe('PaginaDetalleSupervisor', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('mientras llega la consulta muestra un estado de carga', () => {
    void mostrar(SUPERVISOR);

    expect(screen.getByRole('status', { name: 'Cargando el supervisor' })).toBeInTheDocument();
  });

  it('muestra el nombre, el estado y los datos de contacto de solo lectura', async () => {
    const origen = await consultar(SUPERVISOR);
    await mostrar(SUPERVISOR);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(origen.datos.nombre);
    const cabecera = screen.getByRole('heading', { level: 1 }).closest('header')!;
    expect(within(cabecera).getByText('Activo')).toBeInTheDocument();
    const contacto = screen.getByRole('region', { name: 'Datos de contacto' });
    expect(contacto).toHaveTextContent(origen.datos.correo);
    expect(contacto).toHaveTextContent(origen.datos.celular);
    expect(within(contacto).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(contacto).queryByRole('button')).not.toBeInTheDocument();
  });

  it('un supervisor desactivado se ve como «Inactivo»', async () => {
    useAlmacen.getState().transaccion((d) => ({
      usuarios: d.usuarios.map((u) =>
        u.id === 'usr-sup-03' ? { ...u, estado: 'INACTIVO' as const } : u,
      ),
    }));
    await mostrar('usr-sup-03');

    const cabecera = screen.getByRole('heading', { level: 1 }).closest('header')!;
    expect(within(cabecera).getByText('Inactivo')).toBeInTheDocument();
  });

  it('lista sus proyectos a cargo con la reunión y cuántos practicantes tienen', async () => {
    const origen = await consultar(SUPERVISOR);
    expect(origen.proyectos_a_cargo.length).toBeGreaterThan(0);
    await mostrar(SUPERVISOR);

    const region = screen.getByRole('region', { name: 'Proyectos a cargo' });
    for (const p of origen.proyectos_a_cargo) {
      expect(region).toHaveTextContent(p.proyecto.nombre);
    }
    expect(region).toHaveTextContent('Reunión semanal:');
    expect(region).toHaveTextContent(/\d+ practicantes?/);
  });

  it('un proyecto sin reunión dice «Sin definir»', async () => {
    useAlmacen.getState().transaccion((d) => ({
      proyectos: d.proyectos.map((p) =>
        p.id_supervisor === SUPERVISOR ? { ...p, dia_reunion: null, hora_reunion: null } : p,
      ),
    }));
    await mostrar(SUPERVISOR);

    expect(screen.getByRole('region', { name: 'Proyectos a cargo' })).toHaveTextContent(
      'Reunión semanal: Sin definir',
    );
  });

  it('lista las tareas por revisar con los días que llevan esperando', async () => {
    const origen = await consultar(SUPERVISOR);
    await mostrar(SUPERVISOR);

    const region = screen.getByRole('region', { name: 'Tareas por revisar' });
    if (origen.tareas_por_revisar.length === 0) {
      expect(region).toHaveTextContent('No tiene tareas esperando su aprobación.');
    }
    for (const t of origen.tareas_por_revisar) {
      expect(region).toHaveTextContent(t.id_legible);
    }
    if (origen.tareas_por_revisar.length > 0) expect(region).toHaveTextContent(/Esperando/);
  });

  it('sin tareas por revisar muestra el estado vacío', async () => {
    useAlmacen.getState().transaccion((d) => ({
      tareas: d.tareas.map((t) =>
        t.estado === 'ESPERANDO_SUPERVISION' ? { ...t, estado: 'EN_PROGRESO' as const } : t,
      ),
    }));
    await mostrar(SUPERVISOR);

    expect(screen.getByText('No tiene tareas esperando su aprobación.')).toBeInTheDocument();
  });

  it('separa los proyectos finalizados en «Proyectos anteriores»', async () => {
    const origen = await consultar(CON_ANTERIORES);
    expect(origen.proyectos_anteriores.length).toBeGreaterThan(0);
    await mostrar(CON_ANTERIORES);

    const anteriores = screen.getByRole('region', { name: 'Proyectos anteriores' });
    for (const p of origen.proyectos_anteriores) {
      expect(anteriores).toHaveTextContent(p.proyecto.nombre);
    }
    const aCargo = screen.getByRole('region', { name: 'Proyectos a cargo' });
    for (const p of origen.proyectos_anteriores) {
      expect(aCargo).not.toHaveTextContent(p.proyecto.nombre);
    }
  });

  it('sin proyectos muestra los estados vacíos', async () => {
    useAlmacen.getState().transaccion((d) => ({
      proyectos: d.proyectos.filter((p) => p.id_supervisor !== SUPERVISOR),
    }));
    await mostrar(SUPERVISOR);

    expect(screen.getByText('No tiene proyectos a cargo.')).toBeInTheDocument();
    expect(screen.getByText('Aún no tiene proyectos anteriores.')).toBeInTheDocument();
  });

  it('muestra su línea de tiempo', async () => {
    await mostrar(SUPERVISOR);

    expect(screen.getByRole('region', { name: 'Línea de tiempo' })).toBeInTheDocument();
  });

  it('no ofrece acciones de escritura en el bloque de lectura', async () => {
    await mostrar(SUPERVISOR);

    const cabecera = screen.getByRole('heading', { level: 1 }).closest('header')!;
    expect(within(cabecera).queryByRole('button')).not.toBeInTheDocument();
  });

  it('un supervisor que no existe dice que no se encontró y vuelve al listado', async () => {
    const user = userEvent.setup();
    await mostrar('no-existe');

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Volver a supervisores' }));
    expect(screen.getByText('Listado abierto')).toBeInTheDocument();
  });

  it('una cuenta que no es de un supervisor da «no se encontró»', async () => {
    await mostrar('usr-pra-03');

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Datos de contacto' })).not.toBeInTheDocument();
  });

  it('un Supervisor no recibe el detalle', async () => {
    useAlmacenSesion.getState().cerrarSesion();
    iniciarSesion(SUPERVISOR);
    await mostrar(SUPERVISOR);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Datos de contacto' })).not.toBeInTheDocument();
  });
});

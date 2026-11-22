import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, listarPracticantes, listarProyectosAsignables } from '@/services';
import { PaginaPracticantes } from './PaginaPracticantes';

const ADMIN = 'demo-admin';
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

async function mostrar() {
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
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando practicantes' })).toBeNull(),
  );
}

const filasDeDatos = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
const vigentesDe = (id: Id) =>
  datos().asignaciones.filter((a) => a.id_practicante === id && a.fecha_baja === null);

async function sinProyecto() {
  const r = await listarPracticantes({ idActor: ADMIN }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor.practicantes.filter((p) => p.situacion.sin_proyecto);
}

async function asignables(id: Id) {
  const r = await listarProyectosAsignables({ idActor: ADMIN, idPracticante: id }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor.proyectos;
}

async function abrirAsignar(user: ReturnType<typeof userEvent.setup>, nombre: string) {
  await user.click(screen.getByRole('tab', { name: /Sin proyecto/ }));
  await user.click(screen.getByRole('button', { name: `Asignar a proyecto a ${nombre}` }));
  return await screen.findByRole('dialog', { name: 'Asignar a proyecto' });
}

describe('PaginaPracticantes: «Asignar a proyecto»', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('solo la pestaña «Sin proyecto» trae el atajo en cada fila', async () => {
    const user = userEvent.setup();
    const pendientes = await sinProyecto();
    await mostrar();

    expect(screen.queryByRole('button', { name: /Asignar a proyecto a/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Sin proyecto/ }));

    expect(screen.getAllByRole('button', { name: /Asignar a proyecto a/ })).toHaveLength(
      pendientes.length,
    );
    await user.click(screen.getByRole('tab', { name: /Todos/ }));
    expect(screen.queryByRole('button', { name: /Asignar a proyecto a/ })).not.toBeInTheDocument();
  });

  it('el diálogo ofrece los proyectos que dice la consulta y no deja confirmar sin elegir', async () => {
    const user = userEvent.setup();
    const [persona] = await sinProyecto();
    const esperados = await asignables(persona!.id);
    await mostrar();

    const dialogo = await abrirAsignar(user, persona!.nombre);

    const lista = await within(dialogo).findByRole('list', { name: 'Proyectos disponibles' });
    expect(within(lista).getAllByRole('checkbox')).toHaveLength(esperados.length);
    for (const p of esperados) expect(lista).toHaveTextContent(p.nombre);
    expect(within(dialogo).getByRole('button', { name: 'Asignar' })).toBeDisabled();
  });

  it('abrir el atajo no abre el detalle de la persona', async () => {
    const user = userEvent.setup();
    const [persona] = await sinProyecto();
    await mostrar();

    await abrirAsignar(user, persona!.nombre);

    expect(screen.getByTestId('ubicacion')).toHaveTextContent('/administrador/practicantes');
    expect(screen.queryByText('Detalle abierto')).not.toBeInTheDocument();
  });

  it('asignar a un proyecto crea la asignación, avisa a la persona y la saca de «Sin proyecto»', async () => {
    const user = userEvent.setup();
    const antes = await sinProyecto();
    const persona = antes[0]!;
    const [proyecto] = await asignables(persona.id);
    await mostrar();
    const dialogo = await abrirAsignar(user, persona.nombre);

    await user.click(
      await within(dialogo).findByRole('checkbox', { name: new RegExp(proyecto!.nombre) }),
    );
    await user.click(within(dialogo).getByRole('button', { name: 'Asignar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const vigentes = vigentesDe(persona.id);
    expect(vigentes.map((a) => a.id_proyecto)).toEqual([proyecto!.id]);
    expect(
      datos().notificaciones.some(
        (n) => n.id_destinatario === persona.id && n.tipo === 'ASIGNADO_A_PROYECTO',
      ),
    ).toBe(true);
    expect(
      datos().historial.some(
        (e) => e.tipo_accion === 'PRACTICANTE_ASIGNADO_A_PROYECTO' && e.elemento.id === persona.id,
      ),
    ).toBe(true);
    // La fila ya no está en «Sin proyecto».
    await waitFor(() => expect(filasDeDatos().length).toBe(antes.length - 1));
    expect(screen.getByRole('tab', { name: /Sin proyecto/ })).toHaveTextContent(
      String(antes.length - 1),
    );
  });

  it('puede asignar a varios proyectos de una vez', async () => {
    const user = userEvent.setup();
    const persona = (await sinProyecto())[0]!;
    const disponibles = await asignables(persona.id);
    expect(disponibles.length).toBeGreaterThan(1);
    await mostrar();
    const dialogo = await abrirAsignar(user, persona.nombre);

    const lista = await within(dialogo).findByRole('list', { name: 'Proyectos disponibles' });
    const marcas = within(lista).getAllByRole('checkbox');
    await user.click(marcas[0]!);
    await user.click(marcas[1]!);
    await user.click(within(dialogo).getByRole('button', { name: 'Asignar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(vigentesDe(persona.id)).toHaveLength(2);
  });

  it('cancelar no escribe nada', async () => {
    const user = userEvent.setup();
    const persona = (await sinProyecto())[0]!;
    const asignacionesAntes = datos().asignaciones;
    await mostrar();
    const dialogo = await abrirAsignar(user, persona.nombre);
    await user.click((await within(dialogo).findAllByRole('checkbox'))[0]!);

    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(datos().asignaciones).toBe(asignacionesAntes);
  });

  it('si el servicio rechaza la asignación muestra su mensaje, no cierra y no escribe', async () => {
    const user = userEvent.setup();
    const persona = (await sinProyecto())[0]!;
    await mostrar();
    const dialogo = await abrirAsignar(user, persona.nombre);
    const casilla = (await within(dialogo).findAllByRole('checkbox'))[0]!;
    await user.click(casilla);
    // Mientras el diálogo estaba abierto, todos los proyectos se finalizaron.
    useAlmacen.getState().transaccion((d) => ({
      proyectos: d.proyectos.map((p) => ({ ...p, estado: 'FINALIZADO' as const })),
    }));
    const asignacionesAntes = datos().asignaciones;

    await user.click(within(dialogo).getByRole('button', { name: 'Asignar' }));

    expect(await within(dialogo).findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Asignar a proyecto' })).toBeInTheDocument();
    expect(datos().asignaciones).toBe(asignacionesAntes);
  });

  it('si no hay proyectos a los que asignar lo dice y no ofrece confirmar', async () => {
    const user = userEvent.setup();
    const persona = (await sinProyecto())[0]!;
    useAlmacen.getState().transaccion((d) => ({
      proyectos: d.proyectos.map((p) => ({ ...p, estado: 'FINALIZADO' as const })),
    }));
    await mostrar();

    const dialogo = await abrirAsignar(user, persona.nombre);

    expect(
      await within(dialogo).findByText(
        'No hay proyectos a los que se pueda asignar a esta persona.',
      ),
    ).toBeInTheDocument();
    expect(within(dialogo).getByRole('button', { name: 'Asignar' })).toBeDisabled();
  });
});

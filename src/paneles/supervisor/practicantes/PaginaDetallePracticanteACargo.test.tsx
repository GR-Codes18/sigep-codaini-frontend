import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, listarPracticantesACargo, obtenerPracticanteACargo } from '@/services';
import { PaginaDetallePracticanteACargo } from './PaginaDetallePracticanteACargo';

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

async function mostrar(idPracticante: Id, idUsuario: Id = SUPERVISOR) {
  iniciarSesion(idUsuario);
  render(
    <MemoryRouter initialEntries={[`/supervisor/practicantes/${idPracticante}`]}>
      <Routes>
        <Route
          path="/supervisor/practicantes/:idPracticante"
          element={<PaginaDetallePracticanteACargo entorno={entorno} />}
        />
        <Route path="/supervisor/practicantes" element={<p>Listado abierto</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function unoDeMiEquipo() {
  const r = await listarPracticantesACargo({ idActor: SUPERVISOR }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor.practicantes.find((p) => p.situacion === 'ACTIVO')!;
}

describe('Detalle de un practicante a cargo (Supervisor, §9.1.2)', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('muestra contacto, especialidad, disponibilidad horaria y fecha de fin de práctica', async () => {
    const p = await unoDeMiEquipo();
    const r = await obtenerPracticanteACargo({ idActor: SUPERVISOR, idPracticante: p.id }, entorno);
    if (!r.ok) throw new Error(r.mensaje);

    await mostrar(p.id);

    expect(await screen.findByRole('heading', { name: p.nombre })).toBeInTheDocument();
    const contacto = screen.getByRole('region', { name: 'Datos de contacto' });
    expect(contacto).toHaveTextContent(r.valor.celular);
    expect(contacto).toHaveTextContent('Discord');
    expect(contacto).toHaveTextContent('GitHub');
    const practica = screen.getByRole('region', { name: 'Datos de la práctica' });
    expect(practica).toHaveTextContent('Especialidad');
    expect(practica).toHaveTextContent('Disponibilidad horaria');
    expect(practica).toHaveTextContent('Fecha de fin de práctica');
  });

  it('no muestra el área técnica ni la postulación de origen', async () => {
    const p = await unoDeMiEquipo();
    const completo = datos().practicantes.find((x) => x.id_usuario === p.id)!;
    const area = datos().areas_tecnicas.find((a) => a.id === completo.id_area_tecnica)!;

    await mostrar(p.id);
    await screen.findByRole('heading', { name: p.nombre });

    expect(screen.queryByText(/área técnica/i)).toBeNull();
    expect(screen.queryByText(area.nombre)).toBeNull();
    expect(screen.queryByText(/postulación de origen|ver la postulación/i)).toBeNull();
    expect(screen.queryByRole('link', { name: /postulaci/i })).toBeNull();
  });

  it('lista sus proyectos con alta y baja, sus tareas y su línea de tiempo', async () => {
    const p = await unoDeMiEquipo();

    await mostrar(p.id);
    await screen.findByRole('heading', { name: p.nombre });

    const proyectos = screen.getByRole('region', { name: 'Proyectos' });
    expect(proyectos).toHaveTextContent(p.proyectos[0]!.proyecto.nombre);
    expect(proyectos).toHaveTextContent(/Alta:/);
    expect(screen.getByRole('region', { name: 'Tareas actuales' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Tareas completadas' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Línea de tiempo' })).toBeInTheDocument();
  });

  it('es de solo lectura: ningún botón de gestión', async () => {
    const p = await unoDeMiEquipo();

    await mostrar(p.id);
    await screen.findByRole('heading', { name: p.nombre });

    expect(screen.queryByRole('button')).toBeNull();
    expect(
      screen.queryByRole('button', {
        name: /asignar|finalizar|reactivar|restablecer|editar|notificar/i,
      }),
    ).toBeNull();
  });

  it('solo cuentan las tareas y los proyectos de este Supervisor', async () => {
    const p = await unoDeMiEquipo();
    const mios = new Set(
      datos()
        .proyectos.filter((x) => x.id_supervisor === SUPERVISOR)
        .map((x) => x.id),
    );
    const ajenas = datos().tareas.filter((t) => !mios.has(t.id_proyecto));
    // Una tarea de otro proyecto asignada a esta persona no debe verse.
    const tareaAjena = ajenas[0]!;
    useAlmacen.getState().transaccion((d) => ({
      tareas: d.tareas.map((t) =>
        t.id === tareaAjena.id ? { ...t, id_practicante: p.id, estado: 'EN_PROGRESO' as const } : t,
      ),
    }));

    await mostrar(p.id);
    await screen.findByRole('heading', { name: p.nombre });

    expect(screen.queryByText(tareaAjena.titulo)).toBeNull();
    for (const proyecto of datos().proyectos.filter((x) => !mios.has(x.id))) {
      expect(screen.queryByText(proyecto.nombre)).toBeNull();
    }
  });

  it('un practicante que no es de sus proyectos, aunque se escriba su dirección, no muestra nada', async () => {
    const delEquipo = new Set((await unoDeMiEquipo()).id);
    const todos = await listarPracticantesACargo({ idActor: SUPERVISOR }, entorno);
    if (!todos.ok) throw new Error(todos.mensaje);
    const mios = new Set(todos.valor.practicantes.map((x) => x.id));
    const ajeno = datos()
      .practicantes.map((x) => datos().usuarios.find((u) => u.id === x.id_usuario)!)
      .find((u) => !mios.has(u.id) && !delEquipo.has(u.id))!;

    await mostrar(ajeno.id);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(ajeno.nombre)).toBeNull();
    expect(screen.queryByText(ajeno.correo)).toBeNull();
    expect(screen.queryByRole('region', { name: 'Datos de contacto' })).toBeNull();
  });

  it('«Volver a practicantes a cargo» regresa al listado', async () => {
    const usuario = userEvent.setup();
    const p = await unoDeMiEquipo();
    await mostrar(p.id);

    await usuario.click(await screen.findByRole('link', { name: 'Volver a practicantes a cargo' }));

    await waitFor(() => expect(screen.getByText('Listado abierto')).toBeInTheDocument());
  });

  it('un practicante que ya salió de sus proyectos figura como «Anterior»', async () => {
    const p = await unoDeMiEquipo();
    const mios = new Set(
      datos()
        .proyectos.filter((x) => x.id_supervisor === SUPERVISOR)
        .map((x) => x.id),
    );
    useAlmacen.getState().transaccion((d) => ({
      asignaciones: d.asignaciones.map((a) =>
        a.id_practicante === p.id && mios.has(a.id_proyecto)
          ? { ...a, fecha_baja: '2026-11-10' }
          : a,
      ),
    }));

    await mostrar(p.id);

    const cabecera = await screen.findByRole('heading', { name: p.nombre });
    expect(within(cabecera.parentElement!).getByText('Anterior')).toBeInTheDocument();
  });
});

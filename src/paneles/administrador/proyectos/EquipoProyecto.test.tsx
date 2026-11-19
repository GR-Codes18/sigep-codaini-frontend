import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, listarPracticantesAsignables, obtenerEquipoProyecto } from '@/services';
import { PaginaDetalleProyecto } from './PaginaDetalleProyecto';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const ACTIVO = 'pry-pl2d';
const FINALIZADO = 'pry-tie';

const entorno = crearEntorno({ demoraMs: 0 });
const datos = () => useAlmacen.getState().datos;
const vigentes = (idProyecto: Id) =>
  datos().asignaciones.filter((a) => a.id_proyecto === idProyecto && a.fecha_baja === null);

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

async function mostrar(idProyecto: Id) {
  render(
    <MemoryRouter initialEntries={[`/administrador/proyectos/${idProyecto}?pestana=equipo`]}>
      <Routes>
        <Route
          path="/administrador/proyectos/:idProyecto"
          element={<PaginaDetalleProyecto entorno={entorno} />}
        />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('region', { name: 'Practicantes activos' });
}

async function equipo(id: Id) {
  const r = await obtenerEquipoProyecto({ idActor: ADMIN, idProyecto: id }, entorno);
  if (!r.ok || r.valor.vista !== 'GESTION') throw new Error('Se esperaba la vista de gestión.');
  return r.valor;
}

async function candidatos(id: Id) {
  const r = await listarPracticantesAsignables({ idActor: ADMIN, idProyecto: id }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor.practicantes;
}

const activos = () => screen.getByRole('region', { name: 'Practicantes activos' });
const anteriores = () => screen.getByRole('region', { name: 'Practicantes anteriores' });

async function abrirAsignar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(activos()).getByRole('button', { name: 'Asignar practicantes' }));
  return await screen.findByRole('dialog', { name: 'Asignar practicantes' });
}

describe('Pestaña «Equipo» del proyecto: asignar y quitar practicantes', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  describe('asignar', () => {
    it('se ofrece en un proyecto activo y lista a los candidatos con su carga', async () => {
      const user = userEvent.setup();
      const posibles = await candidatos(ACTIVO);
      await mostrar(ACTIVO);

      const dialogo = await abrirAsignar(user);

      const lista = await within(dialogo).findByRole('list', { name: 'Practicantes disponibles' });
      expect(within(lista).getAllByRole('checkbox')).toHaveLength(posibles.length);
      for (const p of posibles) expect(lista).toHaveTextContent(p.nombre);
      expect(lista).toHaveTextContent(/\d+ tareas? en progreso/);
      expect(within(dialogo).getByRole('button', { name: 'Asignar' })).toBeDisabled();
    });

    it('asigna a uno: crea la asignación vigente, avisa al practicante y aparece en el equipo', async () => {
      const user = userEvent.setup();
      const [elegido] = await candidatos(ACTIVO);
      const antes = vigentes(ACTIVO).length;
      await mostrar(ACTIVO);
      const dialogo = await abrirAsignar(user);

      await user.click(
        await within(dialogo).findByRole('checkbox', { name: new RegExp(elegido!.nombre) }),
      );
      await user.click(within(dialogo).getByRole('button', { name: 'Asignar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(vigentes(ACTIVO)).toHaveLength(antes + 1);
      expect(vigentes(ACTIVO).some((a) => a.id_practicante === elegido!.id)).toBe(true);
      expect(
        datos().notificaciones.some(
          (n) => n.id_destinatario === elegido!.id && n.tipo === 'ASIGNADO_A_PROYECTO',
        ),
      ).toBe(true);
      expect(
        datos().historial.some(
          (e) =>
            e.tipo_accion === 'PRACTICANTE_ASIGNADO_A_PROYECTO' &&
            e.elemento.id === elegido!.id &&
            e.id_proyecto === ACTIVO,
        ),
      ).toBe(true);
      expect(await within(activos()).findByText(elegido!.nombre)).toBeVisible();
    });

    it('puede asignar a varios de una vez', async () => {
      const user = userEvent.setup();
      const posibles = await candidatos(ACTIVO);
      expect(posibles.length).toBeGreaterThan(1);
      const antes = vigentes(ACTIVO).length;
      await mostrar(ACTIVO);
      const dialogo = await abrirAsignar(user);

      const marcas = await within(dialogo).findAllByRole('checkbox');
      await user.click(marcas[0]!);
      await user.click(marcas[1]!);
      await user.click(within(dialogo).getByRole('button', { name: 'Asignar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(vigentes(ACTIVO)).toHaveLength(antes + 2);
    });

    it('cancelar no escribe nada', async () => {
      const user = userEvent.setup();
      const antes = datos().asignaciones;
      await mostrar(ACTIVO);
      const dialogo = await abrirAsignar(user);
      await user.click((await within(dialogo).findAllByRole('checkbox'))[0]!);

      await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(datos().asignaciones).toBe(antes);
    });

    it('si el servicio la rechaza (el proyecto se finalizó), muestra el mensaje, no cierra y no escribe', async () => {
      const user = userEvent.setup();
      await mostrar(ACTIVO);
      const dialogo = await abrirAsignar(user);
      await user.click((await within(dialogo).findAllByRole('checkbox'))[0]!);
      useAlmacen.getState().transaccion((d) => ({
        proyectos: d.proyectos.map((p) =>
          p.id === ACTIVO ? { ...p, estado: 'FINALIZADO' as const } : p,
        ),
      }));
      const antes = datos().asignaciones;

      await user.click(within(dialogo).getByRole('button', { name: 'Asignar' }));

      expect(await within(dialogo).findByRole('alert')).toBeInTheDocument();
      expect(datos().asignaciones).toBe(antes);
    });

    it('si no hay a quién asignar, no se ofrece el botón', async () => {
      useAlmacen.getState().transaccion((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.rol === 'PRACTICANTE' ? { ...u, estado: 'INACTIVO' as const } : u,
        ),
      }));
      await mostrar(ACTIVO);

      expect(
        within(activos()).queryByRole('button', { name: 'Asignar practicantes' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('quitar', () => {
    it('cada miembro activo trae su botón «Quitar»', async () => {
      const r = await equipo(ACTIVO);
      await mostrar(ACTIVO);

      for (const m of r.activos) {
        expect(
          within(activos()).getByRole('button', { name: `Quitar a ${m.nombre}` }),
        ).toBeVisible();
      }
    });

    it('avisa cuántas tareas «En progreso» de ese proyecto se liberarán', async () => {
      const user = userEvent.setup();
      const r = await equipo(ACTIVO);
      const conTareas = r.activos.find((m) => m.tareas_a_liberar > 0)!;
      expect(conTareas).toBeDefined();
      await mostrar(ACTIVO);

      await user.click(
        within(activos()).getByRole('button', { name: `Quitar a ${conTareas.nombre}` }),
      );

      const dialogo = await screen.findByRole('dialog', { name: 'Quitar practicante' });
      expect(dialogo).toHaveTextContent(
        conTareas.tareas_a_liberar === 1
          ? 'Tiene 1 tarea en progreso que será liberada'
          : `Tiene ${conTareas.tareas_a_liberar} tareas en progreso que serán liberadas`,
      );
    });

    it('quitarlo da de baja su asignación, libera sus tareas «En progreso» y pasa a «anteriores»', async () => {
      const user = userEvent.setup();
      const r = await equipo(ACTIVO);
      const miembro = r.activos.find((m) => m.tareas_a_liberar > 0)!;
      const enProgreso = datos().tareas.filter(
        (t) =>
          t.id_proyecto === ACTIVO && t.id_practicante === miembro.id && t.estado === 'EN_PROGRESO',
      );
      await mostrar(ACTIVO);
      await user.click(
        within(activos()).getByRole('button', { name: `Quitar a ${miembro.nombre}` }),
      );
      const dialogo = await screen.findByRole('dialog', { name: 'Quitar practicante' });

      await user.type(within(dialogo).getByLabelText(/Motivo/), 'Cambia de proyecto');
      await user.click(within(dialogo).getByRole('button', { name: 'Quitar' }));

      await waitFor(() =>
        expect(vigentes(ACTIVO).some((a) => a.id_practicante === miembro.id)).toBe(false),
      );
      for (const t of enProgreso) {
        const despues = datos().tareas.find((x) => x.id === t.id)!;
        expect(despues.estado).toBe('DISPONIBLE');
        expect(despues.id_practicante).toBeNull();
      }
      expect(
        datos().historial.some(
          (e) =>
            e.tipo_accion === 'PRACTICANTE_QUITADO_DE_PROYECTO' &&
            e.elemento.id === miembro.id &&
            e.nota === 'Cambia de proyecto',
        ),
      ).toBe(true);
      expect(await within(anteriores()).findByText(miembro.nombre)).toBeVisible();
      expect(within(activos()).queryByText(miembro.nombre)).not.toBeInTheDocument();
    });

    it('el motivo es opcional: se puede quitar sin escribirlo', async () => {
      const user = userEvent.setup();
      const r = await equipo(ACTIVO);
      const miembro = r.activos[0]!;
      await mostrar(ACTIVO);
      await user.click(
        within(activos()).getByRole('button', { name: `Quitar a ${miembro.nombre}` }),
      );
      const dialogo = await screen.findByRole('dialog', { name: 'Quitar practicante' });

      expect(within(dialogo).getByRole('button', { name: 'Quitar' })).toBeEnabled();
      await user.click(within(dialogo).getByRole('button', { name: 'Quitar' }));

      await waitFor(() =>
        expect(vigentes(ACTIVO).some((a) => a.id_practicante === miembro.id)).toBe(false),
      );
    });

    it('cancelar no escribe nada', async () => {
      const user = userEvent.setup();
      const r = await equipo(ACTIVO);
      const antes = datos();
      await mostrar(ACTIVO);
      await user.click(
        within(activos()).getByRole('button', { name: `Quitar a ${r.activos[0]!.nombre}` }),
      );
      const dialogo = await screen.findByRole('dialog', { name: 'Quitar practicante' });

      await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(datos()).toBe(antes);
    });

    it('si el servicio lo rechaza (ya lo habían quitado), el diálogo sigue abierto con el mensaje y no escribe', async () => {
      const user = userEvent.setup();
      const r = await equipo(ACTIVO);
      const miembro = r.activos[0]!;
      await mostrar(ACTIVO);
      await user.click(
        within(activos()).getByRole('button', { name: `Quitar a ${miembro.nombre}` }),
      );
      const dialogo = await screen.findByRole('dialog', { name: 'Quitar practicante' });
      useAlmacen.getState().transaccion((d) => ({
        asignaciones: d.asignaciones.map((a) =>
          a.id_proyecto === ACTIVO && a.id_practicante === miembro.id && a.fecha_baja === null
            ? { ...a, fecha_baja: '2026-11-16' }
            : a,
        ),
      }));
      const historialAntes = datos().historial;

      await user.click(within(dialogo).getByRole('button', { name: 'Quitar' }));

      expect(await within(dialogo).findByRole('alert')).toBeInTheDocument();
      expect(datos().historial).toBe(historialAntes);
    });
  });

  describe('proyecto finalizado y roles', () => {
    it('un proyecto finalizado no admite asignar ni quitar: lo dice y no ofrece los botones', async () => {
      await mostrar(FINALIZADO);

      expect(screen.getByRole('note')).toHaveTextContent(
        'Un proyecto finalizado no admite asignar ni quitar practicantes',
      );
      expect(
        within(activos()).queryByRole('button', { name: 'Asignar practicantes' }),
      ).not.toBeInTheDocument();
      expect(
        within(activos()).queryByRole('button', { name: /^Quitar a / }),
      ).not.toBeInTheDocument();
    });

    it('un proyecto activo no muestra ese aviso', async () => {
      await mostrar(ACTIVO);

      expect(screen.queryByRole('note')).not.toBeInTheDocument();
    });

    it('el Supervisor del proyecto ve el equipo, pero no asigna ni quita', async () => {
      useAlmacenSesion.getState().cerrarSesion();
      iniciarSesion(SUPERVISOR);
      await mostrar(ACTIVO);

      expect(
        within(activos()).queryByRole('button', { name: 'Asignar practicantes' }),
      ).not.toBeInTheDocument();
      expect(
        within(activos()).queryByRole('button', { name: /^Quitar a / }),
      ).not.toBeInTheDocument();
    });
  });
});

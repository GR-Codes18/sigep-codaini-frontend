import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno } from '@/services';
import { PaginaDetalleSupervisor } from './PaginaDetalleSupervisor';

const ADMIN = 'demo-admin';
const CON_DOS = 'demo-supervisor'; // pry-pl2d y pry-rsv
const CON_UNO = 'usr-sup-03'; // pry-inv (en pausa)
const OTRO = 'usr-sup-02';

const entorno = crearEntorno({ demoraMs: 0 });
const datos = () => useAlmacen.getState().datos;
const usuario = (id: Id) => datos().usuarios.find((u) => u.id === id)!;
const aCargoDe = (id: Id) =>
  datos().proyectos.filter((p) => p.id_supervisor === id && p.estado !== 'FINALIZADO');

function iniciarSesion(idUsuario: Id) {
  const u = usuario(idUsuario);
  useAlmacenSesion.getState().abrirSesion({
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
    rol: u.rol,
    debe_cambiar_contrasena: u.debe_cambiar_contrasena,
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
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando el supervisor' })).toBeNull(),
  );
}

/** Pasa todos los proyectos de `desde` a `hacia` sin pasar por la pantalla. */
function moverProyectos(desde: Id, hacia: Id) {
  useAlmacen.getState().transaccion((d) => ({
    proyectos: d.proyectos.map((p) =>
      p.id_supervisor === desde ? { ...p, id_supervisor: hacia } : p,
    ),
  }));
}

async function abrirReasignar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Reasignar proyectos' }));
  return await screen.findByRole('dialog', { name: 'Reasignar proyectos' });
}

describe('PaginaDetalleSupervisor: desactivar, reactivar y reasignar proyectos', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  describe('qué botones se ofrecen', () => {
    it('con proyectos a cargo ofrece reasignar y desactivar, pero no reactivar', async () => {
      await mostrar(CON_DOS);

      const acciones = screen.getByRole('group', { name: 'Acciones' });
      expect(within(acciones).getByRole('button', { name: 'Reasignar proyectos' })).toBeVisible();
      expect(within(acciones).getByRole('button', { name: 'Desactivar' })).toBeVisible();
      expect(within(acciones).queryByRole('button', { name: 'Reactivar' })).not.toBeInTheDocument();
    });

    it('sin proyectos a cargo no ofrece reasignar', async () => {
      moverProyectos(CON_DOS, OTRO);
      await mostrar(CON_DOS);

      expect(screen.queryByRole('button', { name: 'Reasignar proyectos' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Desactivar' })).toBeVisible();
    });

    it('una cuenta inactiva ofrece reactivar y no desactivar', async () => {
      moverProyectos(CON_DOS, OTRO);
      useAlmacen.getState().transaccion((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === CON_DOS ? { ...u, estado: 'INACTIVO' as const } : u,
        ),
      }));
      await mostrar(CON_DOS);

      expect(screen.getByRole('button', { name: 'Reactivar' })).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
    });
  });

  describe('desactivar', () => {
    it('con proyectos pendientes lo bloquea e indica cuántos (plural) sin escribir nada', async () => {
      const user = userEvent.setup();
      const n = aCargoDe(CON_DOS).length;
      expect(n).toBeGreaterThan(1);
      const antes = datos();
      await mostrar(CON_DOS);

      await user.click(screen.getByRole('button', { name: 'Desactivar' }));

      const dialogo = await screen.findByRole('dialog', { name: 'No se puede desactivar' });
      expect(dialogo).toHaveTextContent(`Tiene ${n} proyectos pendientes: reasígnalos primero.`);
      expect(within(dialogo).queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
      expect(datos()).toBe(antes);
    });

    it('con un solo proyecto pendiente usa el singular, y un proyecto en pausa cuenta', async () => {
      const user = userEvent.setup();
      expect(aCargoDe(CON_UNO)[0]!.estado).toBe('EN_PAUSA');
      await mostrar(CON_UNO);

      await user.click(screen.getByRole('button', { name: 'Desactivar' }));

      expect(
        await screen.findByRole('dialog', { name: 'No se puede desactivar' }),
      ).toHaveTextContent('Tiene 1 proyecto pendiente: reasígnalo primero.');
    });

    it('los proyectos finalizados no bloquean', async () => {
      const user = userEvent.setup();
      useAlmacen.getState().transaccion((d) => ({
        proyectos: d.proyectos.map((p) =>
          p.id_supervisor === CON_DOS ? { ...p, estado: 'FINALIZADO' as const } : p,
        ),
      }));
      await mostrar(CON_DOS);

      await user.click(screen.getByRole('button', { name: 'Desactivar' }));

      expect(
        await screen.findByRole('dialog', { name: 'Desactivar supervisor' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('dialog', { name: 'No se puede desactivar' }),
      ).not.toBeInTheDocument();
    });

    it('desde el bloqueo se puede ir a reasignar los proyectos', async () => {
      const user = userEvent.setup();
      await mostrar(CON_DOS);
      await user.click(screen.getByRole('button', { name: 'Desactivar' }));
      const bloqueo = await screen.findByRole('dialog', { name: 'No se puede desactivar' });

      await user.click(within(bloqueo).getByRole('button', { name: 'Reasignar proyectos' }));

      expect(
        await screen.findByRole('dialog', { name: 'Reasignar proyectos' }),
      ).toBeInTheDocument();
    });

    it('sin proyectos pendientes pide confirmación y desactiva la cuenta, con registro y sin avisos', async () => {
      const user = userEvent.setup();
      moverProyectos(CON_DOS, OTRO);
      const avisosAntes = datos().notificaciones;
      await mostrar(CON_DOS);

      await user.click(screen.getByRole('button', { name: 'Desactivar' }));
      const confirmacion = await screen.findByRole('dialog', { name: 'Desactivar supervisor' });
      await user.click(within(confirmacion).getByRole('button', { name: 'Desactivar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(usuario(CON_DOS).estado).toBe('INACTIVO');
      expect(
        datos().historial.some(
          (e) => e.tipo_accion === 'SUPERVISOR_DESACTIVADO' && e.elemento.id === CON_DOS,
        ),
      ).toBe(true);
      expect(datos().notificaciones).toBe(avisosAntes);
      const cabecera = screen.getByRole('heading', { level: 1 }).closest('header')!;
      await waitFor(() => expect(within(cabecera).getByText('Inactivo')).toBeInTheDocument());
      expect(within(cabecera).getByRole('button', { name: 'Reactivar' })).toBeVisible();
      expect(
        within(cabecera).queryByRole('button', { name: 'Desactivar' }),
      ).not.toBeInTheDocument();
    });

    it('cancelar la confirmación no escribe nada', async () => {
      const user = userEvent.setup();
      moverProyectos(CON_DOS, OTRO);
      const antes = datos();
      await mostrar(CON_DOS);
      await user.click(screen.getByRole('button', { name: 'Desactivar' }));
      const confirmacion = await screen.findByRole('dialog', { name: 'Desactivar supervisor' });

      await user.click(within(confirmacion).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(datos()).toBe(antes);
    });

    it('si le devuelven un proyecto con la confirmación abierta, la pantalla pasa al aviso de bloqueo y no escribe', async () => {
      const user = userEvent.setup();
      moverProyectos(CON_DOS, OTRO);
      await mostrar(CON_DOS);
      await user.click(screen.getByRole('button', { name: 'Desactivar' }));
      await screen.findByRole('dialog', { name: 'Desactivar supervisor' });

      // La consulta se actualiza sola: ya no hay nada que confirmar, solo el bloqueo.
      moverProyectos(OTRO, CON_DOS);

      expect(
        await screen.findByRole('dialog', { name: 'No se puede desactivar' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('dialog', { name: 'Desactivar supervisor' }),
      ).not.toBeInTheDocument();
      expect(usuario(CON_DOS).estado).toBe('ACTIVO');
      expect(datos().historial.some((e) => e.tipo_accion === 'SUPERVISOR_DESACTIVADO')).toBe(false);
    });
  });

  describe('reactivar', () => {
    async function inactivo() {
      moverProyectos(CON_DOS, OTRO);
      useAlmacen.getState().transaccion((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === CON_DOS ? { ...u, estado: 'INACTIVO' as const } : u,
        ),
      }));
      await mostrar(CON_DOS);
    }

    it('pide confirmación y vuelve a «Activo», con registro; no recupera proyectos', async () => {
      const user = userEvent.setup();
      await inactivo();

      await user.click(screen.getByRole('button', { name: 'Reactivar' }));
      const confirmacion = await screen.findByRole('dialog', { name: 'Reactivar supervisor' });
      await user.click(within(confirmacion).getByRole('button', { name: 'Reactivar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(usuario(CON_DOS).estado).toBe('ACTIVO');
      expect(aCargoDe(CON_DOS)).toEqual([]);
      expect(
        datos().historial.some(
          (e) => e.tipo_accion === 'SUPERVISOR_REACTIVADO' && e.elemento.id === CON_DOS,
        ),
      ).toBe(true);
      const cabecera = screen.getByRole('heading', { level: 1 }).closest('header')!;
      await waitFor(() => expect(within(cabecera).getByText('Activo')).toBeInTheDocument());
      expect(within(cabecera).getByRole('button', { name: 'Desactivar' })).toBeVisible();
    });

    it('cancelar no escribe nada', async () => {
      const user = userEvent.setup();
      await inactivo();
      const antes = datos();

      await user.click(screen.getByRole('button', { name: 'Reactivar' }));
      const confirmacion = await screen.findByRole('dialog', { name: 'Reactivar supervisor' });
      await user.click(within(confirmacion).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(datos()).toBe(antes);
    });

    it('si el servicio lo rechaza, la confirmación sigue abierta con el mensaje y no escribe', async () => {
      const user = userEvent.setup();
      await inactivo();
      await user.click(screen.getByRole('button', { name: 'Reactivar' }));
      const confirmacion = await screen.findByRole('dialog', { name: 'Reactivar supervisor' });
      // Mientras la confirmación estaba abierta, otra pestaña ya la había reactivado.
      useAlmacen.getState().transaccion((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === CON_DOS ? { ...u, estado: 'ACTIVO' as const } : u,
        ),
      }));
      const historialAntes = datos().historial;

      await user.click(within(confirmacion).getByRole('button', { name: 'Reactivar' }));

      expect(await within(confirmacion).findByRole('alert')).toBeInTheDocument();
      expect(datos().historial).toBe(historialAntes);
    });
  });

  describe('reasignar proyectos', () => {
    it('muestra un selector por proyecto, con los demás supervisores activos, y no deja confirmar sin elegir', async () => {
      const user = userEvent.setup();
      const proyectos = aCargoDe(CON_DOS);
      await mostrar(CON_DOS);

      const dialogo = await abrirReasignar(user);

      for (const p of proyectos) {
        const selector = within(dialogo).getByLabelText(new RegExp(p.nombre));
        const opciones = within(selector as HTMLElement)
          .getAllByRole('option')
          .map((o) => o.textContent);
        expect(opciones).toContain(usuario(OTRO).nombre);
        expect(opciones).not.toContain(usuario(CON_DOS).nombre);
      }
      expect(within(dialogo).getByRole('button', { name: 'Reasignar' })).toBeDisabled();
    });

    it('con un proyecto sin elegir sigue deshabilitado: hay que elegir para cada uno', async () => {
      const user = userEvent.setup();
      const [primero] = aCargoDe(CON_DOS);
      await mostrar(CON_DOS);
      const dialogo = await abrirReasignar(user);

      await user.selectOptions(within(dialogo).getByLabelText(new RegExp(primero!.nombre)), OTRO);

      expect(within(dialogo).getByRole('button', { name: 'Reasignar' })).toBeDisabled();
    });

    it('reasigna todos los proyectos, pasa las tareas que esperan supervisión y deja registro y avisos', async () => {
      const user = userEvent.setup();
      const proyectos = aCargoDe(CON_DOS);
      const tareasEsperando = datos().tareas.filter(
        (t) =>
          t.estado === 'ESPERANDO_SUPERVISION' && proyectos.some((p) => p.id === t.id_proyecto),
      );
      await mostrar(CON_DOS);
      const dialogo = await abrirReasignar(user);

      for (const p of proyectos) {
        await user.selectOptions(within(dialogo).getByLabelText(new RegExp(p.nombre)), OTRO);
      }
      await user.click(within(dialogo).getByRole('button', { name: 'Reasignar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      for (const p of proyectos) {
        expect(datos().proyectos.find((x) => x.id === p.id)!.id_supervisor).toBe(OTRO);
      }
      // Las tareas siguen al proyecto: no se tocaron.
      for (const t of tareasEsperando) {
        expect(datos().tareas.find((x) => x.id === t.id)).toEqual(t);
      }
      expect(
        datos().historial.filter((e) => e.tipo_accion === 'PROYECTO_SUPERVISOR_CAMBIADO'),
      ).toHaveLength(proyectos.length);
      expect(
        datos().historial.some(
          (e) => e.tipo_accion === 'SUPERVISOR_PROYECTOS_REASIGNADOS' && e.elemento.id === CON_DOS,
        ),
      ).toBe(true);
      expect(
        datos().notificaciones.filter(
          (n) => n.id_destinatario === OTRO && n.tipo === 'ASIGNADO_A_PROYECTO',
        ).length,
      ).toBeGreaterThanOrEqual(proyectos.length);
    });

    it('después de reasignar todo, el supervisor ya no tiene proyectos y se puede desactivar', async () => {
      const user = userEvent.setup();
      const proyectos = aCargoDe(CON_DOS);
      await mostrar(CON_DOS);
      const dialogo = await abrirReasignar(user);
      for (const p of proyectos) {
        await user.selectOptions(within(dialogo).getByLabelText(new RegExp(p.nombre)), OTRO);
      }
      await user.click(within(dialogo).getByRole('button', { name: 'Reasignar' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

      await waitFor(() =>
        expect(screen.getByText('No tiene proyectos a cargo.')).toBeInTheDocument(),
      );
      expect(screen.queryByRole('button', { name: 'Reasignar proyectos' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Desactivar' }));
      const confirmacion = await screen.findByRole('dialog', { name: 'Desactivar supervisor' });
      await user.click(within(confirmacion).getByRole('button', { name: 'Desactivar' }));

      await waitFor(() => expect(usuario(CON_DOS).estado).toBe('INACTIVO'));
    });

    it('puede repartir los proyectos entre supervisores distintos', async () => {
      const user = userEvent.setup();
      const [uno, dos] = aCargoDe(CON_DOS);
      await mostrar(CON_DOS);
      const dialogo = await abrirReasignar(user);

      await user.selectOptions(within(dialogo).getByLabelText(new RegExp(uno!.nombre)), OTRO);
      await user.selectOptions(within(dialogo).getByLabelText(new RegExp(dos!.nombre)), CON_UNO);
      await user.click(within(dialogo).getByRole('button', { name: 'Reasignar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(datos().proyectos.find((p) => p.id === uno!.id)!.id_supervisor).toBe(OTRO);
      expect(datos().proyectos.find((p) => p.id === dos!.id)!.id_supervisor).toBe(CON_UNO);
    });

    it('es todo o nada: si el servicio rechaza uno, no se reasigna ninguno y se muestra el mensaje', async () => {
      const user = userEvent.setup();
      const proyectos = aCargoDe(CON_DOS);
      await mostrar(CON_DOS);
      const dialogo = await abrirReasignar(user);
      for (const p of proyectos) {
        await user.selectOptions(within(dialogo).getByLabelText(new RegExp(p.nombre)), OTRO);
      }
      // Mientras el diálogo estaba abierto, el supervisor elegido se desactivó.
      useAlmacen.getState().transaccion((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === OTRO ? { ...u, estado: 'INACTIVO' as const } : u,
        ),
      }));
      const proyectosAntes = datos().proyectos;

      await user.click(within(dialogo).getByRole('button', { name: 'Reasignar' }));

      expect(await within(dialogo).findByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Reasignar proyectos' })).toBeInTheDocument();
      expect(datos().proyectos).toBe(proyectosAntes);
    });

    it('cancelar no escribe nada', async () => {
      const user = userEvent.setup();
      const antes = datos();
      await mostrar(CON_DOS);
      const dialogo = await abrirReasignar(user);

      await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(datos()).toBe(antes);
    });
  });
});

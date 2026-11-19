import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno } from '@/services';
import { PaginaDetallePracticante } from './PaginaDetallePracticante';

const ADMIN = 'demo-admin';
const FINALIZADO = 'usr-pra-19';

const entorno = crearEntorno({ demoraMs: 0 });
const datos = () => useAlmacen.getState().datos;
const usuario = (id: Id) => datos().usuarios.find((u) => u.id === id)!;
const enProgresoDe = (id: Id) =>
  datos().tareas.filter((t) => t.id_practicante === id && t.estado === 'EN_PROGRESO');

/** Un practicante activo con al menos dos tareas en progreso (para el aviso en plural). */
function conTareasEnProgreso(): Id {
  const ids = datos()
    .usuarios.filter((u) => u.rol === 'PRACTICANTE' && u.estado === 'ACTIVO')
    .map((u) => u.id);
  const elegido = ids.find((id) => enProgresoDe(id).length >= 2);
  if (elegido === undefined)
    throw new Error('La semilla no tiene a nadie con dos tareas en progreso.');
  return elegido;
}

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

async function mostrar(idPracticante: Id) {
  render(
    <MemoryRouter initialEntries={[`/administrador/practicantes/${idPracticante}`]}>
      <Routes>
        <Route
          path="/administrador/practicantes/:idPracticante"
          element={<PaginaDetallePracticante entorno={entorno} />}
        />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando el practicante' })).toBeNull(),
  );
}

async function abrirFinalizar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Finalizar práctica' }));
  return await screen.findByRole('dialog', { name: 'Finalizar práctica' });
}

async function abrirReactivar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Reactivar' }));
  return await screen.findByRole('dialog', { name: 'Reactivar práctica' });
}

describe('PaginaDetallePracticante: finalizar y reactivar la práctica', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  describe('qué botones se ofrecen', () => {
    it('una práctica activa ofrece «Finalizar práctica» y no «Reactivar»', async () => {
      await mostrar(conTareasEnProgreso());

      expect(screen.getByRole('button', { name: 'Finalizar práctica' })).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Reactivar' })).not.toBeInTheDocument();
    });

    it('una práctica finalizada ofrece «Reactivar» y no «Finalizar práctica»', async () => {
      await mostrar(FINALIZADO);

      expect(screen.getByRole('button', { name: 'Reactivar' })).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Finalizar práctica' })).not.toBeInTheDocument();
    });
  });

  describe('finalizar', () => {
    it('avisa antes de confirmar cuántas tareas en progreso se liberarán (plural)', async () => {
      const user = userEvent.setup();
      const id = conTareasEnProgreso();
      const n = enProgresoDe(id).length;
      await mostrar(id);

      const dialogo = await abrirFinalizar(user);

      expect(dialogo).toHaveTextContent(`Tiene ${n} tareas en progreso que serán liberadas.`);
      expect(dialogo).toHaveTextContent('Las tareas que esperan supervisión no se liberan');
    });

    it('con una sola tarea en progreso usa el singular', async () => {
      const user = userEvent.setup();
      const id = conTareasEnProgreso();
      const [primera, ...otras] = enProgresoDe(id);
      useAlmacen.getState().transaccion((d) => ({
        tareas: d.tareas.map((t) =>
          otras.some((o) => o.id === t.id) ? { ...t, estado: 'ESPERANDO_SUPERVISION' as const } : t,
        ),
      }));
      expect(primera).toBeDefined();
      await mostrar(id);

      const dialogo = await abrirFinalizar(user);

      expect(dialogo).toHaveTextContent('Tiene 1 tarea en progreso que será liberada.');
    });

    it('sin tareas en progreso lo dice', async () => {
      const user = userEvent.setup();
      const id = conTareasEnProgreso();
      useAlmacen.getState().transaccion((d) => ({
        tareas: d.tareas.map((t) =>
          t.id_practicante === id && t.estado === 'EN_PROGRESO'
            ? { ...t, estado: 'ESPERANDO_SUPERVISION' as const }
            : t,
        ),
      }));
      await mostrar(id);

      const dialogo = await abrirFinalizar(user);

      expect(dialogo).toHaveTextContent('No tiene tareas en progreso.');
    });

    it('el aviso sale de la consulta: si cambia el almacén con el detalle abierto, se actualiza', async () => {
      const user = userEvent.setup();
      const id = conTareasEnProgreso();
      const n = enProgresoDe(id).length;
      await mostrar(id);
      const [una] = enProgresoDe(id);
      useAlmacen.getState().transaccion((d) => ({
        tareas: d.tareas.map((t) =>
          t.id === una!.id ? { ...t, estado: 'ESPERANDO_SUPERVISION' as const } : t,
        ),
      }));

      await waitFor(async () => {
        await user.click(screen.getByRole('button', { name: 'Finalizar práctica' }));
        const dialogo = await screen.findByRole('dialog', { name: 'Finalizar práctica' });
        expect(dialogo).toHaveTextContent(
          n - 1 === 1
            ? 'Tiene 1 tarea en progreso que será liberada.'
            : `Tiene ${n - 1} tareas en progreso que serán liberadas.`,
        );
      });
    });

    it('el motivo es obligatorio: vacío o solo espacios no deja confirmar', async () => {
      const user = userEvent.setup();
      await mostrar(conTareasEnProgreso());
      const dialogo = await abrirFinalizar(user);
      const confirmar = within(dialogo).getByRole('button', { name: 'Finalizar práctica' });

      expect(confirmar).toBeDisabled();
      await user.type(within(dialogo).getByLabelText(/Motivo/), '    ');
      expect(confirmar).toBeDisabled();
      await user.type(within(dialogo).getByLabelText(/Motivo/), 'Término de ciclo');
      expect(confirmar).toBeEnabled();
    });

    it('al confirmar bloquea el acceso, da de baja las asignaciones y libera solo las tareas en progreso', async () => {
      const user = userEvent.setup();
      const id = conTareasEnProgreso();
      const [aEsperar, ...aLiberar] = enProgresoDe(id);
      useAlmacen.getState().transaccion((d) => ({
        tareas: d.tareas.map((t) =>
          t.id === aEsperar!.id ? { ...t, estado: 'ESPERANDO_SUPERVISION' as const } : t,
        ),
      }));
      await mostrar(id);
      const dialogo = await abrirFinalizar(user);

      await user.type(within(dialogo).getByLabelText(/Motivo/), 'Término de ciclo');
      await user.click(within(dialogo).getByRole('button', { name: 'Finalizar práctica' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(usuario(id).estado).toBe('INACTIVO');
      expect(
        datos().asignaciones.filter((a) => a.id_practicante === id && a.fecha_baja === null),
      ).toEqual([]);
      for (const t of aLiberar) {
        const despues = datos().tareas.find((x) => x.id === t.id)!;
        expect(despues.estado).toBe('DISPONIBLE');
        expect(despues.id_practicante).toBeNull();
      }
      const esperando = datos().tareas.find((t) => t.id === aEsperar!.id)!;
      expect(esperando.estado).toBe('ESPERANDO_SUPERVISION');
      expect(esperando.id_practicante).toBe(id);
    });

    it('deja un registro de la finalización con el motivo y uno por cada tarea liberada', async () => {
      const user = userEvent.setup();
      const id = conTareasEnProgreso();
      const n = enProgresoDe(id).length;
      await mostrar(id);
      const dialogo = await abrirFinalizar(user);

      await user.type(within(dialogo).getByLabelText(/Motivo/), 'Retiro voluntario');
      await user.click(within(dialogo).getByRole('button', { name: 'Finalizar práctica' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      const finalizacion = datos().historial.filter(
        (e) => e.tipo_accion === 'PRACTICANTE_FINALIZADO' && e.elemento.id === id,
      );
      expect(finalizacion.at(-1)?.nota).toBe('Retiro voluntario');
      const liberadas = datos().historial.filter(
        (e) => e.tipo_accion === 'TAREA_LIBERADA' && e.nota === 'Retiro voluntario',
      );
      expect(liberadas).toHaveLength(n);
    });

    it('la pantalla pasa a «Finalizado» y ofrece «Reactivar» en lugar de «Finalizar»', async () => {
      const user = userEvent.setup();
      const id = conTareasEnProgreso();
      await mostrar(id);
      const dialogo = await abrirFinalizar(user);
      await user.type(within(dialogo).getByLabelText(/Motivo/), 'Término de ciclo');

      await user.click(within(dialogo).getByRole('button', { name: 'Finalizar práctica' }));

      const cabecera = screen.getByRole('heading', { level: 1 }).closest('header')!;
      await waitFor(() => expect(within(cabecera).getByText('Finalizado')).toBeInTheDocument());
      expect(within(cabecera).getByRole('button', { name: 'Reactivar' })).toBeVisible();
      expect(
        within(cabecera).queryByRole('button', { name: 'Finalizar práctica' }),
      ).not.toBeInTheDocument();
      expect(
        within(cabecera).queryByRole('button', { name: 'Restablecer contraseña' }),
      ).not.toBeInTheDocument();
    });

    it('cancelar no escribe nada', async () => {
      const user = userEvent.setup();
      const id = conTareasEnProgreso();
      const antes = datos();
      await mostrar(id);
      const dialogo = await abrirFinalizar(user);
      await user.type(within(dialogo).getByLabelText(/Motivo/), 'Término de ciclo');

      await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(datos()).toBe(antes);
    });

    it('si el servicio la rechaza, el diálogo sigue abierto con el mensaje y no escribe', async () => {
      const user = userEvent.setup();
      const id = conTareasEnProgreso();
      await mostrar(id);
      const dialogo = await abrirFinalizar(user);
      await user.type(within(dialogo).getByLabelText(/Motivo/), 'Término de ciclo');
      // Mientras el diálogo estaba abierto, otra pestaña ya la había finalizado.
      useAlmacen.getState().transaccion((d) => ({
        usuarios: d.usuarios.map((u) => (u.id === id ? { ...u, estado: 'INACTIVO' as const } : u)),
      }));
      const historialAntes = datos().historial;

      await user.click(within(dialogo).getByRole('button', { name: 'Finalizar práctica' }));

      expect(await within(dialogo).findByRole('alert')).toBeInTheDocument();
      expect(datos().historial).toBe(historialAntes);
    });
  });

  describe('reactivar', () => {
    it('la nota es obligatoria: vacía o solo con espacios no deja confirmar', async () => {
      const user = userEvent.setup();
      await mostrar(FINALIZADO);
      const dialogo = await abrirReactivar(user);
      const confirmar = within(dialogo).getByRole('button', { name: 'Reactivar' });

      expect(confirmar).toBeDisabled();
      await user.type(within(dialogo).getByLabelText(/Nota/), '   ');
      expect(confirmar).toBeDisabled();
      await user.type(within(dialogo).getByLabelText(/Nota/), 'Vuelve para otro ciclo');
      expect(confirmar).toBeEnabled();
    });

    it('explica que las asignaciones antiguas no se reactivan y que la fecha de fin no cambia', async () => {
      const user = userEvent.setup();
      await mostrar(FINALIZADO);

      const dialogo = await abrirReactivar(user);

      expect(dialogo).toHaveTextContent('Sus asignaciones antiguas no se reactivan');
      expect(dialogo).toHaveTextContent('La fecha de fin prevista no cambia');
    });

    it('vuelve a «Activo» y queda «Sin proyecto», sin reactivar sus asignaciones ni cambiar la fecha de fin', async () => {
      const user = userEvent.setup();
      const finAntes = datos().practicantes.find(
        (p) => p.id_usuario === FINALIZADO,
      )!.fecha_fin_prevista;
      const asignacionesAntes = datos().asignaciones.filter((a) => a.id_practicante === FINALIZADO);
      await mostrar(FINALIZADO);
      const dialogo = await abrirReactivar(user);

      await user.type(within(dialogo).getByLabelText(/Nota/), 'Vuelve para otro ciclo');
      await user.click(within(dialogo).getByRole('button', { name: 'Reactivar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(usuario(FINALIZADO).estado).toBe('ACTIVO');
      expect(datos().asignaciones.filter((a) => a.id_practicante === FINALIZADO)).toEqual(
        asignacionesAntes,
      );
      expect(
        datos().practicantes.find((p) => p.id_usuario === FINALIZADO)!.fecha_fin_prevista,
      ).toBe(finAntes);
      const cabecera = screen.getByRole('heading', { level: 1 }).closest('header')!;
      await waitFor(() => expect(within(cabecera).getByText('Activo')).toBeInTheDocument());
      expect(within(cabecera).getByText('Sin proyecto')).toBeInTheDocument();
      expect(within(cabecera).getByRole('button', { name: 'Finalizar práctica' })).toBeVisible();
      expect(within(cabecera).queryByRole('button', { name: 'Reactivar' })).not.toBeInTheDocument();
    });

    it('deja un registro con la nota', async () => {
      const user = userEvent.setup();
      await mostrar(FINALIZADO);
      const dialogo = await abrirReactivar(user);

      await user.type(within(dialogo).getByLabelText(/Nota/), 'Vuelve para otro ciclo');
      await user.click(within(dialogo).getByRole('button', { name: 'Reactivar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      const eventos = datos().historial.filter(
        (e) => e.tipo_accion === 'PRACTICANTE_REACTIVADO' && e.elemento.id === FINALIZADO,
      );
      expect(eventos.at(-1)?.nota).toBe('Vuelve para otro ciclo');
    });

    it('cancelar no escribe nada', async () => {
      const user = userEvent.setup();
      const antes = datos();
      await mostrar(FINALIZADO);
      const dialogo = await abrirReactivar(user);
      await user.type(within(dialogo).getByLabelText(/Nota/), 'Vuelve para otro ciclo');

      await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(datos()).toBe(antes);
    });

    it('si el servicio la rechaza, el diálogo sigue abierto con el mensaje y no escribe', async () => {
      const user = userEvent.setup();
      await mostrar(FINALIZADO);
      const dialogo = await abrirReactivar(user);
      await user.type(within(dialogo).getByLabelText(/Nota/), 'Vuelve para otro ciclo');
      // Mientras el diálogo estaba abierto, otra pestaña ya la había reactivado.
      useAlmacen.getState().transaccion((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === FINALIZADO ? { ...u, estado: 'ACTIVO' as const } : u,
        ),
      }));
      const historialAntes = datos().historial;

      await user.click(within(dialogo).getByRole('button', { name: 'Reactivar' }));

      expect(await within(dialogo).findByRole('alert')).toBeInTheDocument();
      expect(datos().historial).toBe(historialAntes);
    });
  });
});

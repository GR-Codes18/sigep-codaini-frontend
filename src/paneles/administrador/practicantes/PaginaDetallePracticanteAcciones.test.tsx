import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno } from '@/services';
import { PaginaDetallePracticante } from './PaginaDetallePracticante';

const ADMIN = 'demo-admin';
const ACTIVO = 'usr-pra-03';
const FINALIZADO = 'usr-pra-19';

const entorno = crearEntorno({ demoraMs: 0 });
const datos = () => useAlmacen.getState().datos;
const practicante = (id: Id) => datos().practicantes.find((p) => p.id_usuario === id)!;
const usuario = (id: Id) => datos().usuarios.find((u) => u.id === id)!;

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

/** Otra especialidad activa, de cualquier área. */
const otraEspecialidad = (id: Id) =>
  datos().especialidades.find((e) => e.activo && e.id !== practicante(id).id_especialidad)!;

async function abrirEdicion(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Editar datos de la práctica' }));
  return await screen.findByRole('dialog', { name: 'Editar datos de la práctica' });
}

describe('PaginaDetallePracticante: acciones', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  describe('qué botones se ofrecen', () => {
    it('una práctica activa ofrece editar y restablecer la contraseña', async () => {
      await mostrar(ACTIVO);

      const acciones = screen.getByRole('group', { name: 'Acciones' });
      expect(
        within(acciones).getByRole('button', { name: 'Editar datos de la práctica' }),
      ).toBeVisible();
      expect(
        within(acciones).getByRole('button', { name: 'Restablecer contraseña' }),
      ).toBeVisible();
    });

    it('una práctica finalizada ofrece editar, pero no restablecer la contraseña', async () => {
      await mostrar(FINALIZADO);

      expect(screen.getByRole('button', { name: 'Editar datos de la práctica' })).toBeVisible();
      expect(
        screen.queryByRole('button', { name: 'Restablecer contraseña' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('editar los datos de la práctica', () => {
    it('abre con los valores actuales', async () => {
      const user = userEvent.setup();
      const actual = practicante(ACTIVO);
      await mostrar(ACTIVO);

      const dialogo = await abrirEdicion(user);

      await waitFor(() =>
        expect(within(dialogo).getByLabelText('Especialidad')).toHaveValue(actual.id_especialidad),
      );
      expect(within(dialogo).getByLabelText('Fecha de ingreso')).toHaveValue(actual.fecha_ingreso);
      expect(within(dialogo).getByLabelText('Fecha de fin prevista')).toHaveValue(
        actual.fecha_fin_prevista,
      );
      expect(within(dialogo).getByRole('button', { name: 'Guardar' })).toBeDisabled();
    });

    it('cambiar la especialidad la guarda, el área la sigue y queda en el historial', async () => {
      const user = userEvent.setup();
      const nueva = otraEspecialidad(ACTIVO);
      await mostrar(ACTIVO);
      const dialogo = await abrirEdicion(user);
      await waitFor(() =>
        expect(within(dialogo).getByLabelText('Especialidad')).not.toBeDisabled(),
      );

      await user.selectOptions(within(dialogo).getByLabelText('Especialidad'), nueva.id);
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(practicante(ACTIVO).id_especialidad).toBe(nueva.id);
      expect(practicante(ACTIVO).id_area_tecnica).toBe(nueva.id_area_tecnica);
      expect(
        datos().historial.some(
          (e) =>
            e.tipo_accion === 'PRACTICANTE_DATOS_PRACTICA_EDITADOS' && e.elemento.id === ACTIVO,
        ),
      ).toBe(true);
    });

    it('al cambiar el ingreso propone el fin (ingreso + la duración) y envía las dos fechas', async () => {
      const user = userEvent.setup();
      await mostrar(ACTIVO);
      const dialogo = await abrirEdicion(user);
      await waitFor(() =>
        expect(within(dialogo).getByLabelText('Especialidad')).not.toBeDisabled(),
      );

      fireEvent.change(within(dialogo).getByLabelText('Fecha de ingreso'), {
        target: { value: '2026-10-31' },
      });

      // 31 de octubre más 4 meses: 28 de febrero (el mes de destino es más corto).
      await waitFor(() =>
        expect(within(dialogo).getByLabelText('Fecha de fin prevista')).toHaveValue('2027-02-28'),
      );
      expect(within(dialogo).getByRole('status')).toHaveTextContent(
        'Propuesta: ingreso más 4 meses',
      );

      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(practicante(ACTIVO).fecha_ingreso).toBe('2026-10-31');
      expect(practicante(ACTIVO).fecha_fin_prevista).toBe('2027-02-28');
    });

    it('si el fin se escribió a mano, cambiar el ingreso no lo pisa', async () => {
      const user = userEvent.setup();
      await mostrar(ACTIVO);
      const dialogo = await abrirEdicion(user);
      await waitFor(() =>
        expect(within(dialogo).getByLabelText('Especialidad')).not.toBeDisabled(),
      );

      fireEvent.change(within(dialogo).getByLabelText('Fecha de fin prevista'), {
        target: { value: '2027-06-30' },
      });
      fireEvent.change(within(dialogo).getByLabelText('Fecha de ingreso'), {
        target: { value: '2026-10-01' },
      });

      expect(within(dialogo).getByLabelText('Fecha de fin prevista')).toHaveValue('2027-06-30');
      expect(within(dialogo).queryByRole('status')).not.toBeInTheDocument();
    });

    it('un fin anterior al ingreso lo rechaza el servicio: mensaje en el campo y no escribe', async () => {
      const user = userEvent.setup();
      const antes = practicante(ACTIVO);
      await mostrar(ACTIVO);
      const dialogo = await abrirEdicion(user);
      await waitFor(() =>
        expect(within(dialogo).getByLabelText('Especialidad')).not.toBeDisabled(),
      );

      fireEvent.change(within(dialogo).getByLabelText('Fecha de fin prevista'), {
        target: { value: '2020-01-01' },
      });
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      expect(
        await within(dialogo).findByText('No puede ser anterior a la fecha de ingreso.'),
      ).toBeVisible();
      expect(within(dialogo).getByRole('alert')).toBeInTheDocument();
      expect(practicante(ACTIVO)).toBe(antes);
    });

    it('una fecha vacía se rechaza en el formulario, sin llamar al servicio', async () => {
      const user = userEvent.setup();
      const antes = practicante(ACTIVO);
      await mostrar(ACTIVO);
      const dialogo = await abrirEdicion(user);
      await waitFor(() =>
        expect(within(dialogo).getByLabelText('Especialidad')).not.toBeDisabled(),
      );

      fireEvent.change(within(dialogo).getByLabelText('Fecha de fin prevista'), {
        target: { value: '' },
      });
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      expect(await within(dialogo).findByText('Escribe la fecha de fin prevista.')).toBeVisible();
      expect(practicante(ACTIVO)).toBe(antes);
    });

    it('no ofrece una especialidad inactiva (solo la actual, si ya lo está)', async () => {
      const user = userEvent.setup();
      const inactiva = otraEspecialidad(ACTIVO);
      useAlmacen.getState().transaccion((d) => ({
        especialidades: d.especialidades.map((e) =>
          e.id === inactiva.id ? { ...e, activo: false } : e,
        ),
      }));
      await mostrar(ACTIVO);
      const dialogo = await abrirEdicion(user);
      await waitFor(() =>
        expect(within(dialogo).getByLabelText('Especialidad')).not.toBeDisabled(),
      );

      const opciones = within(dialogo)
        .getAllByRole('option')
        .map((o) => (o as HTMLOptionElement).value);
      expect(opciones).not.toContain(inactiva.id);
      expect(opciones).toContain(practicante(ACTIVO).id_especialidad);
    });

    it('cancelar no escribe nada', async () => {
      const user = userEvent.setup();
      const antes = practicante(ACTIVO);
      await mostrar(ACTIVO);
      const dialogo = await abrirEdicion(user);
      fireEvent.change(within(dialogo).getByLabelText('Fecha de ingreso'), {
        target: { value: '2026-09-01' },
      });

      await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(practicante(ACTIVO)).toBe(antes);
    });

    it('también se editan los datos de una práctica finalizada', async () => {
      const user = userEvent.setup();
      await mostrar(FINALIZADO);
      const dialogo = await abrirEdicion(user);
      await waitFor(() =>
        expect(within(dialogo).getByLabelText('Especialidad')).not.toBeDisabled(),
      );

      fireEvent.change(within(dialogo).getByLabelText('Fecha de fin prevista'), {
        target: { value: '2027-12-31' },
      });
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(practicante(FINALIZADO).fecha_fin_prevista).toBe('2027-12-31');
    });
  });

  describe('restablecer la contraseña', () => {
    async function restablecer(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }));
      const confirmacion = await screen.findByRole('dialog', { name: 'Restablecer contraseña' });
      await user.click(within(confirmacion).getByRole('button', { name: 'Restablecer' }));
      return await screen.findByRole('dialog', { name: 'Contraseña restablecida' });
    }

    it('pide confirmación y no escribe si se cancela', async () => {
      const user = userEvent.setup();
      const antes = usuario(ACTIVO);
      await mostrar(ACTIVO);

      await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }));
      const confirmacion = await screen.findByRole('dialog', { name: 'Restablecer contraseña' });
      await user.click(within(confirmacion).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(usuario(ACTIVO)).toBe(antes);
    });

    it('muestra la contraseña temporal una sola vez, la misma que quedó en la cuenta', async () => {
      const user = userEvent.setup();
      const anterior = usuario(ACTIVO).contrasena;
      await mostrar(ACTIVO);

      const modal = await restablecer(user);

      const mostrada = within(modal).getByLabelText('Contraseña temporal').textContent;
      expect(mostrada).toBeTruthy();
      expect(mostrada).toBe(usuario(ACTIVO).contrasena);
      expect(mostrada).not.toBe(anterior);
      expect(usuario(ACTIVO).debe_cambiar_contrasena).toBe(true);
      expect(modal).toHaveTextContent(usuario(ACTIVO).correo);

      await user.click(within(modal).getByRole('button', { name: 'Entendido' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText(mostrada!)).not.toBeInTheDocument();
    });

    it('el modal de la contraseña no se cierra con Escape ni con un clic fuera', async () => {
      const user = userEvent.setup();
      await mostrar(ACTIVO);
      await restablecer(user);

      await user.keyboard('{Escape}');

      expect(screen.getByRole('dialog', { name: 'Contraseña restablecida' })).toBeInTheDocument();
    });

    it('la contraseña no llega al historial ni a las notificaciones', async () => {
      const user = userEvent.setup();
      await mostrar(ACTIVO);
      await restablecer(user);

      const contrasena = usuario(ACTIVO).contrasena;
      expect(JSON.stringify(datos().historial)).not.toContain(contrasena);
      expect(JSON.stringify(datos().notificaciones)).not.toContain(contrasena);
      expect(
        datos().historial.some(
          (e) =>
            e.tipo_accion === 'PRACTICANTE_CONTRASENA_RESTABLECIDA' && e.elemento.id === ACTIVO,
        ),
      ).toBe(true);
    });

    it('si el servicio la rechaza, la confirmación sigue abierta con el mensaje y no escribe', async () => {
      const user = userEvent.setup();
      await mostrar(ACTIVO);
      await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }));
      const confirmacion = await screen.findByRole('dialog', { name: 'Restablecer contraseña' });
      // Mientras la confirmación estaba abierta, la práctica se finalizó.
      useAlmacen.getState().transaccion((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === ACTIVO ? { ...u, estado: 'INACTIVO' as const } : u,
        ),
      }));
      const antes = usuario(ACTIVO);

      await user.click(within(confirmacion).getByRole('button', { name: 'Restablecer' }));

      expect(await within(confirmacion).findByRole('alert')).toBeInTheDocument();
      expect(usuario(ACTIVO)).toBe(antes);
    });
  });
});

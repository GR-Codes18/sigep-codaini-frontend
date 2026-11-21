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
const ACTIVO = 'demo-supervisor';
const OTRO = 'usr-sup-02';
const INACTIVO = 'usr-sup-03';

const entorno = crearEntorno({ demoraMs: 0 });
const datos = () => useAlmacen.getState().datos;
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

async function abrirEdicion(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Editar nombre y correo' }));
  return await screen.findByRole('dialog', { name: 'Editar datos del supervisor' });
}

describe('PaginaDetalleSupervisor: cuenta del supervisor', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
    // Un supervisor inactivo (sin proyectos a cargo) para comparar.
    useAlmacen.getState().transaccion((d) => ({
      usuarios: d.usuarios.map((u) =>
        u.id === INACTIVO ? { ...u, estado: 'INACTIVO' as const } : u,
      ),
    }));
  });

  describe('qué botones se ofrecen', () => {
    it('una cuenta activa ofrece editar el nombre y el correo, y restablecer la contraseña', async () => {
      await mostrar(ACTIVO);

      const acciones = screen.getByRole('group', { name: 'Acciones' });
      expect(
        within(acciones).getByRole('button', { name: 'Editar nombre y correo' }),
      ).toBeVisible();
      expect(
        within(acciones).getByRole('button', { name: 'Restablecer contraseña' }),
      ).toBeVisible();
    });

    it('una cuenta inactiva ofrece editar, pero no restablecer la contraseña', async () => {
      await mostrar(INACTIVO);

      expect(screen.getByRole('button', { name: 'Editar nombre y correo' })).toBeVisible();
      expect(
        screen.queryByRole('button', { name: 'Restablecer contraseña' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('editar nombre y correo', () => {
    it('abre con los valores actuales y no deja guardar sin cambios', async () => {
      const user = userEvent.setup();
      await mostrar(ACTIVO);

      const dialogo = await abrirEdicion(user);

      expect(within(dialogo).getByLabelText('Nombre')).toHaveValue(usuario(ACTIVO).nombre);
      expect(within(dialogo).getByLabelText('Correo institucional')).toHaveValue(
        usuario(ACTIVO).correo,
      );
      expect(within(dialogo).getByRole('button', { name: 'Guardar' })).toBeDisabled();
    });

    it('cambiar el nombre lo guarda y deja un registro, sin tocar el correo ni el celular', async () => {
      const user = userEvent.setup();
      const antes = usuario(ACTIVO);
      await mostrar(ACTIVO);
      const dialogo = await abrirEdicion(user);

      await user.clear(within(dialogo).getByLabelText('Nombre'));
      await user.type(within(dialogo).getByLabelText('Nombre'), 'Nuevo Nombre');
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(usuario(ACTIVO).nombre).toBe('Nuevo Nombre');
      expect(usuario(ACTIVO).correo).toBe(antes.correo);
      expect(usuario(ACTIVO).celular).toBe(antes.celular);
      expect(
        datos().historial.some(
          (e) => e.tipo_accion === 'SUPERVISOR_EDITADO' && e.elemento.id === ACTIVO,
        ),
      ).toBe(true);
      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Nuevo Nombre');
    });

    it('cambiar el correo cambia también su usuario de acceso', async () => {
      const user = userEvent.setup();
      await mostrar(ACTIVO);
      const dialogo = await abrirEdicion(user);

      await user.clear(within(dialogo).getByLabelText('Correo institucional'));
      await user.type(
        within(dialogo).getByLabelText('Correo institucional'),
        'otro.correo@codaini.demo',
      );
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(usuario(ACTIVO).correo).toBe('otro.correo@codaini.demo');
    });

    it('un correo inválido se rechaza en el formulario, sin llamar al servicio', async () => {
      const user = userEvent.setup();
      const antes = usuario(ACTIVO);
      await mostrar(ACTIVO);
      const dialogo = await abrirEdicion(user);

      await user.clear(within(dialogo).getByLabelText('Correo institucional'));
      await user.type(within(dialogo).getByLabelText('Correo institucional'), 'no-es-correo');
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      expect(await within(dialogo).findByText('Escribe un correo válido.')).toBeVisible();
      expect(usuario(ACTIVO)).toBe(antes);
    });

    it('un nombre vacío se rechaza en el formulario', async () => {
      const user = userEvent.setup();
      const antes = usuario(ACTIVO);
      await mostrar(ACTIVO);
      const dialogo = await abrirEdicion(user);

      await user.clear(within(dialogo).getByLabelText('Nombre'));
      await user.type(within(dialogo).getByLabelText('Nombre'), '   ');
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      expect(await within(dialogo).findByText('Escribe el nombre.')).toBeVisible();
      expect(usuario(ACTIVO)).toBe(antes);
    });

    it('un correo de otra cuenta lo rechaza el servicio: mensaje en el campo y no escribe', async () => {
      const user = userEvent.setup();
      const antes = usuario(ACTIVO);
      await mostrar(ACTIVO);
      const dialogo = await abrirEdicion(user);

      await user.clear(within(dialogo).getByLabelText('Correo institucional'));
      await user.type(
        within(dialogo).getByLabelText('Correo institucional'),
        usuario(OTRO).correo.toUpperCase(),
      );
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      expect(
        await within(dialogo).findByText('Ya existe una cuenta con ese correo.'),
      ).toBeVisible();
      expect(
        screen.getByRole('dialog', { name: 'Editar datos del supervisor' }),
      ).toBeInTheDocument();
      expect(usuario(ACTIVO)).toBe(antes);
    });

    it('cancelar no escribe nada', async () => {
      const user = userEvent.setup();
      const antes = datos();
      await mostrar(ACTIVO);
      const dialogo = await abrirEdicion(user);
      await user.type(within(dialogo).getByLabelText('Nombre'), ' X');

      await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(datos()).toBe(antes);
    });

    it('también se editan los datos de una cuenta inactiva', async () => {
      const user = userEvent.setup();
      await mostrar(INACTIVO);
      const dialogo = await abrirEdicion(user);

      await user.clear(within(dialogo).getByLabelText('Nombre'));
      await user.type(within(dialogo).getByLabelText('Nombre'), 'Nombre Corregido');
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(usuario(INACTIVO).nombre).toBe('Nombre Corregido');
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

    it('el modal de la contraseña no se cierra con Escape', async () => {
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
          (e) => e.tipo_accion === 'SUPERVISOR_CONTRASENA_RESTABLECIDA' && e.elemento.id === ACTIVO,
        ),
      ).toBe(true);
    });

    it('si el servicio la rechaza, la confirmación sigue abierta con el mensaje y no escribe', async () => {
      const user = userEvent.setup();
      await mostrar(ACTIVO);
      await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }));
      const confirmacion = await screen.findByRole('dialog', { name: 'Restablecer contraseña' });
      // Mientras la confirmación estaba abierta, la cuenta se desactivó.
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

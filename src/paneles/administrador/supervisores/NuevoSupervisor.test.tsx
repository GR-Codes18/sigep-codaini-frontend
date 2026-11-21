import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno } from '@/services';
import { PaginaSupervisores } from './PaginaSupervisores';

const ADMIN = 'demo-admin';

const entorno = crearEntorno({ demoraMs: 0 });
const datos = () => useAlmacen.getState().datos;
const supervisores = () => datos().supervisores.length;

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

async function mostrar() {
  render(
    <MemoryRouter initialEntries={['/administrador/supervisores']}>
      <Routes>
        <Route
          path="/administrador/supervisores"
          element={<PaginaSupervisores entorno={entorno} />}
        />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando supervisores' })).toBeNull(),
  );
}

async function abrir(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Nuevo supervisor' }));
  return await screen.findByRole('dialog', { name: 'Nuevo supervisor' });
}

async function llenar(
  user: ReturnType<typeof userEvent.setup>,
  dialogo: HTMLElement,
  v: { nombre: string; correo: string; celular: string },
) {
  await user.type(within(dialogo).getByLabelText('Nombre'), v.nombre);
  await user.type(within(dialogo).getByLabelText('Correo institucional'), v.correo);
  await user.type(within(dialogo).getByLabelText('Celular'), v.celular);
}

const NUEVO = { nombre: 'Marta Salas', correo: 'marta.salas@codaini.demo', celular: '987654321' };

describe('PaginaSupervisores: «Nuevo supervisor»', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('el botón abre un formulario con nombre, correo y celular', async () => {
    const user = userEvent.setup();
    await mostrar();

    const dialogo = await abrir(user);

    expect(within(dialogo).getByLabelText('Nombre')).toBeVisible();
    expect(within(dialogo).getByLabelText('Correo institucional')).toBeVisible();
    expect(within(dialogo).getByLabelText('Celular')).toBeVisible();
  });

  it('crea la cuenta de supervisor, activa, con contraseña temporal y registro en el historial', async () => {
    const user = userEvent.setup();
    const antes = supervisores();
    await mostrar();
    const dialogo = await abrir(user);

    await llenar(user, dialogo, NUEVO);
    await user.click(within(dialogo).getByRole('button', { name: 'Crear supervisor' }));

    await screen.findByRole('dialog', { name: 'Cuenta de supervisor creada' });
    expect(supervisores()).toBe(antes + 1);
    const usuario = datos().usuarios.find((u) => u.correo === NUEVO.correo)!;
    expect(usuario.rol).toBe('SUPERVISOR');
    expect(usuario.estado).toBe('ACTIVO');
    expect(usuario.debe_cambiar_contrasena).toBe(true);
    expect(
      datos().historial.some(
        (e) => e.tipo_accion === 'SUPERVISOR_CREADO' && e.elemento.id === usuario.id,
      ),
    ).toBe(true);
  });

  it('muestra la contraseña temporal una sola vez, la misma que quedó en la cuenta', async () => {
    const user = userEvent.setup();
    await mostrar();
    const dialogo = await abrir(user);
    await llenar(user, dialogo, NUEVO);
    await user.click(within(dialogo).getByRole('button', { name: 'Crear supervisor' }));

    const modal = await screen.findByRole('dialog', { name: 'Cuenta de supervisor creada' });

    const mostrada = within(modal).getByLabelText('Contraseña temporal').textContent;
    expect(mostrada).toBeTruthy();
    expect(mostrada).toBe(datos().usuarios.find((u) => u.correo === NUEVO.correo)!.contrasena);
    expect(modal).toHaveTextContent(NUEVO.correo);
    await user.click(within(modal).getByRole('button', { name: 'Entendido' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(mostrada!)).not.toBeInTheDocument();
  });

  it('el modal de la contraseña no se cierra con Escape', async () => {
    const user = userEvent.setup();
    await mostrar();
    const dialogo = await abrir(user);
    await llenar(user, dialogo, NUEVO);
    await user.click(within(dialogo).getByRole('button', { name: 'Crear supervisor' }));
    await screen.findByRole('dialog', { name: 'Cuenta de supervisor creada' });

    await user.keyboard('{Escape}');

    expect(screen.getByRole('dialog', { name: 'Cuenta de supervisor creada' })).toBeInTheDocument();
  });

  it('la contraseña no llega al historial ni a las notificaciones', async () => {
    const user = userEvent.setup();
    await mostrar();
    const dialogo = await abrir(user);
    await llenar(user, dialogo, NUEVO);
    await user.click(within(dialogo).getByRole('button', { name: 'Crear supervisor' }));
    await screen.findByRole('dialog', { name: 'Cuenta de supervisor creada' });

    const contrasena = datos().usuarios.find((u) => u.correo === NUEVO.correo)!.contrasena;
    expect(JSON.stringify(datos().historial)).not.toContain(contrasena);
    expect(JSON.stringify(datos().notificaciones)).not.toContain(contrasena);
  });

  it('el nuevo supervisor aparece en «Activos» sin proyectos', async () => {
    const user = userEvent.setup();
    await mostrar();
    const dialogo = await abrir(user);
    await llenar(user, dialogo, NUEVO);
    await user.click(within(dialogo).getByRole('button', { name: 'Crear supervisor' }));
    const modal = await screen.findByRole('dialog', { name: 'Cuenta de supervisor creada' });
    await user.click(within(modal).getByRole('button', { name: 'Entendido' }));

    const fila = await screen.findByRole('row', { name: new RegExp(NUEVO.nombre) });
    expect(within(fila).getAllByRole('cell')[1]).toHaveTextContent('0');
  });

  it('un campo vacío o inválido se rechaza en el formulario, sin llamar al servicio', async () => {
    const user = userEvent.setup();
    const antes = supervisores();
    await mostrar();
    const dialogo = await abrir(user);

    await user.type(within(dialogo).getByLabelText('Correo institucional'), 'no-es-un-correo');
    await user.type(within(dialogo).getByLabelText('Celular'), '12345');
    await user.click(within(dialogo).getByRole('button', { name: 'Crear supervisor' }));

    expect(await within(dialogo).findByText('Escribe el nombre.')).toBeVisible();
    expect(within(dialogo).getByText('Escribe un correo válido.')).toBeVisible();
    expect(
      within(dialogo).getByText('El celular debe tener 9 dígitos y empezar con 9.'),
    ).toBeVisible();
    expect(supervisores()).toBe(antes);
  });

  it('un correo ya registrado lo rechaza el servicio: mensaje en el campo y no crea nada', async () => {
    const user = userEvent.setup();
    const antes = supervisores();
    const existente = datos().usuarios.find((u) => u.rol === 'PRACTICANTE')!.correo;
    await mostrar();
    const dialogo = await abrir(user);

    await llenar(user, dialogo, { ...NUEVO, correo: existente.toUpperCase() });
    await user.click(within(dialogo).getByRole('button', { name: 'Crear supervisor' }));

    expect(await within(dialogo).findByText('Ya existe una cuenta con ese correo.')).toBeVisible();
    expect(screen.getByRole('dialog', { name: 'Nuevo supervisor' })).toBeInTheDocument();
    expect(supervisores()).toBe(antes);
  });

  it('cancelar no crea nada', async () => {
    const user = userEvent.setup();
    const antes = datos();
    await mostrar();
    const dialogo = await abrir(user);
    await llenar(user, dialogo, NUEVO);

    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(datos()).toBe(antes);
  });

  it('al volver a abrir el formulario está vacío', async () => {
    const user = userEvent.setup();
    await mostrar();
    const dialogo = await abrir(user);
    await llenar(user, dialogo, NUEVO);
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    const otra = await abrir(user);

    expect(within(otra).getByLabelText('Nombre')).toHaveValue('');
  });
});

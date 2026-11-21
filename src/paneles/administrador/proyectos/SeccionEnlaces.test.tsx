import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno } from '@/services';
import { PaginaDetalleProyecto } from './PaginaDetalleProyecto';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const ACTIVO = 'pry-pl2d';
const FINALIZADO = 'pry-tie';

const entorno = crearEntorno({ demoraMs: 0 });
const datos = () => useAlmacen.getState().datos;
const enlacesDe = (id: Id) => datos().enlaces_proyecto.filter((e) => e.id_proyecto === id);

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
    <MemoryRouter initialEntries={[`/administrador/proyectos/${idProyecto}`]}>
      <Routes>
        <Route
          path="/administrador/proyectos/:idProyecto"
          element={<PaginaDetalleProyecto entorno={entorno} />}
        />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando el proyecto' })).toBeNull(),
  );
}

const seccion = () => screen.getByRole('region', { name: 'Enlaces útiles' });
const poner = (dialogo: HTMLElement, etiqueta: string, valor: string) =>
  fireEvent.change(within(dialogo).getByLabelText(etiqueta), { target: { value: valor } });

/** Un proyecto con al menos un enlace, para poder editar y quitar. */
function conEnlace() {
  if (enlacesDe(ACTIVO).length === 0) {
    useAlmacen.getState().transaccion((d) => ({
      enlaces_proyecto: [
        ...d.enlaces_proyecto,
        {
          id: 'enl-prueba',
          id_proyecto: ACTIVO,
          nombre: 'Carpeta de documentos',
          url: 'https://ejemplo.com/docs',
        },
      ],
    }));
  }
  return enlacesDe(ACTIVO)[0]!;
}

describe('Resumen del proyecto: enlaces útiles', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('el Administrador puede agregar, y editar y quitar cada enlace', async () => {
    const enlace = conEnlace();
    await mostrar(ACTIVO);

    expect(within(seccion()).getByRole('button', { name: 'Agregar enlace' })).toBeVisible();
    expect(
      within(seccion()).getByRole('button', { name: `Editar enlace ${enlace.nombre}` }),
    ).toBeVisible();
    expect(
      within(seccion()).getByRole('button', { name: `Quitar enlace ${enlace.nombre}` }),
    ).toBeVisible();
  });

  it('agregar un enlace lo guarda, con registro, y aparece en la lista', async () => {
    const user = userEvent.setup();
    const antes = enlacesDe(ACTIVO).length;
    await mostrar(ACTIVO);

    await user.click(within(seccion()).getByRole('button', { name: 'Agregar enlace' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Agregar enlace' });
    poner(dialogo, 'Nombre', 'Canal de Discord');
    poner(dialogo, 'Dirección', 'https://discord.gg/codaini');
    await user.click(within(dialogo).getByRole('button', { name: 'Agregar' }));

    await waitFor(() => expect(enlacesDe(ACTIVO)).toHaveLength(antes + 1));
    expect(
      datos().historial.some(
        (e) => e.tipo_accion === 'PROYECTO_ENLACE_AGREGADO' && e.id_proyecto === ACTIVO,
      ),
    ).toBe(true);
    expect(await within(seccion()).findByText('Canal de Discord')).toBeVisible();
    expect(
      within(seccion()).getByRole('link', { name: 'https://discord.gg/codaini' }),
    ).toHaveAttribute('target', '_blank');
  });

  it('un enlace con nombre vacío o dirección inválida se rechaza en el formulario, sin escribir', async () => {
    const user = userEvent.setup();
    const antes = datos().enlaces_proyecto;
    await mostrar(ACTIVO);
    await user.click(within(seccion()).getByRole('button', { name: 'Agregar enlace' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Agregar enlace' });

    poner(dialogo, 'Dirección', 'ftp://no-vale');
    await user.click(within(dialogo).getByRole('button', { name: 'Agregar' }));

    expect(await within(dialogo).findByText('Escribe el nombre del enlace.')).toBeVisible();
    expect(
      within(dialogo).getByText('La dirección debe empezar con http:// o https://.'),
    ).toBeVisible();
    expect(datos().enlaces_proyecto).toBe(antes);
  });

  it('editar cambia solo lo que cambió y deja registro', async () => {
    const user = userEvent.setup();
    const enlace = conEnlace();
    await mostrar(ACTIVO);

    await user.click(
      within(seccion()).getByRole('button', { name: `Editar enlace ${enlace.nombre}` }),
    );
    const dialogo = await screen.findByRole('dialog', { name: 'Editar enlace' });
    expect(within(dialogo).getByLabelText('Nombre')).toHaveValue(enlace.nombre);
    expect(within(dialogo).getByRole('button', { name: 'Guardar' })).toBeDisabled();
    poner(dialogo, 'Nombre', 'Documentos del equipo');
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(enlacesDe(ACTIVO).find((e) => e.id === enlace.id)!.nombre).toBe(
        'Documentos del equipo',
      ),
    );
    expect(enlacesDe(ACTIVO).find((e) => e.id === enlace.id)!.url).toBe(enlace.url);
    expect(
      datos().historial.some(
        (e) => e.tipo_accion === 'PROYECTO_ENLACE_EDITADO' && e.id_proyecto === ACTIVO,
      ),
    ).toBe(true);
  });

  it('quitar pide confirmación, quita el enlace y deja registro', async () => {
    const user = userEvent.setup();
    const enlace = conEnlace();
    const antes = enlacesDe(ACTIVO).length;
    await mostrar(ACTIVO);

    await user.click(
      within(seccion()).getByRole('button', { name: `Quitar enlace ${enlace.nombre}` }),
    );
    const confirmacion = await screen.findByRole('dialog', { name: 'Quitar enlace' });
    await user.click(within(confirmacion).getByRole('button', { name: 'Quitar' }));

    await waitFor(() => expect(enlacesDe(ACTIVO)).toHaveLength(antes - 1));
    expect(
      datos().historial.some(
        (e) => e.tipo_accion === 'PROYECTO_ENLACE_QUITADO' && e.id_proyecto === ACTIVO,
      ),
    ).toBe(true);
  });

  it('cancelar la confirmación no quita nada', async () => {
    const user = userEvent.setup();
    const enlace = conEnlace();
    const antes = datos().enlaces_proyecto;
    await mostrar(ACTIVO);

    await user.click(
      within(seccion()).getByRole('button', { name: `Quitar enlace ${enlace.nombre}` }),
    );
    const confirmacion = await screen.findByRole('dialog', { name: 'Quitar enlace' });
    await user.click(within(confirmacion).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(datos().enlaces_proyecto).toBe(antes);
  });

  it('si el servicio rechaza quitarlo, la confirmación sigue abierta con el mensaje y no escribe', async () => {
    const user = userEvent.setup();
    const enlace = conEnlace();
    await mostrar(ACTIVO);
    await user.click(
      within(seccion()).getByRole('button', { name: `Quitar enlace ${enlace.nombre}` }),
    );
    const confirmacion = await screen.findByRole('dialog', { name: 'Quitar enlace' });
    // Mientras la confirmación estaba abierta, otra persona ya lo había quitado.
    useAlmacen.getState().transaccion((d) => ({
      enlaces_proyecto: d.enlaces_proyecto.filter((e) => e.id !== enlace.id),
    }));

    await user.click(within(confirmacion).getByRole('button', { name: 'Quitar' }));

    expect(await within(confirmacion).findByRole('alert')).toBeInTheDocument();
  });

  it('un proyecto finalizado también permite gestionar los enlaces', async () => {
    await mostrar(FINALIZADO);

    expect(within(seccion()).getByRole('button', { name: 'Agregar enlace' })).toBeVisible();
  });

  it('el Supervisor del proyecto también gestiona los enlaces', async () => {
    useAlmacenSesion.getState().cerrarSesion();
    iniciarSesion(SUPERVISOR);
    await mostrar(ACTIVO);

    expect(within(seccion()).getByRole('button', { name: 'Agregar enlace' })).toBeVisible();
  });

  it('sin permiso la lista es de solo lectura: lo decide la consulta, no la pantalla', async () => {
    // Un Supervisor que no es el del proyecto no recibe ni el detalle: no hay lista que mostrar.
    useAlmacenSesion.getState().cerrarSesion();
    iniciarSesion('usr-sup-03');
    await mostrar(ACTIVO);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Enlaces útiles' })).not.toBeInTheDocument();
  });
});

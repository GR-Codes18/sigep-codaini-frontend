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
const proyecto = (id: Id) => datos().proyectos.find((p) => p.id === id)!;

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

async function abrir(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Editar proyecto' }));
  return await screen.findByRole('dialog', { name: 'Editar proyecto' });
}

const poner = (dialogo: HTMLElement, etiqueta: string, valor: string) =>
  fireEvent.change(within(dialogo).getByLabelText(etiqueta), { target: { value: valor } });

describe('PaginaDetalleProyecto: «Editar proyecto»', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('abre con los valores actuales y no deja guardar sin cambios', async () => {
    const user = userEvent.setup();
    const p = proyecto(ACTIVO);
    await mostrar(ACTIVO);

    const dialogo = await abrir(user);

    expect(within(dialogo).getByLabelText('Nombre')).toHaveValue(p.nombre);
    expect(within(dialogo).getByLabelText('Descripción')).toHaveValue(p.descripcion);
    expect(within(dialogo).getByLabelText('Fecha de inicio')).toHaveValue(p.fecha_inicio);
    expect(within(dialogo).getByLabelText('Fecha de fin prevista')).toHaveValue(
      p.fecha_fin_prevista,
    );
    expect(within(dialogo).getByLabelText('Repositorio')).toHaveValue(p.repositorio_url);
    expect(within(dialogo).getByLabelText('Rama base')).toHaveValue(p.rama_base);
    expect(within(dialogo).getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('el código se muestra pero no es editable, ni se ofrece elegir supervisor aquí', async () => {
    const user = userEvent.setup();
    await mostrar(ACTIVO);

    const dialogo = await abrir(user);

    expect(dialogo).toHaveTextContent(`Código: ${proyecto(ACTIVO).codigo}`);
    expect(within(dialogo).queryByLabelText('Código')).not.toBeInTheDocument();
    expect(within(dialogo).queryByLabelText('Supervisor')).not.toBeInTheDocument();
  });

  it('cambiar el nombre y la descripción los guarda, con registro, y no toca el código', async () => {
    const user = userEvent.setup();
    const antes = proyecto(ACTIVO);
    await mostrar(ACTIVO);
    const dialogo = await abrir(user);

    poner(dialogo, 'Nombre', 'Plataforma renovada');
    poner(dialogo, 'Descripción', 'Una descripción nueva.');
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(proyecto(ACTIVO).nombre).toBe('Plataforma renovada');
    expect(proyecto(ACTIVO).descripcion).toBe('Una descripción nueva.');
    expect(proyecto(ACTIVO).codigo).toBe(antes.codigo);
    expect(
      datos().historial.some(
        (e) => e.tipo_accion === 'PROYECTO_EDITADO' && e.id_proyecto === ACTIVO,
      ),
    ).toBe(true);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Plataforma renovada',
    );
  });

  it('cambiar el repositorio deja su propio registro', async () => {
    const user = userEvent.setup();
    await mostrar(ACTIVO);
    const dialogo = await abrir(user);

    poner(dialogo, 'Repositorio', 'https://github.com/codaini/otro-repo');
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(proyecto(ACTIVO).repositorio_url).toBe('https://github.com/codaini/otro-repo');
    expect(
      datos().historial.some(
        (e) => e.tipo_accion === 'PROYECTO_REPOSITORIO_CAMBIADO' && e.id_proyecto === ACTIVO,
      ),
    ).toBe(true);
  });

  it('cambiar la rama base la guarda con su registro', async () => {
    const user = userEvent.setup();
    await mostrar(ACTIVO);
    const dialogo = await abrir(user);

    poner(dialogo, 'Rama base', 'integracion');
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(proyecto(ACTIVO).rama_base).toBe('integracion');
    expect(
      datos().historial.some(
        (e) => e.tipo_accion === 'PROYECTO_RAMA_BASE_CAMBIADA' && e.id_proyecto === ACTIVO,
      ),
    ).toBe(true);
  });

  it('puede cambiar datos, rama y reunión en un solo guardado', async () => {
    const user = userEvent.setup();
    await mostrar(ACTIVO);
    const dialogo = await abrir(user);

    poner(dialogo, 'Nombre', 'Todo a la vez');
    poner(dialogo, 'Rama base', 'staging');
    poner(dialogo, 'Día de la reunión', 'VIERNES');
    poner(dialogo, 'Hora de la reunión', '09:15');
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const p = proyecto(ACTIVO);
    expect([p.nombre, p.rama_base, p.dia_reunion, p.hora_reunion]).toEqual([
      'Todo a la vez',
      'staging',
      'VIERNES',
      '09:15',
    ]);
  });

  describe('reunión semanal', () => {
    it('se define con día y hora, y el equipo recibe un aviso', async () => {
      const user = userEvent.setup();
      useAlmacen.getState().transaccion((d) => ({
        proyectos: d.proyectos.map((p) =>
          p.id === ACTIVO ? { ...p, dia_reunion: null, hora_reunion: null } : p,
        ),
      }));
      const avisosAntes = datos().notificaciones.length;
      await mostrar(ACTIVO);
      const dialogo = await abrir(user);

      poner(dialogo, 'Día de la reunión', 'MARTES');
      poner(dialogo, 'Hora de la reunión', '11:00');
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      await waitFor(() => expect(proyecto(ACTIVO).dia_reunion).toBe('MARTES'));
      expect(proyecto(ACTIVO).hora_reunion).toBe('11:00');
      expect(datos().notificaciones.length).toBeGreaterThan(avisosAntes);
      expect(
        datos().historial.some(
          (e) => e.tipo_accion === 'PROYECTO_REUNION_CAMBIADA' && e.id_proyecto === ACTIVO,
        ),
      ).toBe(true);
    });

    it('se quita dejando el día en «Sin definir» y la hora vacía, y también se avisa', async () => {
      const user = userEvent.setup();
      expect(proyecto(ACTIVO).dia_reunion).not.toBeNull();
      const avisosAntes = datos().notificaciones.length;
      await mostrar(ACTIVO);
      const dialogo = await abrir(user);

      poner(dialogo, 'Día de la reunión', '');
      poner(dialogo, 'Hora de la reunión', '');
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      await waitFor(() => expect(proyecto(ACTIVO).dia_reunion).toBeNull());
      expect(proyecto(ACTIVO).hora_reunion).toBeNull();
      expect(datos().notificaciones.length).toBeGreaterThan(avisosAntes);
    });

    it('un día sin hora lo rechaza el servicio y no escribe', async () => {
      const user = userEvent.setup();
      const antes = proyecto(ACTIVO);
      await mostrar(ACTIVO);
      const dialogo = await abrir(user);

      poner(dialogo, 'Hora de la reunión', '');
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      expect(
        await within(dialogo).findByText('Indica también la hora de la reunión, o quita el día.'),
      ).toBeVisible();
      expect(proyecto(ACTIVO)).toBe(antes);
    });
  });

  describe('validaciones', () => {
    it('un nombre vacío se rechaza en el formulario, sin llamar al servicio', async () => {
      const user = userEvent.setup();
      const antes = proyecto(ACTIVO);
      await mostrar(ACTIVO);
      const dialogo = await abrir(user);

      poner(dialogo, 'Nombre', '   ');
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      expect(await within(dialogo).findByText('Escribe el nombre del proyecto.')).toBeVisible();
      expect(proyecto(ACTIVO)).toBe(antes);
    });

    it('un repositorio con «.git» se rechaza con el mensaje del servicio', async () => {
      const user = userEvent.setup();
      const antes = proyecto(ACTIVO);
      await mostrar(ACTIVO);
      const dialogo = await abrir(user);

      poner(dialogo, 'Repositorio', 'https://github.com/codaini/repo.git');
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      expect(
        await within(dialogo).findByText(/sin «\/» final ni «\.git»\./, {
          selector: 'p.text-danger-text',
        }),
      ).toBeVisible();
      expect(proyecto(ACTIVO)).toBe(antes);
    });

    it('una rama base con espacios se rechaza', async () => {
      const user = userEvent.setup();
      await mostrar(ACTIVO);
      const dialogo = await abrir(user);

      poner(dialogo, 'Rama base', 'una rama');
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      expect(
        await within(dialogo).findByText('La rama base no puede llevar espacios.'),
      ).toBeVisible();
    });

    it('un fin anterior al inicio lo rechaza el servicio: mensaje en el campo y no escribe', async () => {
      const user = userEvent.setup();
      const antes = proyecto(ACTIVO);
      await mostrar(ACTIVO);
      const dialogo = await abrir(user);

      poner(dialogo, 'Fecha de fin prevista', '2000-01-01');
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      expect(
        await within(dialogo).findByText('No puede ser anterior a la fecha de inicio.'),
      ).toBeVisible();
      expect(proyecto(ACTIVO)).toBe(antes);
    });
  });

  it('si un paso falla, lo ya guardado no se repite y el mensaje queda en el diálogo', async () => {
    const user = userEvent.setup();
    await mostrar(ACTIVO);
    const dialogo = await abrir(user);
    poner(dialogo, 'Nombre', 'Nombre guardado');
    poner(dialogo, 'Día de la reunión', 'LUNES');
    poner(dialogo, 'Hora de la reunión', '');

    await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

    expect(
      await within(dialogo).findByText('Indica también la hora de la reunión, o quita el día.'),
    ).toBeVisible();
    // Los datos sí se guardaron antes de que fallara la reunión.
    expect(proyecto(ACTIVO).nombre).toBe('Nombre guardado');
    expect(screen.getByRole('dialog', { name: 'Editar proyecto' })).toBeInTheDocument();
  });

  it('cancelar no escribe nada', async () => {
    const user = userEvent.setup();
    const antes = datos();
    await mostrar(ACTIVO);
    const dialogo = await abrir(user);
    poner(dialogo, 'Nombre', 'No se guarda');

    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(datos()).toBe(antes);
  });

  it('un proyecto finalizado también se edita: los datos siguen editables', async () => {
    const user = userEvent.setup();
    await mostrar(FINALIZADO);
    const dialogo = await abrir(user);

    poner(dialogo, 'Descripción', 'Corregida tras finalizar.');
    poner(dialogo, 'Rama base', 'release');
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(proyecto(FINALIZADO).descripcion).toBe('Corregida tras finalizar.');
    expect(proyecto(FINALIZADO).rama_base).toBe('release');
    expect(proyecto(FINALIZADO).estado).toBe('FINALIZADO');
  });

  describe('lo decide puede(): el Supervisor del proyecto', () => {
    it('solo ve la rama base y la reunión, no los datos', async () => {
      const user = userEvent.setup();
      useAlmacenSesion.getState().cerrarSesion();
      iniciarSesion(SUPERVISOR);
      await mostrar(ACTIVO);

      const dialogo = await abrir(user);

      expect(within(dialogo).getByLabelText('Rama base')).toBeVisible();
      expect(within(dialogo).getByLabelText('Día de la reunión')).toBeVisible();
      expect(within(dialogo).queryByLabelText('Nombre')).not.toBeInTheDocument();
      expect(within(dialogo).queryByLabelText('Repositorio')).not.toBeInTheDocument();
      expect(within(dialogo).queryByLabelText('Fecha de inicio')).not.toBeInTheDocument();
    });

    it('guarda la rama base y no envía datos del proyecto', async () => {
      const user = userEvent.setup();
      useAlmacenSesion.getState().cerrarSesion();
      iniciarSesion(SUPERVISOR);
      await mostrar(ACTIVO);
      const dialogo = await abrir(user);

      poner(dialogo, 'Rama base', 'desarrollo');
      await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

      await waitFor(() => expect(proyecto(ACTIVO).rama_base).toBe('desarrollo'));
      expect(
        datos().historial.some(
          (e) => e.tipo_accion === 'PROYECTO_EDITADO' && e.id_proyecto === ACTIVO,
        ),
      ).toBe(false);
    });
  });
});

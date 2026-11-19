import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { EstadoTarea, Id } from '@/domain';
import { crearEntorno, obtenerTableroProyecto } from '@/services';
import { PaginaDetalleProyecto } from './PaginaDetalleProyecto';

const ADMIN = 'demo-admin';
const ACTIVO = 'pry-pl2d';
const FINALIZADO = 'pry-tie';
const EN_PAUSA = 'pry-inv';

const entorno = crearEntorno({ demoraMs: 0 });
const datos = () => useAlmacen.getState().datos;
const tareasDe = (idProyecto: Id) => datos().tareas.filter((t) => t.id_proyecto === idProyecto);

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

function Ubicacion() {
  const l = useLocation();
  return <p data-testid="ubicacion">{`${l.pathname}${l.search}`}</p>;
}

async function mostrar(idProyecto: Id) {
  render(
    <MemoryRouter initialEntries={[`/administrador/proyectos/${idProyecto}?pestana=tablero`]}>
      <Routes>
        <Route
          path="/administrador/proyectos/:idProyecto"
          element={<PaginaDetalleProyecto entorno={entorno} />}
        />
        <Route
          path="/administrador/proyectos/:idProyecto/tareas/:idTarea"
          element={<p>Tarea abierta</p>}
        />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
  await screen.findByRole('region', { name: 'Disponible' });
}

async function consultar(id: Id) {
  const r = await obtenerTableroProyecto({ idActor: ADMIN, idProyecto: id }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

const columna = (nombre: string) => screen.getByRole('region', { name: nombre });

describe('Pestaña «Tablero» del proyecto', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('ofrece la pestaña «Tablero» entre «Resumen» y «Equipo»', async () => {
    await mostrar(ACTIVO);

    const pestanas = screen.getAllByRole('tab').map((t) => t.textContent);
    expect(pestanas).toEqual(['Resumen', 'Tablero', 'Equipo']);
    expect(screen.getByRole('tab', { name: 'Tablero' })).toHaveAttribute('data-state', 'active');
  });

  it('mientras llega la consulta muestra un estado de carga', () => {
    void mostrar(ACTIVO);

    // La cabecera del proyecto carga primero y luego el tablero.
    expect(
      screen.queryByRole('status', { name: 'Cargando el proyecto' }) ??
        screen.queryByRole('status', { name: 'Cargando el tablero' }),
    ).not.toBeNull();
  });

  it('muestra las cuatro columnas con las tareas del proyecto', async () => {
    const tablero = await consultar(ACTIVO);
    await mostrar(ACTIVO);

    for (const t of tablero.disponibles) expect(columna('Disponible')).toHaveTextContent(t.titulo);
    for (const t of tablero.en_progreso) expect(columna('En progreso')).toHaveTextContent(t.titulo);
    for (const t of tablero.esperando_supervision) {
      expect(columna('Esperando supervisión')).toHaveTextContent(t.titulo);
    }
    for (const t of tablero.terminadas) expect(columna('Terminada')).toHaveTextContent(t.titulo);
  });

  it('la columna «Terminada» muestra las 5 más recientes y el total', async () => {
    const tablero = await consultar(ACTIVO);
    await mostrar(ACTIVO);

    expect(tablero.terminadas.length).toBeLessThanOrEqual(5);
    expect(within(columna('Terminada')).getByRole('heading')).toHaveTextContent(
      String(tablero.total_terminadas),
    );
  });

  it('sin tareas las cuatro columnas están vacías y no hay «Ver todas las terminadas»', async () => {
    useAlmacen.getState().transaccion((d) => ({
      tareas: d.tareas.filter((t) => t.id_proyecto !== ACTIVO),
    }));
    await mostrar(ACTIVO);

    expect(
      screen.queryByRole('button', { name: /Ver todas las terminadas/ }),
    ).not.toBeInTheDocument();
    for (const nombre of ['Disponible', 'En progreso', 'Esperando supervisión', 'Terminada']) {
      expect(within(columna(nombre)).queryAllByRole('button')).toHaveLength(0);
    }
  });

  it('no ofrece «Solo mis tareas»: es del Practicante', async () => {
    await mostrar(ACTIVO);

    expect(screen.queryByRole('button', { name: 'Solo mis tareas' })).not.toBeInTheDocument();
  });

  describe('«Ver todas las terminadas»', () => {
    function conMuchasTerminadas() {
      // Pasa a «Terminada» las tareas del proyecto hasta pasar de 5 (la columna solo muestra las 5 más recientes).
      useAlmacen.getState().transaccion((d) => {
        let n = 0;
        return {
          tareas: d.tareas.map((t) =>
            t.id_proyecto === ACTIVO && n++ < 8
              ? {
                  ...t,
                  estado: 'TERMINADA' as EstadoTarea,
                  fecha_termino: '2026-11-10T15:00:00.000Z',
                }
              : t,
          ),
        };
      });
    }

    it('con más de 5 terminadas ofrece el enlace, abre el listado completo y se puede volver', async () => {
      const user = userEvent.setup();
      conMuchasTerminadas();
      const tablero = await consultar(ACTIVO);
      expect(tablero.total_terminadas).toBeGreaterThan(5);
      await mostrar(ACTIVO);

      await user.click(screen.getByRole('button', { name: /Ver todas las terminadas/ }));

      expect(await screen.findByRole('button', { name: /Volver/ })).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Disponible' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Volver/ }));
      expect(await screen.findByRole('region', { name: 'Disponible' })).toBeInTheDocument();
    });
  });

  describe('clic en una tarjeta', () => {
    it('abre el detalle de la tarea dentro del proyecto, sin ejecutar nada', async () => {
      const user = userEvent.setup();
      const tablero = await consultar(ACTIVO);
      const tarea = [...tablero.disponibles, ...tablero.en_progreso][0]!;
      const antes = datos().tareas;
      await mostrar(ACTIVO);

      await user.click(screen.getByRole('button', { name: new RegExp(tarea.titulo) }));

      expect(screen.getByText('Tarea abierta')).toBeInTheDocument();
      expect(screen.getByTestId('ubicacion')).toHaveTextContent(
        `/administrador/proyectos/${ACTIVO}/tareas/${tarea.id}`,
      );
      expect(datos().tareas).toBe(antes);
    });
  });

  describe('estado del proyecto', () => {
    it('un proyecto activo no muestra avisos', async () => {
      await mostrar(ACTIVO);

      expect(screen.queryByRole('note')).not.toBeInTheDocument();
    });

    it('un proyecto en pausa avisa que nadie puede tomar tareas nuevas, pero sigue visible', async () => {
      await mostrar(EN_PAUSA);

      expect(screen.getByRole('note')).toHaveTextContent(
        'Este proyecto está en pausa: nadie puede tomar tareas nuevas.',
      );
      expect(columna('Disponible')).toBeInTheDocument();
    });

    it('un proyecto finalizado avisa que el tablero es de solo lectura', async () => {
      await mostrar(FINALIZADO);

      expect(screen.getByRole('note')).toHaveTextContent(
        'Este proyecto está finalizado: el tablero es de solo lectura.',
      );
    });
  });

  describe('«Nueva tarea»', () => {
    async function abrir(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole('button', { name: 'Nueva tarea' }));
      return await screen.findByRole('dialog', { name: 'Nueva tarea' });
    }

    function llenar(dialogo: HTMLElement, titulo: string, fecha = '2026-12-15') {
      fireEvent.change(within(dialogo).getByLabelText('Título'), { target: { value: titulo } });
      fireEvent.change(within(dialogo).getByLabelText('Descripción'), {
        target: { value: 'Descripción de la tarea nueva' },
      });
      fireEvent.change(within(dialogo).getByLabelText('Fecha límite'), {
        target: { value: fecha },
      });
    }

    it('se ofrece en un proyecto activo y en uno en pausa, pero no en uno finalizado', async () => {
      await mostrar(ACTIVO);
      expect(screen.getByRole('button', { name: 'Nueva tarea' })).toBeVisible();
    });

    it('en pausa también se puede crear una tarea (§5.4: solo se bloquea tomarlas)', async () => {
      await mostrar(EN_PAUSA);

      expect(screen.getByRole('button', { name: 'Nueva tarea' })).toBeVisible();
    });

    it('en un proyecto finalizado no se ofrece', async () => {
      await mostrar(FINALIZADO);

      expect(screen.queryByRole('button', { name: 'Nueva tarea' })).not.toBeInTheDocument();
    });

    it('el proyecto ya viene fijado en el formulario', async () => {
      const user = userEvent.setup();
      await mostrar(ACTIVO);

      const dialogo = await abrir(user);

      expect(within(dialogo).getByLabelText('Proyecto')).toHaveValue(ACTIVO);
      expect(
        within(dialogo)
          .getAllByRole('option')
          .filter((o) => (o as HTMLOptionElement).value),
      ).toHaveLength(1);
    });

    it('crea la tarea en este proyecto, con registro, y aparece en «Disponible»', async () => {
      const user = userEvent.setup();
      const antes = tareasDe(ACTIVO).length;
      await mostrar(ACTIVO);
      const dialogo = await abrir(user);

      llenar(dialogo, 'Tarea creada desde el tablero');
      await user.click(within(dialogo).getByRole('button', { name: 'Crear tarea' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(tareasDe(ACTIVO)).toHaveLength(antes + 1);
      const nueva = tareasDe(ACTIVO).find((t) => t.titulo === 'Tarea creada desde el tablero')!;
      expect(nueva.estado).toBe('DISPONIBLE');
      expect(nueva.id_practicante).toBeNull();
      expect(
        datos().historial.some(
          (e) => e.tipo_accion === 'TAREA_CREADA' && e.elemento.id === nueva.id,
        ),
      ).toBe(true);
      expect(
        await within(columna('Disponible')).findByText('Tarea creada desde el tablero'),
      ).toBeVisible();
    });

    it('los campos vacíos se rechazan en el formulario, sin crear nada', async () => {
      const user = userEvent.setup();
      const antes = datos().tareas;
      await mostrar(ACTIVO);
      const dialogo = await abrir(user);

      await user.click(within(dialogo).getByRole('button', { name: 'Crear tarea' }));

      expect(
        await within(dialogo).findAllByText(/./, { selector: 'p.text-danger-text' }),
      ).not.toHaveLength(0);
      expect(datos().tareas).toBe(antes);
      expect(screen.getByRole('dialog', { name: 'Nueva tarea' })).toBeInTheDocument();
    });

    it('si el servicio la rechaza muestra el mensaje, no cierra y no crea nada', async () => {
      const user = userEvent.setup();
      await mostrar(ACTIVO);
      const dialogo = await abrir(user);
      llenar(dialogo, 'Tarea que no se podrá crear');
      // Mientras el formulario estaba abierto, el proyecto se finalizó.
      useAlmacen.getState().transaccion((d) => ({
        proyectos: d.proyectos.map((p) =>
          p.id === ACTIVO ? { ...p, estado: 'FINALIZADO' as const } : p,
        ),
      }));
      const antes = datos().tareas;

      await user.click(within(dialogo).getByRole('button', { name: 'Crear tarea' }));

      await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'Nueva tarea' })).not.toBeInTheDocument(),
      );
      expect(datos().tareas).toBe(antes);
    });

    it('cancelar no crea nada', async () => {
      const user = userEvent.setup();
      const antes = datos().tareas;
      await mostrar(ACTIVO);
      const dialogo = await abrir(user);
      llenar(dialogo, 'No se creará');

      await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(datos().tareas).toBe(antes);
    });

    it('al volver a abrir el formulario está vacío', async () => {
      const user = userEvent.setup();
      await mostrar(ACTIVO);
      const dialogo = await abrir(user);
      llenar(dialogo, 'Se descarta');
      await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

      const otra = await abrir(user);

      expect(within(otra).getByLabelText('Título')).toHaveValue('');
    });
  });
});

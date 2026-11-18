import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import { formatearIdLegible, type Id, type Tarea } from '@/domain';
import { crearEntorno } from '@/services';
import { PaginaDesarrollo } from './PaginaDesarrollo';

const PL2D = 'pry-pl2d';
const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // pry-pl2d y pry-rsv
const PRACTICANTE = 'demo-practicante'; // solo pry-pl2d
const PRACTICANTE_SIN_PROYECTO = 'usr-pra-21';

/** Sin la demora de red simulada, para no esperar 600 ms en cada consulta. */
const entorno = crearEntorno({ demoraMs: 0 });

const datos = () => useAlmacen.getState().datos;

function iniciarSesion(idUsuario: Id) {
  const usuario = datos().usuarios.find((u) => u.id === idUsuario);
  if (!usuario) throw new Error(`La semilla de prueba debe contener a ${idUsuario}.`);
  useAlmacenSesion.getState().abrirSesion({
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    debe_cambiar_contrasena: usuario.debe_cambiar_contrasena,
  });
}

function idLegible(tarea: Tarea): string {
  const proyecto = datos().proyectos.find((p) => p.id === tarea.id_proyecto);
  if (!proyecto) throw new Error('La tarea debe tener proyecto.');
  const resultado = formatearIdLegible(proyecto.codigo, tarea.numero);
  if (!resultado.ok) throw new Error(resultado.mensaje);
  return resultado.id;
}

function mostrar() {
  render(<PaginaDesarrollo entorno={entorno} />);
}

async function elegirProyecto(user: UserEvent, idProyecto: Id) {
  const selector = await screen.findByLabelText('Proyecto');
  if ((selector as HTMLSelectElement).value !== idProyecto) {
    await user.selectOptions(selector, idProyecto);
  }
}

async function abrirTarea(user: UserEvent, tarea: Tarea) {
  await elegirProyecto(user, tarea.id_proyecto);
  await user.click(await screen.findByRole('button', { name: new RegExp(idLegible(tarea)) }));
}

describe('PaginaDesarrollo', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(PRACTICANTE);
  });

  it('el tablero y el detalle salen de las consultas: ID legible, historial y autor', async () => {
    const user = userEvent.setup();
    const tarea = datos().tareas.find((t) => t.id_proyecto === PL2D && t.estado !== 'TERMINADA');
    if (!tarea) throw new Error('La semilla debe contener tareas PL2D.');
    const creacion = datos().historial.find(
      (e) => e.elemento.id === tarea.id && e.tipo_accion === 'TAREA_CREADA',
    );
    if (!creacion || creacion.autor.tipo !== 'USUARIO')
      throw new Error('Falta el evento de creación.');
    const idAutor = creacion.autor.id_usuario;
    const autor = datos().usuarios.find((u) => u.id === idAutor)?.nombre;
    if (!autor) throw new Error('La semilla debe incluir el autor del evento.');
    const proyecto = datos().proyectos.find((p) => p.id === PL2D);

    mostrar();
    await abrirTarea(user, tarea);

    expect(
      await screen.findByText(`${idLegible(tarea)} · ${proyecto?.nombre}`),
    ).toBeInTheDocument();
    expect(screen.getByText('Historial de la tarea')).toBeInTheDocument();
    expect(screen.getByText('Tarea creada')).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(autor)).length).toBeGreaterThan(0);
  });

  it('un practicante sin proyecto vigente ve un estado vacío y ningún tablero', async () => {
    iniciarSesion(PRACTICANTE_SIN_PROYECTO);

    mostrar();

    expect(await screen.findByText('No tienes proyectos para mostrar')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Disponible' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Proyecto')).not.toBeInTheDocument();
  });

  it('el selector ofrece los proyectos de su rol y cambia el tablero', async () => {
    const user = userEvent.setup();
    iniciarSesion(ADMIN);
    const deOtroProyecto = datos().tareas.find(
      (t) => t.id_proyecto !== PL2D && t.estado === 'DISPONIBLE',
    );
    if (!deOtroProyecto) throw new Error('La semilla debe tener tareas de otros proyectos.');

    mostrar();
    await elegirProyecto(user, PL2D);
    expect(await screen.findByRole('region', { name: 'Disponible' })).toBeInTheDocument();
    expect(screen.queryByText(idLegible(deOtroProyecto))).not.toBeInTheDocument();

    await elegirProyecto(user, deOtroProyecto.id_proyecto);

    expect(await screen.findByText(idLegible(deOtroProyecto))).toBeInTheDocument();
    const opciones = within(screen.getByLabelText('Proyecto')).getAllByRole('option');
    expect(opciones).toHaveLength(datos().proyectos.length);
  });

  it('el practicante solo ve sus proyectos vigentes y tiene «Solo mis tareas»; el administrador no', async () => {
    mostrar();

    const selector = await screen.findByLabelText('Proyecto');
    expect(within(selector).getAllByRole('option')).toHaveLength(1);
    expect(await screen.findByText('Solo mis tareas')).toBeInTheDocument();
  });

  it('el administrador no tiene «Solo mis tareas»', async () => {
    iniciarSesion(ADMIN);

    mostrar();

    await screen.findByRole('region', { name: 'Disponible' });
    expect(screen.queryByText('Solo mis tareas')).not.toBeInTheDocument();
  });

  it('aplica una transición con el servicio y refleja el cambio en el detalle y el historial', async () => {
    const user = userEvent.setup();
    const tarea = datos().tareas.find((t) => t.id_proyecto === PL2D && t.estado === 'DISPONIBLE');
    if (!tarea) throw new Error('La semilla debe contener una tarea PL2D disponible.');

    mostrar();
    await abrirTarea(user, tarea);
    await user.click(await screen.findByRole('button', { name: 'Tomar tarea' }));

    await waitFor(() => {
      expect(datos().tareas.find((t) => t.id === tarea.id)?.estado).toBe('EN_PROGRESO');
    });
    expect(await screen.findByText('Tomada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tomar tarea' })).not.toBeInTheDocument();
  });

  it('carga ramas y crea un nuevo PR con la rama base del proyecto cuando el anterior está cerrado', async () => {
    const user = userEvent.setup();
    const tarea = datos().tareas.find((t) => t.id_proyecto === PL2D && t.estado_pr === 'CERRADO');
    if (!tarea?.id_practicante) throw new Error('La semilla debe tener una tarea con PR cerrado.');
    const proyecto = datos().proyectos.find((p) => p.id === PL2D);
    iniciarSesion(tarea.id_practicante);
    const rama = `feature/${proyecto?.codigo.toLowerCase()}-${String(tarea.numero).padStart(3, '0')}`;

    mostrar();
    await abrirTarea(user, tarea);
    await user.click(await screen.findByRole('button', { name: 'Crear nuevo Pull Request' }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByLabelText('Rama base')).toHaveValue(proyecto?.rama_base);
    await user.click(await screen.findByRole('button', { name: rama }));
    await user.click(screen.getByRole('button', { name: 'Crear PR' }));

    await waitFor(() => {
      expect(datos().tareas.find((t) => t.id === tarea.id)).toMatchObject({
        estado_pr: 'CREADO',
        rama_origen: rama,
      });
    });
  });

  it('cierra un PR desde el detalle y exige un motivo', async () => {
    const user = userEvent.setup();
    const tarea = datos().tareas.find(
      (t) => t.id_proyecto === PL2D && t.estado === 'TERMINADA' && t.estado_pr === 'CREADO',
    );
    if (!tarea) throw new Error('La semilla debe tener una tarea terminada con un PR abierto.');
    iniciarSesion(SUPERVISOR);

    mostrar();
    await abrirTarea(user, tarea);
    await user.click(await screen.findByRole('button', { name: 'Cerrar Pull Request' }));
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByRole('button', { name: 'Cerrar Pull Request' })).toBeDisabled();
    await user.type(within(dialogo).getByLabelText('Motivo'), 'Se abrió desde una rama incorrecta');
    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar Pull Request' }));

    await waitFor(() => {
      expect(datos().tareas.find((t) => t.id === tarea.id)?.estado_pr).toBe('CERRADO');
    });
  });

  describe('«Ver todas las terminadas»', () => {
    function proyectoConMuchasTerminadas() {
      const cuentas = new Map<Id, Tarea[]>();
      for (const t of datos().tareas.filter((x) => x.estado === 'TERMINADA')) {
        cuentas.set(t.id_proyecto, [...(cuentas.get(t.id_proyecto) ?? []), t]);
      }
      const encontrado = [...cuentas.entries()].find(([, tareas]) => tareas.length > 5);
      if (!encontrado)
        throw new Error('La semilla debe tener un proyecto con más de 5 terminadas.');
      return { idProyecto: encontrado[0], terminadas: encontrado[1] };
    }

    it('el tablero muestra 5 y el total; el enlace abre el listado completo con búsqueda', async () => {
      const user = userEvent.setup();
      iniciarSesion(ADMIN);
      const { idProyecto, terminadas } = proyectoConMuchasTerminadas();

      mostrar();
      await elegirProyecto(user, idProyecto);
      const columna = await screen.findByRole('region', { name: 'Terminada' });
      await waitFor(() => {
        expect(within(columna).getByRole('heading')).toHaveTextContent(String(terminadas.length));
      });
      expect(within(columna).getAllByRole('button', { name: /^[A-Z0-9]+-\d+/ })).toHaveLength(5);

      await user.click(within(columna).getByText('Ver todas las terminadas'));

      expect(
        await screen.findByText(`Tareas terminadas (${terminadas.length})`),
      ).toBeInTheDocument();
      const ultima = terminadas[0];
      await user.type(screen.getByRole('searchbox'), idLegible(ultima));
      const filas = screen.getAllByRole('button', { name: new RegExp(idLegible(ultima)) });
      expect(filas).toHaveLength(1);

      await user.click(filas[0]);
      expect(await screen.findByText('Historial de la tarea')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Volver al listado' }));
      expect(
        await screen.findByText(`Tareas terminadas (${terminadas.length})`),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Volver al tablero' }));
      expect(await screen.findByRole('region', { name: 'Terminada' })).toBeInTheDocument();
    });

    it('un proyecto con 5 o menos terminadas no ofrece el enlace', async () => {
      const user = userEvent.setup();
      iniciarSesion(ADMIN);
      const { idProyecto } = proyectoConMuchasTerminadas();
      const pocas = datos().proyectos.find((p) => {
        if (p.id === idProyecto) return false;
        return (
          datos().tareas.filter((t) => t.id_proyecto === p.id && t.estado === 'TERMINADA').length <=
          5
        );
      });
      if (!pocas) throw new Error('La semilla debe tener un proyecto con pocas terminadas.');

      mostrar();
      await elegirProyecto(user, pocas.id);
      await screen.findByRole('region', { name: 'Terminada' });

      expect(screen.queryByText('Ver todas las terminadas')).not.toBeInTheDocument();
    });
  });

  describe('editar una tarea', () => {
    it('el supervisor edita el título desde el detalle y lo ve reflejado', async () => {
      const user = userEvent.setup();
      iniciarSesion(SUPERVISOR);
      const tarea = datos().tareas.find((t) => t.id_proyecto === PL2D && t.estado === 'DISPONIBLE');
      if (!tarea) throw new Error('La semilla debe tener una tarea PL2D disponible.');

      mostrar();
      await abrirTarea(user, tarea);
      await user.click(await screen.findByRole('button', { name: 'Editar' }));
      const titulo = await screen.findByLabelText('Título');
      await user.clear(titulo);
      await user.type(titulo, 'Título corregido desde la prueba');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() => {
        expect(datos().tareas.find((t) => t.id === tarea.id)?.titulo).toBe(
          'Título corregido desde la prueba',
        );
      });
      expect(
        await screen.findByRole('heading', { name: 'Título corregido desde la prueba' }),
      ).toBeInTheDocument();
    });

    it('un practicante no ve «Editar» en una tarea disponible', async () => {
      const user = userEvent.setup();
      const tarea = datos().tareas.find((t) => t.id_proyecto === PL2D && t.estado === 'DISPONIBLE');
      if (!tarea) throw new Error('La semilla debe tener una tarea PL2D disponible.');

      mostrar();
      await abrirTarea(user, tarea);
      await screen.findByRole('button', { name: 'Tomar tarea' });

      expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    });
  });

  describe('responsable que requiere atención (D6-A)', () => {
    function tareaConResponsableInactivo() {
      const tarea = datos().tareas.find(
        (t) =>
          t.id_proyecto === PL2D &&
          t.estado === 'EN_PROGRESO' &&
          t.id_practicante !== null &&
          t.id_practicante !== PRACTICANTE,
      );
      if (!tarea?.id_practicante) throw new Error('La semilla debe tener una tarea en progreso.');
      const idResponsable = tarea.id_practicante;
      useAlmacen.getState().transaccion((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === idResponsable ? { ...u, estado: 'INACTIVO' as const } : u,
        ),
      }));
      return tarea;
    }

    it('el administrador y el supervisor ven el aviso para liberar la tarea', async () => {
      const user = userEvent.setup();
      const tarea = tareaConResponsableInactivo();

      for (const idUsuario of [ADMIN, SUPERVISOR]) {
        useAlmacenSesion.getState().cerrarSesion();
        iniciarSesion(idUsuario);
        const { unmount } = render(<PaginaDesarrollo entorno={entorno} />);
        await abrirTarea(user, tarea);

        const aviso = await screen.findByRole('status');
        expect(aviso).toHaveTextContent('Revisar el responsable de la tarea');
        expect(aviso).toHaveTextContent('La cuenta del responsable está inactiva.');
        unmount();
      }
    });

    it('el practicante no se entera del estado de la cuenta de un compañero', async () => {
      const user = userEvent.setup();
      const tarea = tareaConResponsableInactivo();

      mostrar();
      await abrirTarea(user, tarea);
      await screen.findByText('Historial de la tarea');

      expect(screen.queryByText('Revisar el responsable de la tarea')).not.toBeInTheDocument();
    });
  });

  it('una tarea que ya no existe muestra el error del servicio y permite volver', async () => {
    const user = userEvent.setup();
    const tarea = datos().tareas.find((t) => t.id_proyecto === PL2D && t.estado === 'DISPONIBLE');
    if (!tarea) throw new Error('La semilla debe tener una tarea PL2D disponible.');
    iniciarSesion(SUPERVISOR);

    mostrar();
    await abrirTarea(user, tarea);
    await screen.findByText('Historial de la tarea');
    useAlmacen
      .getState()
      .transaccion((d) => ({ tareas: d.tareas.filter((t) => t.id !== tarea.id) }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Volver al tablero' }));
    expect(await screen.findByRole('region', { name: 'Disponible' })).toBeInTheDocument();
  });
});

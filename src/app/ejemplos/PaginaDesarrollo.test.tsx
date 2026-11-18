import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import { formatearIdLegible } from '@/domain';
import { PaginaDesarrollo } from './PaginaDesarrollo';

const ID_PROYECTO_DEMO = 'pry-pl2d';

describe('PaginaDesarrollo', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    const usuario = useAlmacen
      .getState()
      .datos.usuarios.find((item) => item.rol === 'PRACTICANTE' && item.estado === 'ACTIVO');
    if (!usuario) throw new Error('La semilla de prueba debe contener un practicante activo.');

    useAlmacenSesion.getState().abrirSesion({
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      debe_cambiar_contrasena: usuario.debe_cambiar_contrasena,
    });
  });

  it('lee tareas e historial del almacén y conserva el ID interno al abrir el detalle', async () => {
    const user = userEvent.setup();
    const datos = useAlmacen.getState().datos;
    const proyecto = datos.proyectos.find((item) => item.id === ID_PROYECTO_DEMO);
    if (!proyecto) throw new Error('La semilla de prueba debe contener el proyecto PL2D.');
    const primeraTarea = datos.tareas.find(
      (item) => item.id_proyecto === proyecto.id && item.estado !== 'TERMINADA',
    );
    if (!primeraTarea) throw new Error('La semilla de prueba debe contener tareas PL2D.');
    const eventoCreacion = datos.historial.find(
      (item) =>
        item.elemento.tipo === 'TAREA' &&
        item.elemento.id === primeraTarea.id &&
        item.tipo_accion === 'TAREA_CREADA',
    );
    if (!eventoCreacion) throw new Error('La semilla debe registrar la creación de la tarea.');
    const idLegible = formatearIdLegible(proyecto.codigo, primeraTarea.numero);
    if (!idLegible.ok) throw new Error(idLegible.mensaje);
    const autorId =
      eventoCreacion.autor.tipo === 'USUARIO' ? eventoCreacion.autor.id_usuario : null;
    const autor =
      autorId === null ? 'Sistema' : datos.usuarios.find((item) => item.id === autorId)?.nombre;
    if (!autor) throw new Error('La semilla debe incluir el autor del evento.');

    render(<PaginaDesarrollo />);

    expect(screen.getByText(idLegible.id)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: new RegExp(idLegible.id) }));

    expect(screen.getByText(`${idLegible.id} · ${proyecto.nombre}`)).toBeInTheDocument();
    expect(screen.getByText('Historial de la tarea')).toBeInTheDocument();
    expect(screen.getByText('Tarea creada')).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(autor)).length).toBeGreaterThan(0);
  });

  it('impide ver el tablero a un practicante sin asignación vigente en el proyecto', () => {
    const datos = useAlmacen.getState().datos;
    const practicante = datos.usuarios.find(
      (item) =>
        item.rol === 'PRACTICANTE' &&
        item.estado === 'ACTIVO' &&
        !datos.asignaciones.some(
          (asignacion) =>
            asignacion.id_practicante === item.id &&
            asignacion.id_proyecto === ID_PROYECTO_DEMO &&
            asignacion.fecha_baja === null,
        ),
    );
    if (!practicante) {
      throw new Error('La semilla debe contener un practicante sin asignación vigente en PL2D.');
    }

    useAlmacenSesion.getState().abrirSesion({
      id: practicante.id,
      nombre: practicante.nombre,
      correo: practicante.correo,
      rol: practicante.rol,
      debe_cambiar_contrasena: practicante.debe_cambiar_contrasena,
    });

    render(<PaginaDesarrollo />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No tienes acceso al proyecto de demostración PL2D.',
    );
    expect(screen.queryByRole('region', { name: 'Disponible' })).not.toBeInTheDocument();
  });

  it('aplica una transición con el servicio y refleja el cambio en tablero e historial', async () => {
    const user = userEvent.setup();
    const datos = useAlmacen.getState().datos;
    const proyecto = datos.proyectos.find((item) => item.id === ID_PROYECTO_DEMO);
    if (!proyecto) throw new Error('La semilla de prueba debe contener el proyecto PL2D.');
    const practicante = datos.usuarios.find((item) => item.id === 'demo-practicante');
    if (!practicante) throw new Error('La semilla debe contener al practicante de acceso rápido.');
    const tarea = datos.tareas.find(
      (item) => item.id_proyecto === proyecto.id && item.estado === 'DISPONIBLE',
    );
    if (!tarea) throw new Error('La semilla debe contener una tarea PL2D disponible.');
    useAlmacenSesion.getState().abrirSesion({
      id: practicante.id,
      nombre: practicante.nombre,
      correo: practicante.correo,
      rol: practicante.rol,
      debe_cambiar_contrasena: practicante.debe_cambiar_contrasena,
    });
    const idLegible = formatearIdLegible(proyecto.codigo, tarea.numero);
    if (!idLegible.ok) throw new Error(idLegible.mensaje);

    render(<PaginaDesarrollo />);
    await user.click(await screen.findByRole('button', { name: new RegExp(idLegible.id) }));
    await user.click(screen.getByRole('button', { name: 'Tomar tarea' }));

    await waitFor(
      () => {
        expect(
          useAlmacen.getState().datos.tareas.find((item) => item.id === tarea.id)?.estado,
        ).toBe('EN_PROGRESO');
      },
      { timeout: 2_000 },
    );
    expect(screen.getByText('Tomada')).toBeInTheDocument();
  });

  it('carga ramas y crea un nuevo PR para una tarea cuyo PR anterior está cerrado', async () => {
    const user = userEvent.setup();
    const datos = useAlmacen.getState().datos;
    const proyecto = datos.proyectos.find((item) => item.id === ID_PROYECTO_DEMO);
    if (!proyecto) throw new Error('La semilla de prueba debe contener el proyecto PL2D.');
    const tarea = datos.tareas.find(
      (item) => item.id_proyecto === proyecto.id && item.estado_pr === 'CERRADO',
    );
    if (!tarea) throw new Error('La semilla debe contener una tarea PL2D con un PR cerrado.');
    const practicante = datos.usuarios.find((item) => item.id === tarea.id_practicante);
    if (!practicante) throw new Error('La tarea debe tener un practicante responsable.');
    useAlmacenSesion.getState().abrirSesion({
      id: practicante.id,
      nombre: practicante.nombre,
      correo: practicante.correo,
      rol: practicante.rol,
      debe_cambiar_contrasena: practicante.debe_cambiar_contrasena,
    });
    const idLegible = formatearIdLegible(proyecto.codigo, tarea.numero);
    if (!idLegible.ok) throw new Error(idLegible.mensaje);
    const rama = `feature/${proyecto.codigo.toLowerCase()}-${String(tarea.numero).padStart(3, '0')}`;

    render(<PaginaDesarrollo />);
    await user.click(await screen.findByRole('button', { name: new RegExp(idLegible.id) }));
    await user.click(screen.getByRole('button', { name: 'Crear nuevo Pull Request' }));
    await user.click(await screen.findByRole('button', { name: rama }));
    await user.click(screen.getByRole('button', { name: 'Crear PR' }));

    await waitFor(() => {
      expect(useAlmacen.getState().datos.tareas.find((item) => item.id === tarea.id)).toMatchObject(
        { estado_pr: 'CREADO', rama_origen: rama },
      );
    });
  });

  it('cierra un PR desde el detalle y exige un motivo', async () => {
    const user = userEvent.setup();
    const datos = useAlmacen.getState().datos;
    const proyecto = datos.proyectos.find((item) => item.id === ID_PROYECTO_DEMO);
    if (!proyecto) throw new Error('La semilla de prueba debe contener el proyecto PL2D.');
    const tarea = datos.tareas.find(
      (item) =>
        item.id_proyecto === proyecto.id &&
        item.estado === 'TERMINADA' &&
        item.estado_pr === 'CREADO',
    );
    if (!tarea) throw new Error('La semilla debe contener una tarea terminada con un PR abierto.');
    const supervisor = datos.usuarios.find((item) => item.id === proyecto.id_supervisor);
    if (!supervisor) throw new Error('El proyecto debe tener un supervisor en la semilla.');
    useAlmacenSesion.getState().abrirSesion({
      id: supervisor.id,
      nombre: supervisor.nombre,
      correo: supervisor.correo,
      rol: supervisor.rol,
      debe_cambiar_contrasena: supervisor.debe_cambiar_contrasena,
    });
    const idLegible = formatearIdLegible(proyecto.codigo, tarea.numero);
    if (!idLegible.ok) throw new Error(idLegible.mensaje);

    render(<PaginaDesarrollo />);
    await user.click(await screen.findByRole('button', { name: new RegExp(idLegible.id) }));
    await user.click(screen.getByRole('button', { name: 'Cerrar Pull Request' }));
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByLabelText('Motivo')).toBeInTheDocument();
    await user.type(within(dialogo).getByLabelText('Motivo'), 'Se abrió desde una rama incorrecta');
    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar Pull Request' }));

    await waitFor(() => {
      expect(
        useAlmacen.getState().datos.tareas.find((item) => item.id === tarea.id)?.estado_pr,
      ).toBe('CERRADO');
    });
  });
});

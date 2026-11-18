import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});

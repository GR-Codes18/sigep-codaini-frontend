import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, obtenerEquipoProyecto, obtenerProyecto } from '@/services';
import { PaginaDetalleProyecto } from './PaginaDetalleProyecto';

const ADMIN = 'demo-admin';
const ACTIVO = 'pry-pl2d';
const FINALIZADO = 'pry-tie';
const EN_PAUSA = 'pry-inv';

const entorno = crearEntorno({ demoraMs: 0 });
const datos = () => useAlmacen.getState().datos;

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

async function mostrar(idProyecto: Id, busqueda = '') {
  render(
    <MemoryRouter initialEntries={[`/administrador/proyectos/${idProyecto}${busqueda}`]}>
      <Routes>
        <Route
          path="/administrador/proyectos/:idProyecto"
          element={<PaginaDetalleProyecto entorno={entorno} />}
        />
        <Route path="/administrador/proyectos" element={<p>Listado abierto</p>} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando el proyecto' })).toBeNull(),
  );
}

async function resumen(id: Id) {
  const r = await obtenerProyecto({ idActor: ADMIN, idProyecto: id }, entorno);
  if (!r.ok || r.valor.vista !== 'GESTION') throw new Error('Se esperaba la vista de gestión.');
  return r.valor;
}

async function equipo(id: Id) {
  const r = await obtenerEquipoProyecto({ idActor: ADMIN, idProyecto: id }, entorno);
  if (!r.ok || r.valor.vista !== 'GESTION') throw new Error('Se esperaba la vista de gestión.');
  return r.valor;
}

describe('PaginaDetalleProyecto', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('mientras llega la consulta muestra un estado de carga', () => {
    void mostrar(ACTIVO);

    expect(screen.getByRole('status', { name: 'Cargando el proyecto' })).toBeInTheDocument();
  });

  describe('cabecera y pestañas', () => {
    it('muestra el nombre, el código y el estado', async () => {
      const origen = await resumen(ACTIVO);
      await mostrar(ACTIVO);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(origen.proyecto.nombre);
      const cabecera = screen.getByRole('heading', { level: 1 }).closest('header')!;
      expect(within(cabecera).getByText(origen.proyecto.codigo)).toBeVisible();
      expect(within(cabecera).getByText('Activo')).toBeVisible();
    });

    it('abre en «Resumen» y ofrece «Resumen» y «Equipo»', async () => {
      await mostrar(ACTIVO);

      expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('data-state', 'active');
      expect(screen.getByRole('tab', { name: 'Equipo' })).toBeVisible();
    });

    it('la pestaña va en `?pestana=`: cambiarla actualiza la dirección', async () => {
      const user = userEvent.setup();
      await mostrar(ACTIVO);

      await user.click(screen.getByRole('tab', { name: 'Equipo' }));

      expect(screen.getByTestId('ubicacion')).toHaveTextContent(
        `/administrador/proyectos/${ACTIVO}?pestana=equipo`,
      );
      await user.click(screen.getByRole('tab', { name: 'Resumen' }));
      expect(screen.getByTestId('ubicacion').textContent).toBe(
        `/administrador/proyectos/${ACTIVO}`,
      );
    });

    it('un enlace con `?pestana=equipo` abre directamente el equipo', async () => {
      await mostrar(ACTIVO, '?pestana=equipo');

      expect(screen.getByRole('tab', { name: 'Equipo' })).toHaveAttribute('data-state', 'active');
      expect(
        await screen.findByRole('region', { name: 'Practicantes activos' }),
      ).toBeInTheDocument();
    });

    it('una pestaña desconocida abre «Resumen»', async () => {
      await mostrar(ACTIVO, '?pestana=inventada');

      expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('data-state', 'active');
      expect(screen.getByRole('region', { name: 'Datos del proyecto' })).toBeInTheDocument();
    });
  });

  describe('Resumen', () => {
    it('muestra los datos del proyecto: supervisor, fechas, repositorio, rama base y descripción', async () => {
      const origen = await resumen(ACTIVO);
      await mostrar(ACTIVO);

      const datosDelProyecto = screen.getByRole('region', { name: 'Datos del proyecto' });
      expect(datosDelProyecto).toHaveTextContent(origen.proyecto.supervisor.nombre);
      expect(datosDelProyecto).toHaveTextContent(origen.proyecto.repositorio_url);
      expect(datosDelProyecto).toHaveTextContent(origen.proyecto.rama_base);
      expect(datosDelProyecto).toHaveTextContent(origen.proyecto.descripcion);
      expect(datosDelProyecto).toHaveTextContent('Fecha de inicio');
      expect(datosDelProyecto).toHaveTextContent('Fecha de fin prevista');
      expect(datosDelProyecto).not.toHaveTextContent('Fecha de finalización');
    });

    it('el repositorio es un enlace que abre en otra pestaña', async () => {
      const origen = await resumen(ACTIVO);
      await mostrar(ACTIVO);

      const enlace = within(screen.getByRole('region', { name: 'Datos del proyecto' })).getByRole(
        'link',
        { name: origen.proyecto.repositorio_url },
      );
      expect(enlace).toHaveAttribute('href', origen.proyecto.repositorio_url);
      expect(enlace).toHaveAttribute('target', '_blank');
      expect(enlace).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
    });

    it('un proyecto sin reunión dice «Sin definir»', async () => {
      useAlmacen.getState().transaccion((d) => ({
        proyectos: d.proyectos.map((p) =>
          p.id === ACTIVO ? { ...p, dia_reunion: null, hora_reunion: null } : p,
        ),
      }));
      await mostrar(ACTIVO);

      expect(screen.getByRole('region', { name: 'Datos del proyecto' })).toHaveTextContent(
        /Reunión semanal\s*Sin definir/,
      );
    });

    it('un proyecto finalizado muestra su fecha de finalización', async () => {
      const origen = await resumen(FINALIZADO);
      expect(origen.proyecto.fecha_fin_real).not.toBeNull();
      await mostrar(FINALIZADO);

      expect(screen.getByRole('region', { name: 'Datos del proyecto' })).toHaveTextContent(
        'Fecha de finalización',
      );
      const cabecera = screen.getByRole('heading', { level: 1 }).closest('header')!;
      expect(within(cabecera).getByText('Finalizado')).toBeVisible();
    });

    it('un proyecto en pausa se ve «En pausa»', async () => {
      await mostrar(EN_PAUSA);

      const cabecera = screen.getByRole('heading', { level: 1 }).closest('header')!;
      expect(within(cabecera).getByText('En pausa')).toBeVisible();
    });

    it('muestra el avance, las tareas por estado y las vencidas con los números de la consulta', async () => {
      const origen = await resumen(ACTIVO);
      await mostrar(ACTIVO);

      const avance = screen.getByRole('region', { name: 'Avance' });
      if (origen.avance !== null) {
        expect(avance).toHaveTextContent(
          `${origen.avance.numerador} de ${origen.avance.denominador} · ${origen.avance.porcentaje} %`,
        );
      }
      const porEstado = within(avance).getByRole('list', { name: 'Tareas por estado' });
      expect(within(porEstado).getAllByRole('listitem')).toHaveLength(4);
      expect(avance).toHaveTextContent(`Tareas vencidas: ${origen.tareas_vencidas}`);
    });

    it('sin tareas dice «Aún no hay tareas.»', async () => {
      useAlmacen.getState().transaccion((d) => ({
        tareas: d.tareas.filter((t) => t.id_proyecto !== ACTIVO),
      }));
      await mostrar(ACTIVO);

      expect(screen.getByRole('region', { name: 'Avance' })).toHaveTextContent(
        'Aún no hay tareas.',
      );
    });

    it('lista los enlaces útiles, o dice que no hay', async () => {
      const origen = await resumen(ACTIVO);
      await mostrar(ACTIVO);

      const region = screen.getByRole('region', { name: 'Enlaces útiles' });
      for (const e of origen.enlaces) expect(region).toHaveTextContent(e.nombre);
      if (origen.enlaces.length === 0)
        expect(region).toHaveTextContent('Aún no hay enlaces útiles.');
    });

    it('un proyecto sin enlaces dice «Aún no hay enlaces útiles.»', async () => {
      useAlmacen.getState().transaccion((d) => ({
        enlaces_proyecto: d.enlaces_proyecto.filter((e) => e.id_proyecto !== ACTIVO),
      }));
      await mostrar(ACTIVO);

      expect(screen.getByText('Aún no hay enlaces útiles.')).toBeInTheDocument();
    });

    it('muestra la actividad reciente', async () => {
      await mostrar(ACTIVO);

      expect(screen.getByRole('region', { name: 'Actividad reciente' })).toBeInTheDocument();
    });

    it('la cabecera ofrece «Editar proyecto» y nada más: el ciclo de vida llega con el bloque 4', async () => {
      await mostrar(ACTIVO);

      const cabecera = screen.getByRole('heading', { level: 1 }).closest('header')!;
      expect(
        within(cabecera)
          .getAllByRole('button')
          .map((b) => b.textContent),
      ).toEqual(['Editar proyecto']);
    });
  });

  describe('Equipo', () => {
    it('lista los practicantes activos con su carga y los anteriores con alta y baja', async () => {
      const origen = await equipo(ACTIVO);
      expect(origen.activos.length).toBeGreaterThan(0);
      await mostrar(ACTIVO, '?pestana=equipo');

      const activos = await screen.findByRole('region', { name: 'Practicantes activos' });
      for (const m of origen.activos) {
        expect(activos).toHaveTextContent(m.nombre);
        expect(activos).toHaveTextContent(m.correo);
      }
      expect(activos).toHaveTextContent(/\d+ tareas? en progreso/);
      const anteriores = screen.getByRole('region', { name: 'Practicantes anteriores' });
      for (const m of origen.anteriores) expect(anteriores).toHaveTextContent(m.nombre);
    });

    it('un proyecto sin equipo muestra los estados vacíos', async () => {
      useAlmacen.getState().transaccion((d) => ({
        asignaciones: d.asignaciones.filter((a) => a.id_proyecto !== ACTIVO),
      }));
      await mostrar(ACTIVO, '?pestana=equipo');

      expect(
        await screen.findByText('Este proyecto aún no tiene practicantes.'),
      ).toBeInTheDocument();
      expect(screen.getByText('Aún no hay practicantes anteriores.')).toBeInTheDocument();
    });

    it('no pide el equipo mientras se está en «Resumen»', async () => {
      await mostrar(ACTIVO);

      expect(
        screen.queryByRole('region', { name: 'Practicantes activos' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('status', { name: 'Cargando el equipo' })).not.toBeInTheDocument();
    });
  });

  describe('errores', () => {
    it('un proyecto que no existe dice que no se encontró y vuelve al listado', async () => {
      const user = userEvent.setup();
      await mostrar('no-existe');

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      await user.click(screen.getByRole('link', { name: 'Volver a proyectos' }));
      expect(screen.getByText('Listado abierto')).toBeInTheDocument();
    });

    it('un Practicante recibe la vista del Practicante y no la de gestión', async () => {
      useAlmacenSesion.getState().cerrarSesion();
      iniciarSesion('demo-practicante');
      render(
        <MemoryRouter initialEntries={[`/administrador/proyectos/${ACTIVO}`]}>
          <Routes>
            <Route
              path="/administrador/proyectos/:idProyecto"
              element={<PaginaDetalleProyecto entorno={entorno} />}
            />
          </Routes>
        </MemoryRouter>,
      );

      await new Promise((r) => setTimeout(r, 50));
      expect(screen.queryByRole('region', { name: 'Datos del proyecto' })).not.toBeInTheDocument();
    });
  });
});

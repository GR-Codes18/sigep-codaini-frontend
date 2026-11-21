import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import {
  crearEntorno,
  obtenerEquipoProyecto,
  obtenerProyecto,
  obtenerTableroProyecto,
} from '@/services';
import { TableroDelProyecto } from '@/paneles/administrador/proyectos/TableroDelProyecto';
import { PaginaDetalleProyectoPracticante } from './PaginaDetalleProyectoPracticante';
import { PaginaProyectoAnterior } from './PaginaProyectoAnterior';

const PRACTICANTE = 'demo-practicante'; // en pry-pl2d
const CON_ANTERIOR = 'usr-pra-03'; // vigente en pry-pl2d; salió de pry-tie
const VIGENTE = 'pry-pl2d';
const AJENO = 'pry-rsv'; // demo-practicante no está en este proyecto
const ANTERIOR = 'pry-tie';

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

async function mostrar(ruta: string, idUsuario: Id = PRACTICANTE) {
  iniciarSesion(idUsuario);
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route
          path="/practicante/proyectos/:idProyecto"
          element={<PaginaDetalleProyectoPracticante entorno={entorno} />}
        />
        <Route
          path="/practicante/proyectos/:idProyecto/anterior"
          element={<PaginaProyectoAnterior entorno={entorno} />}
        />
        <Route path="/practicante/proyectos/tareas/:idTarea" element={<p>Tarea abierta</p>} />
        <Route path="/practicante/proyectos" element={<p>Listado abierto</p>} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
}

const pestana = (nombre: string) => screen.getByRole('tab', { name: nombre });
const nombreDe = (id: Id) => datos().proyectos.find((p) => p.id === id)!.nombre;

describe('Detalle de mi proyecto (Practicante, §9.2.1)', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  describe('estructura', () => {
    it('tiene tres pestañas, Resumen, Tablero y Equipo, y abre en «Resumen»', async () => {
      await mostrar(`/practicante/proyectos/${VIGENTE}`);

      expect(await screen.findByRole('heading', { name: nombreDe(VIGENTE) })).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(3);
      expect(pestana('Resumen')).toHaveAttribute('data-state', 'active');
      expect(pestana('Tablero')).toBeInTheDocument();
      expect(pestana('Equipo')).toBeInTheDocument();
    });

    it('una pestaña desconocida en la dirección se ignora y abre «Resumen»', async () => {
      await mostrar(`/practicante/proyectos/${VIGENTE}?pestana=no-existe`);

      await screen.findByRole('heading', { name: nombreDe(VIGENTE) });
      expect(pestana('Resumen')).toHaveAttribute('data-state', 'active');
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('«?pestana=equipo» abre en «Equipo»', async () => {
      await mostrar(`/practicante/proyectos/${VIGENTE}?pestana=equipo`);

      await screen.findByRole('heading', { name: nombreDe(VIGENTE) });
      expect(pestana('Equipo')).toHaveAttribute('data-state', 'active');
    });
  });

  describe('Resumen (solo lectura)', () => {
    it('muestra descripción, fechas, supervisor, reunión, repositorio, rama base, avance y enlaces', async () => {
      const r = await obtenerProyecto({ idActor: PRACTICANTE, idProyecto: VIGENTE }, entorno);
      if (!r.ok || r.valor.vista !== 'PRACTICANTE') throw new Error('sin datos');
      await mostrar(`/practicante/proyectos/${VIGENTE}`);

      // El encabezado del proyecto: avance bien visible y los datos secundarios en filas.
      const encabezado = await screen.findByRole('region', { name: 'Encabezado del proyecto' });
      await waitFor(() => expect(encabezado).toHaveTextContent(r.valor.proyecto.supervisor.nombre));
      expect(encabezado).toHaveTextContent(r.valor.proyecto.rama_base);
      expect(
        within(encabezado).getByRole('link', { name: r.valor.proyecto.repositorio_url }),
      ).toHaveAttribute('href', r.valor.proyecto.repositorio_url);
      expect(encabezado).toHaveTextContent('Reunión semanal');
      expect(screen.getByRole('progressbar', { name: 'Avance del proyecto' })).toBeInTheDocument();
      // Una tarjeta con título por tema en el Resumen.
      expect(await screen.findByRole('region', { name: 'Descripción' })).toHaveTextContent(
        r.valor.proyecto.descripcion,
      );
      const fechas = screen.getByRole('region', { name: 'Fechas y datos del proyecto' });
      expect(fechas).toHaveTextContent('Fecha de inicio');
      expect(fechas).toHaveTextContent('Fecha de fin prevista');
      expect(fechas).toHaveTextContent('Reunión semanal');
      const enlaces = screen.getByRole('region', { name: 'Enlaces y repositorio' });
      expect(
        within(enlaces).getByRole('link', { name: r.valor.proyecto.repositorio_url }),
      ).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Avance' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Mis tareas' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Mi actividad' })).toBeInTheDocument();
    });

    it('no ofrece ningún botón de edición ni de gestión', async () => {
      await mostrar(`/practicante/proyectos/${VIGENTE}`);
      await screen.findByRole('region', { name: 'Descripción' });

      expect(
        screen.queryByRole('button', {
          name: /editar|agregar|quitar|asignar|pausar|finalizar|reactivar|nueva|cambiar/i,
        }),
      ).toBeNull();
    });

    it('«Mis tareas» son las suyas abiertas, y una vencida se pinta en rojo', async () => {
      const r = await obtenerProyecto({ idActor: PRACTICANTE, idProyecto: VIGENTE }, entorno);
      if (!r.ok || r.valor.vista !== 'PRACTICANTE') throw new Error('sin datos');
      const mia = r.valor.mis_tareas[0]!;
      // Se fuerza una tarea vencida: la fecha límite ya pasó.
      useAlmacen.getState().transaccion((d) => ({
        tareas: d.tareas.map((t) => (t.id === mia.id ? { ...t, fecha_limite: '2026-01-01' } : t)),
      }));
      await mostrar(`/practicante/proyectos/${VIGENTE}`);

      const region = await screen.findByRole('region', { name: 'Mis tareas' });
      const fila = within(region)
        .getAllByRole('listitem')
        .find((f) => f.textContent?.includes(mia.titulo))!;
      expect(fila).toHaveTextContent('vencida');
      expect(within(fila).getByText(/Límite:/).className).toContain('text-danger-text');
    });

    it('«Mi actividad» es solo la suya, no la del resto del equipo', async () => {
      const r = await obtenerProyecto({ idActor: PRACTICANTE, idProyecto: VIGENTE }, entorno);
      if (!r.ok || r.valor.vista !== 'PRACTICANTE') throw new Error('sin datos');
      await mostrar(`/practicante/proyectos/${VIGENTE}`);

      const region = await screen.findByRole('region', { name: 'Mi actividad' });
      if (r.valor.mi_actividad.length === 0) {
        expect(region).toHaveTextContent('Aún no tienes actividad en este proyecto.');
      } else {
        expect(within(region).getAllByRole('listitem')).toHaveLength(r.valor.mi_actividad.length);
      }
      // La actividad del proyecto es mayor que la mía: el resto no se muestra.
      const delProyecto = datos().historial.filter((e) => e.id_proyecto === VIGENTE).length;
      expect(r.valor.mi_actividad.length).toBeLessThan(delProyecto);
    });
  });

  describe('Tablero', () => {
    it('ofrece «Solo mis tareas» y no «Nueva tarea»', async () => {
      const usuario = userEvent.setup();
      await mostrar(`/practicante/proyectos/${VIGENTE}`);
      await usuario.click(await screen.findByRole('tab', { name: 'Tablero' }));

      const filtro = await screen.findByRole('button', { name: 'Solo mis tareas' });
      expect(filtro).toHaveAttribute('aria-pressed', 'false');
      expect(screen.queryByRole('button', { name: 'Nueva tarea' })).toBeNull();

      await usuario.click(filtro);
      expect(filtro).toHaveAttribute('aria-pressed', 'true');
    });

    it('un clic en una tarea abre su detalle en la ruta del Practicante, la misma de los avisos', async () => {
      const usuario = userEvent.setup();
      const t = await obtenerTableroProyecto(
        { idActor: PRACTICANTE, idProyecto: VIGENTE },
        entorno,
      );
      if (!t.ok) throw new Error(t.mensaje);
      const tarea = [...t.valor.disponibles, ...t.valor.en_progreso][0]!;
      await mostrar(`/practicante/proyectos/${VIGENTE}?pestana=tablero`);

      await usuario.click(await screen.findByRole('button', { name: new RegExp(tarea.titulo) }));

      expect(await screen.findByText('Tarea abierta')).toBeInTheDocument();
      expect(screen.getByTestId('ubicacion')).toHaveTextContent(
        `/practicante/proyectos/tareas/${tarea.id}`,
      );
    });

    it('el Supervisor no ve «Solo mis tareas» en el mismo tablero', async () => {
      iniciarSesion('demo-supervisor');
      render(
        <MemoryRouter>
          <TableroDelProyecto
            idActor="demo-supervisor"
            proyecto={{ id: VIGENTE, nombre: nombreDe(VIGENTE) }}
            entorno={entorno}
          />
        </MemoryRouter>,
      );

      await screen.findByRole('button', { name: 'Nueva tarea' });
      expect(screen.queryByRole('button', { name: 'Solo mis tareas' })).toBeNull();
    });
  });

  describe('Equipo', () => {
    it('lista a los compañeros con nombre, especialidad, carga, Discord y GitHub, y al supervisor con Discord y GitHub', async () => {
      const usuario = userEvent.setup();
      const e = await obtenerEquipoProyecto({ idActor: PRACTICANTE, idProyecto: VIGENTE }, entorno);
      if (!e.ok || e.valor.vista !== 'PRACTICANTE') throw new Error('sin datos');
      await mostrar(`/practicante/proyectos/${VIGENTE}`);
      await usuario.click(await screen.findByRole('tab', { name: 'Equipo' }));

      // Una tarjeta pequeña por compañero, no una tabla.
      const companeros = await screen.findByRole('region', { name: 'Compañeros' });
      expect(screen.queryByRole('table')).toBeNull();
      const tarjetas = within(companeros).getAllByRole('listitem');
      expect(tarjetas).toHaveLength(e.valor.companeros.length);
      for (const [i, c] of e.valor.companeros.entries()) {
        expect(tarjetas[i]).toHaveTextContent(c.nombre);
        expect(tarjetas[i]).toHaveTextContent(`Carga ${c.carga}`);
        expect(tarjetas[i]).toHaveTextContent('Discord');
        expect(tarjetas[i]).toHaveTextContent('GitHub');
      }
      // El supervisor, en su propia tarjeta destacada.
      const supervisor = screen.getByRole('region', { name: 'Supervisor' });
      expect(supervisor).toHaveTextContent(e.valor.supervisor.nombre);
      expect(supervisor).toHaveTextContent('Discord');
      expect(supervisor).toHaveTextContent('GitHub');
      expect(supervisor.className).toContain('border-l-primary');
    });

    it('no muestra correo ni celular de nadie, ni compañeros anteriores', async () => {
      const usuario = userEvent.setup();
      await mostrar(`/practicante/proyectos/${VIGENTE}`);
      await usuario.click(await screen.findByRole('tab', { name: 'Equipo' }));
      await screen.findByRole('region', { name: 'Compañeros' });

      expect(screen.queryByRole('columnheader', { name: /correo|celular|teléfono/i })).toBeNull();
      const equipoDelProyecto = datos().usuarios.filter((u) => u.rol !== 'ADMINISTRADOR');
      for (const u of equipoDelProyecto) {
        expect(screen.queryByText(u.correo)).toBeNull();
        if (u.celular) expect(screen.queryByText(u.celular)).toBeNull();
      }
      // Quien salió del proyecto no figura.
      const exMiembros = datos().asignaciones.filter(
        (a) => a.id_proyecto === VIGENTE && a.fecha_baja !== null,
      );
      for (const a of exMiembros) {
        const nombre = datos().usuarios.find((u) => u.id === a.id_practicante)!.nombre;
        expect(screen.queryByText(nombre)).toBeNull();
      }
    });
  });

  describe('qué es el proyecto para quien mira', () => {
    it('un proyecto que ya no es vigente redirige a su resumen mínimo', async () => {
      await mostrar(`/practicante/proyectos/${ANTERIOR}`, CON_ANTERIOR);

      expect(await screen.findByRole('heading', { name: nombreDe(ANTERIOR) })).toBeInTheDocument();
      expect(screen.getByTestId('ubicacion')).toHaveTextContent(
        `/practicante/proyectos/${ANTERIOR}/anterior`,
      );
      expect(screen.queryByRole('tab')).toBeNull();
    });

    it('el resumen mínimo de un proyecto vigente redirige a su detalle', async () => {
      await mostrar(`/practicante/proyectos/${VIGENTE}/anterior`);

      expect(await screen.findByRole('tab', { name: 'Resumen' })).toBeInTheDocument();
      expect(screen.getByTestId('ubicacion')).toHaveTextContent(
        `/practicante/proyectos/${VIGENTE}`,
      );
      expect(screen.getByTestId('ubicacion')).not.toHaveTextContent('/anterior');
    });

    it.each([
      ['el detalle', `/practicante/proyectos/${AJENO}`],
      ['el resumen mínimo', `/practicante/proyectos/${AJENO}/anterior`],
    ])('un proyecto ajeno no muestra nada por %s', async (_nombre, ruta) => {
      const ajeno = datos().proyectos.find((p) => p.id === AJENO)!;

      await mostrar(ruta);

      expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró el proyecto.');
      expect(screen.queryByText(ajeno.nombre)).toBeNull();
      expect(screen.queryByText(ajeno.codigo)).toBeNull();
      expect(screen.queryByRole('tab')).toBeNull();
    });
  });

  it('«Volver a mis proyectos» lleva al listado', async () => {
    const usuario = userEvent.setup();
    await mostrar(`/practicante/proyectos/${AJENO}`);

    await usuario.click(await screen.findByRole('link', { name: 'Volver a mis proyectos' }));

    await waitFor(() => expect(screen.getByText('Listado abierto')).toBeInTheDocument());
  });
});

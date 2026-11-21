import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno } from '@/services';
import { PaginaDetalleProyectoPracticante } from './PaginaDetalleProyectoPracticante';
import { PaginaMisProyectosPracticante } from './PaginaMisProyectosPracticante';
import { PaginaProyectoAnterior } from './PaginaProyectoAnterior';

const PRACTICANTE = 'demo-practicante';
const CON_ANTERIOR = 'usr-pra-03';
const VIGENTE = 'pry-pl2d';
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

function mostrar(ruta: string, idUsuario: Id = PRACTICANTE) {
  iniciarSesion(idUsuario);
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route
          path="/practicante/proyectos"
          element={<PaginaMisProyectosPracticante entorno={entorno} />}
        />
        <Route
          path="/practicante/proyectos/:idProyecto"
          element={<PaginaDetalleProyectoPracticante entorno={entorno} />}
        />
        <Route
          path="/practicante/proyectos/:idProyecto/anterior"
          element={<PaginaProyectoAnterior entorno={entorno} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

const TARJETAS_DEL_RESUMEN = [
  'Descripción',
  'Fechas y datos del proyecto',
  'Enlaces y repositorio',
  'Avance',
  'Mis tareas',
  'Mi actividad',
];

describe('Diseño de Mis proyectos del Practicante: tarjetas limpias y consistentes', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  describe('encabezado del proyecto', () => {
    it('agrupa código, nombre, estado, avance y datos secundarios en una tarjeta propia, en filas', async () => {
      mostrar(`/practicante/proyectos/${VIGENTE}`);

      const encabezado = await screen.findByRole('region', { name: 'Encabezado del proyecto' });
      expect(within(encabezado).getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(encabezado).toHaveTextContent('PL2D');
      expect(encabezado).toHaveTextContent('Activo');
      await waitFor(() =>
        expect(
          within(encabezado).getByRole('progressbar', { name: 'Avance del proyecto' }),
        ).toBeInTheDocument(),
      );
      // Los datos secundarios van en filas «etiqueta → valor», no en una línea larga de texto.
      const filas = within(encabezado).getAllByText(
        /^(Supervisor|Reunión semanal|Rama base|Repositorio)$/,
      );
      expect(filas.map((f) => f.textContent)).toEqual([
        'Supervisor',
        'Reunión semanal',
        'Rama base',
        'Repositorio',
      ]);
      for (const f of filas) expect(f.tagName).toBe('DT');
      expect(encabezado.className).toContain('rounded-xl');
      expect(encabezado.className).toContain('border-border');
    });

    it('se ve en las tres pestañas', async () => {
      const usuario = userEvent.setup();
      mostrar(`/practicante/proyectos/${VIGENTE}`);
      await screen.findByRole('region', { name: 'Encabezado del proyecto' });

      for (const pestana of ['Tablero', 'Equipo', 'Resumen']) {
        await usuario.click(screen.getByRole('tab', { name: pestana }));
        expect(screen.getByRole('region', { name: 'Encabezado del proyecto' })).toBeInTheDocument();
      }
    });
  });

  describe('pestaña Resumen', () => {
    it('tiene una tarjeta con título por tema', async () => {
      mostrar(`/practicante/proyectos/${VIGENTE}`);

      for (const t of TARJETAS_DEL_RESUMEN) {
        expect(await screen.findByRole('region', { name: t })).toBeInTheDocument();
      }
    });

    it('todas las tarjetas comparten borde, radio, fondo y relleno', async () => {
      mostrar(`/practicante/proyectos/${VIGENTE}`);
      await screen.findByRole('region', { name: 'Descripción' });

      for (const t of TARJETAS_DEL_RESUMEN) {
        const clases = screen.getByRole('region', { name: t }).className;
        for (const c of ['border-border', 'rounded-xl', 'bg-surface', 'p-3', 'border']) {
          expect(clases.split(' ')).toContain(c);
        }
      }
    });

    it('va en dos columnas en pantalla ancha, con alturas parejas, y en una en móvil', async () => {
      mostrar(`/practicante/proyectos/${VIGENTE}`);

      const rejilla = (await screen.findByRole('region', { name: 'Descripción' })).parentElement!;
      expect(rejilla.className).toContain('lg:grid-cols-2');
      expect(rejilla.className).toContain('items-stretch');
      expect(rejilla.className.split(' ')).not.toContain('grid-cols-2'); // móvil: una columna
      for (const t of TARJETAS_DEL_RESUMEN) {
        expect(screen.getByRole('region', { name: t }).className).toContain('h-full');
        expect(screen.getByRole('region', { name: t }).parentElement).toBe(rejilla);
      }
    });

    it('los datos van en filas «etiqueta → valor» separadas por líneas finas', async () => {
      mostrar(`/practicante/proyectos/${VIGENTE}`);

      const fechas = await screen.findByRole('region', { name: 'Fechas y datos del proyecto' });
      const lista = fechas.querySelector('dl')!;
      expect(lista.className).toContain('divide-y');
      expect(within(fechas).getByText('Fecha de inicio').tagName).toBe('DT');
    });
  });

  describe('pestaña Equipo', () => {
    async function abrirEquipo() {
      const usuario = userEvent.setup();
      mostrar(`/practicante/proyectos/${VIGENTE}`);
      await usuario.click(await screen.findByRole('tab', { name: 'Equipo' }));
      return screen.findByRole('region', { name: 'Compañeros' });
    }

    it('es una cuadrícula de tarjetas pequeñas, una por compañero, de 2 columnas en pantalla ancha y 1 en móvil', async () => {
      const companeros = await abrirEquipo();

      const lista = within(companeros).getByRole('list');
      expect(lista.className).toContain('md:grid-cols-2');
      expect(lista.className.split(' ')).not.toContain('grid-cols-2');
      const tarjetas = within(lista).getAllByRole('listitem');
      expect(tarjetas.length).toBeGreaterThan(0);
      for (const t of tarjetas) {
        expect(t.className).toContain('rounded-xl');
        expect(t.className).toContain('border-border');
        expect(t.className).toContain('p-3');
      }
      expect(screen.queryByRole('table')).toBeNull();
    });

    it('cada tarjeta lleva avatar, nombre, especialidad, la carga en una insignia y Discord y GitHub en dos filas', async () => {
      const companeros = await abrirEquipo();

      const tarjeta = within(companeros).getAllByRole('listitem')[0]!;
      expect(tarjeta.querySelector('[aria-hidden="true"].rounded-full')).not.toBeNull();
      expect(within(tarjeta).getByText(/^Carga \d+$/).className).toContain('rounded-md');
      const filas = within(tarjeta).getAllByText(/^(Discord|GitHub)$/);
      expect(filas.map((f) => f.textContent)).toEqual(['Discord', 'GitHub']);
      expect(tarjeta.querySelector('dl')!.className).toContain('divide-y');
    });

    it('el supervisor va en su propia tarjeta destacada, arriba y a todo el ancho', async () => {
      const companeros = await abrirEquipo();

      const supervisor = screen.getByRole('region', { name: 'Supervisor' });
      expect(supervisor.className).toContain('border-l-primary');
      expect(supervisor).toHaveTextContent('Discord');
      expect(supervisor).toHaveTextContent('GitHub');
      // Está antes que los compañeros y no dentro de la cuadrícula: no deja un hueco vacío en ella.
      expect(
        supervisor.compareDocumentPosition(companeros) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(within(companeros).queryByRole('region', { name: 'Supervisor' })).toBeNull();
    });

    it('no muestra correo ni celular', async () => {
      await abrirEquipo();

      expect(screen.queryByText(/correo|celular/i)).toBeNull();
    });
  });

  describe('listado y resumen del proyecto anterior', () => {
    it('el listado usa tarjetas compactas con las filas separadas por líneas finas, y las anteriores siguen atenuadas', async () => {
      mostrar('/practicante/proyectos', CON_ANTERIOR);

      const vigente = await screen.findByRole('link', {
        name: new RegExp(datos().proyectos.find((p) => p.id === VIGENTE)!.nombre),
      });
      expect(vigente.querySelector('dl')!.className).toContain('divide-y');
      const anteriores = screen.getByRole('region', { name: 'Anteriores' });
      const tarjeta = within(anteriores).getByRole('link');
      expect(tarjeta.className).toContain('opacity-60');
      expect(tarjeta.querySelector('dl')!.className).toContain('divide-y');
    });

    it('el resumen del proyecto anterior usa las mismas tarjetas, en dos columnas', async () => {
      mostrar(`/practicante/proyectos/${ANTERIOR}/anterior`, CON_ANTERIOR);

      const descripcion = await screen.findByRole('region', { name: 'Descripción' });
      expect(descripcion.className).toContain('rounded-xl');
      expect(descripcion.parentElement!.className).toContain('lg:grid-cols-2');
      for (const t of ['Descripción', 'Datos del proyecto', 'Mi participación']) {
        const clases = screen.getByRole('region', { name: t }).className;
        expect(clases).toContain('border-border');
        expect(clases).toContain('p-3');
      }
      expect(screen.getByRole('region', { name: 'Encabezado del proyecto' })).toBeInTheDocument();
      expect(
        screen.getByRole('region', { name: 'Datos del proyecto' }).querySelector('dl')!.className,
      ).toContain('divide-y');
    });
  });
});

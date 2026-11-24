import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
  'Datos del proyecto',
  'Avance',
  'Enlaces útiles',
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

  describe('cabecera del proyecto', () => {
    it('agrupa nombre, estado y código en la cabecera, con el enlace de vuelta', async () => {
      mostrar(`/practicante/proyectos/${VIGENTE}`);

      const titulo = await screen.findByRole('heading', { level: 1 });
      expect(titulo.parentElement).toHaveTextContent('Activo');
      expect(titulo.parentElement!.parentElement).toHaveTextContent('PL2D');
      expect(screen.getByRole('link', { name: 'Volver a mis proyectos' })).toBeInTheDocument();
    });

    it('se ve en las tres pestañas', async () => {
      const usuario = userEvent.setup();
      mostrar(`/practicante/proyectos/${VIGENTE}`);
      await screen.findByRole('heading', { level: 1 });

      for (const pestana of ['Tablero', 'Equipo', 'Resumen']) {
        await usuario.click(screen.getByRole('tab', { name: pestana }));
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
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
      await screen.findByRole('region', { name: 'Datos del proyecto' });

      for (const t of TARJETAS_DEL_RESUMEN) {
        const clases = screen.getByRole('region', { name: t }).className;
        for (const c of ['border-border', 'rounded-xl', 'bg-surface', 'p-3', 'border']) {
          expect(clases.split(' ')).toContain(c);
        }
      }
    });

    it('va en una columna en móvil y, en pantalla ancha, en dos columnas independientes bajo los datos', async () => {
      mostrar(`/practicante/proyectos/${VIGENTE}`);

      const avance = await screen.findByRole('region', { name: 'Avance' });
      const rejilla = avance.parentElement!.parentElement!;
      expect(rejilla.className).toContain('lg:grid-cols-5');
      expect(rejilla.className).toContain('grid-cols-1');
      expect(rejilla.className).toContain('items-start');
      expect(rejilla.children).toHaveLength(2);
      const izquierda = Array.from(rejilla.children[0]!.children).map(
        (t) => t.getAttribute('aria-label') ?? t.querySelector('h2')?.textContent,
      );
      expect(izquierda).toEqual(['Avance', 'Enlaces útiles', 'Mis tareas']);
      expect(screen.getByRole('region', { name: 'Mi actividad' }).parentElement).toBe(rejilla);
    });

    it('las fechas de Mis tareas usan el mismo formato que el resto del Resumen', async () => {
      mostrar(`/practicante/proyectos/${VIGENTE}`);

      const fechas = await screen.findByRole('region', { name: 'Datos del proyecto' });
      const inicio = within(fechas).getByText('Fecha de inicio').nextElementSibling!.textContent!;
      const tareas = screen.getByRole('region', { name: 'Mis tareas' });
      const limites = within(tareas).queryAllByText(/Límite:/);
      expect(inicio).toMatch(/^\d{1,2} \p{L}+\.? \d{4}$/u);
      for (const l of limites) {
        expect(l.textContent).toMatch(/^Límite: \d{1,2} \p{L}+\.? \d{4}/u);
        expect(l.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      }
    });

    it('los datos van en una rejilla de «etiqueta → valor»', async () => {
      mostrar(`/practicante/proyectos/${VIGENTE}`);

      const datos = await screen.findByRole('region', { name: 'Datos del proyecto' });
      const lista = datos.querySelector('dl')!;
      expect(lista.className).toContain('lg:grid-cols-3');
      expect(within(datos).getByText('Fecha de inicio').tagName).toBe('DT');
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
      expect(lista.className).toContain('items-start');
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
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(
        screen.getByRole('region', { name: 'Datos del proyecto' }).querySelector('dl')!.className,
      ).toContain('divide-y');
    });
  });
});

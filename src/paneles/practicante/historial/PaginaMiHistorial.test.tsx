import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, listarMiHistorial, type MiHistorial } from '@/services';
import { PaginaDetalleTareaPracticante } from '@/paneles/practicante/proyectos/PaginaDetalleTareaPracticante';
import { PaginaMiHistorial } from './PaginaMiHistorial';

const CON_ANTERIOR = 'usr-pra-03'; // vigente en pry-pl2d, salió de pry-tie
const SIN_TAREAS = 'usr-pra-21'; // sin proyectos ni tareas
const AJENO = 'pry-inv'; // un proyecto que usr-pra-03 no tiene

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

function mostrar(ruta: string, idUsuario: Id = CON_ANTERIOR) {
  iniciarSesion(idUsuario);
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/practicante/historial" element={<PaginaMiHistorial entorno={entorno} />} />
        <Route
          path="/practicante/proyectos/tareas/:idTarea"
          element={<PaginaDetalleTareaPracticante entorno={entorno} />}
        />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
}

async function miHistorial(idUsuario: Id = CON_ANTERIOR): Promise<MiHistorial> {
  const r = await listarMiHistorial({ idActor: idUsuario }, entorno);
  if (!r.ok) throw new Error('La consulta falló');
  return r.valor;
}

const ubicacion = () => screen.getByTestId('ubicacion').textContent;
const filasDeDatos = () => screen.queryAllByRole('row').slice(1);

describe('Mi historial del Practicante (§9.2.2)', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  describe('la tabla', () => {
    it('lista las tareas que terminó, de todos sus proyectos, con las columnas de §9.2.2', async () => {
      const esperado = await miHistorial();
      expect(esperado.tareas.length).toBeGreaterThan(0);
      mostrar('/practicante/historial');

      await screen.findAllByRole('row');
      await waitFor(() => expect(filasDeDatos()).toHaveLength(esperado.tareas.length));
      const encabezados = screen.getAllByRole('columnheader').map((c) => c.textContent);
      expect(encabezados).toEqual([
        'ID',
        'Título',
        'Proyecto',
        'Fecha de término',
        'Veces devuelta',
        'Pull Request',
        'Detalle',
      ]);
      // Del más reciente al más antiguo, como las entrega la consulta.
      expect(filasDeDatos().map((f) => within(f).getAllByRole('cell')[0]!.textContent)).toEqual(
        esperado.tareas.map((t) => t.id_legible),
      );
    });

    it('incluye las tareas de un proyecto anterior', async () => {
      const esperado = await miHistorial();
      expect(esperado.tareas.some((t) => t.proyecto.id === 'pry-tie')).toBe(true);
      mostrar('/practicante/historial');

      await waitFor(() => expect(filasDeDatos().length).toBeGreaterThan(0));
      const nombre = esperado.proyectos.find((p) => p.id === 'pry-tie')!.nombre;
      expect(filasDeDatos().some((f) => within(f).queryByText(nombre) !== null)).toBe(true);
    });

    it('solo muestra las suyas: ninguna tarea de otro practicante', async () => {
      const esperado = await miHistorial();
      mostrar('/practicante/historial');

      await waitFor(() => expect(filasDeDatos()).toHaveLength(esperado.tareas.length));
      for (const t of esperado.tareas) {
        const tarea = datos().tareas.find((x) => x.id === t.id)!;
        expect(tarea.id_practicante).toBe(CON_ANTERIOR);
      }
    });

    it('es de solo lectura: ningún botón de acción en la tabla', async () => {
      mostrar('/practicante/historial');

      await waitFor(() => expect(filasDeDatos().length).toBeGreaterThan(0));
      const tabla = screen.getByRole('table');
      expect(within(tabla).queryAllByRole('button')).toHaveLength(0);
      expect(within(tabla).getAllByRole('link').length).toBe(filasDeDatos().length);
    });

    it('la tabla va en su contenedor con borde y con scroll horizontal interno', async () => {
      mostrar('/practicante/historial');

      const tabla = await screen.findByRole('table');
      const contenedor = tabla.parentElement!;
      expect(contenedor.className).toContain('overflow-x-auto');
      expect(contenedor.className).toContain('border-border');
      expect(contenedor.className).toContain('rounded-xl');
    });
  });

  describe('el filtro por proyecto de la dirección', () => {
    it('?proyecto=<id> de un proyecto suyo filtra, y el filtro se ve y se puede quitar', async () => {
      const usuario = userEvent.setup();
      const esperado = await miHistorial();
      const delProyecto = esperado.tareas.filter((t) => t.proyecto.id === 'pry-tie');
      expect(delProyecto.length).toBeGreaterThan(0);
      expect(delProyecto.length).toBeLessThan(esperado.tareas.length);
      mostrar('/practicante/historial?proyecto=pry-tie');

      await waitFor(() => expect(filasDeDatos()).toHaveLength(delProyecto.length));
      expect(screen.getByLabelText('Proyecto')).toHaveValue('pry-tie');
      const quitar = screen.getByRole('button', { name: /Quitar el filtro de proyecto/ });
      expect(ubicacion()).toBe('/practicante/historial?proyecto=pry-tie');

      await usuario.click(quitar);

      await waitFor(() => expect(filasDeDatos()).toHaveLength(esperado.tareas.length));
      expect(screen.queryByRole('button', { name: /Quitar el filtro de proyecto/ })).toBeNull();
      expect(ubicacion()).toBe('/practicante/historial');
    });

    it('elegir un proyecto en el selector pone el parámetro con replace, y «Todos» lo quita', async () => {
      const usuario = userEvent.setup();
      mostrar('/practicante/historial');
      const selector = await screen.findByLabelText('Proyecto');

      await usuario.selectOptions(selector, 'pry-tie');
      expect(ubicacion()).toBe('/practicante/historial?proyecto=pry-tie');
      expect(screen.getByText(/^Proyecto: TIE/)).toBeInTheDocument();

      await usuario.selectOptions(selector, '');
      expect(ubicacion()).toBe('/practicante/historial');
    });

    it('el selector incluye sus proyectos anteriores, y solo los suyos', async () => {
      const esperado = await miHistorial();
      mostrar('/practicante/historial');

      const selector = await screen.findByLabelText('Proyecto');
      const opciones = within(selector)
        .getAllByRole('option')
        .map((o) => (o as HTMLOptionElement).value);
      expect(opciones).toEqual(['', ...esperado.proyectos.map((p) => p.id)]);
      expect(opciones).toContain('pry-tie'); // anterior: «Ya no participas»
      expect(opciones).not.toContain(AJENO);
    });

    it.each([
      ['un proyecto ajeno', AJENO],
      ['un proyecto inexistente', 'pry-no-existe'],
      ['un valor inválido', '<script>'],
      ['un valor vacío', ''],
    ])(
      'ignora %s sin mensaje, lo limpia de la dirección y no muestra datos ajenos',
      async (_n, valor) => {
        const esperado = await miHistorial();
        mostrar(`/practicante/historial?proyecto=${encodeURIComponent(valor)}`);

        await waitFor(() => expect(ubicacion()).toBe('/practicante/historial'));
        await waitFor(() => expect(filasDeDatos()).toHaveLength(esperado.tareas.length));
        // Sin mensaje de error ni filtro puesto.
        expect(screen.queryByRole('alert')).toBeNull();
        expect(screen.queryByRole('button', { name: /Quitar el filtro/ })).toBeNull();
        expect(screen.getByLabelText('Proyecto')).toHaveValue('');
        // Nada de un proyecto que no es suyo: cada fila es una tarea suya.
        const ajenas = datos().tareas.filter((t) => t.id_proyecto === AJENO);
        for (const t of ajenas) {
          expect(
            esperado.tareas.some((x) => x.id === t.id),
            `la tarea ${t.id} es de otro practicante`,
          ).toBe(false);
        }
        const proyectosVisibles = new Set(
          filasDeDatos().map((f) => within(f).getAllByRole('cell')[2]!.textContent),
        );
        for (const nombre of proyectosVisibles) {
          expect(esperado.proyectos.map((p) => p.nombre)).toContain(nombre);
        }
      },
    );

    it('al limpiar un valor que no vale conserva los demás parámetros', async () => {
      mostrar(`/practicante/historial?proyecto=${AJENO}&otro=1`);

      await waitFor(() => expect(ubicacion()).toBe('/practicante/historial?otro=1'));
    });

    it('un proyecto ajeno nunca llega a la consulta ni a la pantalla: la tabla es la misma que sin parámetro', async () => {
      mostrar('/practicante/historial');
      await waitFor(() => expect(filasDeDatos().length).toBeGreaterThan(0));
      const sinParametro = filasDeDatos().map((f) => f.textContent);
      useAlmacenSesion.getState().cerrarSesion();
      document.body.innerHTML = '';

      mostrar(`/practicante/historial?proyecto=${AJENO}`);
      await waitFor(() => expect(ubicacion()).toBe('/practicante/historial'));
      await waitFor(() => expect(filasDeDatos().map((f) => f.textContent)).toEqual(sinParametro));
    });
  });

  describe('la búsqueda', () => {
    it('busca por título o ID, sin distinguir tildes, y la combina con el proyecto', async () => {
      const usuario = userEvent.setup();
      const esperado = await miHistorial();
      const primera = esperado.tareas[0]!;
      mostrar('/practicante/historial');
      const campo = await screen.findByRole('searchbox', { name: 'Buscar por título o ID' });

      await usuario.type(campo, primera.id_legible.toLowerCase());

      await waitFor(() => {
        const filas = filasDeDatos();
        expect(filas.length).toBeGreaterThan(0);
        for (const f of filas) expect(f).toHaveTextContent(primera.id_legible);
      });
      expect(screen.getByText(/ de \d+ tareas? terminadas?/)).toBeInTheDocument();
    });
  });

  describe('estados vacíos', () => {
    it('sin tareas terminadas: «Aún no has terminado tareas», sin filtros', async () => {
      mostrar('/practicante/historial', SIN_TAREAS);

      expect(await screen.findByText('Aún no has terminado tareas')).toBeInTheDocument();
      expect(screen.queryByRole('table')).toBeNull();
      expect(screen.queryByLabelText('Proyecto')).toBeNull();
    });

    it('un proyecto suyo sin tareas terminadas dice que no las hay y ofrece quitar el filtro', async () => {
      const usuario = userEvent.setup();
      const esperado = await miHistorial();
      const sinTareas = esperado.proyectos.find(
        (p) => !esperado.tareas.some((t) => t.proyecto.id === p.id),
      );
      // Si el seed no trae uno, se quita todo lo terminado de uno de sus proyectos.
      if (sinTareas === undefined) {
        const vacio = esperado.proyectos[0]!;
        useAlmacen.setState((a) => ({
          datos: {
            ...a.datos,
            tareas: a.datos.tareas.map((t) =>
              t.id_proyecto === vacio.id && t.id_practicante === CON_ANTERIOR
                ? { ...t, estado: 'EN_PROGRESO', fecha_termino: null }
                : t,
            ),
          },
        }));
        mostrar(`/practicante/historial?proyecto=${vacio.id}`);
      } else {
        mostrar(`/practicante/historial?proyecto=${sinTareas.id}`);
      }

      expect(
        await screen.findByText('No has terminado tareas en este proyecto'),
      ).toBeInTheDocument();
      await usuario.click(screen.getByRole('button', { name: 'Quitar filtro' }));
      await waitFor(() => expect(filasDeDatos().length).toBeGreaterThan(0));
      expect(ubicacion()).toBe('/practicante/historial');
    });

    it('una búsqueda sin resultados lo dice', async () => {
      const usuario = userEvent.setup();
      mostrar('/practicante/historial');
      const campo = await screen.findByRole('searchbox', { name: 'Buscar por título o ID' });

      await usuario.type(campo, 'zzzz-no-existe');

      expect(await screen.findByText('Ninguna tarea coincide con la búsqueda')).toBeInTheDocument();
    });
  });

  describe('el detalle de la tarea', () => {
    it('un clic en la fila abre el detalle en solo lectura, y «Volver» regresa con el filtro conservado', async () => {
      const usuario = userEvent.setup();
      const esperado = await miHistorial();
      const tarea = esperado.tareas.find((t) => t.proyecto.id === 'pry-tie')!;
      mostrar('/practicante/historial?proyecto=pry-tie');
      await waitFor(() => expect(filasDeDatos().length).toBeGreaterThan(0));

      await usuario.click(screen.getByRole('link', { name: `Ver detalle de ${tarea.id_legible}` }));

      expect(
        await screen.findByRole('heading', { name: new RegExp(tarea.titulo) }),
      ).toBeInTheDocument();
      expect(ubicacion()).toBe(`/practicante/proyectos/tareas/${tarea.id}`);
      expect(screen.queryByRole('button', { name: /Tomar|Liberar|Terminar|Enviar/ })).toBeNull();

      await usuario.click(screen.getByRole('button', { name: /Volver/ }));

      await waitFor(() => expect(ubicacion()).toBe('/practicante/historial?proyecto=pry-tie'));
      expect(screen.getByLabelText('Proyecto')).toHaveValue('pry-tie');
    });

    it('el clic en la fila (no solo en el enlace) abre el detalle', async () => {
      const usuario = userEvent.setup();
      mostrar('/practicante/historial');
      await waitFor(() => expect(filasDeDatos().length).toBeGreaterThan(0));

      await usuario.click(within(filasDeDatos()[0]!).getAllByRole('cell')[1]!);

      await waitFor(() => expect(ubicacion()).toMatch(/^\/practicante\/proyectos\/tareas\//));
    });
  });

  describe('diseño', () => {
    it('los filtros van en una sola tarjeta compacta y el conteo queda al pie de la tabla', async () => {
      const esperado = await miHistorial();
      mostrar('/practicante/historial');

      const campo = await screen.findByLabelText('Proyecto');
      const tarjeta = campo.closest('div.rounded-xl')!;
      for (const c of ['border-border', 'rounded-xl', 'bg-surface', 'p-3', 'border']) {
        expect(tarjeta.className.split(' ')).toContain(c);
      }
      expect(screen.getByLabelText('Buscar por título o ID').closest('div.rounded-xl')).toBe(
        tarjeta,
      );
      expect(await screen.findByText(`${esperado.tareas.length} tareas terminadas`)).toHaveClass(
        'text-xs',
      );
    });

    it('no usa colores a mano: solo variables del tema', async () => {
      mostrar('/practicante/historial?proyecto=pry-tie');
      await screen.findByRole('table');

      expect(document.body.innerHTML).not.toMatch(
        /#[0-9a-f]{3,8}\b|rgb\(|\bbg-(white|black|gray|slate)|text-(white|black|gray|slate)/i,
      );
    });
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, obtenerInicioPracticante, type InicioPracticante } from '@/services';
import { PaginaInicioPracticante } from './PaginaInicioPracticante';

const CON_DEVUELTA = 'demo-practicante'; // 1 devuelta, 2 PR por atender, 3 disponibles
const CON_CONFLICTOS = 'usr-pra-02'; // un PR Con conflictos
const VARIAS_EN_CURSO = 'usr-pra-04'; // 4 en progreso
const DOS_PROYECTOS = 'usr-pra-06'; // dos proyectos vigentes
const SIN_EN_CURSO_CON_DISPONIBLES = 'usr-pra-08'; // 0 en progreso, disponibles > 0
const SIN_NADA = 'usr-pra-11'; // 0 en curso, 0 disponibles, sin PR
const EN_PAUSA = 'usr-pra-09'; // su proyecto está en pausa
const SIN_PROYECTOS = 'usr-pra-21';
const SOLO_FINALIZADO = 'usr-pra-15';

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

function mostrar(idUsuario: Id = CON_DEVUELTA) {
  iniciarSesion(idUsuario);
  render(
    <MemoryRouter initialEntries={['/practicante/inicio']}>
      <Routes>
        <Route path="/practicante/inicio" element={<PaginaInicioPracticante entorno={entorno} />} />
        <Route path="*" element={<p>Otra pantalla</p>} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
}

async function inicioDe(idUsuario: Id): Promise<Extract<InicioPracticante, { vacio: false }>> {
  const r = await obtenerInicioPracticante({ idActor: idUsuario }, entorno);
  if (!r.ok || r.valor.vacio) throw new Error('El Practicante de la prueba debe tener proyectos.');
  return r.valor;
}

const ubicacion = () => screen.getByTestId('ubicacion').textContent;
const tarjeta = (nombre: string) => screen.getByRole('article', { name: nombre });

describe('Inicio del Practicante (§9.2.3)', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  describe('las cuatro tarjetas', () => {
    it('muestran lo que entrega la consulta: en progreso, devueltas, esperando supervisión y disponibles', async () => {
      const esperado = await inicioDe(CON_DEVUELTA);
      mostrar();

      await screen.findByRole('heading', { level: 1, name: 'Inicio' });
      for (const [nombre, valor] of [
        ['Mis tareas en progreso', esperado.tarjetas.en_progreso],
        ['Devueltas con observaciones', esperado.tarjetas.devueltas],
        ['Esperando supervisión', esperado.tarjetas.esperando_supervision],
        ['Disponibles para tomar', esperado.tarjetas.disponibles],
      ] as const) {
        expect(
          await screen.findByRole('link', { name: `${nombre}: ${valor}` }),
        ).toBeInTheDocument();
      }
      expect(screen.getAllByRole('article')).toHaveLength(4);
    });

    it('cada cifra enlaza a Mis proyectos, sin filtro', async () => {
      mostrar();

      await screen.findByRole('article', { name: 'Mis tareas en progreso' });
      for (const nombre of [
        'Mis tareas en progreso',
        'Devueltas con observaciones',
        'Esperando supervisión',
        'Disponibles para tomar',
      ]) {
        const enlace = within(tarjeta(nombre)).getByRole('link');
        expect(enlace).toHaveAttribute('href', '/practicante/proyectos');
      }
    });

    it('solo «Devueltas» se pinta, en rojo, y solo si hay alguna', async () => {
      mostrar(CON_DEVUELTA);
      await screen.findByRole('article', { name: 'Devueltas con observaciones' });

      expect(tarjeta('Devueltas con observaciones').className).toContain('border-state-danger');
      for (const nombre of [
        'Mis tareas en progreso',
        'Esperando supervisión',
        'Disponibles para tomar',
      ]) {
        const clases = tarjeta(nombre).className;
        expect(clases).not.toContain('state-danger');
        expect(clases).not.toContain('state-warning');
      }
    });

    it('sin devueltas, ninguna tarjeta lleva color', async () => {
      mostrar(VARIAS_EN_CURSO);
      await screen.findByRole('article', { name: 'Devueltas con observaciones' });

      for (const a of screen.getAllByRole('article')) {
        expect(a.className).not.toContain('state-');
      }
      expect(
        within(tarjeta('Devueltas con observaciones')).getByRole('link', {
          name: 'Devueltas con observaciones: 0',
        }),
      ).toBeInTheDocument();
    });

    it('«Disponibles para tomar» no cuenta un proyecto en pausa', async () => {
      const esperado = await inicioDe(EN_PAUSA);
      expect(esperado.tarjetas.disponibles).toBe(0);
      mostrar(EN_PAUSA);

      expect(
        await screen.findByRole('link', { name: 'Disponibles para tomar: 0' }),
      ).toBeInTheDocument();
    });

    it('son compactas y van en una columna en móvil', async () => {
      mostrar();

      const tarjetas = await screen.findAllByRole('article');
      const rejilla = tarjetas[0]!.parentElement!;
      expect(rejilla.className).toContain('xl:grid-cols-4');
      expect(rejilla.className).toContain('sm:grid-cols-2');
      expect(rejilla.className.split(' ')).not.toContain('grid-cols-2');
      for (const t of tarjetas) expect(t.className).toContain('px-3');
    });
  });

  describe('Mis tareas en curso', () => {
    it('lista todas sus tareas en progreso, en el orden de la consulta, con las columnas de §9.2.3', async () => {
      const esperado = await inicioDe(VARIAS_EN_CURSO);
      expect(esperado.en_curso.length).toBeGreaterThan(1);
      mostrar(VARIAS_EN_CURSO);

      const bloque = await screen.findByRole('region', { name: 'Mis tareas en curso' });
      await waitFor(() =>
        expect(within(bloque).getAllByRole('row').length).toBe(esperado.en_curso.length + 1),
      );
      expect(
        within(bloque)
          .getAllByRole('columnheader')
          .map((c) => c.textContent),
      ).toEqual(['ID', 'Título', 'Proyecto', 'Fecha límite', 'Devuelta', 'Detalle']);
      const ids = within(bloque)
        .getAllByRole('row')
        .slice(1)
        .map((f) => within(f).getAllByRole('cell')[0]!.textContent);
      expect(ids).toEqual(esperado.en_curso.map((t) => t.id_legible));
    });

    it('marca «Devuelta con observaciones» en la tarea devuelta', async () => {
      const esperado = await inicioDe(CON_DEVUELTA);
      const devuelta = esperado.en_curso.find((t) => t.devuelta)!;
      mostrar(CON_DEVUELTA);

      const bloque = await screen.findByRole('region', { name: 'Mis tareas en curso' });
      const fila = (await within(bloque).findByText(devuelta.id_legible)).closest('tr')!;
      expect(within(fila).getByText('Devuelta con observaciones')).toBeInTheDocument();
    });

    it('la fecha límite vencida va en rojo y todas las fechas usan el formato del resto de la aplicación', async () => {
      const esperado = await inicioDe(VARIAS_EN_CURSO);
      mostrar(VARIAS_EN_CURSO);
      const bloque = await screen.findByRole('region', { name: 'Mis tareas en curso' });
      await waitFor(() => expect(within(bloque).getAllByRole('row').length).toBeGreaterThan(1));
      for (const celda of within(bloque).getAllByText(/^\d{1,2} \p{L}+\.? \d{4}/u)) {
        expect(celda.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/);
      }
      expect(esperado.en_curso.every((t) => !t.vencida)).toBe(true);

      useAlmacenSesion.getState().cerrarSesion();
      document.body.innerHTML = '';
      const conVencida = await inicioDe('usr-pra-05');
      expect(conVencida.en_curso.some((t) => t.vencida)).toBe(true);
      mostrar('usr-pra-05');
      const otro = await screen.findByRole('region', { name: 'Mis tareas en curso' });
      const vencida = await within(otro).findByText(/\(vencida\)/);
      expect(vencida.className).toContain('text-danger-text');
    });

    it('un clic en la fila abre el detalle de la tarea, y «Ver detalle» también', async () => {
      const usuario = userEvent.setup();
      const esperado = await inicioDe(CON_DEVUELTA);
      const t = esperado.en_curso[0]!;
      mostrar(CON_DEVUELTA);
      const bloque = await screen.findByRole('region', { name: 'Mis tareas en curso' });

      await usuario.click(await within(bloque).findByText(t.titulo));

      await waitFor(() => expect(ubicacion()).toBe(`/practicante/proyectos/tareas/${t.id}`));
    });

    it('sin tareas en progreso dice que no hay y ofrece «Ver tareas disponibles» si hay Disponibles', async () => {
      const esperado = await inicioDe(SIN_EN_CURSO_CON_DISPONIBLES);
      expect(esperado.en_curso).toHaveLength(0);
      expect(esperado.tarjetas.disponibles).toBeGreaterThan(0);
      mostrar(SIN_EN_CURSO_CON_DISPONIBLES);

      expect(await screen.findByText('No tienes tareas en progreso')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Ver tareas disponibles' })).toHaveAttribute(
        'href',
        '/practicante/proyectos',
      );
    });

    it('sin tareas en progreso ni Disponibles no ofrece el enlace', async () => {
      mostrar(SIN_NADA);

      expect(await screen.findByText('No tienes tareas en progreso')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Ver tareas disponibles' })).toBeNull();
    });
  });

  describe('Pull Requests por atender', () => {
    it('lista sus tareas con el PR Pendiente o Con conflictos, estén en la columna que estén', async () => {
      const esperado = await inicioDe(CON_DEVUELTA);
      expect(esperado.pull_requests_por_atender.length).toBeGreaterThan(0);
      // Hay tareas Esperando supervisión o Terminada: la consulta mira el estado del PR, no el del Kanban.
      expect(esperado.pull_requests_por_atender.some((t) => t.estado !== 'EN_PROGRESO')).toBe(true);
      mostrar(CON_DEVUELTA);

      const bloque = await screen.findByRole('region', { name: 'Pull Requests por atender' });
      const items = await within(bloque).findAllByRole('listitem');
      expect(items).toHaveLength(esperado.pull_requests_por_atender.length);
      for (const [i, t] of esperado.pull_requests_por_atender.entries()) {
        expect(items[i]).toHaveTextContent(t.id_legible);
        expect(items[i]).toHaveTextContent(t.proyecto.nombre);
      }
      expect(bloque).toHaveTextContent('Pendiente');
    });

    it('muestra «Con conflictos» y el título lleva al detalle de la tarea', async () => {
      const usuario = userEvent.setup();
      const esperado = await inicioDe(CON_CONFLICTOS);
      const t = esperado.pull_requests_por_atender.find(
        (x) => x.etiqueta_pr_visible === 'CON_CONFLICTOS',
      )!;
      mostrar(CON_CONFLICTOS);
      const bloque = await screen.findByRole('region', { name: 'Pull Requests por atender' });

      expect(await within(bloque).findByText('Con conflictos')).toBeInTheDocument();
      await usuario.click(within(bloque).getByRole('link', { name: t.titulo }));

      await waitFor(() => expect(ubicacion()).toBe(`/practicante/proyectos/tareas/${t.id}`));
    });

    it('sin ninguno dice «No tienes Pull Requests pendientes»', async () => {
      mostrar(VARIAS_EN_CURSO);

      expect(await screen.findByText('No tienes Pull Requests pendientes')).toBeInTheDocument();
    });
  });

  describe('Próximas reuniones', () => {
    it('muestra la reunión de cada proyecto vigente y enlaza a Mis proyectos', async () => {
      const esperado = await inicioDe(DOS_PROYECTOS);
      expect(esperado.proximas_reuniones.length).toBe(2);
      mostrar(DOS_PROYECTOS);

      const bloque = await screen.findByRole('region', { name: 'Próximas reuniones' });
      const items = await within(bloque).findAllByRole('listitem');
      expect(items).toHaveLength(2);
      for (const r of esperado.proximas_reuniones) {
        expect(within(bloque).getByRole('link', { name: r.proyecto.nombre })).toHaveAttribute(
          'href',
          `/practicante/proyectos/${r.proyecto.id}`,
        );
      }
    });

    it('incluye el proyecto en pausa', async () => {
      const esperado = await inicioDe(EN_PAUSA);
      expect(esperado.proximas_reuniones.length).toBe(1);
      mostrar(EN_PAUSA);

      const bloque = await screen.findByRole('region', { name: 'Próximas reuniones' });
      expect(
        await within(bloque).findByRole('link', {
          name: esperado.proximas_reuniones[0]!.proyecto.nombre,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('estado vacío, carga y error', () => {
    it('sin ningún proyecto, un solo mensaje y ninguna tarjeta', async () => {
      mostrar(SIN_PROYECTOS);

      expect(await screen.findByText('Aún no tienes proyectos asignados')).toBeInTheDocument();
      expect(screen.getByText('El Administrador te asignará uno.')).toBeInTheDocument();
      expect(screen.queryAllByRole('article')).toHaveLength(0);
      expect(screen.queryByRole('region', { name: 'Mis tareas en curso' })).toBeNull();
    });

    it('quien solo sigue en un proyecto finalizado también lo ve, sin tarjetas en cero', async () => {
      mostrar(SOLO_FINALIZADO);

      expect(await screen.findByText('Aún no tienes proyectos asignados')).toBeInTheDocument();
      expect(screen.queryAllByRole('article')).toHaveLength(0);
    });

    it('mientras carga muestra un esqueleto, no las tarjetas', () => {
      mostrar();

      expect(screen.getByRole('status', { name: 'Cargando el inicio' })).toBeInTheDocument();
      expect(screen.queryAllByRole('article')).toHaveLength(0);
    });

    it('un actor que no es Practicante recibe el error del servicio, sin datos', async () => {
      iniciarSesion('demo-supervisor');
      render(
        <MemoryRouter>
          <PaginaInicioPracticante entorno={entorno} />
        </MemoryRouter>,
      );

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.queryAllByRole('article')).toHaveLength(0);
    });
  });

  describe('alcance y navegación', () => {
    it('solo hay tareas del propio Practicante: ninguna de otra persona ni de un proyecto ajeno', async () => {
      const esperado = await inicioDe(CON_DEVUELTA);
      mostrar(CON_DEVUELTA);
      await screen.findByRole('region', { name: 'Mis tareas en curso' });
      await waitFor(() =>
        expect(
          within(screen.getByRole('region', { name: 'Mis tareas en curso' })).getAllByRole('row')
            .length,
        ).toBeGreaterThan(1),
      );

      const mias = new Set(
        datos()
          .tareas.filter((t) => t.id_practicante === CON_DEVUELTA)
          .map((t) => t.id),
      );
      for (const t of [...esperado.en_curso, ...esperado.pull_requests_por_atender]) {
        expect(mias.has(t.id)).toBe(true);
      }
      const proyectosSuyos = new Set(
        datos()
          .asignaciones.filter((a) => a.id_practicante === CON_DEVUELTA)
          .map((a) => a.id_proyecto),
      );
      const ajenas = datos().tareas.filter(
        (t) => !proyectosSuyos.has(t.id_proyecto) || t.id_practicante !== CON_DEVUELTA,
      );
      const visibles = document.body.textContent ?? '';
      for (const t of ajenas.slice(0, 40)) {
        const legible = `${datos().proyectos.find((p) => p.id === t.id_proyecto)!.codigo}-${String(t.numero).padStart(3, '0')}`;
        const propia = esperado.en_curso.some((x) => x.id_legible === legible);
        if (!propia) expect(visibles).not.toContain(`${legible} `);
      }
    });

    it('no hay botones de acción: solo enlaces y filas que navegan', async () => {
      mostrar(CON_DEVUELTA);
      await screen.findByRole('region', { name: 'Pull Requests por atender' });
      await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(1));

      expect(screen.queryAllByRole('button')).toHaveLength(0);
    });
  });

  describe('diseño', () => {
    it('los dos bloques de abajo van lado a lado con la altura de su contenido y en una columna en móvil', async () => {
      mostrar();

      const prs = await screen.findByRole('region', { name: 'Pull Requests por atender' });
      const reuniones = screen.getByRole('region', { name: 'Próximas reuniones' });
      const rejilla = prs.parentElement!;
      expect(reuniones.parentElement).toBe(rejilla);
      expect(rejilla.className).toContain('items-start');
      expect(rejilla.className).toContain('lg:grid-cols-2');
      expect(rejilla.className).not.toContain('items-stretch');
      expect(rejilla.className.split(' ')).not.toContain('grid-cols-2');
    });

    it('la tabla de tareas en curso va en su contenedor con borde y scroll horizontal interno', async () => {
      mostrar();

      const tabla = await screen.findByRole('table');
      expect(tabla.parentElement!.className).toContain('overflow-x-auto');
      expect(tabla.parentElement!.className).toContain('border-border');
    });

    it('no usa colores a mano: solo variables del tema', async () => {
      mostrar();
      await screen.findByRole('table');

      expect(document.body.innerHTML).not.toMatch(
        /#[0-9a-f]{3,8}\b|rgb\(|\bbg-(white|black|gray|slate)|text-(white|black|gray|slate)/i,
      );
    });
  });
});

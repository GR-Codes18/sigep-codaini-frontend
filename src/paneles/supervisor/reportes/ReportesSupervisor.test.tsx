import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ETIQUETA_REGLA } from '@/app/adaptadores';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import {
  crearEntorno,
  listarInsights,
  listarProyectos,
  obtenerIndicadores,
  type InsightVista,
} from '@/services';
import { PaginaReportes } from '@/paneles/administrador/reportes/PaginaReportes';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';

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

async function mostrar(busqueda = '') {
  iniciarSesion(SUPERVISOR);
  render(
    <MemoryRouter initialEntries={[`/supervisor/reportes${busqueda}`]}>
      <Routes>
        <Route path="/supervisor/reportes" element={<PaginaReportes entorno={entorno} />} />
        <Route path="/supervisor/*" element={<p>Detalle abierto</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function insightsDe(idActor: Id): Promise<InsightVista[]> {
  const r = await listarInsights({ idActor }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor.insights;
}

async function esperarInsights() {
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando los insights' })).toBeNull(),
  );
}
async function esperarIndicadores() {
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando los indicadores' })).toBeNull(),
  );
}

const tarjetas = () => screen.queryAllByRole('article');
const mios = () => datos().proyectos.filter((p) => p.id_supervisor === SUPERVISOR);

describe('Reportes del Supervisor: pestaña «Insights» (§9.1.4)', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('abre en «Insights» con las alertas de sus proyectos, las mismas que entrega la consulta', async () => {
    const activos = (await insightsDe(SUPERVISOR)).filter((i) => !i.revisado);
    expect(activos.length).toBeGreaterThan(0);

    await mostrar();
    await esperarInsights();

    expect(screen.getByRole('tab', { name: 'Insights' })).toHaveAttribute('data-state', 'active');
    expect(tarjetas().map((a) => a.getAttribute('aria-label'))).toEqual(
      activos.map((i) => i.titulo),
    );
  });

  it('el filtro de tipo ofrece solo las 5 reglas que le aplican, sin «Postulaciones sin decidir» ni «Fin de práctica»', async () => {
    await mostrar();
    await esperarInsights();

    const opciones = within(screen.getByLabelText('Tipo'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(opciones).toHaveLength(6); // «Todos» y las 5 reglas
    expect(opciones).not.toContain(ETIQUETA_REGLA.POSTULACIONES_SIN_DECIDIR);
    expect(opciones).not.toContain(ETIQUETA_REGLA.FIN_PRACTICA);
    for (const regla of [
      'PRACTICANTE_INACTIVO',
      'CARGA_DESBALANCEADA',
      'POSIBLE_ATRASO_PROYECTO',
      'PROYECTO_SIN_ACTIVIDAD',
      'SUPERVISION_DEMORADA',
    ] as const) {
      expect(opciones).toContain(ETIQUETA_REGLA[regla]);
    }
  });

  it('ninguna tarjeta es de «Postulaciones sin decidir» ni de «Fin de práctica»', async () => {
    await mostrar();
    await esperarInsights();

    for (const t of tarjetas()) {
      expect(t).not.toHaveTextContent(ETIQUETA_REGLA.POSTULACIONES_SIN_DECIDIR);
      expect(t).not.toHaveTextContent(ETIQUETA_REGLA.FIN_PRACTICA);
    }
  });

  it('«Notificar» solo en «Practicante inactivo»: la supervisión demorada es sobre él mismo y no lo ofrece', async () => {
    const lista = (await insightsDe(SUPERVISOR)).filter((i) => !i.revisado);
    expect(lista.some((i) => i.tipo_regla === 'SUPERVISION_DEMORADA')).toBe(true);

    await mostrar();
    await esperarInsights();

    for (const i of lista) {
      const boton = screen.queryByRole('button', { name: `Notificar: ${i.titulo}` });
      if (i.tipo_regla === 'PRACTICANTE_INACTIVO') {
        expect(boton !== null).toBe(i.puede_notificar);
      } else {
        expect(boton).toBeNull();
      }
    }
  });

  it('«Ver detalle» lleva a las páginas del Supervisor, no a las del Administrador', async () => {
    const lista = (await insightsDe(SUPERVISOR)).filter((i) => !i.revisado);

    await mostrar();
    await esperarInsights();

    const esperadas: Record<string, string> = {
      USUARIO: '/supervisor/practicantes/',
      PROYECTO: '/supervisor/proyectos/',
      TAREA: '/supervisor/tareas/',
    };
    for (const i of lista) {
      const enlace = screen.getByRole('link', { name: `Ver detalle: ${i.titulo}` });
      const href = enlace.getAttribute('href')!;
      expect(href.startsWith('/administrador')).toBe(false);
      expect(href).toBe(`${esperadas[i.elemento.tipo]}${i.elemento.id}`);
    }
    // La supervisión demorada lleva directo a la tarea en su cola.
    const demorada = lista.find((i) => i.tipo_regla === 'SUPERVISION_DEMORADA')!;
    expect(screen.getByRole('link', { name: `Ver detalle: ${demorada.titulo}` })).toHaveAttribute(
      'href',
      `/supervisor/tareas/${demorada.elemento.id}`,
    );
  });

  it('un clic en «Ver detalle» navega dentro del panel del Supervisor', async () => {
    const usuario = userEvent.setup();
    const lista = (await insightsDe(SUPERVISOR)).filter((i) => !i.revisado);
    await mostrar();
    await esperarInsights();

    await usuario.click(screen.getByRole('link', { name: `Ver detalle: ${lista[0]!.titulo}` }));

    expect(await screen.findByText('Detalle abierto')).toBeInTheDocument();
  });

  it('«revisado» es independiente del Administrador: lo que marca el Supervisor sigue activo para el Administrador', async () => {
    const usuario = userEvent.setup();
    const antesAdmin = (await insightsDe(ADMIN)).filter((i) => !i.revisado).length;
    const alerta = (await insightsDe(SUPERVISOR)).find((i) => i.puede_marcar_revisado)!;
    await mostrar();
    await esperarInsights();

    await usuario.click(
      screen.getByRole('button', { name: `Marcar como revisado: ${alerta.titulo}` }),
    );
    const dialogo = await screen.findByRole('dialog', { name: 'Marcar como revisado' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Marcar como revisado' }));

    await waitFor(() => expect(screen.queryByRole('article', { name: alerta.titulo })).toBeNull());
    const deAdmin = await insightsDe(ADMIN);
    expect(deAdmin.filter((i) => !i.revisado)).toHaveLength(antesAdmin);
    const suyo = deAdmin.find((i) => i.titulo === alerta.titulo);
    if (suyo !== undefined) expect(suyo.revisado).toBe(false);
  });

  it('el filtro de proyecto solo lista los suyos y no llega ningún dato de proyectos ajenos', async () => {
    await mostrar();
    await esperarInsights();

    const select = screen.getByLabelText('Proyecto');
    const nombresPropios = mios().map((p) => p.nombre);
    for (const o of within(select).getAllByRole('option').slice(1)) {
      expect(nombresPropios).toContain(o.textContent);
    }
    const ajenos = datos().proyectos.filter((p) => p.id_supervisor !== SUPERVISOR);
    for (const p of ajenos) {
      expect(screen.queryByText(p.nombre)).toBeNull();
    }
  });

  it('sin alertas dice «No hay alertas en tus proyectos»', async () => {
    useAlmacen.getState().transaccion((d) => ({
      proyectos: d.proyectos.filter((p) => p.id_supervisor !== SUPERVISOR),
      revisiones_insight: [],
    }));
    await mostrar();

    expect(await screen.findByText('No hay alertas en tus proyectos')).toBeInTheDocument();
    expect(tarjetas()).toHaveLength(0);
  });
});

describe('Reportes del Supervisor: pestaña «Indicadores» (§9.1.4)', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('muestra el periodo de 30 días y solo tres tarjetas: sin postulaciones, sin puntaje por área y sin espera', async () => {
    await mostrar('?pestana=indicadores');
    await esperarIndicadores();

    expect(screen.getByLabelText('Periodo (días)')).toHaveValue(30);
    expect(screen.getByText(/Del .+ al .+ · hora de Perú/)).toBeInTheDocument();
    const tarjetasGenerales = screen.getByRole('region', { name: 'Tarjetas generales' });
    expect(within(tarjetasGenerales).getByText('Tareas terminadas')).toBeInTheDocument();
    expect(within(tarjetasGenerales).getByText('Tiempo promedio de ciclo')).toBeInTheDocument();
    expect(within(tarjetasGenerales).getByText('Tasa de devolución')).toBeInTheDocument();
    expect(within(tarjetasGenerales).queryByText('Postulaciones decididas')).toBeNull();
    expect(within(tarjetasGenerales).queryByText('Puntaje promedio por área')).toBeNull();
    expect(within(tarjetasGenerales).queryByText('Espera de supervisión')).toBeNull();
    expect(tarjetasGenerales.querySelectorAll('dt')).toHaveLength(3);
  });

  it('no incluye el gráfico ni la tabla de practicantes por área: no ve el área técnica', async () => {
    await mostrar('?pestana=indicadores');
    await esperarIndicadores();

    expect(screen.queryByRole('region', { name: 'Practicantes por área' })).toBeNull();
    expect(screen.queryByTestId('grafico-practicantes-por-area')).toBeNull();
    expect(screen.queryByText(/área/i)).toBeNull();
  });

  it('el selector de periodo y los atajos funcionan', async () => {
    const usuario = userEvent.setup();
    await mostrar('?pestana=indicadores');
    await esperarIndicadores();

    await usuario.click(screen.getByRole('button', { name: '90 días' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '90 días' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
    expect(screen.getByLabelText('Periodo (días)')).toHaveValue(90);
  });

  it('el filtro de proyecto solo ofrece los suyos y deja solo ese proyecto en la tabla', async () => {
    const usuario = userEvent.setup();
    const lista = await listarProyectos({ idActor: SUPERVISOR }, entorno);
    if (!lista.ok) throw new Error(lista.mensaje);
    await mostrar('?pestana=indicadores');
    await esperarIndicadores();

    const select = screen.getByLabelText('Proyecto');
    await waitFor(() =>
      expect(within(select).getAllByRole('option')).toHaveLength(lista.valor.proyectos.length + 1),
    );
    for (const o of within(select).getAllByRole('option').slice(1)) {
      expect(mios().map((p) => p.nombre)).toContain(o.textContent);
    }

    await usuario.selectOptions(select, lista.valor.proyectos[0]!.id);

    await waitFor(() => {
      const region = screen.getByRole('region', { name: 'Indicadores por proyecto' });
      expect(within(region).getAllByRole('row')).toHaveLength(2);
    });
  });

  it('las tablas solo traen sus proyectos y sus practicantes, con enlaces al panel del Supervisor', async () => {
    const r = await obtenerIndicadores({ idActor: SUPERVISOR, dias: 30 }, entorno);
    if (!r.ok) throw new Error(r.mensaje);
    await mostrar('?pestana=indicadores');
    await esperarIndicadores();

    const proyectos = screen.getByRole('region', { name: 'Indicadores por proyecto' });
    expect(within(proyectos).getAllByRole('row').slice(1)).toHaveLength(
      r.valor.por_proyecto.length,
    );
    for (const enlace of within(proyectos).getAllByRole('link')) {
      expect(enlace.getAttribute('href')).toMatch(/^\/supervisor\/proyectos\//);
    }
    const practicantes = screen.getByRole('region', { name: 'Indicadores por practicante' });
    expect(within(practicantes).getAllByRole('row').slice(1)).toHaveLength(
      r.valor.por_practicante.length,
    );
    for (const enlace of within(practicantes).queryAllByRole('link')) {
      expect(enlace.getAttribute('href')).toMatch(/^\/supervisor\/practicantes\//);
    }
    for (const p of datos().proyectos.filter((x) => x.id_supervisor !== SUPERVISOR)) {
      expect(screen.queryByText(p.nombre)).toBeNull();
    }
  });
});

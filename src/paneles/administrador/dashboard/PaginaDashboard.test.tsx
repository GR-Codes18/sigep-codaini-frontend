import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import {
  crearEntorno,
  MAXIMO_ALERTAS,
  MAXIMO_POSTULACIONES,
  obtenerDashboardAdministrador,
} from '@/services';
import { PaginaDashboard } from './PaginaDashboard';

const ADMIN = 'demo-admin';
const entorno = crearEntorno({ demoraMs: 0 });

function iniciarSesion() {
  const u = useAlmacen.getState().datos.usuarios.find((x) => x.id === ADMIN)!;
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

async function mostrar() {
  render(
    <MemoryRouter initialEntries={['/administrador/dashboard']}>
      <Routes>
        <Route path="/administrador/dashboard" element={<PaginaDashboard entorno={entorno} />} />
        <Route path="/administrador/*" element={<p>Módulo abierto</p>} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando el dashboard' })).toBeNull(),
  );
}

async function consulta() {
  const r = await obtenerDashboardAdministrador({ idActor: ADMIN }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

const tarjeta = (titulo: string) => screen.getByRole('article', { name: titulo });
const seccion = (titulo: string) => screen.getByRole('region', { name: titulo });

describe('Dashboard del Administrador', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion();
  });

  it('muestra las cuatro tarjetas con las cifras de la consulta', async () => {
    await mostrar();
    const v = await consulta();

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(
      within(tarjeta('Postulaciones pendientes')).getByRole('link', {
        name: `Postulaciones pendientes: ${v.tarjetas.postulaciones.pendientes}`,
      }),
    ).toBeInTheDocument();
    expect(tarjeta('Postulaciones pendientes')).toHaveTextContent(
      `${v.tarjetas.postulaciones.requieren_revision} requieren revisión manual`,
    );
    expect(tarjeta('Proyectos activos')).toHaveTextContent(
      `${v.tarjetas.proyectos.en_pausa} en pausa`,
    );
    expect(tarjeta('Practicantes activos')).toHaveTextContent(
      `${v.tarjetas.practicantes.sin_proyecto} sin proyecto`,
    );
    expect(tarjeta('Esperando supervisión')).toHaveTextContent(
      `${v.tarjetas.tareas_esperando_supervision.demoradas} con ${v.plazo_demora_dias} días o más de espera`,
    );
  });

  it('cada tarjeta enlaza a su módulo con el filtro ya aplicado, y la cifra secundaria al suyo', async () => {
    await mostrar();

    const href = (el: HTMLElement) => el.getAttribute('href');
    const enlaces = (titulo: string) => within(tarjeta(titulo)).getAllByRole('link');

    expect(href(enlaces('Postulaciones pendientes')[0]!)).toBe(
      '/administrador/postulaciones?pestana=PENDIENTES',
    );
    expect(href(enlaces('Postulaciones pendientes')[1]!)).toBe(
      '/administrador/postulaciones?pestana=REQUIEREN_REVISION',
    );
    expect(href(enlaces('Proyectos activos')[0]!)).toBe('/administrador/proyectos?pestana=ACTIVO');
    expect(href(enlaces('Proyectos activos')[1]!)).toBe(
      '/administrador/proyectos?pestana=EN_PAUSA',
    );
    expect(href(enlaces('Practicantes activos')[0]!)).toBe(
      '/administrador/practicantes?pestana=ACTIVOS',
    );
    expect(href(enlaces('Practicantes activos')[1]!)).toBe(
      '/administrador/practicantes?pestana=SIN_PROYECTO',
    );
    expect(href(enlaces('Esperando supervisión')[0]!)).toBe(
      '/administrador/tareas?pestana=ESPERANDO_SUPERVISION',
    );
    // Las «demoradas» son texto: no hay un filtro para ellas en Tareas.
    expect(enlaces('Esperando supervisión')).toHaveLength(1);
  });

  it('un clic en una tarjeta lleva al módulo con la pestaña en la dirección', async () => {
    const usuario = userEvent.setup();
    await mostrar();

    await usuario.click(within(tarjeta('Proyectos activos')).getAllByRole('link')[1]!);

    expect(await screen.findByText('Módulo abierto')).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion')).toHaveTextContent(
      '/administrador/proyectos?pestana=EN_PAUSA',
    );
  });

  it('lista las postulaciones pendientes de mayor puntaje, hasta cinco, con su marca y su detalle', async () => {
    await mostrar();
    const v = await consulta();
    expect(v.postulaciones_pendientes.length).toBeLessThanOrEqual(MAXIMO_POSTULACIONES);

    const region = seccion('Postulaciones pendientes');
    const filas = within(region).getAllByRole('row').slice(1);
    expect(filas).toHaveLength(v.postulaciones_pendientes.length);
    for (const [i, p] of v.postulaciones_pendientes.entries()) {
      expect(filas[i]).toHaveTextContent(p.nombre);
      expect(
        within(filas[i]!).getByRole('link', { name: `Ver detalle: ${p.nombre}` }),
      ).toHaveAttribute('href', `/administrador/postulaciones/${p.id}`);
    }
    expect(within(region).getAllByText('Requiere revisión manual').length).toBe(
      v.postulaciones_pendientes.filter((p) => p.requiere_revision_manual).length,
    );
  });

  it('muestra hasta cinco alertas con sus acciones, en el orden de la consulta', async () => {
    await mostrar();
    const v = await consulta();
    expect(v.alertas.length).toBeGreaterThan(0);
    expect(v.alertas.length).toBeLessThanOrEqual(MAXIMO_ALERTAS);

    const region = seccion('Alertas');
    const articulos = within(region).getAllByRole('article');
    expect(articulos.map((a) => a.getAttribute('aria-label'))).toEqual(
      v.alertas.map((a) => a.titulo),
    );
    expect(within(region).getAllByRole('link', { name: /^Ver detalle:/ }).length).toBeGreaterThan(
      0,
    );
  });

  it('marcar una alerta como revisada la saca del Dashboard', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    const v = await consulta();
    const alerta = v.alertas.find((a) => a.puede_marcar_revisado)!;
    expect(alerta).toBeDefined();

    await usuario.click(
      within(seccion('Alertas')).getByRole('button', {
        name: `Marcar como revisado: ${alerta.titulo}`,
      }),
    );
    const dialogo = await screen.findByRole('dialog', { name: 'Marcar como revisado' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Marcar como revisado' }));

    await waitFor(() =>
      expect(within(seccion('Alertas')).queryByRole('article', { name: alerta.titulo })).toBeNull(),
    );
  });

  it('practicantes por área: el gráfico es una ayuda y la tabla es la alternativa accesible', async () => {
    await mostrar();
    const v = await consulta();

    const region = seccion('Practicantes por área');
    expect(within(region).getByTestId('grafico-practicantes-por-area')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(within(region).getAllByRole('row').slice(1)).toHaveLength(
      v.practicantes_por_area.length,
    );
  });

  it('por revisar, próximas reuniones y avance salen de la consulta', async () => {
    await mostrar();
    const v = await consulta();

    const porRevisar = seccion('Por revisar');
    expect(within(porRevisar).queryAllByRole('listitem')).toHaveLength(v.por_revisar.length);
    const reuniones = seccion('Próximas reuniones');
    expect(within(reuniones).getAllByRole('listitem')).toHaveLength(v.proximas_reuniones.length);
    const avance = seccion('Avance de los proyectos');
    expect(within(avance).getAllByRole('progressbar')).toHaveLength(v.avance_proyectos.length);
  });

  it('sin postulaciones pendientes ni alertas, dice que no hay y no inventa nada', async () => {
    useAlmacen.getState().transaccion(() => ({
      postulantes: [],
      evaluaciones: [],
      tareas: [],
      proyectos: [],
      asignaciones: [],
      revisiones_insight: [],
    }));
    await mostrar();
    const v = await consulta();

    expect(
      within(seccion('Postulaciones pendientes')).getByText('No hay postulaciones pendientes'),
    ).toBeInTheDocument();
    if (v.alertas.length === 0) {
      expect(within(seccion('Alertas')).getByText('No hay alertas')).toBeInTheDocument();
    }
    expect(tarjeta('Proyectos activos')).toHaveTextContent('0');
    // No incluye un feed de actividad reciente (duplicaría el Historial).
    expect(screen.queryByText(/actividad reciente/i)).toBeNull();
  });
});

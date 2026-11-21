import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import {
  crearEntorno,
  listarInsights,
  marcarInsightRevisado,
  MAXIMO_ALERTAS,
  MAXIMO_POR_REVISAR,
  obtenerDashboardSupervisor,
  type DashboardSupervisor,
} from '@/services';
import { PaginaDashboardSupervisor } from './PaginaDashboardSupervisor';

const SUPERVISOR = 'demo-supervisor';
const SUPERVISOR_SIN_COLA = 'usr-sup-02';

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

async function mostrar(idUsuario: Id = SUPERVISOR) {
  iniciarSesion(idUsuario);
  render(
    <MemoryRouter initialEntries={['/supervisor/dashboard']}>
      <Routes>
        <Route
          path="/supervisor/dashboard"
          element={<PaginaDashboardSupervisor entorno={entorno} />}
        />
        <Route path="/supervisor/*" element={<p>Módulo abierto</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando el dashboard' })).toBeNull(),
  );
}

async function consulta(idActor: Id = SUPERVISOR): Promise<DashboardSupervisor> {
  const r = await obtenerDashboardSupervisor({ idActor }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  if (r.valor.vacio) throw new Error('vacío');
  return r.valor;
}

const tarjeta = (titulo: string) => screen.getByRole('article', { name: titulo });
const seccion = (titulo: string) => screen.getByRole('region', { name: titulo });
const T_ESPERANDO = 'Tareas esperando mi supervisión';
const T_PROYECTOS = 'Mis proyectos activos';
const T_PRACTICANTES = 'Practicantes a cargo';
const T_VENCIDAS = 'Tareas vencidas';

describe('Dashboard del Supervisor (§9.1.5)', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  describe('las cuatro tarjetas', () => {
    it('muestran las cifras de la consulta, cada una en una sola línea corta', async () => {
      await mostrar();
      const v = await consulta();

      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
      expect(
        within(tarjeta(T_ESPERANDO)).getByRole('link', {
          name: `${T_ESPERANDO}: ${v.tarjetas.tareas_esperando_supervision.total}`,
        }),
      ).toBeInTheDocument();
      expect(tarjeta(T_ESPERANDO)).toHaveTextContent(
        `${v.tarjetas.tareas_esperando_supervision.demoradas} con ${v.plazo_demora_dias} días o más de espera`,
      );
      expect(tarjeta(T_PROYECTOS)).toHaveTextContent(`${v.tarjetas.proyectos.en_pausa} en pausa`);
      expect(tarjeta(T_PRACTICANTES)).toHaveTextContent(
        `${v.tarjetas.practicantes.sin_tareas_en_progreso} sin tareas en progreso`,
      );
      expect(tarjeta(T_VENCIDAS)).toHaveTextContent(
        `${v.tarjetas.tareas_vencidas.sin_asignar} sin asignar`,
      );
    });

    it('son compactas: poco relleno y sin la caja alta del Administrador', async () => {
      await mostrar();

      for (const titulo of [T_ESPERANDO, T_PROYECTOS, T_PRACTICANTES, T_VENCIDAS]) {
        const clases = tarjeta(titulo).className;
        expect(clases).toContain('px-3');
        expect(clases).toContain('py-2');
        expect(clases).not.toContain('p-4');
      }
    });

    it('van en rejilla de 4 en pantalla ancha, 2 en tablet y 1 en móvil', async () => {
      await mostrar();

      const rejilla = tarjeta(T_ESPERANDO).parentElement!;
      expect(rejilla.className).toContain('xl:grid-cols-4');
      expect(rejilla.className).toContain('sm:grid-cols-2');
      expect(rejilla.className).not.toContain('grid-cols-3');
      expect(within(rejilla).getAllByRole('article')).toHaveLength(4);
    });

    it('cada una enlaza a su módulo con el filtro ya aplicado, y la cifra secundaria al suyo', async () => {
      await mostrar();
      const href = (el: HTMLElement) => el.getAttribute('href');
      const enlaces = (titulo: string) => within(tarjeta(titulo)).getAllByRole('link');

      expect(href(enlaces(T_ESPERANDO)[0]!)).toBe(
        '/supervisor/tareas?pestana=ESPERANDO_SUPERVISION',
      );
      expect(enlaces(T_ESPERANDO)).toHaveLength(1); // «con N días o más» es texto
      expect(href(enlaces(T_PROYECTOS)[0]!)).toBe('/supervisor/proyectos?pestana=ACTIVO');
      expect(href(enlaces(T_PROYECTOS)[1]!)).toBe('/supervisor/proyectos?pestana=EN_PAUSA');
      expect(href(enlaces(T_PRACTICANTES)[0]!)).toBe('/supervisor/practicantes');
      expect(enlaces(T_PRACTICANTES)).toHaveLength(1); // «sin tareas en progreso» es texto
      expect(href(enlaces(T_VENCIDAS)[0]!)).toBe('/supervisor/tareas?pestana=TODAS&vencidas=1');
      expect(href(enlaces(T_VENCIDAS)[1]!)).toBe(
        '/supervisor/tareas?pestana=TODAS&vencidas=1&sin_asignar=1',
      );
    });

    it('la de tareas por supervisar es la única en ámbar, y solo si hay alguna', async () => {
      await mostrar();
      const v = await consulta();
      expect(v.tarjetas.tareas_esperando_supervision.total).toBeGreaterThan(0);

      expect(tarjeta(T_ESPERANDO).className).toContain('state-warning');
      for (const otra of [T_PROYECTOS, T_PRACTICANTES, T_VENCIDAS]) {
        expect(tarjeta(otra).className).not.toContain('state-warning');
      }
    });

    it('sin tareas por supervisar no hay ámbar', async () => {
      await mostrar(SUPERVISOR_SIN_COLA);

      expect(tarjeta(T_ESPERANDO)).toHaveTextContent(/^Tareas esperando mi supervisión0/);
      expect(tarjeta(T_ESPERANDO).className).not.toContain('state-warning');
    });

    it('la de vencidas se pinta en rojo solo si hay alguna', async () => {
      const v = await consulta();
      expect(v.tarjetas.tareas_vencidas.total).toBeGreaterThan(0);
      await mostrar();

      expect(tarjeta(T_VENCIDAS).className).toContain('state-danger');
    });

    it('sin tareas vencidas no hay rojo, y la tarjeta mantiene su forma', async () => {
      useAlmacen.getState().transaccion((d) => ({
        tareas: d.tareas.map((t) => ({ ...t, fecha_limite: '2099-12-31' })),
      }));
      await mostrar();

      expect(tarjeta(T_VENCIDAS)).toHaveTextContent(/^Tareas vencidas0/);
      expect(tarjeta(T_VENCIDAS).className).not.toContain('state-danger');
      expect(tarjeta(T_VENCIDAS).className).toContain('px-3');
    });
  });

  describe('«Por revisar»', () => {
    it('lista las tareas que más llevan esperando, hasta cinco, en el orden de la consulta', async () => {
      await mostrar();
      const v = await consulta();
      expect(v.por_revisar.length).toBeGreaterThan(0);
      expect(v.por_revisar.length).toBeLessThanOrEqual(MAXIMO_POR_REVISAR);

      const filas = within(seccion('Por revisar')).getAllByRole('listitem');
      expect(filas).toHaveLength(v.por_revisar.length);
      for (const [i, t] of v.por_revisar.entries()) {
        expect(filas[i]).toHaveTextContent(t.id_legible);
        expect(filas[i]).toHaveTextContent(t.titulo);
        expect(filas[i]).toHaveTextContent(t.proyecto.nombre);
        expect(filas[i]).toHaveTextContent(t.responsable ?? 'Sin asignar');
      }
    });

    it('cada fila es de una sola línea (sin segundo renglón) y su título lleva al detalle donde decide', async () => {
      await mostrar();
      const v = await consulta();

      const filas = within(seccion('Por revisar')).getAllByRole('listitem');
      for (const [i, t] of v.por_revisar.entries()) {
        expect(filas[i]!.querySelectorAll('p')).toHaveLength(0);
        expect(within(filas[i]!).getByRole('link', { name: t.titulo })).toHaveAttribute(
          'href',
          `/supervisor/tareas/${t.id}`,
        );
        expect(filas[i]).toHaveTextContent(/Lleva \d+ días?|Desde hoy/);
      }
    });

    it('sin tareas esperando dice «No tienes tareas esperando tu supervisión»', async () => {
      await mostrar(SUPERVISOR_SIN_COLA);

      expect(
        within(seccion('Por revisar')).getByText('No tienes tareas esperando tu supervisión'),
      ).toBeInTheDocument();
    });
  });

  describe('«Alertas»', () => {
    it('muestran hasta cinco, las mismas de Reportes, con sus acciones', async () => {
      await mostrar();
      const v = await consulta();
      expect(v.alertas.length).toBeGreaterThan(0);
      expect(v.alertas.length).toBeLessThanOrEqual(MAXIMO_ALERTAS);

      const articulos = within(seccion('Alertas')).getAllByRole('article');
      expect(articulos.map((a) => a.getAttribute('aria-label'))).toEqual(
        v.alertas.map((a) => a.titulo),
      );
      expect(
        within(seccion('Alertas')).getAllByRole('link', { name: /^Ver detalle:/ }).length,
      ).toBeGreaterThan(0);
    });

    it('«Ver todas en Reportes» lleva a los Reportes del Supervisor', async () => {
      await mostrar();

      expect(
        within(seccion('Alertas')).getByRole('link', { name: 'Ver todas en Reportes' }),
      ).toHaveAttribute('href', '/supervisor/reportes');
    });

    it('el «Ver detalle» de cada alerta va a las páginas del Supervisor', async () => {
      await mostrar();
      const v = await consulta();

      for (const a of v.alertas) {
        const href = within(seccion('Alertas'))
          .getByRole('link', { name: `Ver detalle: ${a.titulo}` })
          .getAttribute('href')!;
        expect(href.startsWith('/supervisor/')).toBe(true);
      }
    });

    it('marcar una alerta como revisada la saca del Dashboard', async () => {
      const usuario = userEvent.setup();
      await mostrar();
      const v = await consulta();
      const alerta = v.alertas.find((a) => a.puede_marcar_revisado)!;

      await usuario.click(
        within(seccion('Alertas')).getByRole('button', {
          name: `Marcar como revisado: ${alerta.titulo}`,
        }),
      );
      const dialogo = await screen.findByRole('dialog', { name: 'Marcar como revisado' });
      await usuario.click(within(dialogo).getByRole('button', { name: 'Marcar como revisado' }));

      await waitFor(() =>
        expect(
          within(seccion('Alertas')).queryByRole('article', { name: alerta.titulo }),
        ).toBeNull(),
      );
    });

    it('sin alertas dice «No hay alertas en tus proyectos» y mantiene el enlace a Reportes', async () => {
      const todas = await listarInsights({ idActor: SUPERVISOR }, entorno);
      if (!todas.ok) throw new Error(todas.mensaje);
      for (const i of todas.valor.insights.filter((x) => x.puede_marcar_revisado)) {
        await marcarInsightRevisado(
          { idActor: SUPERVISOR, tipo_regla: i.tipo_regla, elemento: i.elemento, nota: null },
          entorno,
        );
      }
      await mostrar();

      expect(
        within(seccion('Alertas')).getByText('No hay alertas en tus proyectos'),
      ).toBeInTheDocument();
      expect(within(seccion('Alertas')).queryAllByRole('article')).toHaveLength(0);
      expect(
        within(seccion('Alertas')).getByRole('link', { name: 'Ver todas en Reportes' }),
      ).toBeInTheDocument();
    });
  });

  describe('reuniones y avance', () => {
    it('una reunión y una barra por cada proyecto sin finalizar', async () => {
      await mostrar();
      const v = await consulta();

      expect(within(seccion('Próximas reuniones')).getAllByRole('listitem')).toHaveLength(
        v.proximas_reuniones.length,
      );
      expect(within(seccion('Avance de mis proyectos')).getAllByRole('progressbar')).toHaveLength(
        v.avance_proyectos.length,
      );
    });

    it('los enlaces de proyecto van a su panel', async () => {
      await mostrar();

      for (const e of [
        ...within(seccion('Próximas reuniones')).getAllByRole('link'),
        ...within(seccion('Avance de mis proyectos')).getAllByRole('link'),
      ]) {
        expect(e.getAttribute('href')).toMatch(/^\/supervisor\/proyectos\//);
      }
    });
  });

  describe('estados vacíos', () => {
    it('un supervisor sin proyectos ve un solo mensaje y ninguna tarjeta', async () => {
      useAlmacen.getState().transaccion((d) => ({
        proyectos: d.proyectos.filter((p) => p.id_supervisor !== SUPERVISOR),
      }));
      await mostrar();

      expect(
        await screen.findByText('El Administrador aún no te ha asignado proyectos'),
      ).toBeInTheDocument();
      expect(screen.queryAllByRole('article')).toHaveLength(0);
      expect(screen.queryByRole('region', { name: 'Por revisar' })).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('con solo proyectos finalizados se muestran las cuatro tarjetas, la de proyectos activos en cero', async () => {
      const mios = datos()
        .proyectos.filter((p) => p.id_supervisor === SUPERVISOR)
        .map((p) => p.id);
      useAlmacen.getState().transaccion((d) => ({
        proyectos: d.proyectos.map((p) =>
          mios.includes(p.id) ? { ...p, estado: 'FINALIZADO' as const } : p,
        ),
        tareas: d.tareas.filter((t) => !mios.includes(t.id_proyecto)),
      }));
      await mostrar();

      expect(screen.queryByText('El Administrador aún no te ha asignado proyectos')).toBeNull();
      expect(screen.getAllByRole('article').length).toBeGreaterThanOrEqual(4);
      expect(tarjeta(T_PROYECTOS)).toHaveTextContent(/^Mis proyectos activos0/);
      expect(tarjeta(T_ESPERANDO).className).not.toContain('state-warning');
      expect(tarjeta(T_VENCIDAS).className).not.toContain('state-danger');
    });
  });

  it('ningún dato de proyectos de otros supervisores llega a la pantalla', async () => {
    await mostrar();

    const ajenos = datos().proyectos.filter((p) => p.id_supervisor !== SUPERVISOR);
    expect(ajenos.length).toBeGreaterThan(0);
    for (const p of ajenos) {
      expect(screen.queryByText(p.nombre)).toBeNull();
      expect(screen.queryByText(p.codigo)).toBeNull();
    }
  });
});

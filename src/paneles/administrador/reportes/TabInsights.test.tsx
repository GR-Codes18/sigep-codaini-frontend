import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, listarInsights } from '@/services';
import { PaginaReportes } from './PaginaReportes';

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

function Ubicacion() {
  const l = useLocation();
  return <p data-testid="ubicacion">{`${l.pathname}${l.search}`}</p>;
}

async function mostrar(busqueda = '') {
  render(
    <MemoryRouter initialEntries={[`/administrador/reportes${busqueda}`]}>
      <Routes>
        <Route path="/administrador/reportes" element={<PaginaReportes entorno={entorno} />} />
        <Route path="/administrador/*" element={<p>Detalle abierto</p>} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando los insights' })).toBeNull(),
  );
}

async function consultar(idActor: Id = ADMIN) {
  const r = await listarInsights({ idActor }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

const tarjetas = () => screen.queryAllByRole('article');
const tarjeta = (titulo: string) => screen.getByRole('article', { name: titulo });

describe('Reportes: pestaña «Insights»', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('abre en «Insights» y ofrece las dos pestañas', async () => {
    await mostrar();

    expect(screen.getByRole('tab', { name: 'Insights' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByRole('tab', { name: 'Indicadores' })).toBeVisible();
  });

  it('mientras llega la consulta muestra un estado de carga', () => {
    void mostrar();

    expect(screen.getByRole('status', { name: 'Cargando los insights' })).toBeInTheDocument();
  });

  it('lista los insights activos, en el orden de la consulta (severidad y antigüedad)', async () => {
    const { insights } = await consultar();
    const activos = insights.filter((i) => !i.revisado);
    expect(activos.length).toBeGreaterThan(0);
    await mostrar();

    expect(tarjetas().map((t) => t.getAttribute('aria-label'))).toEqual(
      activos.map((i) => i.titulo),
    );
  });

  it('cada tarjeta trae severidad, tipo, título, motivo, fecha de detección y proyectos', async () => {
    const { insights } = await consultar();
    const insight = insights.find((i) => !i.revisado && i.proyectos.length > 0)!;
    await mostrar();

    const t = tarjeta(insight.titulo);
    expect(t).toHaveTextContent(insight.motivo);
    expect(t).toHaveTextContent('Detectado el');
    for (const p of insight.proyectos) expect(t).toHaveTextContent(p.nombre);
    expect(within(t).getByText(/^(Crítico|Atención|Informativo)$/)).toBeVisible();
  });

  it('las siete reglas pueden aparecer: el filtro por tipo las ofrece todas', async () => {
    await mostrar();

    const opciones = within(screen.getByLabelText('Tipo') as HTMLElement)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(opciones).toEqual([
      'Todos',
      'Practicante inactivo',
      'Carga desbalanceada',
      'Posible atraso del proyecto',
      'Proyecto sin actividad',
      'Supervisión demorada',
      'Postulaciones sin decidir',
      'Fin de práctica',
    ]);
  });

  describe('filtros', () => {
    it('por severidad', async () => {
      const user = userEvent.setup();
      const { insights } = await consultar();
      const severidad = insights.find((i) => !i.revisado)!.severidad;
      await mostrar();

      await user.selectOptions(screen.getByLabelText('Severidad'), severidad);

      expect(tarjetas()).toHaveLength(
        insights.filter((i) => !i.revisado && i.severidad === severidad).length,
      );
    });

    it('por tipo', async () => {
      const user = userEvent.setup();
      const { insights } = await consultar();
      const tipo = insights.find((i) => !i.revisado)!.tipo_regla;
      await mostrar();

      await user.selectOptions(screen.getByLabelText('Tipo'), tipo);

      expect(tarjetas()).toHaveLength(
        insights.filter((i) => !i.revisado && i.tipo_regla === tipo).length,
      );
    });

    it('por proyecto', async () => {
      const user = userEvent.setup();
      const { insights } = await consultar();
      const proyecto = insights.flatMap((i) => i.proyectos)[0]!;
      await mostrar();

      await user.selectOptions(screen.getByLabelText('Proyecto'), proyecto.id);

      expect(tarjetas()).toHaveLength(
        insights.filter((i) => !i.revisado && i.proyectos.some((p) => p.id === proyecto.id)).length,
      );
    });

    it('por estado: «Activos» abre con el contador, «Revisados» y «Todos» cambian la lista', async () => {
      const user = userEvent.setup();
      const { contadores } = await consultar();
      await mostrar();

      const estado = screen.getByLabelText('Estado');
      expect(
        within(estado).getByRole('option', { name: `Activos (${contadores.ACTIVOS})` }),
      ).toBeVisible();
      await user.selectOptions(estado, 'TODOS');
      expect(tarjetas()).toHaveLength(contadores.TODOS);
    });

    it('sin coincidencias lo dice y sugiere cambiar los filtros', async () => {
      const user = userEvent.setup();
      const { insights } = await consultar();
      const sinCritico = !insights.some((i) => i.severidad === 'CRITICO');
      await mostrar();

      await user.selectOptions(screen.getByLabelText('Tipo'), 'POSTULACIONES_SIN_DECIDIR');
      await user.selectOptions(
        screen.getByLabelText('Severidad'),
        sinCritico ? 'CRITICO' : 'INFORMATIVO',
      );
      await user.selectOptions(
        screen.getByLabelText('Proyecto'),
        insights.flatMap((i) => i.proyectos)[0]!.id,
      );

      expect(screen.getByText('Ninguna alerta coincide con los filtros')).toBeInTheDocument();
    });
  });

  describe('estados vacíos', () => {
    it('sin alertas lo dice', async () => {
      useAlmacen.getState().transaccion((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.rol === 'PRACTICANTE' ? { ...u, estado: 'INACTIVO' as const } : u,
        ),
        proyectos: [],
        asignaciones: [],
        tareas: [],
        postulantes: [],
      }));
      await mostrar();

      expect(screen.getByText('No hay alertas')).toBeInTheDocument();
    });

    it('«Revisados» sin ninguna lo dice', async () => {
      const user = userEvent.setup();
      // La semilla trae una revisión del Administrador: se quita para este caso.
      useAlmacen.getState().transaccion(() => ({ revisiones_insight: [] }));
      await mostrar();

      await user.selectOptions(screen.getByLabelText('Estado'), 'REVISADOS');

      expect(screen.getByText('Aún no hay alertas revisadas')).toBeInTheDocument();
    });
  });

  describe('ver detalle', () => {
    it('lleva al detalle del elemento afectado', async () => {
      const user = userEvent.setup();
      const { insights } = await consultar();
      const insight = insights.find((i) => !i.revisado && i.elemento.tipo === 'USUARIO')!;
      await mostrar();

      await user.click(
        within(tarjeta(insight.titulo)).getByRole('link', {
          name: `Ver detalle: ${insight.titulo}`,
        }),
      );

      expect(screen.getByTestId('ubicacion')).toHaveTextContent(
        `/administrador/practicantes/${insight.elemento.id}`,
      );
    });
  });

  describe('marcar como revisado', () => {
    it('lo saca de la lista activa y lo guarda como revisión de quien actúa, con la nota', async () => {
      const user = userEvent.setup();
      const { insights } = await consultar();
      const insight = insights.find((i) => !i.revisado && i.puede_marcar_revisado)!;
      await mostrar();

      await user.click(
        within(tarjeta(insight.titulo)).getByRole('button', {
          name: `Marcar como revisado: ${insight.titulo}`,
        }),
      );
      const dialogo = await screen.findByRole('dialog', { name: 'Marcar como revisado' });
      await user.type(within(dialogo).getByLabelText(/Nota/), 'Ya hablé con el equipo');
      await user.click(within(dialogo).getByRole('button', { name: 'Marcar como revisado' }));

      await waitFor(() => expect(datos().revisiones_insight.length).toBeGreaterThan(0));
      const revision = datos().revisiones_insight.at(-1)!;
      expect(revision.id_usuario).toBe(ADMIN);
      expect(revision.tipo_regla).toBe(insight.tipo_regla);
      expect(revision.elemento).toEqual(insight.elemento);
      expect(revision.nota).toBe('Ya hablé con el equipo');
      await waitFor(() =>
        expect(screen.queryByRole('article', { name: insight.titulo })).toBeNull(),
      );
      await user.selectOptions(screen.getByLabelText('Estado'), 'REVISADOS');
      expect(within(tarjeta(insight.titulo)).getByText('Revisado')).toBeVisible();
    });

    it('la nota es opcional', async () => {
      const user = userEvent.setup();
      const { insights } = await consultar();
      const insight = insights.find((i) => !i.revisado && i.puede_marcar_revisado)!;
      await mostrar();
      await user.click(
        within(tarjeta(insight.titulo)).getByRole('button', {
          name: `Marcar como revisado: ${insight.titulo}`,
        }),
      );
      const dialogo = await screen.findByRole('dialog', { name: 'Marcar como revisado' });

      expect(within(dialogo).getByRole('button', { name: 'Marcar como revisado' })).toBeEnabled();
      await user.click(within(dialogo).getByRole('button', { name: 'Marcar como revisado' }));

      await waitFor(() => expect(datos().revisiones_insight.at(-1)?.nota).toBeNull());
    });

    it('es independiente por persona: el Supervisor lo sigue viendo activo', async () => {
      const user = userEvent.setup();
      const delSupervisor = (await consultar(SUPERVISOR)).insights;
      const compartido = (await consultar()).insights.find(
        (i) =>
          !i.revisado &&
          i.puede_marcar_revisado &&
          delSupervisor.some(
            (s) => s.tipo_regla === i.tipo_regla && s.elemento.id === i.elemento.id && !s.revisado,
          ),
      );
      expect(compartido).toBeDefined();
      await mostrar();
      await user.click(
        within(tarjeta(compartido!.titulo)).getByRole('button', {
          name: `Marcar como revisado: ${compartido!.titulo}`,
        }),
      );
      const dialogo = await screen.findByRole('dialog', { name: 'Marcar como revisado' });
      await user.click(within(dialogo).getByRole('button', { name: 'Marcar como revisado' }));
      await waitFor(() => expect(datos().revisiones_insight.length).toBeGreaterThan(0));

      const despues = (await consultar(SUPERVISOR)).insights.find(
        (s) => s.tipo_regla === compartido!.tipo_regla && s.elemento.id === compartido!.elemento.id,
      );

      expect(despues?.revisado).toBe(false);
    });

    it('cancelar no escribe nada', async () => {
      const user = userEvent.setup();
      const { insights } = await consultar();
      const insight = insights.find((i) => !i.revisado && i.puede_marcar_revisado)!;
      const antes = datos().revisiones_insight;
      await mostrar();
      await user.click(
        within(tarjeta(insight.titulo)).getByRole('button', {
          name: `Marcar como revisado: ${insight.titulo}`,
        }),
      );
      const dialogo = await screen.findByRole('dialog', { name: 'Marcar como revisado' });

      await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(datos().revisiones_insight).toBe(antes);
    });
  });

  describe('notificar', () => {
    function notificable() {
      return listarInsights({ idActor: ADMIN }, entorno).then((r) => {
        if (!r.ok) throw new Error(r.mensaje);
        return r.valor.insights.find(
          (i) => !i.revisado && i.puede_notificar && i.tipo_regla === 'PRACTICANTE_INACTIVO',
        )!;
      });
    }

    it('solo se ofrece en inactividad y en supervisión demorada', async () => {
      const { insights } = await consultar();
      await mostrar();

      for (const i of insights.filter((x) => !x.revisado)) {
        const boton = within(tarjeta(i.titulo)).queryByRole('button', {
          name: `Notificar: ${i.titulo}`,
        });
        const esperado =
          i.tipo_regla === 'PRACTICANTE_INACTIVO' || i.tipo_regla === 'SUPERVISION_DEMORADA';
        expect(boton !== null, i.titulo).toBe(esperado);
      }
    });

    it('avisa al practicante afectado con el título y el motivo, y no cambia el insight', async () => {
      const user = userEvent.setup();
      const insight = await notificable();
      expect(insight).toBeDefined();
      const avisosAntes = datos().notificaciones.length;
      await mostrar();

      await user.click(
        within(tarjeta(insight.titulo)).getByRole('button', {
          name: `Notificar: ${insight.titulo}`,
        }),
      );
      const dialogo = await screen.findByRole('dialog', { name: 'Notificar' });
      await user.click(within(dialogo).getByRole('button', { name: 'Notificar' }));

      await waitFor(() => expect(datos().notificaciones.length).toBeGreaterThan(avisosAntes));
      const aviso = datos().notificaciones.at(-1)!;
      expect(aviso.id_destinatario).toBe(insight.elemento.id);
      expect(aviso.tipo).toBe('NOTIFICACION_DESDE_INSIGHT');
      expect(aviso.mensaje).toContain(insight.titulo);
      expect(aviso.mensaje).toContain(insight.motivo);
      expect(screen.getByRole('article', { name: insight.titulo })).toBeInTheDocument();
    });

    it('cancelar no escribe nada', async () => {
      const user = userEvent.setup();
      const insight = await notificable();
      const antes = datos().notificaciones;
      await mostrar();
      await user.click(
        within(tarjeta(insight.titulo)).getByRole('button', {
          name: `Notificar: ${insight.titulo}`,
        }),
      );
      const dialogo = await screen.findByRole('dialog', { name: 'Notificar' });

      await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(datos().notificaciones).toBe(antes);
    });

    it('si la condición deja de cumplirse con el diálogo abierto, el servicio lo rechaza sin escribir', async () => {
      const user = userEvent.setup();
      const insight = await notificable();
      await mostrar();
      await user.click(
        within(tarjeta(insight.titulo)).getByRole('button', {
          name: `Notificar: ${insight.titulo}`,
        }),
      );
      const dialogo = await screen.findByRole('dialog', { name: 'Notificar' });
      // El practicante finaliza su práctica: la alerta desaparece (los insights no se guardan: se calculan).
      useAlmacen.getState().transaccion((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === insight.elemento.id ? { ...u, estado: 'INACTIVO' as const } : u,
        ),
      }));
      const antes = datos().notificaciones;

      await user.click(within(dialogo).getByRole('button', { name: 'Notificar' }));

      expect(await within(dialogo).findByRole('alert')).toBeInTheDocument();
      expect(datos().notificaciones).toBe(antes);
    });
  });
});

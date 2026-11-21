import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, obtenerProyecto, obtenerResumenProyectoAnterior } from '@/services';
import { PaginaDetalleTareaPracticante } from './PaginaDetalleTareaPracticante';
import { PaginaProyectoAnterior } from './PaginaProyectoAnterior';

const PRACTICANTE = 'demo-practicante'; // en pry-pl2d
const CON_ANTERIOR = 'usr-pra-03'; // salió de pry-tie («Ya no participas»)
const SOLO_FINALIZADO = 'usr-pra-15'; // pry-tie finalizado
const VIGENTE = 'pry-pl2d';
const AJENO = 'pry-rsv';
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

async function mostrarAnterior(idUsuario: Id, idProyecto: Id) {
  iniciarSesion(idUsuario);
  render(
    <MemoryRouter initialEntries={[`/practicante/proyectos/${idProyecto}/anterior`]}>
      <Routes>
        <Route
          path="/practicante/proyectos/:idProyecto/anterior"
          element={<PaginaProyectoAnterior entorno={entorno} />}
        />
        <Route path="/practicante/proyectos/:idProyecto" element={<p>Detalle abierto</p>} />
        <Route path="/practicante/historial" element={<p>Historial abierto</p>} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
}

describe('Resumen mínimo de un proyecto anterior (§9.2.1)', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('muestra los datos del proyecto, mi periodo y las tareas que terminé ahí', async () => {
    const r = await obtenerResumenProyectoAnterior(
      { idActor: SOLO_FINALIZADO, idProyecto: ANTERIOR },
      entorno,
    );
    if (!r.ok || r.valor.participacion === null) throw new Error('sin datos');
    await mostrarAnterior(SOLO_FINALIZADO, ANTERIOR);

    expect(
      await screen.findByRole('heading', { name: r.valor.proyecto.nombre }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Descripción' })).toHaveTextContent(
      r.valor.proyecto.descripcion,
    );
    const proyecto = screen.getByRole('region', { name: 'Datos del proyecto' });
    expect(proyecto).toHaveTextContent(r.valor.proyecto.supervisor.nombre);
    const participacion = screen.getByRole('region', { name: 'Mi participación' });
    expect(participacion).toHaveTextContent('Periodo');
    expect(participacion).toHaveTextContent(String(r.valor.participacion.tareas_terminadas));
  });

  it('lleva la etiqueta «Finalizado» o «Ya no participas» según el caso', async () => {
    await mostrarAnterior(SOLO_FINALIZADO, ANTERIOR);
    expect(await screen.findByText('Finalizado')).toBeInTheDocument();
  });

  it('«Ya no participas» para quien salió del proyecto', async () => {
    await mostrarAnterior(CON_ANTERIOR, ANTERIOR);

    expect(await screen.findByText('Ya no participas')).toBeInTheDocument();
  });

  it('enlaza a Mi historial filtrado por ese proyecto', async () => {
    await mostrarAnterior(SOLO_FINALIZADO, ANTERIOR);

    expect(
      await screen.findByRole('link', { name: 'Ver mis tareas terminadas en Mi historial' }),
    ).toHaveAttribute('href', `/practicante/historial?proyecto=${ANTERIOR}`);
  });

  it('no abre el tablero ni el equipo: no hay pestañas ni acciones', async () => {
    await mostrarAnterior(SOLO_FINALIZADO, ANTERIOR);
    await screen.findByRole('region', { name: 'Datos del proyecto' });

    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('note')).toHaveTextContent(/no puedes abrir su tablero ni su equipo/);
    expect(screen.queryByText('Solo mis tareas')).toBeNull();
  });

  it('un proyecto vigente redirige a su detalle', async () => {
    await mostrarAnterior(PRACTICANTE, VIGENTE);

    expect(await screen.findByText('Detalle abierto')).toBeInTheDocument();
  });

  it('un proyecto ajeno no muestra nada', async () => {
    const ajeno = datos().proyectos.find((p) => p.id === AJENO)!;
    await mostrarAnterior(PRACTICANTE, AJENO);

    expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró el proyecto.');
    expect(screen.queryByText(ajeno.nombre)).toBeNull();
  });
});

describe('Detalle de una tarea del Practicante (§6.7)', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  async function mostrarTarea(idTarea: Id, entradas?: string[], indice?: number) {
    iniciarSesion(PRACTICANTE);
    render(
      <MemoryRouter
        initialEntries={entradas ?? [`/practicante/proyectos/tareas/${idTarea}`]}
        initialIndex={indice ?? 0}
      >
        <Routes>
          <Route
            path="/practicante/proyectos/tareas/:idTarea"
            element={<PaginaDetalleTareaPracticante entorno={entorno} />}
          />
          <Route path="/practicante/proyectos" element={<p>Listado abierto</p>} />
        </Routes>
        <Ubicacion />
      </MemoryRouter>,
    );
  }

  async function miTarea() {
    const r = await obtenerProyecto({ idActor: PRACTICANTE, idProyecto: VIGENTE }, entorno);
    if (!r.ok || r.valor.vista !== 'PRACTICANTE') throw new Error('sin datos');
    return r.valor.mis_tareas.find((t) => t.estado === 'EN_PROGRESO')!;
  }

  it('una tarea propia ofrece sus acciones (el detalle compartido las decide)', async () => {
    const t = await miTarea();
    await mostrarTarea(t.id);

    expect(await screen.findByText(t.titulo)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Liberar' })).toBeInTheDocument();
  });

  it('una tarea de un compañero es de solo lectura, sin botones de acción', async () => {
    const mia = await miTarea();
    const ajena = datos().tareas.find(
      (x) =>
        x.id_proyecto === VIGENTE &&
        x.estado === 'EN_PROGRESO' &&
        x.id_practicante !== null &&
        x.id_practicante !== PRACTICANTE &&
        x.id !== mia.id,
    )!;
    await mostrarTarea(ajena.id);

    expect(await screen.findByText(ajena.titulo)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /liberar|enviar|terminada|tomar|crear pull|editar/i }),
    ).toBeNull();
  });

  it('una tarea de un proyecto ajeno no muestra nada', async () => {
    const ajena = datos().tareas.find((x) => x.id_proyecto === AJENO)!;
    await mostrarTarea(ajena.id);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(ajena.titulo)).toBeNull();
  });

  it('«Volver» regresa a donde estaba (el tablero o los avisos)', async () => {
    const usuario = userEvent.setup();
    const t = await miTarea();
    await mostrarTarea(
      t.id,
      ['/practicante/proyectos', `/practicante/proyectos/tareas/${t.id}`],
      1,
    );

    await usuario.click(await screen.findByRole('button', { name: 'Volver' }));

    expect(await screen.findByText('Listado abierto')).toBeInTheDocument();
  });

  it('si se abrió la dirección directamente, «Volver» lleva a «Mis proyectos»', async () => {
    const usuario = userEvent.setup();
    const t = await miTarea();
    await mostrarTarea(t.id);

    await usuario.click(await screen.findByRole('button', { name: 'Volver' }));

    await waitFor(() =>
      expect(within(document.body).getByTestId('ubicacion')).toHaveTextContent(
        '/practicante/proyectos',
      ),
    );
    expect(await screen.findByText('Listado abierto')).toBeInTheDocument();
  });
});

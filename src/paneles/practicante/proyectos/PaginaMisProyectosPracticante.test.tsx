import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, listarMisProyectos } from '@/services';
import { PaginaMisProyectosPracticante } from './PaginaMisProyectosPracticante';

const UNO = 'demo-practicante'; // un proyecto vigente
const DOS = 'usr-pra-06'; // dos proyectos vigentes
const EN_PAUSA = 'usr-pra-09'; // un proyecto en pausa
const CON_ANTERIOR = 'usr-pra-03'; // uno vigente y uno que dejó («Ya no participas»)
const SOLO_FINALIZADO = 'usr-pra-15'; // solo uno finalizado
const SIN_NADA = 'usr-pra-21';

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

async function mostrar(idUsuario: Id) {
  iniciarSesion(idUsuario);
  render(
    <MemoryRouter initialEntries={['/practicante/proyectos']}>
      <Routes>
        <Route
          path="/practicante/proyectos"
          element={<PaginaMisProyectosPracticante entorno={entorno} />}
        />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando proyectos' })).toBeNull(),
  );
}

async function consulta(idActor: Id) {
  const r = await listarMisProyectos({ idActor }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

const tarjeta = (nombre: string) => screen.getByRole('link', { name: new RegExp(nombre) });
const nombreDe = (id: Id) => datos().proyectos.find((p) => p.id === id)!.nombre;

describe('Mis proyectos del Practicante (§9.2.1)', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('muestra sus proyectos vigentes en tarjetas, sin pestañas ni búsqueda', async () => {
    await mostrar(UNO);
    const v = await consulta(UNO);

    expect(screen.getByRole('heading', { name: 'Mis proyectos' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(v.vigentes.length);
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('cada tarjeta trae nombre, código, estado, supervisor, mi carga, tareas disponibles, avance y reunión', async () => {
    await mostrar(UNO);
    const p = (await consulta(UNO)).vigentes[0]!;

    const t = tarjeta(p.nombre);
    expect(t).toHaveTextContent(p.codigo);
    expect(t).toHaveTextContent('Activo');
    expect(t).toHaveTextContent(p.supervisor.nombre);
    expect(t).toHaveTextContent(`Mi carga${p.mi_carga}`);
    expect(t).toHaveTextContent(`Disponibles para tomar${p.tareas_disponibles}`);
    expect(t).toHaveTextContent('Próxima reunión');
    expect(t).toHaveTextContent(/Avance \d+%/);
  });

  it('un practicante en dos proyectos ve dos tarjetas', async () => {
    await mostrar(DOS);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('un proyecto en pausa también aparece entre los vigentes, con su etiqueta', async () => {
    await mostrar(EN_PAUSA);
    const p = (await consulta(EN_PAUSA)).vigentes[0]!;

    expect(tarjeta(p.nombre)).toHaveTextContent('En pausa');
  });

  it('las tarjetas son compactas y la rejilla es de 1 y 2 columnas, sin saltar a 3', async () => {
    await mostrar(DOS);

    const lista = screen.getAllByRole('listitem')[0]!.parentElement!;
    expect(lista.className).toContain('sm:grid-cols-2');
    expect(lista.className).not.toContain('grid-cols-3');
    for (const li of screen.getAllByRole('listitem')) {
      expect(within(li).getByRole('link').className).toContain('p-3');
      expect(within(li).getByRole('link').className).not.toContain('p-4');
    }
  });

  it('sin proyectos anteriores no hay sección «Anteriores»', async () => {
    await mostrar(UNO);

    expect(screen.queryByRole('region', { name: 'Anteriores' })).toBeNull();
  });

  it('«Anteriores»: un proyecto que dejó dice «Ya no participas», va atenuado y sin barra, carga ni reunión', async () => {
    await mostrar(CON_ANTERIOR);
    const v = await consulta(CON_ANTERIOR);
    const anterior = v.anteriores.find((a) => a.motivo === 'YA_NO_PARTICIPAS')!;

    const region = screen.getByRole('region', { name: 'Anteriores' });
    const t = within(region).getByRole('link', { name: new RegExp(anterior.nombre) });
    expect(t).toHaveTextContent('Ya no participas');
    expect(t).toHaveTextContent(anterior.supervisor.nombre);
    expect(t).toHaveTextContent('Participaste');
    expect(t.className).toContain('opacity-60');
    expect(t.textContent ?? '').not.toMatch(/Avance|Mi carga|reunión/);
    expect(within(region).queryByRole('progressbar')).toBeNull();
  });

  it('«Anteriores»: un proyecto finalizado dice «Finalizado»', async () => {
    await mostrar(SOLO_FINALIZADO);
    const a = (await consulta(SOLO_FINALIZADO)).anteriores[0]!;

    expect(tarjeta(a.nombre)).toHaveTextContent('Finalizado');
  });

  it('con solo proyectos anteriores dice que no tiene activos, sin el mensaje de vacío total', async () => {
    await mostrar(SOLO_FINALIZADO);

    expect(screen.getByText('No tienes proyectos activos.')).toBeInTheDocument();
    expect(screen.queryByText('Aún no tienes proyectos asignados')).toBeNull();
    expect(screen.getByRole('region', { name: 'Anteriores' })).toBeInTheDocument();
  });

  it('sin ningún proyecto dice «Aún no tienes proyectos asignados» y que el Administrador le asignará uno', async () => {
    await mostrar(SIN_NADA);

    expect(await screen.findByText('Aún no tienes proyectos asignados')).toBeInTheDocument();
    expect(screen.getByText('El Administrador te asignará uno.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('las tarjetas llevan al detalle y, las anteriores, a su resumen mínimo', async () => {
    await mostrar(CON_ANTERIOR);
    const v = await consulta(CON_ANTERIOR);

    expect(tarjeta(v.vigentes[0]!.nombre)).toHaveAttribute(
      'href',
      `/practicante/proyectos/${v.vigentes[0]!.id}`,
    );
    expect(tarjeta(v.anteriores[0]!.nombre)).toHaveAttribute(
      'href',
      `/practicante/proyectos/${v.anteriores[0]!.id}/anterior`,
    );
  });

  it('ningún dato de proyectos ajenos llega a la pantalla', async () => {
    await mostrar(UNO);
    const v = await consulta(UNO);
    const propios = new Set([...v.vigentes.map((p) => p.id), ...v.anteriores.map((p) => p.id)]);

    for (const p of datos().proyectos.filter((x) => !propios.has(x.id))) {
      expect(screen.queryByText(p.nombre)).toBeNull();
      expect(screen.queryByText(p.codigo)).toBeNull();
    }
    expect(
      screen.getByRole('link', { name: new RegExp(nombreDe('pry-pl2d')) }),
    ).toBeInTheDocument();
  });
});

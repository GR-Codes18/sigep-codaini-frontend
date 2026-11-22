import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, listarTareas } from '@/services';
import { filtrosDeLaDireccion } from './filtros';
import { PaginaTareas } from './PaginaTareas';

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

async function mostrar(busqueda: string) {
  iniciarSesion(SUPERVISOR);
  render(
    <MemoryRouter initialEntries={[`/supervisor/tareas${busqueda}`]}>
      <Routes>
        <Route path="/supervisor/tareas" element={<PaginaTareas entorno={entorno} />} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Cargando tareas' })).toBeNull());
  await screen.findAllByRole('tab');
}

async function tareas() {
  const r = await listarTareas({ idActor: SUPERVISOR }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor.tareas;
}

const filas = () => screen.queryAllByRole('row').slice(1);
const casilla = (nombre: string) => screen.getByRole('checkbox', { name: nombre });

describe('filtrosDeLaDireccion', () => {
  const con = (consulta: string) => filtrosDeLaDireccion(new URLSearchParams(consulta));

  it('«vencidas=1» y «sin_asignar=1» activan su filtro', () => {
    expect(con('vencidas=1')).toEqual({ soloVencidas: true });
    expect(con('sin_asignar=1')).toEqual({ soloSinAsignar: true });
    expect(con('vencidas=1&sin_asignar=1')).toEqual({ soloVencidas: true, soloSinAsignar: true });
  });

  it('cualquier otro valor se ignora, sin error', () => {
    expect(con('')).toEqual({});
    expect(con('vencidas=0')).toEqual({});
    expect(con('vencidas=si')).toEqual({});
    expect(con('vencidas=')).toEqual({});
    expect(con('sin_asignar=true')).toEqual({});
    expect(con('otra=1')).toEqual({});
  });
});

describe('Tareas: filtros que llegan por la dirección (§9.1.5)', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('«vencidas=1» deja la casilla «Vencidas» marcada y solo las tareas vencidas', async () => {
    const vencidas = (await tareas()).filter((t) => t.vencida);
    expect(vencidas.length).toBeGreaterThan(0);

    await mostrar('?pestana=TODAS&vencidas=1');

    expect(casilla('Vencidas')).toBeChecked();
    expect(casilla('Sin asignar')).not.toBeChecked();
    expect(filas()).toHaveLength(vencidas.length);
  });

  it('el filtro que llega se puede quitar', async () => {
    const usuario = userEvent.setup();
    const todas = await tareas();
    await mostrar('?pestana=TODAS&vencidas=1');

    await usuario.click(casilla('Vencidas'));

    expect(casilla('Vencidas')).not.toBeChecked();
    await waitFor(() => expect(filas()).toHaveLength(todas.length));
  });

  it('«sin_asignar=1» marca «Sin asignar» y se combina con las vencidas', async () => {
    const esperadas = (await tareas()).filter((t) => t.vencida && t.id_practicante === null);

    await mostrar('?pestana=TODAS&vencidas=1&sin_asignar=1');

    expect(casilla('Vencidas')).toBeChecked();
    expect(casilla('Sin asignar')).toBeChecked();
    expect(filas()).toHaveLength(esperadas.length);
  });

  it('un valor inválido se ignora y abre la vista normal, sin error', async () => {
    const todas = await tareas();

    await mostrar('?pestana=TODAS&vencidas=si&sin_asignar=quizas');

    expect(casilla('Vencidas')).not.toBeChecked();
    expect(casilla('Sin asignar')).not.toBeChecked();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(filas()).toHaveLength(todas.length);
  });

  it('sin parámetros se comporta como siempre: ningún filtro marcado', async () => {
    await mostrar('');

    expect(casilla('Vencidas')).not.toBeChecked();
    expect(casilla('Sin asignar')).not.toBeChecked();
    expect(casilla('Requiere supervisión')).not.toBeChecked();
  });
});

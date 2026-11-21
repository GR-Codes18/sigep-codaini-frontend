import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { crearSemilla } from '@/data/semilla';
import { useAlmacen } from '@/data';
import type { Notificacion } from '@/domain';
import { CampanaConectada } from './CampanaConectada';

// Las consultas simulan una demora de red de 600 ms.
const ESPERA = { timeout: 4000 };

const datosIniciales = crearSemilla(new Date('2026-11-17T18:30:00.000Z'));
const practicante = datosIniciales.usuarios.find((item) => item.rol === 'PRACTICANTE');
if (!practicante) throw new Error('La semilla debe incluir un practicante.');

function aviso(numero: number, cambios: Partial<Notificacion> = {}): Notificacion {
  return {
    id: `ntf-campana-${String(numero).padStart(2, '0')}`,
    id_destinatario: practicante!.id,
    tipo: 'TAREA_APROBADA',
    mensaje: `Aviso ${numero}`,
    elemento: { tipo: 'TAREA', id: datosIniciales.tareas[0].id },
    fecha: `2026-11-17T10:${String(numero).padStart(2, '0')}:00.000Z`,
    leida: false,
    ...cambios,
  };
}

function renderizar() {
  render(
    <MemoryRouter initialEntries={['/practicante/inicio']}>
      <CampanaConectada />
      <Routes>
        <Route path="/practicante/inicio" element={<p>Inicio</p>} />
        <Route path="/practicante/notificaciones" element={<p>Página de notificaciones</p>} />
        <Route path="/practicante/proyectos/tareas/:idTarea" element={<p>Detalle de la tarea</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function ponerAvisos(avisos: Notificacion[]) {
  useAlmacen.setState({ datos: { ...datosIniciales, notificaciones: avisos } });
}

describe('CampanaConectada', () => {
  beforeEach(() => {
    localStorage.clear();
    ponerAvisos([]);
    useAlmacenSesion.setState({
      usuario: {
        id: practicante.id,
        nombre: practicante.nombre,
        correo: practicante.correo,
        rol: practicante.rol,
        debe_cambiar_contrasena: practicante.debe_cambiar_contrasena,
      },
    });
  });

  it('con 10 sin leer, el punto cuenta las 10 y la lista muestra las últimas 8', async () => {
    const user = userEvent.setup();
    ponerAvisos(Array.from({ length: 10 }, (_, i) => aviso(i + 1)));
    renderizar();

    const campana = await screen.findByRole(
      'button',
      { name: 'Notificaciones (10 sin leer)' },
      ESPERA,
    );
    await user.click(campana);

    expect(screen.getByText('Aviso 10')).toBeInTheDocument();
    expect(screen.getByText('Aviso 3')).toBeInTheDocument();
    expect(screen.queryByText('Aviso 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Aviso 1')).not.toBeInTheDocument();
  });

  it('sin avisos sin leer no hay contador', async () => {
    ponerAvisos([aviso(1, { leida: true })]);
    renderizar();

    await waitFor(
      () => expect(screen.getByRole('button', { name: 'Notificaciones' })).toBeInTheDocument(),
      ESPERA,
    );
    await new Promise((resolver) => setTimeout(resolver, 800));
    expect(screen.getByRole('button', { name: 'Notificaciones' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sin leer/ })).not.toBeInTheDocument();
  });

  it('abrir un aviso lo marca como leído, baja el contador y lleva a su módulo', async () => {
    const user = userEvent.setup();
    ponerAvisos([aviso(1), aviso(2)]);
    renderizar();

    await user.click(
      await screen.findByRole('button', { name: 'Notificaciones (2 sin leer)' }, ESPERA),
    );
    await user.click(screen.getByText('Aviso 2'));

    expect(await screen.findByText('Detalle de la tarea', {}, ESPERA)).toBeInTheDocument();
    expect(
      useAlmacen.getState().datos.notificaciones.find((n) => n.id === aviso(2).id)?.leida,
    ).toBe(true);
    expect(
      await screen.findByRole('button', { name: 'Notificaciones (1 sin leer)' }, ESPERA),
    ).toBeInTheDocument();
  });

  it('un aviso cuyo elemento ya no existe se muestra pero no se puede abrir', async () => {
    const user = userEvent.setup();
    ponerAvisos([aviso(1, { elemento: { tipo: 'TAREA', id: 'tarea-que-no-existe' } })]);
    renderizar();

    await user.click(
      await screen.findByRole('button', { name: 'Notificaciones (1 sin leer)' }, ESPERA),
    );

    expect(screen.getByText('Aviso 1').closest('button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('«Marcar todas como leídas» marca las propias y apaga el punto', async () => {
    const user = userEvent.setup();
    ponerAvisos([aviso(1), aviso(2)]);
    renderizar();

    await user.click(
      await screen.findByRole('button', { name: 'Notificaciones (2 sin leer)' }, ESPERA),
    );
    await user.click(screen.getByText('Marcar todas como leídas'));

    await waitFor(
      () => expect(useAlmacen.getState().datos.notificaciones.every((n) => n.leida)).toBe(true),
      ESPERA,
    );
    await waitFor(
      () => expect(screen.queryByRole('button', { name: /sin leer/ })).not.toBeInTheDocument(),
      ESPERA,
    );
  });

  it('«Ver todas» lleva a la página de notificaciones del panel', async () => {
    const user = userEvent.setup();
    ponerAvisos([aviso(1)]);
    renderizar();

    await user.click(
      await screen.findByRole('button', { name: 'Notificaciones (1 sin leer)' }, ESPERA),
    );
    await user.click(screen.getByText('Ver todas'));

    expect(await screen.findByText('Página de notificaciones')).toBeInTheDocument();
  });
});

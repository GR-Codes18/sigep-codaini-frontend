import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { crearSemilla } from '@/data/semilla';
import { useAlmacen } from '@/data';
import { PaginaNotificaciones } from './PaginaNotificaciones';

// Las consultas simulan una demora de red de 600 ms.
const ESPERA = { timeout: 4000 };

const datosIniciales = crearSemilla(new Date('2026-11-17T18:30:00.000Z'));
const practicante = datosIniciales.usuarios.find((item) => item.rol === 'PRACTICANTE');
const administrador = datosIniciales.usuarios.find((item) => item.rol === 'ADMINISTRADOR');
if (!practicante || !administrador)
  throw new Error('La semilla debe incluir las cuentas de prueba.');

const propia = {
  id: 'ntf-propia-ui',
  id_destinatario: practicante.id,
  tipo: 'TAREA_APROBADA' as const,
  mensaje: 'Aviso propio para validar la conexión.',
  elemento: { tipo: 'TAREA' as const, id: datosIniciales.tareas[0].id },
  fecha: '2026-11-17T18:30:00.000Z',
  leida: false,
};
const ajena = {
  ...propia,
  id: 'ntf-ajena-ui',
  id_destinatario: administrador.id,
  mensaje: 'Este aviso pertenece a otra persona.',
};
const leida = {
  ...propia,
  id: 'ntf-leida-ui',
  mensaje: 'Aviso que ya se leyó.',
  fecha: '2026-11-17T17:00:00.000Z',
  leida: true,
};
const eliminada = {
  ...propia,
  id: 'ntf-eliminada-ui',
  mensaje: 'Aviso de una tarea que ya no existe.',
  fecha: '2026-11-17T16:00:00.000Z',
  elemento: { tipo: 'TAREA' as const, id: 'tarea-que-no-existe' },
};

function renderizar() {
  render(
    <MemoryRouter initialEntries={['/practicante/notificaciones']}>
      <Routes>
        <Route path="/practicante/notificaciones" element={<PaginaNotificaciones />} />
        <Route path="/practicante/proyectos/tareas/:idTarea" element={<p>Detalle de la tarea</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function leidaEnAlmacen(id: string) {
  return useAlmacen.getState().datos.notificaciones.find((item) => item.id === id)?.leida;
}

describe('PaginaNotificaciones', () => {
  beforeEach(() => {
    localStorage.clear();
    useAlmacen.setState({
      datos: { ...datosIniciales, notificaciones: [propia, ajena, leida, eliminada] },
    });
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

  it('mientras llega la consulta muestra un estado de carga', () => {
    renderizar();
    expect(screen.getByRole('status', { name: 'Cargando notificaciones' })).toBeInTheDocument();
  });

  it('muestra solo las notificaciones propias y los contadores de cada pestaña', async () => {
    renderizar();

    expect(
      await screen.findByText('Aviso propio para validar la conexión.', {}, ESPERA),
    ).toBeInTheDocument();
    expect(screen.getByText('Aviso que ya se leyó.')).toBeInTheDocument();
    expect(screen.queryByText('Este aviso pertenece a otra persona.')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Todas/ })).toHaveTextContent('3');
    expect(screen.getByRole('tab', { name: /No leídas/ })).toHaveTextContent('2');
  });

  it('la pestaña «No leídas» deja fuera las ya leídas', async () => {
    const user = userEvent.setup();
    renderizar();
    await screen.findByText('Aviso propio para validar la conexión.', {}, ESPERA);

    await user.click(screen.getByRole('tab', { name: /No leídas/ }));

    expect(await screen.findByText('Aviso propio para validar la conexión.')).toBeInTheDocument();
    expect(screen.queryByText('Aviso que ya se leyó.')).not.toBeInTheDocument();
  });

  it('marca como leídas solo las propias y deja el botón sin efecto cuando no queda nada', async () => {
    const user = userEvent.setup();
    renderizar();
    await screen.findByText('Aviso propio para validar la conexión.', {}, ESPERA);

    await user.click(screen.getByRole('button', { name: 'Marcar todas como leídas' }));

    await waitFor(() => expect(leidaEnAlmacen(propia.id)).toBe(true), ESPERA);
    expect(leidaEnAlmacen(ajena.id)).toBe(false);
    await waitFor(
      () => expect(screen.getByRole('button', { name: 'Marcar todas como leídas' })).toBeDisabled(),
      ESPERA,
    );
  });

  it('abrir un aviso lo marca como leído y lleva a la página de su módulo', async () => {
    const user = userEvent.setup();
    renderizar();
    await user.click(await screen.findByText('Aviso propio para validar la conexión.', {}, ESPERA));

    expect(await screen.findByText('Detalle de la tarea', {}, ESPERA)).toBeInTheDocument();
    expect(leidaEnAlmacen(propia.id)).toBe(true);
  });

  it('si el elemento ya no existe, el texto se conserva y el aviso no se puede abrir', async () => {
    renderizar();

    const boton = (
      await screen.findByText('Aviso de una tarea que ya no existe.', {}, ESPERA)
    ).closest('button');

    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute('aria-disabled', 'true');
  });

  it('refleja una notificación nueva añadida al almacén mientras la vista está abierta', async () => {
    renderizar();
    await screen.findByText('Aviso propio para validar la conexión.', {}, ESPERA);
    const nueva = { ...propia, id: 'ntf-nueva-ui', mensaje: 'Aviso recibido en tiempo real.' };

    useAlmacen.getState().transaccion((datos) => ({
      notificaciones: [...datos.notificaciones, nueva],
    }));

    expect(
      await screen.findByText('Aviso recibido en tiempo real.', {}, ESPERA),
    ).toBeInTheDocument();
  });

  it('sin notificaciones muestra el estado vacío', async () => {
    useAlmacen.setState({ datos: { ...datosIniciales, notificaciones: [ajena] } });
    renderizar();

    expect(await screen.findByText('No tienes notificaciones', {}, ESPERA)).toBeInTheDocument();
  });
});

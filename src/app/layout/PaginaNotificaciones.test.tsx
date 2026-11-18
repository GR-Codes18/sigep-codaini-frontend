import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { crearSemilla } from '@/data/semilla';
import { useAlmacen } from '@/data';
import { PaginaNotificaciones } from './PaginaNotificaciones';

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

describe('PaginaNotificaciones', () => {
  beforeEach(() => {
    localStorage.clear();
    useAlmacen.setState({ datos: { ...datosIniciales, notificaciones: [propia, ajena] } });
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

  it('lee los datos persistidos, mantiene privadas las notificaciones y marca las propias como leídas', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PaginaNotificaciones />
      </MemoryRouter>,
    );

    expect(screen.getByText('Aviso propio para validar la conexión.')).toBeInTheDocument();
    expect(screen.queryByText('Este aviso pertenece a otra persona.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Marcar todas como leídas' }));

    await waitFor(() => {
      expect(
        useAlmacen.getState().datos.notificaciones.find((item) => item.id === propia.id)?.leida,
      ).toBe(true);
    });
    expect(
      useAlmacen.getState().datos.notificaciones.find((item) => item.id === ajena.id)?.leida,
    ).toBe(false);
  });

  it('refleja una notificación nueva añadida al almacén mientras la vista está abierta', async () => {
    render(
      <MemoryRouter>
        <PaginaNotificaciones />
      </MemoryRouter>,
    );
    const nueva = { ...propia, id: 'ntf-nueva-ui', mensaje: 'Aviso recibido en tiempo real.' };

    useAlmacen.getState().transaccion((datos) => ({
      notificaciones: [...datos.notificaciones, nueva],
    }));

    expect(await screen.findByText('Aviso recibido en tiempo real.')).toBeInTheDocument();
  });
});

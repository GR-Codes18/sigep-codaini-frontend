import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampanaNotificaciones, type NotificacionItem } from './CampanaNotificaciones';

const crear = (i: number, extra: Partial<NotificacionItem> = {}): NotificacionItem => ({
  id: `n${i}`,
  texto: `Aviso ${i}`,
  fecha: new Date(2026, 9, 1, i),
  leida: false,
  ruta: '/x',
  existe: true,
  ...extra,
});

const props = { noLeidas: 0, onAbrir: () => {}, onMarcarTodas: () => {}, onVerTodas: () => {} };

describe('CampanaNotificaciones', () => {
  it('indica cuántas hay sin leer según el total recibido, no según la lista', () => {
    render(<CampanaNotificaciones {...props} noLeidas={12} notificaciones={[crear(1)]} />);
    expect(
      screen.getByRole('button', { name: 'Notificaciones (12 sin leer)' }),
    ).toBeInTheDocument();
  });

  it('sin avisos sin leer no hay contador y «Marcar todas» queda desactivado', async () => {
    const user = userEvent.setup();
    render(<CampanaNotificaciones {...props} notificaciones={[crear(1, { leida: true })]} />);
    await user.click(screen.getByRole('button', { name: 'Notificaciones' }));
    expect(screen.getByText('Marcar todas como leídas')).toBeDisabled();
  });

  it('muestra todo lo que recibe y en el orden recibido (la consulta ya limita y ordena)', async () => {
    const user = userEvent.setup();
    const recibidas = [crear(3), crear(9), crear(1)];
    render(<CampanaNotificaciones {...props} noLeidas={3} notificaciones={recibidas} />);
    await user.click(screen.getByRole('button', { name: /Notificaciones/ }));
    const textos = screen.getAllByText(/^Aviso [0-9]$/).map((e) => e.textContent);
    expect(textos).toEqual(['Aviso 3', 'Aviso 9', 'Aviso 1']);
  });

  it('sin avisos muestra el estado vacío', async () => {
    const user = userEvent.setup();
    render(<CampanaNotificaciones {...props} notificaciones={[]} />);
    await user.click(screen.getByRole('button', { name: 'Notificaciones' }));
    expect(screen.getByText('No tienes notificaciones.')).toBeInTheDocument();
  });

  it('avisa al abrir una y al marcar todas', async () => {
    const user = userEvent.setup();
    const onAbrir = vi.fn();
    const onMarcarTodas = vi.fn();
    render(
      <CampanaNotificaciones
        {...props}
        onAbrir={onAbrir}
        onMarcarTodas={onMarcarTodas}
        noLeidas={1}
        notificaciones={[crear(1)]}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Notificaciones/ }));
    await user.click(screen.getByText('Marcar todas como leídas'));
    expect(onMarcarTodas).toHaveBeenCalled();
    await user.click(screen.getByText('Aviso 1'));
    expect(onAbrir).toHaveBeenCalled();
  });

  it('si el elemento ya no existe, el texto se conserva y el aviso queda desactivado', async () => {
    const user = userEvent.setup();
    render(<CampanaNotificaciones {...props} notificaciones={[crear(1, { existe: false })]} />);
    await user.click(screen.getByRole('button', { name: /Notificaciones/ }));
    expect(screen.getByText('Aviso 1').closest('button')).toHaveAttribute('aria-disabled', 'true');
  });
});

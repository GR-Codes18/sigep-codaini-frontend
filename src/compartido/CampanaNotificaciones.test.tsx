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

const props = { onAbrir: () => {}, onMarcarTodas: () => {}, onVerTodas: () => {} };

describe('CampanaNotificaciones', () => {
  it('indica cuántas hay sin leer', () => {
    render(
      <CampanaNotificaciones {...props} notificaciones={[crear(1), crear(2, { leida: true })]} />,
    );
    expect(screen.getByRole('button', { name: 'Notificaciones (1 sin leer)' })).toBeInTheDocument();
  });

  it('muestra solo las últimas 8', async () => {
    const user = userEvent.setup();
    const todas = Array.from({ length: 10 }, (_, i) => crear(i + 1));
    render(<CampanaNotificaciones {...props} notificaciones={todas} />);
    await user.click(screen.getByRole('button', { name: /Notificaciones/ }));
    expect(screen.getByText('Aviso 10')).toBeInTheDocument();
    expect(screen.queryByText('Aviso 1')).not.toBeInTheDocument();
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

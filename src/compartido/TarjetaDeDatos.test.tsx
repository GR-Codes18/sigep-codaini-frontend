import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AvatarIniciales } from './AvatarIniciales';
import { FilasDeDatos, TarjetaDeDatos } from './TarjetaDeDatos';

describe('TarjetaDeDatos', () => {
  it('es una región con título corto, borde fino, esquinas redondeadas y el fondo del tema', () => {
    render(
      <TarjetaDeDatos titulo="Avance">
        <p>contenido</p>
      </TarjetaDeDatos>,
    );

    const tarjeta = screen.getByRole('region', { name: 'Avance' });
    expect(within(tarjeta).getByRole('heading', { name: 'Avance' })).toBeInTheDocument();
    expect(tarjeta.className).toContain('border-border');
    expect(tarjeta.className).toContain('rounded-xl');
    expect(tarjeta.className).toContain('bg-surface');
    expect(tarjeta.className).toContain('p-3');
    expect(tarjeta).toHaveTextContent('contenido');
  });

  it('ocupa toda la altura de su celda para que las tarjetas de una fila midan lo mismo', () => {
    render(<TarjetaDeDatos titulo="Datos">x</TarjetaDeDatos>);

    expect(screen.getByRole('region', { name: 'Datos' }).className).toContain('h-full');
  });

  it('puede llevar una acción junto al título y destacarse con un borde de acento', () => {
    render(
      <TarjetaDeDatos titulo="Supervisor" destacada accion={<a href="/x">Ver</a>}>
        x
      </TarjetaDeDatos>,
    );

    const tarjeta = screen.getByRole('region', { name: 'Supervisor' });
    expect(tarjeta.className).toContain('border-l-primary');
    expect(within(tarjeta).getByRole('link', { name: 'Ver' })).toBeInTheDocument();
  });

  it('solo usa variables del tema: ningún color a mano', () => {
    render(
      <TarjetaDeDatos titulo="Tema" destacada>
        <FilasDeDatos filas={[{ etiqueta: 'A', valor: 'B' }]} />
      </TarjetaDeDatos>,
    );

    const html = document.body.innerHTML;
    expect(html).not.toMatch(
      /#[0-9a-f]{3,8}\b|rgb\(|\bbg-(white|black|gray|slate)|text-(white|black|gray|slate)/i,
    );
  });
});

describe('FilasDeDatos', () => {
  it('cada fila lleva la etiqueta en gris a la izquierda y el valor a la derecha, separadas por líneas finas', () => {
    render(
      <FilasDeDatos
        filas={[
          { etiqueta: 'Supervisor', valor: 'Ana' },
          { etiqueta: 'Rama base', valor: 'main' },
        ]}
      />,
    );

    const lista = document.querySelector('dl')!;
    expect(lista.className).toContain('divide-y');
    expect(lista.className).toContain('divide-border');
    const [dt, dd] = [screen.getByText('Supervisor'), screen.getByText('Ana')];
    expect(dt.tagName).toBe('DT');
    expect(dt.className).toContain('text-text-2');
    expect(dd.tagName).toBe('DD');
    expect(dd.className).toContain('text-right');
    expect(dt.parentElement!.className).toContain('justify-between');
  });

  it('un valor largo se parte en vez de ensanchar la tarjeta', () => {
    render(
      <FilasDeDatos filas={[{ etiqueta: 'Repositorio', valor: 'https://github.com/org/repo' }]} />,
    );

    expect(screen.getByText('https://github.com/org/repo').className).toContain('break-words');
    expect(screen.getByText('https://github.com/org/repo').className).toContain('min-w-0');
  });
});

describe('AvatarIniciales', () => {
  it('muestra las iniciales de las dos primeras palabras, y es decorativo', () => {
    render(<AvatarIniciales nombre="Marta López Díaz" />);

    const avatar = screen.getByText('ML');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
    expect(avatar.className).toContain('rounded-full');
  });

  it('con un solo nombre, una inicial; sin nombre, un signo de interrogación', () => {
    render(
      <>
        <AvatarIniciales nombre="Ana" />
        <AvatarIniciales nombre="   " />
      </>,
    );

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});

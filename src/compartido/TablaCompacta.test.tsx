import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TablaCompacta, type Columna } from './TablaCompacta';

interface Fila {
  id: string;
  nombre: string;
}
const COLUMNAS: Columna<Fila>[] = [
  { clave: 'nombre', encabezado: 'Nombre', celda: (f) => f.nombre },
];
const FILAS: Fila[] = [{ id: '1', nombre: 'Ana' }];

describe('TablaCompacta', () => {
  it('por defecto lleva su propia caja con borde', () => {
    render(
      <TablaCompacta
        columnas={COLUMNAS}
        filas={FILAS}
        claveFila={(f) => f.id}
        vacio={{ titulo: 'Nada' }}
      />,
    );

    expect(screen.getByRole('table').parentElement).toHaveClass('rounded-xl', 'border');
  });

  it('sin caja no dibuja borde ni radio propios, para ir dentro de un panel', () => {
    render(
      <TablaCompacta
        sinCaja
        columnas={COLUMNAS}
        filas={FILAS}
        claveFila={(f) => f.id}
        vacio={{ titulo: 'Nada' }}
      />,
    );

    expect(screen.getByRole('table').parentElement).not.toHaveClass('rounded-xl');
  });

  it('las filas llevan celdas con py-2 y la cabecera es de 36 px (h-9)', () => {
    render(
      <TablaCompacta
        columnas={COLUMNAS}
        filas={FILAS}
        claveFila={(f) => f.id}
        vacio={{ titulo: 'Nada' }}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toHaveClass('h-9');
    expect(screen.getByRole('cell', { name: 'Ana' })).toHaveClass('py-2');
  });
});

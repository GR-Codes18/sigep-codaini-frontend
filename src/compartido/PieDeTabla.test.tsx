import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PieDeTabla } from './PieDeTabla';

describe('PieDeTabla', () => {
  it('muestra la nota en una línea de texto auxiliar', () => {
    render(<PieDeTabla>Mostrando 3 de 10.</PieDeTabla>);

    expect(screen.getByText('Mostrando 3 de 10.')).toHaveClass('text-xs', 'text-text-2');
  });
});

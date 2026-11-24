import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarraDeFiltros } from './BarraDeFiltros';
import { CampoDeFormulario } from './CampoDeFormulario';

describe('BarraDeFiltros', () => {
  it('reúne los campos en una sola tarjeta, cada uno con su etiqueta', () => {
    render(
      <BarraDeFiltros>
        <CampoDeFormulario htmlFor="a" etiqueta="Área">
          <input id="a" />
        </CampoDeFormulario>
        <CampoDeFormulario htmlFor="b" etiqueta="Desde">
          <input id="b" />
        </CampoDeFormulario>
      </BarraDeFiltros>,
    );

    const area = screen.getByLabelText('Área');
    const desde = screen.getByLabelText('Desde');
    expect(area.closest('div.rounded-xl')).not.toBeNull();
    expect(area.closest('div.rounded-xl')).toBe(desde.closest('div.rounded-xl'));
  });
});

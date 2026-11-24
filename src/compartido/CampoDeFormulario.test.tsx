import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CampoDeFormulario } from './CampoDeFormulario';

describe('CampoDeFormulario', () => {
  it('asocia la etiqueta al control', () => {
    render(
      <CampoDeFormulario htmlFor="correo" etiqueta="Correo">
        <input id="correo" />
      </CampoDeFormulario>,
    );

    expect(screen.getByLabelText('Correo')).toBeInTheDocument();
  });

  it('muestra la ayuda y, si hay error, el error en su lugar', () => {
    const { rerender } = render(
      <CampoDeFormulario htmlFor="c" etiqueta="Correo" ayuda="Usa el correo institucional.">
        <input id="c" />
      </CampoDeFormulario>,
    );
    expect(screen.getByText('Usa el correo institucional.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(
      <CampoDeFormulario
        htmlFor="c"
        etiqueta="Correo"
        ayuda="Usa el correo institucional."
        error="Correo no válido."
      >
        <input id="c" />
      </CampoDeFormulario>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Correo no válido.');
    expect(screen.queryByText('Usa el correo institucional.')).not.toBeInTheDocument();
  });
});

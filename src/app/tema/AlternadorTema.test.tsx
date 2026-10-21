import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { AlternadorTema } from './AlternadorTema';
import { ProveedorTema } from './ProveedorTema';
import { CLAVE_TEMA } from './tema';

function renderizarAlternador() {
  return render(
    <ProveedorTema>
      <AlternadorTema />
    </ProveedorTema>,
  );
}

describe('AlternadorTema', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = '';
  });

  it('arranca en tema claro cuando no hay preferencia guardada', () => {
    renderizarAlternador();

    const boton = screen.getByRole('button', { name: 'Tema oscuro' });

    expect(boton).toHaveAttribute('aria-pressed', 'false');
    expect(boton).toHaveAttribute('title', 'Cambiar a tema oscuro');
    expect(localStorage.getItem(CLAVE_TEMA)).toBeNull();
  });

  it('cambia a tema oscuro y guarda la preferencia', async () => {
    const usuario = userEvent.setup();
    renderizarAlternador();

    const boton = screen.getByRole('button', { name: 'Tema oscuro' });
    await usuario.click(boton);

    expect(boton).toHaveAttribute('aria-pressed', 'true');
    expect(boton).toHaveAttribute('title', 'Cambiar a tema claro');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem(CLAVE_TEMA)).toBe('dark');
  });
});

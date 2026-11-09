import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { DetallePostulacion } from './DetallePostulacion';

function ver(id: string) {
  render(
    <MemoryRouter initialEntries={[`/administrador/postulaciones/${id}`]}>
      <Routes>
        <Route path="/administrador/postulaciones/:id" element={<DetallePostulacion />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DetallePostulacion', () => {
  it('muestra datos, los dos bloques de criterios y la nota fija', () => {
    ver('p1');
    expect(screen.getByText('Lucía Torres')).toBeInTheDocument();
    expect(screen.getByText('Criterios del área')).toBeInTheDocument();
    expect(screen.getByText('Criterios de la especialidad')).toBeInTheDocument();
    expect(
      screen.getByText(/La decisión es del Administrador|decisión es del Administrador/),
    ).toBeInTheDocument();
  });

  it('muestra la marca de revisión manual cuando corresponde', () => {
    ver('p2');
    expect(screen.getByText('Requiere revisión manual')).toBeInTheDocument();
  });

  it('muestra un mensaje si la postulación no existe', () => {
    ver('inexistente');
    expect(screen.getByText('No se encontró la postulación')).toBeInTheDocument();
  });
});

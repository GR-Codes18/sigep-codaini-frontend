import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { DesgloseEvaluacion } from './DesgloseEvaluacion';

const bloques = {
  AREA: [
    { nombre: 'Nivel académico', peso: 60, cumplido: true, puntaje: 60, observacion: 'Egresado' },
    { nombre: 'Disponibilidad', peso: 40, cumplido: false, puntaje: 0, observacion: '' },
  ],
  ESPECIALIDAD: [{ nombre: 'React', peso: 100, cumplido: true, puntaje: 100, observacion: '' }],
};

describe('DesgloseEvaluacion', () => {
  it('separa los criterios del área y los de la especialidad, cada uno con su puntaje', () => {
    render(<DesgloseEvaluacion puntajeArea={60} puntajeEspecialidad={100} bloques={bloques} />);

    const area = screen.getByRole('region', { name: 'Criterios del área' });
    const especialidad = screen.getByRole('region', { name: 'Criterios de la especialidad' });
    expect(within(area).getByText('Puntaje del bloque: 60/100')).toBeInTheDocument();
    expect(within(especialidad).getByText('Puntaje del bloque: 100/100')).toBeInTheDocument();
    expect(within(area).getByText('Nivel académico')).toBeInTheDocument();
    expect(within(area).queryByText('React')).not.toBeInTheDocument();
    expect(within(especialidad).getByText('React')).toBeInTheDocument();
  });

  it('con los pesos de la nota, cada bloque dice el suyo; sin ellos, no dice nada', () => {
    const { rerender } = render(
      <DesgloseEvaluacion
        puntajeArea={60}
        puntajeEspecialidad={100}
        pesos={{ area: 40, especialidad: 60 }}
        bloques={bloques}
      />,
    );
    const area = screen.getByRole('region', { name: 'Criterios del área' });
    const especialidad = screen.getByRole('region', { name: 'Criterios de la especialidad' });
    expect(within(area).getByText(/Peso en la nota: 40 %/)).toBeInTheDocument();
    expect(within(especialidad).getByText(/Peso en la nota: 60 %/)).toBeInTheDocument();

    rerender(
      <DesgloseEvaluacion
        puntajeArea={60}
        puntajeEspecialidad={100}
        pesos={null}
        bloques={bloques}
      />,
    );
    expect(screen.queryByText(/Peso en la nota/)).not.toBeInTheDocument();
  });

  it('cada criterio muestra su peso, si cumple, su puntaje y su observación', () => {
    render(<DesgloseEvaluacion puntajeArea={60} puntajeEspecialidad={100} bloques={bloques} />);
    const area = screen.getByRole('region', { name: 'Criterios del área' });

    const cumplido = within(area).getByText('Nivel académico').closest('tr')!;
    expect(
      within(cumplido)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['Nivel académico', '60', 'Sí', '60', 'Egresado']);
    const incumplido = within(area).getByText('Disponibilidad').closest('tr')!;
    expect(
      within(incumplido)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['Disponibilidad', '40', 'No', '0', '—']);
  });

  it('un bloque sin criterios evaluados lo dice', () => {
    render(
      <DesgloseEvaluacion
        puntajeArea={0}
        puntajeEspecialidad={100}
        bloques={{ AREA: [], ESPECIALIDAD: bloques.ESPECIALIDAD }}
      />,
    );

    const area = screen.getByRole('region', { name: 'Criterios del área' });
    expect(within(area).getByText('Este bloque no tiene criterios evaluados.')).toBeInTheDocument();
    expect(within(area).queryByRole('table')).not.toBeInTheDocument();
  });

  it('no tiene botones: el desglose es de solo lectura', () => {
    render(<DesgloseEvaluacion puntajeArea={60} puntajeEspecialidad={100} bloques={bloques} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

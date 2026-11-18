import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListadoTerminadas } from './ListadoTerminadas';
import type { TareaTablero } from './TableroKanban';

const crear = (id: string, titulo: string, extra: Partial<TareaTablero> = {}): TareaTablero => ({
  id,
  idLegible: id.toUpperCase(),
  titulo,
  estado: 'TERMINADA',
  fechaLimite: '2026-11-30',
  vencida: false,
  requiereSupervision: false,
  fechaTermino: new Date('2026-11-10T15:00:00.000Z'),
  ...extra,
});

const tareas = [
  crear('pl2d-003', 'Menú principal', { responsable: 'Ana Quispe' }),
  crear('pl2d-002', 'Pantalla de carga'),
  crear('pl2d-001', 'Sistema de guardado'),
];

describe('ListadoTerminadas', () => {
  it('muestra todas las terminadas en el orden recibido, con el contador', () => {
    render(<ListadoTerminadas tareas={tareas} onAbrir={() => {}} onVolver={() => {}} />);

    expect(screen.getByText('Tareas terminadas (3)')).toBeInTheDocument();
    const filas = screen.getAllByRole('button', { name: /PL2D-/ });
    expect(filas[0]).toHaveTextContent('Menú principal');
    expect(filas[0]).toHaveTextContent('Ana Quispe');
    expect(filas[0]).toHaveTextContent('Terminada el 10/11/2026');
    expect(filas[1]).toHaveTextContent('Pantalla de carga');
    expect(filas[2]).toHaveTextContent('Sistema de guardado');
  });

  it('busca por título, sin distinguir mayúsculas', async () => {
    const user = userEvent.setup();
    render(<ListadoTerminadas tareas={tareas} onAbrir={() => {}} onVolver={() => {}} />);

    await user.type(screen.getByRole('searchbox'), 'GUARDADO');

    expect(screen.getByText('Sistema de guardado')).toBeInTheDocument();
    expect(screen.queryByText('Menú principal')).not.toBeInTheDocument();
  });

  it('busca por ID legible y recorta los espacios', async () => {
    const user = userEvent.setup();
    render(<ListadoTerminadas tareas={tareas} onAbrir={() => {}} onVolver={() => {}} />);

    await user.type(screen.getByRole('searchbox'), '  pl2d-002 ');

    expect(screen.getByText('Pantalla de carga')).toBeInTheDocument();
    expect(screen.queryByText('Sistema de guardado')).not.toBeInTheDocument();
  });

  it('sin coincidencias muestra un estado vacío con ayuda', async () => {
    const user = userEvent.setup();
    render(<ListadoTerminadas tareas={tareas} onAbrir={() => {}} onVolver={() => {}} />);

    await user.type(screen.getByRole('searchbox'), 'zzz');

    expect(screen.getByText('No hay tareas que coincidan')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /PL2D-/ })).not.toBeInTheDocument();
  });

  it('sin tareas terminadas muestra su propio estado vacío', () => {
    render(<ListadoTerminadas tareas={[]} onAbrir={() => {}} onVolver={() => {}} />);

    expect(
      screen.getByText('Este proyecto todavía no tiene tareas terminadas'),
    ).toBeInTheDocument();
  });

  it('un clic en una fila abre su detalle y «Volver» regresa al tablero', async () => {
    const user = userEvent.setup();
    const onAbrir = vi.fn();
    const onVolver = vi.fn();
    render(<ListadoTerminadas tareas={tareas} onAbrir={onAbrir} onVolver={onVolver} />);

    await user.click(screen.getByText('Pantalla de carga'));
    expect(onAbrir).toHaveBeenCalledWith('pl2d-002');

    await user.click(screen.getByRole('button', { name: 'Volver al tablero' }));
    expect(onVolver).toHaveBeenCalled();
  });

  it('no tiene botones de acción sobre las tareas', () => {
    render(<ListadoTerminadas tareas={tareas} onAbrir={() => {}} onVolver={() => {}} />);

    expect(
      screen.queryByRole('button', { name: /aprobar|devolver|reabrir|eliminar/i }),
    ).not.toBeInTheDocument();
  });
});

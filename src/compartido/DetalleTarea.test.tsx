import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { proyecto, usuario } from '@/domain/pruebas/fabricas';
import { DetalleTarea, type TareaDetalle } from './DetalleTarea';
import { accionesDeTarea } from '@/app/ejemplos/accionesDeTarea';

const tarea: TareaDetalle = {
  id: 'tar-pl2d-003',
  idLegible: 'PL2D-003',
  numero: 3,
  titulo: 'Tablero Kanban',
  descripcion: 'Cuatro columnas',
  estado: 'ESPERANDO_SUPERVISION',
  idProyecto: 'pl2d',
  proyecto: 'Plataforma 2D',
  idPracticante: 'demo-practicante',
  fechaLimite: '2026-11-30',
  requiereSupervision: true,
  requierePr: true,
  estadoPr: null,
};

describe('DetalleTarea', () => {
  it('sin acciones queda en solo lectura', () => {
    render(<DetalleTarea tarea={tarea} acciones={[]} eventos={[]} onEjecutar={async () => {}} />);
    expect(screen.getByText('Tablero Kanban')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('muestra solo los botones de las acciones recibidas y ejecuta las simples', async () => {
    const user = userEvent.setup();
    const onEjecutar = vi.fn().mockResolvedValue(undefined);
    render(
      <DetalleTarea
        tarea={tarea}
        acciones={[{ clave: 'aprobar', etiqueta: 'Aprobar' }]}
        eventos={[]}
        onEjecutar={onEjecutar}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Devolver' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Aprobar' }));
    expect(onEjecutar).toHaveBeenCalledWith('aprobar');
  });

  it('muestra una acción deshabilitada con aviso y no la ejecuta', async () => {
    const user = userEvent.setup();
    const onEjecutar = vi.fn().mockResolvedValue(undefined);
    render(
      <DetalleTarea
        tarea={tarea}
        acciones={[
          {
            clave: 'no_requiere_pr',
            etiqueta: 'No requiere PR',
            deshabilitada: true,
            avisoDeshabilitacion: 'Disponible cuando se conecte el servicio de tareas.',
          },
        ]}
        eventos={[]}
        onEjecutar={onEjecutar}
      />,
    );
    const boton = screen.getByRole('button', { name: 'No requiere PR' });
    expect(boton).toBeDisabled();
    expect(screen.getByText('Disponible cuando se conecte el servicio de tareas.')).toBeVisible();
    await user.click(boton);
    expect(onEjecutar).not.toHaveBeenCalled();
  });

  it('muestra la etiqueta Pendiente y oculta una URL antigua del PR', () => {
    render(
      <DetalleTarea
        tarea={{
          ...tarea,
          estado: 'TERMINADA',
          estadoPr: 'PENDIENTE',
          urlPr: 'https://github.com/codaini/pl2d/pull/12',
          ramaOrigen: 'feat/pl2d-003',
          ramaBase: 'main',
        }}
        acciones={[]}
        eventos={[]}
        onEjecutar={async () => {}}
      />,
    );
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('una acción con nota obligatoria abre el modal y envía la nota', async () => {
    const user = userEvent.setup();
    const onEjecutar = vi.fn().mockResolvedValue(undefined);
    render(
      <DetalleTarea
        tarea={tarea}
        acciones={[
          {
            clave: 'devolver',
            etiqueta: 'Devolver',
            pedirMotivo: { etiqueta: 'Nota', obligatorio: true, minimo: 5 },
          },
        ]}
        eventos={[]}
        onEjecutar={onEjecutar}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Devolver' }));
    const dialogo = screen.getByRole('dialog');
    await user.type(within(dialogo).getByLabelText('Nota'), 'Falta probar');
    await user.click(within(dialogo).getByRole('button', { name: 'Devolver' }));
    await waitFor(() => expect(onEjecutar).toHaveBeenCalledWith('devolver', 'Falta probar'));
  });

  it.each([
    {
      accion: 'devolver',
      etiqueta: 'Devolver',
      campo: 'Nota',
      tarea: { ...tarea, estado: 'ESPERANDO_SUPERVISION' as const },
    },
    {
      accion: 'liberar',
      etiqueta: 'Liberar',
      campo: 'Motivo',
      tarea: { ...tarea, estado: 'EN_PROGRESO' as const },
    },
  ])('$etiqueta como supervisor exige $campo antes de ejecutar', async (caso) => {
    const user = userEvent.setup();
    const onEjecutar = vi.fn().mockResolvedValue(undefined);
    const supervisor = usuario('SUPERVISOR');
    const acciones = accionesDeTarea(caso.tarea, {
      usuario: supervisor,
      proyecto: proyecto({ id: 'pl2d', id_supervisor: supervisor.id }),
      asignaciones: [],
    });

    render(
      <DetalleTarea tarea={caso.tarea} acciones={acciones} eventos={[]} onEjecutar={onEjecutar} />,
    );
    await user.click(screen.getByRole('button', { name: caso.etiqueta }));

    const dialogo = screen.getByRole('dialog');
    const confirmar = within(dialogo).getByRole('button', { name: caso.etiqueta });
    expect(confirmar).toBeDisabled();
    await user.click(confirmar);
    expect(onEjecutar).not.toHaveBeenCalled();

    await user.type(within(dialogo).getByLabelText(caso.campo), 'Revisar el trabajo');
    await user.click(confirmar);
    await waitFor(() => expect(onEjecutar).toHaveBeenCalledWith(caso.accion, 'Revisar el trabajo'));
  });
});

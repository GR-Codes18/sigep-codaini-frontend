import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { exito, fallo } from '@/services';
import { DetalleTarea, type TareaDetalle } from './DetalleTarea';

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

  it('muestra la etiqueta Pendiente sin enlace: la consulta no trae la URL de un PR anterior', () => {
    render(
      <DetalleTarea
        tarea={{ ...tarea, estado: 'TERMINADA', estadoPr: 'PENDIENTE' }}
        acciones={[]}
        eventos={[]}
        onEjecutar={async () => {}}
      />,
    );
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('muestra el enlace y las ramas del PR cuando llegan', () => {
    render(
      <DetalleTarea
        tarea={{
          ...tarea,
          estado: 'TERMINADA',
          estadoPr: 'CREADO',
          urlPr: 'https://github.com/codaini/pl2d/pull/12',
          ramaOrigen: 'feat/pl2d-003',
          ramaBase: 'main',
        }}
        acciones={[]}
        eventos={[]}
        onEjecutar={async () => {}}
      />,
    );
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://github.com/codaini/pl2d/pull/12',
    );
    expect(screen.getByText('(feat/pl2d-003 → main)')).toBeInTheDocument();
  });

  it('no muestra la etiqueta del PR si la consulta no la entrega', () => {
    render(
      <DetalleTarea
        tarea={{ ...tarea, estado: 'EN_PROGRESO', estadoPr: null }}
        acciones={[]}
        eventos={[]}
        onEjecutar={async () => {}}
      />,
    );
    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
  });

  it.each([
    [['CUENTA_INACTIVA'], 'La cuenta del responsable está inactiva.'],
    [['CUENTA_NO_ENCONTRADA'], 'No se encontró la cuenta del responsable.'],
    [
      ['SIN_ASIGNACION_VIGENTE'],
      'El responsable ya no tiene una asignación vigente en este proyecto.',
    ],
  ] as const)('avisa que hay que revisar al responsable (%j)', (motivos, texto) => {
    render(
      <DetalleTarea
        tarea={{ ...tarea, estado: 'EN_PROGRESO', atencionResponsable: [...motivos] }}
        acciones={[]}
        eventos={[]}
        onEjecutar={async () => {}}
      />,
    );
    const aviso = screen.getByRole('status');
    expect(aviso).toHaveTextContent('Revisar el responsable de la tarea');
    expect(aviso).toHaveTextContent(texto);
    expect(aviso).toHaveTextContent('puede liberar la tarea con un motivo');
  });

  it('con varios motivos los dice todos, y sin motivos no hay aviso', () => {
    const { rerender } = render(
      <DetalleTarea
        tarea={{
          ...tarea,
          estado: 'EN_PROGRESO',
          atencionResponsable: ['CUENTA_INACTIVA', 'SIN_ASIGNACION_VIGENTE'],
        }}
        acciones={[]}
        eventos={[]}
        onEjecutar={async () => {}}
      />,
    );
    const aviso = screen.getByRole('status');
    expect(aviso).toHaveTextContent('La cuenta del responsable está inactiva.');
    expect(aviso).toHaveTextContent('ya no tiene una asignación vigente');

    rerender(
      <DetalleTarea
        tarea={{ ...tarea, estado: 'EN_PROGRESO' }}
        acciones={[]}
        eventos={[]}
        onEjecutar={async () => {}}
      />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
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
    { clave: 'devolver', etiqueta: 'Devolver', campo: 'Nota' },
    { clave: 'liberar', etiqueta: 'Liberar', campo: 'Motivo' },
  ])('$etiqueta exige $campo antes de ejecutar el servicio', async (caso) => {
    const user = userEvent.setup();
    const onEjecutar = vi.fn().mockResolvedValue(undefined);
    const ejecutarServicio = vi.fn(async () => exito(null));

    render(
      <DetalleTarea
        tarea={tarea}
        acciones={[
          {
            clave: caso.clave,
            etiqueta: caso.etiqueta,
            pedirMotivo: { etiqueta: caso.campo, obligatorio: true },
            ejecutar: ejecutarServicio,
          },
        ]}
        eventos={[]}
        onEjecutar={onEjecutar}
      />,
    );
    await user.click(screen.getByRole('button', { name: caso.etiqueta }));

    const dialogo = screen.getByRole('dialog');
    const confirmar = within(dialogo).getByRole('button', { name: caso.etiqueta });
    expect(confirmar).toBeDisabled();
    await user.click(confirmar);
    expect(ejecutarServicio).not.toHaveBeenCalled();

    await user.type(within(dialogo).getByLabelText(caso.campo), 'Revisar el trabajo');
    await user.click(confirmar);
    await waitFor(() => expect(ejecutarServicio).toHaveBeenCalledWith('Revisar el trabajo'));
    expect(onEjecutar).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('mantiene abierto el modal y muestra el error controlado del servicio', async () => {
    const user = userEvent.setup();
    const ejecutarServicio = vi.fn(async () => fallo('TAREA_YA_TIENE_PR'));
    render(
      <DetalleTarea
        tarea={tarea}
        acciones={[
          {
            clave: 'no_requiere_pr',
            etiqueta: 'No requiere PR',
            pedirMotivo: { etiqueta: 'Motivo', obligatorio: true },
            ejecutar: ejecutarServicio,
          },
        ]}
        eventos={[]}
        onEjecutar={async () => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'No requiere PR' }));
    const dialogo = screen.getByRole('dialog');
    await user.type(within(dialogo).getByLabelText('Motivo'), 'Ya tiene PR');
    await user.click(within(dialogo).getByRole('button', { name: 'No requiere PR' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La tarea ya tiene o tuvo un Pull Request: no se puede hacer este cambio.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('DetalleTarea · jerarquía de las acciones', () => {
  const variante = (nombre: string) =>
    screen.getByRole('button', { name: nombre }).getAttribute('data-variant');

  it('solo la acción principal del flujo va en primario; el resto, en contorno', () => {
    render(
      <DetalleTarea
        tarea={tarea}
        acciones={[
          { clave: 'aprobar', etiqueta: 'Aprobar' },
          { clave: 'devolver', etiqueta: 'Devolver' },
          { clave: 'editar', etiqueta: 'Editar' },
          { clave: 'cambiar_requiere_supervision', etiqueta: 'Desactivar supervisión' },
        ]}
        eventos={[]}
        onEjecutar={async () => {}}
      />,
    );

    expect(variante('Aprobar')).toBe('default');
    expect(variante('Devolver')).toBe('outline');
    expect(variante('Editar')).toBe('outline');
    expect(variante('Desactivar supervisión')).toBe('outline');
  });

  it('una destructiva va en contorno rojo y nunca es la principal', () => {
    render(
      <DetalleTarea
        tarea={tarea}
        acciones={[
          { clave: 'tomar', etiqueta: 'Tomar tarea' },
          { clave: 'eliminar', etiqueta: 'Eliminar', destructivo: true },
        ]}
        eventos={[]}
        onEjecutar={async () => {}}
      />,
    );

    expect(variante('Tomar tarea')).toBe('default');
    expect(variante('Eliminar')).toBe('outline');
    expect(screen.getByRole('button', { name: 'Eliminar' })).toHaveClass('text-danger-text');
  });

  it('sin acción de flujo (solo Editar y Eliminar) ninguna queda en primario', () => {
    render(
      <DetalleTarea
        tarea={tarea}
        acciones={[
          { clave: 'editar', etiqueta: 'Editar' },
          { clave: 'eliminar', etiqueta: 'Eliminar', destructivo: true },
        ]}
        eventos={[]}
        onEjecutar={async () => {}}
      />,
    );

    expect(variante('Editar')).toBe('outline');
    expect(variante('Eliminar')).toBe('outline');
  });
});

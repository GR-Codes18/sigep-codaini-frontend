import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { tarea as tareaDominio } from '@/domain/pruebas/fabricas';
import { crearTarea, editarTarea, exito, fallo } from '@/services';
import { FormularioTarea } from './FormularioTarea';

vi.mock('@/services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services')>();
  return { ...actual, crearTarea: vi.fn(), editarTarea: vi.fn() };
});

const proyectos = [
  { id: 'p1', nombre: 'Plataforma 2D' },
  { id: 'p2', nombre: 'Juego móvil' },
];

const tarea = tareaDominio();

describe('FormularioTarea', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(crearTarea).mockResolvedValue(exito(tarea));
    vi.mocked(editarTarea).mockResolvedValue(exito(tarea));
  });

  it('nace con supervisión desactivada y PR activado', () => {
    render(
      <FormularioTarea
        modo="crear"
        idActor="supervisor-1"
        proyectos={proyectos}
        onCancelar={() => {}}
      />,
    );
    expect(screen.getByLabelText('Requiere supervisión')).not.toBeChecked();
    expect(screen.getByLabelText('Requiere PR')).toBeChecked();
  });

  it('exige los campos obligatorios antes de llamar al servicio', async () => {
    const user = userEvent.setup();
    render(
      <FormularioTarea
        modo="crear"
        idActor="supervisor-1"
        proyectos={proyectos}
        onCancelar={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Crear tarea' }));
    expect(await screen.findByText('Elige un proyecto', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('Ingresa un título')).toBeInTheDocument();
    expect(screen.getByText(/Describe qué se espera/)).toBeInTheDocument();
    expect(screen.getByText('Elige una fecha límite')).toBeInTheDocument();
    expect(crearTarea).not.toHaveBeenCalled();
  });

  it('crea con los campos y las opciones de la tarea nueva', async () => {
    const user = userEvent.setup();
    const onGuardada = vi.fn();
    const onCancelar = vi.fn();
    render(
      <FormularioTarea
        modo="crear"
        idActor="supervisor-1"
        proyectos={proyectos}
        onGuardada={onGuardada}
        onCancelar={onCancelar}
      />,
    );
    await user.selectOptions(screen.getByLabelText('Proyecto'), 'p1');
    await user.type(screen.getByLabelText('Título'), 'Pantalla de login');
    await user.type(screen.getByLabelText('Descripción'), 'Debe validar el correo');
    await user.type(screen.getByLabelText('Fecha límite'), '2026-11-30');
    await user.click(screen.getByLabelText('Requiere supervisión'));
    await user.click(screen.getByLabelText('Requiere PR'));
    await user.click(screen.getByRole('button', { name: 'Crear tarea' }));

    await waitFor(() =>
      expect(crearTarea).toHaveBeenCalledWith(
        {
          idActor: 'supervisor-1',
          idProyecto: 'p1',
          titulo: 'Pantalla de login',
          descripcion: 'Debe validar el correo',
          fecha_limite: '2026-11-30',
          requiere_supervision: true,
          requiere_pr: false,
        },
        undefined,
      ),
    );
    expect(onGuardada).toHaveBeenCalledWith(tarea);
    expect(onCancelar).toHaveBeenCalled();
  });

  it('muestra errores de permisos devueltos por el servicio y mantiene el formulario', async () => {
    const user = userEvent.setup();
    const onCancelar = vi.fn();
    vi.mocked(crearTarea).mockResolvedValueOnce(fallo('ROL_NO_PERMITIDO'));
    render(
      <FormularioTarea
        modo="crear"
        idActor="practicante-1"
        proyectos={proyectos}
        onCancelar={onCancelar}
      />,
    );
    await user.selectOptions(screen.getByLabelText('Proyecto'), 'p1');
    await user.type(screen.getByLabelText('Título'), 'Pantalla de login');
    await user.type(screen.getByLabelText('Descripción'), 'Debe validar el correo');
    await user.type(screen.getByLabelText('Fecha límite'), '2026-11-30');
    await user.click(screen.getByRole('button', { name: 'Crear tarea' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu rol no permite realizar esta acción.',
    );
    expect(onCancelar).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Título')).toHaveValue('Pantalla de login');
  });

  it('al editar, conserva el proyecto como solo lectura y oculta las opciones', () => {
    render(
      <FormularioTarea
        modo="editar"
        idActor="supervisor-1"
        idTarea="tarea-1"
        proyectos={proyectos}
        valoresIniciales={{
          idProyecto: 'p2',
          titulo: 'Tarea actual',
          descripcion: 'Descripción actual',
          fechaLimite: '2026-11-30',
          requiereSupervision: true,
          requierePr: true,
        }}
        onCancelar={() => {}}
      />,
    );
    expect(screen.getByLabelText('Proyecto')).toBeDisabled();
    expect(screen.getByLabelText('Proyecto')).toHaveValue('p2');
    expect(screen.queryByLabelText('Requiere supervisión')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Requiere PR')).not.toBeInTheDocument();
  });

  it('edita exclusivamente título, descripción y fecha límite', async () => {
    const user = userEvent.setup();
    render(
      <FormularioTarea
        modo="editar"
        idActor="supervisor-1"
        idTarea="tarea-1"
        proyectos={proyectos}
        valoresIniciales={{
          idProyecto: 'p1',
          titulo: 'Tarea actual',
          descripcion: 'Descripción actual',
          fechaLimite: '2026-11-30',
          requiereSupervision: true,
          requierePr: false,
        }}
        onCancelar={() => {}}
      />,
    );
    await user.clear(screen.getByLabelText('Título'));
    await user.type(screen.getByLabelText('Título'), 'Título actualizado');
    await user.clear(screen.getByLabelText('Descripción'));
    await user.type(screen.getByLabelText('Descripción'), 'Descripción actualizada');
    await user.clear(screen.getByLabelText('Fecha límite'));
    await user.type(screen.getByLabelText('Fecha límite'), '2026-12-15');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(editarTarea).toHaveBeenCalledWith(
        {
          idActor: 'supervisor-1',
          idTarea: 'tarea-1',
          titulo: 'Título actualizado',
          descripcion: 'Descripción actualizada',
          fecha_limite: '2026-12-15',
        },
        undefined,
      ),
    );
    const entrada = vi.mocked(editarTarea).mock.calls[0][0];
    expect(entrada).not.toHaveProperty('idProyecto');
    expect(entrada).not.toHaveProperty('requiere_pr');
    expect(entrada).not.toHaveProperty('requiere_supervision');
  });

  it('muestra errores de validación del servicio junto al campo y permite reintentar', async () => {
    const user = userEvent.setup();
    vi.mocked(editarTarea).mockResolvedValueOnce(
      fallo('DATOS_INVALIDOS', undefined, { fecha_limite: 'La fecha no existe' }),
    );
    render(
      <FormularioTarea
        modo="editar"
        idActor="supervisor-1"
        idTarea="tarea-1"
        proyectos={proyectos}
        valoresIniciales={{
          idProyecto: 'p1',
          titulo: 'Tarea actual',
          descripcion: 'Descripción actual',
          fechaLimite: '2026-11-30',
        }}
        onCancelar={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('La fecha no existe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
  });
});

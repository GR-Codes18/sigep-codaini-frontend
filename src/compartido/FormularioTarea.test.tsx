import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormularioTarea } from './FormularioTarea';

const proyectos = [
  { id: 'p1', nombre: 'Plataforma 2D' },
  { id: 'p2', nombre: 'Juego móvil' },
];

describe('FormularioTarea', () => {
  it('nace con supervisión desactivada y PR activado', () => {
    render(
      <FormularioTarea
        modo="crear"
        proyectos={proyectos}
        onGuardar={async () => {}}
        onCancelar={() => {}}
      />,
    );
    expect(screen.getByLabelText('Requiere supervisión')).not.toBeChecked();
    expect(screen.getByLabelText('Requiere PR')).toBeChecked();
  });

  it('exige los campos obligatorios', async () => {
    const user = userEvent.setup();
    const onGuardar = vi.fn();
    render(
      <FormularioTarea
        modo="crear"
        proyectos={proyectos}
        onGuardar={onGuardar}
        onCancelar={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Crear tarea' }));
    expect(await screen.findByText('Elige un proyecto', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('Ingresa un título')).toBeInTheDocument();
    expect(screen.getByText(/Describe qué se espera/)).toBeInTheDocument();
    expect(screen.getByText('Elige una fecha límite')).toBeInTheDocument();
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it('guarda con los datos completos', async () => {
    const user = userEvent.setup();
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    render(
      <FormularioTarea
        modo="crear"
        proyectos={proyectos}
        onGuardar={onGuardar}
        onCancelar={() => {}}
      />,
    );
    await user.selectOptions(screen.getByLabelText('Proyecto'), 'p1');
    await user.type(screen.getByLabelText('Título'), 'Pantalla de login');
    await user.type(screen.getByLabelText('Descripción'), 'Debe validar el correo');
    await user.type(screen.getByLabelText('Fecha límite'), '2026-11-30');
    await user.click(screen.getByLabelText('Requiere supervisión'));
    await user.click(screen.getByRole('button', { name: 'Crear tarea' }));
    expect(onGuardar).toHaveBeenCalledWith({
      idProyecto: 'p1',
      titulo: 'Pantalla de login',
      descripcion: 'Debe validar el correo',
      fechaLimite: '2026-11-30',
      requiereSupervision: true,
      requierePr: true,
    });
  });

  it('al editar, el proyecto no se puede cambiar', () => {
    render(
      <FormularioTarea
        modo="editar"
        proyectos={proyectos}
        valoresIniciales={{ idProyecto: 'p2' }}
        onGuardar={async () => {}}
        onCancelar={() => {}}
      />,
    );
    expect(screen.getByLabelText('Proyecto')).toBeDisabled();
    expect(screen.getByLabelText('Proyecto')).toHaveValue('p2');
  });

  it('si falla, muestra el error', async () => {
    const user = userEvent.setup();
    render(
      <FormularioTarea
        modo="editar"
        proyectos={proyectos}
        valoresIniciales={{
          idProyecto: 'p1',
          titulo: 'T',
          descripcion: 'D',
          fechaLimite: '2026-11-30',
        }}
        onGuardar={() => Promise.reject(new Error('La tarea ya no se puede editar'))}
        onCancelar={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La tarea ya no se puede editar');
  });
});

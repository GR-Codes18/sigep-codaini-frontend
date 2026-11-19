import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CriterioDeBloque } from '@/app/adaptadores';
import { fallo } from '@/services';
import { EditorBloqueCriterios } from './EditorBloqueCriterios';

const A: CriterioDeBloque = {
  id: 'cri-a',
  nombre: 'Nivel académico',
  tipo: 'ACADEMICO',
  peso: 30,
  obligatorio: true,
  activo: true,
};
const B: CriterioDeBloque = {
  id: 'cri-b',
  nombre: 'Disponibilidad',
  tipo: 'DISPONIBILIDAD',
  peso: 70,
  obligatorio: false,
  activo: true,
};
const C: CriterioDeBloque = {
  id: 'cri-c',
  nombre: 'Carta de recomendación',
  tipo: 'PALABRA_CLAVE',
  peso: 10,
  obligatorio: false,
  activo: false,
};

const ok = async () => ({ ok: true as const, valor: null });

function mostrar(
  criterios: readonly CriterioDeBloque[] = [A, B, C],
  onGuardar: Parameters<typeof EditorBloqueCriterios>[0]['onGuardar'] = ok,
  bloque: 'AREA' | 'ESPECIALIDAD' = 'AREA',
) {
  return render(
    <EditorBloqueCriterios bloque={bloque} criterios={criterios} onGuardar={onGuardar} />,
  );
}

/** Lo que recibió la primera llamada a `onGuardar`. */
function enviadosEn(onGuardar: { mock: { calls: unknown[][] } }): Record<string, unknown>[] {
  return (onGuardar.mock.calls[0]?.[0] ?? []) as Record<string, unknown>[];
}

async function escribirPeso(user: ReturnType<typeof userEvent.setup>, n: number, texto: string) {
  const campo = screen.getByLabelText(`Peso del criterio ${n}`);
  await user.clear(campo);
  if (texto !== '') await user.type(campo, texto);
}

describe('EditorBloqueCriterios', () => {
  describe('qué muestra', () => {
    it('una fila por criterio, también los desactivados, con su nombre, tipo, peso y marcas', () => {
      mostrar();

      expect(screen.getAllByRole('listitem')).toHaveLength(3);
      expect(screen.getByLabelText('Nombre del criterio 1')).toHaveValue('Nivel académico');
      expect(screen.getByLabelText('Tipo del criterio 1')).toHaveValue('ACADEMICO');
      expect(screen.getByLabelText('Peso del criterio 1')).toHaveValue('30');
      expect(screen.getByLabelText('Criterio 1 obligatorio')).toBeChecked();
      expect(screen.getByLabelText('Criterio 1 activo')).toBeChecked();
      expect(screen.getByLabelText('Criterio 2 obligatorio')).not.toBeChecked();
      expect(screen.getByLabelText('Nombre del criterio 3')).toHaveValue('Carta de recomendación');
      expect(screen.getByLabelText('Criterio 3 activo')).not.toBeChecked();
    });

    it('«Suma actual» cuenta solo los criterios activos', () => {
      mostrar();

      expect(screen.getByText('Suma actual: 100/100')).toBeInTheDocument();
    });

    it('un bloque válido no muestra ningún aviso de la regla', () => {
      mostrar();

      expect(
        screen.queryByText(/deben sumar|no tiene criterios activos|enteros mayores/),
      ).toBeNull();
    });

    it('un bloque sin criterios lo dice y suma 0', () => {
      mostrar([]);

      expect(screen.getByText(/Este bloque no tiene criterios/)).toBeInTheDocument();
      expect(screen.getByText('Suma actual: 0/100')).toBeInTheDocument();
      expect(
        screen.getByText('El bloque del área no tiene criterios activos.'),
      ).toBeInTheDocument();
    });

    it('el texto de la regla nombra el bloque: «de la especialidad»', () => {
      mostrar([], ok, 'ESPECIALIDAD');

      expect(
        screen.getByText('El bloque de la especialidad no tiene criterios activos.'),
      ).toBeInTheDocument();
    });
  });

  describe('suma en vivo y validación del bloque', () => {
    it('al cambiar un peso, la suma y el aviso se actualizan al instante', async () => {
      const user = userEvent.setup();
      mostrar();

      await escribirPeso(user, 1, '40');
      expect(screen.getByText('Suma actual: 110/100')).toBeInTheDocument();
      expect(
        screen.getByText('Los pesos de los criterios activos del bloque del área deben sumar 100.'),
      ).toBeInTheDocument();

      await escribirPeso(user, 2, '60');
      expect(screen.getByText('Suma actual: 100/100')).toBeInTheDocument();
      expect(screen.queryByText(/deben sumar/)).toBeNull();
    });

    it('desactivar un criterio lo saca de la suma; reactivarlo lo vuelve a sumar', async () => {
      const user = userEvent.setup();
      mostrar();

      await user.click(screen.getByLabelText('Criterio 1 activo'));
      expect(screen.getByText('Suma actual: 70/100')).toBeInTheDocument();

      await user.click(screen.getByLabelText('Criterio 1 activo'));
      expect(screen.getByText('Suma actual: 100/100')).toBeInTheDocument();
    });

    it('activar un criterio desactivado suma su peso', async () => {
      const user = userEvent.setup();
      mostrar();

      await user.click(screen.getByLabelText('Criterio 3 activo'));

      expect(screen.getByText('Suma actual: 110/100')).toBeInTheDocument();
    });

    it('un peso sin escribir no suma y la regla dice que los pesos deben ser enteros mayores que 0', async () => {
      const user = userEvent.setup();
      mostrar();

      await escribirPeso(user, 1, '');

      expect(screen.getByText('Suma actual: 70/100')).toBeInTheDocument();
      expect(
        screen.getByText('Los pesos del bloque del área deben ser números enteros mayores que 0.'),
      ).toBeInTheDocument();
    });

    it.each(['2.5', '0', '-5', 'abc'])('el peso «%s» no es un entero mayor que 0', async (peso) => {
      const user = userEvent.setup();
      mostrar();

      await escribirPeso(user, 1, peso);

      expect(
        screen.getByText('Los pesos del bloque del área deben ser números enteros mayores que 0.'),
      ).toBeInTheDocument();
    });

    it('con todos los criterios desactivados dice que el bloque no tiene criterios activos', async () => {
      const user = userEvent.setup();
      mostrar();

      await user.click(screen.getByLabelText('Criterio 1 activo'));
      await user.click(screen.getByLabelText('Criterio 2 activo'));

      expect(screen.getByText('Suma actual: 0/100')).toBeInTheDocument();
      expect(
        screen.getByText('El bloque del área no tiene criterios activos.'),
      ).toBeInTheDocument();
    });
  });

  describe('nada se borra', () => {
    it('los criterios guardados no se pueden quitar: solo desactivar', () => {
      mostrar();

      expect(screen.queryByRole('button', { name: /quitar|eliminar|borrar/i })).toBeNull();
    });

    it('un criterio nuevo, todavía sin guardar, sí se puede quitar', async () => {
      const user = userEvent.setup();
      mostrar();

      await user.click(screen.getByRole('button', { name: 'Agregar criterio' }));
      expect(screen.getAllByRole('listitem')).toHaveLength(4);
      await user.click(screen.getByRole('button', { name: 'Quitar' }));

      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });

    it('agregar un criterio crea una fila vacía, activa y no obligatoria al final', async () => {
      const user = userEvent.setup();
      mostrar();

      await user.click(screen.getByRole('button', { name: 'Agregar criterio' }));

      expect(screen.getByLabelText('Nombre del criterio 4')).toHaveValue('');
      expect(screen.getByLabelText('Peso del criterio 4')).toHaveValue('');
      expect(screen.getByLabelText('Criterio 4 activo')).toBeChecked();
      expect(screen.getByLabelText('Criterio 4 obligatorio')).not.toBeChecked();
    });
  });

  describe('guardar el bloque completo', () => {
    it('sin cambios no se puede guardar ni descartar', () => {
      mostrar();

      expect(screen.getByRole('button', { name: 'Guardar criterios' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Descartar cambios' })).toBeDisabled();
    });

    it('con un cambio se habilitan; descartar vuelve a lo guardado', async () => {
      const user = userEvent.setup();
      mostrar();

      await escribirPeso(user, 1, '40');
      expect(screen.getByRole('button', { name: 'Guardar criterios' })).toBeEnabled();

      await user.click(screen.getByRole('button', { name: 'Descartar cambios' }));
      expect(screen.getByLabelText('Peso del criterio 1')).toHaveValue('30');
      expect(screen.getByText('Suma actual: 100/100')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Guardar criterios' })).toBeDisabled();
    });

    it('volver al valor guardado a mano también deja el bloque sin cambios', async () => {
      const user = userEvent.setup();
      mostrar();

      await escribirPeso(user, 1, '40');
      await escribirPeso(user, 1, '30');

      expect(screen.getByRole('button', { name: 'Guardar criterios' })).toBeDisabled();
    });

    it('envía el bloque completo en una sola llamada: todos los criterios, con su id, y los nuevos sin id', async () => {
      const user = userEvent.setup();
      const onGuardar = vi.fn(ok);
      mostrar([A, B, C], onGuardar);

      await escribirPeso(user, 1, '40');
      await escribirPeso(user, 2, '60');
      await user.click(screen.getByRole('button', { name: 'Agregar criterio' }));
      await user.type(screen.getByLabelText('Nombre del criterio 4'), 'React');
      await user.selectOptions(screen.getByLabelText('Tipo del criterio 4'), 'TECNOLOGIA');
      await user.click(screen.getByLabelText('Criterio 4 activo')); // nace desactivado
      await user.click(screen.getByRole('button', { name: 'Guardar criterios' }));

      expect(onGuardar).toHaveBeenCalledTimes(1);
      expect(onGuardar).toHaveBeenCalledWith([
        {
          id: 'cri-a',
          nombre: 'Nivel académico',
          tipo: 'ACADEMICO',
          peso: 40,
          obligatorio: true,
          activo: true,
        },
        {
          id: 'cri-b',
          nombre: 'Disponibilidad',
          tipo: 'DISPONIBILIDAD',
          peso: 60,
          obligatorio: false,
          activo: true,
        },
        {
          id: 'cri-c',
          nombre: 'Carta de recomendación',
          tipo: 'PALABRA_CLAVE',
          peso: 10,
          obligatorio: false,
          activo: false,
        },
        { nombre: 'React', tipo: 'TECNOLOGIA', peso: 0, obligatorio: false, activo: false },
      ]);
    });

    it('guardar desactivando un criterio lo envía como inactivo, no lo quita de la lista', async () => {
      const user = userEvent.setup();
      const onGuardar = vi.fn(ok);
      mostrar([A, B], onGuardar);

      await user.click(screen.getByLabelText('Criterio 1 activo'));
      await user.click(screen.getByRole('button', { name: 'Guardar criterios' }));

      const enviados = enviadosEn(onGuardar);
      expect(enviados).toHaveLength(2);
      expect(enviados[0]).toMatchObject({ id: 'cri-a', activo: false });
    });

    it('un criterio activo sin peso no se envía: lo señala en su fila', async () => {
      const user = userEvent.setup();
      const onGuardar = vi.fn(ok);
      mostrar([A, B], onGuardar);

      await escribirPeso(user, 1, '');
      await user.click(screen.getByRole('button', { name: 'Guardar criterios' }));

      expect(onGuardar).not.toHaveBeenCalled();
      expect(
        screen.getByText('Escribe el peso: un número entero mayor que 0.'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Peso del criterio 1')).toHaveAttribute('aria-invalid', 'true');
    });

    it('un criterio desactivado sin peso sí se envía (conserva cualquier número)', async () => {
      const user = userEvent.setup();
      const onGuardar = vi.fn(ok);
      mostrar([A, B, C], onGuardar);

      await escribirPeso(user, 3, '');
      await user.click(screen.getByRole('button', { name: 'Guardar criterios' }));

      expect(enviadosEn(onGuardar)[2]).toMatchObject({ id: 'cri-c', peso: 0, activo: false });
    });

    it('un bloque que no suma 100 igual se envía: la decisión es del servicio, y su error se muestra', async () => {
      const user = userEvent.setup();
      const onGuardar = vi.fn(async () =>
        fallo('PESOS_NO_SUMAN_100', 'Los pesos de los criterios activos deben sumar 100.'),
      );
      mostrar([A, B], onGuardar);

      await escribirPeso(user, 1, '40');
      await user.click(screen.getByRole('button', { name: 'Guardar criterios' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('deben sumar 100');
      expect(onGuardar).toHaveBeenCalledTimes(1);
      // El borrador se conserva para corregirlo.
      expect(screen.getByLabelText('Peso del criterio 1')).toHaveValue('40');
    });

    it('un error por campo del servicio sale en la fila que corresponde', async () => {
      const user = userEvent.setup();
      const onGuardar = vi.fn(async () =>
        fallo('NOMBRE_DUPLICADO', 'Ya hay un criterio con ese nombre en este bloque.', {
          'criterios.1.nombre': 'Ya hay un criterio con ese nombre en este bloque.',
        }),
      );
      mostrar([A, B], onGuardar);

      await user.clear(screen.getByLabelText('Nombre del criterio 2'));
      await user.type(screen.getByLabelText('Nombre del criterio 2'), 'Nivel académico');
      await user.click(screen.getByRole('button', { name: 'Guardar criterios' }));

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      const fila2 = screen.getByRole('listitem', { name: 'Criterio 2' });
      expect(fila2).toHaveTextContent('Ya hay un criterio con ese nombre en este bloque.');
      expect(screen.getByRole('listitem', { name: 'Criterio 1' })).not.toHaveTextContent(
        'Ya hay un criterio',
      );
      expect(screen.getByLabelText('Nombre del criterio 2')).toHaveAttribute(
        'aria-invalid',
        'true',
      );
    });

    it('mientras guarda deshabilita los campos y el botón dice «Guardando…»', async () => {
      const user = userEvent.setup();
      let terminar: () => void = () => {};
      const onGuardar = vi.fn(
        () =>
          new Promise<{ ok: true; valor: null }>((resolver) => {
            terminar = () => resolver({ ok: true, valor: null });
          }),
      );
      mostrar([A, B], onGuardar);

      await escribirPeso(user, 1, '40');
      await user.click(screen.getByRole('button', { name: 'Guardar criterios' }));

      expect(await screen.findByRole('button', { name: 'Guardando…' })).toBeDisabled();
      expect(screen.getByLabelText('Peso del criterio 1')).toBeDisabled();
      terminar();
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Guardando…' })).toBeNull());
    });
  });

  describe('si lo guardado cambia', () => {
    it('lo mismo en un objeto nuevo no borra lo que se está escribiendo', async () => {
      const user = userEvent.setup();
      const { rerender } = mostrar([A, B]);
      await escribirPeso(user, 1, '45');

      rerender(
        <EditorBloqueCriterios bloque="AREA" criterios={[{ ...A }, { ...B }]} onGuardar={ok} />,
      );

      expect(screen.getByLabelText('Peso del criterio 1')).toHaveValue('45');
    });

    it('un cambio real de lo guardado (se guardó o cambió en otra parte) reinicia el borrador', async () => {
      const user = userEvent.setup();
      const { rerender } = mostrar([A, B]);
      await escribirPeso(user, 1, '45');

      rerender(
        <EditorBloqueCriterios
          bloque="AREA"
          criterios={[
            { ...A, peso: 40 },
            { ...B, peso: 60 },
          ]}
          onGuardar={ok}
        />,
      );

      expect(screen.getByLabelText('Peso del criterio 1')).toHaveValue('40');
      expect(screen.getByLabelText('Peso del criterio 2')).toHaveValue('60');
      expect(screen.getByText('Suma actual: 100/100')).toBeInTheDocument();
    });
  });
});

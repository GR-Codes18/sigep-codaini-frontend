import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno } from '@/services';
import { PaginaPerfil } from './PaginaPerfil';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const PRACTICANTE = 'demo-practicante';

/** Sin la demora de red simulada, para no esperar 600 ms en cada consulta. */
const entorno = crearEntorno({ demoraMs: 0 });

const datos = () => useAlmacen.getState().datos;
const usuarioEnAlmacen = (id: Id) => datos().usuarios.find((u) => u.id === id)!;

function iniciarSesion(idUsuario: Id) {
  const usuario = usuarioEnAlmacen(idUsuario);
  useAlmacenSesion.getState().abrirSesion({
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    debe_cambiar_contrasena: usuario.debe_cambiar_contrasena,
  });
}

async function mostrar() {
  render(<PaginaPerfil entorno={entorno} />);
  await screen.findByRole('heading', { name: 'Datos personales' });
}

async function escribir(user: ReturnType<typeof userEvent.setup>, etiqueta: string, texto: string) {
  const campo = screen.getByLabelText(etiqueta);
  await user.clear(campo);
  if (texto !== '') await user.type(campo, texto);
}

describe('PaginaPerfil', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(PRACTICANTE);
  });

  it('mientras llega la consulta muestra un estado de carga', () => {
    render(<PaginaPerfil entorno={entorno} />);

    expect(screen.getByRole('status', { name: 'Cargando tu perfil' })).toBeInTheDocument();
  });

  describe('qué ve cada rol', () => {
    it('el Practicante ve la ficha de su práctica y edita los seis campos', async () => {
      const detalle = datos().practicantes.find((p) => p.id_usuario === PRACTICANTE)!;
      const area = datos().areas_tecnicas.find((a) => a.id === detalle.id_area_tecnica)!;

      await mostrar();

      expect(screen.getByText('Rol')).toBeInTheDocument();
      expect(screen.getByText('Practicante')).toBeInTheDocument();
      expect(screen.getByText(area.nombre)).toBeInTheDocument();
      expect(screen.getByText('Inicio de práctica')).toBeInTheDocument();
      expect(screen.getByText('Fin previsto')).toBeInTheDocument();
      for (const etiqueta of [
        'Nombre',
        'Correo',
        'Celular',
        'Usuario de Discord',
        'Cuenta de GitHub',
        'Disponibilidad (horas por semana)',
      ]) {
        expect(screen.getByLabelText(etiqueta)).toBeEnabled();
      }
    });

    it('el Supervisor ve su nombre y correo de solo lectura, sin ficha de práctica ni disponibilidad', async () => {
      iniciarSesion(SUPERVISOR);

      await mostrar();

      expect(screen.getByLabelText('Nombre')).toBeDisabled();
      expect(screen.getByLabelText('Correo')).toBeDisabled();
      expect(screen.getByLabelText('Celular')).toBeEnabled();
      expect(screen.getByLabelText('Usuario de Discord')).toBeEnabled();
      expect(screen.getByLabelText('Cuenta de GitHub')).toBeEnabled();
      expect(screen.queryByLabelText(/Disponibilidad/)).not.toBeInTheDocument();
      expect(screen.queryByText('Inicio de práctica')).not.toBeInTheDocument();
      expect(screen.queryByText('Área')).not.toBeInTheDocument();
    });

    it('el Administrador solo tiene nombre, correo y celular: Discord y GitHub no existen para su rol', async () => {
      iniciarSesion(ADMIN);

      await mostrar();

      for (const etiqueta of ['Nombre', 'Correo', 'Celular']) {
        expect(screen.getByLabelText(etiqueta)).toBeEnabled();
      }
      expect(screen.queryByLabelText('Usuario de Discord')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Cuenta de GitHub')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Disponibilidad/)).not.toBeInTheDocument();
    });

    it('no hay bloque de «Asignaciones y responsabilidades»: Mi perfil tiene los tres bloques de §8.2', async () => {
      await mostrar();

      expect(screen.queryByText('Asignaciones y responsabilidades')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Datos de la cuenta' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Datos personales' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Seguridad' })).toBeInTheDocument();
    });

    it('muestra los datos de la cuenta que están guardados', async () => {
      await mostrar();

      expect(screen.getByLabelText('Celular')).toHaveValue(usuarioEnAlmacen(PRACTICANTE).celular);
      expect(screen.getByLabelText('Correo')).toHaveValue(usuarioEnAlmacen(PRACTICANTE).correo);
    });
  });

  describe('guardar los datos personales', () => {
    it('guarda el celular con el servicio y refleja el nuevo valor', async () => {
      const user = userEvent.setup();
      await mostrar();

      await escribir(user, 'Celular', '987654321');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() => expect(usuarioEnAlmacen(PRACTICANTE).celular).toBe('987654321'));
      await waitFor(() => expect(screen.getByLabelText('Celular')).toHaveValue('987654321'));
    });

    it('al cambiar el nombre y el correo refresca la sesión (barra superior)', async () => {
      const user = userEvent.setup();
      await mostrar();

      await escribir(user, 'Nombre', 'Nombre Nuevo');
      await escribir(user, 'Correo', 'nuevo.correo@codaini.demo');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() => {
        expect(useAlmacenSesion.getState().usuario).toMatchObject({
          nombre: 'Nombre Nuevo',
          correo: 'nuevo.correo@codaini.demo',
        });
      });
    });

    it('un celular que no cumple la regla del servicio se rechaza junto al campo y no escribe', async () => {
      const user = userEvent.setup();
      const antes = usuarioEnAlmacen(PRACTICANTE).celular;
      await mostrar();

      await escribir(user, 'Celular', '12345678');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(
        await screen.findByText('El celular debe tener 9 dígitos y empezar con 9.'),
      ).toBeInTheDocument();
      expect(usuarioEnAlmacen(PRACTICANTE).celular).toBe(antes);
    });

    it('un correo que ya usa otra cuenta se rechaza junto al campo', async () => {
      const user = userEvent.setup();
      const ajeno = usuarioEnAlmacen(ADMIN).correo;
      const propio = usuarioEnAlmacen(PRACTICANTE).correo;
      await mostrar();

      await escribir(user, 'Correo', ajeno);
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(await screen.findAllByText('Ya existe una cuenta con ese correo.')).not.toHaveLength(
        0,
      );
      expect(screen.getByLabelText('Correo')).toHaveAttribute('aria-invalid', 'true');
      expect(usuarioEnAlmacen(PRACTICANTE).correo).toBe(propio);
    });

    it('sin cambios no escribe y avisa', async () => {
      const user = userEvent.setup();
      const antes = datos().usuarios;
      await mostrar();

      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(datos().usuarios).toBe(antes);
    });

    it('vaciar Discord quita el dato', async () => {
      const user = userEvent.setup();
      await mostrar();

      await escribir(user, 'Usuario de Discord', '');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() => {
        expect(datos().practicantes.find((p) => p.id_usuario === PRACTICANTE)?.discord).toBeNull();
      });
    });

    it('un Discord con espacios lo rechaza el servicio junto al campo', async () => {
      const user = userEvent.setup();
      await mostrar();

      await escribir(user, 'Usuario de Discord', 'con espacios');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(await screen.findAllByText('Discord no puede tener espacios.')).not.toHaveLength(0);
      expect(screen.getByLabelText('Usuario de Discord')).toHaveAttribute('aria-invalid', 'true');
    });

    it('una disponibilidad que no es un entero positivo se rechaza junto al campo; vacía la quita', async () => {
      const user = userEvent.setup();
      await mostrar();

      await escribir(user, 'Disponibilidad (horas por semana)', '2.5');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      expect(
        await screen.findAllByText('La disponibilidad debe ser un número entero mayor que 0.'),
      ).not.toHaveLength(0);

      await escribir(user, 'Disponibilidad (horas por semana)', '');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      await waitFor(() => {
        expect(
          datos().practicantes.find((p) => p.id_usuario === PRACTICANTE)?.disponibilidad_horaria,
        ).toBeNull();
      });
    });

    it('el Supervisor guarda su Discord sin tocar los campos que no puede editar', async () => {
      const user = userEvent.setup();
      iniciarSesion(SUPERVISOR);
      const nombreAntes = usuarioEnAlmacen(SUPERVISOR).nombre;
      await mostrar();

      await escribir(user, 'Usuario de Discord', 'supervisor.nuevo');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() => {
        expect(datos().supervisores.find((s) => s.id_usuario === SUPERVISOR)?.discord).toBe(
          'supervisor.nuevo',
        );
      });
      expect(usuarioEnAlmacen(SUPERVISOR).nombre).toBe(nombreAntes);
    });
  });

  describe('cambiar la contraseña', () => {
    async function rellenar(
      user: ReturnType<typeof userEvent.setup>,
      actual: string,
      nueva: string,
      confirmacion = nueva,
    ) {
      await user.type(screen.getByLabelText('Contraseña actual'), actual);
      await user.type(screen.getByLabelText('Nueva contraseña'), nueva);
      await user.type(screen.getByLabelText('Confirmar nueva contraseña'), confirmacion);
      await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    }

    it('cambia la contraseña, quita la marca temporal y refresca la sesión', async () => {
      const user = userEvent.setup();
      useAlmacen.getState().transaccion((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === PRACTICANTE ? { ...u, debe_cambiar_contrasena: true } : u,
        ),
      }));
      iniciarSesion(PRACTICANTE);
      await mostrar();

      await rellenar(user, usuarioEnAlmacen(PRACTICANTE).contrasena, 'nueva-clave-1');

      await waitFor(() => {
        expect(useAlmacenSesion.getState().usuario?.debe_cambiar_contrasena).toBe(false);
      });
      expect(usuarioEnAlmacen(PRACTICANTE).contrasena).toBe('nueva-clave-1');
      expect(usuarioEnAlmacen(PRACTICANTE).debe_cambiar_contrasena).toBe(false);
    });

    it('con la contraseña actual incorrecta muestra el error junto a su campo y no cambia nada', async () => {
      const user = userEvent.setup();
      const antes = usuarioEnAlmacen(PRACTICANTE).contrasena;
      await mostrar();

      await rellenar(user, 'incorrecta-1', 'nueva-clave-1');

      expect(await screen.findAllByText('La contraseña actual no es correcta.')).not.toHaveLength(
        0,
      );
      expect(usuarioEnAlmacen(PRACTICANTE).contrasena).toBe(antes);
    });

    it('una nueva demasiado corta se rechaza antes de llamar al servicio', async () => {
      const user = userEvent.setup();
      const antes = usuarioEnAlmacen(PRACTICANTE).contrasena;
      await mostrar();

      await rellenar(user, antes, 'corta');

      expect(await screen.findByText('Mínimo 8 caracteres')).toBeInTheDocument();
      expect(usuarioEnAlmacen(PRACTICANTE).contrasena).toBe(antes);
    });
  });

  it('sin sesión no muestra nada', () => {
    useAlmacenSesion.getState().cerrarSesion();

    const { container } = render(<PaginaPerfil entorno={entorno} />);

    expect(container).toBeEmptyDOMElement();
  });
});

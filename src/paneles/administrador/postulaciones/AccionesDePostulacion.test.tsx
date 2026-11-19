import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { AccionDecisionPostulacion, Id } from '@/domain';
import { crearEntorno } from '@/services';
import { AccionesDePostulacion } from './AccionesDePostulacion';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const PENDIENTE = 'pos-25';

/** Sin la demora de red simulada, para no esperar 600 ms en cada acción. */
const entorno = crearEntorno({ demoraMs: 0 });

const datos = () => useAlmacen.getState().datos;
const postulante = (id: Id) => datos().postulantes.find((p) => p.id === id)!;

function mostrar(
  idPostulante: Id,
  decisiones: readonly AccionDecisionPostulacion[],
  idActor: Id = ADMIN,
) {
  const p = postulante(idPostulante);
  render(
    <AccionesDePostulacion
      idActor={idActor}
      postulacion={{ id: p.id, nombre: p.nombre, correo: p.correo }}
      decisiones={decisiones}
      entorno={entorno}
    />,
  );
  return p;
}

const rechazada = () => datos().postulantes.find((p) => p.estado === 'RECHAZADA')!;
const eventosDe = (id: Id) =>
  datos().historial.filter((e) => e.elemento.tipo === 'POSTULANTE' && e.elemento.id === id);

describe('AccionesDePostulacion', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  describe('qué botones se ofrecen (lo decide `domain/`, no la pantalla)', () => {
    it('una pendiente: Aprobar y Rechazar, y nada más', () => {
      mostrar(PENDIENTE, ['APROBAR', 'RECHAZAR']);

      const grupo = screen.getByRole('group', { name: 'Decisiones' });
      expect(
        within(grupo)
          .getAllByRole('button')
          .map((b) => b.textContent),
      ).toEqual(['Aprobar', 'Rechazar']);
    });

    it('una rechazada: solo Reconsiderar', () => {
      mostrar(rechazada().id, ['RECONSIDERAR']);

      expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Reconsiderar']);
    });

    it('sin decisiones (una aprobada) no hay botones ni grupo', () => {
      mostrar(PENDIENTE, []);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Decisiones' })).not.toBeInTheDocument();
    });
  });

  describe('aprobar', () => {
    it('pide confirmación y, al cancelar, no cambia nada', async () => {
      const user = userEvent.setup();
      const p = mostrar(PENDIENTE, ['APROBAR', 'RECHAZAR']);

      await user.click(screen.getByRole('button', { name: 'Aprobar' }));
      const dialogo = screen.getByRole('dialog', { name: 'Aprobar postulación' });
      expect(dialogo).toHaveTextContent(p.nombre);
      expect(dialogo).toHaveTextContent('contraseña temporal');
      expect(within(dialogo).queryByRole('textbox')).not.toBeInTheDocument();
      await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(postulante(PENDIENTE).estado).toBe('PENDIENTE');
      expect(datos().usuarios.some((u) => u.correo === p.correo)).toBe(false);
    });

    it('al confirmar crea la cuenta y muestra la contraseña temporal, la misma que quedó guardada', async () => {
      const user = userEvent.setup();
      const p = mostrar(PENDIENTE, ['APROBAR', 'RECHAZAR']);

      await user.click(screen.getByRole('button', { name: 'Aprobar' }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Aprobar' }));

      const dialogo = await screen.findByRole('dialog', { name: 'Cuenta de practicante creada' });
      const cuenta = datos().usuarios.find((u) => u.correo === p.correo)!;
      expect(postulante(PENDIENTE).estado).toBe('APROBADA');
      expect(cuenta).toMatchObject({
        rol: 'PRACTICANTE',
        estado: 'ACTIVO',
        debe_cambiar_contrasena: true,
      });
      expect(within(dialogo).getByLabelText('Contraseña temporal')).toHaveTextContent(
        cuenta.contrasena,
      );
      expect(dialogo).toHaveTextContent(p.correo);
    });

    it('la contraseña se ve una sola vez: al cerrar ya no está en pantalla', async () => {
      const user = userEvent.setup();
      mostrar(PENDIENTE, ['APROBAR']);
      await user.click(screen.getByRole('button', { name: 'Aprobar' }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Aprobar' }));
      const dialogo = await screen.findByRole('dialog', { name: 'Cuenta de practicante creada' });
      const contrasena = within(dialogo).getByLabelText('Contraseña temporal').textContent!;

      await user.click(within(dialogo).getByRole('button', { name: 'Entendido' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.body).not.toHaveTextContent(contrasena);
    });

    it('la contraseña temporal nunca llega al historial ni a las notificaciones', async () => {
      const user = userEvent.setup();
      const p = mostrar(PENDIENTE, ['APROBAR']);
      await user.click(screen.getByRole('button', { name: 'Aprobar' }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Aprobar' }));
      await screen.findByRole('dialog', { name: 'Cuenta de practicante creada' });
      const contrasena = datos().usuarios.find((u) => u.correo === p.correo)!.contrasena;

      expect(JSON.stringify(datos().historial)).not.toContain(contrasena);
      expect(JSON.stringify(datos().notificaciones)).not.toContain(contrasena);
    });

    it('deja el evento de la aprobación en el historial de la postulación', async () => {
      const user = userEvent.setup();
      mostrar(PENDIENTE, ['APROBAR']);
      const antes = eventosDe(PENDIENTE).length;

      await user.click(screen.getByRole('button', { name: 'Aprobar' }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Aprobar' }));
      await screen.findByRole('dialog', { name: 'Cuenta de practicante creada' });

      const nuevos = eventosDe(PENDIENTE).slice(antes);
      expect(nuevos.map((e) => e.tipo_accion)).toContain('POSTULACION_APROBADA');
    });

    it('un correo que ya usa otra cuenta se rechaza: el modal sigue abierto con el mensaje y no se crea nada', async () => {
      const user = userEvent.setup();
      const p = mostrar(PENDIENTE, ['APROBAR']);
      const cuentas = datos().usuarios.length;
      useAlmacen.getState().transaccion((d) => ({
        usuarios: d.usuarios.map((u) => (u.id === ADMIN ? { ...u, correo: p.correo } : u)),
      }));

      await user.click(screen.getByRole('button', { name: 'Aprobar' }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Aprobar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Ya existe una cuenta con ese correo',
      );
      expect(screen.getByRole('dialog', { name: 'Aprobar postulación' })).toBeInTheDocument();
      expect(datos().usuarios).toHaveLength(cuentas);
      expect(postulante(PENDIENTE).estado).toBe('PENDIENTE');
      expect(screen.queryByLabelText('Contraseña temporal')).not.toBeInTheDocument();
    });

    it('quien no es Administrador recibe el error y no se aprueba nada', async () => {
      const user = userEvent.setup();
      mostrar(PENDIENTE, ['APROBAR'], SUPERVISOR);

      await user.click(screen.getByRole('button', { name: 'Aprobar' }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Aprobar' }));

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(postulante(PENDIENTE).estado).toBe('PENDIENTE');
      expect(screen.queryByLabelText('Contraseña temporal')).not.toBeInTheDocument();
    });

    it('si la postulación cambió de estado por otro lado, el servicio lo dice y no se duplica la cuenta', async () => {
      const user = userEvent.setup();
      mostrar(PENDIENTE, ['APROBAR']);
      useAlmacen.getState().transaccion((d) => ({
        postulantes: d.postulantes.map((p) =>
          p.id === PENDIENTE ? { ...p, estado: 'RECHAZADA' as const } : p,
        ),
      }));
      const cuentas = datos().usuarios.length;

      await user.click(screen.getByRole('button', { name: 'Aprobar' }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Aprobar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Solo se puede aprobar o rechazar una postulación pendiente',
      );
      expect(datos().usuarios).toHaveLength(cuentas);
    });
  });

  describe('rechazar', () => {
    it('exige un motivo: sin texto, o solo con espacios, no se puede confirmar', async () => {
      const user = userEvent.setup();
      mostrar(PENDIENTE, ['APROBAR', 'RECHAZAR']);

      await user.click(screen.getByRole('button', { name: 'Rechazar' }));
      const dialogo = screen.getByRole('dialog', { name: 'Rechazar postulación' });
      const confirmar = within(dialogo).getByRole('button', { name: 'Rechazar' });
      expect(confirmar).toBeDisabled();

      await user.type(within(dialogo).getByLabelText('Motivo'), '   ');
      expect(confirmar).toBeDisabled();
      expect(postulante(PENDIENTE).estado).toBe('PENDIENTE');
    });

    it('con motivo rechaza y lo deja en el historial', async () => {
      const user = userEvent.setup();
      mostrar(PENDIENTE, ['APROBAR', 'RECHAZAR']);

      await user.click(screen.getByRole('button', { name: 'Rechazar' }));
      const dialogo = screen.getByRole('dialog', { name: 'Rechazar postulación' });
      await user.type(within(dialogo).getByLabelText('Motivo'), '  No cumple el perfil técnico  ');
      await user.click(within(dialogo).getByRole('button', { name: 'Rechazar' }));

      await waitFor(() => expect(postulante(PENDIENTE).estado).toBe('RECHAZADA'));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      const evento = eventosDe(PENDIENTE).find((e) => e.tipo_accion === 'POSTULACION_RECHAZADA')!;
      expect(evento.nota).toBe('No cumple el perfil técnico');
    });

    it('no crea ninguna cuenta ni muestra contraseña', async () => {
      const user = userEvent.setup();
      mostrar(PENDIENTE, ['RECHAZAR']);
      const cuentas = datos().usuarios.length;

      await user.click(screen.getByRole('button', { name: 'Rechazar' }));
      await user.type(screen.getByLabelText('Motivo'), 'No cumple');
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Rechazar' }),
      );

      await waitFor(() => expect(postulante(PENDIENTE).estado).toBe('RECHAZADA'));
      expect(datos().usuarios).toHaveLength(cuentas);
      expect(screen.queryByLabelText('Contraseña temporal')).not.toBeInTheDocument();
    });

    it('una postulación que ya no está pendiente muestra el error del servicio y el modal sigue abierto', async () => {
      const user = userEvent.setup();
      mostrar(PENDIENTE, ['RECHAZAR']);
      useAlmacen.getState().transaccion((d) => ({
        postulantes: d.postulantes.map((p) =>
          p.id === PENDIENTE ? { ...p, estado: 'APROBADA' as const } : p,
        ),
      }));

      await user.click(screen.getByRole('button', { name: 'Rechazar' }));
      await user.type(screen.getByLabelText('Motivo'), 'No cumple');
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Rechazar' }),
      );

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Solo se puede aprobar o rechazar una postulación pendiente',
      );
      expect(screen.getByRole('dialog', { name: 'Rechazar postulación' })).toBeInTheDocument();
    });
  });

  describe('reconsiderar', () => {
    it('exige una nota: sin texto no se puede confirmar', async () => {
      const user = userEvent.setup();
      mostrar(rechazada().id, ['RECONSIDERAR']);

      await user.click(screen.getByRole('button', { name: 'Reconsiderar' }));
      const dialogo = screen.getByRole('dialog', { name: 'Reconsiderar postulación' });

      expect(within(dialogo).getByLabelText('Nota')).toBeInTheDocument();
      expect(within(dialogo).getByRole('button', { name: 'Reconsiderar' })).toBeDisabled();
    });

    it('con nota vuelve a «Pendiente», conserva la evaluación y deja la nota en el historial', async () => {
      const user = userEvent.setup();
      const r = rechazada();
      mostrar(r.id, ['RECONSIDERAR']);
      const evaluaciones = datos().evaluaciones.filter((e) => e.id_postulante === r.id);

      await user.click(screen.getByRole('button', { name: 'Reconsiderar' }));
      const dialogo = screen.getByRole('dialog', { name: 'Reconsiderar postulación' });
      await user.type(within(dialogo).getByLabelText('Nota'), 'Hubo un error en la evaluación');
      await user.click(within(dialogo).getByRole('button', { name: 'Reconsiderar' }));

      await waitFor(() => expect(postulante(r.id).estado).toBe('PENDIENTE'));
      expect(datos().evaluaciones.filter((e) => e.id_postulante === r.id)).toEqual(evaluaciones);
      const evento = eventosDe(r.id).find((e) => e.tipo_accion === 'POSTULACION_RECONSIDERADA')!;
      expect(evento.nota).toBe('Hubo un error en la evaluación');
    });

    it('una aprobada no se revierte: el servicio lo dice', async () => {
      const user = userEvent.setup();
      const r = rechazada();
      mostrar(r.id, ['RECONSIDERAR']);
      useAlmacen.getState().transaccion((d) => ({
        postulantes: d.postulantes.map((p) =>
          p.id === r.id ? { ...p, estado: 'APROBADA' as const } : p,
        ),
      }));

      await user.click(screen.getByRole('button', { name: 'Reconsiderar' }));
      await user.type(screen.getByLabelText('Nota'), 'Quiero revertirla');
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Reconsiderar' }),
      );

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Solo se puede reconsiderar una postulación rechazada',
      );
      expect(postulante(r.id).estado).toBe('APROBADA');
    });
  });

  it('un servicio que tarda deja el botón en «Procesando…» y no se puede confirmar dos veces', async () => {
    const user = userEvent.setup();
    const lento = crearEntorno({ demoraMs: 200 });
    const p = postulante(PENDIENTE);
    render(
      <AccionesDePostulacion
        idActor={ADMIN}
        postulacion={{ id: p.id, nombre: p.nombre, correo: p.correo }}
        decisiones={['APROBAR']}
        entorno={lento}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Aprobar' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Aprobar' }));

    expect(await screen.findByRole('button', { name: 'Procesando…' })).toBeDisabled();
    await screen.findByRole('dialog', { name: 'Cuenta de practicante creada' });
    expect(datos().usuarios.filter((u) => u.correo === p.correo)).toHaveLength(1);
  });
});

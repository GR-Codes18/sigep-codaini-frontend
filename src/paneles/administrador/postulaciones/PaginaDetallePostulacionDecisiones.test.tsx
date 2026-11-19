import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno, type Entorno } from '@/services';
import { PaginaDetallePostulacion } from './PaginaDetallePostulacion';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const APROBADA = 'pos-17';
const PENDIENTE = 'pos-25';

/** Sin la demora de red simulada, para no esperar 600 ms en cada consulta. */
const entorno = crearEntorno({ demoraMs: 0 });
/** Con una demora corta, para poder ver «Analizando…». */
const lento = crearEntorno({ demoraMs: 150 });

const datos = () => useAlmacen.getState().datos;
const postulante = (id: Id) => datos().postulantes.find((p) => p.id === id)!;
const rechazada = () => datos().postulantes.find((p) => p.estado === 'RECHAZADA')!;
const evaluacionesDe = (id: Id) => datos().evaluaciones.filter((e) => e.id_postulante === id);

function iniciarSesion(idUsuario: Id) {
  const usuario = datos().usuarios.find((u) => u.id === idUsuario)!;
  useAlmacenSesion.getState().abrirSesion({
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    debe_cambiar_contrasena: usuario.debe_cambiar_contrasena,
  });
}

function sinEvaluar(id: Id) {
  useAlmacen.getState().transaccion((d) => {
    const ids = new Set(d.evaluaciones.filter((e) => e.id_postulante === id).map((e) => e.id));
    return {
      evaluaciones: d.evaluaciones.filter((e) => e.id_postulante !== id),
      detalles_evaluacion: d.detalles_evaluacion.filter((x) => !ids.has(x.id_evaluacion)),
    };
  });
}

async function mostrar(idPostulante: Id, entornoDePagina: Entorno = entorno) {
  render(
    <MemoryRouter initialEntries={[`/administrador/postulaciones/${idPostulante}`]}>
      <Routes>
        <Route
          path="/administrador/postulaciones/:idPostulante"
          element={<PaginaDetallePostulacion entorno={entornoDePagina} />}
        />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando la postulación' })).toBeNull(),
  );
}

describe('PaginaDetallePostulacion: evaluación y decisiones', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  describe('«Analizando…» y el error de evaluación (E5-A y E3-A)', () => {
    it('una postulación sin evaluación dice «Analizando…» mientras se evalúa y después muestra el resultado', async () => {
      sinEvaluar(PENDIENTE);

      await mostrar(PENDIENTE, lento);

      expect(await screen.findByText('Analizando…')).toBeInTheDocument();
      expect(await screen.findByText('Puntaje final')).toBeInTheDocument();
      expect(screen.queryByText('Analizando…')).not.toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Criterios del área' })).toBeInTheDocument();
    });

    it('la evaluación queda guardada, firmada por el Sistema, y se hace una sola vez', async () => {
      sinEvaluar(PENDIENTE);

      await mostrar(PENDIENTE);
      await screen.findByText('Puntaje final');

      expect(evaluacionesDe(PENDIENTE)).toHaveLength(1);
      const eventos = datos().historial.filter(
        (e) => e.elemento.id === PENDIENTE && e.tipo_accion === 'POSTULACION_EVALUADA',
      );
      expect(eventos.length).toBeGreaterThan(0);
      expect(eventos.at(-1)!.autor.tipo).toBe('SISTEMA');
    });

    it('no vuelve a evaluar una postulación que ya tiene evaluación', async () => {
      const eventosAntes = datos().historial.length;
      const evaluacionesAntes = datos().evaluaciones;

      await mostrar(PENDIENTE);

      expect(screen.queryByText('Analizando…')).not.toBeInTheDocument();
      expect(datos().evaluaciones).toBe(evaluacionesAntes);
      expect(datos().historial).toHaveLength(eventosAntes);
    });

    it('si el catálogo no permite calcular el puntaje dice «No se pudo evaluar: …» y no inventa un puntaje', async () => {
      sinEvaluar(PENDIENTE);
      const p = postulante(PENDIENTE);
      useAlmacen.getState().transaccion((d) => ({
        criterios: d.criterios.map((c) =>
          c.id_area_tecnica === p.id_area_tecnica && c.id_especialidad === null && c.activo
            ? { ...c, peso: c.peso + 1 }
            : c,
        ),
      }));

      await mostrar(PENDIENTE);

      const alerta = await screen.findByRole('alert');
      expect(alerta).toHaveTextContent('No se pudo evaluar:');
      expect(alerta).toHaveTextContent('Puedes decidir igualmente.');
      expect(screen.queryByText('Puntaje final')).not.toBeInTheDocument();
      expect(screen.queryByText('Analizando…')).not.toBeInTheDocument();
      expect(evaluacionesDe(PENDIENTE)).toHaveLength(0);
    });

    it('con la evaluación fallida las decisiones siguen disponibles (se decide con o sin evaluación)', async () => {
      sinEvaluar(PENDIENTE);
      const p = postulante(PENDIENTE);
      useAlmacen.getState().transaccion((d) => ({
        criterios: d.criterios.filter(
          (c) => !(c.id_area_tecnica === p.id_area_tecnica && c.id_especialidad === null),
        ),
      }));

      await mostrar(PENDIENTE);
      await screen.findByRole('alert');

      expect(screen.getByRole('button', { name: 'Aprobar' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Rechazar' })).toBeEnabled();
    });

    it('un fallo se intenta una sola vez: no entra en un ciclo de reintentos', async () => {
      sinEvaluar(PENDIENTE);
      useAlmacen.getState().transaccion((d) => ({
        criterios: d.criterios.map((c) => ({ ...c, activo: false })),
      }));
      const eventosAntes = datos().historial.length;

      await mostrar(PENDIENTE);
      await screen.findByRole('alert');
      await new Promise((resolver) => setTimeout(resolver, 150));

      expect(datos().historial).toHaveLength(eventosAntes);
      expect(evaluacionesDe(PENDIENTE)).toHaveLength(0);
    });

    it('aprobar con la evaluación fallida igual crea la cuenta', async () => {
      const user = userEvent.setup();
      sinEvaluar(PENDIENTE);
      useAlmacen.getState().transaccion((d) => ({
        criterios: d.criterios.map((c) => ({ ...c, activo: false })),
      }));
      await mostrar(PENDIENTE);
      await screen.findByRole('alert');

      await user.click(screen.getByRole('button', { name: 'Aprobar' }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Aprobar' }));

      await screen.findByRole('dialog', { name: 'Cuenta de practicante creada' });
      expect(postulante(PENDIENTE).estado).toBe('APROBADA');
    });
  });

  describe('decisiones desde el detalle', () => {
    it('una pendiente ofrece Aprobar y Rechazar', async () => {
      await mostrar(PENDIENTE);

      expect(screen.getByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Reconsiderar' })).not.toBeInTheDocument();
    });

    it('una rechazada ofrece solo Reconsiderar', async () => {
      await mostrar(rechazada().id);

      expect(screen.getByRole('button', { name: 'Reconsiderar' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();
    });

    it('una aprobada no ofrece ninguna decisión: no se revierte aquí', async () => {
      await mostrar(APROBADA);

      expect(screen.queryByRole('group', { name: 'Decisiones' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /aprobar|rechazar|reconsiderar/i }),
      ).not.toBeInTheDocument();
    });

    it('al aprobar, la contraseña temporal sigue en pantalla aunque los botones desaparezcan', async () => {
      const user = userEvent.setup();
      const p = postulante(PENDIENTE);
      await mostrar(PENDIENTE);

      await user.click(screen.getByRole('button', { name: 'Aprobar' }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Aprobar' }));

      const dialogo = await screen.findByRole('dialog', { name: 'Cuenta de practicante creada' });
      // La página ya se refrescó: la postulación está aprobada y sus botones se fueron…
      await screen.findByText(/Se creó la cuenta de practicante de/);
      expect(screen.queryByRole('group', { name: 'Decisiones' })).not.toBeInTheDocument();
      // …pero la contraseña no desapareció antes de que la persona la viera.
      const contrasena = datos().usuarios.find((u) => u.correo === p.correo)!.contrasena;
      expect(within(dialogo).getByLabelText('Contraseña temporal')).toHaveTextContent(contrasena);

      await user.click(within(dialogo).getByRole('button', { name: 'Entendido' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.body).not.toHaveTextContent(contrasena);
    });

    it('al rechazar con motivo, la página pasa a «Rechazada», ofrece Reconsiderar y muestra el motivo', async () => {
      const user = userEvent.setup();
      await mostrar(PENDIENTE);

      await user.click(screen.getByRole('button', { name: 'Rechazar' }));
      await user.type(screen.getByLabelText('Motivo'), 'No cumple el perfil');
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Rechazar' }),
      );

      expect(await screen.findByRole('button', { name: 'Reconsiderar' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument();
      const historial = screen.getByRole('region', { name: 'Historial de la postulación' });
      expect(await within(historial).findByText(/No cumple el perfil/)).toBeInTheDocument();
    });

    it('al reconsiderar con nota, la página vuelve a «Pendiente» y conserva su evaluación', async () => {
      const user = userEvent.setup();
      await mostrar(rechazada().id);
      await screen.findByText('Puntaje final');

      await user.click(screen.getByRole('button', { name: 'Reconsiderar' }));
      await user.type(screen.getByLabelText('Nota'), 'Hubo un error en la evaluación');
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Reconsiderar' }),
      );

      expect(await screen.findByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
      expect(screen.getByText('Puntaje final')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Reconsiderar' })).not.toBeInTheDocument();
    });

    it('quien no es Administrador no ve botones de decisión', async () => {
      useAlmacenSesion.getState().cerrarSesion();
      iniciarSesion(SUPERVISOR);

      await mostrar(PENDIENTE);

      expect(
        screen.queryByRole('button', { name: /aprobar|rechazar|reconsiderar/i }),
      ).not.toBeInTheDocument();
    });
  });
});

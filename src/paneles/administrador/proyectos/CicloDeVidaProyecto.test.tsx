import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno } from '@/services';
import { PaginaDetalleProyecto } from './PaginaDetalleProyecto';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const ACTIVO = 'pry-pl2d'; // 2 tareas esperando supervisión
const EN_PAUSA = 'pry-inv';
const FINALIZADO = 'pry-tie';
const SUPERVISOR_DEL_FINALIZADO = 'usr-sup-02';
const OTRO_SUPERVISOR = 'usr-sup-02';

const entorno = crearEntorno({ demoraMs: 0 });
const datos = () => useAlmacen.getState().datos;
const proyecto = (id: Id) => datos().proyectos.find((p) => p.id === id)!;
const tareasDe = (id: Id) => datos().tareas.filter((t) => t.id_proyecto === id);

function iniciarSesion(idUsuario: Id) {
  const u = datos().usuarios.find((x) => x.id === idUsuario)!;
  useAlmacenSesion.getState().abrirSesion({
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
    rol: u.rol,
    debe_cambiar_contrasena: u.debe_cambiar_contrasena,
  });
}

function Ubicacion() {
  return <p data-testid="ubicacion">{useLocation().pathname}</p>;
}

async function mostrar(idProyecto: Id) {
  render(
    <MemoryRouter initialEntries={[`/administrador/proyectos/${idProyecto}`]}>
      <Routes>
        <Route
          path="/administrador/proyectos/:idProyecto"
          element={<PaginaDetalleProyecto entorno={entorno} />}
        />
        <Route path="/administrador/supervisores/:id" element={<p>Supervisor abierto</p>} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando el proyecto' })).toBeNull(),
  );
}

/** Pasa a «Terminada» las tareas que esperan supervisión, para poder finalizar sin bloqueo. */
function sinTareasEsperando(idProyecto: Id) {
  useAlmacen.getState().transaccion((d) => ({
    tareas: d.tareas.map((t) =>
      t.id_proyecto === idProyecto && t.estado === 'ESPERANDO_SUPERVISION'
        ? { ...t, estado: 'TERMINADA' as const }
        : t,
    ),
  }));
}

const boton = (nombre: string) => screen.getByRole('button', { name: nombre });
const cabecera = () => screen.getByRole('heading', { level: 1 }).closest('header')!;

describe('PaginaDetalleProyecto: ciclo de vida y cambio de supervisor', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  describe('qué botones se ofrecen', () => {
    it('un proyecto activo ofrece cambiar supervisor, pausar y finalizar', async () => {
      await mostrar(ACTIVO);

      const textos = within(cabecera())
        .getAllByRole('button')
        .map((b) => b.textContent);
      expect(textos).toEqual([
        'Editar proyecto',
        'Cambiar supervisor',
        'Pausar proyecto',
        'Finalizar proyecto',
      ]);
    });

    it('un proyecto en pausa ofrece reanudar y finalizar, y no pausar', async () => {
      await mostrar(EN_PAUSA);

      expect(boton('Reanudar proyecto')).toBeVisible();
      expect(boton('Finalizar proyecto')).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Pausar proyecto' })).not.toBeInTheDocument();
    });

    it('un proyecto finalizado solo ofrece reactivar (y editar sus datos), sin cambiar supervisor', async () => {
      await mostrar(FINALIZADO);

      const textos = within(cabecera())
        .getAllByRole('button')
        .map((b) => b.textContent);
      expect(textos).toEqual(['Editar proyecto', 'Reactivar proyecto']);
    });

    it('el Supervisor del proyecto no ve los botones de ciclo de vida', async () => {
      useAlmacenSesion.getState().cerrarSesion();
      iniciarSesion(SUPERVISOR);
      await mostrar(ACTIVO);

      for (const nombre of [
        'Pausar proyecto',
        'Finalizar proyecto',
        'Cambiar supervisor',
        'Reactivar proyecto',
      ]) {
        expect(screen.queryByRole('button', { name: nombre })).not.toBeInTheDocument();
      }
    });
  });

  describe('pausar y reanudar', () => {
    it('pausar pide una nota obligatoria y no deja confirmar vacía', async () => {
      const user = userEvent.setup();
      await mostrar(ACTIVO);

      await user.click(boton('Pausar proyecto'));
      const dialogo = await screen.findByRole('dialog', { name: 'Pausar proyecto' });
      const confirmar = within(dialogo).getByRole('button', { name: 'Pausar' });

      expect(confirmar).toBeDisabled();
      await user.type(within(dialogo).getByLabelText(/Nota/), '   ');
      expect(confirmar).toBeDisabled();
      await user.type(within(dialogo).getByLabelText(/Nota/), 'Falta de equipo esta semana');
      expect(confirmar).toBeEnabled();
    });

    it('pausar deja el proyecto «En pausa», con registro y la nota, y avisa al equipo', async () => {
      const user = userEvent.setup();
      const avisosAntes = datos().notificaciones.length;
      await mostrar(ACTIVO);
      await user.click(boton('Pausar proyecto'));
      const dialogo = await screen.findByRole('dialog', { name: 'Pausar proyecto' });

      await user.type(within(dialogo).getByLabelText(/Nota/), 'Falta de equipo esta semana');
      await user.click(within(dialogo).getByRole('button', { name: 'Pausar' }));

      await waitFor(() => expect(proyecto(ACTIVO).estado).toBe('EN_PAUSA'));
      const evento = datos().historial.filter(
        (e) => e.tipo_accion === 'PROYECTO_PAUSADO' && e.id_proyecto === ACTIVO,
      );
      expect(evento.at(-1)?.nota).toBe('Falta de equipo esta semana');
      expect(datos().notificaciones.length).toBeGreaterThan(avisosAntes);
      await waitFor(() => expect(within(cabecera()).getByText('En pausa')).toBeInTheDocument());
      expect(within(cabecera()).getByRole('button', { name: 'Reanudar proyecto' })).toBeVisible();
    });

    it('reanudar vuelve a «Activo», con registro y la nota', async () => {
      const user = userEvent.setup();
      await mostrar(EN_PAUSA);
      await user.click(boton('Reanudar proyecto'));
      const dialogo = await screen.findByRole('dialog', { name: 'Reanudar proyecto' });

      await user.type(within(dialogo).getByLabelText(/Nota/), 'Ya hay equipo');
      await user.click(within(dialogo).getByRole('button', { name: 'Reanudar' }));

      await waitFor(() => expect(proyecto(EN_PAUSA).estado).toBe('ACTIVO'));
      const evento = datos().historial.filter(
        (e) => e.tipo_accion === 'PROYECTO_REANUDADO' && e.id_proyecto === EN_PAUSA,
      );
      expect(evento.at(-1)?.nota).toBe('Ya hay equipo');
    });

    it('cancelar no escribe nada', async () => {
      const user = userEvent.setup();
      const antes = datos();
      await mostrar(ACTIVO);
      await user.click(boton('Pausar proyecto'));
      const dialogo = await screen.findByRole('dialog', { name: 'Pausar proyecto' });
      await user.type(within(dialogo).getByLabelText(/Nota/), 'No se pausa');

      await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(datos()).toBe(antes);
    });

    it('si el servicio la rechaza, el diálogo sigue abierto con el mensaje y no escribe', async () => {
      const user = userEvent.setup();
      await mostrar(ACTIVO);
      await user.click(boton('Pausar proyecto'));
      const dialogo = await screen.findByRole('dialog', { name: 'Pausar proyecto' });
      await user.type(within(dialogo).getByLabelText(/Nota/), 'Otra pestaña la pausó antes');
      // Mientras el diálogo estaba abierto, otra pestaña ya había pausado el proyecto.
      useAlmacen.getState().transaccion((d) => ({
        proyectos: d.proyectos.map((p) =>
          p.id === ACTIVO ? { ...p, estado: 'EN_PAUSA' as const } : p,
        ),
      }));
      const historialAntes = datos().historial;

      await user.click(within(dialogo).getByRole('button', { name: 'Pausar' }));

      expect(await within(dialogo).findByRole('alert')).toBeInTheDocument();
      expect(datos().historial).toBe(historialAntes);
    });
  });

  describe('finalizar', () => {
    it('con tareas esperando supervisión está bloqueado y dice cuántas, sin escribir', async () => {
      const user = userEvent.setup();
      const antes = datos();
      await mostrar(ACTIVO);

      await user.click(boton('Finalizar proyecto'));

      const dialogo = await screen.findByRole('dialog', { name: 'No se puede finalizar' });
      expect(dialogo).toHaveTextContent('Tiene 2 tareas esperando supervisión');
      expect(within(dialogo).queryByRole('button', { name: 'Finalizar proyecto' })).toBeNull();
      expect(datos()).toBe(antes);
    });

    it('con una sola tarea esperando usa el singular', async () => {
      const user = userEvent.setup();
      let n = 0;
      useAlmacen.getState().transaccion((d) => ({
        tareas: d.tareas.map((t) =>
          t.id_proyecto === ACTIVO && t.estado === 'ESPERANDO_SUPERVISION' && n++ > 0
            ? { ...t, estado: 'TERMINADA' as const }
            : t,
        ),
      }));
      await mostrar(ACTIVO);

      await user.click(boton('Finalizar proyecto'));

      expect(
        await screen.findByRole('dialog', { name: 'No se puede finalizar' }),
      ).toHaveTextContent('Tiene 1 tarea esperando supervisión: es una decisión pendiente');
    });

    it('sin tareas esperando avisa cuántas «En progreso» se liberarán y pide una nota', async () => {
      const user = userEvent.setup();
      sinTareasEsperando(ACTIVO);
      const n = tareasDe(ACTIVO).filter((t) => t.estado === 'EN_PROGRESO').length;
      await mostrar(ACTIVO);

      await user.click(boton('Finalizar proyecto'));
      const dialogo = await screen.findByRole('dialog', { name: 'Finalizar proyecto' });

      expect(dialogo).toHaveTextContent(`Tiene ${n} tareas en progreso que serán liberadas.`);
      expect(within(dialogo).getByRole('button', { name: 'Finalizar proyecto' })).toBeDisabled();
    });

    it('sin tareas en progreso lo dice', async () => {
      const user = userEvent.setup();
      useAlmacen.getState().transaccion((d) => ({
        tareas: d.tareas.map((t) =>
          t.id_proyecto === ACTIVO &&
          (t.estado === 'ESPERANDO_SUPERVISION' || t.estado === 'EN_PROGRESO')
            ? { ...t, estado: 'TERMINADA' as const }
            : t,
        ),
      }));
      await mostrar(ACTIVO);

      await user.click(boton('Finalizar proyecto'));

      expect(await screen.findByRole('dialog', { name: 'Finalizar proyecto' })).toHaveTextContent(
        'No tiene tareas en progreso.',
      );
    });

    it('al confirmar libera las «En progreso», guarda la fecha real y no cierra las asignaciones', async () => {
      const user = userEvent.setup();
      sinTareasEsperando(ACTIVO);
      const enProgreso = tareasDe(ACTIVO).filter((t) => t.estado === 'EN_PROGRESO');
      const vigentesAntes = datos().asignaciones.filter(
        (a) => a.id_proyecto === ACTIVO && a.fecha_baja === null,
      );
      await mostrar(ACTIVO);
      await user.click(boton('Finalizar proyecto'));
      const dialogo = await screen.findByRole('dialog', { name: 'Finalizar proyecto' });

      await user.type(within(dialogo).getByLabelText(/Nota/), 'Se cumplió el alcance');
      await user.click(within(dialogo).getByRole('button', { name: 'Finalizar proyecto' }));

      await waitFor(() => expect(proyecto(ACTIVO).estado).toBe('FINALIZADO'));
      expect(proyecto(ACTIVO).fecha_fin_real).not.toBeNull();
      for (const t of enProgreso) {
        const despues = datos().tareas.find((x) => x.id === t.id)!;
        expect(despues.estado).toBe('DISPONIBLE');
        expect(despues.id_practicante).toBeNull();
      }
      expect(
        datos().asignaciones.filter((a) => a.id_proyecto === ACTIVO && a.fecha_baja === null),
      ).toEqual(vigentesAntes);
      const evento = datos().historial.filter(
        (e) => e.tipo_accion === 'PROYECTO_FINALIZADO' && e.id_proyecto === ACTIVO,
      );
      expect(evento.at(-1)?.nota).toBe('Se cumplió el alcance');
      await waitFor(() => expect(within(cabecera()).getByText('Finalizado')).toBeInTheDocument());
      expect(within(cabecera()).getByRole('button', { name: 'Reactivar proyecto' })).toBeVisible();
    });

    it('un proyecto en pausa también se puede finalizar', async () => {
      const user = userEvent.setup();
      sinTareasEsperando(EN_PAUSA);
      await mostrar(EN_PAUSA);
      await user.click(boton('Finalizar proyecto'));
      const dialogo = await screen.findByRole('dialog', { name: 'Finalizar proyecto' });

      await user.type(within(dialogo).getByLabelText(/Nota/), 'Cierre anticipado');
      await user.click(within(dialogo).getByRole('button', { name: 'Finalizar proyecto' }));

      await waitFor(() => expect(proyecto(EN_PAUSA).estado).toBe('FINALIZADO'));
    });

    it('si mientras se confirma llega una tarea a supervisión, la pantalla pasa al aviso de bloqueo', async () => {
      const user = userEvent.setup();
      sinTareasEsperando(ACTIVO);
      await mostrar(ACTIVO);
      await user.click(boton('Finalizar proyecto'));
      await screen.findByRole('dialog', { name: 'Finalizar proyecto' });

      const enProgreso = tareasDe(ACTIVO).find((t) => t.estado === 'EN_PROGRESO')!;
      useAlmacen.getState().transaccion((d) => ({
        tareas: d.tareas.map((t) =>
          t.id === enProgreso.id ? { ...t, estado: 'ESPERANDO_SUPERVISION' as const } : t,
        ),
      }));

      expect(
        await screen.findByRole('dialog', { name: 'No se puede finalizar' }),
      ).toHaveTextContent('Tiene 1 tarea esperando supervisión');
      expect(proyecto(ACTIVO).estado).toBe('ACTIVO');
    });
  });

  describe('reactivar', () => {
    it('pide una nota obligatoria, vuelve a «Activo» y no avisa al equipo (G2-A)', async () => {
      const user = userEvent.setup();
      const avisosAntes = datos().notificaciones;
      await mostrar(FINALIZADO);
      await user.click(boton('Reactivar proyecto'));
      const dialogo = await screen.findByRole('dialog', { name: 'Reactivar proyecto' });
      expect(within(dialogo).getByRole('button', { name: 'Reactivar' })).toBeDisabled();

      await user.type(within(dialogo).getByLabelText(/Nota/), 'Se retoma el trabajo');
      await user.click(within(dialogo).getByRole('button', { name: 'Reactivar' }));

      await waitFor(() => expect(proyecto(FINALIZADO).estado).toBe('ACTIVO'));
      expect(proyecto(FINALIZADO).fecha_fin_real).toBeNull();
      expect(datos().notificaciones).toBe(avisosAntes);
      const evento = datos().historial.filter(
        (e) => e.tipo_accion === 'PROYECTO_REACTIVADO' && e.id_proyecto === FINALIZADO,
      );
      expect(evento.at(-1)?.nota).toBe('Se retoma el trabajo');
    });

    it('con el supervisor inactivo no se puede: lo explica y lleva a reactivarlo primero', async () => {
      const user = userEvent.setup();
      useAlmacen.getState().transaccion((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === SUPERVISOR_DEL_FINALIZADO ? { ...u, estado: 'INACTIVO' as const } : u,
        ),
      }));
      const antes = datos();
      await mostrar(FINALIZADO);

      await user.click(boton('Reactivar proyecto'));

      const dialogo = await screen.findByRole('dialog', { name: 'No se puede reactivar' });
      expect(dialogo).toHaveTextContent(
        'El supervisor del proyecto está inactivo: reactívalo antes de reactivar el proyecto.',
      );
      expect(datos()).toBe(antes);
      await user.click(within(dialogo).getByRole('link', { name: 'Ir al supervisor' }));
      expect(screen.getByTestId('ubicacion')).toHaveTextContent(
        `/administrador/supervisores/${SUPERVISOR_DEL_FINALIZADO}`,
      );
    });

    it('cancelar no escribe nada', async () => {
      const user = userEvent.setup();
      const antes = datos();
      await mostrar(FINALIZADO);
      await user.click(boton('Reactivar proyecto'));
      const dialogo = await screen.findByRole('dialog', { name: 'Reactivar proyecto' });

      await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(datos()).toBe(antes);
    });
  });

  describe('cambiar de supervisor', () => {
    it('ofrece los demás supervisores activos, no el actual, y no deja confirmar sin elegir', async () => {
      const user = userEvent.setup();
      await mostrar(ACTIVO);

      await user.click(boton('Cambiar supervisor'));
      const dialogo = await screen.findByRole('dialog', { name: 'Cambiar supervisor' });

      const opciones = within(within(dialogo).getByLabelText('Nuevo supervisor') as HTMLElement)
        .getAllByRole('option')
        .map((o) => (o as HTMLOptionElement).value);
      expect(opciones).toContain(OTRO_SUPERVISOR);
      expect(opciones).not.toContain(SUPERVISOR);
      expect(within(dialogo).getByRole('button', { name: 'Cambiar supervisor' })).toBeDisabled();
    });

    it('cambia el supervisor, las tareas esperando siguen al proyecto y se avisa a quien entra y a quien sale', async () => {
      const user = userEvent.setup();
      const esperando = tareasDe(ACTIVO).filter((t) => t.estado === 'ESPERANDO_SUPERVISION');
      await mostrar(ACTIVO);
      await user.click(boton('Cambiar supervisor'));
      const dialogo = await screen.findByRole('dialog', { name: 'Cambiar supervisor' });

      await user.selectOptions(within(dialogo).getByLabelText('Nuevo supervisor'), OTRO_SUPERVISOR);
      await user.click(within(dialogo).getByRole('button', { name: 'Cambiar supervisor' }));

      await waitFor(() => expect(proyecto(ACTIVO).id_supervisor).toBe(OTRO_SUPERVISOR));
      for (const t of esperando) expect(datos().tareas.find((x) => x.id === t.id)).toEqual(t);
      expect(
        datos().historial.some(
          (e) => e.tipo_accion === 'PROYECTO_SUPERVISOR_CAMBIADO' && e.id_proyecto === ACTIVO,
        ),
      ).toBe(true);
      expect(
        datos().notificaciones.some(
          (n) => n.id_destinatario === OTRO_SUPERVISOR && n.tipo === 'ASIGNADO_A_PROYECTO',
        ),
      ).toBe(true);
      expect(
        datos().notificaciones.some(
          (n) => n.id_destinatario === SUPERVISOR && n.tipo === 'QUITADO_DE_PROYECTO',
        ),
      ).toBe(true);
      const datosDelProyecto = await screen.findByRole('region', { name: 'Datos del proyecto' });
      expect(datosDelProyecto).toHaveTextContent(
        datos().usuarios.find((u) => u.id === OTRO_SUPERVISOR)!.nombre,
      );
    });

    it('si el supervisor elegido se desactiva con el diálogo abierto, el servicio lo rechaza sin escribir', async () => {
      const user = userEvent.setup();
      await mostrar(ACTIVO);
      await user.click(boton('Cambiar supervisor'));
      const dialogo = await screen.findByRole('dialog', { name: 'Cambiar supervisor' });
      await user.selectOptions(within(dialogo).getByLabelText('Nuevo supervisor'), OTRO_SUPERVISOR);
      useAlmacen.getState().transaccion((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === OTRO_SUPERVISOR ? { ...u, estado: 'INACTIVO' as const } : u,
        ),
      }));
      const antes = proyecto(ACTIVO);

      await user.click(within(dialogo).getByRole('button', { name: 'Cambiar supervisor' }));

      expect(await within(dialogo).findByRole('alert')).toBeInTheDocument();
      expect(proyecto(ACTIVO)).toBe(antes);
    });

    it('cancelar no escribe nada', async () => {
      const user = userEvent.setup();
      const antes = datos();
      await mostrar(ACTIVO);
      await user.click(boton('Cambiar supervisor'));
      const dialogo = await screen.findByRole('dialog', { name: 'Cambiar supervisor' });

      await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(datos()).toBe(antes);
    });
  });
});

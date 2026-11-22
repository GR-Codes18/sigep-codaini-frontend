import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno } from '@/services';
import { normalizarCodigoDeProyecto } from './codigo';
import { PaginaProyectos } from './PaginaProyectos';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const OTRO_SUPERVISOR = 'usr-sup-02';

const entorno = crearEntorno({ demoraMs: 0 });
const datos = () => useAlmacen.getState().datos;
const proyectos = () => datos().proyectos;

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

async function mostrar() {
  render(
    <MemoryRouter initialEntries={['/administrador/proyectos']}>
      <Routes>
        <Route path="/administrador/proyectos" element={<PaginaProyectos entorno={entorno} />} />
        <Route path="/administrador/proyectos/:id" element={<p>Detalle abierto</p>} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando proyectos' })).toBeNull(),
  );
}

async function abrir(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Nuevo proyecto' }));
  return await screen.findByRole('dialog', { name: 'Nuevo proyecto' });
}

const NUEVO = {
  nombre: 'Aplicación de reservas',
  codigo: 'APR1',
  descripcion: 'Reservas de salas para el equipo.',
  inicio: '2026-12-01',
  fin: '2027-03-31',
  repositorio: 'https://github.com/codaini/reservas-app',
  rama: 'main',
};

function llenar(dialogo: HTMLElement, v: Partial<typeof NUEVO & { supervisor: string }> = {}) {
  const valores = { ...NUEVO, supervisor: OTRO_SUPERVISOR, ...v };
  const poner = (etiqueta: string, valor: string) =>
    fireEvent.change(within(dialogo).getByLabelText(etiqueta), { target: { value: valor } });
  poner('Nombre', valores.nombre);
  poner('Código', valores.codigo);
  poner('Descripción', valores.descripcion);
  poner('Fecha de inicio', valores.inicio);
  poner('Fecha de fin prevista', valores.fin);
  poner('Supervisor', valores.supervisor);
  poner('Repositorio', valores.repositorio);
  poner('Rama base', valores.rama);
}

describe('normalizarCodigoDeProyecto', () => {
  it('quita los espacios y pasa a mayúsculas', () => {
    expect(normalizarCodigoDeProyecto(' pl 2d ')).toBe('PL2D');
    expect(normalizarCodigoDeProyecto('a b\tc')).toBe('ABC');
  });
});

describe('PaginaProyectos: «Nuevo proyecto»', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('el Administrador ve el botón y el Supervisor no', async () => {
    await mostrar();
    expect(screen.getByRole('button', { name: 'Nuevo proyecto' })).toBeVisible();
    useAlmacenSesion.getState().cerrarSesion();
    document.body.innerHTML = '';

    iniciarSesion(SUPERVISOR);
    await mostrar();

    expect(screen.queryByRole('button', { name: 'Nuevo proyecto' })).not.toBeInTheDocument();
  });

  it('abre un formulario con los datos de §5.4 y la reunión opcional', async () => {
    const user = userEvent.setup();
    await mostrar();

    const dialogo = await abrir(user);

    for (const etiqueta of [
      'Nombre',
      'Código',
      'Descripción',
      'Fecha de inicio',
      'Fecha de fin prevista',
      'Supervisor',
      'Repositorio',
      'Rama base',
      'Día de la reunión',
      'Hora de la reunión',
    ]) {
      expect(within(dialogo).getByLabelText(etiqueta)).toBeVisible();
    }
    expect(within(dialogo).getByText('Reunión semanal (opcional)')).toBeVisible();
  });

  it('solo ofrece supervisores activos', async () => {
    const user = userEvent.setup();
    useAlmacen.getState().transaccion((d) => ({
      usuarios: d.usuarios.map((u) =>
        u.id === 'usr-sup-03' ? { ...u, estado: 'INACTIVO' as const } : u,
      ),
    }));
    await mostrar();
    const dialogo = await abrir(user);

    const opciones = within(within(dialogo).getByLabelText('Supervisor') as HTMLElement)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value);

    expect(opciones).toContain(OTRO_SUPERVISOR);
    expect(opciones).not.toContain('usr-sup-03');
  });

  it('crea el proyecto activo y sin equipo, con registro y aviso al supervisor, y abre su detalle', async () => {
    const user = userEvent.setup();
    const antes = proyectos().length;
    await mostrar();
    const dialogo = await abrir(user);

    llenar(dialogo);
    await user.click(within(dialogo).getByRole('button', { name: 'Crear proyecto' }));

    await waitFor(() => expect(proyectos()).toHaveLength(antes + 1));
    const nuevo = proyectos().find((p) => p.codigo === 'APR1')!;
    expect(nuevo.estado).toBe('ACTIVO');
    expect(nuevo.id_supervisor).toBe(OTRO_SUPERVISOR);
    expect(nuevo.dia_reunion).toBeNull();
    expect(nuevo.hora_reunion).toBeNull();
    expect(datos().asignaciones.some((a) => a.id_proyecto === nuevo.id)).toBe(false);
    expect(
      datos().historial.some(
        (e) => e.tipo_accion === 'PROYECTO_CREADO' && e.id_proyecto === nuevo.id,
      ),
    ).toBe(true);
    expect(
      datos().notificaciones.some(
        (n) => n.id_destinatario === OTRO_SUPERVISOR && n.tipo === 'ASIGNADO_A_PROYECTO',
      ),
    ).toBe(true);
    expect(await screen.findByText('Detalle abierto')).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion')).toHaveTextContent(
      `/administrador/proyectos/${nuevo.id}`,
    );
  });

  it('el código se envía en mayúsculas y sin espacios', async () => {
    const user = userEvent.setup();
    await mostrar();
    const dialogo = await abrir(user);

    llenar(dialogo, { codigo: ' ap r2 ' });
    await user.click(within(dialogo).getByRole('button', { name: 'Crear proyecto' }));

    await waitFor(() => expect(proyectos().some((p) => p.codigo === 'APR2')).toBe(true));
  });

  it('la reunión es opcional, y si se da se guarda con día y hora', async () => {
    const user = userEvent.setup();
    await mostrar();
    const dialogo = await abrir(user);
    llenar(dialogo);

    fireEvent.change(within(dialogo).getByLabelText('Día de la reunión'), {
      target: { value: 'MIERCOLES' },
    });
    fireEvent.change(within(dialogo).getByLabelText('Hora de la reunión'), {
      target: { value: '16:30' },
    });
    await user.click(within(dialogo).getByRole('button', { name: 'Crear proyecto' }));

    await waitFor(() => expect(proyectos().some((p) => p.codigo === 'APR1')).toBe(true));
    const nuevo = proyectos().find((p) => p.codigo === 'APR1')!;
    expect(nuevo.dia_reunion).toBe('MIERCOLES');
    expect(nuevo.hora_reunion).toBe('16:30');
  });

  it('un día sin hora lo rechaza el servicio y lo dice en el campo', async () => {
    const user = userEvent.setup();
    const antes = proyectos();
    await mostrar();
    const dialogo = await abrir(user);
    llenar(dialogo);

    fireEvent.change(within(dialogo).getByLabelText('Día de la reunión'), {
      target: { value: 'LUNES' },
    });
    await user.click(within(dialogo).getByRole('button', { name: 'Crear proyecto' }));

    expect(
      await within(dialogo).findByText('Indica también la hora de la reunión, o quita el día.'),
    ).toBeVisible();
    expect(proyectos()).toBe(antes);
  });

  it('un código repetido (también de un finalizado) lo rechaza el servicio, en el campo y sin crear nada', async () => {
    const user = userEvent.setup();
    const finalizado = proyectos().find((p) => p.estado === 'FINALIZADO')!;
    const antes = proyectos();
    await mostrar();
    const dialogo = await abrir(user);

    llenar(dialogo, { codigo: finalizado.codigo.toLowerCase() });
    await user.click(within(dialogo).getByRole('button', { name: 'Crear proyecto' }));

    const mensaje = await within(dialogo).findAllByText(/código/i, {
      selector: 'p.text-danger-text',
    });
    expect(mensaje.length).toBeGreaterThan(0);
    expect(proyectos()).toBe(antes);
    expect(screen.getByRole('dialog', { name: 'Nuevo proyecto' })).toBeInTheDocument();
  });

  it('un código con formato inválido lo rechaza el servicio en el campo', async () => {
    const user = userEvent.setup();
    const antes = proyectos();
    await mostrar();
    const dialogo = await abrir(user);

    llenar(dialogo, { codigo: 'AB' });
    await user.click(within(dialogo).getByRole('button', { name: 'Crear proyecto' }));

    expect(
      (await within(dialogo).findAllByText(/./, { selector: 'p.text-danger-text' })).length,
    ).toBeGreaterThan(0);
    expect(proyectos()).toBe(antes);
  });

  it('el repositorio y la rama base son obligatorios y se validan con los esquemas del servicio', async () => {
    const user = userEvent.setup();
    const antes = proyectos();
    await mostrar();
    const dialogo = await abrir(user);
    llenar(dialogo, { repositorio: 'https://github.com/codaini/reservas.git', rama: 'una rama' });

    await user.click(within(dialogo).getByRole('button', { name: 'Crear proyecto' }));

    expect(
      await within(dialogo).findByText(/sin «\/» final ni «\.git»\./, {
        selector: 'p.text-danger-text',
      }),
    ).toBeVisible();
    expect(within(dialogo).getByText('La rama base no puede llevar espacios.')).toBeVisible();
    expect(proyectos()).toBe(antes);

    llenar(dialogo, { repositorio: '', rama: '' });
    await user.click(within(dialogo).getByRole('button', { name: 'Crear proyecto' }));
    expect(await within(dialogo).findByText('Escribe la rama base.')).toBeVisible();
  });

  it('sin elegir supervisor lo pide, sin llamar al servicio', async () => {
    const user = userEvent.setup();
    const antes = proyectos();
    await mostrar();
    const dialogo = await abrir(user);
    llenar(dialogo, { supervisor: '' });

    await user.click(within(dialogo).getByRole('button', { name: 'Crear proyecto' }));

    expect(await within(dialogo).findByText('Elige un supervisor.')).toBeVisible();
    expect(proyectos()).toBe(antes);
  });

  it('un fin anterior al inicio lo rechaza el servicio y lo dice en el campo', async () => {
    const user = userEvent.setup();
    const antes = proyectos();
    await mostrar();
    const dialogo = await abrir(user);
    llenar(dialogo, { inicio: '2027-03-31', fin: '2026-12-01' });

    await user.click(within(dialogo).getByRole('button', { name: 'Crear proyecto' }));

    expect(
      await within(dialogo).findByText('No puede ser anterior a la fecha de inicio.'),
    ).toBeVisible();
    expect(proyectos()).toBe(antes);
  });

  it('un supervisor que se desactiva con el formulario abierto lo rechaza el servicio', async () => {
    const user = userEvent.setup();
    const antes = proyectos();
    await mostrar();
    const dialogo = await abrir(user);
    llenar(dialogo);
    useAlmacen.getState().transaccion((d) => ({
      usuarios: d.usuarios.map((u) =>
        u.id === OTRO_SUPERVISOR ? { ...u, estado: 'INACTIVO' as const } : u,
      ),
    }));

    await user.click(within(dialogo).getByRole('button', { name: 'Crear proyecto' }));

    expect(await within(dialogo).findByText('Elige a un supervisor activo.')).toBeVisible();
    expect(proyectos().length).toBe(antes.length);
  });

  it('cancelar no crea nada y al volver a abrir el formulario está vacío', async () => {
    const user = userEvent.setup();
    const antes = proyectos();
    await mostrar();
    const dialogo = await abrir(user);
    llenar(dialogo);

    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(proyectos()).toBe(antes);
    const otra = await abrir(user);
    expect(within(otra).getByLabelText('Nombre')).toHaveValue('');
  });
});

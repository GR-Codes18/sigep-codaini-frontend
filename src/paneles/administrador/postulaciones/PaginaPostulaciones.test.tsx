import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { EstadoPostulacion, Id } from '@/domain';
import { crearEntorno } from '@/services';
import { PaginaPostulaciones } from './PaginaPostulaciones';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const PRACTICANTE = 'demo-practicante';

/** Sin la demora de red simulada, para no esperar 600 ms en cada consulta. */
const entorno = crearEntorno({ demoraMs: 0 });

const datos = () => useAlmacen.getState().datos;

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

function Ubicacion() {
  return <p data-testid="ubicacion">{useLocation().pathname}</p>;
}

function mostrar() {
  render(
    <MemoryRouter initialEntries={['/administrador/postulaciones']}>
      <Routes>
        <Route
          path="/administrador/postulaciones"
          element={<PaginaPostulaciones entorno={entorno} />}
        />
        <Route path="/administrador/postulaciones/:id" element={<p>Detalle abierto</p>} />
      </Routes>
      <Ubicacion />
    </MemoryRouter>,
  );
}

/** Espera a que llegue la consulta: desaparece el estado de carga. */
async function listo() {
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando postulaciones' })).toBeNull(),
  );
}

const filasDeDatos = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
const puntajes = () =>
  within(screen.getByRole('table'))
    .queryAllByRole('progressbar')
    .map((b) => Number(b.getAttribute('aria-valuenow')));

const cuantas = (estado: EstadoPostulacion) =>
  datos().postulantes.filter((p) => p.estado === estado).length;

async function irA(user: ReturnType<typeof userEvent.setup>, pestana: RegExp) {
  await user.click(screen.getByRole('tab', { name: pestana }));
}

describe('PaginaPostulaciones', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('mientras llega la consulta muestra un estado de carga', () => {
    mostrar();

    expect(screen.getByRole('status', { name: 'Cargando postulaciones' })).toBeInTheDocument();
  });

  it('abre en «Pendientes» con los contadores de cada pestaña', async () => {
    mostrar();
    await listo();

    const pendientes = screen.getByRole('tab', { name: /Pendientes/ });
    expect(pendientes).toHaveAttribute('aria-selected', 'true');
    expect(pendientes).toHaveTextContent(String(cuantas('PENDIENTE')));
    expect(screen.getByRole('tab', { name: /Aprobadas/ })).toHaveTextContent(
      String(cuantas('APROBADA')),
    );
    expect(screen.getByRole('tab', { name: /Rechazadas/ })).toHaveTextContent(
      String(cuantas('RECHAZADA')),
    );
    expect(screen.getByRole('tab', { name: /Todas/ })).toHaveTextContent(
      String(datos().postulantes.length),
    );
    expect(filasDeDatos()).toHaveLength(cuantas('PENDIENTE'));
  });

  it('el listado va por puntaje de mayor a menor (el ranking)', async () => {
    mostrar();
    await listo();

    const lista = puntajes();
    expect(lista.length).toBeGreaterThan(1);
    expect(lista).toEqual([...lista].sort((a, b) => b - a));
  });

  it('cada pestaña muestra tantas filas como su contador', async () => {
    const user = userEvent.setup();
    mostrar();
    await listo();

    await irA(user, /Aprobadas/);
    expect(filasDeDatos()).toHaveLength(cuantas('APROBADA'));

    await irA(user, /Rechazadas/);
    expect(filasDeDatos()).toHaveLength(cuantas('RECHAZADA'));

    await irA(user, /Todas/);
    expect(filasDeDatos()).toHaveLength(datos().postulantes.length);
  });

  it('«Requieren revisión» son las pendientes con la marca de revisión manual', async () => {
    const user = userEvent.setup();
    mostrar();
    await listo();
    const esperadas = datos().postulantes.filter(
      (p) =>
        p.estado === 'PENDIENTE' &&
        datos().evaluaciones.some((e) => e.id_postulante === p.id && e.requiere_revision_manual),
    );

    await irA(user, /Requieren revisión/);

    expect(esperadas.length).toBeGreaterThan(0);
    expect(filasDeDatos()).toHaveLength(esperadas.length);
    for (const fila of filasDeDatos()) {
      expect(within(fila).getByText('Requiere revisión manual')).toBeInTheDocument();
    }
  });

  it('cada fila trae el puntaje con su barra, el estado y el enlace al detalle', async () => {
    mostrar();
    await listo();
    const primera = filasDeDatos()[0];

    expect(within(primera).getByRole('progressbar')).toBeInTheDocument();
    expect(within(primera).getByText('Pendiente')).toBeInTheDocument();
    expect(within(primera).getByRole('link', { name: /Ver detalle de/ })).toBeInTheDocument();
    expect(within(primera).getAllByRole('cell')).toHaveLength(8);
  });

  it('busca por nombre sin distinguir mayúsculas ni tildes', async () => {
    const user = userEvent.setup();
    mostrar();
    await listo();
    await irA(user, /Todas/);

    await user.type(screen.getByRole('searchbox'), 'OSCAR benavides');

    const filas = filasDeDatos();
    expect(filas).toHaveLength(1);
    expect(filas[0]).toHaveTextContent('Óscar Benavides Salas');
  });

  it('filtra por área y la especialidad solo ofrece las de esa área', async () => {
    const user = userEvent.setup();
    mostrar();
    await listo();
    await irA(user, /Todas/);
    const area = datos().areas_tecnicas[0];

    await user.selectOptions(screen.getByLabelText('Área técnica'), area.id);

    for (const fila of filasDeDatos()) expect(fila).toHaveTextContent(area.nombre);
    const opciones = within(screen.getByLabelText('Especialidad'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    for (const e of datos().especialidades) {
      const hayPostulantes = datos().postulantes.some((p) => p.id_especialidad === e.id);
      if (e.id_area_tecnica === area.id && hayPostulantes) expect(opciones).toContain(e.nombre);
      if (e.id_area_tecnica !== area.id) expect(opciones).not.toContain(e.nombre);
    }
  });

  it('al cambiar de área se reinicia la especialidad elegida', async () => {
    const user = userEvent.setup();
    mostrar();
    await listo();
    await irA(user, /Todas/);
    const [primera, segunda] = datos().areas_tecnicas;
    await user.selectOptions(screen.getByLabelText('Área técnica'), primera.id);
    const opcion = within(screen.getByLabelText('Especialidad')).getAllByRole('option')[1];
    await user.selectOptions(
      screen.getByLabelText('Especialidad'),
      (opcion as HTMLOptionElement).value,
    );

    await user.selectOptions(screen.getByLabelText('Área técnica'), segunda.id);

    expect(screen.getByLabelText('Especialidad')).toHaveValue('');
  });

  it('filtra por un rango de fechas: lejano no trae nada y al quitarlo vuelven todas', async () => {
    const user = userEvent.setup();
    mostrar();
    await listo();
    await irA(user, /Todas/);
    const total = filasDeDatos().length;

    await user.type(screen.getByLabelText('Desde'), '2099-01-01');

    expect(screen.getByText('Ninguna postulación coincide con los filtros')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Desde'));
    expect(filasDeDatos()).toHaveLength(total);
  });

  it('puede ordenarse por fecha, de la más reciente a la más antigua', async () => {
    const user = userEvent.setup();
    mostrar();
    await listo();
    await irA(user, /Todas/);

    await user.selectOptions(screen.getByLabelText('Ordenar por'), 'FECHA');

    const masReciente = [...datos().postulantes].sort((a, b) =>
      b.fecha_postulacion.localeCompare(a.fecha_postulacion),
    )[0];
    expect(filasDeDatos()[0]).toHaveTextContent(masReciente.nombre);
  });

  it('sin coincidencias dice que ninguna cumple los filtros y ayuda a salir', async () => {
    const user = userEvent.setup();
    mostrar();
    await listo();

    await user.type(screen.getByRole('searchbox'), 'zzzzzz');

    expect(screen.getByText('Ninguna postulación coincide con los filtros')).toBeInTheDocument();
    expect(screen.getByText('Prueba con otra búsqueda o quita algún filtro.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('una pestaña vacía sin filtros dice qué falta', async () => {
    useAlmacen.getState().transaccion((d) => ({
      postulantes: d.postulantes.filter((p) => p.estado !== 'RECHAZADA'),
    }));
    const user = userEvent.setup();
    mostrar();
    await listo();

    await irA(user, /Rechazadas/);

    expect(screen.getByText('Aún no hay postulaciones rechazadas')).toBeInTheDocument();
  });

  it('sin ninguna postulación dice que llegan del formulario del sitio web', async () => {
    useAlmacen
      .getState()
      .transaccion(() => ({ postulantes: [], evaluaciones: [], detalles_evaluacion: [] }));
    mostrar();
    await listo();

    expect(screen.getByText('Aún no hay postulaciones')).toBeInTheDocument();
    expect(
      screen.getByText('Llegan desde el formulario del sitio web de CODAINI.'),
    ).toBeInTheDocument();
  });

  it('un clic en la fila abre el detalle de esa postulación', async () => {
    const user = userEvent.setup();
    mostrar();
    await listo();
    const fila = filasDeDatos()[0];
    const enlace = within(fila).getByRole('link', { name: /Ver detalle de/ });
    const id = enlace.getAttribute('href')!.split('/').pop()!;

    await user.click(within(fila).getAllByRole('cell')[0]);

    expect(await screen.findByText('Detalle abierto')).toBeInTheDocument();
    expect(screen.getByTestId('ubicacion')).toHaveTextContent(`/administrador/postulaciones/${id}`);
  });

  it('el enlace «Ver detalle» también abre el detalle', async () => {
    const user = userEvent.setup();
    mostrar();
    await listo();

    await user.click(within(filasDeDatos()[0]).getByRole('link', { name: /Ver detalle de/ }));

    expect(await screen.findByText('Detalle abierto')).toBeInTheDocument();
  });

  it('no tiene botones de decisión en el listado: se decide solo desde el detalle', async () => {
    mostrar();
    await listo();

    expect(
      screen.queryByRole('button', { name: /aprobar|rechazar|reconsiderar/i }),
    ).not.toBeInTheDocument();
  });

  it.each([SUPERVISOR, PRACTICANTE])(
    'quien no es Administrador (%s) recibe el error del servicio y ninguna tabla',
    async (idUsuario) => {
      useAlmacenSesion.getState().cerrarSesion();
      iniciarSesion(idUsuario);
      mostrar();

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    },
  );

  it('sin sesión no muestra nada', () => {
    useAlmacenSesion.getState().cerrarSesion();

    const { container } = render(
      <MemoryRouter>
        <PaginaPostulaciones entorno={entorno} />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

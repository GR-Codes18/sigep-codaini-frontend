import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno } from '@/services';
import {
  AVISO_USO_DEL_CV,
  NOTA_PUNTAJE_ES_AYUDA,
  PaginaDetallePostulacion,
} from './PaginaDetallePostulacion';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const APROBADA = 'pos-17'; // de ahí nació usr-pra-17 (Kevin Huertas Lara)
const PENDIENTE = 'pos-25';

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

async function mostrar(idPostulante: Id) {
  render(
    <MemoryRouter initialEntries={[`/administrador/postulaciones/${idPostulante}`]}>
      <Routes>
        <Route
          path="/administrador/postulaciones/:idPostulante"
          element={<PaginaDetallePostulacion entorno={entorno} />}
        />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando la postulación' })).toBeNull(),
  );
}

describe('PaginaDetallePostulacion', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion(ADMIN);
  });

  it('mientras llega la consulta muestra un estado de carga', () => {
    render(
      <MemoryRouter initialEntries={[`/administrador/postulaciones/${PENDIENTE}`]}>
        <Routes>
          <Route
            path="/administrador/postulaciones/:idPostulante"
            element={<PaginaDetallePostulacion entorno={entorno} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('status', { name: 'Cargando la postulación' })).toBeInTheDocument();
  });

  it('muestra los datos del postulante y su estado', async () => {
    const p = datos().postulantes.find((x) => x.id === PENDIENTE)!;

    await mostrar(PENDIENTE);

    expect(screen.getByRole('heading', { level: 1, name: p.nombre })).toBeInTheDocument();
    const datosPostulante = screen.getByRole('region', { name: 'Datos del postulante' });
    expect(within(datosPostulante).getByText(p.correo)).toBeInTheDocument();
    expect(within(datosPostulante).getByText(p.celular)).toBeInTheDocument();
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0);
  });

  it('la evaluación trae el puntaje final, la justificación, la nota fija y los dos bloques', async () => {
    const evaluacion = datos().evaluaciones.find((e) => e.id_postulante === PENDIENTE)!;

    await mostrar(PENDIENTE);

    const bloque = screen.getByRole('region', { name: 'Evaluación de la IA' });
    expect(within(bloque).getByText('Puntaje final')).toBeInTheDocument();
    expect(within(bloque).getByText(evaluacion.justificacion)).toBeInTheDocument();
    expect(within(bloque).getByText(NOTA_PUNTAJE_ES_AYUDA)).toBeInTheDocument();
    expect(within(bloque).getByRole('region', { name: 'Criterios del área' })).toBeInTheDocument();
    expect(
      within(bloque).getByRole('region', { name: 'Criterios de la especialidad' }),
    ).toBeInTheDocument();
  });

  it('el desglose es el guardado: criterio por criterio, con su peso', async () => {
    const evaluacion = datos().evaluaciones.find((e) => e.id_postulante === PENDIENTE)!;
    const detalles = datos().detalles_evaluacion.filter((d) => d.id_evaluacion === evaluacion.id);

    await mostrar(PENDIENTE);

    for (const d of detalles) {
      expect(screen.getAllByText(d.nombre_criterio).length).toBeGreaterThan(0);
    }
    const area = screen.getByRole('region', { name: 'Criterios del área' });
    expect(within(area).getAllByRole('row')).toHaveLength(
      detalles.filter((d) => d.bloque === 'AREA').length + 1,
    );
  });

  it('una postulación con la marca de revisión manual la muestra', async () => {
    const conMarca = datos().evaluaciones.find(
      (e) =>
        e.requiere_revision_manual &&
        datos().postulantes.some((p) => p.id === e.id_postulante && p.estado === 'PENDIENTE'),
    )!;

    await mostrar(conMarca.id_postulante);

    expect(screen.getByText('Requiere revisión manual')).toBeInTheDocument();
  });

  it('una postulación sin la marca no la muestra', async () => {
    const sinMarca = datos().evaluaciones.find((e) => !e.requiere_revision_manual)!;

    await mostrar(sinMarca.id_postulante);

    expect(screen.queryByText('Requiere revisión manual')).not.toBeInTheDocument();
  });

  it('el CV muestra su nombre, dice que el prototipo no lo incluye y no se puede descargar', async () => {
    const p = datos().postulantes.find((x) => x.id === PENDIENTE)!;

    await mostrar(PENDIENTE);

    const cv = screen.getByRole('region', { name: 'Currículum' });
    expect(within(cv).getByText(p.cv.nombre)).toBeInTheDocument();
    expect(within(cv).getByText(/El prototipo no incluye el documento/)).toBeInTheDocument();
    expect(within(cv).getByRole('button', { name: 'Descargar' })).toBeDisabled();
    expect(within(cv).queryByRole('link')).not.toBeInTheDocument();
  });

  it('avisa del uso del CV', async () => {
    await mostrar(PENDIENTE);

    expect(AVISO_USO_DEL_CV).toBe(
      'El CV se usa únicamente para evaluar esta postulación y no para otros fines.',
    );
    expect(screen.getByText(AVISO_USO_DEL_CV)).toBeInTheDocument();
  });

  it('el historial trae los eventos de la postulación, con su autor', async () => {
    await mostrar(PENDIENTE);

    const historial = screen.getByRole('region', { name: 'Historial de la postulación' });
    expect(within(historial).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(within(historial).getAllByText(/Sistema/).length).toBeGreaterThan(0);
  });

  it('una aprobada dice qué cuenta de practicante nació de ella', async () => {
    await mostrar(APROBADA);

    expect(screen.getByRole('heading', { level: 1 }).parentElement).toHaveTextContent('Aprobada');
    expect(screen.getByText(/Se creó la cuenta de practicante de/)).toHaveTextContent(
      'Kevin Huertas Lara',
    );
  });

  it('una pendiente no dice nada de un practicante', async () => {
    await mostrar(PENDIENTE);

    expect(screen.queryByText(/Se creó la cuenta de practicante/)).not.toBeInTheDocument();
  });

  it('sin evaluación lo dice, sin inventar un puntaje', async () => {
    useAlmacen.getState().transaccion((d) => ({
      evaluaciones: d.evaluaciones.filter((e) => e.id_postulante !== PENDIENTE),
    }));

    await mostrar(PENDIENTE);

    expect(screen.getByText('Esta postulación todavía no tiene evaluación.')).toBeInTheDocument();
    expect(screen.queryByText('Puntaje final')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Criterios del área' })).not.toBeInTheDocument();
  });

  it('un cambio posterior en los criterios no cambia el desglose con el que se evaluó', async () => {
    const antes = datos().detalles_evaluacion.find(
      (d) =>
        d.id_evaluacion === datos().evaluaciones.find((e) => e.id_postulante === PENDIENTE)!.id,
    )!;
    useAlmacen.getState().transaccion((d) => ({
      criterios: d.criterios.map((c) => ({ ...c, nombre: 'Criterio renombrado', peso: 1 })),
    }));

    await mostrar(PENDIENTE);

    expect(screen.getAllByText(antes.nombre_criterio).length).toBeGreaterThan(0);
    expect(screen.queryByText('Criterio renombrado')).not.toBeInTheDocument();
  });

  it('una postulación que no existe muestra el error y un camino de vuelta', async () => {
    await mostrar('no-existe');

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a postulaciones' })).toHaveAttribute(
      'href',
      '/administrador/postulaciones',
    );
  });

  it('siempre hay un camino de vuelta al listado', async () => {
    await mostrar(PENDIENTE);

    expect(screen.getByRole('link', { name: 'Volver a postulaciones' })).toHaveAttribute(
      'href',
      '/administrador/postulaciones',
    );
  });

  it('quien no es Administrador recibe el error del servicio y ningún dato del postulante', async () => {
    useAlmacenSesion.getState().cerrarSesion();
    iniciarSesion(SUPERVISOR);
    const p = datos().postulantes.find((x) => x.id === PENDIENTE)!;

    await mostrar(PENDIENTE);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(p.correo)).not.toBeInTheDocument();
    expect(screen.queryByText(p.celular)).not.toBeInTheDocument();
  });

  it('sin sesión no muestra nada', () => {
    useAlmacenSesion.getState().cerrarSesion();

    const { container } = render(
      <MemoryRouter>
        <PaginaDetallePostulacion entorno={entorno} />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

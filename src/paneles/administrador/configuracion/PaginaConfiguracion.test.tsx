import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import {
  crearEntorno,
  listarHistorial,
  obtenerConfiguracion,
  type ParametroVista,
} from '@/services';
import { PaginaConfiguracion } from './PaginaConfiguracion';

const ADMIN = 'demo-admin';
const entorno = crearEntorno({ demoraMs: 0 });

function iniciarSesion() {
  const u = useAlmacen.getState().datos.usuarios.find((x) => x.id === ADMIN)!;
  useAlmacenSesion.getState().abrirSesion({
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
    rol: u.rol,
    debe_cambiar_contrasena: u.debe_cambiar_contrasena,
  });
}

async function mostrar() {
  render(
    <MemoryRouter initialEntries={['/administrador/configuracion']}>
      <Routes>
        <Route
          path="/administrador/configuracion"
          element={<PaginaConfiguracion entorno={entorno} />}
        />
        <Route path="/administrador/dashboard" element={<p>Inicio del Administrador</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando la configuración' })).toBeNull(),
  );
}

async function parametro(clave: string): Promise<ParametroVista> {
  const r = await obtenerConfiguracion({ idActor: ADMIN }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor.secciones.flatMap((s) => s.parametros).find((p) => p.clave === clave)!;
}

const casilla = (clave: string, campo = 'valor') =>
  document.getElementById(`${clave}-${campo}`) as HTMLInputElement;

async function escribir(clave: string, texto: string, campo = 'valor') {
  const usuario = userEvent.setup();
  const input = casilla(clave, campo);
  await usuario.clear(input);
  if (texto !== '') await usuario.type(input, texto);
}

const seccion = (nombre: string) => screen.getByRole('form', { name: nombre });

describe('Configuración', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion();
  });

  it('muestra las secciones de §5.8 con el valor actual y el predeterminado de cada parámetro', async () => {
    await mostrar();

    expect(screen.getByRole('heading', { name: 'Configuración' })).toBeInTheDocument();
    for (const nombre of ['Evaluación de postulaciones', 'Prácticas', 'Seguimiento']) {
      expect(seccion(nombre)).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { name: 'Integraciones' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Datos de demostración' })).toBeInTheDocument();

    expect(casilla('EVALUACION_BANDA_AMBIGUA', 'minimo')).toHaveValue('50');
    expect(casilla('EVALUACION_BANDA_AMBIGUA', 'maximo')).toHaveValue('69');
    expect(casilla('EVALUACION_PROPORCION', 'area')).toHaveValue('40');
    expect(casilla('EVALUACION_PROPORCION', 'especialidad')).toHaveValue('60');
    expect(casilla('PRACTICA_DURACION_MESES')).toHaveValue('4');
    expect(casilla('PRACTICA_AVISO_FIN_DIAS')).toHaveValue('14');
    expect(screen.getByText('Predeterminado: 50 a 69')).toBeInTheDocument();
    expect(screen.getByText('Predeterminado: 40 % / 60 %')).toBeInTheDocument();
    expect(screen.getByText('Predeterminado: 4 meses')).toBeInTheDocument();
    // Los diez umbrales de Seguimiento.
    expect(within(seccion('Seguimiento')).getAllByRole('textbox')).toHaveLength(10);
  });

  it('guarda un cambio válido, lo deja en el Historial con el valor anterior y el nuevo, y habilita «Restaurar»', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    const practicas = seccion('Prácticas');
    expect(
      within(practicas).getByRole('button', { name: 'Restaurar valores originales' }),
    ).toBeDisabled();

    await escribir('PRACTICA_DURACION_MESES', '6');
    await usuario.click(within(practicas).getByRole('button', { name: 'Guardar' }));

    await waitFor(async () =>
      expect((await parametro('PRACTICA_DURACION_MESES')).valor).toEqual({
        tipo: 'numero',
        valor: 6,
      }),
    );
    await waitFor(() =>
      expect(
        within(seccion('Prácticas')).getByRole('button', { name: 'Restaurar valores originales' }),
      ).toBeEnabled(),
    );
    const h = await listarHistorial(
      { idActor: ADMIN, filtros: { categoria: 'EVALUACION' } },
      entorno,
    );
    if (!h.ok) throw new Error(h.mensaje);
    const evento = h.valor.eventos.find(
      (e) =>
        e.evento.tipo_accion === 'PARAMETRO_CONFIGURACION_CAMBIADO' &&
        e.evento.elemento.id === 'PRACTICA_DURACION_MESES',
    )!;
    expect(evento.evento.cambios).toEqual([
      { campo: 'valor', valor_anterior: '4', valor_nuevo: '6' },
    ]);
  });

  it('un valor fuera de rango lo rechaza el servicio y su mensaje sale junto al campo, sin guardar nada', async () => {
    const usuario = userEvent.setup();
    await mostrar();

    await escribir('PRACTICA_DURACION_MESES', '30');
    await usuario.click(within(seccion('Prácticas')).getByRole('button', { name: 'Guardar' }));

    const mensaje = await screen.findByText(/entre 1 y 24/);
    expect(mensaje).toHaveAttribute('role', 'alert');
    expect(casilla('PRACTICA_DURACION_MESES')).toHaveAttribute('aria-invalid', 'true');
    expect((await parametro('PRACTICA_DURACION_MESES')).valor).toEqual({
      tipo: 'numero',
      valor: 4,
    });
  });

  it('un decimal y una casilla vacía también los decide el servicio', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    const guardar = () => within(seccion('Prácticas')).getByRole('button', { name: 'Guardar' });

    await escribir('PRACTICA_AVISO_FIN_DIAS', '10.5');
    await usuario.click(guardar());
    expect(await screen.findByText(/número entero/)).toBeInTheDocument();

    await escribir('PRACTICA_AVISO_FIN_DIAS', '');
    await usuario.click(guardar());
    expect(await screen.findByText('Escribe un número.')).toBeInTheDocument();
  });

  it('la banda con el mínimo no menor que el máximo muestra el error junto al mínimo', async () => {
    const usuario = userEvent.setup();
    await mostrar();

    await escribir('EVALUACION_BANDA_AMBIGUA', '80', 'minimo');
    await usuario.click(
      within(seccion('Evaluación de postulaciones')).getByRole('button', { name: 'Guardar' }),
    );

    expect(await screen.findByText(/debe ser menor que el máximo/)).toBeInTheDocument();
    expect(casilla('EVALUACION_BANDA_AMBIGUA', 'minimo')).toHaveAttribute('aria-invalid', 'true');
  });

  it('una proporción que no suma 100 muestra el error del parámetro', async () => {
    const usuario = userEvent.setup();
    await mostrar();

    await escribir('EVALUACION_PROPORCION', '50', 'area');
    await usuario.click(
      within(seccion('Evaluación de postulaciones')).getByRole('button', { name: 'Guardar' }),
    );

    expect(await screen.findByText(/deben sumar 100/)).toBeInTheDocument();
  });

  it('una relación entre umbrales de Seguimiento (crítico mayor que atención) la valida el servicio', async () => {
    const usuario = userEvent.setup();
    await mostrar();

    await escribir('INSIGHT_INACTIVO_CRITICO_DIAS', '3');
    await usuario.click(within(seccion('Seguimiento')).getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText(/deben ser más que los de «atención»/)).toBeInTheDocument();
  });

  it('«Restaurar valores originales» pide confirmación y devuelve la sección a sus predeterminados', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    await escribir('PRACTICA_DURACION_MESES', '6');
    await usuario.click(within(seccion('Prácticas')).getByRole('button', { name: 'Guardar' }));
    const restaurar = () =>
      within(seccion('Prácticas')).getByRole('button', { name: 'Restaurar valores originales' });
    await waitFor(() => expect(restaurar()).toBeEnabled());

    await usuario.click(restaurar());
    const dialogo = await screen.findByRole('dialog');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Restaurar' }));

    await waitFor(async () =>
      expect((await parametro('PRACTICA_DURACION_MESES')).es_predeterminado).toBe(true),
    );
    await waitFor(() => expect(casilla('PRACTICA_DURACION_MESES')).toHaveValue('4'));
  });

  it('la tarjeta de GitHub es de ejemplo, con sus dos botones y sin mostrar ninguna clave', async () => {
    await mostrar();

    const tarjeta = screen.getByRole('region', { name: 'Integraciones' });
    expect(within(tarjeta).getByText('Conectado')).toBeInTheDocument();
    expect(within(tarjeta).getByText('Organización o cuenta conectada')).toBeInTheDocument();
    expect(within(tarjeta).getByText('Última verificación')).toBeInTheDocument();
    expect(within(tarjeta).getByRole('button', { name: 'Probar conexión' })).toBeInTheDocument();
    expect(within(tarjeta).getByRole('button', { name: 'Reconectar' })).toBeInTheDocument();
    expect(within(tarjeta).getByText('Solo prototipo')).toBeInTheDocument();
    expect(within(tarjeta).queryByText(/token|clave|secret/i)).toBeNull();
  });

  it('la última verificación de la tarjeta es relativa a hoy, no una fecha fija', async () => {
    const ahora = new Date('2026-11-17T17:00:00.000Z');
    render(
      <MemoryRouter initialEntries={['/administrador/configuracion']}>
        <Routes>
          <Route
            path="/administrador/configuracion"
            element={
              <PaginaConfiguracion entorno={crearEntorno({ demoraMs: 0, ahora: () => ahora })} />
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    const tarjeta = await screen.findByRole('region', { name: 'Integraciones' });
    // 12:00 en Perú menos dos horas.
    expect(within(tarjeta).getByText(/^17 nov 2026,? 10:00$/)).toBeInTheDocument();
  });

  it('«Restablecer datos» está marcado «solo prototipo», pide confirmación y cancelar no cambia nada', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    const bloque = screen.getByRole('region', { name: 'Datos de demostración' });
    expect(within(bloque).getByText('Solo prototipo')).toBeInTheDocument();
    await escribir('PRACTICA_DURACION_MESES', '6');
    await usuario.click(within(seccion('Prácticas')).getByRole('button', { name: 'Guardar' }));
    await waitFor(async () =>
      expect((await parametro('PRACTICA_DURACION_MESES')).valor).toEqual({
        tipo: 'numero',
        valor: 6,
      }),
    );

    await usuario.click(within(bloque).getByRole('button', { name: 'Restablecer datos' }));
    const dialogo = await screen.findByRole('dialog');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    expect((await parametro('PRACTICA_DURACION_MESES')).valor).toEqual({
      tipo: 'numero',
      valor: 6,
    });
  });

  it('confirmar «Restablecer datos» devuelve los datos de ejemplo, mantiene la sesión y vuelve al inicio', async () => {
    const usuario = userEvent.setup();
    await mostrar();
    await escribir('PRACTICA_DURACION_MESES', '6');
    await usuario.click(within(seccion('Prácticas')).getByRole('button', { name: 'Guardar' }));
    await waitFor(async () =>
      expect((await parametro('PRACTICA_DURACION_MESES')).valor).toEqual({
        tipo: 'numero',
        valor: 6,
      }),
    );

    const bloque = screen.getByRole('region', { name: 'Datos de demostración' });
    await usuario.click(within(bloque).getByRole('button', { name: 'Restablecer datos' }));
    const dialogo = await screen.findByRole('dialog');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Restablecer datos' }));

    expect(await screen.findByText('Inicio del Administrador')).toBeInTheDocument();
    expect((await parametro('PRACTICA_DURACION_MESES')).valor).toEqual({
      tipo: 'numero',
      valor: 4,
    });
    expect(useAlmacenSesion.getState().usuario?.id).toBe(ADMIN);
  });
});

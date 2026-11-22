import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { pestanaDeLaDireccion } from '@/app/usePestanaInicial';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import { crearEntorno } from '@/services';
import { PaginaPostulaciones } from './postulaciones/PaginaPostulaciones';
import { PaginaPracticantes } from './practicantes/PaginaPracticantes';
import { PaginaProyectos } from './proyectos/PaginaProyectos';
import { PaginaTareas } from './tareas/PaginaTareas';

const entorno = crearEntorno({ demoraMs: 0 });

function iniciarSesion() {
  const u = useAlmacen.getState().datos.usuarios.find((x) => x.id === 'demo-admin')!;
  useAlmacenSesion.getState().abrirSesion({
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
    rol: u.rol,
    debe_cambiar_contrasena: u.debe_cambiar_contrasena,
  });
}

function mostrar(ruta: string, pagina: ReactElement) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path={ruta.split('?')[0]} element={pagina} />
      </Routes>
    </MemoryRouter>,
  );
}

const pestanaActiva = () =>
  screen
    .getAllByRole('tab')
    .filter((t) => t.getAttribute('data-state') === 'active')
    .map((t) => t.textContent ?? '');

/**
 * Los listados de los módulos 5.1 a 5.5 abren en la pestaña que pide `?pestana=` (así los enlaces del Dashboard,
 * §5.9, llegan con su filtro ya aplicado); un valor desconocido abre la pestaña de siempre.
 */
const CASOS = [
  {
    modulo: 'Postulaciones',
    ruta: '/administrador/postulaciones',
    pagina: () => <PaginaPostulaciones entorno={entorno} />,
    pedida: ['REQUIEREN_REVISION', /^Requieren revisión/],
    porDefecto: /^Pendientes/,
  },
  {
    modulo: 'Practicantes',
    ruta: '/administrador/practicantes',
    pagina: () => <PaginaPracticantes entorno={entorno} />,
    pedida: ['SIN_PROYECTO', /^Sin proyecto/],
    porDefecto: /^Activos/,
  },
  {
    modulo: 'Proyectos',
    ruta: '/administrador/proyectos',
    pagina: () => <PaginaProyectos entorno={entorno} />,
    pedida: ['EN_PAUSA', /^En pausa/],
    porDefecto: /^Activos/,
  },
  {
    modulo: 'Tareas',
    ruta: '/administrador/tareas',
    pagina: () => <PaginaTareas entorno={entorno} />,
    pedida: ['ESPERANDO_SUPERVISION', /^Esperando supervisión/],
    porDefecto: /^Todas/,
  },
] as const;

describe('?pestana= en los listados de 5.1 a 5.5', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion();
  });

  for (const caso of CASOS) {
    it(`${caso.modulo}: abre en la pestaña pedida`, async () => {
      mostrar(`${caso.ruta}?pestana=${caso.pedida[0]}`, caso.pagina());

      await screen.findAllByRole('tab');
      expect(pestanaActiva()).toHaveLength(1);
      expect(pestanaActiva()[0]).toMatch(caso.pedida[1]);
    });

    it(`${caso.modulo}: un valor desconocido o ausente abre la pestaña de siempre`, async () => {
      mostrar(`${caso.ruta}?pestana=no-existe`, caso.pagina());
      await screen.findAllByRole('tab');
      expect(pestanaActiva()[0]).toMatch(caso.porDefecto);
    });
  }
});

describe('pestanaDeLaDireccion', () => {
  const VALIDAS = ['A', 'B'] as const;

  it('devuelve la pedida si es válida y la predeterminada si falta o no lo es', () => {
    expect(pestanaDeLaDireccion('B', VALIDAS, 'A')).toBe('B');
    expect(pestanaDeLaDireccion(null, VALIDAS, 'A')).toBe('A');
    expect(pestanaDeLaDireccion('C', VALIDAS, 'A')).toBe('A');
    expect(pestanaDeLaDireccion('b', VALIDAS, 'A')).toBe('A');
  });
});

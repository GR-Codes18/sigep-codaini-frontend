import { describe, expect, it } from 'vitest';
import type { FilaInsight } from '@/app/adaptadores';
import {
  FILTROS_INICIALES,
  filtrarInsights,
  hayFiltros,
  opcionesDeProyecto,
  type FiltrosInsights,
} from './filtrosInsights';

const PL2D = { id: 'pry-pl2d', codigo: 'PL2D', nombre: 'Plataformas 2D' };
const RSV = { id: 'pry-rsv', codigo: 'RSV', nombre: 'Reservas' };

function fila(cambios: Partial<FilaInsight> & { clave: string }): FilaInsight {
  return {
    tipoRegla: 'PRACTICANTE_INACTIVO',
    severidad: 'ATENCION',
    titulo: `Insight ${cambios.clave}`,
    motivo: 'Motivo',
    elemento: { tipo: 'USUARIO', id: 'u1' },
    rutaElemento: '/administrador/practicantes/u1',
    proyectos: [PL2D],
    fechaDeteccionTexto: '10 nov 2026',
    revisado: false,
    puedeMarcarRevisado: true,
    puedeNotificar: false,
    ...cambios,
  };
}

const FILAS: FilaInsight[] = [
  fila({
    clave: 'a',
    severidad: 'CRITICO',
    tipoRegla: 'POSIBLE_ATRASO_PROYECTO',
    proyectos: [RSV],
  }),
  fila({ clave: 'b', severidad: 'ATENCION', proyectos: [PL2D, RSV] }),
  fila({ clave: 'c', severidad: 'INFORMATIVO', tipoRegla: 'FIN_PRACTICA', proyectos: [] }),
  fila({ clave: 'd', severidad: 'ATENCION', tipoRegla: 'SUPERVISION_DEMORADA', revisado: true }),
];

const con = (cambios: Partial<FiltrosInsights>): FiltrosInsights => ({
  ...FILTROS_INICIALES,
  ...cambios,
});
const clavesDe = (filas: FilaInsight[]) => filas.map((f) => f.clave);

describe('filtrarInsights', () => {
  it('abre en «Activos»: lo revisado sale de la lista activa', () => {
    expect(FILTROS_INICIALES.estado).toBe('ACTIVOS');
    expect(clavesDe(filtrarInsights(FILAS, FILTROS_INICIALES))).toEqual(['a', 'b', 'c']);
  });

  it('«Revisados» muestra solo los revisados y «Todos», todos, en el orden recibido', () => {
    expect(clavesDe(filtrarInsights(FILAS, con({ estado: 'REVISADOS' })))).toEqual(['d']);
    expect(clavesDe(filtrarInsights(FILAS, con({ estado: 'TODOS' })))).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('filtra por severidad', () => {
    expect(clavesDe(filtrarInsights(FILAS, con({ severidad: 'CRITICO' })))).toEqual(['a']);
    expect(
      clavesDe(filtrarInsights(FILAS, con({ severidad: 'ATENCION', estado: 'TODOS' }))),
    ).toEqual(['b', 'd']);
  });

  it('filtra por tipo de regla', () => {
    expect(clavesDe(filtrarInsights(FILAS, con({ tipo: 'FIN_PRACTICA' })))).toEqual(['c']);
    expect(filtrarInsights(FILAS, con({ tipo: 'POSTULACIONES_SIN_DECIDIR' }))).toEqual([]);
  });

  it('filtra por proyecto: basta con que el insight lo mencione; los que no tienen proyecto no coinciden', () => {
    expect(clavesDe(filtrarInsights(FILAS, con({ idProyecto: RSV.id })))).toEqual(['a', 'b']);
    expect(clavesDe(filtrarInsights(FILAS, con({ idProyecto: PL2D.id })))).toEqual(['b']);
  });

  it('combina los filtros y no modifica la lista recibida', () => {
    const copia = [...FILAS];
    const resultado = filtrarInsights(
      FILAS,
      con({ severidad: 'ATENCION', idProyecto: RSV.id, estado: 'TODOS' }),
    );
    expect(clavesDe(resultado)).toEqual(['b']);
    expect(FILAS).toEqual(copia);
  });
});

describe('opcionesDeProyecto', () => {
  it('salen sin repetir y por nombre, solo los que aparecen en algún insight', () => {
    expect(opcionesDeProyecto(FILAS).map((p) => p.id)).toEqual([PL2D.id, RSV.id]);
  });
});

describe('hayFiltros', () => {
  it('no cuenta el estado, solo la severidad, el tipo y el proyecto', () => {
    expect(hayFiltros(FILTROS_INICIALES)).toBe(false);
    expect(hayFiltros(con({ estado: 'TODOS' }))).toBe(false);
    expect(hayFiltros(con({ severidad: 'CRITICO' }))).toBe(true);
    expect(hayFiltros(con({ tipo: 'FIN_PRACTICA' }))).toBe(true);
    expect(hayFiltros(con({ idProyecto: 'x' }))).toBe(true);
  });
});

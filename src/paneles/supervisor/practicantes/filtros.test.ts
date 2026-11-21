import { describe, expect, it } from 'vitest';
import type { FilaPracticanteACargo } from '@/app/adaptadores';
import {
  FILTROS_INICIALES,
  filtrarACargo,
  hayFiltros,
  opcionesDeProyecto,
  type FiltrosACargo,
} from './filtros';

const PL2D = { id: 'pry-pl2d', codigo: 'PL2D', nombre: 'Plataformas 2D' };
const RSV = { id: 'pry-rsv', codigo: 'RSV', nombre: 'Reservas' };

function fila(cambios: Partial<FilaPracticanteACargo> & { id: string }): FilaPracticanteACargo {
  return {
    nombre: `Persona ${cambios.id}`,
    correo: `${cambios.id}@codaini.test`,
    especialidad: 'Frontend',
    situacion: 'ACTIVO',
    proyectos: [PL2D],
    carga: 0,
    esperandoMiRevision: 0,
    ultimaActividadTexto: 'Sin actividad',
    bajaTexto: null,
    ...cambios,
  };
}

const FILAS: FilaPracticanteACargo[] = [
  fila({ id: 'a', nombre: 'Óscar Rojas', proyectos: [PL2D, RSV] }),
  fila({ id: 'b', proyectos: [RSV] }),
  fila({ id: 'c', situacion: 'ANTERIOR', bajaTexto: '10 nov 2026' }),
];

const con = (cambios: Partial<FiltrosACargo>): FiltrosACargo => ({
  ...FILTROS_INICIALES,
  ...cambios,
});
const ids = (filas: FilaPracticanteACargo[]) => filas.map((f) => f.id);

describe('filtrarACargo', () => {
  it('abre en «Activos»: los anteriores no aparecen', () => {
    expect(FILTROS_INICIALES.pestana).toBe('ACTIVOS');
    expect(ids(filtrarACargo(FILAS, FILTROS_INICIALES))).toEqual(['a', 'b']);
  });

  it('«Anteriores» muestra solo a quienes ya salieron', () => {
    expect(ids(filtrarACargo(FILAS, con({ pestana: 'ANTERIORES' })))).toEqual(['c']);
  });

  it('filtra por proyecto: basta con que participe en él, y una persona en dos proyectos sigue siendo una fila', () => {
    expect(ids(filtrarACargo(FILAS, con({ idProyecto: PL2D.id })))).toEqual(['a']);
    expect(ids(filtrarACargo(FILAS, con({ idProyecto: RSV.id })))).toEqual(['a', 'b']);
  });

  it('busca por nombre o por correo, sin tildes ni mayúsculas', () => {
    expect(ids(filtrarACargo(FILAS, con({ busqueda: 'oscar' })))).toEqual(['a']);
    expect(ids(filtrarACargo(FILAS, con({ busqueda: 'B@CODAINI' })))).toEqual(['b']);
  });

  it('no modifica la lista recibida y combina los filtros', () => {
    const copia = [...FILAS];
    expect(ids(filtrarACargo(FILAS, con({ idProyecto: RSV.id, busqueda: 'persona' })))).toEqual([
      'b',
    ]);
    expect(FILAS).toEqual(copia);
  });
});

describe('opcionesDeProyecto', () => {
  it('salen sin repetir y por nombre, solo los que aparecen en las filas', () => {
    expect(opcionesDeProyecto(FILAS).map((p) => p.id)).toEqual([PL2D.id, RSV.id]);
  });
});

describe('hayFiltros', () => {
  it('no cuenta la pestaña, solo el proyecto y la búsqueda', () => {
    expect(hayFiltros(FILTROS_INICIALES)).toBe(false);
    expect(hayFiltros(con({ pestana: 'ANTERIORES' }))).toBe(false);
    expect(hayFiltros(con({ idProyecto: 'x' }))).toBe(true);
    expect(hayFiltros(con({ busqueda: ' x ' }))).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import type { FilaPracticante } from '@/app/adaptadores';
import {
  FILTROS_INICIALES,
  filtrarPracticantes,
  hayFiltros,
  opcionesDeArea,
  opcionesDeProyecto,
  type FiltrosPracticantes,
} from './filtros';

const SOFTWARE = { id: 'area-sw', nombre: 'Software' };
const VIDEOJUEGOS = { id: 'area-vj', nombre: 'Videojuegos' };
const PL2D = { id: 'pry-pl2d', codigo: 'PL2D', nombre: 'Plataformas 2D' };
const RSV = { id: 'pry-rsv', codigo: 'RSV', nombre: 'Reservas' };

function fila(cambios: Partial<FilaPracticante> & { id: string }): FilaPracticante {
  return {
    nombre: `Practicante ${cambios.id}`,
    correo: `${cambios.id}@correo.demo`,
    area: SOFTWARE,
    especialidad: { id: 'esp-front', nombre: 'Frontend' },
    estado: 'ACTIVO',
    sinProyecto: false,
    proyectos: [PL2D],
    carga: 0,
    ultimaActividad: null,
    ultimaActividadTexto: 'Sin actividad',
    finPrevistaTexto: '10 mar 2027',
    fin: null,
    ...cambios,
  };
}

const FILAS: FilaPracticante[] = [
  fila({ id: 'a', nombre: 'Óscar Benavides', proyectos: [PL2D, RSV] }),
  fila({ id: 'b', nombre: 'Ana Quispe', area: VIDEOJUEGOS, sinProyecto: true, proyectos: [] }),
  fila({ id: 'c', nombre: 'Carla Ruiz', estado: 'FINALIZADO', proyectos: [] }),
  fila({ id: 'd', nombre: 'Dante Paz', proyectos: [RSV] }),
];

const con = (cambios: Partial<FiltrosPracticantes>): FiltrosPracticantes => ({
  ...FILTROS_INICIALES,
  ...cambios,
});
const idsDe = (filas: FilaPracticante[]) => filas.map((f) => f.id);

describe('filtrarPracticantes', () => {
  it('abre en «Activos»: incluye a los «Sin proyecto» y deja fuera a los finalizados', () => {
    expect(FILTROS_INICIALES.pestana).toBe('ACTIVOS');
    expect(idsDe(filtrarPracticantes(FILAS, FILTROS_INICIALES))).toEqual(['a', 'b', 'd']);
  });

  it('«Sin proyecto» son los activos sin proyecto vigente', () => {
    expect(idsDe(filtrarPracticantes(FILAS, con({ pestana: 'SIN_PROYECTO' })))).toEqual(['b']);
  });

  it('un finalizado nunca está en «Sin proyecto», aunque la fila lo marque', () => {
    const filas = [fila({ id: 'x', estado: 'FINALIZADO', sinProyecto: true })];
    expect(filtrarPracticantes(filas, con({ pestana: 'SIN_PROYECTO' }))).toEqual([]);
  });

  it('«Finalizados» son los de acceso bloqueado y «Todos» incluye a todos', () => {
    expect(idsDe(filtrarPracticantes(FILAS, con({ pestana: 'FINALIZADOS' })))).toEqual(['c']);
    expect(idsDe(filtrarPracticantes(FILAS, con({ pestana: 'TODOS' })))).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('filtra por área', () => {
    expect(idsDe(filtrarPracticantes(FILAS, con({ idArea: VIDEOJUEGOS.id })))).toEqual(['b']);
  });

  it('filtra por proyecto: basta con participar en él', () => {
    expect(idsDe(filtrarPracticantes(FILAS, con({ idProyecto: RSV.id })))).toEqual(['a', 'd']);
    expect(idsDe(filtrarPracticantes(FILAS, con({ idProyecto: PL2D.id })))).toEqual(['a']);
  });

  it('busca por nombre o por correo, sin distinguir mayúsculas ni tildes', () => {
    expect(idsDe(filtrarPracticantes(FILAS, con({ busqueda: 'oscar' })))).toEqual(['a']);
    expect(idsDe(filtrarPracticantes(FILAS, con({ busqueda: 'B@CORREO' })))).toEqual(['b']);
    expect(filtrarPracticantes(FILAS, con({ busqueda: 'zzz' }))).toEqual([]);
  });

  it('una búsqueda de solo espacios no filtra', () => {
    expect(filtrarPracticantes(FILAS, con({ busqueda: '   ' }))).toHaveLength(3);
  });

  it('combina pestaña, área y búsqueda, y no modifica la lista recibida', () => {
    const copia = [...FILAS];
    const resultado = filtrarPracticantes(
      FILAS,
      con({ pestana: 'TODOS', idArea: SOFTWARE.id, busqueda: 'ruiz' }),
    );
    expect(idsDe(resultado)).toEqual(['c']);
    expect(FILAS).toEqual(copia);
  });
});

describe('opciones de los filtros', () => {
  it('las áreas salen sin repetir y por nombre', () => {
    expect(opcionesDeArea(FILAS)).toEqual([SOFTWARE, VIDEOJUEGOS]);
  });

  it('los proyectos salen sin repetir y por nombre', () => {
    expect(opcionesDeProyecto(FILAS).map((p) => p.id)).toEqual([PL2D.id, RSV.id]);
  });
});

describe('hayFiltros', () => {
  it('no cuenta la pestaña, solo el área, el proyecto y la búsqueda', () => {
    expect(hayFiltros(FILTROS_INICIALES)).toBe(false);
    expect(hayFiltros(con({ pestana: 'TODOS' }))).toBe(false);
    expect(hayFiltros(con({ idArea: 'x' }))).toBe(true);
    expect(hayFiltros(con({ idProyecto: 'x' }))).toBe(true);
    expect(hayFiltros(con({ busqueda: 'a' }))).toBe(true);
    expect(hayFiltros(con({ busqueda: '  ' }))).toBe(false);
  });
});

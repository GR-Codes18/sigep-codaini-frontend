import { describe, expect, it } from 'vitest';
import type { FilaPostulacion } from '@/app/adaptadores';
import {
  FILTROS_INICIALES,
  filtrarPostulaciones,
  hayFiltros,
  opcionesDeArea,
  opcionesDeEspecialidad,
  type FiltrosPostulaciones,
} from './filtros';

const SOFTWARE = { id: 'area-sw', nombre: 'Software' };
const VIDEOJUEGOS = { id: 'area-vj', nombre: 'Videojuegos' };
const FRONTEND = { id: 'esp-front', nombre: 'Frontend' };
const BACKEND = { id: 'esp-back', nombre: 'Backend' };
const PROGRAMACION = { id: 'esp-prog', nombre: 'Programación' };

function fila(cambios: Partial<FilaPostulacion> & { id: string }): FilaPostulacion {
  return {
    nombre: `Postulante ${cambios.id}`,
    correo: `${cambios.id}@correo.demo`,
    area: SOFTWARE,
    especialidad: FRONTEND,
    fecha: new Date('2026-11-10T15:00:00.000Z'),
    dia: '2026-11-10',
    fechaTexto: '10 nov 2026',
    estado: 'PENDIENTE',
    puntaje: 80,
    requiereRevision: false,
    ...cambios,
  };
}

// Ya vienen en el orden del ranking (mayor puntaje primero), como las entrega la consulta.
const FILAS: FilaPostulacion[] = [
  fila({
    id: 'a',
    nombre: 'Óscar Benavides',
    puntaje: 95,
    dia: '2026-11-12',
    fecha: new Date('2026-11-12T20:00:00.000Z'),
  }),
  fila({
    id: 'b',
    nombre: 'Ana Quispe',
    puntaje: 69,
    requiereRevision: true,
    especialidad: BACKEND,
    dia: '2026-11-05',
    fecha: new Date('2026-11-05T20:00:00.000Z'),
  }),
  fila({
    id: 'c',
    nombre: 'Luis Mamani',
    correo: 'luis@correo.demo',
    puntaje: 60,
    area: VIDEOJUEGOS,
    especialidad: PROGRAMACION,
    estado: 'APROBADA',
    dia: '2026-10-30',
    fecha: new Date('2026-10-30T20:00:00.000Z'),
  }),
  fila({
    id: 'd',
    nombre: 'Rosa Huanca',
    puntaje: 40,
    requiereRevision: true,
    estado: 'RECHAZADA',
    dia: '2026-11-01',
    fecha: new Date('2026-11-01T20:00:00.000Z'),
  }),
  fila({
    id: 'e',
    nombre: 'Sin Evaluar',
    puntaje: null,
    dia: '2026-11-14',
    fecha: new Date('2026-11-14T20:00:00.000Z'),
  }),
];

const ids = (filas: readonly FilaPostulacion[]) => filas.map((f) => f.id);
const con = (cambios: Partial<FiltrosPostulaciones>): FiltrosPostulaciones => ({
  ...FILTROS_INICIALES,
  pestana: 'TODAS',
  ...cambios,
});

describe('filtrarPostulaciones', () => {
  it('abre en «Pendientes» y por puntaje', () => {
    expect(FILTROS_INICIALES).toMatchObject({ pestana: 'PENDIENTES', orden: 'PUNTAJE' });
    expect(ids(filtrarPostulaciones(FILAS, FILTROS_INICIALES))).toEqual(['a', 'b', 'e']);
  });

  describe('pestañas', () => {
    it.each([
      ['PENDIENTES', ['a', 'b', 'e']],
      ['APROBADAS', ['c']],
      ['RECHAZADAS', ['d']],
      ['TODAS', ['a', 'b', 'c', 'd', 'e']],
    ] as const)('%s', (pestana, esperadas) => {
      expect(ids(filtrarPostulaciones(FILAS, con({ pestana })))).toEqual(esperadas);
    });

    it('«Requieren revisión» son las pendientes con la marca, no las rechazadas con marca', () => {
      expect(ids(filtrarPostulaciones(FILAS, con({ pestana: 'REQUIEREN_REVISION' })))).toEqual([
        'b',
      ]);
    });
  });

  describe('filtros', () => {
    it('por área técnica', () => {
      expect(ids(filtrarPostulaciones(FILAS, con({ idArea: VIDEOJUEGOS.id })))).toEqual(['c']);
    });

    it('por especialidad', () => {
      expect(ids(filtrarPostulaciones(FILAS, con({ idEspecialidad: BACKEND.id })))).toEqual(['b']);
    });

    it('área y especialidad a la vez se combinan', () => {
      expect(
        ids(
          filtrarPostulaciones(
            FILAS,
            con({ idArea: SOFTWARE.id, idEspecialidad: PROGRAMACION.id }),
          ),
        ),
      ).toEqual([]);
    });

    it('rango de fechas con los dos extremos incluidos', () => {
      expect(
        ids(filtrarPostulaciones(FILAS, con({ desde: '2026-11-05', hasta: '2026-11-12' }))),
      ).toEqual(['a', 'b']);
    });

    it('solo «desde» o solo «hasta» deja el otro extremo abierto', () => {
      expect(ids(filtrarPostulaciones(FILAS, con({ desde: '2026-11-12' })))).toEqual(['a', 'e']);
      expect(ids(filtrarPostulaciones(FILAS, con({ hasta: '2026-11-01' })))).toEqual(['c', 'd']);
    });

    it('un rango al revés no trae nada', () => {
      expect(
        ids(filtrarPostulaciones(FILAS, con({ desde: '2026-11-12', hasta: '2026-11-01' }))),
      ).toEqual([]);
    });

    it('busca por nombre sin distinguir mayúsculas ni tildes', () => {
      expect(ids(filtrarPostulaciones(FILAS, con({ busqueda: 'OSCAR' })))).toEqual(['a']);
      expect(ids(filtrarPostulaciones(FILAS, con({ busqueda: 'óscar' })))).toEqual(['a']);
    });

    it('busca por correo y recorta los espacios', () => {
      expect(ids(filtrarPostulaciones(FILAS, con({ busqueda: '  luis@correo  ' })))).toEqual(['c']);
    });

    it('una búsqueda de solo espacios no filtra', () => {
      expect(ids(filtrarPostulaciones(FILAS, con({ busqueda: '   ' })))).toHaveLength(5);
    });

    it('todo se combina con la pestaña', () => {
      expect(
        ids(
          filtrarPostulaciones(
            FILAS,
            con({ pestana: 'PENDIENTES', idArea: SOFTWARE.id, busqueda: 'ana' }),
          ),
        ),
      ).toEqual(['b']);
    });

    it('una postulación sin área no pasa un filtro de área', () => {
      const sinArea = [fila({ id: 'x', area: null, especialidad: null })];
      expect(filtrarPostulaciones(sinArea, con({ idArea: SOFTWARE.id }))).toEqual([]);
      expect(filtrarPostulaciones(sinArea, con({}))).toHaveLength(1);
    });
  });

  describe('orden', () => {
    it('«por puntaje» conserva el ranking de la consulta, con las sin evaluar al final', () => {
      expect(ids(filtrarPostulaciones(FILAS, con({ orden: 'PUNTAJE' })))).toEqual([
        'a',
        'b',
        'c',
        'd',
        'e',
      ]);
    });

    it('«por fecha» va de la más reciente a la más antigua', () => {
      expect(ids(filtrarPostulaciones(FILAS, con({ orden: 'FECHA' })))).toEqual([
        'e',
        'a',
        'b',
        'd',
        'c',
      ]);
    });

    it('con la misma fecha desempata por ID, siempre igual', () => {
      const mismas = [
        fila({ id: 'z', fecha: new Date('2026-11-10T15:00:00.000Z') }),
        fila({ id: 'm', fecha: new Date('2026-11-10T15:00:00.000Z') }),
      ];
      expect(ids(filtrarPostulaciones(mismas, con({ orden: 'FECHA' })))).toEqual(['m', 'z']);
    });
  });

  it('no modifica la lista recibida', () => {
    const copia = [...FILAS];
    filtrarPostulaciones(FILAS, con({ orden: 'FECHA', busqueda: 'a' }));
    expect(FILAS).toEqual(copia);
  });
});

describe('opciones de los filtros', () => {
  it('las áreas salen sin repetir y por nombre', () => {
    expect(opcionesDeArea(FILAS)).toEqual([SOFTWARE, VIDEOJUEGOS]);
  });

  it('las especialidades salen sin repetir y por nombre', () => {
    expect(opcionesDeEspecialidad(FILAS, '')).toEqual([BACKEND, FRONTEND, PROGRAMACION]);
  });

  it('con un área elegida solo salen las especialidades de esa área', () => {
    expect(opcionesDeEspecialidad(FILAS, SOFTWARE.id)).toEqual([BACKEND, FRONTEND]);
    expect(opcionesDeEspecialidad(FILAS, VIDEOJUEGOS.id)).toEqual([PROGRAMACION]);
  });

  it('sin postulaciones no hay opciones', () => {
    expect(opcionesDeArea([])).toEqual([]);
    expect(opcionesDeEspecialidad([], '')).toEqual([]);
  });
});

describe('hayFiltros', () => {
  it('la pestaña y el orden no cuentan como filtro', () => {
    expect(hayFiltros(FILTROS_INICIALES)).toBe(false);
    expect(hayFiltros(con({ orden: 'FECHA', pestana: 'APROBADAS' }))).toBe(false);
  });

  it.each([
    { idArea: 'x' },
    { idEspecialidad: 'x' },
    { desde: '2026-11-01' },
    { hasta: '2026-11-01' },
    { busqueda: 'ana' },
  ])('%j sí cuenta', (cambios) => {
    expect(hayFiltros(con(cambios))).toBe(true);
  });

  it('una búsqueda de solo espacios no cuenta', () => {
    expect(hayFiltros(con({ busqueda: '   ' }))).toBe(false);
  });
});

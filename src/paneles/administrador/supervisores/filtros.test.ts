import { describe, expect, it } from 'vitest';
import type { FilaSupervisor } from '@/app/adaptadores';
import {
  FILTROS_INICIALES,
  filtrarSupervisores,
  hayFiltros,
  type FiltrosSupervisores,
} from './filtros';

function fila(cambios: Partial<FilaSupervisor> & { id: string }): FilaSupervisor {
  return {
    nombre: `Supervisor ${cambios.id}`,
    correo: `${cambios.id}@codaini.demo`,
    estado: 'ACTIVO',
    proyectosACargo: 1,
    practicantesACargo: 3,
    tareasPorRevisar: 0,
    ultimaActividad: null,
    ultimaActividadTexto: 'Sin actividad',
    ...cambios,
  };
}

const FILAS: FilaSupervisor[] = [
  fila({ id: 'a', nombre: 'Óscar Benavides' }),
  fila({ id: 'b', nombre: 'Ana Quispe', estado: 'INACTIVO' }),
  fila({ id: 'c', nombre: 'Carla Ruiz' }),
];

const con = (cambios: Partial<FiltrosSupervisores>): FiltrosSupervisores => ({
  ...FILTROS_INICIALES,
  ...cambios,
});
const idsDe = (filas: FilaSupervisor[]) => filas.map((f) => f.id);

describe('filtrarSupervisores', () => {
  it('abre en «Activos» y deja fuera a los inactivos', () => {
    expect(FILTROS_INICIALES.pestana).toBe('ACTIVOS');
    expect(idsDe(filtrarSupervisores(FILAS, FILTROS_INICIALES))).toEqual(['a', 'c']);
  });

  it('«Inactivos» son los de cuenta desactivada y «Todos» incluye a todos', () => {
    expect(idsDe(filtrarSupervisores(FILAS, con({ pestana: 'INACTIVOS' })))).toEqual(['b']);
    expect(idsDe(filtrarSupervisores(FILAS, con({ pestana: 'TODOS' })))).toEqual(['a', 'b', 'c']);
  });

  it('busca por nombre o por correo, sin distinguir mayúsculas ni tildes', () => {
    expect(idsDe(filtrarSupervisores(FILAS, con({ busqueda: 'oscar' })))).toEqual(['a']);
    expect(idsDe(filtrarSupervisores(FILAS, con({ busqueda: 'C@CODAINI' })))).toEqual(['c']);
    expect(filtrarSupervisores(FILAS, con({ busqueda: 'zzz' }))).toEqual([]);
  });

  it('una búsqueda de solo espacios no filtra', () => {
    expect(filtrarSupervisores(FILAS, con({ busqueda: '   ' }))).toHaveLength(2);
  });

  it('combina pestaña y búsqueda, y no modifica la lista recibida', () => {
    const copia = [...FILAS];
    const resultado = filtrarSupervisores(FILAS, con({ pestana: 'TODOS', busqueda: 'quispe' }));
    expect(idsDe(resultado)).toEqual(['b']);
    expect(FILAS).toEqual(copia);
  });
});

describe('hayFiltros', () => {
  it('no cuenta la pestaña, solo la búsqueda', () => {
    expect(hayFiltros(FILTROS_INICIALES)).toBe(false);
    expect(hayFiltros(con({ pestana: 'TODOS' }))).toBe(false);
    expect(hayFiltros(con({ busqueda: 'a' }))).toBe(true);
    expect(hayFiltros(con({ busqueda: '  ' }))).toBe(false);
  });
});

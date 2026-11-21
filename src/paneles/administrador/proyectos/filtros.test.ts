import { describe, expect, it } from 'vitest';
import type { FilaProyecto } from '@/app/adaptadores';
import {
  FILTROS_INICIALES,
  filtrarProyectos,
  hayFiltros,
  opcionesDeSupervisor,
  type FiltrosProyectos,
} from './filtros';

const ANA = { id: 'sup-ana', nombre: 'Ana Quispe' };
const BETO = { id: 'sup-beto', nombre: 'Beto Ríos' };

function fila(cambios: Partial<FilaProyecto> & { id: string }): FilaProyecto {
  return {
    nombre: `Proyecto ${cambios.id}`,
    codigo: cambios.id.toUpperCase(),
    estado: 'ACTIVO',
    supervisor: ANA,
    practicantesActivos: 3,
    avance: null,
    tareasEsperandoSupervision: 0,
    proximaReunionTexto: 'Sin definir',
    ...cambios,
  };
}

const FILAS: FilaProyecto[] = [
  fila({ id: 'a', nombre: 'Plataforma de reservas' }),
  fila({ id: 'b', nombre: 'Árbol de decisiones', supervisor: BETO, estado: 'EN_PAUSA' }),
  fila({ id: 'c', nombre: 'Tienda en línea', estado: 'FINALIZADO' }),
  fila({ id: 'd', nombre: 'Datos abiertos', supervisor: BETO }),
];

const con = (cambios: Partial<FiltrosProyectos>): FiltrosProyectos => ({
  ...FILTROS_INICIALES,
  ...cambios,
});
const idsDe = (filas: FilaProyecto[]) => filas.map((f) => f.id);

describe('filtrarProyectos', () => {
  it('abre en «Activos»', () => {
    expect(FILTROS_INICIALES.pestana).toBe('ACTIVO');
    expect(idsDe(filtrarProyectos(FILAS, FILTROS_INICIALES))).toEqual(['a', 'd']);
  });

  it('cada pestaña muestra los proyectos de su estado y «Todos» incluye a todos', () => {
    expect(idsDe(filtrarProyectos(FILAS, con({ pestana: 'EN_PAUSA' })))).toEqual(['b']);
    expect(idsDe(filtrarProyectos(FILAS, con({ pestana: 'FINALIZADO' })))).toEqual(['c']);
    expect(idsDe(filtrarProyectos(FILAS, con({ pestana: 'TODOS' })))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('filtra por supervisor', () => {
    expect(
      idsDe(filtrarProyectos(FILAS, con({ pestana: 'TODOS', idSupervisor: BETO.id }))),
    ).toEqual(['b', 'd']);
  });

  it('busca por nombre, sin distinguir mayúsculas ni tildes', () => {
    expect(idsDe(filtrarProyectos(FILAS, con({ pestana: 'TODOS', busqueda: 'arbol' })))).toEqual([
      'b',
    ]);
    expect(idsDe(filtrarProyectos(FILAS, con({ pestana: 'TODOS', busqueda: 'TIENDA' })))).toEqual([
      'c',
    ]);
    expect(filtrarProyectos(FILAS, con({ busqueda: 'zzz' }))).toEqual([]);
  });

  it('la búsqueda es por nombre: el código no cuenta', () => {
    expect(
      filtrarProyectos(FILAS, con({ pestana: 'TODOS', busqueda: 'a' })).length,
    ).toBeGreaterThan(0);
    expect(
      filtrarProyectos(
        [fila({ id: 'x', nombre: 'Uno', codigo: 'PL2D' })],
        con({ busqueda: 'pl2d' }),
      ),
    ).toEqual([]);
  });

  it('una búsqueda de solo espacios no filtra', () => {
    expect(filtrarProyectos(FILAS, con({ busqueda: '   ' }))).toHaveLength(2);
  });

  it('combina pestaña, supervisor y búsqueda, y no modifica la lista recibida', () => {
    const copia = [...FILAS];
    const resultado = filtrarProyectos(
      FILAS,
      con({ pestana: 'ACTIVO', idSupervisor: BETO.id, busqueda: 'datos' }),
    );
    expect(idsDe(resultado)).toEqual(['d']);
    expect(FILAS).toEqual(copia);
  });
});

describe('opcionesDeSupervisor', () => {
  it('salen sin repetir y por nombre', () => {
    expect(opcionesDeSupervisor(FILAS)).toEqual([ANA, BETO]);
  });
});

describe('hayFiltros', () => {
  it('no cuenta la pestaña, solo el supervisor y la búsqueda', () => {
    expect(hayFiltros(FILTROS_INICIALES)).toBe(false);
    expect(hayFiltros(con({ pestana: 'TODOS' }))).toBe(false);
    expect(hayFiltros(con({ idSupervisor: 'x' }))).toBe(true);
    expect(hayFiltros(con({ busqueda: 'a' }))).toBe(true);
    expect(hayFiltros(con({ busqueda: '  ' }))).toBe(false);
  });
});

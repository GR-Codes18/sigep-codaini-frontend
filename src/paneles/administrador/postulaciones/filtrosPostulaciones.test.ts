import { describe, expect, it } from 'vitest';
import { EVALUACIONES_EJEMPLO, POSTULANTES_EJEMPLO } from './datosEjemplo';
import { contarPorPestana, filtrarYOrdenar, unirFilas, type Filtros } from './filtrosPostulaciones';

const filas = unirFilas(POSTULANTES_EJEMPLO, EVALUACIONES_EJEMPLO);
const base: Filtros = {
  pestana: 'pendientes',
  busqueda: '',
  idArea: '',
  idEspecialidad: '',
  desde: '',
  hasta: '',
};

describe('filtros de postulaciones', () => {
  it('cuenta por pestaña; "revisión" es una marca sobre las pendientes', () => {
    expect(contarPorPestana(filas)).toEqual({
      pendientes: 4,
      revision: 2,
      aprobadas: 1,
      rechazadas: 1,
      todas: 6,
    });
  });

  it('ordena por puntaje de mayor a menor', () => {
    const ids = filtrarYOrdenar(filas, base).map((f) => f.postulante.id);
    expect(ids).toEqual(['p4', 'p1', 'p2', 'p3']);
  });

  it('busca por nombre o correo, sin distinguir mayúsculas', () => {
    expect(filtrarYOrdenar(filas, { ...base, pestana: 'todas', busqueda: 'MARCO' })).toHaveLength(
      1,
    );
    expect(filtrarYOrdenar(filas, { ...base, pestana: 'todas', busqueda: 'lucia@' })).toHaveLength(
      0,
    );
  });

  it('filtra por área y especialidad', () => {
    const r = filtrarYOrdenar(filas, {
      ...base,
      pestana: 'todas',
      idArea: 'a-soft',
      idEspecialidad: 'e-back',
    });
    expect(r.map((f) => f.postulante.id).sort()).toEqual(['p2', 'p5']);
  });

  it('filtra por rango de fechas', () => {
    const hoy = new Date().toISOString().slice(0, 10);
    expect(filtrarYOrdenar(filas, { ...base, pestana: 'todas', desde: hoy })).toHaveLength(0);
  });

  it('solo las pendientes con marca entran en "Requieren revisión"', () => {
    const r = filtrarYOrdenar(filas, { ...base, pestana: 'revision' });
    expect(r.map((f) => f.postulante.id)).toEqual(['p2', 'p3']);
  });
});

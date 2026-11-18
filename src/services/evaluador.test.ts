import { describe, expect, it } from 'vitest';
import type { CriterioEvaluacion } from '@/domain';
import {
  EVALUADOR_SIMULADO,
  OBSERVACION_CUMPLIDO,
  OBSERVACION_NO_CUMPLIDO,
  PORCENTAJE_CUMPLIDO_SIMULADO,
} from './evaluador';

const criterio = (id: string): CriterioEvaluacion => ({
  id,
  id_area_tecnica: 'area-sw',
  id_especialidad: null,
  nombre: id,
  tipo: 'TECNOLOGIA',
  peso: 10,
  obligatorio: false,
  activo: true,
});

const CV = { nombre: 'cv.pdf', url: '/cv.pdf' };

describe('EVALUADOR_SIMULADO', () => {
  const criterios = Array.from({ length: 200 }, (_, i) => criterio(`cri-${i}`));

  it('da un juicio por criterio, en el mismo orden, con su observación', () => {
    const juicios = EVALUADOR_SIMULADO.juzgar({ id: 'pos-1', cv: CV }, criterios.slice(0, 5));
    expect(juicios.map((j) => j.id_criterio)).toEqual(criterios.slice(0, 5).map((c) => c.id));
    for (const j of juicios) {
      expect(j.observacion).toBe(j.cumplido ? OBSERVACION_CUMPLIDO : OBSERVACION_NO_CUMPLIDO);
    }
  });

  it('es determinista', () => {
    const a = EVALUADOR_SIMULADO.juzgar({ id: 'pos-1', cv: CV }, criterios);
    const b = EVALUADOR_SIMULADO.juzgar({ id: 'pos-1', cv: CV }, criterios);
    expect(b).toEqual(a);
  });

  it('depende del postulante', () => {
    const a = EVALUADOR_SIMULADO.juzgar({ id: 'pos-1', cv: CV }, criterios).map((j) => j.cumplido);
    const b = EVALUADOR_SIMULADO.juzgar({ id: 'pos-2', cv: CV }, criterios).map((j) => j.cumplido);
    expect(b).not.toEqual(a);
  });

  it('cumple cerca del porcentaje configurado', () => {
    const cumplidos = EVALUADOR_SIMULADO.juzgar({ id: 'pos-1', cv: CV }, criterios).filter(
      (j) => j.cumplido,
    ).length;
    const porcentaje = (cumplidos / criterios.length) * 100;
    expect(Math.abs(porcentaje - PORCENTAJE_CUMPLIDO_SIMULADO)).toBeLessThan(10);
  });
});

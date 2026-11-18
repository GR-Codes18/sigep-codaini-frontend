import { describe, expect, it } from 'vitest';
import { ESTADOS_POSTULACION } from './enumeraciones';
import {
  ACCIONES_DECISION_POSTULACION,
  decisionesDisponibles,
  puedeDecidirPostulacion,
  type AccionDecisionPostulacion,
} from './decisionPostulacion';
import type { EstadoPostulacion } from './enumeraciones';

/** Rejilla completa: estado × acción. El estado nuevo si se permite; si no, el código de error. */
const ESPERADO: Record<
  EstadoPostulacion,
  Record<AccionDecisionPostulacion, EstadoPostulacion | string>
> = {
  PENDIENTE: {
    APROBAR: 'APROBADA',
    RECHAZAR: 'RECHAZADA',
    RECONSIDERAR: 'POSTULACION_NO_RECHAZADA',
  },
  APROBADA: {
    APROBAR: 'POSTULACION_NO_PENDIENTE',
    RECHAZAR: 'POSTULACION_NO_PENDIENTE',
    RECONSIDERAR: 'POSTULACION_NO_RECHAZADA',
  },
  RECHAZADA: {
    APROBAR: 'POSTULACION_NO_PENDIENTE',
    RECHAZAR: 'POSTULACION_NO_PENDIENTE',
    RECONSIDERAR: 'PENDIENTE',
  },
};

describe('puedeDecidirPostulacion: estado × acción', () => {
  for (const estado of ESTADOS_POSTULACION) {
    for (const accion of ACCIONES_DECISION_POSTULACION) {
      const esperado = ESPERADO[estado][accion];
      it(`${accion} con la postulación ${estado} → ${esperado}`, () => {
        const r = puedeDecidirPostulacion(estado, accion);
        if (esperado.startsWith('POSTULACION_')) {
          expect(r).toMatchObject({ ok: false, codigo: esperado });
          if (!r.ok) expect(r.mensaje.length).toBeGreaterThan(0);
        } else {
          expect(r).toEqual({ ok: true, estado_nuevo: esperado });
        }
      });
    }
  }

  it('una postulación aprobada no admite ninguna decisión', () => {
    expect(decisionesDisponibles('APROBADA')).toEqual([]);
  });
});

describe('decisionesDisponibles', () => {
  it('pendiente: aprobar y rechazar', () => {
    expect(decisionesDisponibles('PENDIENTE')).toEqual(['APROBAR', 'RECHAZAR']);
  });

  it('rechazada: solo reconsiderar', () => {
    expect(decisionesDisponibles('RECHAZADA')).toEqual(['RECONSIDERAR']);
  });
});

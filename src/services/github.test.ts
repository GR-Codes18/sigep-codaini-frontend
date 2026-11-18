import { describe, expect, it } from 'vitest';
import { siguienteEstadoPR, type EstadoPR } from '@/domain';
import { GITHUB_SIMULADO, consultaSimulada } from './github';

const URL = 'https://github.com/org-demo/pl2d/pull/7';

describe('GitHub simulado (D4-A): responde lo último que se sabe del PR', () => {
  it.each([
    ['CREADO', { estado: 'ABIERTO', conflictos: false }],
    ['CON_CONFLICTOS', { estado: 'ABIERTO', conflictos: true }],
    ['FUSIONADO', { estado: 'FUSIONADO' }],
    ['CERRADO', { estado: 'CERRADO' }],
    // PR viejo ya fusionado y recalculado a PENDIENTE (la URL se conserva): sigue fusionado.
    ['PENDIENTE', { estado: 'FUSIONADO' }],
  ] as const)('%s con URL → %j', (estado_pr, esperado) => {
    expect(consultaSimulada({ url_pull_request: URL, estado_pr })).toEqual(esperado);
  });

  it.each([
    ['CREADO', 'CREADO'],
    ['CON_CONFLICTOS', 'CON_CONFLICTOS'],
    ['FUSIONADO', 'PENDIENTE'],
    ['CERRADO', 'CERRADO'],
    ['PENDIENTE', 'PENDIENTE'],
  ] as const)(
    'al volver a llegar con %s, siguienteEstadoPR da %s',
    (estado_pr, esperado: EstadoPR) => {
      const tarea = {
        estado: 'EN_PROGRESO' as const,
        requiere_pr: true,
        estado_pr,
        url_pull_request: URL,
      };
      const github = consultaSimulada(tarea);
      expect(siguienteEstadoPR(tarea, { tipo: 'TAREA_ENVIADA_O_TERMINADA', github })).toEqual({
        aplica: true,
        estado_pr: esperado,
      });
    },
  );

  it('una tarea sin URL o sin estado_pr no tiene PR que consultar: lanza (dato roto)', () => {
    expect(() => consultaSimulada({ url_pull_request: null, estado_pr: 'PENDIENTE' })).toThrow();
    expect(() => consultaSimulada({ url_pull_request: URL, estado_pr: null })).toThrow();
  });

  it('GITHUB_SIMULADO usa esa consulta', () => {
    expect(
      GITHUB_SIMULADO.consultarPullRequest({ url_pull_request: URL, estado_pr: 'CREADO' }),
    ).toEqual({ estado: 'ABIERTO', conflictos: false });
  });
});

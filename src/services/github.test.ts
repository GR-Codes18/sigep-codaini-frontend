import { describe, expect, it } from 'vitest';
import { siguienteEstadoPR, type EstadoPR } from '@/domain';
import {
  GITHUB_SIMULADO,
  consultaSimulada,
  crearPullRequestSimulado,
  ramaConConflictos,
  ramaEliminada,
  ramasSimuladas,
  type PRConocido,
  type RepositorioPR,
  type SolicitudPR,
} from './github';

const URL = 'https://github.com/org-demo/pl2d/pull/7';
const REPO = 'https://github.com/org-demo/plataforma-2d';
const REPOSITORIO: RepositorioPR = {
  repositorio_url: REPO,
  codigo: 'PL2D',
  rama_base: 'develop',
  ultimo_numero_tarea: 12,
};

function pr(cambios: Partial<PRConocido> & Pick<PRConocido, 'rama_origen'>): PRConocido {
  return {
    url: `${REPO}/pull/1`,
    rama_base: 'develop',
    estado_pr: 'CREADO',
    propio: false,
    ...cambios,
  };
}

function solicitud(rama_origen: string, prs: PRConocido[] = []): SolicitudPR {
  return {
    repositorio: REPOSITORIO,
    rama_origen,
    titulo: 'PL2D-006 · Efectos',
    descripcion: '',
    prs_del_proyecto: prs,
  };
}

describe('GitHub simulado: catálogo de ramas (P1-A)', () => {
  it('una rama por número de tarea con el formato de la semilla, más las dos especiales, sin la base', () => {
    const ramas = ramasSimuladas(REPOSITORIO);
    expect(ramas).toHaveLength(14);
    expect(ramas.slice(0, 3)).toEqual(['feature/pl2d-001', 'feature/pl2d-002', 'feature/pl2d-003']);
    expect(ramas).toContain('feature/pl2d-012');
    expect(ramas).not.toContain('feature/pl2d-013');
    expect(ramas.slice(-2)).toEqual(['feature/pl2d-con-conflictos', 'feature/pl2d-rama-eliminada']);
    expect(ramas).not.toContain('develop');
    expect(ramaEliminada(REPOSITORIO)).toBe('feature/pl2d-rama-eliminada');
    expect(ramaConConflictos(REPOSITORIO)).toBe('feature/pl2d-con-conflictos');
  });

  it('un proyecto nuevo, sin tareas, solo tiene las dos ramas especiales', () => {
    expect(ramasSimuladas({ ...REPOSITORIO, codigo: 'NUE', ultimo_numero_tarea: 0 })).toEqual([
      'feature/nue-con-conflictos',
      'feature/nue-rama-eliminada',
    ]);
  });

  it('pasado el 999 el número sigue creciendo, como el ID legible', () => {
    expect(ramasSimuladas({ ...REPOSITORIO, ultimo_numero_tarea: 1000 })).toContain(
      'feature/pl2d-1000',
    );
  });
});

describe('GitHub simulado: crear un Pull Request', () => {
  it('caso de error preparado (P2-A): la rama eliminada aparece en la lista pero da RAMA_INEXISTENTE', () => {
    expect(ramasSimuladas(REPOSITORIO)).toContain(ramaEliminada(REPOSITORIO));
    expect(crearPullRequestSimulado(solicitud(ramaEliminada(REPOSITORIO)))).toEqual({
      ok: false,
      codigo: 'RAMA_INEXISTENTE',
    });
  });

  it('una rama fuera del catálogo (o la base) también da RAMA_INEXISTENTE', () => {
    for (const rama of ['feature/otra-cosa', 'feature/pl2d-013', 'develop']) {
      expect(crearPullRequestSimulado(solicitud(rama)), rama).toEqual({
        ok: false,
        codigo: 'RAMA_INEXISTENTE',
      });
    }
  });

  it('PR nuevo: número siguiente al mayor conocido del proyecto, sin conflictos', () => {
    const prs = [
      pr({ rama_origen: 'feature/pl2d-001', url: `${REPO}/pull/4`, estado_pr: 'FUSIONADO' }),
      pr({ rama_origen: 'feature/pl2d-004', url: `${REPO}/pull/9`, estado_pr: 'CERRADO' }),
    ];
    expect(crearPullRequestSimulado(solicitud('feature/pl2d-006', prs))).toEqual({
      ok: true,
      resultado: 'NUEVO',
      url: `${REPO}/pull/10`,
      conflictos: false,
    });
    expect(crearPullRequestSimulado(solicitud('feature/pl2d-006'))).toMatchObject({
      url: `${REPO}/pull/1`,
    });
  });

  it('el número cuenta también el PR anterior de la propia tarea (nunca repite uno)', () => {
    const propio = pr({
      rama_origen: 'feature/pl2d-006',
      url: `${REPO}/pull/12`,
      estado_pr: 'CERRADO',
      propio: true,
    });
    expect(crearPullRequestSimulado(solicitud('feature/pl2d-006', [propio]))).toMatchObject({
      resultado: 'NUEVO',
      url: `${REPO}/pull/13`,
    });
  });

  it('la rama con conflictos (P5-A) crea el PR e informa conflictos', () => {
    expect(crearPullRequestSimulado(solicitud(ramaConConflictos(REPOSITORIO)))).toMatchObject({
      ok: true,
      resultado: 'NUEVO',
      conflictos: true,
    });
  });

  it.each([
    ['CREADO', 'EXISTENTE_ABIERTO', false],
    ['CON_CONFLICTOS', 'EXISTENTE_ABIERTO', true],
    ['FUSIONADO', 'EXISTENTE_FUSIONADO', false],
    // Un PENDIENTE con URL es un PR viejo ya fusionado.
    ['PENDIENTE', 'EXISTENTE_FUSIONADO', false],
  ] as const)(
    'PR existente de otra tarea con las mismas ramas (P3-A), %s → %s y se vincula su URL',
    (estado_pr, resultado, conflictos) => {
      const otro = pr({ rama_origen: 'feature/pl2d-005', url: `${REPO}/pull/4`, estado_pr });
      expect(crearPullRequestSimulado(solicitud('feature/pl2d-005', [otro]))).toEqual({
        ok: true,
        resultado,
        url: `${REPO}/pull/4`,
        conflictos,
      });
    },
  );

  it('un PR abierto pesa más que uno fusionado con las mismas ramas', () => {
    const prs = [
      pr({ rama_origen: 'feature/pl2d-005', url: `${REPO}/pull/2`, estado_pr: 'FUSIONADO' }),
      pr({ rama_origen: 'feature/pl2d-005', url: `${REPO}/pull/6`, estado_pr: 'CREADO' }),
    ];
    expect(crearPullRequestSimulado(solicitud('feature/pl2d-005', prs))).toMatchObject({
      resultado: 'EXISTENTE_ABIERTO',
      url: `${REPO}/pull/6`,
    });
  });

  it('no bloquean: un PR cerrado, el PR propio, otra rama base u otra rama de origen', () => {
    const casos = [
      pr({ rama_origen: 'feature/pl2d-005', url: `${REPO}/pull/3`, estado_pr: 'CERRADO' }),
      pr({
        rama_origen: 'feature/pl2d-005',
        url: `${REPO}/pull/4`,
        estado_pr: 'FUSIONADO',
        propio: true,
      }),
      pr({ rama_origen: 'feature/pl2d-005', url: `${REPO}/pull/5`, rama_base: 'main' }),
      pr({ rama_origen: 'feature/pl2d-007', url: `${REPO}/pull/6` }),
    ];
    for (const caso of casos) {
      expect(
        crearPullRequestSimulado(solicitud('feature/pl2d-005', [caso])),
        caso.url,
      ).toMatchObject({ resultado: 'NUEVO' });
    }
  });
});

describe('GitHub simulado: el puerto completo', () => {
  it('GITHUB_SIMULADO expone las cuatro operaciones de §7.6', () => {
    expect(GITHUB_SIMULADO.listarRamas(REPOSITORIO)).toEqual(ramasSimuladas(REPOSITORIO));
    expect(GITHUB_SIMULADO.crearPullRequest(solicitud('feature/pl2d-006'))).toMatchObject({
      ok: true,
    });
    expect(() => GITHUB_SIMULADO.cerrarPullRequest(URL)).not.toThrow();
  });
});

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

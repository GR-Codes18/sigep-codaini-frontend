import { describe, expect, it } from 'vitest';

import type { EstadoPR, EstadoTarea, Rol } from './enumeraciones';
import { ESTADOS_TAREA } from './enumeraciones';
import type {
  CodigoAccionPR,
  ConsultaGitHub,
  EventoPR,
  ResultadoAccionPR,
  ResultadoEventoPR,
} from './estadoPR';
import {
  CODIGOS_PR,
  etiquetaPRVisible,
  necesitaConsultaGitHub,
  puedeCerrarPullRequest,
  puedeCrearPullRequest,
  siguienteEstadoPR,
} from './estadoPR';
import type { Asignacion, Proyecto } from './proyectos';
import { IDS, asignacion, proyecto, tarea, usuario } from './pruebas/fabricas';
import type { Tarea } from './tareas';
import type { ContextoTransicion } from './transiciones';
import { TEXTO_OBLIGATORIO } from './transiciones';

const URL_PR = 'https://github.com/codaini/proyecto-prueba/pull/1';
const ROLES: Rol[] = ['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'];

// Escritos a mano desde la propuesta; no se importan de `estadoPR.ts`.
/** §7.3: la etiqueta solo existe en estas dos columnas. */
const ESTADOS_CON_ETIQUETA: EstadoTarea[] = ['ESPERANDO_SUPERVISION', 'TERMINADA'];
const ESTADOS_SIN_ETIQUETA: EstadoTarea[] = ['DISPONIBLE', 'EN_PROGRESO'];
/** Los 6 valores posibles de `estado_pr`, en este orden en todas las tablas. */
const ESTADOS_PR_CON_NULO: (EstadoPR | null)[] = [
  null,
  'PENDIENTE',
  'CREADO',
  'CON_CONFLICTOS',
  'FUSIONADO',
  'CERRADO',
];
/** Estados del PR que implican que ya hubo uno (tienen URL). */
const ESTADOS_PR_CON_URL: EstadoPR[] = ['CREADO', 'CON_CONFLICTOS', 'FUSIONADO', 'CERRADO'];

function contexto(
  cambios: { proyecto?: Partial<Proyecto>; asignaciones?: Asignacion[] } = {},
): ContextoTransicion {
  return {
    proyecto: proyecto(cambios.proyecto),
    asignaciones: cambios.asignaciones ?? [asignacion()],
  };
}

/** Tarea coherente: sin responsable si está DISPONIBLE y con URL si el PR ya existió. */
function tareaEn(
  estado: EstadoTarea,
  estado_pr: EstadoPR | null,
  cambios: Partial<Tarea> = {},
): Tarea {
  const conUrl = estado_pr !== null && ESTADOS_PR_CON_URL.includes(estado_pr);
  return tarea({
    estado,
    id_practicante: estado === 'DISPONIBLE' ? null : IDS.practicante,
    requiere_pr: true,
    estado_pr,
    url_pull_request: conUrl ? URL_PR : null,
    ...cambios,
  });
}

function esperarAplica(resultado: ResultadoEventoPR, estado_pr: EstadoPR | null, caso: string) {
  expect(resultado, caso).toEqual({ aplica: true, estado_pr });
}

function esperarPermitido(resultado: ResultadoAccionPR, exige: 'MOTIVO' | null, caso: string) {
  expect(resultado, caso).toEqual({ permitido: true, exige_texto: exige });
}

function esperarDenegado(resultado: ResultadoAccionPR, codigo: CodigoAccionPR, caso: string) {
  expect(resultado, caso).toEqual({ permitido: false, codigo });
}

describe('contrato del PR', () => {
  it('declara los 4 códigos nuevos y reutiliza TEXTO_OBLIGATORIO', () => {
    expect(CODIGOS_PR).toEqual([
      'TAREA_SIN_ETIQUETA_PR',
      'TAREA_NO_REQUIERE_PR',
      'ESTADO_PR_NO_APLICA',
      'FALTA_CONSULTA_GITHUB',
      TEXTO_OBLIGATORIO,
    ]);
    expect(new Set(CODIGOS_PR).size).toBe(5);
  });
});

describe('etiquetaPRVisible (§7.3)', () => {
  it('en ESPERANDO_SUPERVISION y TERMINADA con Requiere PR muestra el estado_pr tal cual', () => {
    for (const estado of ESTADOS_CON_ETIQUETA) {
      for (const estado_pr of ESTADOS_PR_CON_NULO) {
        expect(etiquetaPRVisible(tareaEn(estado, estado_pr)), `${estado} ${estado_pr}`).toBe(
          estado_pr,
        );
      }
    }
  });

  it('en DISPONIBLE y EN_PROGRESO nunca hay etiqueta, aunque el PR exista', () => {
    for (const estado of ESTADOS_SIN_ETIQUETA) {
      for (const estado_pr of ESTADOS_PR_CON_NULO) {
        expect(etiquetaPRVisible(tareaEn(estado, estado_pr)), `${estado} ${estado_pr}`).toBeNull();
      }
    }
  });

  it('sin Requiere PR no hay etiqueta en ningún estado', () => {
    for (const estado of ESTADOS_TAREA) {
      for (const estado_pr of ESTADOS_PR_CON_NULO) {
        const t = tareaEn(estado, estado_pr, { requiere_pr: false });
        expect(etiquetaPRVisible(t), `${estado} ${estado_pr}`).toBeNull();
      }
    }
  });
});

describe('necesitaConsultaGitHub', () => {
  it('solo con Requiere PR y un PR anterior (URL)', () => {
    expect(necesitaConsultaGitHub({ requiere_pr: true, url_pull_request: URL_PR })).toBe(true);
    expect(necesitaConsultaGitHub({ requiere_pr: true, url_pull_request: null })).toBe(false);
    expect(necesitaConsultaGitHub({ requiere_pr: false, url_pull_request: URL_PR })).toBe(false);
    expect(necesitaConsultaGitHub({ requiere_pr: false, url_pull_request: null })).toBe(false);
  });
});

describe('siguienteEstadoPR: TAREA_ENVIADA_O_TERMINADA (llegada y recálculo)', () => {
  const LLEGA: EventoPR = { tipo: 'TAREA_ENVIADA_O_TERMINADA' };
  const ABIERTO: ConsultaGitHub = { estado: 'ABIERTO', conflictos: false };
  const ABIERTO_CON_CONFLICTOS: ConsultaGitHub = { estado: 'ABIERTO', conflictos: true };
  const FUSIONADO: ConsultaGitHub = { estado: 'FUSIONADO' };
  const CERRADO: ConsultaGitHub = { estado: 'CERRADO' };

  it('primera llegada con Requiere PR: null → PENDIENTE', () => {
    for (const estado of ESTADOS_CON_ETIQUETA) {
      esperarAplica(siguienteEstadoPR(tareaEn(estado, null), LLEGA), 'PENDIENTE', estado);
    }
  });

  it('vuelve a llegar sin haber tenido PR: PENDIENTE sigue PENDIENTE (y GitHub se ignora)', () => {
    const t = tareaEn('ESPERANDO_SUPERVISION', 'PENDIENTE');
    esperarAplica(siguienteEstadoPR(t, LLEGA), 'PENDIENTE', 'sin github');
    esperarAplica(
      siguienteEstadoPR(t, { tipo: 'TAREA_ENVIADA_O_TERMINADA', github: CERRADO }),
      'PENDIENTE',
      'con github',
    );
  });

  it('sin Requiere PR conserva el valor: null queda null (decisión 1) y nada se recalcula', () => {
    for (const estado_pr of ESTADOS_PR_CON_NULO) {
      const t = tareaEn('TERMINADA', estado_pr, { requiere_pr: false });
      esperarAplica(siguienteEstadoPR(t, LLEGA), estado_pr, `${estado_pr} sin github`);
      esperarAplica(
        siguienteEstadoPR(t, { tipo: 'TAREA_ENVIADA_O_TERMINADA', github: ABIERTO }),
        estado_pr,
        `${estado_pr} con github`,
      );
    }
  });

  it('con un PR anterior y sin consulta a GitHub → FALTA_CONSULTA_GITHUB (nunca se adivina)', () => {
    const conUrl: (EstadoPR | null)[] = [...ESTADOS_PR_CON_URL, 'PENDIENTE'];
    for (const estado_pr of conUrl) {
      const t = tareaEn('ESPERANDO_SUPERVISION', estado_pr, { url_pull_request: URL_PR });
      expect(siguienteEstadoPR(t, LLEGA), String(estado_pr)).toEqual({
        aplica: false,
        codigo: 'FALTA_CONSULTA_GITHUB',
      });
    }
  });

  it('recalcula con GitHub sin importar el estado anterior: abierto, conflictos, fusionado, cerrado', () => {
    // §7.4: abierto → Creado (o Con conflictos); fusionado → Pendiente; cerrado → Cerrado.
    const casos: [ConsultaGitHub, EstadoPR, string][] = [
      [ABIERTO, 'CREADO', 'abierto'],
      [ABIERTO_CON_CONFLICTOS, 'CON_CONFLICTOS', 'abierto con conflictos'],
      [FUSIONADO, 'PENDIENTE', 'fusionado vuelve a PENDIENTE'],
      [CERRADO, 'CERRADO', 'cerrado'],
    ];
    // PENDIENTE con URL: la tarea ya se recalculó una vez tras un PR fusionado (S4).
    const anteriores: EstadoPR[] = [...ESTADOS_PR_CON_URL, 'PENDIENTE'];
    for (const estado of ESTADOS_CON_ETIQUETA) {
      for (const anterior of anteriores) {
        const t = tareaEn(estado, anterior, { url_pull_request: URL_PR });
        for (const [github, esperado, nombre] of casos) {
          esperarAplica(
            siguienteEstadoPR(t, { tipo: 'TAREA_ENVIADA_O_TERMINADA', github }),
            esperado,
            `${estado} ${anterior}: ${nombre}`,
          );
        }
      }
    }
  });
});

describe('siguienteEstadoPR: eventos del PR (tabla de §7.4 × los 6 valores de estado_pr)', () => {
  type Esperado = EstadoPR | 'NO_APLICA';
  // Columnas: null, PENDIENTE, CREADO, CON_CONFLICTOS, FUSIONADO, CERRADO.
  const TABLA: { nombre: string; evento: EventoPR; esperados: Esperado[] }[] = [
    {
      // «Se crea el PR» y «Desde Cerrado, Crear nuevo PR» → Creado.
      nombre: 'PR nuevo',
      evento: { tipo: 'PR_CREADO', resultado: 'NUEVO' },
      esperados: ['NO_APLICA', 'CREADO', 'NO_APLICA', 'NO_APLICA', 'NO_APLICA', 'CREADO'],
    },
    {
      // «Se detecta uno existente que está abierto» → Creado.
      nombre: 'PR existente abierto',
      evento: { tipo: 'PR_CREADO', resultado: 'EXISTENTE_ABIERTO' },
      esperados: ['NO_APLICA', 'CREADO', 'NO_APLICA', 'NO_APLICA', 'NO_APLICA', 'CREADO'],
    },
    {
      // «Se detecta un PR existente que ya estaba fusionado» → Fusionado.
      nombre: 'PR existente fusionado',
      evento: { tipo: 'PR_CREADO', resultado: 'EXISTENTE_FUSIONADO' },
      esperados: ['NO_APLICA', 'FUSIONADO', 'NO_APLICA', 'NO_APLICA', 'NO_APLICA', 'FUSIONADO'],
    },
    {
      // «El practicante resuelve los conflictos» → Creado.
      nombre: 'GitHub: abierto sin conflictos',
      evento: { tipo: 'GITHUB_INFORMA', consulta: { estado: 'ABIERTO', conflictos: false } },
      esperados: ['NO_APLICA', 'NO_APLICA', 'CREADO', 'CREADO', 'NO_APLICA', 'NO_APLICA'],
    },
    {
      // «GitHub detecta conflictos» → Con conflictos.
      nombre: 'GitHub: conflictos',
      evento: { tipo: 'GITHUB_INFORMA', consulta: { estado: 'ABIERTO', conflictos: true } },
      esperados: [
        'NO_APLICA',
        'NO_APLICA',
        'CON_CONFLICTOS',
        'CON_CONFLICTOS',
        'NO_APLICA',
        'NO_APLICA',
      ],
    },
    {
      // «El PR se fusiona (en GitHub)» → Fusionado.
      nombre: 'GitHub: fusionado',
      evento: { tipo: 'GITHUB_INFORMA', consulta: { estado: 'FUSIONADO' } },
      esperados: ['NO_APLICA', 'NO_APLICA', 'FUSIONADO', 'FUSIONADO', 'NO_APLICA', 'NO_APLICA'],
    },
    {
      // «El PR se cierra sin fusionar (en GitHub)» → Cerrado.
      nombre: 'GitHub: cerrado',
      evento: { tipo: 'GITHUB_INFORMA', consulta: { estado: 'CERRADO' } },
      esperados: ['NO_APLICA', 'NO_APLICA', 'CERRADO', 'CERRADO', 'NO_APLICA', 'NO_APLICA'],
    },
    {
      // «El PR se cierra sin fusionar (desde el sistema)» → Cerrado. FUSIONADO no se cierra.
      nombre: 'cerrado desde el sistema',
      evento: { tipo: 'PR_CERRADO_DESDE_SISTEMA' },
      esperados: ['NO_APLICA', 'NO_APLICA', 'CERRADO', 'CERRADO', 'NO_APLICA', 'NO_APLICA'],
    },
  ];

  for (const { nombre, evento, esperados } of TABLA) {
    it(nombre, () => {
      ESTADOS_PR_CON_NULO.forEach((desde, i) => {
        const esperado = esperados[i];
        // El estado de la tarea no influye en estos eventos: se prueban los 4.
        for (const estado of ESTADOS_TAREA) {
          const resultado = siguienteEstadoPR(tareaEn(estado, desde), evento);
          const caso = `${nombre} desde ${desde} (${estado})`;
          if (esperado === 'NO_APLICA') {
            expect(resultado, caso).toEqual({ aplica: false, codigo: 'ESTADO_PR_NO_APLICA' });
          } else {
            esperarAplica(resultado, esperado, caso);
          }
        }
      });
    });
  }
});

describe('siguienteEstadoPR: REQUIERE_PR_CAMBIADO (C1 y «No requiere PR»)', () => {
  const ACTIVAR: EventoPR = { tipo: 'REQUIERE_PR_CAMBIADO', valor: true };
  const DESACTIVAR: EventoPR = { tipo: 'REQUIERE_PR_CAMBIADO', valor: false };

  it('C1: activar en ESPERANDO_SUPERVISION o TERMINADA con estado_pr null → PENDIENTE', () => {
    for (const estado of ESTADOS_CON_ETIQUETA) {
      const t = tareaEn(estado, null, { requiere_pr: false });
      esperarAplica(siguienteEstadoPR(t, ACTIVAR), 'PENDIENTE', `C1 ${estado}`);
    }
  });

  it('activar antes de llegar deja null: la llegada lo pasará a PENDIENTE', () => {
    for (const estado of ESTADOS_SIN_ETIQUETA) {
      const t = tareaEn(estado, null, { requiere_pr: false });
      esperarAplica(siguienteEstadoPR(t, ACTIVAR), null, estado);
    }
  });

  it('activar con un estado_pr ya calculado no lo cambia', () => {
    for (const estado of ESTADOS_TAREA) {
      for (const estado_pr of ESTADOS_PR_CON_NULO.filter((e) => e !== null)) {
        const t = tareaEn(estado, estado_pr, { requiere_pr: false });
        esperarAplica(siguienteEstadoPR(t, ACTIVAR), estado_pr, `${estado} ${estado_pr}`);
      }
    }
  });

  it('desactivar («No requiere PR») conserva estado_pr en todos los casos (decisión 3)', () => {
    for (const estado of ESTADOS_TAREA) {
      for (const estado_pr of ESTADOS_PR_CON_NULO) {
        const t = tareaEn(estado, estado_pr);
        esperarAplica(siguienteEstadoPR(t, DESACTIVAR), estado_pr, `${estado} ${estado_pr}`);
      }
    }
  });

  it('tras desactivar, la etiqueta desaparece aunque estado_pr siga en PENDIENTE', () => {
    const antes = tareaEn('TERMINADA', 'PENDIENTE');
    const resultado = siguienteEstadoPR(antes, DESACTIVAR);
    esperarAplica(resultado, 'PENDIENTE', 'conserva');
    expect(etiquetaPRVisible({ ...antes, requiere_pr: false })).toBeNull();
  });
});

describe('puedeCrearPullRequest', () => {
  it('Administrador y Supervisor nunca crean el PR (lo crea el practicante)', () => {
    for (const rol of ['ADMINISTRADOR', 'SUPERVISOR'] as const) {
      for (const estado of ESTADOS_TAREA) {
        for (const estado_pr of ESTADOS_PR_CON_NULO) {
          esperarDenegado(
            puedeCrearPullRequest(tareaEn(estado, estado_pr), usuario(rol), contexto()),
            'ROL_NO_PERMITIDO',
            `${rol} ${estado} ${estado_pr}`,
          );
        }
      }
    }
  });

  it('practicante responsable: solo con etiqueta visible y en PENDIENTE o CERRADO', () => {
    const practicante = usuario('PRACTICANTE');
    for (const estado of ESTADOS_CON_ETIQUETA) {
      for (const estado_pr of ESTADOS_PR_CON_NULO) {
        const resultado = puedeCrearPullRequest(
          tareaEn(estado, estado_pr),
          practicante,
          contexto(),
        );
        const caso = `PRACTICANTE ${estado} ${estado_pr}`;
        if (estado_pr === 'PENDIENTE' || estado_pr === 'CERRADO') {
          esperarPermitido(resultado, null, caso);
        } else {
          // no se crea un segundo PR, ni uno sin estado calculado
          esperarDenegado(resultado, 'ESTADO_PR_NO_APLICA', caso);
        }
      }
    }
  });

  it('EN_PROGRESO: sin etiqueta, no se crea aunque el PR esté PENDIENTE o CERRADO (decisión 4)', () => {
    for (const estado_pr of ESTADOS_PR_CON_NULO) {
      esperarDenegado(
        puedeCrearPullRequest(
          tareaEn('EN_PROGRESO', estado_pr),
          usuario('PRACTICANTE'),
          contexto(),
        ),
        'TAREA_SIN_ETIQUETA_PR',
        `EN_PROGRESO ${estado_pr}`,
      );
    }
  });

  it('DISPONIBLE: no hay responsable, así que `puede()` responde primero', () => {
    esperarDenegado(
      puedeCrearPullRequest(tareaEn('DISPONIBLE', 'PENDIENTE'), usuario('PRACTICANTE'), contexto()),
      'NO_ES_EL_RESPONSABLE',
      'DISPONIBLE',
    );
  });

  it('sin Requiere PR → TAREA_NO_REQUIERE_PR', () => {
    for (const estado of ESTADOS_CON_ETIQUETA) {
      const t = tareaEn(estado, 'PENDIENTE', { requiere_pr: false });
      esperarDenegado(
        puedeCrearPullRequest(t, usuario('PRACTICANTE'), contexto()),
        'TAREA_NO_REQUIERE_PR',
        estado,
      );
    }
  });
});

describe('puedeCerrarPullRequest', () => {
  it('los 3 roles: solo con etiqueta visible y en CREADO o CON_CONFLICTOS, con motivo', () => {
    for (const rol of ROLES) {
      for (const estado of ESTADOS_CON_ETIQUETA) {
        for (const estado_pr of ESTADOS_PR_CON_NULO) {
          const resultado = puedeCerrarPullRequest(
            tareaEn(estado, estado_pr),
            usuario(rol),
            contexto(),
          );
          const caso = `${rol} ${estado} ${estado_pr}`;
          if (estado_pr === 'CREADO' || estado_pr === 'CON_CONFLICTOS') {
            esperarPermitido(resultado, 'MOTIVO', caso);
          } else {
            // FUSIONADO no se cierra; CERRADO, PENDIENTE y null no tienen PR abierto
            esperarDenegado(resultado, 'ESTADO_PR_NO_APLICA', caso);
          }
        }
      }
    }
  });

  it('EN_PROGRESO (devuelta o reabierta): sin etiqueta, no se cierra aunque siga CREADO (decisión 4)', () => {
    for (const rol of ROLES) {
      for (const estado_pr of ['CREADO', 'CON_CONFLICTOS'] as const) {
        esperarDenegado(
          puedeCerrarPullRequest(tareaEn('EN_PROGRESO', estado_pr), usuario(rol), contexto(), 'x'),
          'TAREA_SIN_ETIQUETA_PR',
          `${rol} EN_PROGRESO ${estado_pr}`,
        );
      }
    }
  });

  it('DISPONIBLE: Administrador y Supervisor reciben TAREA_SIN_ETIQUETA_PR; el practicante, NO_ES_EL_RESPONSABLE', () => {
    const t = tareaEn('DISPONIBLE', 'PENDIENTE');
    esperarDenegado(
      puedeCerrarPullRequest(t, usuario('ADMINISTRADOR'), contexto(), 'x'),
      'TAREA_SIN_ETIQUETA_PR',
      'ADMINISTRADOR',
    );
    esperarDenegado(
      puedeCerrarPullRequest(t, usuario('SUPERVISOR'), contexto(), 'x'),
      'TAREA_SIN_ETIQUETA_PR',
      'SUPERVISOR',
    );
    esperarDenegado(
      puedeCerrarPullRequest(t, usuario('PRACTICANTE'), contexto(), 'x'),
      'NO_ES_EL_RESPONSABLE',
      'PRACTICANTE',
    );
  });

  it('sin Requiere PR → TAREA_NO_REQUIERE_PR', () => {
    const t = tareaEn('TERMINADA', 'CREADO', { requiere_pr: false });
    for (const rol of ROLES) {
      esperarDenegado(
        puedeCerrarPullRequest(t, usuario(rol), contexto(), 'x'),
        'TAREA_NO_REQUIERE_PR',
        rol,
      );
    }
  });

  it('motivo: ausente queda pendiente; vacío o solo espacios → TEXTO_OBLIGATORIO; con texto, permitido', () => {
    const t = tareaEn('TERMINADA', 'CREADO');
    for (const rol of ROLES) {
      esperarPermitido(
        puedeCerrarPullRequest(t, usuario(rol), contexto()),
        'MOTIVO',
        `${rol} ausente`,
      );
      for (const motivo of ['', '   ']) {
        esperarDenegado(
          puedeCerrarPullRequest(t, usuario(rol), contexto(), motivo),
          TEXTO_OBLIGATORIO,
          `${rol} motivo «${motivo}»`,
        );
      }
      esperarPermitido(
        puedeCerrarPullRequest(t, usuario(rol), contexto(), 'Rama base equivocada'),
        'MOTIVO',
        `${rol} con motivo`,
      );
    }
  });
});

describe('crear y cerrar: alcance, identidad, FINALIZADO e INACTIVO (vienen de `puede()`)', () => {
  const tESPERANDO = (estado_pr: EstadoPR, cambios: Partial<Tarea> = {}) =>
    tareaEn('ESPERANDO_SUPERVISION', estado_pr, cambios);

  it('supervisor ajeno → FUERA_DE_ALCANCE', () => {
    const ctx = contexto({ proyecto: { id_supervisor: IDS.supervisorAjeno } });
    esperarDenegado(
      puedeCerrarPullRequest(tESPERANDO('CREADO'), usuario('SUPERVISOR'), ctx, 'x'),
      'FUERA_DE_ALCANCE',
      'cerrar',
    );
  });

  it('practicante sin asignación o con baja → FUERA_DE_ALCANCE', () => {
    const variantes: [string, Asignacion[]][] = [
      ['sin asignación', []],
      ['con baja', [asignacion({ fecha_baja: '2026-03-01' })]],
    ];
    for (const [nombre, asignaciones] of variantes) {
      const ctx = contexto({ asignaciones });
      esperarDenegado(
        puedeCrearPullRequest(tESPERANDO('PENDIENTE'), usuario('PRACTICANTE'), ctx),
        'FUERA_DE_ALCANCE',
        `crear ${nombre}`,
      );
      esperarDenegado(
        puedeCerrarPullRequest(tESPERANDO('CREADO'), usuario('PRACTICANTE'), ctx, 'x'),
        'FUERA_DE_ALCANCE',
        `cerrar ${nombre}`,
      );
    }
  });

  it('practicante que no es el responsable → NO_ES_EL_RESPONSABLE', () => {
    const ajena = { id_practicante: IDS.practicanteAjeno };
    esperarDenegado(
      puedeCrearPullRequest(tESPERANDO('PENDIENTE', ajena), usuario('PRACTICANTE'), contexto()),
      'NO_ES_EL_RESPONSABLE',
      'crear',
    );
    esperarDenegado(
      puedeCerrarPullRequest(tESPERANDO('CREADO', ajena), usuario('PRACTICANTE'), contexto(), 'x'),
      'NO_ES_EL_RESPONSABLE',
      'cerrar',
    );
  });

  it('proyecto FINALIZADO → PROYECTO_FINALIZADO para los roles que podían', () => {
    const ctx = contexto({ proyecto: { estado: 'FINALIZADO' } });
    esperarDenegado(
      puedeCrearPullRequest(tESPERANDO('PENDIENTE'), usuario('PRACTICANTE'), ctx),
      'PROYECTO_FINALIZADO',
      'crear PRACTICANTE',
    );
    for (const rol of ROLES) {
      esperarDenegado(
        puedeCerrarPullRequest(tESPERANDO('CREADO'), usuario(rol), ctx, 'x'),
        'PROYECTO_FINALIZADO',
        `cerrar ${rol}`,
      );
    }
  });

  it('proyecto EN_PAUSA no bloquea crear ni cerrar el PR', () => {
    const ctx = contexto({ proyecto: { estado: 'EN_PAUSA' } });
    esperarPermitido(
      puedeCrearPullRequest(tESPERANDO('PENDIENTE'), usuario('PRACTICANTE'), ctx),
      null,
      'crear',
    );
    esperarPermitido(
      puedeCerrarPullRequest(tESPERANDO('CREADO'), usuario('SUPERVISOR'), ctx),
      'MOTIVO',
      'cerrar',
    );
  });

  it('usuario INACTIVO → USUARIO_INACTIVO', () => {
    for (const rol of ROLES) {
      const inactivo = usuario(rol, { estado: 'INACTIVO' });
      esperarDenegado(
        puedeCerrarPullRequest(tESPERANDO('CREADO'), inactivo, contexto(), 'x'),
        'USUARIO_INACTIVO',
        `cerrar ${rol}`,
      );
    }
    esperarDenegado(
      puedeCrearPullRequest(
        tESPERANDO('PENDIENTE'),
        usuario('PRACTICANTE', { estado: 'INACTIVO' }),
        contexto(),
      ),
      'USUARIO_INACTIVO',
      'crear PRACTICANTE',
    );
  });
});

describe('orden de comprobación: puede() → estado de la tarea → requiere_pr → estado_pr → texto', () => {
  it('sin alcance gana a todo: no revela el estado del PR', () => {
    const t = tareaEn('ESPERANDO_SUPERVISION', 'FUSIONADO');
    esperarDenegado(
      puedeCerrarPullRequest(t, usuario('PRACTICANTE'), contexto({ asignaciones: [] }), ''),
      'FUERA_DE_ALCANCE',
      'cerrar',
    );
    esperarDenegado(
      puedeCrearPullRequest(t, usuario('PRACTICANTE'), contexto({ asignaciones: [] })),
      'FUERA_DE_ALCANCE',
      'crear',
    );
  });

  it('el estado de la tarea va antes que requiere_pr', () => {
    const t = tareaEn('EN_PROGRESO', 'CREADO', { requiere_pr: false });
    esperarDenegado(
      puedeCerrarPullRequest(t, usuario('SUPERVISOR'), contexto(), 'x'),
      'TAREA_SIN_ETIQUETA_PR',
      'cerrar',
    );
  });

  it('requiere_pr va antes que estado_pr', () => {
    const t = tareaEn('TERMINADA', 'FUSIONADO', { requiere_pr: false });
    esperarDenegado(
      puedeCerrarPullRequest(t, usuario('SUPERVISOR'), contexto(), 'x'),
      'TAREA_NO_REQUIERE_PR',
      'cerrar',
    );
    esperarDenegado(
      puedeCrearPullRequest(t, usuario('PRACTICANTE'), contexto()),
      'TAREA_NO_REQUIERE_PR',
      'crear',
    );
  });

  it('motivo vacío con FUSIONADO → ESTADO_PR_NO_APLICA, no TEXTO_OBLIGATORIO', () => {
    const t = tareaEn('TERMINADA', 'FUSIONADO');
    for (const rol of ROLES) {
      for (const motivo of ['', '   ']) {
        esperarDenegado(
          puedeCerrarPullRequest(t, usuario(rol), contexto(), motivo),
          'ESTADO_PR_NO_APLICA',
          `${rol} motivo «${motivo}»`,
        );
      }
    }
  });
});

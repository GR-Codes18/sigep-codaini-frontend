import { describe, expect, it } from 'vitest';

import type { CodigoEdicion, ResultadoEdicion } from './edicionTarea';
import {
  CODIGOS_EDICION,
  puedeCambiarRequierePR,
  puedeCambiarRequiereSupervision,
  puedeEditarDatosTarea,
  puedeEliminarTarea,
  tuvoPullRequest,
} from './edicionTarea';
import type { EstadoPR, EstadoTarea, Rol } from './enumeraciones';
import { ESTADOS_PR, ESTADOS_TAREA } from './enumeraciones';
import type { Asignacion, Proyecto } from './proyectos';
import { IDS, asignacion, proyecto, tarea, usuario } from './pruebas/fabricas';
import type { Tarea } from './tareas';
import type { ContextoTransicion } from './transiciones';
import { TEXTO_OBLIGATORIO } from './transiciones';

const URL_PR = 'https://github.com/codaini/proyecto-prueba/pull/1';
const ROLES: Rol[] = ['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'];
const CAMPOS_EDITABLES = ['titulo', 'descripcion', 'fecha_limite'] as const;
const ESTADOS_PR_CON_NULO: (EstadoPR | null)[] = [null, ...ESTADOS_PR];

function contexto(
  cambios: { proyecto?: Partial<Proyecto>; asignaciones?: Asignacion[] } = {},
): ContextoTransicion {
  return {
    proyecto: proyecto(cambios.proyecto),
    asignaciones: cambios.asignaciones ?? [asignacion()],
  };
}

function tareaEn(estado: EstadoTarea, cambios: Partial<Tarea> = {}): Tarea {
  return tarea({
    estado,
    id_practicante: estado === 'DISPONIBLE' ? null : IDS.practicante,
    ...cambios,
  });
}

function esperarPermitido(
  resultado: ResultadoEdicion,
  opciones: { avisar?: boolean; exige?: 'MOTIVO' | 'NOTA' | null } = {},
): void {
  expect(resultado).toEqual({
    permitido: true,
    exige_texto: opciones.exige ?? null,
    avisar_responsable: opciones.avisar ?? false,
  });
}

function esperarDenegado(resultado: ResultadoEdicion, codigo: CodigoEdicion): void {
  expect(resultado).toEqual({ permitido: false, codigo });
}

describe('tuvoPullRequest', () => {
  it('es falso mientras la URL sea nula, con cualquier estado_pr', () => {
    for (const estado_pr of ESTADOS_PR_CON_NULO) {
      expect(tuvoPullRequest(tarea({ estado_pr, url_pull_request: null }))).toBe(false);
    }
  });

  it('es verdadero con URL, también si el PR está CERRADO', () => {
    expect(tuvoPullRequest(tarea({ url_pull_request: URL_PR }))).toBe(true);
    expect(tuvoPullRequest(tarea({ estado_pr: 'CERRADO', url_pull_request: URL_PR }))).toBe(true);
  });
});

describe('contrato de edición', () => {
  it('declara los 3 códigos nuevos y reutiliza TEXTO_OBLIGATORIO', () => {
    expect(CODIGOS_EDICION).toEqual([
      'TAREA_NO_EDITABLE',
      'TAREA_YA_TIENE_PR',
      'TAREA_NO_ELIMINABLE',
      TEXTO_OBLIGATORIO,
    ]);
    expect(new Set(CODIGOS_EDICION).size).toBe(4);
  });
});

describe('editar título, descripción y fecha límite', () => {
  // Los tres campos comparten la regla de §6.4; la función no recibe cuál se edita.
  for (const campo of CAMPOS_EDITABLES) {
    it(`${campo}: solo DISPONIBLE y EN_PROGRESO`, () => {
      for (const estado of ESTADOS_TAREA) {
        const resultado = puedeEditarDatosTarea(
          tareaEn(estado),
          usuario('ADMINISTRADOR'),
          contexto(),
        );
        const editable = estado === 'DISPONIBLE' || estado === 'EN_PROGRESO';

        if (editable) {
          esperarPermitido(resultado, { avisar: estado === 'EN_PROGRESO' });
        } else {
          esperarDenegado(resultado, 'TAREA_NO_EDITABLE');
        }
      }
    });
  }

  it('avisa al responsable solo si está EN_PROGRESO y hay responsable', () => {
    esperarPermitido(
      puedeEditarDatosTarea(tareaEn('EN_PROGRESO'), usuario('SUPERVISOR'), contexto()),
      { avisar: true },
    );
    esperarPermitido(
      puedeEditarDatosTarea(
        tareaEn('EN_PROGRESO', { id_practicante: null }),
        usuario('SUPERVISOR'),
        contexto(),
      ),
      { avisar: false },
    );
    esperarPermitido(
      puedeEditarDatosTarea(tareaEn('DISPONIBLE'), usuario('ADMINISTRADOR'), contexto()),
      { avisar: false },
    );
  });

  it('el practicante no edita datos aunque esté asignado', () => {
    esperarDenegado(
      puedeEditarDatosTarea(tareaEn('EN_PROGRESO'), usuario('PRACTICANTE'), contexto()),
      'ROL_NO_PERMITIDO',
    );
  });
});

describe('Requiere supervisión', () => {
  it('solo se cambia en DISPONIBLE y EN_PROGRESO', () => {
    for (const estado of ESTADOS_TAREA) {
      const resultado = puedeCambiarRequiereSupervision(
        tareaEn(estado),
        usuario('ADMINISTRADOR'),
        contexto(),
      );

      if (estado === 'DISPONIBLE' || estado === 'EN_PROGRESO') {
        esperarPermitido(resultado);
      } else {
        esperarDenegado(resultado, 'TAREA_NO_EDITABLE');
      }
    }
  });

  it('el Supervisor del proyecto puede y el practicante no', () => {
    esperarPermitido(
      puedeCambiarRequiereSupervision(tareaEn('EN_PROGRESO'), usuario('SUPERVISOR'), contexto()),
    );
    esperarDenegado(
      puedeCambiarRequiereSupervision(tareaEn('EN_PROGRESO'), usuario('PRACTICANTE'), contexto()),
      'ROL_NO_PERMITIDO',
    );
  });
});

describe('Requiere PR', () => {
  it('no se restringe por el estado de la tarea', () => {
    for (const estado of ESTADOS_TAREA) {
      for (const valor of [true, false]) {
        esperarPermitido(
          puedeCambiarRequierePR(
            tareaEn(estado, { requiere_pr: !valor }),
            usuario('ADMINISTRADOR'),
            contexto(),
            valor,
          ),
        );
      }
    }
  });

  it('en cada combinación estado_pr × URL solo decide la URL', () => {
    for (const estado_pr of ESTADOS_PR_CON_NULO) {
      for (const url_pull_request of [null, URL_PR]) {
        const resultado = puedeCambiarRequierePR(
          tareaEn('TERMINADA', { requiere_pr: false, estado_pr, url_pull_request }),
          usuario('ADMINISTRADOR'),
          contexto(),
          true,
        );

        if (url_pull_request === null) {
          esperarPermitido(resultado);
        } else {
          esperarDenegado(resultado, 'TAREA_YA_TIENE_PR');
        }
      }
    }
  });

  it('el practicante responsable solo desactiva y con motivo', () => {
    const t = tareaEn('EN_PROGRESO', { requiere_pr: true, url_pull_request: null });
    const prac = usuario('PRACTICANTE');

    esperarDenegado(puedeCambiarRequierePR(t, prac, contexto(), true), 'ROL_NO_PERMITIDO');

    esperarPermitido(puedeCambiarRequierePR(t, prac, contexto(), false), { exige: 'MOTIVO' });
    esperarPermitido(puedeCambiarRequierePR(t, prac, contexto(), false, 'motivo'), {
      exige: 'MOTIVO',
    });
    esperarDenegado(puedeCambiarRequierePR(t, prac, contexto(), false, ''), TEXTO_OBLIGATORIO);
    esperarDenegado(puedeCambiarRequierePR(t, prac, contexto(), false, '   '), TEXTO_OBLIGATORIO);
  });

  it('con PR existente, el practicante con motivo vacío recibe TAREA_YA_TIENE_PR', () => {
    const t = tareaEn('EN_PROGRESO', { url_pull_request: URL_PR });
    const prac = usuario('PRACTICANTE');

    esperarDenegado(puedeCambiarRequierePR(t, prac, contexto(), false, ''), 'TAREA_YA_TIENE_PR');
    esperarDenegado(puedeCambiarRequierePR(t, prac, contexto(), false, '   '), 'TAREA_YA_TIENE_PR');
  });

  it('con PR existente, el practicante recibe TAREA_YA_TIENE_PR antes que el motivo', () => {
    const t = tareaEn('EN_PROGRESO', { requiere_pr: true, url_pull_request: URL_PR });

    esperarDenegado(
      puedeCambiarRequierePR(t, usuario('PRACTICANTE'), contexto(), false),
      'TAREA_YA_TIENE_PR',
    );
  });

  it('el Supervisor del proyecto puede activar y desactivar sin motivo', () => {
    const t = tareaEn('EN_PROGRESO', { requiere_pr: true, url_pull_request: null });

    esperarPermitido(puedeCambiarRequierePR(t, usuario('SUPERVISOR'), contexto(), false));
    esperarPermitido(puedeCambiarRequierePR(t, usuario('SUPERVISOR'), contexto(), true));
  });

  it('C1: el Administrador y el Supervisor activan en TERMINADA con URL nula', () => {
    // Riesgo aceptado: §4 no restringe «Requiere PR» por estado. El paso 5 lo dejará PENDIENTE.
    const t = tareaEn('TERMINADA', { requiere_pr: false, estado_pr: null, url_pull_request: null });

    esperarPermitido(puedeCambiarRequierePR(t, usuario('ADMINISTRADOR'), contexto(), true));
    esperarPermitido(puedeCambiarRequierePR(t, usuario('SUPERVISOR'), contexto(), true));
  });

  it('alcance: supervisor ajeno y practicante sin asignación o con baja', () => {
    const t = tareaEn('EN_PROGRESO', { requiere_pr: true, url_pull_request: null });

    esperarDenegado(
      puedeCambiarRequierePR(
        t,
        usuario('SUPERVISOR'),
        contexto({ proyecto: { id_supervisor: IDS.supervisorAjeno } }),
        false,
      ),
      'FUERA_DE_ALCANCE',
    );
    esperarDenegado(
      puedeCambiarRequierePR(t, usuario('PRACTICANTE'), contexto({ asignaciones: [] }), false),
      'FUERA_DE_ALCANCE',
    );
    esperarDenegado(
      puedeCambiarRequierePR(
        t,
        usuario('PRACTICANTE'),
        contexto({ asignaciones: [asignacion({ fecha_baja: '2026-04-30' })] }),
        false,
      ),
      'FUERA_DE_ALCANCE',
    );
  });

  it('el practicante asignado que no es responsable recibe NO_ES_EL_RESPONSABLE', () => {
    const t = tareaEn('EN_PROGRESO', {
      id_practicante: IDS.practicanteAjeno,
      requiere_pr: true,
      url_pull_request: null,
    });

    esperarDenegado(
      puedeCambiarRequierePR(t, usuario('PRACTICANTE'), contexto(), false),
      'NO_ES_EL_RESPONSABLE',
    );
  });
});

describe('eliminar tarea', () => {
  it('DISPONIBLE + estado_pr PENDIENTE + URL nula se puede eliminar', () => {
    const t = tareaEn('DISPONIBLE', { estado_pr: 'PENDIENTE', url_pull_request: null });

    esperarPermitido(puedeEliminarTarea(t, usuario('ADMINISTRADOR'), contexto(), 'error'), {
      exige: 'MOTIVO',
    });
  });

  it('exige motivo no vacío', () => {
    const t = tareaEn('DISPONIBLE', { url_pull_request: null });

    esperarPermitido(puedeEliminarTarea(t, usuario('ADMINISTRADOR'), contexto()), {
      exige: 'MOTIVO',
    });
    esperarDenegado(
      puedeEliminarTarea(t, usuario('ADMINISTRADOR'), contexto(), ''),
      TEXTO_OBLIGATORIO,
    );
    esperarDenegado(
      puedeEliminarTarea(t, usuario('ADMINISTRADOR'), contexto(), '   '),
      TEXTO_OBLIGATORIO,
    );
    esperarPermitido(
      puedeEliminarTarea(t, usuario('ADMINISTRADOR'), contexto(), 'ya no hace falta'),
      { exige: 'MOTIVO' },
    );
  });

  it('con PR no se elimina', () => {
    const t = tareaEn('DISPONIBLE', { url_pull_request: URL_PR });

    esperarDenegado(
      puedeEliminarTarea(t, usuario('ADMINISTRADOR'), contexto(), 'motivo'),
      'TAREA_YA_TIENE_PR',
    );
  });

  it('con PR, motivo vacío en DISPONIBLE responde TAREA_YA_TIENE_PR', () => {
    const t = tareaEn('DISPONIBLE', { url_pull_request: URL_PR });
    const admin = usuario('ADMINISTRADOR');

    esperarDenegado(puedeEliminarTarea(t, admin, contexto(), ''), 'TAREA_YA_TIENE_PR');
    esperarDenegado(puedeEliminarTarea(t, admin, contexto(), '   '), 'TAREA_YA_TIENE_PR');
  });

  it('el estado manda sobre el PR: cualquier otro estado es TAREA_NO_ELIMINABLE', () => {
    for (const estado of ['EN_PROGRESO', 'ESPERANDO_SUPERVISION', 'TERMINADA'] as const) {
      for (const url_pull_request of [null, URL_PR]) {
        esperarDenegado(
          puedeEliminarTarea(
            tareaEn(estado, { url_pull_request }),
            usuario('ADMINISTRADOR'),
            contexto(),
            'motivo',
          ),
          'TAREA_NO_ELIMINABLE',
        );
      }
    }
  });

  it('el Supervisor del proyecto puede y el practicante no', () => {
    const t = tareaEn('DISPONIBLE', { url_pull_request: null });

    esperarPermitido(puedeEliminarTarea(t, usuario('SUPERVISOR'), contexto(), 'motivo'), {
      exige: 'MOTIVO',
    });
    esperarDenegado(
      puedeEliminarTarea(t, usuario('PRACTICANTE'), contexto(), 'motivo'),
      'ROL_NO_PERMITIDO',
    );
  });

  it('el supervisor ajeno recibe FUERA_DE_ALCANCE', () => {
    esperarDenegado(
      puedeEliminarTarea(
        tareaEn('DISPONIBLE', { url_pull_request: null }),
        usuario('SUPERVISOR'),
        contexto({ proyecto: { id_supervisor: IDS.supervisorAjeno } }),
        'motivo',
      ),
      'FUERA_DE_ALCANCE',
    );
  });
});

describe('orden de comprobación', () => {
  it('puede() antes que el estado: supervisor ajeno en TERMINADA recibe FUERA_DE_ALCANCE', () => {
    esperarDenegado(
      puedeEditarDatosTarea(
        tareaEn('TERMINADA'),
        usuario('SUPERVISOR'),
        contexto({ proyecto: { id_supervisor: IDS.supervisorAjeno } }),
      ),
      'FUERA_DE_ALCANCE',
    );
  });

  it('puede() antes que la condición: practicante sin asignación con PR recibe FUERA_DE_ALCANCE', () => {
    const t = tareaEn('EN_PROGRESO', { requiere_pr: true, url_pull_request: URL_PR });

    esperarDenegado(
      puedeCambiarRequierePR(t, usuario('PRACTICANTE'), contexto({ asignaciones: [] }), false),
      'FUERA_DE_ALCANCE',
    );
  });

  it('estado antes que condición: TERMINADA con PR al eliminar responde TAREA_NO_ELIMINABLE', () => {
    esperarDenegado(
      puedeEliminarTarea(
        tareaEn('TERMINADA', { url_pull_request: URL_PR }),
        usuario('ADMINISTRADOR'),
        contexto(),
        'motivo',
      ),
      'TAREA_NO_ELIMINABLE',
    );
  });

  it('condición antes que texto: DISPONIBLE con PR y sin motivo responde TAREA_YA_TIENE_PR', () => {
    esperarDenegado(
      puedeEliminarTarea(
        tareaEn('DISPONIBLE', { url_pull_request: URL_PR }),
        usuario('ADMINISTRADOR'),
        contexto(),
      ),
      'TAREA_YA_TIENE_PR',
    );
  });

  it('INACTIVO manda sobre todo', () => {
    const inactivo = usuario('ADMINISTRADOR', { estado: 'INACTIVO' });

    esperarDenegado(
      puedeEliminarTarea(tareaEn('TERMINADA', { url_pull_request: URL_PR }), inactivo, contexto()),
      'USUARIO_INACTIVO',
    );
  });
});

describe('proyecto FINALIZADO', () => {
  it('deniega las cuatro reglas con PROYECTO_FINALIZADO', () => {
    const ctx = contexto({ proyecto: { estado: 'FINALIZADO' } });
    const admin = usuario('ADMINISTRADOR');

    esperarDenegado(
      puedeEditarDatosTarea(tareaEn('EN_PROGRESO'), admin, ctx),
      'PROYECTO_FINALIZADO',
    );
    esperarDenegado(
      puedeCambiarRequiereSupervision(tareaEn('EN_PROGRESO'), admin, ctx),
      'PROYECTO_FINALIZADO',
    );
    esperarDenegado(
      puedeCambiarRequierePR(
        tareaEn('EN_PROGRESO', { requiere_pr: true, url_pull_request: null }),
        admin,
        ctx,
        false,
      ),
      'PROYECTO_FINALIZADO',
    );
    esperarDenegado(
      puedeEliminarTarea(tareaEn('DISPONIBLE', { url_pull_request: null }), admin, ctx, 'motivo'),
      'PROYECTO_FINALIZADO',
    );
  });
});

describe('usuario INACTIVO', () => {
  it('ninguna regla permite nada, para ningún rol', () => {
    for (const rol of ROLES) {
      const inactivo = usuario(rol, { estado: 'INACTIVO' });
      const ctx = contexto();

      esperarDenegado(
        puedeEditarDatosTarea(tareaEn('EN_PROGRESO'), inactivo, ctx),
        'USUARIO_INACTIVO',
      );
      esperarDenegado(
        puedeCambiarRequiereSupervision(tareaEn('EN_PROGRESO'), inactivo, ctx),
        'USUARIO_INACTIVO',
      );
      esperarDenegado(
        puedeCambiarRequierePR(
          tareaEn('EN_PROGRESO', { requiere_pr: true, url_pull_request: null }),
          inactivo,
          ctx,
          false,
        ),
        'USUARIO_INACTIVO',
      );
      esperarDenegado(
        puedeEliminarTarea(
          tareaEn('DISPONIBLE', { url_pull_request: null }),
          inactivo,
          ctx,
          'motivo',
        ),
        'USUARIO_INACTIVO',
      );
    }
  });
});

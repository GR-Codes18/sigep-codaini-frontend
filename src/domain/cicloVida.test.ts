import { describe, expect, it } from 'vitest';

import {
  CODIGOS_CICLO_VIDA,
  desactivarSupervisor,
  finalizarPractica,
  finalizarProyecto,
  puedeAsignarPracticante,
  puedeCambiarSupervisor,
  puedeQuitarPracticante,
} from './cicloVida';
import type { DatosFinalizarPractica } from './cicloVida';
import type { Id } from './comunes';
import type { Asignacion, Proyecto } from './proyectos';
import type { Tarea } from './tareas';
import { IDS, asignacion, proyecto, tarea, usuario } from './pruebas/fabricas';

/** 15:00 en hora de Perú: `hoy` es el 16 de noviembre. */
const AHORA = '2026-11-16T20:00:00.000Z';
const HOY = '2026-11-16';
/** 22:00 del 15 en Perú (03:00 UTC del 16): `hoy` todavía es el 15. */
const AHORA_PERU_AYER = '2026-11-16T03:00:00.000Z';

const ADMIN = usuario('ADMINISTRADOR');
const ADMIN_INACTIVO = usuario('ADMINISTRADOR', { estado: 'INACTIVO' });
const SUP = usuario('SUPERVISOR');
const PRAC = usuario('PRACTICANTE');

const MOTIVO = { motivo: 'Término de ciclo' };
const NOTA = { nota: 'El proyecto terminó' };

const P1 = proyecto({ id: 'p-1', codigo: 'UNO', id_supervisor: IDS.supervisor });
const P2 = proyecto({ id: 'p-2', codigo: 'DOS', id_supervisor: 'u-sup-2' });

function asig(id: Id, idProyecto: Id, cambios: Partial<Asignacion> = {}): Asignacion {
  return asignacion({ id, id_proyecto: idProyecto, id_practicante: IDS.practicante, ...cambios });
}

function enCurso(id: Id, idProyecto: Id, cambios: Partial<Tarea> = {}): Tarea {
  return tarea({
    id,
    id_proyecto: idProyecto,
    id_practicante: IDS.practicante,
    estado: 'EN_PROGRESO',
    ...cambios,
  });
}

function datosPractica(cambios: Partial<DatosFinalizarPractica> = {}): DatosFinalizarPractica {
  return { proyectos: [P1, P2], asignaciones: [], tareas: [], ...cambios };
}

function conEstado(p: Proyecto, estado: Proyecto['estado']): Proyecto {
  return { ...p, estado };
}

describe('finalizar práctica', () => {
  it('FP-1 da baja a sus asignaciones vigentes y libera solo sus tareas EN_PROGRESO (no ESPERANDO, TERMINADA ni ajenas)', () => {
    const datos = datosPractica({
      asignaciones: [
        asig('a-1', 'p-1'),
        asig('a-2', 'p-2'),
        asignacion({ id: 'a-3', id_practicante: 'u-otro', id_proyecto: 'p-1' }),
      ],
      tareas: [
        enCurso('t1', 'p-1'),
        enCurso('t2', 'p-2'),
        enCurso('t3', 'p-1', { estado: 'ESPERANDO_SUPERVISION' }),
        enCurso('t4', 'p-1', { estado: 'TERMINADA', fecha_termino: '2026-11-10T15:00:00.000Z' }),
        enCurso('t5', 'p-1', { id_practicante: 'u-otro' }),
        tarea({ id: 't6', id_proyecto: 'p-1', id_practicante: null, estado: 'DISPONIBLE' }),
      ],
    });
    expect(finalizarPractica(ADMIN, PRAC, datos, AHORA, MOTIVO)).toEqual({
      ok: true,
      exige_texto: 'MOTIVO',
      efectos: {
        asignaciones_a_cerrar: ['a-1', 'a-2'],
        fecha_baja: HOY,
        tareas_a_liberar: ['t1', 't2'],
        supervisores_a_avisar: [IDS.supervisor, 'u-sup-2'],
      },
    });
    // La fecha de baja es la de Perú: a las 22:00 del 15 todavía es el 15.
    expect(finalizarPractica(ADMIN, PRAC, datos, AHORA_PERU_AYER, MOTIVO)).toMatchObject({
      ok: true,
      efectos: { fecha_baja: '2026-11-15' },
    });
  });

  it('FP-2 una asignación que ya tiene baja no se cierra de nuevo; la de un proyecto FINALIZADO sí', () => {
    const finalizado = proyecto({ id: 'p-fin', codigo: 'FIN', estado: 'FINALIZADO' });
    const resultado = finalizarPractica(
      ADMIN,
      PRAC,
      datosPractica({
        proyectos: [P1, finalizado],
        asignaciones: [asig('a-1', 'p-1', { fecha_baja: '2026-10-01' }), asig('a-fin', 'p-fin')],
      }),
      AHORA,
      MOTIVO,
    );
    expect(resultado).toMatchObject({ ok: true, efectos: { asignaciones_a_cerrar: ['a-fin'] } });
  });

  it('FP-3 avisa una sola vez a cada supervisor y solo si en su proyecto se liberó alguna tarea', () => {
    const resultado = finalizarPractica(
      ADMIN,
      PRAC,
      datosPractica({
        asignaciones: [asig('a-1', 'p-1'), asig('a-2', 'p-2')],
        tareas: [enCurso('t1', 'p-1'), enCurso('t2', 'p-1')],
      }),
      AHORA,
      MOTIVO,
    );
    expect(resultado).toMatchObject({
      ok: true,
      efectos: { tareas_a_liberar: ['t1', 't2'], supervisores_a_avisar: [IDS.supervisor] },
    });
  });

  it('FP-4 sin motivo todavía queda permitido, pide MOTIVO y trae los efectos para el aviso previo', () => {
    const resultado = finalizarPractica(
      ADMIN,
      PRAC,
      datosPractica({ asignaciones: [asig('a-1', 'p-1')], tareas: [enCurso('t1', 'p-1')] }),
      AHORA,
    );
    expect(resultado).toMatchObject({
      ok: true,
      exige_texto: 'MOTIVO',
      efectos: { tareas_a_liberar: ['t1'] },
    });
  });

  it('FP-5 un motivo vacío o solo espacios devuelve TEXTO_OBLIGATORIO', () => {
    for (const texto of [{ motivo: '' }, { motivo: '   ' }]) {
      expect(finalizarPractica(ADMIN, PRAC, datosPractica(), AHORA, texto)).toEqual({
        ok: false,
        codigo: 'TEXTO_OBLIGATORIO',
      });
    }
  });

  it('FP-6 el Supervisor y el Practicante no pueden finalizar una práctica (ROL_NO_PERMITIDO)', () => {
    for (const actor of [SUP, PRAC]) {
      expect(finalizarPractica(actor, PRAC, datosPractica(), AHORA, MOTIVO)).toEqual({
        ok: false,
        codigo: 'ROL_NO_PERMITIDO',
      });
    }
  });

  it('FP-7 un Administrador INACTIVO no puede finalizar una práctica (USUARIO_INACTIVO)', () => {
    expect(finalizarPractica(ADMIN_INACTIVO, PRAC, datosPractica(), AHORA, MOTIVO)).toEqual({
      ok: false,
      codigo: 'USUARIO_INACTIVO',
    });
  });

  it('FP-8 si la persona no es practicante devuelve FUERA_DE_ALCANCE', () => {
    for (const objetivo of [usuario('SUPERVISOR'), ADMIN]) {
      expect(finalizarPractica(ADMIN, objetivo, datosPractica(), AHORA, MOTIVO)).toEqual({
        ok: false,
        codigo: 'FUERA_DE_ALCANCE',
      });
    }
  });

  it('FP-9 un practicante ya finalizado devuelve PRACTICANTE_YA_FINALIZADO, antes de mirar el motivo', () => {
    const finalizado = usuario('PRACTICANTE', { estado: 'INACTIVO' });
    for (const texto of [MOTIVO, { motivo: '' }, undefined]) {
      expect(finalizarPractica(ADMIN, finalizado, datosPractica(), AHORA, texto)).toEqual({
        ok: false,
        codigo: 'PRACTICANTE_YA_FINALIZADO',
      });
    }
  });

  it('FP-10 un ahora que no es ISO UTC con Z devuelve AHORA_INVALIDO, aunque quien actúa no tenga permiso', () => {
    for (const ahora of ['2026-11-16T20:00:00', '2026-11-16', 'ayer', '']) {
      expect(finalizarPractica(SUP, PRAC, datosPractica(), ahora, MOTIVO)).toEqual({
        ok: false,
        codigo: 'AHORA_INVALIDO',
      });
    }
  });

  it('FP-11 no modifica los datos que recibe (listas desordenadas y congeladas)', () => {
    const datos = datosPractica({
      proyectos: [P2, P1],
      asignaciones: [asig('a-2', 'p-2'), asig('a-1', 'p-1')],
      tareas: [enCurso('t2', 'p-2'), enCurso('t1', 'p-1')],
    });
    const copia = JSON.parse(JSON.stringify(datos)) as DatosFinalizarPractica;
    Object.freeze(datos.proyectos);
    Object.freeze(datos.asignaciones);
    Object.freeze(datos.tareas);
    finalizarPractica(ADMIN, PRAC, datos, AHORA, MOTIVO);
    expect(datos).toEqual(copia);
  });
});

describe('finalizar proyecto', () => {
  it('PY-1 libera las EN_PROGRESO del proyecto, fija la fecha real y no trae nada sobre asignaciones', () => {
    const resultado = finalizarProyecto(
      ADMIN,
      P1,
      [
        enCurso('a', 'p-1'),
        enCurso('b', 'p-1'),
        tarea({ id: 'c', id_proyecto: 'p-1', id_practicante: null, estado: 'DISPONIBLE' }),
        enCurso('d', 'p-1', { estado: 'TERMINADA', fecha_termino: '2026-11-10T15:00:00.000Z' }),
        enCurso('e', 'p-2'),
      ],
      AHORA,
      NOTA,
    );
    expect(resultado).toEqual({
      ok: true,
      exige_texto: 'NOTA',
      efectos: { tareas_a_liberar: ['a', 'b'], fecha_fin_real: HOY },
    });
    expect(Object.keys(resultado.ok ? resultado.efectos : {})).toEqual([
      'tareas_a_liberar',
      'fecha_fin_real',
    ]);
  });

  it('PY-2 con tareas ESPERANDO_SUPERVISION se bloquea y dice cuántas son', () => {
    const tareas = [
      enCurso('a', 'p-1', { estado: 'ESPERANDO_SUPERVISION' }),
      enCurso('b', 'p-1', { estado: 'ESPERANDO_SUPERVISION' }),
      enCurso('c', 'p-1'),
    ];
    expect(finalizarProyecto(ADMIN, P1, tareas, AHORA, NOTA)).toEqual({
      ok: false,
      codigo: 'TAREAS_ESPERANDO_SUPERVISION',
      cantidad: 2,
    });
  });

  it('PY-3 las tareas esperando supervisión de otro proyecto no lo bloquean', () => {
    const tareas = [enCurso('a', 'p-1'), enCurso('b', 'p-2', { estado: 'ESPERANDO_SUPERVISION' })];
    expect(finalizarProyecto(ADMIN, P1, tareas, AHORA, NOTA)).toMatchObject({
      ok: true,
      efectos: { tareas_a_liberar: ['a'] },
    });
  });

  it('PY-4 se puede finalizar desde ACTIVO y desde EN_PAUSA', () => {
    for (const estado of ['ACTIVO', 'EN_PAUSA'] as const) {
      expect(finalizarProyecto(ADMIN, conEstado(P1, estado), [], AHORA, NOTA)).toMatchObject({
        ok: true,
      });
    }
  });

  it('PY-5 un proyecto ya FINALIZADO devuelve PROYECTO_YA_FINALIZADO', () => {
    expect(finalizarProyecto(ADMIN, conEstado(P1, 'FINALIZADO'), [], AHORA, NOTA)).toEqual({
      ok: false,
      codigo: 'PROYECTO_YA_FINALIZADO',
    });
  });

  it('PY-6 sin nota todavía queda permitido, pide NOTA y trae los efectos', () => {
    expect(finalizarProyecto(ADMIN, P1, [enCurso('a', 'p-1')], AHORA)).toMatchObject({
      ok: true,
      exige_texto: 'NOTA',
      efectos: { tareas_a_liberar: ['a'] },
    });
  });

  it('PY-7 una nota vacía o solo espacios devuelve TEXTO_OBLIGATORIO', () => {
    for (const texto of [{ nota: '' }, { nota: '   ' }]) {
      expect(finalizarProyecto(ADMIN, P1, [], AHORA, texto)).toEqual({
        ok: false,
        codigo: 'TEXTO_OBLIGATORIO',
      });
    }
  });

  it('PY-8 orden: con tareas esperando y la nota vacía gana el bloqueo, no el texto', () => {
    const tareas = [enCurso('a', 'p-1', { estado: 'ESPERANDO_SUPERVISION' })];
    expect(finalizarProyecto(ADMIN, P1, tareas, AHORA, { nota: '' })).toEqual({
      ok: false,
      codigo: 'TAREAS_ESPERANDO_SUPERVISION',
      cantidad: 1,
    });
  });

  it('PY-9 el Supervisor (aun del proyecto) y el Practicante no pueden; un Administrador INACTIVO tampoco', () => {
    for (const actor of [SUP, PRAC]) {
      expect(finalizarProyecto(actor, P1, [], AHORA, NOTA)).toEqual({
        ok: false,
        codigo: 'ROL_NO_PERMITIDO',
      });
    }
    expect(finalizarProyecto(ADMIN_INACTIVO, P1, [], AHORA, NOTA)).toEqual({
      ok: false,
      codigo: 'USUARIO_INACTIVO',
    });
  });

  it('PY-10 la fecha real es la de Perú, y un ahora inválido devuelve AHORA_INVALIDO', () => {
    expect(finalizarProyecto(ADMIN, P1, [], AHORA_PERU_AYER, NOTA)).toMatchObject({
      ok: true,
      efectos: { fecha_fin_real: '2026-11-15' },
    });
    expect(finalizarProyecto(ADMIN, P1, [], 'ayer', NOTA)).toEqual({
      ok: false,
      codigo: 'AHORA_INVALIDO',
    });
  });
});

describe('desactivar supervisor', () => {
  const delSup = (id: Id, estado: Proyecto['estado']) =>
    proyecto({ id, codigo: id.toUpperCase().slice(0, 5), estado, id_supervisor: IDS.supervisor });

  it('DS-1 sin proyectos a su cargo se puede desactivar y no exige texto', () => {
    expect(desactivarSupervisor(ADMIN, SUP, [])).toEqual({ ok: true, exige_texto: null });
  });

  it('DS-2 con proyectos ACTIVO se bloquea y dice cuántos son', () => {
    expect(
      desactivarSupervisor(ADMIN, SUP, [delSup('pa', 'ACTIVO'), delSup('pb', 'ACTIVO')]),
    ).toEqual({ ok: false, codigo: 'SUPERVISOR_CON_PROYECTOS', cantidad: 2 });
  });

  it('DS-3 un proyecto EN_PAUSA también cuenta', () => {
    expect(desactivarSupervisor(ADMIN, SUP, [delSup('pa', 'EN_PAUSA')])).toEqual({
      ok: false,
      codigo: 'SUPERVISOR_CON_PROYECTOS',
      cantidad: 1,
    });
  });

  it('DS-4 los proyectos FINALIZADO y los de otro supervisor no cuentan', () => {
    expect(desactivarSupervisor(ADMIN, SUP, [delSup('pa', 'FINALIZADO'), P2])).toEqual({
      ok: true,
      exige_texto: null,
    });
  });

  it('DS-5 un supervisor que ya está INACTIVO devuelve SUPERVISOR_YA_INACTIVO, antes de contar proyectos', () => {
    const inactivo = usuario('SUPERVISOR', { estado: 'INACTIVO' });
    expect(desactivarSupervisor(ADMIN, inactivo, [delSup('pa', 'ACTIVO')])).toEqual({
      ok: false,
      codigo: 'SUPERVISOR_YA_INACTIVO',
    });
  });

  it('DS-6 si la persona no es supervisor devuelve FUERA_DE_ALCANCE', () => {
    for (const objetivo of [PRAC, ADMIN]) {
      expect(desactivarSupervisor(ADMIN, objetivo, [])).toEqual({
        ok: false,
        codigo: 'FUERA_DE_ALCANCE',
      });
    }
  });

  it('DS-7 el Supervisor y el Practicante no pueden; un Administrador INACTIVO tampoco', () => {
    for (const actor of [SUP, PRAC]) {
      expect(desactivarSupervisor(actor, SUP, [])).toEqual({
        ok: false,
        codigo: 'ROL_NO_PERMITIDO',
      });
    }
    expect(desactivarSupervisor(ADMIN_INACTIVO, SUP, [])).toEqual({
      ok: false,
      codigo: 'USUARIO_INACTIVO',
    });
  });
});

describe('asignar practicante', () => {
  it('AS-1 se puede en un proyecto ACTIVO o EN_PAUSA, también si ya estuvo y tiene baja', () => {
    for (const estado of ['ACTIVO', 'EN_PAUSA'] as const) {
      expect(puedeAsignarPracticante(ADMIN, conEstado(P1, estado), PRAC, [])).toEqual({
        ok: true,
        exige_texto: null,
      });
    }
    const conBaja = [asig('a-1', 'p-1', { fecha_baja: '2026-10-01' })];
    expect(puedeAsignarPracticante(ADMIN, P1, PRAC, conBaja)).toEqual({
      ok: true,
      exige_texto: null,
    });
  });

  it('AS-2 en un proyecto FINALIZADO devuelve PROYECTO_FINALIZADO (se reactiva antes)', () => {
    expect(puedeAsignarPracticante(ADMIN, conEstado(P1, 'FINALIZADO'), PRAC, [])).toEqual({
      ok: false,
      codigo: 'PROYECTO_FINALIZADO',
    });
  });

  it('AS-3 un practicante finalizado o que no es practicante devuelve PRACTICANTE_NO_ACTIVO', () => {
    const finalizado = usuario('PRACTICANTE', { estado: 'INACTIVO' });
    for (const persona of [finalizado, SUP]) {
      expect(puedeAsignarPracticante(ADMIN, P1, persona, [])).toEqual({
        ok: false,
        codigo: 'PRACTICANTE_NO_ACTIVO',
      });
    }
  });

  it('AS-4 si ya tiene asignación vigente en ese proyecto devuelve ASIGNACION_VIGENTE_EXISTENTE', () => {
    expect(puedeAsignarPracticante(ADMIN, P1, PRAC, [asig('a-1', 'p-1')])).toEqual({
      ok: false,
      codigo: 'ASIGNACION_VIGENTE_EXISTENTE',
    });
    // Una asignación vigente en otro proyecto, o de otro practicante, no lo impide.
    const otras = [asig('a-2', 'p-2'), asig('a-3', 'p-1', { id_practicante: 'u-otro' })];
    expect(puedeAsignarPracticante(ADMIN, P1, PRAC, otras)).toEqual({
      ok: true,
      exige_texto: null,
    });
  });

  it('AS-5 el Supervisor (aun del proyecto) y el Practicante no pueden; un Administrador INACTIVO tampoco; FINALIZADO va antes que el estado del practicante', () => {
    for (const actor of [SUP, PRAC]) {
      expect(puedeAsignarPracticante(actor, P1, PRAC, [])).toEqual({
        ok: false,
        codigo: 'ROL_NO_PERMITIDO',
      });
    }
    expect(puedeAsignarPracticante(ADMIN_INACTIVO, P1, PRAC, [])).toEqual({
      ok: false,
      codigo: 'USUARIO_INACTIVO',
    });
    const finalizado = usuario('PRACTICANTE', { estado: 'INACTIVO' });
    expect(puedeAsignarPracticante(ADMIN, conEstado(P1, 'FINALIZADO'), finalizado, [])).toEqual({
      ok: false,
      codigo: 'PROYECTO_FINALIZADO',
    });
  });
});

describe('quitar practicante', () => {
  it('QU-1 cierra su asignación y libera solo sus tareas EN_PROGRESO de ese proyecto', () => {
    const tareas = [
      enCurso('t1', 'p-1'),
      enCurso('t2', 'p-2'),
      enCurso('t3', 'p-1', { estado: 'ESPERANDO_SUPERVISION' }),
      enCurso('t4', 'p-1', { id_practicante: 'u-otro' }),
    ];
    expect(
      puedeQuitarPracticante(ADMIN, P1, IDS.practicante, [asig('a-1', 'p-1')], tareas),
    ).toEqual({
      ok: true,
      exige_texto: null,
      efectos: { asignacion_a_cerrar: 'a-1', tareas_a_liberar: ['t1'] },
    });
  });

  it('QU-2 en un proyecto FINALIZADO devuelve PROYECTO_FINALIZADO', () => {
    expect(
      puedeQuitarPracticante(
        ADMIN,
        conEstado(P1, 'FINALIZADO'),
        IDS.practicante,
        [asig('a-1', 'p-1')],
        [],
      ),
    ).toEqual({ ok: false, codigo: 'PROYECTO_FINALIZADO' });
  });

  it('QU-3 sin asignación vigente en ese proyecto (ninguna, con baja o en otro proyecto) devuelve ASIGNACION_NO_VIGENTE', () => {
    const sinVigente = [
      [],
      [asig('a-1', 'p-1', { fecha_baja: '2026-10-01' })],
      [asig('a-2', 'p-2')],
    ];
    for (const asignaciones of sinVigente) {
      expect(puedeQuitarPracticante(ADMIN, P1, IDS.practicante, asignaciones, [])).toEqual({
        ok: false,
        codigo: 'ASIGNACION_NO_VIGENTE',
      });
    }
  });

  it('QU-4 el Supervisor (aun del proyecto) y el Practicante no pueden; un Administrador INACTIVO tampoco', () => {
    for (const actor of [SUP, PRAC]) {
      expect(puedeQuitarPracticante(actor, P1, IDS.practicante, [asig('a-1', 'p-1')], [])).toEqual({
        ok: false,
        codigo: 'ROL_NO_PERMITIDO',
      });
    }
    expect(
      puedeQuitarPracticante(ADMIN_INACTIVO, P1, IDS.practicante, [asig('a-1', 'p-1')], []),
    ).toEqual({ ok: false, codigo: 'USUARIO_INACTIVO' });
  });
});

describe('cambiar supervisor', () => {
  const NUEVO = usuario('SUPERVISOR', { id: 'u-sup-2', nombre: 'Otro Supervisor' });

  it('CS-1 un supervisor ACTIVO y distinto del actual es válido', () => {
    expect(puedeCambiarSupervisor(ADMIN, P1, NUEVO)).toEqual({ ok: true, exige_texto: null });
  });

  it('CS-2 en un proyecto FINALIZADO devuelve PROYECTO_FINALIZADO', () => {
    expect(puedeCambiarSupervisor(ADMIN, conEstado(P1, 'FINALIZADO'), NUEVO)).toEqual({
      ok: false,
      codigo: 'PROYECTO_FINALIZADO',
    });
  });

  it('CS-3 un supervisor INACTIVO o una persona que no es supervisor devuelve SUPERVISOR_NO_VALIDO', () => {
    const inactivo = usuario('SUPERVISOR', { id: 'u-sup-3', estado: 'INACTIVO' });
    for (const nuevo of [inactivo, PRAC, ADMIN]) {
      expect(puedeCambiarSupervisor(ADMIN, P1, nuevo)).toEqual({
        ok: false,
        codigo: 'SUPERVISOR_NO_VALIDO',
      });
    }
  });

  it('CS-4 el mismo supervisor que ya tiene el proyecto devuelve MISMO_SUPERVISOR', () => {
    expect(puedeCambiarSupervisor(ADMIN, P1, SUP)).toEqual({
      ok: false,
      codigo: 'MISMO_SUPERVISOR',
    });
  });

  it('CS-5 el Supervisor (aun del proyecto) y el Practicante no pueden; un Administrador INACTIVO tampoco; FINALIZADO va antes que el supervisor nuevo', () => {
    for (const actor of [SUP, PRAC]) {
      expect(puedeCambiarSupervisor(actor, P1, NUEVO)).toEqual({
        ok: false,
        codigo: 'ROL_NO_PERMITIDO',
      });
    }
    expect(puedeCambiarSupervisor(ADMIN_INACTIVO, P1, NUEVO)).toEqual({
      ok: false,
      codigo: 'USUARIO_INACTIVO',
    });
    expect(puedeCambiarSupervisor(ADMIN, conEstado(P1, 'FINALIZADO'), PRAC)).toEqual({
      ok: false,
      codigo: 'PROYECTO_FINALIZADO',
    });
    expect(CODIGOS_CICLO_VIDA).toHaveLength(11);
  });
});

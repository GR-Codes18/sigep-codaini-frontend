import { describe, expect, it } from 'vitest';

import {
  TERMINADAS_EN_TABLERO,
  ordenarReuniones,
  ordenarTareasEnCurso,
  ordenarTerminadas,
  prPorAtender,
  proximaReunion,
  situacionPracticante,
  terminadasRecientes,
} from './consultas';
import { IDS, asignacion, proyecto, tarea, usuario } from './pruebas/fabricas';
import type { Tarea } from './tareas';

function terminada(numero: number, fecha: string | null): Tarea {
  return tarea({
    id: `t-${numero}`,
    numero,
    estado: 'TERMINADA',
    fecha_termino: fecha,
  });
}

describe('terminadasRecientes y ordenarTerminadas (§6.8)', () => {
  it('la columna muestra 5 tareas por defecto', () => {
    expect(TERMINADAS_EN_TABLERO).toBe(5);
  });

  it('ordena de la más reciente a la más antigua por fecha de término', () => {
    const tareas = [
      terminada(1, '2026-11-01T15:00:00.000Z'),
      terminada(2, '2026-11-03T15:00:00.000Z'),
      terminada(3, '2026-11-02T15:00:00.000Z'),
    ];

    expect(ordenarTerminadas(tareas).map((t) => t.numero)).toEqual([2, 3, 1]);
  });

  it('con 7 terminadas devuelve las 5 más recientes y el total 7', () => {
    const tareas = Array.from({ length: 7 }, (_, i) =>
      terminada(i + 1, `2026-11-0${i + 1}T15:00:00.000Z`),
    );

    const { recientes, total } = terminadasRecientes(tareas);

    expect(total).toBe(7);
    expect(recientes.map((t) => t.numero)).toEqual([7, 6, 5, 4, 3]);
  });

  it('con 5 exactas y con menos de 5 no recorta', () => {
    const cinco = Array.from({ length: 5 }, (_, i) =>
      terminada(i + 1, `2026-11-0${i + 1}T15:00:00.000Z`),
    );

    expect(terminadasRecientes(cinco)).toMatchObject({ total: 5 });
    expect(terminadasRecientes(cinco).recientes).toHaveLength(5);
    expect(terminadasRecientes(cinco.slice(0, 2)).recientes).toHaveLength(2);
  });

  it('sin terminadas: lista vacía y total 0', () => {
    expect(terminadasRecientes([])).toEqual({ recientes: [], total: 0 });
  });

  it('solo cuentan las TERMINADA', () => {
    const tareas = [
      terminada(1, '2026-11-01T15:00:00.000Z'),
      tarea({ id: 't-2', numero: 2, estado: 'EN_PROGRESO' }),
      tarea({ id: 't-3', numero: 3, estado: 'ESPERANDO_SUPERVISION' }),
    ];

    expect(terminadasRecientes(tareas).total).toBe(1);
  });

  it('con la misma fecha va primero el número mayor; sin fecha, al final', () => {
    const misma = '2026-11-05T15:00:00.000Z';
    const tareas = [terminada(1, misma), terminada(4, null), terminada(2, misma)];

    expect(ordenarTerminadas(tareas).map((t) => t.numero)).toEqual([2, 1, 4]);
  });

  it('un límite de 0 no devuelve tareas pero informa el total', () => {
    expect(terminadasRecientes([terminada(1, '2026-11-01T15:00:00.000Z')], 0)).toMatchObject({
      recientes: [],
      total: 1,
    });
  });

  it('no modifica la entrada', () => {
    const tareas = Object.freeze([
      terminada(1, '2026-11-01T15:00:00.000Z'),
      terminada(2, '2026-11-02T15:00:00.000Z'),
    ]);

    expect(() => terminadasRecientes(tareas)).not.toThrow();
    expect(tareas[0]!.numero).toBe(1);
  });
});

describe('ordenarTareasEnCurso (§9.2.3)', () => {
  const hoy = '2026-11-18';
  const enCurso = (numero: number, fecha_limite: string): Tarea =>
    tarea({ id: `t-${numero}`, numero, estado: 'EN_PROGRESO', fecha_limite });

  it('primero las devueltas, luego las vencidas y luego por fecha límite', () => {
    const normalLejana = enCurso(1, '2026-12-30');
    const normalCercana = enCurso(2, '2026-11-25');
    const vencida = enCurso(3, '2026-11-10');
    const devuelta = enCurso(4, '2026-12-15');

    const orden = ordenarTareasEnCurso(
      [normalLejana, normalCercana, vencida, devuelta],
      new Set([devuelta.id]),
    );

    expect(orden.map((t) => t.numero)).toEqual([4, 3, 2, 1]);
  });

  it('una devuelta y vencida va antes que una devuelta no vencida', () => {
    const devueltaVencida = enCurso(1, '2026-11-01');
    const devueltaAlDia = enCurso(2, '2026-11-20');

    expect(
      ordenarTareasEnCurso([devueltaAlDia, devueltaVencida], new Set(['t-1', 't-2'])).map(
        (t) => t.numero,
      ),
    ).toEqual([1, 2]);
  });

  it('por fecha límite: la vencida ayer, la que vence hoy y la futura, en ese orden', () => {
    const venceHoy = enCurso(1, hoy);
    const vencidaAyer = enCurso(2, '2026-11-17');
    const futura = enCurso(3, '2026-11-19');

    expect(
      ordenarTareasEnCurso([futura, venceHoy, vencidaAyer], new Set()).map((t) => t.numero),
    ).toEqual([2, 1, 3]);
  });

  it('con todo igual desempata por número', () => {
    const a = enCurso(5, '2026-11-25');
    const b = enCurso(2, '2026-11-25');

    expect(ordenarTareasEnCurso([a, b], new Set()).map((t) => t.numero)).toEqual([2, 5]);
  });

  it('solo incluye las EN_PROGRESO', () => {
    const tareas = [
      enCurso(1, '2026-11-25'),
      tarea({ id: 't-2', numero: 2, estado: 'DISPONIBLE', id_practicante: null }),
      tarea({ id: 't-3', numero: 3, estado: 'ESPERANDO_SUPERVISION' }),
      tarea({ id: 't-4', numero: 4, estado: 'TERMINADA' }),
    ];

    expect(ordenarTareasEnCurso(tareas, new Set()).map((t) => t.numero)).toEqual([1]);
  });

  it('sin tareas devuelve una lista vacía', () => {
    expect(ordenarTareasEnCurso([], new Set())).toEqual([]);
  });
});

describe('prPorAtender (§9.2.3)', () => {
  const conEtiqueta = (numero: number, cambios: Partial<Tarea>): Tarea =>
    tarea({ id: `t-${numero}`, numero, requiere_pr: true, ...cambios });

  it('incluye Pendiente y Con conflictos, también en tareas esperando supervisión o terminadas', () => {
    const tareas = [
      conEtiqueta(1, { estado: 'ESPERANDO_SUPERVISION', estado_pr: 'PENDIENTE' }),
      conEtiqueta(2, { estado: 'TERMINADA', estado_pr: 'CON_CONFLICTOS' }),
      conEtiqueta(3, { estado: 'TERMINADA', estado_pr: 'PENDIENTE' }),
    ];

    expect(prPorAtender(tareas).map((t) => t.numero)).toEqual([1, 2, 3]);
  });

  it('excluye Creado, Fusionado y Cerrado', () => {
    const tareas = (['CREADO', 'FUSIONADO', 'CERRADO'] as const).map((estado_pr, i) =>
      conEtiqueta(i + 1, { estado: 'ESPERANDO_SUPERVISION', estado_pr }),
    );

    expect(prPorAtender(tareas)).toEqual([]);
  });

  it('excluye las tareas sin «Requiere PR» aunque conserven la etiqueta', () => {
    const noRequiere = conEtiqueta(1, {
      estado: 'ESPERANDO_SUPERVISION',
      estado_pr: 'PENDIENTE',
      requiere_pr: false,
    });

    expect(prPorAtender([noRequiere])).toEqual([]);
  });

  it('excluye las tareas EN_PROGRESO y DISPONIBLE: la etiqueta no se muestra', () => {
    const tareas = [
      conEtiqueta(1, { estado: 'EN_PROGRESO', estado_pr: 'PENDIENTE' }),
      conEtiqueta(2, { estado: 'DISPONIBLE', estado_pr: 'PENDIENTE', id_practicante: null }),
    ];

    expect(prPorAtender(tareas)).toEqual([]);
  });

  it('una tarea sin etiqueta todavía (null) no aparece', () => {
    expect(
      prPorAtender([conEtiqueta(1, { estado: 'ESPERANDO_SUPERVISION', estado_pr: null })]),
    ).toEqual([]);
  });

  it('ordena por fecha límite y luego por número', () => {
    const tareas = [
      conEtiqueta(1, { estado: 'TERMINADA', estado_pr: 'PENDIENTE', fecha_limite: '2026-12-01' }),
      conEtiqueta(2, { estado: 'TERMINADA', estado_pr: 'PENDIENTE', fecha_limite: '2026-11-20' }),
      conEtiqueta(3, { estado: 'TERMINADA', estado_pr: 'PENDIENTE', fecha_limite: '2026-11-20' }),
    ];

    expect(prPorAtender(tareas).map((t) => t.numero)).toEqual([2, 3, 1]);
  });
});

describe('situacionPracticante (§5.2)', () => {
  const practicante = usuario('PRACTICANTE');
  const proyectos = [
    proyecto({ id: 'p-activo', estado: 'ACTIVO' }),
    proyecto({ id: 'p-pausa', estado: 'EN_PAUSA' }),
    proyecto({ id: 'p-fin', estado: 'FINALIZADO' }),
  ];

  it('activo con un proyecto activo vigente', () => {
    expect(
      situacionPracticante(practicante, [asignacion({ id_proyecto: 'p-activo' })], proyectos),
    ).toEqual({ estado: 'ACTIVO', sin_proyecto: false });
  });

  it('un proyecto EN_PAUSA cuenta como proyecto', () => {
    expect(
      situacionPracticante(practicante, [asignacion({ id_proyecto: 'p-pausa' })], proyectos),
    ).toEqual({ estado: 'ACTIVO', sin_proyecto: false });
  });

  it('activo sin asignaciones: sin proyecto', () => {
    expect(situacionPracticante(practicante, [], proyectos)).toEqual({
      estado: 'ACTIVO',
      sin_proyecto: true,
    });
  });

  it('solo con una asignación con baja: sin proyecto', () => {
    expect(
      situacionPracticante(
        practicante,
        [asignacion({ id_proyecto: 'p-activo', fecha_baja: '2026-10-01' })],
        proyectos,
      ),
    ).toEqual({ estado: 'ACTIVO', sin_proyecto: true });
  });

  it('solo con una asignación vigente en un proyecto FINALIZADO: sin proyecto', () => {
    expect(
      situacionPracticante(practicante, [asignacion({ id_proyecto: 'p-fin' })], proyectos),
    ).toEqual({ estado: 'ACTIVO', sin_proyecto: true });
  });

  it('ignora las asignaciones de otras personas', () => {
    expect(
      situacionPracticante(
        practicante,
        [asignacion({ id_practicante: IDS.practicanteAjeno, id_proyecto: 'p-activo' })],
        proyectos,
      ),
    ).toEqual({ estado: 'ACTIVO', sin_proyecto: true });
  });

  it('un usuario INACTIVO está finalizado y nunca «sin proyecto»', () => {
    const inactivo = usuario('PRACTICANTE', { estado: 'INACTIVO' });

    expect(situacionPracticante(inactivo, [], proyectos)).toEqual({
      estado: 'FINALIZADO',
      sin_proyecto: false,
    });
    expect(
      situacionPracticante(inactivo, [asignacion({ id_proyecto: 'p-activo' })], proyectos),
    ).toEqual({ estado: 'FINALIZADO', sin_proyecto: false });
  });
});

describe('proximaReunion (hora de Perú, UTC−5)', () => {
  // Miércoles 18 de noviembre de 2026, 10:00 en Perú.
  const ahora = '2026-11-18T15:00:00.000Z';
  const reunion = (
    dia_reunion: Parameters<typeof proximaReunion>[0]['dia_reunion'],
    hora_reunion: string | null,
  ) => ({
    dia_reunion,
    hora_reunion,
  });

  it('el mismo día, más tarde: hoy', () => {
    expect(proximaReunion(reunion('MIERCOLES', '11:00'), ahora)).toBe('2026-11-18T16:00:00.000Z');
  });

  it('el mismo día a la misma hora exacta: ahora mismo cuenta como próxima', () => {
    expect(proximaReunion(reunion('MIERCOLES', '10:00'), ahora)).toBe(ahora);
  });

  it('el mismo día, un minuto antes: la semana siguiente', () => {
    expect(proximaReunion(reunion('MIERCOLES', '09:59'), ahora)).toBe('2026-11-25T14:59:00.000Z');
  });

  it('un día posterior de la semana', () => {
    expect(proximaReunion(reunion('JUEVES', '09:00'), ahora)).toBe('2026-11-19T14:00:00.000Z');
    expect(proximaReunion(reunion('DOMINGO', '08:00'), ahora)).toBe('2026-11-22T13:00:00.000Z');
  });

  it('un día anterior de la semana: el de la semana siguiente', () => {
    expect(proximaReunion(reunion('LUNES', '10:00'), ahora)).toBe('2026-11-23T15:00:00.000Z');
  });

  it('corta el día en la hora de Perú, no en UTC (22:00 de Perú ya es jueves en UTC)', () => {
    const noche = '2026-11-19T03:00:00.000Z';

    expect(proximaReunion(reunion('MIERCOLES', '23:00'), noche)).toBe('2026-11-19T04:00:00.000Z');
    expect(proximaReunion(reunion('JUEVES', '08:00'), noche)).toBe('2026-11-19T13:00:00.000Z');
  });

  it('sin reunión, con día u hora faltante o con hora inválida: null', () => {
    expect(proximaReunion(reunion(null, null), ahora)).toBeNull();
    expect(proximaReunion(reunion('LUNES', null), ahora)).toBeNull();
    expect(proximaReunion(reunion(null, '10:00'), ahora)).toBeNull();
    expect(proximaReunion(reunion('LUNES', '25:00'), ahora)).toBeNull();
    expect(proximaReunion(reunion('LUNES', '9:00'), ahora)).toBeNull();
    expect(proximaReunion(reunion('LUNES', '10:60'), ahora)).toBeNull();
  });

  it('un `ahora` inválido da null', () => {
    expect(proximaReunion(reunion('LUNES', '10:00'), '2026-11-18')).toBeNull();
    expect(proximaReunion(reunion('LUNES', '10:00'), '2026-11-18T10:00:00')).toBeNull();
  });
});

describe('ordenarReuniones', () => {
  const ahora = '2026-11-18T15:00:00.000Z';

  it('la más cercana primero y los «Sin definir» al final', () => {
    const proyectos = [
      proyecto({ id: 'p-sin', dia_reunion: null, hora_reunion: null }),
      proyecto({ id: 'p-lunes', dia_reunion: 'LUNES', hora_reunion: '10:00' }),
      proyecto({ id: 'p-jueves', dia_reunion: 'JUEVES', hora_reunion: '09:00' }),
    ];

    expect(ordenarReuniones(proyectos, ahora).map((r) => r.id_proyecto)).toEqual([
      'p-jueves',
      'p-lunes',
      'p-sin',
    ]);
  });

  it('el orden no depende del orden de entrada (todas las permutaciones)', () => {
    const proyectos = [
      proyecto({ id: 'p-sin-1', dia_reunion: null, hora_reunion: null }),
      proyecto({ id: 'p-lunes', dia_reunion: 'LUNES', hora_reunion: '10:00' }),
      proyecto({ id: 'p-sin-2', dia_reunion: null, hora_reunion: null }),
      proyecto({ id: 'p-jueves', dia_reunion: 'JUEVES', hora_reunion: '09:00' }),
    ];
    const permutaciones = (lista: typeof proyectos): (typeof proyectos)[] =>
      lista.length <= 1
        ? [lista]
        : lista.flatMap((elemento, i) =>
            permutaciones([...lista.slice(0, i), ...lista.slice(i + 1)]).map((resto) => [
              elemento,
              ...resto,
            ]),
          );

    for (const entrada of permutaciones(proyectos)) {
      expect(ordenarReuniones(entrada, ahora).map((r) => r.id_proyecto)).toEqual([
        'p-jueves',
        'p-lunes',
        'p-sin-1',
        'p-sin-2',
      ]);
    }
  });

  it('el «Sin definir» conserva día y hora en null y proxima en null', () => {
    const [fila] = ordenarReuniones(
      [proyecto({ id: 'p', dia_reunion: null, hora_reunion: null })],
      ahora,
    );

    expect(fila).toEqual({
      id_proyecto: 'p',
      dia_reunion: null,
      hora_reunion: null,
      proxima: null,
    });
  });

  it('con la misma hora desempata por id de proyecto', () => {
    const proyectos = [
      proyecto({ id: 'p-b', dia_reunion: 'JUEVES', hora_reunion: '09:00' }),
      proyecto({ id: 'p-a', dia_reunion: 'JUEVES', hora_reunion: '09:00' }),
    ];

    expect(ordenarReuniones(proyectos, ahora).map((r) => r.id_proyecto)).toEqual(['p-a', 'p-b']);
  });

  it('sin proyectos devuelve una lista vacía', () => {
    expect(ordenarReuniones([], ahora)).toEqual([]);
  });
});

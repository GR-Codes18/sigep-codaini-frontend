import { describe, expect, it } from 'vitest';
import { puede, type Id } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import { finalizarPractica, reactivarPractica } from './ciclo';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // supervisor de PL2D y RSV
const SUPERVISOR_INV = 'usr-sup-03'; // supervisor de INV (en pausa)
const PRACTICANTE_DEMO = 'demo-practicante'; // PL2D: 010 en progreso y 017 esperando
const CON_4_EN_PROGRESO = 'usr-pra-04'; // PL2D: 008, 013, 014 y 016
const EN_DOS_PROYECTOS = 'usr-pra-06'; // PL2D (018 en progreso) y RSV (005 esperando)
const SIN_EN_PROGRESO = 'usr-pra-09'; // INV: solo una tarea esperando supervisión (003)
const SIN_PROYECTO = 'usr-pra-20';
const FINALIZADO = 'usr-pra-19';
const HOY = '2026-11-17';
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

const finalizar = (p: PruebaPreparada, idActor: Id, idPracticante: Id, motivo?: string) =>
  finalizarPractica({ idActor, idPracticante, motivo }, p.entorno);

const reactivar = (p: PruebaPreparada, idActor: Id, idPracticante: Id, nota?: string) =>
  reactivarPractica({ idActor, idPracticante, nota }, p.entorno);

/**
 * Deja a `usr-pra-06` con una tarea en progreso en cada uno de sus proyectos (PL2D y RSV) y con una
 * asignación más, en INV (con otro supervisor), también con una tarea en progreso.
 */
function practicanteEnTresProyectos(prueba: PruebaPreparada) {
  prueba.modificar((d) => ({
    asignaciones: [
      ...d.asignaciones,
      {
        id: 'asi-extra',
        id_practicante: EN_DOS_PROYECTOS,
        id_proyecto: 'pry-inv',
        fecha_alta: '2026-11-01',
        fecha_baja: null,
      },
    ],
    tareas: d.tareas.map((t) =>
      t.id === 'tar-rsv-005'
        ? { ...t, estado: 'EN_PROGRESO' as const }
        : t.id === 'tar-inv-002'
          ? { ...t, id_practicante: EN_DOS_PROYECTOS }
          : t,
    ),
  }));
}

describe('finalizarPractica: permisos y datos', () => {
  it('el Administrador activo puede', async () => {
    const prueba = prepararPrueba();
    expect((await finalizar(prueba, ADMIN, SIN_PROYECTO, 'Fin de ciclo.')).ok).toBe(true);
  });

  it.each([
    ['Supervisor', SUPERVISOR],
    ['Practicante', PRACTICANTE_DEMO],
  ])('%s → ROL_NO_PERMITIDO y no escribe nada', async (_rol, actor) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await finalizar(prueba, actor, CON_4_EN_PROGRESO, 'x')).toMatchObject({
      ok: false,
      codigo: 'ROL_NO_PERMITIDO',
    });
    igual();
  });

  it('Administrador INACTIVO → USUARIO_INACTIVO; actor o practicante inexistente → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    expect(await finalizar(prueba, 'nadie', SIN_PROYECTO, 'x')).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    const igual = sinEscritura(prueba);
    expect(await finalizar(prueba, ADMIN, 'usr-zz', 'x')).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    igual();
    prueba.modificar((d) => ({
      usuarios: d.usuarios.map((u) => (u.id === ADMIN ? { ...u, estado: 'INACTIVO' } : u)),
    }));
    expect(await finalizar(prueba, ADMIN, SIN_PROYECTO, 'x')).toMatchObject({
      codigo: 'USUARIO_INACTIVO',
    });
  });

  it.each([
    ['sin motivo', undefined],
    ['motivo vacío', ''],
    ['motivo de solo espacios', '  \n '],
  ])('%s → TEXTO_OBLIGATORIO y no escribe nada', async (_caso, motivo) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await finalizar(prueba, ADMIN, CON_4_EN_PROGRESO, motivo)).toMatchObject({
      ok: false,
      codigo: 'TEXTO_OBLIGATORIO',
    });
    igual();
  });

  it('una práctica ya finalizada → PRACTICANTE_YA_FINALIZADO (antes que el texto)', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await finalizar(prueba, ADMIN, FINALIZADO, '');
    expect(r).toMatchObject({ ok: false, codigo: 'PRACTICANTE_YA_FINALIZADO' });
    if (!r.ok) expect(r.mensaje).toContain('ya está finalizada');
    igual();
  });

  it('una persona que no es practicante → FUERA_DE_ALCANCE', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await finalizar(prueba, ADMIN, 'usr-sup-02', 'x')).toMatchObject({
      ok: false,
      codigo: 'FUERA_DE_ALCANCE',
    });
    igual();
  });
});

describe('finalizarPractica: efectos en cascada', () => {
  it('da baja a todas sus asignaciones, libera sus tareas en progreso, bloquea la cuenta y avisa a los supervisores', async () => {
    const prueba = prepararPrueba();
    practicanteEnTresProyectos(prueba);
    const antes = prueba.datos();
    const escrituras = prueba.escrituras();
    const persona = antes.usuarios.find((u) => u.id === EN_DOS_PROYECTOS)!;

    const r = await finalizar(prueba, ADMIN, EN_DOS_PROYECTOS, '  Retiro voluntario.  ');

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(prueba.escrituras() - escrituras).toBe(1);
    expect(r.valor.practicante).toEqual({ ...persona, estado: 'INACTIVO' });
    expect(r.valor.tareas_liberadas).toEqual(['tar-pl2d-018', 'tar-rsv-005', 'tar-inv-002']);

    const despues = prueba.datos();
    // La cuenta queda INACTIVA: `puede()` ya no le deja hacer nada.
    expect(despues.usuarios.find((u) => u.id === EN_DOS_PROYECTOS)!.estado).toBe('INACTIVO');
    expect(
      puede(
        despues.usuarios.find((u) => u.id === EN_DOS_PROYECTOS)!,
        'CAMBIAR_CONTRASENA_PROPIA',
        {
          usuario_objetivo: despues.usuarios.find((u) => u.id === EN_DOS_PROYECTOS)!,
        },
      ),
    ).toEqual({ permitido: false, codigo: 'USUARIO_INACTIVO' });

    // Sus tres asignaciones reciben la baja de hoy; ninguna otra cambia.
    const suyas = despues.asignaciones.filter((a) => a.id_practicante === EN_DOS_PROYECTOS);
    expect(suyas.map((a) => [a.id_proyecto, a.fecha_baja])).toEqual([
      ['pry-pl2d', HOY],
      ['pry-rsv', HOY],
      ['pry-inv', HOY],
    ]);
    expect(r.valor.asignaciones_cerradas).toHaveLength(3);
    expect(despues.asignaciones.filter((a) => a.id_practicante !== EN_DOS_PROYECTOS)).toEqual(
      antes.asignaciones.filter((a) => a.id_practicante !== EN_DOS_PROYECTOS),
    );

    // Las tres tareas pasan a DISPONIBLE, sin responsable.
    for (const id of r.valor.tareas_liberadas) {
      expect(despues.tareas.find((t) => t.id === id)).toMatchObject({
        estado: 'DISPONIBLE',
        id_practicante: null,
      });
    }

    // Un solo evento de la persona (sin proyecto) y uno de liberación por cada tarea.
    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos.map((e) => e.tipo_accion)).toEqual([
      'PRACTICANTE_FINALIZADO',
      'TAREA_LIBERADA',
      'TAREA_LIBERADA',
      'TAREA_LIBERADA',
    ]);
    expect(eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      elemento: { tipo: 'USUARIO', id: EN_DOS_PROYECTOS, etiqueta: persona.nombre },
      id_proyecto: null,
      fecha: AHORA_ISO,
      nota: 'Retiro voluntario.',
      cambios: [{ campo: 'estado', valor_anterior: 'ACTIVO', valor_nuevo: 'INACTIVO' }],
    });
    expect(eventos.slice(1).map((e) => [e.elemento.id, e.id_proyecto, e.nota])).toEqual([
      ['tar-pl2d-018', 'pry-pl2d', 'Retiro voluntario.'],
      ['tar-rsv-005', 'pry-rsv', 'Retiro voluntario.'],
      ['tar-inv-002', 'pry-inv', 'Retiro voluntario.'],
    ]);
    expect(eventos.slice(1).every((e) => e.cambios[1].campo === 'responsable')).toBe(true);

    // Un aviso por supervisor y proyecto afectado; la persona no recibe ninguno.
    const avisos = despues.notificaciones.slice(antes.notificaciones.length);
    expect(avisos.map((n) => [n.id_destinatario, n.elemento.id, n.tipo])).toEqual([
      [SUPERVISOR, 'pry-pl2d', 'PRACTICA_FINALIZADA_CON_TAREAS_LIBERADAS'],
      [SUPERVISOR, 'pry-rsv', 'PRACTICA_FINALIZADA_CON_TAREAS_LIBERADAS'],
      [SUPERVISOR_INV, 'pry-inv', 'PRACTICA_FINALIZADA_CON_TAREAS_LIBERADAS'],
    ]);
    const proyecto = antes.proyectos.find((p) => p.id === 'pry-pl2d')!;
    expect(avisos[0]).toMatchObject({
      mensaje: `${persona.nombre} finalizó su práctica: 1 tarea en progreso quedó disponible en «${proyecto.nombre}».`,
      elemento: { tipo: 'PROYECTO' },
      leida: false,
    });
    expect(avisos.some((n) => n.id_destinatario === EN_DOS_PROYECTOS)).toBe(false);
  });

  it('con varias tareas en un mismo proyecto, un solo aviso con la cantidad en plural', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const r = await finalizar(prueba, ADMIN, CON_4_EN_PROGRESO, 'Fin de ciclo.');
    expect(r.ok && r.valor.tareas_liberadas).toHaveLength(4);
    const avisos = prueba.datos().notificaciones.slice(antes.notificaciones.length);
    expect(avisos).toHaveLength(1);
    expect(avisos[0].mensaje).toContain('4 tareas en progreso quedaron disponibles');
    // Y cuatro eventos de liberación más el de la persona.
    expect(prueba.datos().historial.slice(antes.historial.length)).toHaveLength(5);
  });

  it('las tareas esperando supervisión no se liberan y siguen su curso con el supervisor', async () => {
    const prueba = prepararPrueba();
    await finalizar(prueba, ADMIN, PRACTICANTE_DEMO, 'Fin de ciclo.');
    const despues = prueba.datos();
    expect(despues.tareas.find((t) => t.id === 'tar-pl2d-010')).toMatchObject({
      estado: 'DISPONIBLE',
      id_practicante: null,
    });
    expect(despues.tareas.find((t) => t.id === 'tar-pl2d-017')).toMatchObject({
      estado: 'ESPERANDO_SUPERVISION',
      id_practicante: PRACTICANTE_DEMO,
    });
  });

  it('sin tareas en progreso: da baja y bloquea, pero no libera nada ni avisa a nadie', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const r = await finalizar(prueba, ADMIN, SIN_EN_PROGRESO, 'Fin de ciclo.');
    expect(r.ok && r.valor.tareas_liberadas).toEqual([]);
    const despues = prueba.datos();
    expect(despues.tareas).toBe(antes.tareas);
    expect(despues.notificaciones).toBe(antes.notificaciones);
    expect(despues.historial.slice(antes.historial.length).map((e) => e.tipo_accion)).toEqual([
      'PRACTICANTE_FINALIZADO',
    ]);
    expect(
      despues.asignaciones
        .filter((a) => a.id_practicante === SIN_EN_PROGRESO)
        .every((a) => a.fecha_baja !== null),
    ).toBe(true);
  });

  it('sin asignaciones ni tareas: solo se bloquea la cuenta', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const r = await finalizar(prueba, ADMIN, SIN_PROYECTO, 'Fin de ciclo.');
    expect(r.ok && r.valor.asignaciones_cerradas).toEqual([]);
    expect(prueba.datos().asignaciones).toStrictEqual(antes.asignaciones);
    expect(prueba.datos().usuarios.find((u) => u.id === SIN_PROYECTO)!.estado).toBe('INACTIVO');
  });

  it('también da baja a la asignación que tiene en un proyecto finalizado', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      asignaciones: [
        ...d.asignaciones,
        {
          id: 'asi-tie',
          id_practicante: SIN_PROYECTO,
          id_proyecto: 'pry-tie',
          fecha_alta: '2026-10-01',
          fecha_baja: null,
        },
      ],
    }));
    const r = await finalizar(prueba, ADMIN, SIN_PROYECTO, 'Fin de ciclo.');
    expect(r.ok && r.valor.asignaciones_cerradas).toEqual(['asi-tie']);
    expect(prueba.datos().asignaciones.find((a) => a.id === 'asi-tie')!.fecha_baja).toBe(HOY);
  });

  it('el evento de liberación lleva el motivo y el nombre del responsable anterior', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const nombre = antes.usuarios.find((u) => u.id === PRACTICANTE_DEMO)!.nombre;
    await finalizar(prueba, ADMIN, PRACTICANTE_DEMO, 'Fin de ciclo.');
    const liberacion = prueba
      .datos()
      .historial.slice(antes.historial.length)
      .find((e) => e.tipo_accion === 'TAREA_LIBERADA')!;
    expect(liberacion.cambios).toEqual([
      { campo: 'estado', valor_anterior: 'EN_PROGRESO', valor_nuevo: 'DISPONIBLE' },
      { campo: 'responsable', valor_anterior: nombre, valor_nuevo: null },
    ]);
    expect(liberacion.nota).toBe('Fin de ciclo.');
  });

  it('no modifica los datos anteriores: las demás personas y tareas quedan iguales', async () => {
    const prueba = prepararPrueba();
    const antes = structuredClone(prueba.datos());
    await finalizar(prueba, ADMIN, CON_4_EN_PROGRESO, 'x');
    const despues = prueba.datos();
    expect(despues.usuarios.filter((u) => u.id !== CON_4_EN_PROGRESO)).toEqual(
      antes.usuarios.filter((u) => u.id !== CON_4_EN_PROGRESO),
    );
    expect(despues.practicantes).toEqual(antes.practicantes);
    expect(despues.proyectos).toEqual(antes.proyectos);
  });
});

describe('reactivarPractica', () => {
  it('vuelve a ACTIVO, registra la nota y no reactiva ninguna asignación', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const persona = antes.usuarios.find((u) => u.id === FINALIZADO)!;
    const escrituras = prueba.escrituras();

    const r = await reactivar(prueba, ADMIN, FINALIZADO, '  Vuelve a practicar.  ');

    expect(r).toEqual({ ok: true, valor: { ...persona, estado: 'ACTIVO' } });
    expect(prueba.escrituras() - escrituras).toBe(1);
    const despues = prueba.datos();
    expect(despues.usuarios.find((u) => u.id === FINALIZADO)!.estado).toBe('ACTIVO');
    // Queda «Sin proyecto»: las asignaciones antiguas siguen con su baja.
    expect(despues.asignaciones).toBe(antes.asignaciones);
    expect(
      despues.asignaciones.filter((a) => a.id_practicante === FINALIZADO && a.fecha_baja === null),
    ).toEqual([]);
    // La fecha de fin prevista no cambia (F4-A) y no hay avisos.
    expect(despues.practicantes).toBe(antes.practicantes);
    expect(despues.notificaciones).toBe(antes.notificaciones);

    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      tipo_accion: 'PRACTICANTE_REACTIVADO',
      elemento: { tipo: 'USUARIO', id: FINALIZADO, etiqueta: persona.nombre },
      id_proyecto: null,
      fecha: AHORA_ISO,
      nota: 'Vuelve a practicar.',
      cambios: [{ campo: 'estado', valor_anterior: 'INACTIVO', valor_nuevo: 'ACTIVO' }],
    });
  });

  it.each([
    ['Supervisor', SUPERVISOR],
    ['Practicante', PRACTICANTE_DEMO],
  ])('%s → ROL_NO_PERMITIDO y no escribe nada', async (_rol, actor) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await reactivar(prueba, actor, FINALIZADO, 'x')).toMatchObject({
      ok: false,
      codigo: 'ROL_NO_PERMITIDO',
    });
    igual();
  });

  it.each([
    ['sin nota', undefined],
    ['nota vacía', ''],
    ['nota de solo espacios', '   '],
  ])('%s → TEXTO_OBLIGATORIO y no escribe nada', async (_caso, nota) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await reactivar(prueba, ADMIN, FINALIZADO, nota)).toMatchObject({
      ok: false,
      codigo: 'TEXTO_OBLIGATORIO',
    });
    igual();
  });

  it('un practicante que sigue activo → PRACTICANTE_NO_FINALIZADO', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await reactivar(prueba, ADMIN, SIN_PROYECTO, 'x');
    expect(r).toMatchObject({ ok: false, codigo: 'PRACTICANTE_NO_FINALIZADO' });
    if (!r.ok) expect(r.mensaje).toContain('práctica finalizada');
    igual();
  });

  it('una persona que no es practicante → FUERA_DE_ALCANCE; inexistente → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    expect(await reactivar(prueba, ADMIN, 'usr-sup-02', 'x')).toMatchObject({
      codigo: 'FUERA_DE_ALCANCE',
    });
    expect(await reactivar(prueba, ADMIN, 'usr-zz', 'x')).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    expect(await reactivar(prueba, 'nadie', FINALIZADO, 'x')).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });

  it('Administrador INACTIVO → USUARIO_INACTIVO', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      usuarios: d.usuarios.map((u) => (u.id === ADMIN ? { ...u, estado: 'INACTIVO' } : u)),
    }));
    expect(await reactivar(prueba, ADMIN, FINALIZADO, 'x')).toMatchObject({
      codigo: 'USUARIO_INACTIVO',
    });
  });

  it('finalizar y luego reactivar deja a la persona activa y sin proyecto', async () => {
    const prueba = prepararPrueba();
    await finalizar(prueba, ADMIN, CON_4_EN_PROGRESO, 'Fin.');
    expect((await reactivar(prueba, ADMIN, CON_4_EN_PROGRESO, 'Vuelve.')).ok).toBe(true);
    const datos = prueba.datos();
    expect(datos.usuarios.find((u) => u.id === CON_4_EN_PROGRESO)!.estado).toBe('ACTIVO');
    expect(
      datos.asignaciones.filter(
        (a) => a.id_practicante === CON_4_EN_PROGRESO && a.fecha_baja === null,
      ),
    ).toEqual([]);
    // Y las tareas liberadas siguen disponibles.
    expect(datos.tareas.find((t) => t.id === 'tar-pl2d-008')).toMatchObject({
      estado: 'DISPONIBLE',
      id_practicante: null,
    });
  });
});

import { describe, expect, it } from 'vitest';
import type { Id } from '@/domain';
import { liberarTarea } from '../tareas';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import { asignarPracticantes, quitarPracticante } from './asignaciones';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // supervisor de PL2D y RSV
const PRACTICANTE_DEMO = 'demo-practicante'; // en PL2D: tar-pl2d-010 en progreso y tar-pl2d-017 esperando
const SIN_PROYECTO = 'usr-pra-20'; // practicantes sin proyecto: 20 a 24
const OTRO_SIN_PROYECTO = 'usr-pra-21';
const FINALIZADO = 'usr-pra-19';
const CON_4_EN_PROGRESO = 'usr-pra-04'; // en PL2D: 008, 013, 014 y 016
const EN_DOS_PROYECTOS = 'usr-pra-06'; // PL2D (018 en progreso) y RSV (005 esperando)
const PL2D = 'pry-pl2d';
const RSV = 'pry-rsv';
const INV = 'pry-inv'; // en pausa
const TIE = 'pry-tie'; // finalizado
const HOY = '2026-11-17';
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

const par = (idPracticante: Id, idProyecto: Id) => ({ idPracticante, idProyecto });

function asignar(p: PruebaPreparada, idActor: Id, ...pares: ReturnType<typeof par>[]) {
  return asignarPracticantes({ idActor, asignaciones: pares }, p.entorno);
}

describe('asignarPracticantes: permisos', () => {
  it('el Administrador activo puede', async () => {
    const prueba = prepararPrueba();
    expect((await asignar(prueba, ADMIN, par(SIN_PROYECTO, PL2D))).ok).toBe(true);
  });

  it.each([
    ['Supervisor', SUPERVISOR],
    ['Practicante', PRACTICANTE_DEMO],
  ])('%s → ROL_NO_PERMITIDO y no escribe nada', async (_rol, actor) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await asignar(prueba, actor, par(SIN_PROYECTO, PL2D))).toMatchObject({
      ok: false,
      codigo: 'ROL_NO_PERMITIDO',
    });
    igual();
  });

  it('Administrador INACTIVO → USUARIO_INACTIVO; actor inexistente → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      usuarios: d.usuarios.map((u) => (u.id === ADMIN ? { ...u, estado: 'INACTIVO' } : u)),
    }));
    const igual = sinEscritura(prueba);
    expect(await asignar(prueba, ADMIN, par(SIN_PROYECTO, PL2D))).toMatchObject({
      codigo: 'USUARIO_INACTIVO',
    });
    expect(await asignar(prueba, 'nadie', par(SIN_PROYECTO, PL2D))).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    igual();
  });
});

describe('asignarPracticantes: éxito', () => {
  it('crea la asignación, el evento y el aviso al practicante, en una sola escritura', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const escrituras = prueba.escrituras();
    const proyecto = antes.proyectos.find((p) => p.id === PL2D)!;
    const practicante = antes.usuarios.find((u) => u.id === SIN_PROYECTO)!;

    const r = await asignar(prueba, ADMIN, par(SIN_PROYECTO, PL2D));

    expect(r).toEqual({
      ok: true,
      valor: [
        {
          id: 'asi-t001',
          id_practicante: SIN_PROYECTO,
          id_proyecto: PL2D,
          fecha_alta: HOY,
          fecha_baja: null,
        },
      ],
    });
    expect(prueba.escrituras() - escrituras).toBe(1);
    const despues = prueba.datos();
    expect(despues.asignaciones).toHaveLength(antes.asignaciones.length + 1);
    expect(despues.asignaciones.at(-1)).toEqual(r.ok ? r.valor[0] : null);

    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      tipo_accion: 'PRACTICANTE_ASIGNADO_A_PROYECTO',
      elemento: { tipo: 'USUARIO', id: SIN_PROYECTO, etiqueta: practicante.nombre },
      id_proyecto: PL2D,
      fecha: AHORA_ISO,
      cambios: [{ campo: 'proyecto', valor_anterior: null, valor_nuevo: proyecto.codigo }],
    });

    // §8.1: solo el practicante; el supervisor del proyecto no recibe nada.
    const avisos = despues.notificaciones.slice(antes.notificaciones.length);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({
      id_destinatario: SIN_PROYECTO,
      tipo: 'ASIGNADO_A_PROYECTO',
      mensaje: `Te asignaron al proyecto ${proyecto.nombre}.`,
      elemento: { tipo: 'PROYECTO', id: PL2D },
      leida: false,
    });
  });

  it('un lote asigna a varios practicantes y proyectos a la vez, todo en una escritura', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const escrituras = prueba.escrituras();
    const r = await asignar(
      prueba,
      ADMIN,
      par(SIN_PROYECTO, PL2D),
      par(SIN_PROYECTO, RSV),
      par(OTRO_SIN_PROYECTO, PL2D),
    );
    expect(r.ok && r.valor.map((a) => [a.id_practicante, a.id_proyecto])).toEqual([
      [SIN_PROYECTO, PL2D],
      [SIN_PROYECTO, RSV],
      [OTRO_SIN_PROYECTO, PL2D],
    ]);
    expect(prueba.escrituras() - escrituras).toBe(1);
    const despues = prueba.datos();
    expect(despues.historial.slice(antes.historial.length).map((e) => e.id_proyecto)).toEqual([
      PL2D,
      RSV,
      PL2D,
    ]);
    expect(despues.notificaciones.slice(antes.notificaciones.length)).toHaveLength(3);
  });

  it('un proyecto en pausa también admite asignaciones', async () => {
    const prueba = prepararPrueba();
    expect((await asignar(prueba, ADMIN, par(SIN_PROYECTO, INV))).ok).toBe(true);
  });

  it('no modifica las asignaciones que ya existían', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos().asignaciones;
    await asignar(prueba, ADMIN, par(SIN_PROYECTO, PL2D));
    const despues = prueba.datos().asignaciones;
    antes.forEach((a, i) => expect(despues[i]).toBe(a));
  });
});

describe('asignarPracticantes: errores (todo o nada)', () => {
  it('un par que falla cancela todo el lote y señala cuál fue', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await asignar(prueba, ADMIN, par(SIN_PROYECTO, PL2D), par(OTRO_SIN_PROYECTO, TIE));
    expect(r).toMatchObject({ ok: false, codigo: 'PROYECTO_FINALIZADO' });
    expect(r.ok ? {} : r.campos).toHaveProperty(['asignaciones.1']);
    igual();
    // El primer par, que era válido, tampoco se guardó.
    expect(
      prueba
        .datos()
        .asignaciones.some((a) => a.id_practicante === SIN_PROYECTO && a.id_proyecto === PL2D),
    ).toBe(false);
  });

  it.each([
    ['un proyecto finalizado', par(SIN_PROYECTO, TIE), 'PROYECTO_FINALIZADO'],
    ['un practicante con la práctica finalizada', par(FINALIZADO, PL2D), 'PRACTICANTE_NO_ACTIVO'],
    ['una persona que no es practicante', par(SUPERVISOR, PL2D), 'PRACTICANTE_NO_ACTIVO'],
    ['quien ya está en ese proyecto', par(PRACTICANTE_DEMO, PL2D), 'ASIGNACION_VIGENTE_EXISTENTE'],
    ['un proyecto que no existe', par(SIN_PROYECTO, 'pry-zz'), 'NO_ENCONTRADO'],
    ['un practicante que no existe', par('usr-zz', PL2D), 'NO_ENCONTRADO'],
  ])('%s → %s', async (_caso, pareja, codigo) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await asignar(prueba, ADMIN, pareja);
    expect(r).toMatchObject({ ok: false, codigo });
    if (!r.ok) expect(r.mensaje.length).toBeGreaterThan(10);
    igual();
  });

  it('el mismo par dos veces en el lote → DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await asignar(prueba, ADMIN, par(SIN_PROYECTO, PL2D), par(SIN_PROYECTO, PL2D));
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(r.ok ? {} : r.campos).toHaveProperty(['asignaciones.1']);
    igual();
  });

  it('un lote vacío → DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await asignar(prueba, ADMIN)).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    igual();
  });
});

describe('quitarPracticante: éxito', () => {
  it('da baja a la asignación, libera sus tareas en progreso de ese proyecto y avisa por cada una', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const escrituras = prueba.escrituras();
    const proyecto = antes.proyectos.find((p) => p.id === PL2D)!;
    const practicante = antes.usuarios.find((u) => u.id === CON_4_EN_PROGRESO)!;
    const asignacion = antes.asignaciones.find(
      (a) =>
        a.id_practicante === CON_4_EN_PROGRESO && a.id_proyecto === PL2D && a.fecha_baja === null,
    )!;
    const enProgreso = antes.tareas
      .filter((t) => t.id_practicante === CON_4_EN_PROGRESO && t.estado === 'EN_PROGRESO')
      .map((t) => t.id);
    expect(enProgreso).toHaveLength(4);

    const r = await quitarPracticante(
      {
        idActor: ADMIN,
        idProyecto: PL2D,
        idPracticante: CON_4_EN_PROGRESO,
        motivo: '  Reorganización.  ',
      },
      prueba.entorno,
    );

    expect(r).toEqual({
      ok: true,
      valor: { asignacion: { ...asignacion, fecha_baja: HOY }, tareas_liberadas: enProgreso },
    });
    expect(prueba.escrituras() - escrituras).toBe(1);
    const despues = prueba.datos();
    expect(despues.asignaciones.find((a) => a.id === asignacion.id)!.fecha_baja).toBe(HOY);
    for (const id of enProgreso) {
      const t = despues.tareas.find((x) => x.id === id)!;
      expect(t).toMatchObject({ estado: 'DISPONIBLE', id_practicante: null });
    }
    // Lo demás no cambia.
    expect(despues.tareas.filter((t) => !enProgreso.includes(t.id))).toEqual(
      antes.tareas.filter((t) => !enProgreso.includes(t.id)),
    );

    // Un evento de salida y uno de liberación por cada tarea, en ese orden.
    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos.map((e) => e.tipo_accion)).toEqual([
      'PRACTICANTE_QUITADO_DE_PROYECTO',
      ...Array(4).fill('TAREA_LIBERADA'),
    ]);
    expect(eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      elemento: { tipo: 'USUARIO', id: CON_4_EN_PROGRESO, etiqueta: practicante.nombre },
      id_proyecto: PL2D,
      cambios: [{ campo: 'proyecto', valor_anterior: proyecto.codigo, valor_nuevo: null }],
      nota: 'Reorganización.',
      fecha: AHORA_ISO,
    });
    for (const [i, evento] of eventos.slice(1).entries()) {
      expect(evento).toMatchObject({
        elemento: { tipo: 'TAREA', id: enProgreso[i] },
        id_proyecto: PL2D,
        nota: 'Reorganización.',
        cambios: [
          { campo: 'estado', valor_anterior: 'EN_PROGRESO', valor_nuevo: 'DISPONIBLE' },
          { campo: 'responsable', valor_anterior: practicante.nombre, valor_nuevo: null },
        ],
      });
    }

    // F3-A: el aviso de salida más uno por cada tarea liberada, todos para el practicante.
    const avisos = despues.notificaciones.slice(antes.notificaciones.length);
    expect(avisos.map((n) => [n.id_destinatario, n.tipo])).toEqual([
      [CON_4_EN_PROGRESO, 'QUITADO_DE_PROYECTO'],
      ...Array(4).fill([CON_4_EN_PROGRESO, 'TAREA_LIBERADA']),
    ]);
    expect(avisos[0]).toMatchObject({
      mensaje: `Saliste del proyecto ${proyecto.nombre}.`,
      elemento: { tipo: 'PROYECTO', id: PL2D },
    });
    expect(avisos[1]).toMatchObject({
      mensaje: expect.stringMatching(/^Liberaron tu tarea «.+» \(PL2D-\d{3}\)\.$/),
      elemento: { tipo: 'TAREA', id: enProgreso[0] },
    });
  });

  it('solo libera las tareas de ese proyecto y la otra asignación sigue vigente', async () => {
    const prueba = prepararPrueba();
    // Una tarea en progreso también en RSV: no debe liberarse al salir de PL2D.
    prueba.modificar((d) => ({
      tareas: d.tareas.map((t) =>
        t.id === 'tar-rsv-005' ? { ...t, estado: 'EN_PROGRESO' as const } : t,
      ),
    }));
    const r = await quitarPracticante(
      { idActor: ADMIN, idProyecto: PL2D, idPracticante: EN_DOS_PROYECTOS },
      prueba.entorno,
    );
    expect(r.ok && r.valor.tareas_liberadas).toEqual(['tar-pl2d-018']);
    const despues = prueba.datos();
    const enRsv = despues.asignaciones.find(
      (a) => a.id_practicante === EN_DOS_PROYECTOS && a.id_proyecto === RSV,
    )!;
    expect(enRsv.fecha_baja).toBeNull();
    expect(despues.tareas.find((t) => t.id === 'tar-rsv-005')).toMatchObject({
      estado: 'EN_PROGRESO',
      id_practicante: EN_DOS_PROYECTOS,
    });
  });

  it('sin tareas en progreso en ese proyecto, solo se registra la salida y su aviso', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const r = await quitarPracticante(
      { idActor: ADMIN, idProyecto: RSV, idPracticante: EN_DOS_PROYECTOS },
      prueba.entorno,
    );
    expect(r.ok && r.valor.tareas_liberadas).toEqual([]);
    const despues = prueba.datos();
    expect(despues.tareas).toBe(antes.tareas);
    expect(despues.historial.slice(antes.historial.length).map((e) => e.tipo_accion)).toEqual([
      'PRACTICANTE_QUITADO_DE_PROYECTO',
    ]);
    expect(despues.notificaciones.slice(antes.notificaciones.length)).toHaveLength(1);
  });

  it('las tareas esperando supervisión se quedan con su responsable', async () => {
    const prueba = prepararPrueba();
    await quitarPracticante(
      { idActor: ADMIN, idProyecto: PL2D, idPracticante: PRACTICANTE_DEMO },
      prueba.entorno,
    );
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

  it('el motivo es opcional: sin él, la nota queda en null', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos().historial.length;
    await quitarPracticante(
      { idActor: ADMIN, idProyecto: PL2D, idPracticante: PRACTICANTE_DEMO },
      prueba.entorno,
    );
    const eventos = prueba.datos().historial.slice(antes);
    expect(eventos.every((e) => e.nota === null)).toBe(true);
  });

  it('el evento de liberación es el mismo que deja `liberarTarea` (estado y responsable)', async () => {
    const quitando = prepararPrueba();
    const liberando = prepararPrueba();
    const inicio = quitando.datos().historial.length;
    await quitarPracticante(
      { idActor: ADMIN, idProyecto: PL2D, idPracticante: PRACTICANTE_DEMO, motivo: 'Reunión.' },
      quitando.entorno,
    );
    await liberarTarea(
      { idActor: ADMIN, idTarea: 'tar-pl2d-010', motivo: 'Reunión.' },
      liberando.entorno,
    );
    const deQuitar = quitando
      .datos()
      .historial.slice(inicio)
      .find((e) => e.tipo_accion === 'TAREA_LIBERADA')!;
    const deLiberar = liberando.datos().historial.at(-1)!;
    const sinId = (evento: typeof deQuitar) => ({ ...evento, id: 'sin-id' });
    expect(sinId(deQuitar)).toEqual(sinId(deLiberar));
  });
});

describe('quitarPracticante: errores', () => {
  const quitar = (p: PruebaPreparada, idActor: Id, idProyecto: Id, idPracticante: Id) =>
    quitarPracticante({ idActor, idProyecto, idPracticante }, p.entorno);

  it.each([
    ['Supervisor', SUPERVISOR],
    ['Practicante', PRACTICANTE_DEMO],
  ])('%s → ROL_NO_PERMITIDO y no escribe nada', async (_rol, actor) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await quitar(prueba, actor, PL2D, CON_4_EN_PROGRESO)).toMatchObject({
      ok: false,
      codigo: 'ROL_NO_PERMITIDO',
    });
    igual();
  });

  it('Administrador INACTIVO → USUARIO_INACTIVO; actor inexistente → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      usuarios: d.usuarios.map((u) => (u.id === ADMIN ? { ...u, estado: 'INACTIVO' } : u)),
    }));
    expect(await quitar(prueba, ADMIN, PL2D, CON_4_EN_PROGRESO)).toMatchObject({
      codigo: 'USUARIO_INACTIVO',
    });
    expect(await quitar(prueba, 'nadie', PL2D, CON_4_EN_PROGRESO)).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
  });

  it.each([
    ['alguien que no está asignado', RSV, CON_4_EN_PROGRESO, 'ASIGNACION_NO_VIGENTE'],
    ['quien ya salió de ese proyecto', TIE, FINALIZADO, 'PROYECTO_FINALIZADO'],
    ['un practicante que no existe', PL2D, 'usr-zz', 'ASIGNACION_NO_VIGENTE'],
    ['un proyecto que no existe', 'pry-zz', CON_4_EN_PROGRESO, 'NO_ENCONTRADO'],
  ])('%s → %s', async (_caso, proyecto, practicante, codigo) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await quitar(prueba, ADMIN, proyecto, practicante);
    expect(r).toMatchObject({ ok: false, codigo });
    if (!r.ok) expect(r.mensaje.length).toBeGreaterThan(10);
    igual();
  });

  it('quitar dos veces: la segunda es ASIGNACION_NO_VIGENTE', async () => {
    const prueba = prepararPrueba();
    await quitar(prueba, ADMIN, PL2D, CON_4_EN_PROGRESO);
    expect(await quitar(prueba, ADMIN, PL2D, CON_4_EN_PROGRESO)).toMatchObject({
      ok: false,
      codigo: 'ASIGNACION_NO_VIGENTE',
    });
  });

  it('un motivo que no es texto → DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    const r = await quitarPracticante(
      { idActor: ADMIN, idProyecto: PL2D, idPracticante: CON_4_EN_PROGRESO, motivo: 3 as never },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
  });
});

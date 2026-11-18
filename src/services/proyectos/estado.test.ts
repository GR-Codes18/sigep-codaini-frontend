import { describe, expect, it } from 'vitest';
import type { Id } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import type { Resultado } from '../resultado';
import { equipoDelProyecto } from './comun';
import {
  finalizarProyecto,
  pausarProyecto,
  reactivarProyecto,
  reanudarProyecto,
  type EntradaCambiarEstadoProyecto,
} from './estado';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // PL2D y RSV
const PRACTICANTE = 'demo-practicante'; // en PL2D
const PL2D = 'pry-pl2d'; // activo; con 2 tareas esperando supervisión y 9 en progreso
const INV = 'pry-inv'; // en pausa; con 1 tarea esperando y 1 en progreso
const TIE = 'pry-tie'; // finalizado; supervisor usr-sup-02
const DAT = 'pry-dat'; // activo; solo tareas disponibles y sin equipo
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

type Servicio<T = unknown> = (
  entrada: EntradaCambiarEstadoProyecto,
  entorno: PruebaPreparada['entorno'],
) => Promise<Resultado<T>>;

/** La nota por defecto es válida; para probar «sin nota» se pasa `null`, que se convierte en `undefined`. */
const ejecutar = <T>(
  servicio: Servicio<T>,
  p: PruebaPreparada,
  idProyecto: Id,
  nota: string | null = 'Motivo del cambio.',
  idActor: Id = ADMIN,
) => servicio({ idActor, idProyecto, nota: nota ?? undefined }, p.entorno);

const proyecto = (p: PruebaPreparada, id: Id) => p.datos().proyectos.find((x) => x.id === id)!;

/** Deja terminadas las tareas que esperan supervisión de un proyecto, para poder finalizarlo. */
function sinTareasEsperando(p: PruebaPreparada, id: Id) {
  p.modificar((d) => ({
    tareas: d.tareas.map((t) =>
      t.id_proyecto === id && t.estado === 'ESPERANDO_SUPERVISION'
        ? { ...t, estado: 'TERMINADA' as const }
        : t,
    ),
  }));
}

function inactivar(p: PruebaPreparada, id: Id) {
  p.modificar((d) => ({
    usuarios: d.usuarios.map((u) => (u.id === id ? { ...u, estado: 'INACTIVO' as const } : u)),
  }));
}

// Cada servicio con un proyecto en el estado desde el que se puede ejecutar.
const CASOS: [string, Servicio, Id][] = [
  ['pausarProyecto', pausarProyecto, PL2D],
  ['reanudarProyecto', reanudarProyecto, INV],
  ['finalizarProyecto', finalizarProyecto, DAT],
  ['reactivarProyecto', reactivarProyecto, TIE],
];

describe.each(CASOS)('%s: permisos y nota', (_nombre, servicio, idProyecto) => {
  const correr = (
    p: PruebaPreparada,
    nota: string | null,
    idActor: Id = ADMIN,
    id: Id = idProyecto,
  ) => ejecutar(servicio, p, id, nota, idActor);

  it('el Administrador activo puede, con una sola escritura', async () => {
    const prueba = prepararPrueba();
    const escrituras = prueba.escrituras();
    expect((await correr(prueba, 'Motivo.')).ok).toBe(true);
    expect(prueba.escrituras() - escrituras).toBe(1);
  });

  it.each([
    ['Supervisor del proyecto', SUPERVISOR],
    ['Practicante', PRACTICANTE],
  ])('%s → ROL_NO_PERMITIDO y no escribe nada', async (_rol, actor) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await correr(prueba, 'Motivo.', actor)).toMatchObject({
      ok: false,
      codigo: 'ROL_NO_PERMITIDO',
    });
    igual();
  });

  it('Administrador INACTIVO → USUARIO_INACTIVO; actor o proyecto inexistente → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    expect(await correr(prueba, 'Motivo.', 'nadie')).toMatchObject({ codigo: 'NO_ENCONTRADO' });
    expect(await correr(prueba, 'Motivo.', ADMIN, 'pry-zz')).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    inactivar(prueba, ADMIN);
    expect(await correr(prueba, 'Motivo.')).toMatchObject({ codigo: 'USUARIO_INACTIVO' });
  });

  it.each([
    ['sin nota', null],
    ['nota vacía', ''],
    ['nota de solo espacios', '  \n '],
  ])('%s → TEXTO_OBLIGATORIO y no escribe nada', async (_caso, nota) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await correr(prueba, nota)).toMatchObject({ ok: false, codigo: 'TEXTO_OBLIGATORIO' });
    igual();
  });

  it('una nota que no es texto → DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    expect(await correr(prueba, 5 as never)).toMatchObject({
      ok: false,
      codigo: 'DATOS_INVALIDOS',
    });
  });
});

describe('pausarProyecto', () => {
  it('pasa a EN_PAUSA, deja el evento con la nota y avisa al equipo sin el autor', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const original = proyecto(prueba, PL2D);
    const equipo = equipoDelProyecto(antes, original);

    const r = await ejecutar(pausarProyecto, prueba, PL2D, '  El cliente detuvo el desarrollo.  ');

    expect(r.ok && r.valor).toEqual({ ...original, estado: 'EN_PAUSA' });
    const despues = prueba.datos();
    expect(proyecto(prueba, PL2D).estado).toBe('EN_PAUSA');
    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      tipo_accion: 'PROYECTO_PAUSADO',
      elemento: { tipo: 'PROYECTO', id: PL2D, etiqueta: `PL2D · ${original.nombre}` },
      id_proyecto: PL2D,
      fecha: AHORA_ISO,
      nota: 'El cliente detuvo el desarrollo.',
      cambios: [{ campo: 'estado', valor_anterior: 'ACTIVO', valor_nuevo: 'EN_PAUSA' }],
    });
    const avisos = despues.notificaciones.slice(antes.notificaciones.length);
    expect(avisos.map((n) => n.id_destinatario).sort()).toEqual([...equipo].sort());
    for (const n of avisos) {
      expect(n).toMatchObject({
        tipo: 'PROYECTO_PAUSADO',
        mensaje: `El proyecto ${original.nombre} fue pausado.`,
        elemento: { tipo: 'PROYECTO', id: PL2D },
        leida: false,
      });
    }
    // En pausa todo lo demás sigue igual: ni las tareas ni las asignaciones cambian.
    expect(despues.tareas).toBe(antes.tareas);
    expect(despues.asignaciones).toBe(antes.asignaciones);
  });

  it.each([
    ['uno que ya está en pausa', INV],
    ['uno finalizado', TIE],
  ])('%s → PROYECTO_NO_ACTIVO y no escribe nada', async (_caso, id) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await ejecutar(pausarProyecto, prueba, id);
    expect(r).toMatchObject({ ok: false, codigo: 'PROYECTO_NO_ACTIVO' });
    if (!r.ok) expect(r.mensaje).toContain('proyecto activo');
    igual();
  });
});

describe('reanudarProyecto', () => {
  it('vuelve a ACTIVO, deja el evento y avisa al equipo', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const original = proyecto(prueba, INV);

    const r = await ejecutar(reanudarProyecto, prueba, INV, 'Se definió el presupuesto.');

    expect(r.ok && r.valor).toEqual({ ...original, estado: 'ACTIVO' });
    const despues = prueba.datos();
    expect(despues.historial.at(-1)).toMatchObject({
      tipo_accion: 'PROYECTO_REANUDADO',
      nota: 'Se definió el presupuesto.',
      cambios: [{ campo: 'estado', valor_anterior: 'EN_PAUSA', valor_nuevo: 'ACTIVO' }],
    });
    const avisos = despues.notificaciones.slice(antes.notificaciones.length);
    expect(avisos.length).toBeGreaterThan(0);
    for (const n of avisos) {
      expect(n).toMatchObject({
        tipo: 'PROYECTO_REANUDADO',
        mensaje: `El proyecto ${original.nombre} fue reanudado.`,
      });
    }
  });

  it.each([
    ['uno activo', PL2D],
    ['uno finalizado', TIE],
  ])('%s → PROYECTO_NO_EN_PAUSA y no escribe nada', async (_caso, id) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await ejecutar(reanudarProyecto, prueba, id)).toMatchObject({
      ok: false,
      codigo: 'PROYECTO_NO_EN_PAUSA',
    });
    igual();
  });

  it('pausar y reanudar dejan al proyecto como estaba', async () => {
    const prueba = prepararPrueba();
    const original = proyecto(prueba, PL2D);
    await ejecutar(pausarProyecto, prueba, PL2D);
    await ejecutar(reanudarProyecto, prueba, PL2D);
    expect(proyecto(prueba, PL2D)).toEqual(original);
  });
});

describe('finalizarProyecto', () => {
  it('libera las tareas en progreso, fija la fecha real y avisa al equipo y a cada responsable', async () => {
    const prueba = prepararPrueba();
    sinTareasEsperando(prueba, PL2D);
    const antes = prueba.datos();
    const original = proyecto(prueba, PL2D);
    const equipo = equipoDelProyecto(antes, original);
    const enProgreso = antes.tareas.filter(
      (t) => t.id_proyecto === PL2D && t.estado === 'EN_PROGRESO',
    );
    expect(enProgreso).toHaveLength(9);
    const escrituras = prueba.escrituras();

    const r = await ejecutar(finalizarProyecto, prueba, PL2D, '  Entrega aceptada.  ');

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(prueba.escrituras() - escrituras).toBe(1);
    expect(r.valor.proyecto).toEqual({
      ...original,
      estado: 'FINALIZADO',
      fecha_fin_real: '2026-11-17',
    });
    expect(r.valor.tareas_liberadas).toEqual(enProgreso.map((t) => t.id));

    const despues = prueba.datos();
    for (const t of enProgreso) {
      expect(despues.tareas.find((x) => x.id === t.id)).toMatchObject({
        estado: 'DISPONIBLE',
        id_practicante: null,
      });
    }
    // Las tareas terminadas, las disponibles y las asignaciones no se tocan.
    const liberadas = new Set(enProgreso.map((t) => t.id));
    expect(despues.tareas.filter((t) => !liberadas.has(t.id))).toEqual(
      antes.tareas.filter((t) => !liberadas.has(t.id)),
    );
    expect(despues.asignaciones).toBe(antes.asignaciones);

    // Un evento del proyecto y uno de liberación por cada tarea.
    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos.map((e) => e.tipo_accion)).toEqual([
      'PROYECTO_FINALIZADO',
      ...Array(9).fill('TAREA_LIBERADA'),
    ]);
    expect(eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      id_proyecto: PL2D,
      nota: 'Entrega aceptada.',
      cambios: [
        { campo: 'estado', valor_anterior: 'ACTIVO', valor_nuevo: 'FINALIZADO' },
        { campo: 'fecha_fin_real', valor_anterior: null, valor_nuevo: '2026-11-17' },
      ],
    });
    expect(
      eventos.slice(1).every((e) => e.nota === 'Entrega aceptada.' && e.id_proyecto === PL2D),
    ).toBe(true);

    // Avisos: al equipo (proyecto finalizado) y a cada responsable (tarea liberada).
    const avisos = despues.notificaciones.slice(antes.notificaciones.length);
    const delProyecto = avisos.filter((n) => n.tipo === 'PROYECTO_FINALIZADO');
    expect(delProyecto.map((n) => n.id_destinatario).sort()).toEqual([...equipo].sort());
    expect(delProyecto[0].mensaje).toBe(`El proyecto ${original.nombre} fue finalizado.`);
    const deTareas = avisos.filter((n) => n.tipo === 'TAREA_LIBERADA');
    expect(deTareas).toHaveLength(9);
    expect(deTareas.map((n) => n.id_destinatario).sort()).toEqual(
      enProgreso.map((t) => t.id_practicante).sort(),
    );
    expect(deTareas[0].mensaje).toMatch(/^Liberaron tu tarea «.+» \(PL2D-\d{3}\)\.$/);
  });

  it('con tareas esperando supervisión se bloquea, con la cantidad, y no escribe nada', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await ejecutar(finalizarProyecto, prueba, PL2D);
    expect(r).toMatchObject({ ok: false, codigo: 'TAREAS_ESPERANDO_SUPERVISION' });
    if (!r.ok) expect(r.mensaje).toContain('2 tareas esperando supervisión');
    igual();
  });

  it('una sola tarea esperando: el mensaje va en singular', async () => {
    const prueba = prepararPrueba();
    const r = await ejecutar(finalizarProyecto, prueba, INV);
    expect(r).toMatchObject({ ok: false, codigo: 'TAREAS_ESPERANDO_SUPERVISION' });
    if (!r.ok) expect(r.mensaje).toContain('1 tarea esperando supervisión');
  });

  it('también se puede finalizar un proyecto EN_PAUSA', async () => {
    const prueba = prepararPrueba();
    sinTareasEsperando(prueba, INV);
    const r = await ejecutar(finalizarProyecto, prueba, INV);
    expect(r.ok && r.valor.proyecto.estado).toBe('FINALIZADO');
    expect(r.ok && r.valor.tareas_liberadas).toEqual(['tar-inv-002']);
  });

  it('sin tareas en progreso: solo se fija el estado y la fecha, sin tocar las tareas', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const r = await ejecutar(finalizarProyecto, prueba, DAT);
    expect(r.ok && r.valor.tareas_liberadas).toEqual([]);
    const despues = prueba.datos();
    expect(despues.tareas).toBe(antes.tareas);
    expect(despues.historial.slice(antes.historial.length).map((e) => e.tipo_accion)).toEqual([
      'PROYECTO_FINALIZADO',
    ]);
    // El equipo de DAT es solo su supervisor: recibe el aviso.
    expect(
      despues.notificaciones.slice(antes.notificaciones.length).map((n) => n.id_destinatario),
    ).toEqual(['usr-sup-02']);
  });

  it('la fecha real es el día de Perú: las 22:00 de Lima (03:00Z del día siguiente) son el mismo día', async () => {
    const prueba = prepararPrueba();
    prueba.fijarAhora(new Date('2026-11-18T03:00:00.000Z'));
    const r = await ejecutar(finalizarProyecto, prueba, DAT);
    expect(r.ok && r.valor.proyecto.fecha_fin_real).toBe('2026-11-17');
  });

  it('uno que ya está finalizado → PROYECTO_YA_FINALIZADO', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await ejecutar(finalizarProyecto, prueba, TIE)).toMatchObject({
      ok: false,
      codigo: 'PROYECTO_YA_FINALIZADO',
    });
    igual();
  });

  it('en un proyecto finalizado ya no se pueden tomar tareas', async () => {
    const prueba = prepararPrueba();
    sinTareasEsperando(prueba, PL2D);
    await ejecutar(finalizarProyecto, prueba, PL2D);
    // `puede()` deniega las acciones de tareas del proyecto finalizado a todos.
    const { tomarTarea } = await import('../tareas');
    const r = await tomarTarea({ idActor: PRACTICANTE, idTarea: 'tar-pl2d-010' }, prueba.entorno);
    expect(r).toMatchObject({ ok: false, codigo: 'PROYECTO_FINALIZADO' });
  });
});

describe('reactivarProyecto', () => {
  it('vuelve a ACTIVO, limpia la fecha real y no avisa a nadie (G2-A)', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const original = proyecto(prueba, TIE);
    expect(original.fecha_fin_real).not.toBeNull();
    const escrituras = prueba.escrituras();

    const r = await ejecutar(reactivarProyecto, prueba, TIE, '  Falta una entrega.  ');

    expect(r.ok && r.valor).toEqual({ ...original, estado: 'ACTIVO', fecha_fin_real: null });
    expect(prueba.escrituras() - escrituras).toBe(1);
    const despues = prueba.datos();
    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      tipo_accion: 'PROYECTO_REACTIVADO',
      id_proyecto: TIE,
      nota: 'Falta una entrega.',
      cambios: [
        { campo: 'estado', valor_anterior: 'FINALIZADO', valor_nuevo: 'ACTIVO' },
        { campo: 'fecha_fin_real', valor_anterior: original.fecha_fin_real, valor_nuevo: null },
      ],
    });
    // Sin avisos; las asignaciones nunca se cerraron, así que el equipo recupera su acceso.
    expect(despues.notificaciones).toBe(antes.notificaciones);
    expect(despues.asignaciones).toBe(antes.asignaciones);
    expect(despues.tareas).toBe(antes.tareas);
  });

  it('con el supervisor INACTIVO → SUPERVISOR_DEL_PROYECTO_INACTIVO y no escribe nada', async () => {
    const prueba = prepararPrueba();
    inactivar(prueba, 'usr-sup-02');
    const igual = sinEscritura(prueba);
    const r = await ejecutar(reactivarProyecto, prueba, TIE);
    expect(r).toMatchObject({ ok: false, codigo: 'SUPERVISOR_DEL_PROYECTO_INACTIVO' });
    if (!r.ok) expect(r.mensaje).toContain('reactívalo');
    igual();
  });

  it('el supervisor se comprueba antes que la nota', async () => {
    const prueba = prepararPrueba();
    inactivar(prueba, 'usr-sup-02');
    expect(await ejecutar(reactivarProyecto, prueba, TIE, '')).toMatchObject({
      codigo: 'SUPERVISOR_DEL_PROYECTO_INACTIVO',
    });
  });

  it.each([
    ['uno activo', PL2D],
    ['uno en pausa', INV],
  ])('%s → PROYECTO_NO_FINALIZADO y no escribe nada', async (_caso, id) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await ejecutar(reactivarProyecto, prueba, id)).toMatchObject({
      ok: false,
      codigo: 'PROYECTO_NO_FINALIZADO',
    });
    igual();
  });

  it('finalizar y reactivar dejan las tareas liberadas disponibles y al proyecto sin fecha real', async () => {
    const prueba = prepararPrueba();
    sinTareasEsperando(prueba, PL2D);
    await ejecutar(finalizarProyecto, prueba, PL2D);
    const r = await ejecutar(reactivarProyecto, prueba, PL2D);
    expect(r.ok && r.valor).toMatchObject({ estado: 'ACTIVO', fecha_fin_real: null });
    expect(prueba.datos().tareas.find((t) => t.id === 'tar-pl2d-010')).toMatchObject({
      estado: 'DISPONIBLE',
      id_practicante: null,
    });
  });
});

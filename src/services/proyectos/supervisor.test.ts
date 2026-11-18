import { describe, expect, it } from 'vitest';
import type { Id } from '@/domain';
import { desactivarSupervisor } from '../supervisores';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import { cambiarSupervisor, reasignarProyectosDeSupervisor } from './supervisor';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // PL2D y RSV
const SUPERVISOR_02 = 'usr-sup-02'; // TIE (finalizado) y DAT
const SUPERVISOR_03 = 'usr-sup-03'; // INV (en pausa)
const PRACTICANTE = 'demo-practicante';
const PL2D = 'pry-pl2d';
const RSV = 'pry-rsv';
const INV = 'pry-inv';
const TIE = 'pry-tie'; // finalizado
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

const cambiar = (p: PruebaPreparada, idProyecto: Id, idNuevoSupervisor: Id, idActor: Id = ADMIN) =>
  cambiarSupervisor({ idActor, idProyecto, idNuevoSupervisor }, p.entorno);

const reasignar = (
  p: PruebaPreparada,
  reasignaciones: { idProyecto: Id; idNuevoSupervisor: Id }[],
  idSupervisor: Id = SUPERVISOR,
  idActor: Id = ADMIN,
) => reasignarProyectosDeSupervisor({ idActor, idSupervisor, reasignaciones }, p.entorno);

const proyecto = (p: PruebaPreparada, id: Id) => p.datos().proyectos.find((x) => x.id === id)!;
const usuario = (p: PruebaPreparada, id: Id) => p.datos().usuarios.find((u) => u.id === id)!;

function inactivar(p: PruebaPreparada, id: Id) {
  p.modificar((d) => ({
    usuarios: d.usuarios.map((u) => (u.id === id ? { ...u, estado: 'INACTIVO' as const } : u)),
  }));
}

describe('cambiarSupervisor', () => {
  it('cambia el supervisor, deja el evento y avisa al nuevo y al anterior', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const original = proyecto(prueba, PL2D);
    const escrituras = prueba.escrituras();

    const r = await cambiar(prueba, PL2D, SUPERVISOR_02);

    expect(r.ok && r.valor).toEqual({ ...original, id_supervisor: SUPERVISOR_02 });
    expect(prueba.escrituras() - escrituras).toBe(1);
    const despues = prueba.datos();
    expect(proyecto(prueba, PL2D).id_supervisor).toBe(SUPERVISOR_02);

    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      tipo_accion: 'PROYECTO_SUPERVISOR_CAMBIADO',
      elemento: { tipo: 'PROYECTO', id: PL2D },
      id_proyecto: PL2D,
      fecha: AHORA_ISO,
      cambios: [
        {
          campo: 'supervisor',
          valor_anterior: usuario(prueba, SUPERVISOR).nombre,
          valor_nuevo: usuario(prueba, SUPERVISOR_02).nombre,
        },
      ],
    });
    const avisos = despues.notificaciones.slice(antes.notificaciones.length);
    expect(avisos.map((n) => [n.id_destinatario, n.tipo, n.mensaje])).toEqual([
      [
        SUPERVISOR_02,
        'ASIGNADO_A_PROYECTO',
        `Te asignaron como supervisor del proyecto ${original.nombre}.`,
      ],
      [
        SUPERVISOR,
        'QUITADO_DE_PROYECTO',
        `Ya no eres el supervisor del proyecto ${original.nombre}.`,
      ],
    ]);
    expect(avisos.every((n) => n.elemento.tipo === 'PROYECTO' && n.elemento.id === PL2D)).toBe(
      true,
    );
  });

  it('las tareas que esperaban supervisión pasan al nuevo supervisor sin tocarlas', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    await cambiar(prueba, PL2D, SUPERVISOR_02);
    const despues = prueba.datos();
    // Las tareas no se tocan: el supervisor es un dato del proyecto.
    expect(despues.tareas).toBe(antes.tareas);
    const esperando = despues.tareas.filter(
      (t) => t.id_proyecto === PL2D && t.estado === 'ESPERANDO_SUPERVISION',
    );
    expect(esperando).toHaveLength(2);
    expect(proyecto(prueba, PL2D).id_supervisor).toBe(SUPERVISOR_02);
    // Las asignaciones del equipo tampoco cambian.
    expect(despues.asignaciones).toBe(antes.asignaciones);
  });

  it('un proyecto EN_PAUSA también se puede cambiar', async () => {
    const prueba = prepararPrueba();
    expect((await cambiar(prueba, INV, SUPERVISOR)).ok).toBe(true);
  });

  it.each([
    ['el mismo supervisor', PL2D, SUPERVISOR, 'MISMO_SUPERVISOR'],
    ['un practicante', PL2D, PRACTICANTE, 'SUPERVISOR_NO_VALIDO'],
    ['el administrador', PL2D, ADMIN, 'SUPERVISOR_NO_VALIDO'],
    ['un proyecto finalizado', TIE, SUPERVISOR, 'PROYECTO_FINALIZADO'],
  ])('%s → %s y no escribe nada', async (_caso, idProyecto, nuevo, codigo) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await cambiar(prueba, idProyecto, nuevo);
    expect(r).toMatchObject({ ok: false, codigo });
    if (!r.ok) expect(r.mensaje.length).toBeGreaterThan(10);
    igual();
  });

  it('un supervisor nuevo inactivo → SUPERVISOR_NO_VALIDO', async () => {
    const prueba = prepararPrueba();
    inactivar(prueba, SUPERVISOR_02);
    const igual = sinEscritura(prueba);
    expect(await cambiar(prueba, PL2D, SUPERVISOR_02)).toMatchObject({
      ok: false,
      codigo: 'SUPERVISOR_NO_VALIDO',
    });
    igual();
  });

  it.each([
    ['Supervisor del proyecto', SUPERVISOR],
    ['Supervisor ajeno', SUPERVISOR_02],
    ['Practicante', PRACTICANTE],
  ])('%s → ROL_NO_PERMITIDO y no escribe nada', async (_rol, actor) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await cambiar(prueba, PL2D, SUPERVISOR_03, actor)).toMatchObject({
      ok: false,
      codigo: 'ROL_NO_PERMITIDO',
    });
    igual();
  });

  it('Administrador INACTIVO → USUARIO_INACTIVO; actor, proyecto o supervisor nuevo inexistente → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    expect(await cambiar(prueba, PL2D, SUPERVISOR_02, 'nadie')).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    expect(await cambiar(prueba, 'pry-zz', SUPERVISOR_02)).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    const r = await cambiar(prueba, PL2D, 'usr-zz');
    expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    expect(r.ok ? {} : r.campos).toHaveProperty('idNuevoSupervisor');
    inactivar(prueba, ADMIN);
    expect(await cambiar(prueba, PL2D, SUPERVISOR_02)).toMatchObject({
      codigo: 'USUARIO_INACTIVO',
    });
  });
});

describe('reasignarProyectosDeSupervisor (G4-A)', () => {
  it('reasigna todos los proyectos del supervisor en una sola operación, con un evento por proyecto y uno del supervisor', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const escrituras = prueba.escrituras();
    const saliente = usuario(prueba, SUPERVISOR);

    const r = await reasignar(prueba, [
      { idProyecto: PL2D, idNuevoSupervisor: SUPERVISOR_02 },
      { idProyecto: RSV, idNuevoSupervisor: SUPERVISOR_03 },
    ]);

    expect(r.ok && r.valor.map((p) => [p.id, p.id_supervisor])).toEqual([
      [PL2D, SUPERVISOR_02],
      [RSV, SUPERVISOR_03],
    ]);
    expect(prueba.escrituras() - escrituras).toBe(1);
    const despues = prueba.datos();
    expect(proyecto(prueba, PL2D).id_supervisor).toBe(SUPERVISOR_02);
    expect(proyecto(prueba, RSV).id_supervisor).toBe(SUPERVISOR_03);
    // Los demás proyectos no cambian.
    expect(despues.proyectos.filter((p) => p.id !== PL2D && p.id !== RSV)).toEqual(
      antes.proyectos.filter((p) => p.id !== PL2D && p.id !== RSV),
    );

    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos.map((e) => [e.tipo_accion, e.id_proyecto])).toEqual([
      ['PROYECTO_SUPERVISOR_CAMBIADO', PL2D],
      ['PROYECTO_SUPERVISOR_CAMBIADO', RSV],
      ['SUPERVISOR_PROYECTOS_REASIGNADOS', null],
    ]);
    expect(eventos[2]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      elemento: { tipo: 'USUARIO', id: SUPERVISOR, etiqueta: saliente.nombre },
      fecha: AHORA_ISO,
      cambios: [{ campo: 'proyectos', valor_anterior: null, valor_nuevo: 'PL2D, RSV' }],
    });
    expect(eventos.every((e) => e.fecha === AHORA_ISO)).toBe(true);

    // Por cada proyecto: aviso al nuevo y al anterior.
    const avisos = despues.notificaciones.slice(antes.notificaciones.length);
    expect(avisos.map((n) => [n.id_destinatario, n.tipo, n.elemento.id])).toEqual([
      [SUPERVISOR_02, 'ASIGNADO_A_PROYECTO', PL2D],
      [SUPERVISOR, 'QUITADO_DE_PROYECTO', PL2D],
      [SUPERVISOR_03, 'ASIGNADO_A_PROYECTO', RSV],
      [SUPERVISOR, 'QUITADO_DE_PROYECTO', RSV],
    ]);
  });

  it('después de reasignarlos todos, el supervisor ya se puede desactivar', async () => {
    const prueba = prepararPrueba();
    expect(
      await desactivarSupervisor({ idActor: ADMIN, idSupervisor: SUPERVISOR }, prueba.entorno),
    ).toMatchObject({
      codigo: 'SUPERVISOR_CON_PROYECTOS',
    });
    await reasignar(prueba, [
      { idProyecto: PL2D, idNuevoSupervisor: SUPERVISOR_02 },
      { idProyecto: RSV, idNuevoSupervisor: SUPERVISOR_02 },
    ]);
    const r = await desactivarSupervisor(
      { idActor: ADMIN, idSupervisor: SUPERVISOR },
      prueba.entorno,
    );
    expect(r.ok && r.valor.estado).toBe('INACTIVO');
  });

  it('reasignar solo una parte es válido; el supervisor sigue sin poder desactivarse (con la cantidad que queda)', async () => {
    const prueba = prepararPrueba();
    expect(
      (await reasignar(prueba, [{ idProyecto: PL2D, idNuevoSupervisor: SUPERVISOR_02 }])).ok,
    ).toBe(true);
    const r = await desactivarSupervisor(
      { idActor: ADMIN, idSupervisor: SUPERVISOR },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'SUPERVISOR_CON_PROYECTOS' });
    expect(!r.ok && r.mensaje).toContain('1 proyecto activo o en pausa');
  });

  it('es todo o nada: si un proyecto falla, ninguno se reasigna y se señala cuál', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await reasignar(prueba, [
      { idProyecto: PL2D, idNuevoSupervisor: SUPERVISOR_02 },
      { idProyecto: INV, idNuevoSupervisor: SUPERVISOR_02 }, // es de otro supervisor
    ]);
    expect(r).toMatchObject({ ok: false, codigo: 'PROYECTO_NO_ES_DEL_SUPERVISOR' });
    expect(r.ok ? {} : r.campos).toHaveProperty(['reasignaciones.1']);
    igual();
    expect(proyecto(prueba, PL2D).id_supervisor).toBe(SUPERVISOR);
  });

  it.each([
    [
      'un proyecto finalizado',
      [{ idProyecto: TIE, idNuevoSupervisor: SUPERVISOR }],
      SUPERVISOR_02,
      'PROYECTO_FINALIZADO',
    ],
    [
      'el mismo supervisor',
      [{ idProyecto: PL2D, idNuevoSupervisor: SUPERVISOR }],
      SUPERVISOR,
      'MISMO_SUPERVISOR',
    ],
    [
      'un practicante como nuevo',
      [{ idProyecto: PL2D, idNuevoSupervisor: PRACTICANTE }],
      SUPERVISOR,
      'SUPERVISOR_NO_VALIDO',
    ],
    [
      'un proyecto que no existe',
      [{ idProyecto: 'pry-zz', idNuevoSupervisor: SUPERVISOR_02 }],
      SUPERVISOR,
      'NO_ENCONTRADO',
    ],
    [
      'un nuevo supervisor que no existe',
      [{ idProyecto: PL2D, idNuevoSupervisor: 'usr-zz' }],
      SUPERVISOR,
      'NO_ENCONTRADO',
    ],
  ])('%s → %s y no escribe nada', async (_caso, pares, saliente, codigo) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await reasignar(prueba, pares, saliente);
    expect(r).toMatchObject({ ok: false, codigo });
    expect(r.ok ? {} : r.campos).toHaveProperty(['reasignaciones.0']);
    igual();
  });

  it('un nuevo supervisor inactivo → SUPERVISOR_NO_VALIDO', async () => {
    const prueba = prepararPrueba();
    inactivar(prueba, SUPERVISOR_02);
    expect(
      await reasignar(prueba, [{ idProyecto: PL2D, idNuevoSupervisor: SUPERVISOR_02 }]),
    ).toMatchObject({
      codigo: 'SUPERVISOR_NO_VALIDO',
    });
  });

  it.each([
    ['la lista vacía', []],
    [
      'el mismo proyecto dos veces',
      [
        { idProyecto: PL2D, idNuevoSupervisor: SUPERVISOR_02 },
        { idProyecto: PL2D, idNuevoSupervisor: SUPERVISOR_03 },
      ],
    ],
  ])('%s → DATOS_INVALIDOS', async (_caso, pares) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await reasignar(prueba, pares)).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    igual();
  });

  it.each([
    ['Supervisor', SUPERVISOR],
    ['Supervisor ajeno', SUPERVISOR_02],
    ['Practicante', PRACTICANTE],
  ])('%s → ROL_NO_PERMITIDO y no escribe nada', async (_rol, actor) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(
      await reasignar(
        prueba,
        [{ idProyecto: PL2D, idNuevoSupervisor: SUPERVISOR_03 }],
        SUPERVISOR,
        actor,
      ),
    ).toMatchObject({ ok: false, codigo: 'ROL_NO_PERMITIDO' });
    igual();
  });

  it('Administrador INACTIVO → USUARIO_INACTIVO; actor o supervisor saliente inexistente → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    const par = [{ idProyecto: PL2D, idNuevoSupervisor: SUPERVISOR_02 }];
    expect(await reasignar(prueba, par, SUPERVISOR, 'nadie')).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    expect(await reasignar(prueba, par, 'usr-zz')).toMatchObject({ codigo: 'NO_ENCONTRADO' });
    inactivar(prueba, ADMIN);
    expect(await reasignar(prueba, par)).toMatchObject({ codigo: 'USUARIO_INACTIVO' });
  });
});

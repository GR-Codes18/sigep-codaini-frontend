import { describe, expect, it } from 'vitest';
import type { Id } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { notificarDesdeInsight } from './insights';
import { marcarNotificacionLeida, marcarTodasLeidas } from './notificaciones';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // ntf-0078 y ntf-0081 sin leer
const PRACTICANTE = 'demo-practicante'; // ntf-0079 sin leer; ntf-0029 leída
const FINALIZADO = 'usr-pra-19';

const una = (p: PruebaPreparada, idActor: Id, idNotificacion: Id) =>
  marcarNotificacionLeida({ idActor, idNotificacion }, p.entorno);
const todas = (p: PruebaPreparada, idActor: Id) => marcarTodasLeidas({ idActor }, p.entorno);
const aviso = (p: PruebaPreparada, id: Id) => p.datos().notificaciones.find((n) => n.id === id)!;
const sinLeer = (p: PruebaPreparada, idUsuario: Id) =>
  p
    .datos()
    .notificaciones.filter((n) => n.id_destinatario === idUsuario && !n.leida)
    .map((n) => n.id);

describe('marcarNotificacionLeida', () => {
  it('marca la suya como leída, en una sola escritura y sin tocar nada más', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const escrituras = prueba.escrituras();
    expect(aviso(prueba, 'ntf-0079').leida).toBe(false);

    const r = await una(prueba, PRACTICANTE, 'ntf-0079');

    expect(r).toEqual({
      ok: true,
      valor: { ...antes.notificaciones.find((n) => n.id === 'ntf-0079')!, leida: true },
    });
    expect(prueba.escrituras() - escrituras).toBe(1);
    const despues = prueba.datos();
    expect(aviso(prueba, 'ntf-0079').leida).toBe(true);
    // Solo cambia esa: las demás quedan iguales.
    expect(despues.notificaciones.filter((n) => n.id !== 'ntf-0079')).toEqual(
      antes.notificaciones.filter((n) => n.id !== 'ntf-0079'),
    );
    expect(despues.notificaciones).toHaveLength(antes.notificaciones.length);
    expect(despues.historial).toBe(antes.historial);
  });

  it('una que ya estaba leída: éxito sin escribir nada (idempotente)', async () => {
    const prueba = prepararPrueba();
    expect(aviso(prueba, 'ntf-0029').leida).toBe(true);
    const verificar = sinEscritura(prueba);
    const r = await una(prueba, PRACTICANTE, 'ntf-0029');
    expect(r).toMatchObject({ ok: true, valor: { id: 'ntf-0029', leida: true } });
    verificar();
  });

  it('marcarla dos veces seguidas escribe una sola vez', async () => {
    const prueba = prepararPrueba();
    await una(prueba, PRACTICANTE, 'ntf-0079');
    const verificar = sinEscritura(prueba);
    expect((await una(prueba, PRACTICANTE, 'ntf-0079')).ok).toBe(true);
    verificar();
  });

  it('la de otra persona es NO_ENCONTRADO, igual que una inexistente, y no se toca', async () => {
    const prueba = prepararPrueba();
    const verificar = sinEscritura(prueba);
    const ajena = await una(prueba, ADMIN, 'ntf-0079');
    const inexistente = await una(prueba, ADMIN, 'ntf-9999');
    expect(ajena).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    expect(ajena).toEqual(inexistente);
    verificar();
    expect(aviso(prueba, 'ntf-0079').leida).toBe(false);
  });

  it('un actor que no existe es NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    const r = await una(prueba, 'usr-fantasma', 'ntf-0079');
    expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
  });

  it('un usuario INACTIVO no puede, ni con una notificación suya', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      usuarios: d.usuarios.map((u) =>
        u.id === PRACTICANTE ? { ...u, estado: 'INACTIVO' as const } : u,
      ),
    }));
    const verificar = sinEscritura(prueba);
    const r = await una(prueba, PRACTICANTE, 'ntf-0079');
    expect(r).toMatchObject({ ok: false, codigo: 'USUARIO_INACTIVO' });
    verificar();
  });

  it('un identificador vacío es DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    expect(await una(prueba, PRACTICANTE, '')).toMatchObject({
      ok: false,
      codigo: 'DATOS_INVALIDOS',
    });
    expect(await una(prueba, '', 'ntf-0079')).toMatchObject({
      ok: false,
      codigo: 'DATOS_INVALIDOS',
    });
  });

  it('flujo: el Administrador avisa desde un insight y la persona avisada la marca como leída', async () => {
    const prueba = prepararPrueba();
    await notificarDesdeInsight(
      {
        idActor: ADMIN,
        tipo_regla: 'PRACTICANTE_INACTIVO',
        elemento: { tipo: 'USUARIO', id: 'usr-pra-05' },
      },
      prueba.entorno,
    );
    const nueva = prueba.datos().notificaciones.at(-1)!;
    expect(nueva).toMatchObject({ id_destinatario: 'usr-pra-05', leida: false });
    expect(sinLeer(prueba, 'usr-pra-05')).toContain(nueva.id);

    const r = await una(prueba, 'usr-pra-05', nueva.id);
    expect(r.ok).toBe(true);
    expect(sinLeer(prueba, 'usr-pra-05')).not.toContain(nueva.id);
  });
});

describe('marcarTodasLeidas', () => {
  it('marca todas las suyas sin leer y deja las de los demás', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const escrituras = prueba.escrituras();
    expect(sinLeer(prueba, SUPERVISOR)).toEqual(['ntf-0078', 'ntf-0081']);
    const ajenasSinLeer = sinLeer(prueba, PRACTICANTE);

    const r = await todas(prueba, SUPERVISOR);

    expect(r).toEqual({ ok: true, valor: { marcadas: 2 } });
    expect(prueba.escrituras() - escrituras).toBe(1);
    expect(sinLeer(prueba, SUPERVISOR)).toEqual([]);
    expect(sinLeer(prueba, PRACTICANTE)).toEqual(ajenasSinLeer);
    const despues = prueba.datos();
    expect(despues.notificaciones).toHaveLength(antes.notificaciones.length);
    // Lo ya leído y lo de los demás queda idéntico; solo cambia `leida`.
    for (const n of despues.notificaciones) {
      const previa = antes.notificaciones.find((x) => x.id === n.id)!;
      expect(n).toEqual(n.id_destinatario === SUPERVISOR ? { ...previa, leida: true } : previa);
    }
    expect(despues.historial).toBe(antes.historial);
  });

  it('sin nada pendiente: marcadas 0 y no escribe (idempotente)', async () => {
    const prueba = prepararPrueba();
    expect(sinLeer(prueba, ADMIN)).toEqual([]);
    const verificar = sinEscritura(prueba);
    const r = await todas(prueba, ADMIN);
    expect(r).toEqual({ ok: true, valor: { marcadas: 0 } });
    verificar();
  });

  it('repetirla no vuelve a escribir', async () => {
    const prueba = prepararPrueba();
    await todas(prueba, SUPERVISOR);
    const verificar = sinEscritura(prueba);
    expect(await todas(prueba, SUPERVISOR)).toEqual({ ok: true, valor: { marcadas: 0 } });
    verificar();
  });

  it('un actor que no existe es NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    expect(await todas(prueba, 'usr-fantasma')).toMatchObject({
      ok: false,
      codigo: 'NO_ENCONTRADO',
    });
  });

  it('un usuario INACTIVO no puede, aunque tenga avisos sin leer', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      usuarios: d.usuarios.map((u) =>
        u.id === SUPERVISOR ? { ...u, estado: 'INACTIVO' as const } : u,
      ),
    }));
    const verificar = sinEscritura(prueba);
    const r = await todas(prueba, SUPERVISOR);
    expect(r).toMatchObject({ ok: false, codigo: 'USUARIO_INACTIVO' });
    verificar();
  });

  it('un practicante finalizado no tiene acceso a sus avisos', async () => {
    const prueba = prepararPrueba();
    expect(await todas(prueba, FINALIZADO)).toMatchObject({
      ok: false,
      codigo: 'USUARIO_INACTIVO',
    });
  });

  it('un identificador vacío es DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    expect(await todas(prueba, '')).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
  });
});

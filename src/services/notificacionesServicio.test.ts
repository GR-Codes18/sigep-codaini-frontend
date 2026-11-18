import { describe, expect, it } from 'vitest';
import { crearEntornoDePrueba } from './pruebas/entorno';
import { marcarNotificacionLeida, marcarTodasNotificacionesLeidas } from './notificaciones';

function usuarioDe(almacen: ReturnType<typeof crearEntornoDePrueba>['almacen'], rol: string) {
  const usuario = almacen.getState().datos.usuarios.find((item) => item.rol === rol);
  if (!usuario) throw new Error(`Falta usuario de rol ${rol} en la semilla.`);
  return usuario;
}

describe('marcarNotificacionLeida', () => {
  it('marca solo la notificación propia y hace una escritura', async () => {
    const { entorno, almacen, escrituras } = crearEntornoDePrueba();
    const actor = usuarioDe(almacen, 'PRACTICANTE');
    const propia = almacen
      .getState()
      .datos.notificaciones.find((item) => item.id_destinatario === actor.id && !item.leida);
    if (!propia) throw new Error('La semilla debe contener una notificación propia sin leer.');
    const ajena = almacen
      .getState()
      .datos.notificaciones.find((item) => item.id_destinatario !== actor.id && !item.leida);
    if (!ajena) throw new Error('La semilla debe contener una notificación ajena sin leer.');
    const antes = escrituras();

    await expect(
      marcarNotificacionLeida({ idActor: actor.id, idNotificacion: propia.id }, entorno),
    ).resolves.toEqual({ ok: true, valor: undefined });

    expect(
      almacen.getState().datos.notificaciones.find((item) => item.id === propia.id)?.leida,
    ).toBe(true);
    expect(
      almacen.getState().datos.notificaciones.find((item) => item.id === ajena.id)?.leida,
    ).toBe(false);
    expect(escrituras()).toBe(antes + 1);
  });

  it('no revela ni modifica una notificación de otra persona', async () => {
    const { entorno, almacen, escrituras } = crearEntornoDePrueba();
    const actor = usuarioDe(almacen, 'ADMINISTRADOR');
    const ajena = almacen
      .getState()
      .datos.notificaciones.find((item) => item.id_destinatario !== actor.id);
    if (!ajena) throw new Error('La semilla debe contener notificaciones de otras personas.');
    const antes = escrituras();

    await expect(
      marcarNotificacionLeida({ idActor: actor.id, idNotificacion: ajena.id }, entorno),
    ).resolves.toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });

    expect(escrituras()).toBe(antes);
    expect(
      almacen.getState().datos.notificaciones.find((item) => item.id === ajena.id)?.leida,
    ).toBe(ajena.leida);
  });

  it('rechaza a una cuenta inactiva sin escribir', async () => {
    const { entorno, almacen, escrituras } = crearEntornoDePrueba();
    const actor = usuarioDe(almacen, 'PRACTICANTE');
    almacen.getState().transaccion((datos) => ({
      usuarios: datos.usuarios.map((item) =>
        item.id === actor.id ? { ...item, estado: 'INACTIVO' } : item,
      ),
    }));
    const antes = escrituras();
    const propia = almacen
      .getState()
      .datos.notificaciones.find((item) => item.id_destinatario === actor.id);
    if (!propia) throw new Error('La semilla debe contener una notificación propia.');

    await expect(
      marcarNotificacionLeida({ idActor: actor.id, idNotificacion: propia.id }, entorno),
    ).resolves.toMatchObject({ ok: false, codigo: 'USUARIO_INACTIVO' });

    expect(escrituras()).toBe(antes);
  });
});

describe('marcarTodasNotificacionesLeidas', () => {
  it('marca solo los avisos sin leer de la persona que actúa', async () => {
    const { entorno, almacen } = crearEntornoDePrueba();
    const actor = usuarioDe(almacen, 'SUPERVISOR');
    const antes = almacen.getState().datos.notificaciones;
    const ajenaSinLeer = antes.find((item) => item.id_destinatario !== actor.id && !item.leida);

    await expect(marcarTodasNotificacionesLeidas({ idActor: actor.id }, entorno)).resolves.toEqual({
      ok: true,
      valor: undefined,
    });

    const despues = almacen.getState().datos.notificaciones;
    expect(despues.filter((item) => item.id_destinatario === actor.id && !item.leida)).toHaveLength(
      0,
    );
    if (ajenaSinLeer) {
      expect(despues.find((item) => item.id === ajenaSinLeer.id)?.leida).toBe(false);
    }
  });
});

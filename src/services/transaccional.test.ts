import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { puede, tiempoCicloMs, type Id } from '@/domain';
import { obtenerActor } from './actor';
import type { Entorno } from './entorno';
import { etiquetaTarea } from './etiquetas';
import { autorDe, crearEvento, diferencias } from './historial';
import { crearMarca } from './marca';
import { crearNotificaciones } from './notificaciones';
import { AHORA_DE_PRUEBA, crearEntornoDePrueba } from './pruebas/entorno';
import { fallo } from './resultado';
import { conEfectos, ejecutarConsulta, ejecutarServicio } from './transaccional';

/**
 * Dos servicios de ejemplo, escritos aquí solo para probar el contrato que usarán los pasos 5 a 11:
 * validar con `domain/`, escribir, registrar el evento y avisar, todo con una misma marca.
 */
const TAREA_SIN_SUPERVISION = 'tar-pl2d-011'; // «Jefe del primer nivel», de Diego, en progreso
const TAREA_CON_SUPERVISION = 'tar-pl2d-010'; // «Enemigos básicos», del practicante demo, en progreso
const DIEGO = 'usr-pra-02';
const DEMO = 'demo-practicante';
const SUPERVISOR = 'demo-supervisor';

function terminarEjemplo(entorno: Entorno, idActor: Id, idTarea: Id) {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const actor = obtenerActor(datos, idActor);
    if (!actor.ok) return actor;
    const tarea = datos.tareas.find((t) => t.id === idTarea);
    if (tarea === undefined) return fallo('NO_ENCONTRADO');
    const proyecto = datos.proyectos.find((p) => p.id === tarea.id_proyecto)!;
    const nueva = { ...tarea, estado: 'TERMINADA' as const, fecha_termino: marca.ahora };
    const evento = crearEvento(
      {
        autor: autorDe(actor.valor.id),
        tipo_accion: 'TAREA_TERMINADA',
        elemento: { tipo: 'TAREA', id: tarea.id, etiqueta: etiquetaTarea(proyecto, tarea) },
        id_proyecto: proyecto.id,
        cambios: diferencias(tarea, nueva, ['estado', 'fecha_termino']),
      },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: nueva,
      cambios: conEfectos(
        datos,
        { tareas: datos.tareas.map((t) => (t.id === tarea.id ? nueva : t)) },
        { eventos: [evento] },
      ),
    };
  });
}

function enviarEjemplo(entorno: Entorno, idActor: Id, idTarea: Id) {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const actor = obtenerActor(datos, idActor);
    if (!actor.ok) return actor;
    const tarea = datos.tareas.find((t) => t.id === idTarea);
    if (tarea === undefined) return fallo('NO_ENCONTRADO');
    const proyecto = datos.proyectos.find((p) => p.id === tarea.id_proyecto)!;
    // `puede()` pide las asignaciones de quien actúa (no las de todo el proyecto).
    const asignaciones = datos.asignaciones.filter((a) => a.id_practicante === actor.valor.id);
    const permiso = puede(actor.valor, 'ENVIAR_TAREA', { proyecto, tarea, asignaciones });
    if (!permiso.permitido) return fallo(permiso.codigo);
    const nueva = { ...tarea, estado: 'ESPERANDO_SUPERVISION' as const };
    const evento = crearEvento(
      {
        autor: autorDe(actor.valor.id),
        tipo_accion: 'TAREA_ENVIADA_A_SUPERVISION',
        elemento: { tipo: 'TAREA', id: tarea.id, etiqueta: etiquetaTarea(proyecto, tarea) },
        id_proyecto: proyecto.id,
        cambios: diferencias(tarea, nueva, ['estado']),
      },
      marca,
      e.generarId,
    );
    const avisos = crearNotificaciones(
      {
        autor: evento.autor,
        // El supervisor y, por error, el propio autor: este último no debe recibirlo.
        destinatarios: [proyecto.id_supervisor, actor.valor.id],
        tipo: 'TAREA_ENVIADA_A_SUPERVISION',
        mensaje: `${actor.valor.nombre} envió «${tarea.titulo}» a supervisión.`,
        elemento: { tipo: 'TAREA', id: tarea.id },
      },
      datos.usuarios,
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: nueva,
      cambios: conEfectos(
        datos,
        { tareas: datos.tareas.map((t) => (t.id === tarea.id ? nueva : t)) },
        { eventos: [evento], notificaciones: avisos },
      ),
    };
  });
}

describe('ejecutarServicio', () => {
  describe('resultado y escritura', () => {
    it('un éxito escribe una sola vez y devuelve el valor', async () => {
      const { entorno, almacen, escrituras } = crearEntornoDePrueba();
      const antes = escrituras();
      const resultado = await terminarEjemplo(entorno, DIEGO, TAREA_SIN_SUPERVISION);

      expect(resultado.ok).toBe(true);
      expect(escrituras() - antes).toBe(1);
      const guardada = almacen.getState().datos.tareas.find((t) => t.id === TAREA_SIN_SUPERVISION);
      expect(guardada?.estado).toBe('TERMINADA');
      expect(resultado.ok && resultado.valor).toEqual(guardada);
    });

    it('un éxito con `cambios: null` devuelve el valor y no escribe nada', async () => {
      const { entorno, almacen, escrituras } = crearEntornoDePrueba();
      const datosAntes = almacen.getState().datos;
      const antes = escrituras();

      const resultado = await ejecutarServicio(entorno, () => ({
        ok: true as const,
        valor: 'nada que hacer',
        cambios: null,
      }));

      expect(resultado).toEqual({ ok: true, valor: 'nada que hacer' });
      expect(almacen.getState().datos).toBe(datosAntes);
      expect(escrituras()).toBe(antes);
    });

    it('un error de la operación no escribe nada', async () => {
      const { entorno, almacen, escrituras } = crearEntornoDePrueba();
      const datosAntes = almacen.getState().datos;
      const antes = escrituras();

      const resultado = await ejecutarServicio(entorno, () => fallo('ROL_NO_PERMITIDO'));

      expect(resultado).toEqual(fallo('ROL_NO_PERMITIDO'));
      expect(almacen.getState().datos).toBe(datosAntes);
      expect(escrituras()).toBe(antes);
    });

    it('un servicio sin permiso devuelve el código de domain/ con su mensaje y no escribe', async () => {
      const { entorno, almacen, escrituras } = crearEntornoDePrueba();
      const datosAntes = almacen.getState().datos;
      const antes = escrituras();

      // Otra persona intenta enviar la tarea de Diego: solo el responsable puede.
      const resultado = await enviarEjemplo(entorno, 'usr-pra-04', TAREA_CON_SUPERVISION);

      expect(resultado).toMatchObject({ ok: false });
      expect(!resultado.ok && resultado.mensaje.length).toBeGreaterThan(15);
      expect(almacen.getState().datos).toBe(datosAntes);
      expect(escrituras()).toBe(antes);
    });

    it('una excepción devuelve ERROR_INESPERADO, avisa en consola y no escribe nada', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { entorno, almacen, escrituras } = crearEntornoDePrueba();
      const datosAntes = almacen.getState().datos;
      const antes = escrituras();

      const resultado = await ejecutarServicio(entorno, () => {
        throw new Error('algo se rompió');
      });

      expect(resultado).toMatchObject({ ok: false, codigo: 'ERROR_INESPERADO' });
      expect(!resultado.ok && resultado.mensaje).not.toMatch(/algo se rompió/);
      expect(consola).toHaveBeenCalled();
      expect(almacen.getState().datos).toBe(datosAntes);
      expect(escrituras()).toBe(antes);
      consola.mockRestore();
    });

    it('una notificación a una persona que no existe aborta todo y no deja un evento a medias', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { entorno, almacen, escrituras } = crearEntornoDePrueba();
      const datosAntes = almacen.getState().datos;
      const antes = escrituras();

      const resultado = await ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
        const evento = crearEvento(
          {
            autor: autorDe(DEMO),
            tipo_accion: 'TAREA_TOMADA',
            elemento: { tipo: 'TAREA', id: 'x', etiqueta: 'x' },
            id_proyecto: 'pry-pl2d',
          },
          marca,
          e.generarId,
        );
        crearNotificaciones(
          {
            autor: evento.autor,
            destinatarios: ['fantasma'],
            tipo: 'TAREA_EDITADA_EN_PROGRESO',
            mensaje: 'x',
            elemento: { tipo: 'TAREA', id: 'x' },
          },
          datos.usuarios,
          marca,
          e.generarId,
        );
        return { ok: true, valor: null, cambios: conEfectos(datos, {}, { eventos: [evento] }) };
      });

      expect(resultado).toMatchObject({ ok: false, codigo: 'ERROR_INESPERADO' });
      expect(almacen.getState().datos).toBe(datosAntes);
      expect(escrituras()).toBe(antes);
      consola.mockRestore();
    });

    it('una demora mal configurada se informa como error, sin lanzar', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { entorno } = crearEntornoDePrueba({ demoraMs: -5 });
      const resultado = await ejecutarServicio(entorno, () => fallo('X'));
      expect(resultado).toMatchObject({ ok: false, codigo: 'ERROR_INESPERADO' });
      consola.mockRestore();
    });
  });

  describe('coherencia temporal', () => {
    it('fecha_termino y el evento de cierre salen del mismo instante', async () => {
      const { entorno, almacen } = crearEntornoDePrueba();
      await terminarEjemplo(entorno, DIEGO, TAREA_SIN_SUPERVISION);

      const { tareas, historial } = almacen.getState().datos;
      const tarea = tareas.find((t) => t.id === TAREA_SIN_SUPERVISION)!;
      const evento = historial.filter((e) => e.tipo_accion === 'TAREA_TERMINADA').at(-1)!;
      expect(evento.elemento.id).toBe(TAREA_SIN_SUPERVISION);
      expect(evento.fecha).toBe(AHORA_DE_PRUEBA.toISOString());
      expect(tarea.fecha_termino).toBe(evento.fecha);
      // Con instantes distintos, el tiempo de ciclo se descartaría (daría null).
      expect(tiempoCicloMs(tarea, historial)).not.toBeNull();
    });

    it('todo lo que escribe una operación comparte la misma fecha (evento y aviso)', async () => {
      const { entorno, almacen } = crearEntornoDePrueba();
      await enviarEjemplo(entorno, DEMO, TAREA_CON_SUPERVISION);

      const { historial, notificaciones } = almacen.getState().datos;
      const evento = historial.at(-1)!;
      const aviso = notificaciones.at(-1)!;
      expect(evento.tipo_accion).toBe('TAREA_ENVIADA_A_SUPERVISION');
      expect(aviso.tipo).toBe('TAREA_ENVIADA_A_SUPERVISION');
      expect(aviso.fecha).toBe(evento.fecha);
    });

    it('el historial queda en orden cronológico aunque pase el tiempo entre operaciones', async () => {
      const { entorno, almacen, fijarAhora } = crearEntornoDePrueba();
      fijarAhora(new Date('2026-11-17T19:00:00.000Z'));
      await terminarEjemplo(entorno, DIEGO, TAREA_SIN_SUPERVISION);
      fijarAhora(new Date('2026-11-17T19:05:00.000Z'));
      await enviarEjemplo(entorno, DEMO, TAREA_CON_SUPERVISION);

      const fechas = almacen.getState().datos.historial.map((e) => e.fecha);
      expect([...fechas].sort()).toEqual(fechas);
      expect(fechas.at(-2)).toBe('2026-11-17T19:00:00.000Z');
      expect(fechas.at(-1)).toBe('2026-11-17T19:05:00.000Z');
    });
  });

  describe('demora', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('la demora se espera antes de leer y la marca se toma después de ella', async () => {
      const { entorno, almacen, fijarAhora } = crearEntornoDePrueba({ demoraMs: 600 });
      fijarAhora(new Date('2026-11-17T18:30:00.000Z'));
      const operacion = vi.fn(
        ({ datos }: { datos: { tareas: { id: string; titulo: string }[] } }) => ({
          ok: true as const,
          valor: datos.tareas.find((t) => t.id === TAREA_SIN_SUPERVISION)!.titulo,
          cambios: {},
        }),
      );

      const promesa = ejecutarServicio(entorno, operacion);
      expect(operacion).not.toHaveBeenCalled();

      // Durante la espera cambian los datos y pasa el tiempo.
      almacen.getState().transaccion((datos) => ({
        tareas: datos.tareas.map((t) =>
          t.id === TAREA_SIN_SUPERVISION ? { ...t, titulo: 'Título cambiado' } : t,
        ),
      }));
      fijarAhora(new Date('2026-11-17T18:30:01.000Z'));
      await vi.advanceTimersByTimeAsync(599);
      expect(operacion).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      const resultado = await promesa;

      // La operación vio los datos de después de la espera y la hora de después de la espera.
      expect(resultado).toEqual({ ok: true, valor: 'Título cambiado' });
      const contexto = operacion.mock.calls[0][0] as unknown as { marca: { ahora: string } };
      expect(contexto.marca.ahora).toBe('2026-11-17T18:30:01.000Z');
    });

    it('también un error espera la demora (como una red real)', async () => {
      const { entorno } = crearEntornoDePrueba({ demoraMs: 600 });
      let terminado = false;
      void ejecutarServicio(entorno, () => fallo('ROL_NO_PERMITIDO')).then(() => {
        terminado = true;
      });
      await vi.advanceTimersByTimeAsync(599);
      expect(terminado).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(terminado).toBe(true);
    });
  });

  describe('efectos y secuencia', () => {
    it('el evento y los avisos se escriben junto con el cambio, en una sola escritura', async () => {
      const { entorno, almacen, escrituras } = crearEntornoDePrueba();
      const antes = almacen.getState().datos;
      const escriturasAntes = escrituras();

      await enviarEjemplo(entorno, DEMO, TAREA_CON_SUPERVISION);

      expect(escrituras() - escriturasAntes).toBe(1);
      const despues = almacen.getState().datos;
      expect(despues.historial).toHaveLength(antes.historial.length + 1);
      expect(despues.notificaciones).toHaveLength(antes.notificaciones.length + 1);
      // Lo anterior sigue siendo exactamente lo mismo (los eventos no se editan).
      antes.historial.forEach((e, i) => expect(despues.historial[i]).toBe(e));
      antes.notificaciones.forEach((n, i) => expect(despues.notificaciones[i]).toBe(n));
    });

    it('el autor no recibe el aviso de su propia acción; el supervisor sí', async () => {
      const { entorno, almacen } = crearEntornoDePrueba();
      const antes = almacen.getState().datos.notificaciones.length;
      await enviarEjemplo(entorno, DEMO, TAREA_CON_SUPERVISION);

      const nuevos = almacen.getState().datos.notificaciones.slice(antes);
      expect(nuevos.map((n) => n.id_destinatario)).toEqual([SUPERVISOR]);
      expect(nuevos[0].leida).toBe(false);
    });

    it('conEfectos suma historial y avisos al final y no toca las demás colecciones', () => {
      const { entorno, almacen } = crearEntornoDePrueba();
      const datos = almacen.getState().datos;
      const marca = crearMarca(AHORA_DE_PRUEBA);
      const evento = crearEvento(
        {
          autor: autorDe(DEMO),
          tipo_accion: 'TAREA_TOMADA',
          elemento: { tipo: 'TAREA', id: 'tar-x', etiqueta: 'X' },
          id_proyecto: 'pry-pl2d',
        },
        marca,
        entorno.generarId,
      );
      const avisos = crearNotificaciones(
        {
          autor: evento.autor,
          destinatarios: [SUPERVISOR],
          tipo: 'TAREA_EDITADA_EN_PROGRESO',
          mensaje: 'x',
          elemento: { tipo: 'TAREA', id: 'tar-x' },
        },
        datos.usuarios,
        marca,
        entorno.generarId,
      );

      const cambios = conEfectos(
        datos,
        { tareas: datos.tareas },
        { eventos: [evento], notificaciones: avisos },
      );

      expect(Object.keys(cambios).sort()).toEqual(['historial', 'notificaciones', 'tareas']);
      expect(cambios.historial).toHaveLength(datos.historial.length + 1);
      expect(cambios.historial?.at(-1)).toBe(evento);
      expect(cambios.notificaciones).toHaveLength(datos.notificaciones.length + 1);
      expect(cambios.notificaciones?.at(-1)).toBe(avisos[0]);
      // Sin efectos, solo quedan los cambios dados.
      expect(Object.keys(conEfectos(datos, { tareas: datos.tareas }, {}))).toEqual(['tareas']);
    });

    it('dos llamadas seguidas se ven entre sí', async () => {
      const { entorno, almacen } = crearEntornoDePrueba();
      const inicial = almacen.getState().datos.historial.length;
      await terminarEjemplo(entorno, DIEGO, TAREA_SIN_SUPERVISION);

      let vistos = 0;
      await ejecutarServicio(entorno, ({ datos }) => {
        vistos = datos.historial.length;
        return fallo('X');
      });
      expect(vistos).toBe(inicial + 1);
    });

    it('un elemento que no existe da NO_ENCONTRADO y no escribe', async () => {
      const { entorno, almacen, escrituras } = crearEntornoDePrueba();
      const datosAntes = almacen.getState().datos;
      const antes = escrituras();
      const resultado = await terminarEjemplo(entorno, DIEGO, 'tar-que-no-existe');
      expect(resultado).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
      expect(almacen.getState().datos).toBe(datosAntes);
      expect(escrituras()).toBe(antes);
    });

    it('una cuenta que no existe da NO_ENCONTRADO antes de tocar nada', async () => {
      const { entorno, escrituras } = crearEntornoDePrueba();
      const antes = escrituras();
      const resultado = await terminarEjemplo(entorno, 'fantasma', TAREA_SIN_SUPERVISION);
      expect(resultado).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
      expect(escrituras()).toBe(antes);
    });
  });
});

describe('ejecutarConsulta', () => {
  it('devuelve el valor leído y nunca escribe', async () => {
    const { entorno, almacen, escrituras } = crearEntornoDePrueba();
    const datosAntes = almacen.getState().datos;
    const antes = escrituras();

    const resultado = await ejecutarConsulta(entorno, ({ datos, marca }) => ({
      ok: true,
      valor: { tareas: datos.tareas.length, ahora: marca.ahora },
    }));

    expect(resultado).toEqual({
      ok: true,
      valor: { tareas: datosAntes.tareas.length, ahora: AHORA_DE_PRUEBA.toISOString() },
    });
    expect(almacen.getState().datos).toBe(datosAntes);
    expect(escrituras()).toBe(antes);
  });

  it('un error de la consulta pasa tal cual y no escribe', async () => {
    const { entorno, escrituras } = crearEntornoDePrueba();
    const antes = escrituras();
    expect(await ejecutarConsulta(entorno, () => fallo('ROL_NO_PERMITIDO'))).toEqual(
      fallo('ROL_NO_PERMITIDO'),
    );
    expect(escrituras()).toBe(antes);
  });

  it('una excepción devuelve ERROR_INESPERADO y avisa en consola', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { entorno, almacen } = crearEntornoDePrueba();
    const datosAntes = almacen.getState().datos;
    const resultado = await ejecutarConsulta(entorno, () => {
      throw new Error('algo se rompió');
    });
    expect(resultado).toMatchObject({ ok: false, codigo: 'ERROR_INESPERADO' });
    expect(consola).toHaveBeenCalled();
    expect(almacen.getState().datos).toBe(datosAntes);
    consola.mockRestore();
  });

  describe('demora', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('espera la demora antes de leer', async () => {
      const { entorno } = crearEntornoDePrueba({ demoraMs: 600 });
      const operacion = vi.fn(() => ({ ok: true as const, valor: 1 }));
      const promesa = ejecutarConsulta(entorno, operacion);
      await vi.advanceTimersByTimeAsync(599);
      expect(operacion).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(await promesa).toEqual({ ok: true, valor: 1 });
    });
  });
});

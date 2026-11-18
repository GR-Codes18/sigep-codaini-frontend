import { describe, expect, it } from 'vitest';
import type { Id, Notificacion } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { codigo, desactivar, valor } from '../pruebas/consultas';
import { listarNotificaciones, type EntradaListarNotificaciones } from './notificaciones';

// Semilla en AHORA_DE_PRUEBA (martes 17 de noviembre de 2026, 13:30 en Perú).
const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // pry-pl2d y pry-rsv
const SUPERVISOR_2 = 'usr-sup-02'; // pry-tie (finalizado) y pry-dat
const PRACTICANTE = 'demo-practicante'; // solo pry-pl2d
const PRA_CON_BAJA = 'usr-pra-03'; // pry-pl2d vigente; pry-tie con baja
const PRA_EN_FINALIZADO = 'usr-pra-15'; // vigente en pry-tie (finalizado)

const PL2D = 'pry-pl2d';
const RSV = 'pry-rsv';
const TIE = 'pry-tie';

const listar = (
  p: PruebaPreparada,
  idActor: Id,
  opciones: Omit<EntradaListarNotificaciones, 'idActor'> = {},
) => listarNotificaciones({ idActor, ...opciones }, p.entorno);

let contador = 0;
function agregar(
  prueba: PruebaPreparada,
  aviso: Partial<Notificacion> & Pick<Notificacion, 'id_destinatario' | 'elemento'>,
): string {
  const id = aviso.id ?? `ntf-prueba-${++contador}`;
  const completa: Notificacion = {
    id,
    tipo: 'TAREA_DEVUELTA',
    mensaje: 'Aviso de prueba',
    fecha: '2026-11-17T17:00:00.000Z',
    leida: false,
    ...aviso,
  };
  prueba.modificar((d) => ({ notificaciones: [...d.notificaciones, completa] }));
  return id;
}

describe('listarNotificaciones · reglas comunes', () => {
  it('cualquier rol activo tiene éxito y no se escribe nada', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    for (const idActor of [ADMIN, SUPERVISOR, PRACTICANTE]) {
      expect((await listar(prueba, idActor)).ok, idActor).toBe(true);
    }
    comprobar();
  });

  it('un actor inexistente da NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await listar(prueba, 'no-existe'))).toBe('NO_ENCONTRADO');
  });

  it('un actor INACTIVO da USUARIO_INACTIVO, sea cual sea su rol', async () => {
    for (const idActor of [ADMIN, SUPERVISOR, PRACTICANTE]) {
      const prueba = prepararPrueba();
      desactivar(prueba, idActor);

      expect(codigo(await listar(prueba, idActor)), idActor).toBe('USUARIO_INACTIVO');
    }
  });

  it('un identificador vacío, un límite menor que 1 o no entero dan DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await listar(prueba, ''))).toBe('DATOS_INVALIDOS');
    expect(codigo(await listar(prueba, ADMIN, { limite: 0 }))).toBe('DATOS_INVALIDOS');
    expect(codigo(await listar(prueba, ADMIN, { limite: -1 }))).toBe('DATOS_INVALIDOS');
    expect(codigo(await listar(prueba, ADMIN, { limite: 2.5 }))).toBe('DATOS_INVALIDOS');
  });
});

describe('listarNotificaciones · contenido', () => {
  it('trae solo las notificaciones de quien consulta', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();

    for (const idActor of [ADMIN, SUPERVISOR, SUPERVISOR_2, PRACTICANTE, PRA_CON_BAJA]) {
      const propias = new Set(
        datos.notificaciones.filter((n) => n.id_destinatario === idActor).map((n) => n.id),
      );

      const { notificaciones, total } = valor(await listar(prueba, idActor));

      expect(new Set(notificaciones.map((n) => n.id)), idActor).toEqual(propias);
      expect(total, idActor).toBe(propias.size);
      expect(propias.size, idActor).toBeGreaterThan(0);
    }
  });

  it('una notificación dirigida a otra persona nunca sale, ni para el Administrador', async () => {
    const prueba = prepararPrueba();
    const id = agregar(prueba, {
      id_destinatario: SUPERVISOR,
      elemento: { tipo: 'PROYECTO', id: PL2D },
    });

    for (const idActor of [ADMIN, PRACTICANTE, SUPERVISOR_2]) {
      const { notificaciones } = valor(await listar(prueba, idActor));
      expect(
        notificaciones.map((n) => n.id),
        idActor,
      ).not.toContain(id);
    }
    expect(valor(await listar(prueba, SUPERVISOR)).notificaciones.map((n) => n.id)).toContain(id);
  });

  it('no trae el destinatario: solo lo que la pantalla muestra', async () => {
    const prueba = prepararPrueba();

    const [n] = valor(await listar(prueba, PRACTICANTE)).notificaciones;

    expect(Object.keys(n!).sort()).toEqual([
      'destino',
      'elemento',
      'enlace_activo',
      'fecha',
      'id',
      'leida',
      'mensaje',
      'tipo',
    ]);
  });

  it('van de la más reciente a la más antigua', async () => {
    const prueba = prepararPrueba();

    const { notificaciones } = valor(await listar(prueba, SUPERVISOR));
    const fechas = notificaciones.map((n) => Date.parse(n.fecha));

    expect(notificaciones).toHaveLength(14);
    expect([...fechas].sort((a, b) => b - a)).toEqual(fechas);
  });

  it('con la misma fecha, el desempate es estable por id', async () => {
    const prueba = prepararPrueba();
    agregar(prueba, {
      id: 'ntf-a',
      id_destinatario: PRACTICANTE,
      elemento: { tipo: 'PROYECTO', id: PL2D },
      fecha: '2030-01-01T00:00:00.000Z',
    });
    agregar(prueba, {
      id: 'ntf-b',
      id_destinatario: PRACTICANTE,
      elemento: { tipo: 'PROYECTO', id: PL2D },
      fecha: '2030-01-01T00:00:00.000Z',
    });

    const { notificaciones } = valor(await listar(prueba, PRACTICANTE));

    expect(notificaciones.slice(0, 2).map((n) => n.id)).toEqual(['ntf-b', 'ntf-a']);
  });

  it('no_leidas cuenta las suyas sin leer, sin importar el filtro ni el límite', async () => {
    const prueba = prepararPrueba();

    expect(valor(await listar(prueba, PRACTICANTE)).no_leidas).toBe(1);
    expect(valor(await listar(prueba, PRACTICANTE, { limite: 1 })).no_leidas).toBe(1);
    expect(valor(await listar(prueba, SUPERVISOR, { solo_no_leidas: true })).no_leidas).toBe(2);
    expect(valor(await listar(prueba, ADMIN)).no_leidas).toBe(0);
  });

  it('«solo no leídas» deja las que siguen sin leer', async () => {
    const prueba = prepararPrueba();

    const r = valor(await listar(prueba, SUPERVISOR, { solo_no_leidas: true }));

    expect(r.notificaciones).toHaveLength(2);
    expect(r.notificaciones.every((n) => !n.leida)).toBe(true);
    expect(r.total).toBe(2);
    expect(valor(await listar(prueba, ADMIN, { solo_no_leidas: true })).notificaciones).toEqual([]);
  });

  it('el límite devuelve las más recientes, y el total cuenta todas las que cumplen el filtro', async () => {
    const prueba = prepararPrueba();

    const todas = valor(await listar(prueba, SUPERVISOR)).notificaciones;
    const campana = valor(await listar(prueba, SUPERVISOR, { limite: 8 }));

    expect(campana.notificaciones).toHaveLength(8);
    expect(campana.notificaciones.map((n) => n.id)).toEqual(todas.slice(0, 8).map((n) => n.id));
    expect(campana.total).toBe(14);
    expect(valor(await listar(prueba, SUPERVISOR, { limite: 100 })).notificaciones).toHaveLength(
      14,
    );
    expect(valor(await listar(prueba, SUPERVISOR, { limite: 3, solo_no_leidas: true })).total).toBe(
      2,
    );
  });

  it('quien no tiene ninguna recibe un éxito con la lista vacía', async () => {
    const prueba = prepararPrueba();

    expect(valor(await listar(prueba, 'usr-pra-21'))).toEqual({
      notificaciones: [],
      no_leidas: 0,
      total: 0,
    });
  });

  it('la lista es una copia: modificarla no cambia los datos', async () => {
    const prueba = prepararPrueba();
    const antes = JSON.stringify(prueba.datos().notificaciones);

    const r = valor(await listar(prueba, PRACTICANTE));
    r.notificaciones[0]!.elemento.id = 'otro';

    expect(JSON.stringify(prueba.datos().notificaciones)).toBe(antes);
  });
});

describe('listarNotificaciones · enlace activo', () => {
  const primera = async (prueba: PruebaPreparada, idActor: Id, id: string) =>
    valor(await listar(prueba, idActor)).notificaciones.find((n) => n.id === id)!;

  it('una tarea que existe y puede abrir: enlace activo hacia el detalle', async () => {
    const prueba = prepararPrueba();
    const id = agregar(prueba, {
      id_destinatario: PRACTICANTE,
      elemento: { tipo: 'TAREA', id: 'tar-pl2d-010' },
    });

    expect(await primera(prueba, PRACTICANTE, id)).toMatchObject({
      enlace_activo: true,
      destino: 'DETALLE',
    });
  });

  it('una tarea eliminada: se conserva el texto y el enlace sale desactivado', async () => {
    const prueba = prepararPrueba();
    const id = agregar(prueba, {
      id_destinatario: PRACTICANTE,
      elemento: { tipo: 'TAREA', id: 'tar-pl2d-010' },
      mensaje: 'La tarea fue devuelta',
    });
    prueba.modificar((d) => ({ tareas: d.tareas.filter((t) => t.id !== 'tar-pl2d-010') }));

    expect(await primera(prueba, PRACTICANTE, id)).toMatchObject({
      mensaje: 'La tarea fue devuelta',
      enlace_activo: false,
      destino: null,
    });
  });

  it('una tarea que ya no puede abrir (proyecto ajeno) sale desactivada', async () => {
    const prueba = prepararPrueba();
    const id = agregar(prueba, {
      id_destinatario: PRACTICANTE,
      elemento: { tipo: 'TAREA', id: 'tar-rsv-006' },
    });
    const delAdmin = agregar(prueba, {
      id_destinatario: ADMIN,
      elemento: { tipo: 'TAREA', id: 'tar-rsv-006' },
    });

    expect(await primera(prueba, PRACTICANTE, id)).toMatchObject({
      enlace_activo: false,
      destino: null,
    });
    expect(await primera(prueba, ADMIN, delAdmin)).toMatchObject({ enlace_activo: true });
  });

  it('un proyecto vigente lleva al detalle', async () => {
    const prueba = prepararPrueba();

    const asignado = valor(await listar(prueba, PRACTICANTE)).notificaciones.find(
      (n) => n.tipo === 'ASIGNADO_A_PROYECTO',
    )!;

    expect(asignado).toMatchObject({
      elemento: { tipo: 'PROYECTO', id: PL2D },
      destino: 'DETALLE',
    });
  });

  it('un proyecto del que salió o que ya finalizó lleva al resumen mínimo, no al detalle', async () => {
    const prueba = prepararPrueba();

    const quitado = valor(await listar(prueba, PRA_CON_BAJA)).notificaciones.find(
      (n) => n.tipo === 'QUITADO_DE_PROYECTO',
    )!;
    const finalizado = valor(await listar(prueba, PRA_EN_FINALIZADO)).notificaciones.find(
      (n) => n.tipo === 'PROYECTO_FINALIZADO',
    )!;

    expect(quitado).toMatchObject({
      elemento: { id: TIE },
      destino: 'RESUMEN_PROYECTO_ANTERIOR',
      enlace_activo: true,
    });
    expect(finalizado).toMatchObject({
      elemento: { id: TIE },
      destino: 'RESUMEN_PROYECTO_ANTERIOR',
    });
  });

  it('un proyecto en el que nunca estuvo sale desactivado', async () => {
    const prueba = prepararPrueba();
    const id = agregar(prueba, {
      id_destinatario: PRACTICANTE,
      elemento: { tipo: 'PROYECTO', id: RSV },
    });

    expect(await primera(prueba, PRACTICANTE, id)).toMatchObject({
      enlace_activo: false,
      destino: null,
    });
  });

  it('un proyecto que pasó a otro supervisor sale desactivado para el anterior', async () => {
    const prueba = prepararPrueba();
    const id = agregar(prueba, {
      id_destinatario: SUPERVISOR,
      elemento: { tipo: 'PROYECTO', id: RSV },
    });
    expect(await primera(prueba, SUPERVISOR, id)).toMatchObject({ enlace_activo: true });

    prueba.modificar((d) => ({
      proyectos: d.proyectos.map((p) => (p.id === RSV ? { ...p, id_supervisor: 'usr-sup-03' } : p)),
    }));

    expect(await primera(prueba, SUPERVISOR, id)).toMatchObject({
      enlace_activo: false,
      destino: null,
    });
  });

  it('un proyecto inexistente sale desactivado', async () => {
    const prueba = prepararPrueba();
    const id = agregar(prueba, {
      id_destinatario: ADMIN,
      elemento: { tipo: 'PROYECTO', id: 'no-existe' },
    });

    expect(await primera(prueba, ADMIN, id)).toMatchObject({ enlace_activo: false, destino: null });
  });

  it('una persona: la propia siempre; para el Administrador cualquiera que exista; para el Supervisor, solo a cargo', async () => {
    const prueba = prepararPrueba();
    const propia = agregar(prueba, {
      id_destinatario: PRACTICANTE,
      elemento: { tipo: 'USUARIO', id: PRACTICANTE },
    });
    const deOtro = agregar(prueba, {
      id_destinatario: PRACTICANTE,
      elemento: { tipo: 'USUARIO', id: PRA_CON_BAJA },
    });
    const admin = agregar(prueba, {
      id_destinatario: ADMIN,
      elemento: { tipo: 'USUARIO', id: PRA_CON_BAJA },
    });
    const aCargo = agregar(prueba, {
      id_destinatario: SUPERVISOR,
      elemento: { tipo: 'USUARIO', id: PRA_CON_BAJA },
    });
    const ajena = agregar(prueba, {
      id_destinatario: SUPERVISOR_2,
      elemento: { tipo: 'USUARIO', id: PRACTICANTE },
    });
    const noExiste = agregar(prueba, {
      id_destinatario: ADMIN,
      elemento: { tipo: 'USUARIO', id: 'no-existe' },
    });

    expect((await primera(prueba, PRACTICANTE, propia)).enlace_activo).toBe(true);
    expect((await primera(prueba, PRACTICANTE, deOtro)).enlace_activo).toBe(false);
    expect((await primera(prueba, ADMIN, admin)).enlace_activo).toBe(true);
    expect((await primera(prueba, SUPERVISOR, aCargo)).enlace_activo).toBe(true);
    expect((await primera(prueba, SUPERVISOR_2, ajena)).enlace_activo).toBe(false);
    expect((await primera(prueba, ADMIN, noExiste)).enlace_activo).toBe(false);
  });

  it('una postulación, una especialidad o un parámetro: solo para el Administrador y si existen', async () => {
    const prueba = prepararPrueba();
    const elementos = [
      { tipo: 'POSTULANTE', id: 'pos-17' },
      { tipo: 'AREA_TECNICA', id: 'area-sw' },
      { tipo: 'PARAMETRO_CONFIGURACION', id: 'PRACTICA_AVISO_FIN_DIAS' },
    ] as const;

    for (const elemento of elementos) {
      const admin = agregar(prueba, { id_destinatario: ADMIN, elemento });
      const supervisor = agregar(prueba, { id_destinatario: SUPERVISOR, elemento });
      expect((await primera(prueba, ADMIN, admin)).enlace_activo, elemento.tipo).toBe(true);
      expect((await primera(prueba, SUPERVISOR, supervisor)).enlace_activo, elemento.tipo).toBe(
        false,
      );
    }
    const inexistente = agregar(prueba, {
      id_destinatario: ADMIN,
      elemento: { tipo: 'POSTULANTE', id: 'no-existe' },
    });
    expect((await primera(prueba, ADMIN, inexistente)).enlace_activo).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { crearSemilla } from '@/data/semilla';
import { crearMarca } from '../marca';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import { MENSAJES } from '../resultado';
import {
  asignacionesDe,
  cargarContextoProyecto,
  cargarContextoTarea,
  esFechaDeCalendario,
  esquemaDescripcion,
  esquemaFechaLimite,
  esquemaTextoOpcional,
  esquemaTitulo,
  eventoDeTarea,
  exigirTexto,
  referenciaTarea,
  reemplazarTarea,
  textoGuardado,
} from './comun';

const DATOS = crearSemilla(AHORA_DE_PRUEBA);
const DEMO = 'demo-practicante';
const SUPERVISOR = 'demo-supervisor';
const PL2D = 'pry-pl2d';
const TAREA = 'tar-pl2d-010'; // «Enemigos básicos», del practicante demo

describe('esquemas de entrada', () => {
  it('fecha límite: solo fechas que existen en el calendario', () => {
    for (const valida of ['2026-11-17', '2028-02-29', '2026-12-31', '2020-01-01']) {
      expect(esFechaDeCalendario(valida), valida).toBe(true);
      expect(esquemaFechaLimite.safeParse(valida).success, valida).toBe(true);
    }
    for (const invalida of [
      '2026-02-30',
      '2027-02-29',
      '2026-13-01',
      '2026-2-1',
      '',
      ' 2026-11-17',
    ]) {
      expect(esFechaDeCalendario(invalida), invalida).toBe(false);
      expect(esquemaFechaLimite.safeParse(invalida).success, invalida).toBe(false);
    }
  });

  it('una fecha pasada es válida: no se exige que sea futura (D7-A)', () => {
    expect(esquemaFechaLimite.safeParse('2020-05-04').success).toBe(true);
  });

  it('título y descripción se recortan y no pueden quedar vacíos', () => {
    expect(esquemaTitulo.parse('  Menú  ')).toBe('Menú');
    expect(esquemaTitulo.safeParse('   ').success).toBe(false);
    expect(esquemaDescripcion.parse('\tHacer algo\n')).toBe('Hacer algo');
    expect(esquemaDescripcion.safeParse('').success).toBe(false);
  });

  it('el motivo o la nota no se validan como «no vacíos» en Zod (lo hace domain/)', () => {
    expect(esquemaTextoOpcional.safeParse(undefined).success).toBe(true);
    expect(esquemaTextoOpcional.safeParse('').success).toBe(true);
    expect(esquemaTextoOpcional.safeParse('   ').success).toBe(true);
    expect(esquemaTextoOpcional.safeParse(5).success).toBe(false);
  });
});

describe('cargarContextoTarea', () => {
  it('resuelve actor, tarea, proyecto y solo las asignaciones de quien actúa', () => {
    const r = cargarContextoTarea(DATOS, DEMO, TAREA);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.actor.id).toBe(DEMO);
    expect(r.valor.tarea.id).toBe(TAREA);
    expect(r.valor.proyecto.id).toBe(PL2D);
    expect(r.valor.asignaciones.length).toBeGreaterThan(0);
    expect(r.valor.asignaciones.every((a) => a.id_practicante === DEMO)).toBe(true);
  });

  it('el supervisor no tiene asignaciones propias', () => {
    const r = cargarContextoTarea(DATOS, SUPERVISOR, TAREA);
    expect(r.ok && r.valor.asignaciones).toEqual([]);
  });

  it('actor inexistente: NO_ENCONTRADO con el mensaje de la cuenta (antes que la tarea)', () => {
    const r = cargarContextoTarea(DATOS, 'fantasma', 'no-existe');
    expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    expect(!r.ok && r.mensaje).toMatch(/cuenta/);
  });

  it('tarea inexistente o con proyecto inexistente: NO_ENCONTRADO', () => {
    expect(cargarContextoTarea(DATOS, DEMO, 'no-existe')).toMatchObject({
      ok: false,
      codigo: 'NO_ENCONTRADO',
      mensaje: MENSAJES.NO_ENCONTRADO,
    });
    const rota = {
      ...DATOS,
      tareas: DATOS.tareas.map((t) => (t.id === TAREA ? { ...t, id_proyecto: 'pry-x' } : t)),
    };
    expect(cargarContextoTarea(rota, DEMO, TAREA)).toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });
});

describe('cargarContextoProyecto', () => {
  it('resuelve actor y proyecto; NO_ENCONTRADO si falta alguno', () => {
    const r = cargarContextoProyecto(DATOS, SUPERVISOR, PL2D);
    expect(r.ok && r.valor.proyecto.id).toBe(PL2D);
    expect(cargarContextoProyecto(DATOS, SUPERVISOR, 'pry-x')).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    const sinActor = cargarContextoProyecto(DATOS, 'fantasma', PL2D);
    expect(sinActor).toMatchObject({ codigo: 'NO_ENCONTRADO' });
    expect(!sinActor.ok && sinActor.mensaje).toMatch(/cuenta/);
  });

  it('asignacionesDe filtra por la persona', () => {
    expect(asignacionesDe(DATOS, DEMO).every((a) => a.id_practicante === DEMO)).toBe(true);
    expect(asignacionesDe(DATOS, 'fantasma')).toEqual([]);
  });
});

describe('texto exigido', () => {
  it('sin texto exigido nunca falla', () => {
    expect(exigirTexto(null, undefined)).toBeNull();
    expect(exigirTexto(null, '')).toBeNull();
  });

  it('con motivo o nota exigidos: ausente, vacío o solo espacios → TEXTO_OBLIGATORIO', () => {
    for (const exigido of ['MOTIVO', 'NOTA'] as const) {
      for (const texto of [undefined, '', '   ', '\n\t']) {
        expect(exigirTexto(exigido, texto), `${exigido} ${JSON.stringify(texto)}`).toMatchObject({
          ok: false,
          codigo: 'TEXTO_OBLIGATORIO',
        });
      }
      expect(exigirTexto(exigido, 'Ya no hace falta')).toBeNull();
    }
  });

  it('textoGuardado recorta y deja null si no hay texto', () => {
    expect(textoGuardado('  Se duplicó  ')).toBe('Se duplicó');
    expect(textoGuardado('   ')).toBeNull();
    expect(textoGuardado(undefined)).toBeNull();
  });
});

describe('escritura', () => {
  it('reemplazarTarea devuelve una lista nueva y no cambia la original', () => {
    const original = DATOS.tareas;
    const tarea = original.find((t) => t.id === TAREA)!;
    const nueva = { ...tarea, titulo: 'Otro' };
    const resultado = reemplazarTarea(original, nueva);
    expect(resultado).not.toBe(original);
    expect(resultado.find((t) => t.id === TAREA)?.titulo).toBe('Otro');
    expect(original.find((t) => t.id === TAREA)?.titulo).toBe(tarea.titulo);
    expect(resultado).toHaveLength(original.length);
  });

  it('referenciaTarea usa el ID legible con 3 dígitos como mínimo', () => {
    expect(referenciaTarea({ codigo: 'PL2D' }, { numero: 4, titulo: 'Menú' })).toBe(
      '«Menú» (PL2D-004)',
    );
    expect(referenciaTarea({ codigo: 'PL2D' }, { numero: 1000, titulo: 'X' })).toBe(
      '«X» (PL2D-1000)',
    );
  });

  it('eventoDeTarea lleva autor, etiqueta, id_proyecto, cambios, nota y la fecha de la marca', () => {
    const marca = crearMarca(AHORA_DE_PRUEBA);
    const evento = eventoDeTarea(
      {
        actor: { id: SUPERVISOR },
        proyecto: { id: PL2D, codigo: 'PL2D' },
        tarea: { id: 'tar-x', numero: 18, titulo: 'Menú' },
        tipo_accion: 'TAREA_ELIMINADA',
        cambios: [{ campo: 'estado', valor_anterior: 'DISPONIBLE', valor_nuevo: null }],
        nota: 'Duplicada',
      },
      marca,
      () => 'evt-1',
    );
    expect(evento).toEqual({
      id: 'evt-1',
      fecha: marca.ahora,
      autor: { tipo: 'USUARIO', id_usuario: SUPERVISOR },
      tipo_accion: 'TAREA_ELIMINADA',
      elemento: { tipo: 'TAREA', id: 'tar-x', etiqueta: 'PL2D-018 · Menú' },
      id_proyecto: PL2D,
      cambios: [{ campo: 'estado', valor_anterior: 'DISPONIBLE', valor_nuevo: null }],
      nota: 'Duplicada',
    });
  });
});

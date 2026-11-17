import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StateStorage } from 'zustand/middleware';
import { CATALOGO_PARAMETROS, type Proyecto, type Tarea, type Usuario } from '@/domain';
import { crearAlmacen, CLAVE_ALMACEN, VERSION_ALMACEN } from './almacen';
import { validarDatos } from './esquemas';
import { crearParametros } from './parametros';
import type { DatosAlmacen } from './tipos';

/** Base vacía (solo con los parámetros): estas pruebas miran el almacén, no la semilla de demostración. */
function crearVacia(): DatosAlmacen {
  return {
    usuarios: [],
    practicantes: [],
    supervisores: [],
    proyectos: [],
    enlaces_proyecto: [],
    asignaciones: [],
    tareas: [],
    postulantes: [],
    areas_tecnicas: [],
    especialidades: [],
    criterios: [],
    evaluaciones: [],
    detalles_evaluacion: [],
    historial: [],
    notificaciones: [],
    revisiones_insight: [],
    parametros: crearParametros(),
  };
}

/** Almacenamiento en memoria que cuenta las escrituras. */
function crearMemoria(inicial: Record<string, string> = {}) {
  const valores = new Map(Object.entries(inicial));
  const memoria: StateStorage & { escrituras: number; valores: Map<string, string> } = {
    escrituras: 0,
    valores,
    getItem: (clave) => valores.get(clave) ?? null,
    setItem: (clave, valor) => {
      memoria.escrituras += 1;
      valores.set(clave, valor);
    },
    removeItem: (clave) => {
      valores.delete(clave);
    },
  };
  return memoria;
}

const usuario: Usuario = {
  id: 'usr-1',
  nombre: 'Ana Prueba',
  correo: 'ana@codaini.demo',
  celular: '999000111',
  contrasena: 'demo12345',
  rol: 'ADMINISTRADOR',
  estado: 'ACTIVO',
  debe_cambiar_contrasena: false,
  fecha_alta: '2026-11-01T15:00:00.000Z',
};

const proyecto: Proyecto = {
  id: 'pry-1',
  nombre: 'Plataforma 2D',
  codigo: 'PL2D',
  descripcion: 'Juego de plataformas',
  fecha_inicio: '2026-10-01',
  fecha_fin_prevista: '2027-02-01',
  fecha_fin_real: null,
  estado: 'ACTIVO',
  dia_reunion: 'LUNES',
  hora_reunion: '10:30',
  repositorio_url: 'https://github.com/codaini/pl2d',
  rama_base: 'main',
  id_supervisor: 'usr-1',
  ultimo_numero_tarea: 0,
};

const tarea: Tarea = {
  id: 'tar-1',
  numero: 1,
  titulo: 'Menú principal',
  descripcion: 'Crear el menú',
  fecha_limite: '2026-12-01',
  id_proyecto: 'pry-1',
  id_practicante: null,
  estado: 'DISPONIBLE',
  requiere_supervision: false,
  requiere_pr: true,
  estado_pr: null,
  rama_origen: null,
  rama_base: null,
  url_pull_request: null,
  fecha_termino: null,
};

/** Crea la tarea y avanza el contador en una sola operación. */
const crearTareaUno = (datos: DatosAlmacen) => ({
  tareas: [...datos.tareas, tarea],
  proyectos: datos.proyectos.map((p) => ({ ...p, ultimo_numero_tarea: 1 })),
});

describe('almacén: semilla y parámetros', () => {
  it('parte de la semilla cuando no hay nada guardado, con id === clave', () => {
    const memoria = crearMemoria();
    const almacen = crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => memoria });
    const { parametros } = almacen.getState().datos;
    expect(parametros).toHaveLength(CATALOGO_PARAMETROS.length);
    expect(parametros.every((p) => p.id === p.clave)).toBe(true);
    // No escribe hasta que haya un cambio.
    expect(memoria.escrituras).toBe(0);
  });

  it('el valor predeterminado es una copia independiente del valor', () => {
    const [primero] = crearParametros();
    expect(primero.valor).toEqual(primero.valor_predeterminado);
    expect(primero.valor).not.toBe(primero.valor_predeterminado);
  });
});

describe('almacén: persistencia', () => {
  it('lo escrito sobrevive a «recargar» (un almacén nuevo sobre el mismo almacenamiento)', () => {
    const memoria = crearMemoria();
    const primero = crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => memoria });
    primero.getState().transaccion((datos) => ({ usuarios: [...datos.usuarios, usuario] }));

    const recargado = crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => memoria });
    expect(recargado.getState().datos.usuarios).toEqual([usuario]);
    expect(memoria.valores.has(CLAVE_ALMACEN)).toBe(true);
  });

  it('guarda solo los datos, no las funciones', () => {
    const memoria = crearMemoria();
    const almacen = crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => memoria });
    almacen.getState().transaccion((datos) => ({ usuarios: [...datos.usuarios, usuario] }));
    const guardado = JSON.parse(memoria.valores.get(CLAVE_ALMACEN) ?? '{}');
    expect(Object.keys(guardado.state)).toEqual(['datos']);
    expect(guardado.version).toBe(VERSION_ALMACEN);
  });

  it('sin almacenamiento disponible (bloqueado) sigue funcionando en memoria', () => {
    const almacen = crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => undefined });
    almacen.getState().transaccion((datos) => ({ usuarios: [...datos.usuarios, usuario] }));
    expect(almacen.getState().datos.usuarios).toEqual([usuario]);
  });

  it('si el navegador falla al guardar (disco lleno), la operación no lanza y avisa', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const lleno: StateStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => undefined,
    };
    const almacen = crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => lleno });
    expect(() =>
      almacen.getState().transaccion((datos) => ({ usuarios: [...datos.usuarios, usuario] })),
    ).not.toThrow();
    // La memoria sí cambió; lo escrito solo se pierde al recargar.
    expect(almacen.getState().datos.usuarios).toEqual([usuario]);
    expect(aviso).toHaveBeenCalled();
    aviso.mockRestore();
  });
});

describe('almacén: recuperación segura', () => {
  let aviso: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    aviso.mockRestore();
  });

  const guardar = (estado: unknown, version = VERSION_ALMACEN) =>
    JSON.stringify({ state: estado, version });

  it('JSON ilegible: regenera la semilla, avisa y no lanza', () => {
    const memoria = crearMemoria({ [CLAVE_ALMACEN]: '{esto no es json' });
    const almacen = crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => memoria });
    expect(almacen.getState().datos.parametros).toHaveLength(CATALOGO_PARAMETROS.length);
    expect(aviso).toHaveBeenCalled();
  });

  it('forma incorrecta (no es un objeto con datos): regenera la semilla y avisa', () => {
    const memoria = crearMemoria({ [CLAVE_ALMACEN]: guardar({ otra: 1 }) });
    const almacen = crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => memoria });
    expect(almacen.getState().datos.usuarios).toEqual([]);
    expect(aviso).toHaveBeenCalled();
  });

  it('un registro dañado dentro de una colección invalida todo y regenera', () => {
    const base = crearVacia();
    const danado = { ...base, usuarios: [{ ...usuario, rol: 'SUPER_ADMIN' }] };
    const memoria = crearMemoria({ [CLAVE_ALMACEN]: guardar({ datos: danado }) });
    const almacen = crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => memoria });
    expect(almacen.getState().datos.usuarios).toEqual([]);
    expect(aviso).toHaveBeenCalled();
  });

  it('falta una colección: regenera', () => {
    const incompleto: Record<string, unknown> = { ...crearVacia() };
    delete incompleto.tareas;
    const memoria = crearMemoria({ [CLAVE_ALMACEN]: guardar({ datos: incompleto }) });
    const almacen = crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => memoria });
    expect(Array.isArray(almacen.getState().datos.tareas)).toBe(true);
    expect(aviso).toHaveBeenCalled();
  });

  it('faltan parámetros del catálogo: regenera', () => {
    const base = crearVacia();
    const sinUno = { ...base, parametros: base.parametros.slice(1) };
    const memoria = crearMemoria({ [CLAVE_ALMACEN]: guardar({ datos: sinUno }) });
    const almacen = crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => memoria });
    expect(almacen.getState().datos.parametros).toHaveLength(CATALOGO_PARAMETROS.length);
    expect(aviso).toHaveBeenCalled();
  });

  it('un parámetro con id distinto de su clave se rechaza', () => {
    const base = crearVacia();
    const torcido = {
      ...base,
      parametros: base.parametros.map((p, i) => (i === 0 ? { ...p, id: 'otro' } : p)),
    };
    expect(validarDatos(torcido)).toBeNull();
  });

  it('versión distinta: regenera la semilla y avisa', () => {
    const base = { ...crearVacia(), usuarios: [usuario] };
    const memoria = crearMemoria({
      [CLAVE_ALMACEN]: guardar({ datos: base }, VERSION_ALMACEN - 1),
    });
    const almacen = crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => memoria });
    expect(almacen.getState().datos.usuarios).toEqual([]);
    expect(aviso).toHaveBeenCalled();
  });

  it('datos válidos guardados se conservan y no se avisa', () => {
    const base = { ...crearVacia(), usuarios: [usuario], proyectos: [proyecto] };
    const memoria = crearMemoria({ [CLAVE_ALMACEN]: guardar({ datos: base }) });
    const almacen = crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => memoria });
    expect(almacen.getState().datos.usuarios).toEqual([usuario]);
    expect(almacen.getState().datos.proyectos).toEqual([proyecto]);
    expect(aviso).not.toHaveBeenCalled();
  });

  it('tras regenerar, el almacén sigue aceptando y guardando cambios', () => {
    const memoria = crearMemoria({ [CLAVE_ALMACEN]: '{roto' });
    const almacen = crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => memoria });
    almacen.getState().transaccion((datos) => ({ usuarios: [...datos.usuarios, usuario] }));
    expect(
      crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => memoria }).getState().datos
        .usuarios,
    ).toEqual([usuario]);
  });

  it('rechaza un ultimo_numero_tarea negativo o decimal', () => {
    for (const ultimo of [-1, 1.5]) {
      const datos = {
        ...crearVacia(),
        proyectos: [{ ...proyecto, ultimo_numero_tarea: ultimo }],
      };
      expect(validarDatos(datos)).toBeNull();
    }
  });

  it('rechaza fechas en formato incorrecto', () => {
    const malaFecha = {
      ...crearVacia(),
      proyectos: [{ ...proyecto, fecha_inicio: '01/10/2026' }],
    };
    const malaHora = {
      ...crearVacia(),
      tareas: [{ ...tarea, fecha_termino: '2026-11-01 10:00' }],
    };
    expect(validarDatos(malaFecha)).toBeNull();
    expect(validarDatos(malaHora)).toBeNull();
  });
});

describe('almacén: operaciones atómicas', () => {
  it('cambia varias colecciones con una sola escritura (tarea + contador)', () => {
    const memoria = crearMemoria();
    const almacen = crearAlmacen({
      almacenamiento: () => memoria,
      crearSemilla: () => ({ ...crearVacia(), proyectos: [proyecto] }),
    });
    almacen.getState().transaccion(crearTareaUno);
    const { tareas, proyectos } = almacen.getState().datos;
    expect(tareas).toEqual([tarea]);
    expect(proyectos[0].ultimo_numero_tarea).toBe(1);
    expect(memoria.escrituras).toBe(1);
  });

  it('si la operación lanza un error, no se escribe nada', () => {
    const memoria = crearMemoria();
    const almacen = crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => memoria });
    const antes = almacen.getState().datos;
    expect(() =>
      almacen.getState().transaccion(() => {
        throw new Error('falló a medias');
      }),
    ).toThrow('falló a medias');
    expect(almacen.getState().datos).toBe(antes);
    expect(memoria.escrituras).toBe(0);
  });

  it('devolver null significa «sin cambios» y no escribe', () => {
    const memoria = crearMemoria();
    const almacen = crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => memoria });
    const antes = almacen.getState().datos;
    almacen.getState().transaccion(() => null);
    expect(almacen.getState().datos).toBe(antes);
    expect(memoria.escrituras).toBe(0);
  });

  it('las colecciones que no se devuelven quedan intactas', () => {
    const almacen = crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => undefined });
    const antes = almacen.getState().datos;
    almacen.getState().transaccion((datos) => ({ usuarios: [...datos.usuarios, usuario] }));
    expect(almacen.getState().datos.parametros).toBe(antes.parametros);
    expect(almacen.getState().datos.tareas).toBe(antes.tareas);
  });

  it('cada operación ve el resultado de la anterior', () => {
    const almacen = crearAlmacen({ crearSemilla: crearVacia, almacenamiento: () => undefined });
    almacen.getState().transaccion((datos) => ({ usuarios: [...datos.usuarios, usuario] }));
    almacen
      .getState()
      .transaccion((datos) => ({ usuarios: [...datos.usuarios, { ...usuario, id: 'usr-2' }] }));
    expect(almacen.getState().datos.usuarios.map((u) => u.id)).toEqual(['usr-1', 'usr-2']);
  });
});

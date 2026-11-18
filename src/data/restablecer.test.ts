import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StateStorage } from 'zustand/middleware';
import { CATALOGO_PARAMETROS, type Usuario } from '@/domain';
import { crearAlmacen, CLAVE_ALMACEN } from './almacen';
import { validarDatos } from './esquemas';
import { crearSemilla } from './semilla';

const DIA_A = new Date('2026-11-17T18:30:00.000Z');
const DIA_B = new Date('2026-12-20T14:00:00.000Z');

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

const intruso: Usuario = {
  id: 'usr-nuevo',
  nombre: 'Persona Añadida',
  correo: 'nueva@codaini.demo',
  celular: '999000222',
  contrasena: 'demo12345',
  rol: 'PRACTICANTE',
  estado: 'ACTIVO',
  debe_cambiar_contrasena: true,
  fecha_alta: '2026-11-17T12:00:00.000Z',
};

/** Almacén con la semilla real (con la fecha del sistema, que las pruebas fijan en «hoy A»). */
const nuevoAlmacen = (memoria: StateStorage | undefined) =>
  crearAlmacen({
    crearSemilla,
    almacenamiento: () => memoria,
  });

/** Cambia varias colecciones y un parámetro, como haría el uso normal de la app. */
function ensuciar(almacen: ReturnType<typeof nuevoAlmacen>) {
  almacen.getState().transaccion((datos) => ({
    usuarios: [...datos.usuarios, intruso],
    tareas: datos.tareas.slice(1),
    historial: [],
    notificaciones: [],
    parametros: datos.parametros.map((p, i) =>
      i === 0 ? { ...p, valor: { tipo: 'rango' as const, minimo: 10, maximo: 20 } } : p,
    ),
  }));
}

describe('restablecer datos de demostración', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(DIA_A);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('los datos modificados vuelven a la semilla', () => {
    const almacen = nuevoAlmacen(crearMemoria());
    ensuciar(almacen);
    expect(almacen.getState().datos).not.toEqual(crearSemilla(DIA_A));

    almacen.getState().restablecer(DIA_A);

    expect(almacen.getState().datos).toEqual(crearSemilla(DIA_A));
  });

  it('usa la fecha actual: las fechas relativas se mueven con «hoy»', () => {
    const almacen = nuevoAlmacen(crearMemoria());
    expect(almacen.getState().datos).toEqual(crearSemilla(DIA_A));

    vi.setSystemTime(DIA_B);
    almacen.getState().restablecer();

    expect(almacen.getState().datos).toEqual(crearSemilla(DIA_B));
    expect(almacen.getState().datos).not.toEqual(crearSemilla(DIA_A));
    // Nada queda en el futuro respecto de la nueva fecha.
    const ahora = DIA_B.toISOString();
    expect(almacen.getState().datos.historial.every((e) => e.fecha <= ahora)).toBe(true);
  });

  it('los parámetros vuelven a su valor inicial y a su valor predeterminado', () => {
    const almacen = nuevoAlmacen(crearMemoria());
    ensuciar(almacen);
    expect(almacen.getState().datos.parametros[0].valor).toEqual({
      tipo: 'rango',
      minimo: 10,
      maximo: 20,
    });

    almacen.getState().restablecer(DIA_A);

    for (const catalogo of CATALOGO_PARAMETROS) {
      const parametro = almacen.getState().datos.parametros.find((p) => p.clave === catalogo.clave);
      expect(parametro?.id, catalogo.clave).toBe(catalogo.clave);
      expect(parametro?.valor, catalogo.clave).toEqual(catalogo.valor);
      expect(parametro?.valor_predeterminado, catalogo.clave).toEqual(catalogo.valor);
    }
  });

  it('se guarda en una sola escritura y sobrevive a «recargar»', () => {
    const memoria = crearMemoria();
    const almacen = nuevoAlmacen(memoria);
    ensuciar(almacen);
    const escriturasAntes = memoria.escrituras;

    almacen.getState().restablecer(DIA_A);

    expect(memoria.escrituras - escriturasAntes).toBe(1);
    const guardado = JSON.parse(memoria.valores.get(CLAVE_ALMACEN) ?? '{}');
    expect(guardado.state.datos).toEqual(JSON.parse(JSON.stringify(crearSemilla(DIA_A))));

    const recargado = nuevoAlmacen(memoria);
    expect(recargado.getState().datos).toEqual(crearSemilla(DIA_A));
    expect(recargado.getState().datos.usuarios.some((u) => u.id === intruso.id)).toBe(false);
  });

  it('es atómico: los suscriptores reciben un solo aviso y nunca una base vacía', () => {
    const almacen = nuevoAlmacen(crearMemoria());
    ensuciar(almacen);
    const recibidos: number[] = [];
    almacen.subscribe((estado) => {
      recibidos.push(estado.datos.usuarios.length);
    });

    almacen.getState().restablecer(DIA_A);

    expect(recibidos).toEqual([crearSemilla(DIA_A).usuarios.length]);
  });

  it('no toca otras claves del navegador (sesión y tema)', () => {
    const memoria = crearMemoria({
      'sigep-sesion': '{"state":{"usuario":null},"version":0}',
      'sigep-tema': 'dark',
    });
    const almacen = nuevoAlmacen(memoria);
    ensuciar(almacen);

    almacen.getState().restablecer(DIA_A);

    expect(memoria.valores.get('sigep-sesion')).toBe('{"state":{"usuario":null},"version":0}');
    expect(memoria.valores.get('sigep-tema')).toBe('dark');
  });

  it('deja el sistema consistente y sigue aceptando operaciones', () => {
    const almacen = nuevoAlmacen(crearMemoria());
    ensuciar(almacen);

    almacen.getState().restablecer(DIA_A);

    const { datos } = almacen.getState();
    expect(validarDatos(datos)).not.toBeNull();
    for (const proyecto of datos.proyectos) {
      const numeros = datos.tareas
        .filter((t) => t.id_proyecto === proyecto.id)
        .map((t) => t.numero);
      expect(proyecto.ultimo_numero_tarea, proyecto.codigo).toBe(
        numeros.length === 0 ? 0 : Math.max(...numeros),
      );
    }
    almacen.getState().transaccion((d) => ({ usuarios: [...d.usuarios, intruso] }));
    expect(almacen.getState().datos.usuarios.at(-1)).toEqual(intruso);
  });

  it('restablecer dos veces con el mismo «ahora» da exactamente los mismos datos', () => {
    const almacen = nuevoAlmacen(crearMemoria());
    almacen.getState().restablecer(DIA_A);
    const primera = JSON.stringify(almacen.getState().datos);
    ensuciar(almacen);
    almacen.getState().restablecer(DIA_A);
    expect(JSON.stringify(almacen.getState().datos)).toBe(primera);
  });

  describe('almacenamiento bloqueado o dañado', () => {
    let aviso: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => {
      aviso.mockRestore();
    });

    it('sin almacenamiento disponible restablece en memoria sin lanzar', () => {
      const almacen = nuevoAlmacen(undefined);
      ensuciar(almacen);
      expect(() => almacen.getState().restablecer(DIA_A)).not.toThrow();
      expect(almacen.getState().datos).toEqual(crearSemilla(DIA_A));
    });

    it('si el navegador falla al guardar, restablece en memoria, no lanza y avisa', () => {
      const lleno: StateStorage = {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
        removeItem: () => undefined,
      };
      const almacen = nuevoAlmacen(lleno);
      ensuciar(almacen);
      expect(() => almacen.getState().restablecer(DIA_A)).not.toThrow();
      expect(almacen.getState().datos).toEqual(crearSemilla(DIA_A));
      expect(aviso).toHaveBeenCalled();
    });

    it('si lo guardado estaba dañado, se parte de la semilla y restablecer funciona', () => {
      const memoria = crearMemoria({ [CLAVE_ALMACEN]: '{esto no es json' });
      const almacen = nuevoAlmacen(memoria);
      ensuciar(almacen);
      almacen.getState().restablecer(DIA_A);
      expect(almacen.getState().datos).toEqual(crearSemilla(DIA_A));
      expect(nuevoAlmacen(memoria).getState().datos).toEqual(crearSemilla(DIA_A));
    });
  });
});

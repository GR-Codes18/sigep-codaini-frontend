import { describe, expect, it } from 'vitest';
import type { EventoHistorial } from '@/domain';
import type { EventoConAutor } from '@/services';
import { aEventosLinea, AUTOR_DESCONOCIDO } from './eventos';

function evento(cambios: Partial<EventoHistorial> = {}): EventoHistorial {
  return {
    id: 'evt-1',
    fecha: '2026-11-18T15:30:00.000Z',
    autor: { tipo: 'USUARIO', id_usuario: 'usr-1' },
    tipo_accion: 'TAREA_TOMADA',
    elemento: { tipo: 'TAREA', id: 'tar-1', etiqueta: 'PL2D-001 Tarea' },
    id_proyecto: 'pry-1',
    cambios: [],
    nota: null,
    ...cambios,
  };
}

function item(
  cambios: Partial<EventoHistorial> = {},
  autor: Partial<EventoConAutor> = {},
): EventoConAutor {
  return {
    evento: evento(cambios),
    autor_nombre: 'Ana Quispe',
    autor_rol: 'PRACTICANTE',
    ...autor,
  };
}

describe('aEventosLinea', () => {
  it('convierte la fecha ISO a Date y arma «Nombre (Rol)»', () => {
    const [linea] = aEventosLinea([item()]);
    expect(linea.id).toBe('evt-1');
    expect(linea.fecha).toBeInstanceOf(Date);
    expect(linea.fecha.toISOString()).toBe('2026-11-18T15:30:00.000Z');
    expect(linea.autor).toBe('Ana Quispe (Practicante)');
    expect(linea.accion).toBe('Tomada');
  });

  it('los eventos automáticos van como «Sistema»', () => {
    const [linea] = aEventosLinea([
      item({ autor: { tipo: 'SISTEMA' } }, { autor_nombre: 'Sistema', autor_rol: null }),
    ]);
    expect(linea.autor).toBe('Sistema');
  });

  it('si la cuenta del autor ya no se encuentra, dice «Usuario desconocido» y nunca el ID', () => {
    const [linea] = aEventosLinea([item({}, { autor_nombre: 'usr-1', autor_rol: null })]);
    expect(linea.autor).toBe(AUTOR_DESCONOCIDO);
    expect(linea.autor).not.toContain('usr-1');
  });

  it('resume el cambio de estado con etiquetas en español', () => {
    const [linea] = aEventosLinea([
      item({
        tipo_accion: 'TAREA_ENVIADA_A_SUPERVISION',
        cambios: [
          { campo: 'estado', valor_anterior: 'EN_PROGRESO', valor_nuevo: 'ESPERANDO_SUPERVISION' },
        ],
      }),
    ]);
    expect(linea.accion).toBe('Enviada a supervisión');
    expect(linea.resumen).toBe('En progreso → Esperando supervisión');
  });

  it('un estado anterior nulo se muestra como «—»', () => {
    const [linea] = aEventosLinea([
      item({
        tipo_accion: 'TAREA_CREADA',
        cambios: [{ campo: 'estado', valor_anterior: null, valor_nuevo: 'DISPONIBLE' }],
      }),
    ]);
    expect(linea.resumen).toBe('— → Disponible');
  });

  it('sin cambio de estado no hay resumen; los demás cambios no lo generan', () => {
    const [linea] = aEventosLinea([
      item({ cambios: [{ campo: 'titulo', valor_anterior: 'A', valor_nuevo: 'B' }] }),
    ]);
    expect(linea).not.toHaveProperty('resumen');
  });

  it('pasa la nota y omite la vacía', () => {
    const [conNota, sinNota] = aEventosLinea([
      item({ tipo_accion: 'TAREA_DEVUELTA', nota: 'Falta la prueba.' }),
      item({ id: 'evt-2', nota: null }),
    ]);
    expect(conNota.nota).toBe('Falta la prueba.');
    expect(sinNota).not.toHaveProperty('nota');
  });

  it('un tipo de acción sin etiqueta muestra su código', () => {
    const [linea] = aEventosLinea([item({ tipo_accion: 'PROYECTO_PAUSADO' })]);
    expect(linea.accion).toBe('PROYECTO_PAUSADO');
  });

  it('conserva el orden recibido y una lista vacía da una lista vacía', () => {
    const lineas = aEventosLinea([item({ id: 'b' }), item({ id: 'a' })]);
    expect(lineas.map((l) => l.id)).toEqual(['b', 'a']);
    expect(aEventosLinea([])).toEqual([]);
  });
});

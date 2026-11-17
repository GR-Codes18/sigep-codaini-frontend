import { describe, expect, it } from 'vitest';
import type { Notificacion } from '@/domain';
import { AUTOR_SISTEMA, autorDe } from './historial';
import { crearMarca } from './marca';
import {
  agregarNotificaciones,
  crearNotificaciones,
  type EntradaNotificacion,
} from './notificaciones';

const marca = crearMarca(new Date('2026-11-17T18:30:00.000Z'));
const usuarios = [{ id: 'sup' }, { id: 'pra' }, { id: 'otra' }];
let contador = 0;
const generarId = (prefijo: string) => `${prefijo}-${++contador}`;

const base: EntradaNotificacion = {
  autor: autorDe('pra'),
  destinatarios: ['sup'],
  tipo: 'TAREA_ENVIADA_A_SUPERVISION',
  mensaje: 'Ana envió «Menú» a supervisión.',
  elemento: { tipo: 'TAREA', id: 'tar-1' },
};

describe('crearNotificaciones', () => {
  it('crea una notificación sin leer por destinatario, con la fecha de la marca', () => {
    const [aviso] = crearNotificaciones(base, usuarios, marca, generarId);
    expect(aviso).toMatchObject({
      id_destinatario: 'sup',
      tipo: 'TAREA_ENVIADA_A_SUPERVISION',
      mensaje: 'Ana envió «Menú» a supervisión.',
      elemento: { tipo: 'TAREA', id: 'tar-1' },
      fecha: '2026-11-17T18:30:00.000Z',
      leida: false,
    });
    expect(aviso.id).toMatch(/^ntf-/);
  });

  it('nunca notifica al autor de la acción', () => {
    const avisos = crearNotificaciones(
      { ...base, destinatarios: ['sup', 'pra', 'otra'] },
      usuarios,
      marca,
      generarId,
    );
    expect(avisos.map((a) => a.id_destinatario)).toEqual(['sup', 'otra']);
  });

  it('tampoco al autor si aparece repetido o es el único destinatario', () => {
    expect(
      crearNotificaciones({ ...base, destinatarios: ['pra', 'pra'] }, usuarios, marca, generarId),
    ).toEqual([]);
    const avisos = crearNotificaciones(
      { ...base, destinatarios: ['pra', 'sup', 'pra'] },
      usuarios,
      marca,
      generarId,
    );
    expect(avisos.map((a) => a.id_destinatario)).toEqual(['sup']);
  });

  it('si la acción es del Sistema o de nadie, se notifica a todos', () => {
    for (const autor of [AUTOR_SISTEMA, null]) {
      const avisos = crearNotificaciones(
        { ...base, autor, destinatarios: ['sup', 'pra'] },
        usuarios,
        marca,
        generarId,
      );
      expect(avisos.map((a) => a.id_destinatario)).toEqual(['sup', 'pra']);
    }
  });

  it('quita los destinatarios repetidos y conserva el orden', () => {
    const avisos = crearNotificaciones(
      { ...base, destinatarios: ['otra', 'sup', 'otra', 'sup'] },
      usuarios,
      marca,
      generarId,
    );
    expect(avisos.map((a) => a.id_destinatario)).toEqual(['otra', 'sup']);
  });

  it('sin destinatarios no crea nada', () => {
    expect(crearNotificaciones({ ...base, destinatarios: [] }, usuarios, marca, generarId)).toEqual(
      [],
    );
  });

  it('cada notificación tiene su propio ID y su propia copia del elemento', () => {
    const avisos = crearNotificaciones(
      { ...base, destinatarios: ['sup', 'otra'] },
      usuarios,
      marca,
      generarId,
    );
    expect(new Set(avisos.map((a) => a.id)).size).toBe(2);
    expect(avisos[0].elemento).not.toBe(base.elemento);
    expect(avisos[0].elemento).not.toBe(avisos[1].elemento);
  });

  it('un destinatario que no existe es un error de programación: lanza', () => {
    expect(() =>
      crearNotificaciones(
        { ...base, destinatarios: ['sup', 'fantasma'] },
        usuarios,
        marca,
        generarId,
      ),
    ).toThrow(/fantasma/);
  });

  it('un mensaje vacío o de solo espacios lanza', () => {
    for (const mensaje of ['', '   ']) {
      expect(() => crearNotificaciones({ ...base, mensaje }, usuarios, marca, generarId)).toThrow(
        /mensaje/,
      );
    }
  });
});

describe('agregarNotificaciones', () => {
  it('suma al final sin cambiar la lista original', () => {
    const una: Notificacion = {
      id: 'n1',
      id_destinatario: 'sup',
      tipo: 'TAREA_APROBADA',
      mensaje: 'x',
      elemento: { tipo: 'TAREA', id: 't' },
      fecha: '2026-11-17T10:00:00.000Z',
      leida: true,
    };
    const nueva = { ...una, id: 'n2' };
    const previo = [una];
    const resultado = agregarNotificaciones(previo, nueva);
    expect(resultado).toEqual([una, nueva]);
    expect(resultado[0]).toBe(una);
    expect(previo).toHaveLength(1);
  });
});

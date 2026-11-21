import { describe, expect, it } from 'vitest';
import { textoDiasEsperando } from '@/app/adaptadores';
import { pestanaDeLaDireccion } from '@/app/usePestanaInicial';
import { PESTANAS_DE_TAREAS, pestanaInicialDeTareas } from './filtros';
import { rutaDeDetalleDeTareaGlobal, rutaDeTareas } from './rutas';

describe('pestanaInicialDeTareas (§5.5, §9.1.3)', () => {
  it('el Administrador abre siempre en «Todas»', () => {
    expect(pestanaInicialDeTareas('ADMINISTRADOR', { ESPERANDO_SUPERVISION: 0 })).toBe('TODAS');
    expect(pestanaInicialDeTareas('ADMINISTRADOR', { ESPERANDO_SUPERVISION: 7 })).toBe('TODAS');
  });

  it('el Supervisor abre en «Esperando supervisión» si hay tareas ahí y, si no, en «Todas»', () => {
    expect(pestanaInicialDeTareas('SUPERVISOR', { ESPERANDO_SUPERVISION: 1 })).toBe(
      'ESPERANDO_SUPERVISION',
    );
    expect(pestanaInicialDeTareas('SUPERVISOR', { ESPERANDO_SUPERVISION: 0 })).toBe('TODAS');
  });
});

describe('pestanaDeLaDireccion con «ninguna» como predeterminada', () => {
  it('devuelve null si la dirección no pide una pestaña válida, para que la decida la página', () => {
    expect(pestanaDeLaDireccion(null, PESTANAS_DE_TAREAS, null)).toBeNull();
    expect(pestanaDeLaDireccion('no-existe', PESTANAS_DEL(), null)).toBeNull();
    expect(pestanaDeLaDireccion('TERMINADA', PESTANAS_DE_TAREAS, null)).toBe('TERMINADA');
  });
});

function PESTANAS_DEL() {
  return PESTANAS_DE_TAREAS;
}

describe('rutas de Tareas según el rol', () => {
  it('con prefijo del rol, y sin rol son las del Administrador', () => {
    expect(rutaDeTareas('SUPERVISOR')).toBe('/supervisor/tareas');
    expect(rutaDeTareas()).toBe('/administrador/tareas');
    expect(rutaDeDetalleDeTareaGlobal('t1', 'SUPERVISOR')).toBe('/supervisor/tareas/t1');
    expect(rutaDeDetalleDeTareaGlobal('t1')).toBe('/administrador/tareas/t1');
  });
});

describe('textoDiasEsperando', () => {
  it('dice los días con su plural y «—» si la tarea no espera supervisión', () => {
    expect(textoDiasEsperando(1)).toBe('1 día');
    expect(textoDiasEsperando(3)).toBe('3 días');
    expect(textoDiasEsperando(0)).toBe('0 días');
    expect(textoDiasEsperando(null)).toBe('—');
  });
});

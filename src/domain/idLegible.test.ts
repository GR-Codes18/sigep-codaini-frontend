import { describe, expect, it } from 'vitest';

import {
  CODIGOS_ID_LEGIBLE,
  formatearIdLegible,
  siguienteNumeroTarea,
  validarCodigoProyecto,
} from './idLegible';
import { proyecto, tarea } from './pruebas/fabricas';

describe('siguienteNumeroTarea', () => {
  it('el primer número es 1 cuando ultimo_numero_tarea es 0', () => {
    expect(siguienteNumeroTarea(proyecto({ ultimo_numero_tarea: 0 }))).toEqual({
      ok: true,
      numero: 1,
      ultimo_numero_tarea: 1,
    });
  });

  it('un número eliminado no se reutiliza: se usa ultimo_numero_tarea, no el máximo de las tareas', () => {
    // El proyecto llegó a la tarea 5; las tareas 4 y 5 se eliminaron y solo quedan la 1, 2 y 3.
    const existentes = [1, 2, 3].map((numero) => tarea({ numero }));
    const resultado = siguienteNumeroTarea(proyecto({ ultimo_numero_tarea: 5 }));

    expect(Math.max(...existentes.map((t) => t.numero)) + 1).toBe(4); // lo que haría max()+1
    expect(resultado).toEqual({ ok: true, numero: 6, ultimo_numero_tarea: 6 });
  });

  it('no muta el proyecto de entrada', () => {
    const entrada = Object.freeze(proyecto({ ultimo_numero_tarea: 7 }));
    const resultado = siguienteNumeroTarea(entrada);

    expect(resultado.ok).toBe(true);
    expect(entrada.ultimo_numero_tarea).toBe(7);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'ULTIMO_NUMERO_INVALIDO con ultimo_numero_tarea = %s',
    (invalido) => {
      const resultado = siguienteNumeroTarea({ ultimo_numero_tarea: invalido });
      expect(resultado.ok).toBe(false);
      if (!resultado.ok) expect(resultado.codigo).toBe('ULTIMO_NUMERO_INVALIDO');
    },
  );
});

describe('formatearIdLegible', () => {
  it.each([
    [1, 'PL2D-001'],
    [18, 'PL2D-018'],
    [99, 'PL2D-099'],
    [100, 'PL2D-100'],
    [999, 'PL2D-999'],
    [1000, 'PL2D-1000'],
    [12345, 'PL2D-12345'],
  ])('el número %s da %s (mínimo 3 dígitos, sin tope)', (numero, esperado) => {
    expect(formatearIdLegible('PL2D', numero)).toEqual({ ok: true, id: esperado });
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'NUMERO_INVALIDO con numero = %s',
    (invalido) => {
      const resultado = formatearIdLegible('PL2D', invalido);
      expect(resultado.ok).toBe(false);
      if (!resultado.ok) expect(resultado.codigo).toBe('NUMERO_INVALIDO');
    },
  );

  it('el número que entrega siguienteNumeroTarea se formatea sin error', () => {
    const siguiente = siguienteNumeroTarea({ ultimo_numero_tarea: 17 });
    expect(siguiente.ok).toBe(true);
    if (siguiente.ok) {
      expect(formatearIdLegible('PL2D', siguiente.numero)).toEqual({ ok: true, id: 'PL2D-018' });
    }
  });
});

describe('validarCodigoProyecto', () => {
  function codigoDeError(codigo: string, existentes: readonly string[] = []) {
    const resultado = validarCodigoProyecto(codigo, existentes);
    return resultado.valido ? null : resultado.codigo;
  }

  it.each(['PL2D', 'ABC', 'AB12C', '123', '12345'])('acepta «%s»', (codigo) => {
    expect(validarCodigoProyecto(codigo, [])).toEqual({ valido: true });
  });

  it.each([
    ['', 'CODIGO_PROYECTO_VACIO'],
    ['   ', 'CODIGO_PROYECTO_VACIO'],
    ['pl2d', 'CARACTERES_INVALIDOS'],
    ['Pl2D', 'CARACTERES_INVALIDOS'],
    ['PL-2D', 'CARACTERES_INVALIDOS'],
    ['PL 2D', 'CARACTERES_INVALIDOS'],
    ['PLÁN', 'CARACTERES_INVALIDOS'],
    ['AÑO1', 'CARACTERES_INVALIDOS'],
  ])('rechaza «%s» con %s', (codigo, esperado) => {
    expect(codigoDeError(codigo)).toBe(esperado);
  });

  it.each([
    ['AB', 'LONGITUD_INVALIDA'],
    ['A', 'LONGITUD_INVALIDA'],
    ['ABCDEF', 'LONGITUD_INVALIDA'],
    ['ABC', null],
    ['ABCDE', null],
  ])('borde de longitud: «%s» → %s', (codigo, esperado) => {
    expect(codigoDeError(codigo)).toBe(esperado);
  });

  it.each([' PL2D', 'PL2D ', ' PL2D ', '\tPL2D'])(
    'espacios alrededor de «%s»: CARACTERES_INVALIDOS (domain/ no recorta)',
    (codigo) => {
      expect(codigoDeError(codigo)).toBe('CARACTERES_INVALIDOS');
    },
  );

  it('rechaza un código que ya existe (CODIGO_DUPLICADO)', () => {
    expect(codigoDeError('PL2D', ['ABC', 'PL2D'])).toBe('CODIGO_DUPLICADO');
  });

  it('acepta un código distinto de los existentes y con la lista vacía', () => {
    expect(codigoDeError('PL2D', ['ABC', 'XYZ1'])).toBeNull();
    expect(codigoDeError('PL2D', [])).toBeNull();
  });

  it('la lista cuenta a todos los proyectos: un código de un proyecto finalizado también es duplicado', () => {
    // La lista no distingue estado: el servicio incluye los FINALIZADOS.
    const codigosDeTodosLosProyectos = ['ACT1', 'PAUS', 'FIN1'];
    expect(codigoDeError('FIN1', codigosDeTodosLosProyectos)).toBe('CODIGO_DUPLICADO');
  });

  it('la comparación es literal: «pl2d» en la lista no vuelve duplicado a «PL2D»', () => {
    expect(codigoDeError('PL2D', ['pl2d'])).toBeNull();
  });

  it('el formato va antes que el duplicado: un código mal formado que está en la lista da error de formato', () => {
    expect(codigoDeError('pl2d', ['pl2d'])).toBe('CARACTERES_INVALIDOS');
    expect(codigoDeError('AB', ['AB'])).toBe('LONGITUD_INVALIDA');
    expect(codigoDeError(' PL2D', [' PL2D'])).toBe('CARACTERES_INVALIDOS');
  });

  it('los resultados de error devuelven un mensaje legible', () => {
    const resultado = validarCodigoProyecto('AB', []);
    expect(resultado.valido).toBe(false);
    if (!resultado.valido) expect(resultado.mensaje).toMatch(/entre 3 y 5/);
  });
});

describe('CODIGOS_ID_LEGIBLE', () => {
  it('lista los seis códigos de error de esta capa', () => {
    expect([...CODIGOS_ID_LEGIBLE].sort()).toEqual(
      [
        'CARACTERES_INVALIDOS',
        'CODIGO_DUPLICADO',
        'CODIGO_PROYECTO_VACIO',
        'LONGITUD_INVALIDA',
        'NUMERO_INVALIDO',
        'ULTIMO_NUMERO_INVALIDO',
      ].sort(),
    );
  });
});

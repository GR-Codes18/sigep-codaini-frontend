import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  CODIGOS_CICLO_VIDA,
  CODIGOS_DENEGACION,
  CODIGOS_EDICION,
  CODIGOS_PR,
  CODIGOS_TRANSICION,
} from '@/domain';
import {
  MENSAJES,
  MENSAJE_GENERICO,
  denegar,
  exito,
  fallo,
  mensajeDe,
  validarEntrada,
} from './resultado';

describe('resultado estándar', () => {
  it('exito lleva el valor y ok: true', () => {
    expect(exito({ id: 1 })).toEqual({ ok: true, valor: { id: 1 } });
  });

  it('fallo lleva código y mensaje, y solo agrega campos si los hay', () => {
    expect(fallo('NO_ENCONTRADO')).toEqual({
      ok: false,
      codigo: 'NO_ENCONTRADO',
      mensaje: MENSAJES.NO_ENCONTRADO,
    });
    expect('campos' in fallo('NO_ENCONTRADO')).toBe(false);
    expect(fallo('X', 'Texto propio', { a: 'Falta' })).toEqual({
      ok: false,
      codigo: 'X',
      mensaje: 'Texto propio',
      campos: { a: 'Falta' },
    });
  });

  it('un código desconocido sin mensaje usa el mensaje genérico', () => {
    expect(mensajeDe('CODIGO_QUE_NO_EXISTE')).toBe(MENSAJE_GENERICO);
    expect(fallo('CODIGO_QUE_NO_EXISTE').mensaje).toBe(MENSAJE_GENERICO);
  });
});

describe('mensajes de los códigos de domain/', () => {
  const codigos: [string, readonly string[]][] = [
    ['permisos (CODIGOS_DENEGACION)', CODIGOS_DENEGACION],
    ['transiciones (CODIGOS_TRANSICION)', CODIGOS_TRANSICION],
    ['edición (CODIGOS_EDICION)', CODIGOS_EDICION],
    ['Pull Request (CODIGOS_PR)', CODIGOS_PR],
  ];

  it.each(codigos)('todo código de %s tiene un mensaje propio en español', (_nombre, lista) => {
    for (const codigo of lista) {
      const mensaje = mensajeDe(codigo);
      expect(mensaje, codigo).not.toBe(MENSAJE_GENERICO);
      expect(mensaje.length, codigo).toBeGreaterThan(15);
      expect(mensaje, codigo).not.toBe(codigo);
    }
  });

  it('los códigos propios de services/ tienen mensaje', () => {
    for (const codigo of [
      'NO_ENCONTRADO',
      'DATOS_INVALIDOS',
      'ERROR_INESPERADO',
      'SIN_CAMBIOS',
      'RAMA_INEXISTENTE',
      'POSTULACION_YA_EVALUADA',
      'CORREO_YA_REGISTRADO',
      'CONFIGURACION_INVALIDA',
    ]) {
      expect(mensajeDe(codigo), codigo).not.toBe(MENSAJE_GENERICO);
    }
  });

  it('los códigos de ciclo de vida traen su propio mensaje desde domain/ (pasan tal cual)', () => {
    // No están en la tabla: el dominio ya devuelve `mensaje`.
    expect(CODIGOS_CICLO_VIDA.length).toBeGreaterThan(0);
    expect(denegar({ codigo: 'SUPERVISOR_CON_PROYECTOS', mensaje: 'Tiene 2 proyectos.' })).toEqual({
      ok: false,
      codigo: 'SUPERVISOR_CON_PROYECTOS',
      mensaje: 'Tiene 2 proyectos.',
    });
  });
});

describe('denegar', () => {
  it('convierte una denegación de permisos (solo código) en un fallo con mensaje', () => {
    const resultado = denegar({ codigo: 'ROL_NO_PERMITIDO' });
    expect(resultado).toEqual({
      ok: false,
      codigo: 'ROL_NO_PERMITIDO',
      mensaje: MENSAJES.ROL_NO_PERMITIDO,
    });
  });

  it('no revela si el elemento existe: fuera de alcance usa un texto neutro', () => {
    expect(denegar({ codigo: 'FUERA_DE_ALCANCE' }).mensaje).not.toMatch(/existe|encontr/i);
  });
});

describe('validarEntrada (Zod)', () => {
  const esquema = z.object({
    titulo: z.string().trim().min(1, 'Escribe un título.'),
    limite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha límite no es válida.'),
    contacto: z.object({ correo: z.email('El correo no es válido.') }),
  });

  it('con datos válidos devuelve el valor ya limpiado por el esquema', () => {
    const resultado = validarEntrada(esquema, {
      titulo: '  Menú  ',
      limite: '2026-12-01',
      contacto: { correo: 'ana@codaini.demo' },
    });
    expect(resultado).toEqual({
      ok: true,
      valor: {
        titulo: 'Menú',
        limite: '2026-12-01',
        contacto: { correo: 'ana@codaini.demo' },
      },
    });
  });

  it('con datos inválidos devuelve DATOS_INVALIDOS con un mensaje por campo', () => {
    const resultado = validarEntrada(esquema, {
      titulo: '   ',
      limite: '1/12/2026',
      contacto: { correo: 'no-es-correo' },
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.codigo).toBe('DATOS_INVALIDOS');
    expect(resultado.mensaje).toBe(MENSAJES.DATOS_INVALIDOS);
    expect(resultado.campos).toEqual({
      titulo: 'Escribe un título.',
      limite: 'La fecha límite no es válida.',
      'contacto.correo': 'El correo no es válido.',
    });
  });

  it('un campo con varios problemas conserva solo el primer mensaje', () => {
    const doble = z.object({
      clave: z.string().min(8, 'Mínimo 8 caracteres.').regex(/\d/, 'Falta un número.'),
    });
    const resultado = validarEntrada(doble, { clave: 'abc' });
    expect(!resultado.ok && resultado.campos).toEqual({ clave: 'Mínimo 8 caracteres.' });
  });

  it('una entrada que no es un objeto falla sin lanzar', () => {
    for (const entrada of [null, undefined, 'texto', 42]) {
      const resultado = validarEntrada(esquema, entrada);
      expect(resultado.ok).toBe(false);
    }
  });

  it('un error de todo el formulario va en el campo _general', () => {
    const resultado = validarEntrada(
      z
        .object({ a: z.string(), b: z.string() })
        .refine((v) => v.a !== v.b, { message: 'Deben ser distintos.' }),
      { a: 'x', b: 'x' },
    );
    expect(!resultado.ok && resultado.campos).toEqual({ _general: 'Deben ser distintos.' });
  });
});

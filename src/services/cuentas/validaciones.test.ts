import { describe, expect, it } from 'vitest';
import { correoEnUso, esquemaCelular, esquemaCorreo, normalizarCorreo } from './validaciones';

describe('esquemaCelular (F7-A: nueve dígitos que empiezan con 9)', () => {
  it.each(['987654321', '900000000', '912345678'])('acepta %s', (celular) => {
    expect(esquemaCelular.safeParse(celular)).toEqual({ success: true, data: celular });
  });

  it('recorta los espacios de los lados', () => {
    expect(esquemaCelular.parse('  987654321 ')).toBe('987654321');
  });

  it.each([
    ['vacío', ''],
    ['8 dígitos', '98765432'],
    ['10 dígitos', '9876543210'],
    ['no empieza con 9', '887654321'],
    ['con letras', '98765432a'],
    ['con espacios por dentro', '987 654 321'],
    ['con prefijo', '+51987654321'],
  ])('rechaza un celular %s', (_caso, celular) => {
    const r = esquemaCelular.safeParse(celular);
    expect(r.success).toBe(false);
    if (!r.success)
      expect(r.error.issues[0].message).toBe('El celular debe tener 9 dígitos y empezar con 9.');
  });
});

describe('esquemaCorreo', () => {
  it('acepta un correo válido y lo recorta', () => {
    expect(esquemaCorreo.parse('  ana.perez@codaini.demo ')).toBe('ana.perez@codaini.demo');
  });

  it.each(['', 'sin-arroba', 'a@', '@codaini.demo', 'ana perez@codaini.demo', 'ana@codaini'])(
    'rechaza %j',
    (correo) => {
      const r = esquemaCorreo.safeParse(correo);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues[0].message).toBe('Escribe un correo válido.');
    },
  );
});

describe('correoEnUso', () => {
  const usuarios = [
    { id: 'u1', correo: 'Ana.Perez@Codaini.Demo' },
    { id: 'u2', correo: 'luis@codaini.demo' },
  ];

  it('compara sin distinguir mayúsculas ni espacios', () => {
    expect(correoEnUso(usuarios, 'ana.perez@codaini.demo')).toBe(true);
    expect(correoEnUso(usuarios, '  ANA.PEREZ@CODAINI.DEMO ')).toBe(true);
    expect(correoEnUso(usuarios, 'otra@codaini.demo')).toBe(false);
  });

  it('deja fuera a la propia persona al editar', () => {
    expect(correoEnUso(usuarios, 'ana.perez@codaini.demo', 'u1')).toBe(false);
    expect(correoEnUso(usuarios, 'luis@codaini.demo', 'u1')).toBe(true);
  });

  it('normalizarCorreo recorta y pasa a minúsculas', () => {
    expect(normalizarCorreo('  Ana@X.COM ')).toBe('ana@x.com');
  });
});

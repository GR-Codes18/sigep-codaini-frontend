import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  esquemaDiaReunion,
  esquemaFechaProyecto,
  esquemaHoraReunion,
  esquemaRamaBase,
  esquemaRepositorio,
  esquemaUrlEnlace,
  exigirReunionCompleta,
} from './esquemas';

describe('esquemaRepositorio (G1-A)', () => {
  it.each([
    'https://github.com/org-demo/plataforma-2d',
    'https://github.com/codaini/proyecto_prueba',
    'https://github.com/a1/repo.v2',
    'https://github.com/Org/Repo-Name.js',
  ])('acepta %s', (url) => {
    expect(esquemaRepositorio.safeParse(url).success).toBe(true);
  });

  it('recorta los espacios de los lados', () => {
    expect(esquemaRepositorio.parse('  https://github.com/org/repo ')).toBe(
      'https://github.com/org/repo',
    );
  });

  it.each([
    ['con «/» final', 'https://github.com/org/repo/'],
    ['con «.git»', 'https://github.com/org/repo.git'],
    ['sin repositorio', 'https://github.com/org'],
    ['con una subruta', 'https://github.com/org/repo/tree/main'],
    ['de otro sitio', 'https://gitlab.com/org/repo'],
    ['con http', 'http://github.com/org/repo'],
    ['sin protocolo', 'github.com/org/repo'],
    ['con espacios por dentro', 'https://github.com/org/mi repo'],
    ['con el repositorio «..»', 'https://github.com/org/..'],
    ['vacío', ''],
  ])('rechaza una dirección %s', (_caso, url) => {
    const r = esquemaRepositorio.safeParse(url);
    expect(r.success).toBe(false);
    if (!r.success)
      expect(r.error.issues[0].message).toContain('https://github.com/organización/repositorio');
  });
});

describe('esquemaRamaBase', () => {
  it.each(['main', 'develop', 'release/1.0'])('acepta %s', (rama) => {
    expect(esquemaRamaBase.safeParse(rama).success).toBe(true);
  });

  it.each([
    ['vacía', ''],
    ['de solo espacios', '   '],
    ['con espacios por dentro', 'mi rama'],
  ])('rechaza una rama %s', (_caso, rama) => {
    expect(esquemaRamaBase.safeParse(rama).success).toBe(false);
  });
});

describe('reunión semanal', () => {
  it.each(['00:00', '09:30', '23:59'])('acepta la hora %s', (hora) => {
    expect(esquemaHoraReunion.safeParse(hora).success).toBe(true);
  });

  it.each(['24:00', '9:30', '12:60', '12:5', 'mediodía', ''])('rechaza la hora %j', (hora) => {
    expect(esquemaHoraReunion.safeParse(hora).success).toBe(false);
  });

  it('acepta los siete días y rechaza otro', () => {
    for (const dia of ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']) {
      expect(esquemaDiaReunion.safeParse(dia).success).toBe(true);
    }
    expect(esquemaDiaReunion.safeParse('lunes').success).toBe(false);
  });

  describe('exigirReunionCompleta: día y hora juntos o ninguno', () => {
    const esquema = z
      .object({ dia_reunion: z.string().nullish(), hora_reunion: z.string().nullish() })
      .superRefine(exigirReunionCompleta);

    it.each([
      ['ninguno (undefined)', {}],
      ['ninguno (null)', { dia_reunion: null, hora_reunion: null }],
      ['los dos', { dia_reunion: 'LUNES', hora_reunion: '10:00' }],
    ])('acepta %s', (_caso, valor) => {
      expect(esquema.safeParse(valor).success).toBe(true);
    });

    it('el día sin la hora señala la hora', () => {
      const r = esquema.safeParse({ dia_reunion: 'LUNES', hora_reunion: null });
      expect(!r.success && r.error.issues.map((i) => i.path.join('.'))).toEqual(['hora_reunion']);
    });

    it('la hora sin el día señala el día', () => {
      const r = esquema.safeParse({ hora_reunion: '10:00' });
      expect(!r.success && r.error.issues.map((i) => i.path.join('.'))).toEqual(['dia_reunion']);
    });
  });
});

describe('fechas y enlaces', () => {
  it('la fecha debe existir en el calendario', () => {
    expect(esquemaFechaProyecto.safeParse('2028-02-29').success).toBe(true);
    expect(esquemaFechaProyecto.safeParse('2027-02-29').success).toBe(false);
    expect(esquemaFechaProyecto.safeParse('2026-13-01').success).toBe(false);
    expect(esquemaFechaProyecto.safeParse('01/12/2026').success).toBe(false);
  });

  it.each(['https://ejemplo.com', 'http://ejemplo.com/ruta?x=1', ' https://ejemplo.com '])(
    'acepta el enlace %j',
    (url) => {
      expect(esquemaUrlEnlace.safeParse(url).success).toBe(true);
    },
  );

  it.each(['', 'no es una url', 'ftp://ejemplo.com', 'javascript:alert(1)', 'ejemplo.com'])(
    'rechaza el enlace %j',
    (url) => {
      expect(esquemaUrlEnlace.safeParse(url).success).toBe(false);
    },
  );
});

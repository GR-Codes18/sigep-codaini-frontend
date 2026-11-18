import { describe, expect, it } from 'vitest';
import type { EstadoProyecto, Rol } from './enumeraciones';
import {
  ACCIONES_ESTADO_PROYECTO,
  CODIGOS_ESTADO_PROYECTO,
  accionesDeEstadoDisponibles,
  puedePausarProyecto,
  puedeReactivarProyecto,
  puedeReanudarProyecto,
} from './estadoProyecto';
import { puede } from './permisos';
import { proyecto, usuario } from './pruebas/fabricas';

const ESTADOS: EstadoProyecto[] = ['ACTIVO', 'EN_PAUSA', 'FINALIZADO'];
const NO_ADMIN: Rol[] = ['SUPERVISOR', 'PRACTICANTE'];

const admin = () => usuario('ADMINISTRADOR');
const supervisorActivo = () => usuario('SUPERVISOR');

/** La rejilla completa estado × acción: el estado nuevo si se permite; si no, el código. */
const REJILLA: Record<'pausar' | 'reanudar' | 'reactivar', Record<EstadoProyecto, string>> = {
  pausar: { ACTIVO: 'EN_PAUSA', EN_PAUSA: 'PROYECTO_NO_ACTIVO', FINALIZADO: 'PROYECTO_NO_ACTIVO' },
  reanudar: {
    ACTIVO: 'PROYECTO_NO_EN_PAUSA',
    EN_PAUSA: 'ACTIVO',
    FINALIZADO: 'PROYECTO_NO_EN_PAUSA',
  },
  reactivar: {
    ACTIVO: 'PROYECTO_NO_FINALIZADO',
    EN_PAUSA: 'PROYECTO_NO_FINALIZADO',
    FINALIZADO: 'ACTIVO',
  },
};

function ejecutar(accion: 'pausar' | 'reanudar' | 'reactivar', estado: EstadoProyecto) {
  const p = proyecto({ estado });
  if (accion === 'pausar') return puedePausarProyecto(admin(), p, { nota: 'Motivo.' });
  if (accion === 'reanudar') return puedeReanudarProyecto(admin(), p, { nota: 'Motivo.' });
  return puedeReactivarProyecto(admin(), p, supervisorActivo(), { nota: 'Motivo.' });
}

describe('estado × acción', () => {
  for (const accion of ['pausar', 'reanudar', 'reactivar'] as const) {
    for (const estado of ESTADOS) {
      const esperado = REJILLA[accion][estado];
      it(`${accion} con el proyecto ${estado} → ${esperado}`, () => {
        const r = ejecutar(accion, estado);
        if (esperado.startsWith('PROYECTO_')) {
          expect(r).toMatchObject({ ok: false, codigo: esperado });
          if (!r.ok) expect(r.mensaje?.length).toBeGreaterThan(15);
        } else {
          expect(r).toEqual({ ok: true, exige_texto: 'NOTA', estado_nuevo: esperado });
        }
      });
    }
  }
});

describe.each([
  [
    'puedePausarProyecto',
    (rol: Rol) => puedePausarProyecto(usuario(rol), proyecto({ estado: 'ACTIVO' }), { nota: 'x' }),
  ],
  [
    'puedeReanudarProyecto',
    (rol: Rol) =>
      puedeReanudarProyecto(usuario(rol), proyecto({ estado: 'EN_PAUSA' }), { nota: 'x' }),
  ],
  [
    'puedeReactivarProyecto',
    (rol: Rol) =>
      puedeReactivarProyecto(usuario(rol), proyecto({ estado: 'FINALIZADO' }), supervisorActivo(), {
        nota: 'x',
      }),
  ],
])('%s: permisos y texto', (_nombre, llamar) => {
  it('el Administrador activo puede, y se le pide una nota', () => {
    expect(llamar('ADMINISTRADOR')).toMatchObject({ ok: true, exige_texto: 'NOTA' });
  });

  it.each(NO_ADMIN)('el rol %s → ROL_NO_PERMITIDO', (rol) => {
    expect(llamar(rol)).toEqual({ ok: false, codigo: 'ROL_NO_PERMITIDO' });
  });
});

describe('la nota (orden: permiso → estado → [supervisor] → texto)', () => {
  it('sin nota, la acción queda permitida y pide la nota', () => {
    expect(puedePausarProyecto(admin(), proyecto({ estado: 'ACTIVO' }))).toEqual({
      ok: true,
      exige_texto: 'NOTA',
      estado_nuevo: 'EN_PAUSA',
    });
    expect(puedeReanudarProyecto(admin(), proyecto({ estado: 'EN_PAUSA' }))).toMatchObject({
      ok: true,
    });
    expect(
      puedeReactivarProyecto(admin(), proyecto({ estado: 'FINALIZADO' }), supervisorActivo()),
    ).toMatchObject({ ok: true, exige_texto: 'NOTA' });
  });

  it.each([
    ['vacía', ''],
    ['de solo espacios', '  \n '],
  ])('una nota %s → TEXTO_OBLIGATORIO', (_caso, nota) => {
    expect(puedePausarProyecto(admin(), proyecto({ estado: 'ACTIVO' }), { nota })).toEqual({
      ok: false,
      codigo: 'TEXTO_OBLIGATORIO',
    });
    expect(puedeReanudarProyecto(admin(), proyecto({ estado: 'EN_PAUSA' }), { nota })).toEqual({
      ok: false,
      codigo: 'TEXTO_OBLIGATORIO',
    });
    expect(
      puedeReactivarProyecto(admin(), proyecto({ estado: 'FINALIZADO' }), supervisorActivo(), {
        nota,
      }),
    ).toEqual({ ok: false, codigo: 'TEXTO_OBLIGATORIO' });
  });

  it('el estado gana sobre la nota vacía', () => {
    expect(
      puedePausarProyecto(admin(), proyecto({ estado: 'FINALIZADO' }), { nota: '' }),
    ).toMatchObject({
      ok: false,
      codigo: 'PROYECTO_NO_ACTIVO',
    });
  });

  it('el permiso gana sobre el estado', () => {
    expect(puedePausarProyecto(usuario('SUPERVISOR'), proyecto({ estado: 'FINALIZADO' }))).toEqual({
      ok: false,
      codigo: 'ROL_NO_PERMITIDO',
    });
  });

  it('exige el mismo texto que dice la matriz de permisos', () => {
    for (const accion of ['PAUSAR_PROYECTO', 'REANUDAR_PROYECTO', 'REACTIVAR_PROYECTO'] as const) {
      expect(puede(admin(), accion, { proyecto: proyecto() })).toEqual({
        permitido: true,
        exige_texto: 'NOTA',
      });
    }
  });
});

describe('puedeReactivarProyecto: el supervisor debe estar activo', () => {
  const finalizado = () => proyecto({ estado: 'FINALIZADO' });

  it('un supervisor INACTIVO → SUPERVISOR_DEL_PROYECTO_INACTIVO, con su mensaje', () => {
    const r = puedeReactivarProyecto(
      admin(),
      finalizado(),
      usuario('SUPERVISOR', { estado: 'INACTIVO' }),
      {
        nota: 'x',
      },
    );
    expect(r).toMatchObject({ ok: false, codigo: 'SUPERVISOR_DEL_PROYECTO_INACTIVO' });
    expect(!r.ok && r.mensaje).toContain('reactívalo');
  });

  it('un supervisor que no existe → SUPERVISOR_DEL_PROYECTO_INACTIVO', () => {
    expect(puedeReactivarProyecto(admin(), finalizado(), undefined, { nota: 'x' })).toMatchObject({
      ok: false,
      codigo: 'SUPERVISOR_DEL_PROYECTO_INACTIVO',
    });
  });

  it('una cuenta que no es de supervisor → SUPERVISOR_DEL_PROYECTO_INACTIVO', () => {
    expect(
      puedeReactivarProyecto(admin(), finalizado(), usuario('PRACTICANTE'), { nota: 'x' }),
    ).toMatchObject({ ok: false, codigo: 'SUPERVISOR_DEL_PROYECTO_INACTIVO' });
  });

  it('el supervisor se comprueba antes que la nota', () => {
    const r = puedeReactivarProyecto(
      admin(),
      finalizado(),
      usuario('SUPERVISOR', { estado: 'INACTIVO' }),
      {
        nota: '',
      },
    );
    expect(r).toMatchObject({ ok: false, codigo: 'SUPERVISOR_DEL_PROYECTO_INACTIVO' });
  });

  it('el estado se comprueba antes que el supervisor', () => {
    expect(
      puedeReactivarProyecto(admin(), proyecto({ estado: 'ACTIVO' }), undefined, { nota: 'x' }),
    ).toMatchObject({ ok: false, codigo: 'PROYECTO_NO_FINALIZADO' });
  });
});

describe('accionesDeEstadoDisponibles', () => {
  it.each([
    ['ACTIVO', ['PAUSAR', 'FINALIZAR']],
    ['EN_PAUSA', ['REANUDAR', 'FINALIZAR']],
    ['FINALIZADO', ['REACTIVAR']],
  ] as [EstadoProyecto, string[]][])('con el proyecto %s: %j', (estado, acciones) => {
    expect(accionesDeEstadoDisponibles(estado)).toEqual(acciones);
  });

  it('todas son acciones conocidas y cada una aparece en algún estado', () => {
    const todas = ESTADOS.flatMap((e) => accionesDeEstadoDisponibles(e));
    for (const a of todas) expect(ACCIONES_ESTADO_PROYECTO).toContain(a);
    for (const a of ACCIONES_ESTADO_PROYECTO) expect(todas).toContain(a);
  });
});

describe('códigos y pureza', () => {
  it('son cuatro códigos propios', () => {
    expect(CODIGOS_ESTADO_PROYECTO).toEqual([
      'PROYECTO_NO_ACTIVO',
      'PROYECTO_NO_EN_PAUSA',
      'PROYECTO_NO_FINALIZADO',
      'SUPERVISOR_DEL_PROYECTO_INACTIVO',
    ]);
  });

  it('no modifica el proyecto ni las personas', () => {
    const p = proyecto({ estado: 'FINALIZADO' });
    const a = admin();
    const s = supervisorActivo();
    const copias = structuredClone([p, a, s]);
    puedeReactivarProyecto(a, p, s, { nota: 'x' });
    expect([p, a, s]).toEqual(copias);
  });
});

import { describe, expect, it } from 'vitest';

import { accionesDeTarea } from './accionesTarea';
import type { AccionDeTarea } from './accionesTarea';
import type { Rol } from './enumeraciones';
import { ROLES } from './enumeraciones';
import { IDS, asignacion, proyecto, tarea, usuario } from './pruebas/fabricas';
import type { Tarea } from './tareas';
import type { ContextoTransicion } from './transiciones';
import type { Usuario } from './usuarios';

/** El contexto que arma el servicio: asignaciones de quien actúa (solo los practicantes tienen). */
function contexto(
  quien: Usuario,
  cambiosDelProyecto: Parameters<typeof proyecto>[0] = {},
): ContextoTransicion {
  return {
    proyecto: proyecto(cambiosDelProyecto),
    asignaciones: quien.rol === 'PRACTICANTE' ? [asignacion({ id_practicante: quien.id })] : [],
  };
}

function nombres(t: Tarea, quien: Usuario, cambiosDelProyecto = {}): AccionDeTarea[] {
  return accionesDeTarea(t, quien, contexto(quien, cambiosDelProyecto)).map((a) => a.accion);
}

const disponible = () => tarea({ estado: 'DISPONIBLE', id_practicante: null });
const enProgreso = (cambios: Partial<Tarea> = {}) => tarea({ estado: 'EN_PROGRESO', ...cambios });
const esperando = (cambios: Partial<Tarea> = {}) =>
  tarea({ estado: 'ESPERANDO_SUPERVISION', requiere_supervision: true, ...cambios });
const terminada = (cambios: Partial<Tarea> = {}) =>
  tarea({ estado: 'TERMINADA', fecha_termino: '2026-11-10T15:00:00.000Z', ...cambios });
const conPR = {
  estado_pr: 'CREADO',
  url_pull_request: 'https://github.com/codaini/proyecto-prueba/pull/1',
  rama_origen: 'feature/PRB-001',
  rama_base: 'main',
} as const;

describe('accionesDeTarea · tarea DISPONIBLE', () => {
  it('el practicante del proyecto solo puede tomarla', () => {
    expect(nombres(disponible(), usuario('PRACTICANTE'))).toEqual(['TOMAR']);
  });

  it('el supervisor del proyecto edita, cambia opciones y elimina (con motivo), en ese orden', () => {
    const supervisor = usuario('SUPERVISOR');

    expect(accionesDeTarea(disponible(), supervisor, contexto(supervisor))).toEqual([
      { accion: 'EDITAR_DATOS', exige_texto: null },
      { accion: 'CAMBIAR_REQUIERE_SUPERVISION', exige_texto: null },
      { accion: 'DESACTIVAR_REQUIERE_PR', exige_texto: null },
      { accion: 'ELIMINAR', exige_texto: 'MOTIVO' },
    ]);
  });

  it('el administrador ve lo mismo que el supervisor (no toma tareas)', () => {
    const admin = usuario('ADMINISTRADOR');

    expect(nombres(disponible(), admin)).toEqual([
      'EDITAR_DATOS',
      'CAMBIAR_REQUIERE_SUPERVISION',
      'DESACTIVAR_REQUIERE_PR',
      'ELIMINAR',
    ]);
  });

  it('con «Requiere PR» desactivado ofrece activarlo y no desactivarlo', () => {
    const supervisor = usuario('SUPERVISOR');
    const acciones = nombres(
      tarea({ estado: 'DISPONIBLE', id_practicante: null, requiere_pr: false }),
      supervisor,
    );

    expect(acciones).toContain('ACTIVAR_REQUIERE_PR');
    expect(acciones).not.toContain('DESACTIVAR_REQUIERE_PR');
  });

  it('si ya hubo un PR no se puede eliminar ni cambiar «Requiere PR»', () => {
    const supervisor = usuario('SUPERVISOR');
    const acciones = nombres(
      tarea({ estado: 'DISPONIBLE', id_practicante: null, ...conPR, estado_pr: 'CERRADO' }),
      supervisor,
    );

    expect(acciones).not.toContain('ELIMINAR');
    expect(acciones).not.toContain('DESACTIVAR_REQUIERE_PR');
    expect(acciones).toEqual(['EDITAR_DATOS', 'CAMBIAR_REQUIERE_SUPERVISION']);
  });

  it('en un proyecto EN_PAUSA el practicante no puede tomarla', () => {
    expect(nombres(disponible(), usuario('PRACTICANTE'), { estado: 'EN_PAUSA' })).toEqual([]);
  });
});

describe('accionesDeTarea · tarea EN_PROGRESO', () => {
  it('el responsable sin supervisión: liberar, terminar y desactivar «Requiere PR» (con motivo)', () => {
    const practicante = usuario('PRACTICANTE');

    expect(accionesDeTarea(enProgreso(), practicante, contexto(practicante))).toEqual([
      { accion: 'LIBERAR', exige_texto: null },
      { accion: 'MARCAR_TERMINADA', exige_texto: null },
      { accion: 'DESACTIVAR_REQUIERE_PR', exige_texto: 'MOTIVO' },
    ]);
  });

  it('el responsable con supervisión: enviar en lugar de terminar', () => {
    const practicante = usuario('PRACTICANTE');

    expect(nombres(enProgreso({ requiere_supervision: true }), practicante)).toEqual([
      'LIBERAR',
      'ENVIAR_A_SUPERVISION',
      'DESACTIVAR_REQUIERE_PR',
    ]);
  });

  it('un practicante NO responsable ve la tarea ajena en solo lectura: sin acciones', () => {
    const otro = usuario('PRACTICANTE', { id: IDS.practicanteAjeno });

    expect(nombres(enProgreso(), otro)).toEqual([]);
  });

  it('el supervisor puede liberar con motivo, editar y cambiar opciones', () => {
    const supervisor = usuario('SUPERVISOR');

    expect(accionesDeTarea(enProgreso(), supervisor, contexto(supervisor))).toEqual([
      { accion: 'LIBERAR', exige_texto: 'MOTIVO' },
      { accion: 'EDITAR_DATOS', exige_texto: null },
      { accion: 'CAMBIAR_REQUIERE_SUPERVISION', exige_texto: null },
      { accion: 'DESACTIVAR_REQUIERE_PR', exige_texto: null },
    ]);
  });
});

describe('accionesDeTarea · ESPERANDO_SUPERVISION y TERMINADA', () => {
  it('el supervisor aprueba, devuelve (con nota) y puede desactivar «Requiere PR» si aún no hay PR', () => {
    const supervisor = usuario('SUPERVISOR');
    const t = esperando({ estado_pr: 'PENDIENTE' });

    expect(accionesDeTarea(t, supervisor, contexto(supervisor))).toEqual([
      { accion: 'APROBAR', exige_texto: null },
      { accion: 'DEVOLVER', exige_texto: 'NOTA' },
      { accion: 'DESACTIVAR_REQUIERE_PR', exige_texto: null },
    ]);
  });

  it('el administrador NO aprueba ni devuelve', () => {
    const admin = usuario('ADMINISTRADOR');

    expect(nombres(esperando({ estado_pr: 'PENDIENTE' }), admin)).toEqual([
      'DESACTIVAR_REQUIERE_PR',
    ]);
  });

  it('el responsable crea el PR cuando la etiqueta es Pendiente', () => {
    const practicante = usuario('PRACTICANTE');

    expect(nombres(esperando({ estado_pr: 'PENDIENTE' }), practicante)).toEqual([
      'DESACTIVAR_REQUIERE_PR',
      'CREAR_PULL_REQUEST',
    ]);
  });

  it('con el PR creado se ofrece cerrarlo (con motivo) y no crearlo', () => {
    const practicante = usuario('PRACTICANTE');
    const supervisor = usuario('SUPERVISOR');
    const t = esperando({ ...conPR });

    expect(accionesDeTarea(t, practicante, contexto(practicante))).toEqual([
      { accion: 'CERRAR_PULL_REQUEST', exige_texto: 'MOTIVO' },
    ]);
    expect(accionesDeTarea(t, supervisor, contexto(supervisor))).toEqual([
      { accion: 'APROBAR', exige_texto: null },
      { accion: 'DEVOLVER', exige_texto: 'NOTA' },
      { accion: 'CERRAR_PULL_REQUEST', exige_texto: 'MOTIVO' },
    ]);
  });

  it('con el PR cerrado el responsable puede crear uno nuevo', () => {
    const practicante = usuario('PRACTICANTE');

    expect(nombres(esperando({ ...conPR, estado_pr: 'CERRADO' }), practicante)).toEqual([
      'CREAR_PULL_REQUEST',
    ]);
  });

  it('una tarea TERMINADA con el PR fusionado solo se puede reabrir (con nota)', () => {
    const supervisor = usuario('SUPERVISOR');
    const admin = usuario('ADMINISTRADOR');
    const t = terminada({ ...conPR, estado_pr: 'FUSIONADO' });

    expect(accionesDeTarea(t, supervisor, contexto(supervisor))).toEqual([
      { accion: 'REABRIR', exige_texto: 'NOTA' },
    ]);
    expect(accionesDeTarea(t, admin, contexto(admin))).toEqual([
      { accion: 'REABRIR', exige_texto: 'NOTA' },
    ]);
    expect(nombres(t, usuario('PRACTICANTE'))).toEqual([]);
  });
});

describe('accionesDeTarea · alcance y estado del proyecto', () => {
  const casos: Array<[string, () => Tarea]> = [
    ['DISPONIBLE', disponible],
    ['EN_PROGRESO', () => enProgreso()],
    ['ESPERANDO_SUPERVISION', () => esperando({ estado_pr: 'PENDIENTE' })],
    ['TERMINADA', () => terminada({ estado_pr: 'PENDIENTE' })],
  ];

  for (const [estado, crear] of casos) {
    it(`en un proyecto FINALIZADO nadie tiene acciones (${estado})`, () => {
      for (const rol of ROLES) {
        expect(
          nombres(crear(), usuario(rol), { estado: 'FINALIZADO' }),
          `${estado} · ${rol}`,
        ).toEqual([]);
      }
    });

    it(`un supervisor ajeno no tiene acciones (${estado})`, () => {
      const ajeno = usuario('SUPERVISOR', { id: IDS.supervisorAjeno });

      expect(nombres(crear(), ajeno)).toEqual([]);
    });

    it(`un usuario INACTIVO no tiene acciones (${estado})`, () => {
      for (const rol of ROLES) {
        const inactivo = usuario(rol, { estado: 'INACTIVO' });

        expect(nombres(crear(), inactivo), `${estado} · ${rol}`).toEqual([]);
      }
    });
  }

  it('un practicante sin asignación vigente (con baja) no tiene acciones', () => {
    const practicante = usuario('PRACTICANTE');
    const sinAsignacion: ContextoTransicion = {
      proyecto: proyecto(),
      asignaciones: [asignacion({ fecha_baja: '2026-10-01' })],
    };

    expect(accionesDeTarea(disponible(), practicante, sinAsignacion)).toEqual([]);
    expect(accionesDeTarea(enProgreso(), practicante, sinAsignacion)).toEqual([]);
  });
});

describe('accionesDeTarea · propiedades generales', () => {
  it('eliminar siempre es la última acción', () => {
    const supervisor = usuario('SUPERVISOR');
    const acciones = nombres(disponible(), supervisor);

    expect(acciones[acciones.length - 1]).toBe('ELIMINAR');
  });

  it('no repite acciones en ningún estado ni rol', () => {
    const tareas = [disponible(), enProgreso(), esperando({ estado_pr: 'PENDIENTE' }), terminada()];

    for (const t of tareas) {
      for (const rol of ROLES as readonly Rol[]) {
        const lista = nombres(t, usuario(rol));
        expect(new Set(lista).size, `${t.estado} · ${rol}`).toBe(lista.length);
      }
    }
  });

  it('no modifica la tarea ni el contexto de entrada', () => {
    const supervisor = usuario('SUPERVISOR');
    const t = Object.freeze(enProgreso());
    const ctx = Object.freeze({
      proyecto: Object.freeze(proyecto()),
      asignaciones: Object.freeze([]) as never,
    });

    expect(() => accionesDeTarea(t, supervisor, ctx)).not.toThrow();
  });
});

import { describe, expect, it } from 'vitest';

import type { EstadoTarea, Rol } from './enumeraciones';
import { ESTADOS_TAREA } from './enumeraciones';
import { ACCIONES_PERMISO } from './permisos';
import type { Asignacion, Proyecto } from './proyectos';
import { IDS, asignacion, proyecto, tarea, usuario } from './pruebas/fabricas';
import type { Tarea } from './tareas';
import {
  ACCIONES_TRANSICION,
  TRANSICIONES_TAREA,
  puedeTransicionar,
  transicionesDisponibles,
} from './transiciones';
import type {
  AccionTransicion,
  CodigoTransicion,
  ContextoTransicion,
  ResultadoTransicion,
  TransicionDisponible,
} from './transiciones';

/** Celda de la matriz: permitida sin texto, permitida con ese texto o denegada con ese código. */
type Celda = true | 'MOTIVO' | 'NOTA' | CodigoTransicion;

function esperarResultado(resultado: ResultadoTransicion, esperado: Celda): void {
  if (esperado === true) {
    expect(resultado).toEqual({ permitido: true, exige_texto: null });
  } else if (esperado === 'MOTIVO' || esperado === 'NOTA') {
    expect(resultado).toEqual({ permitido: true, exige_texto: esperado });
  } else {
    expect(resultado).toEqual({ permitido: false, codigo: esperado });
  }
}

function contexto(
  cambios: { proyecto?: Partial<Proyecto>; asignaciones?: Asignacion[] } = {},
): ContextoTransicion {
  return {
    proyecto: proyecto(cambios.proyecto),
    asignaciones: cambios.asignaciones ?? [asignacion()],
  };
}

function tareaEn(estado: EstadoTarea, cambios: Partial<Tarea> = {}): Tarea {
  return tarea({
    estado,
    id_practicante: estado === 'DISPONIBLE' ? null : IDS.practicante,
    ...cambios,
  });
}

function nombres(disponibles: TransicionDisponible[]): AccionTransicion[] {
  return disponibles.map((disponible) => disponible.transicion);
}

describe('contrato de transiciones', () => {
  it('define las 7 transiciones de §6.2 sin repetidos', () => {
    expect(ACCIONES_TRANSICION).toHaveLength(7);
    expect(new Set(ACCIONES_TRANSICION).size).toBe(7);
  });

  it('el catálogo es total y cada entrada usa estados y acciones válidos', () => {
    expect(Object.keys(TRANSICIONES_TAREA)).toHaveLength(7);
    expect(new Set(Object.keys(TRANSICIONES_TAREA))).toEqual(new Set(ACCIONES_TRANSICION));

    for (const transicion of ACCIONES_TRANSICION) {
      const definicion = TRANSICIONES_TAREA[transicion];
      expect(ESTADOS_TAREA).toContain(definicion.desde);
      expect(ESTADOS_TAREA).toContain(definicion.hacia);
      expect(ACCIONES_PERMISO).toContain(definicion.accion);
    }
  });

  it('los pares (desde, hacia) son exactamente los de §6.2', () => {
    // Lista escrita a mano desde la tabla de §6.2. No se genera desde TRANSICIONES_TAREA: si el
    // catálogo cambia, esta prueba no se entera y falla.
    const paresDe62: Array<[EstadoTarea, EstadoTarea, AccionTransicion]> = [
      // §6.2 «Disponible → En progreso · Practicante del proyecto · Tomar la tarea»
      ['DISPONIBLE', 'EN_PROGRESO', 'TOMAR'],
      // §6.2 «En progreso → Disponible · Practicante responsable, Supervisor o Administrador · Liberar»
      ['EN_PROGRESO', 'DISPONIBLE', 'LIBERAR'],
      // §6.2 «En progreso → Esperando supervisión · Practicante responsable · Enviar a revisión»
      ['EN_PROGRESO', 'ESPERANDO_SUPERVISION', 'ENVIAR_A_SUPERVISION'],
      // §6.2 «En progreso → Terminada · Practicante responsable · Marcar como terminada»
      ['EN_PROGRESO', 'TERMINADA', 'MARCAR_TERMINADA'],
      // §6.2 «Esperando supervisión → Terminada · Supervisor del proyecto · Aprobar»
      ['ESPERANDO_SUPERVISION', 'TERMINADA', 'APROBAR'],
      // §6.2 «Esperando supervisión → En progreso · Supervisor del proyecto · Devolver»
      ['ESPERANDO_SUPERVISION', 'EN_PROGRESO', 'DEVOLVER'],
      // §6.2 «Terminada → En progreso · Supervisor o Administrador · Reabrir»
      ['TERMINADA', 'EN_PROGRESO', 'REABRIR'],
    ];

    const paresDelCatalogo = ACCIONES_TRANSICION.map((transicion) => {
      const { desde, hacia } = TRANSICIONES_TAREA[transicion];
      return [desde, hacia, transicion];
    });

    expect(paresDelCatalogo).toEqual(paresDe62);
  });
});

interface FilaMatriz {
  desde: EstadoTarea;
  hacia: EstadoTarea;
  transicion: AccionTransicion;
  requiere_supervision: boolean;
  admin: Celda;
  supervisor: Celda;
  practicante: Celda;
}

// Una fila por transición, con el texto de §6.2 como comentario. La matriz se escribe a mano:
// no se deriva de TRANSICIONES_TAREA.
// prettier-ignore
const FILAS_MATRIZ: FilaMatriz[] = [
  // §6.2 «Disponible → En progreso · Practicante del proyecto · Tomar la tarea. No se puede si el proyecto está en pausa.»
  { desde: 'DISPONIBLE', hacia: 'EN_PROGRESO', transicion: 'TOMAR', requiere_supervision: false, admin: 'ROL_NO_PERMITIDO', supervisor: 'ROL_NO_PERMITIDO', practicante: true },
  // §6.2 «En progreso → Disponible · Practicante responsable, Supervisor o Administrador · Liberar. Si lo hace el Supervisor o el Administrador, el motivo es obligatorio.»
  { desde: 'EN_PROGRESO', hacia: 'DISPONIBLE', transicion: 'LIBERAR', requiere_supervision: false, admin: 'MOTIVO', supervisor: 'MOTIVO', practicante: true },
  // §6.2 «En progreso → Esperando supervisión · Practicante responsable · Enviar a revisión. Solo si la tarea requiere supervisión.»
  { desde: 'EN_PROGRESO', hacia: 'ESPERANDO_SUPERVISION', transicion: 'ENVIAR_A_SUPERVISION', requiere_supervision: true, admin: 'ROL_NO_PERMITIDO', supervisor: 'ROL_NO_PERMITIDO', practicante: true },
  // §6.2 «En progreso → Terminada · Practicante responsable · Marcar como terminada. Solo si la tarea no requiere supervisión.»
  { desde: 'EN_PROGRESO', hacia: 'TERMINADA', transicion: 'MARCAR_TERMINADA', requiere_supervision: false, admin: 'ROL_NO_PERMITIDO', supervisor: 'ROL_NO_PERMITIDO', practicante: true },
  // §6.2 «Esperando supervisión → Terminada · Supervisor del proyecto · Aprobar.»
  { desde: 'ESPERANDO_SUPERVISION', hacia: 'TERMINADA', transicion: 'APROBAR', requiere_supervision: true, admin: 'ROL_NO_PERMITIDO', supervisor: true, practicante: 'ROL_NO_PERMITIDO' },
  // §6.2 «Esperando supervisión → En progreso · Supervisor del proyecto · Devolver, con nota obligatoria. La tarea queda marcada "Devuelta con observaciones".»
  { desde: 'ESPERANDO_SUPERVISION', hacia: 'EN_PROGRESO', transicion: 'DEVOLVER', requiere_supervision: true, admin: 'ROL_NO_PERMITIDO', supervisor: 'NOTA', practicante: 'ROL_NO_PERMITIDO' },
  // §6.2 «Terminada → En progreso · Supervisor o Administrador · Reabrir, con nota obligatoria.»
  { desde: 'TERMINADA', hacia: 'EN_PROGRESO', transicion: 'REABRIR', requiere_supervision: true, admin: 'NOTA', supervisor: 'NOTA', practicante: 'ROL_NO_PERMITIDO' },
];

describe('matriz estado × rol de §6.2', () => {
  const roles: Rol[] = ['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'];

  for (const fila of FILAS_MATRIZ) {
    it(`${fila.desde} → ${fila.hacia} (${fila.transicion})`, () => {
      const t = tareaEn(fila.desde, { requiere_supervision: fila.requiere_supervision });
      const ctx = contexto();

      for (const rol of roles) {
        const esperado =
          fila[
            rol === 'ADMINISTRADOR' ? 'admin' : rol === 'SUPERVISOR' ? 'supervisor' : 'practicante'
          ];
        esperarResultado(puedeTransicionar(t, usuario(rol), ctx, fila.transicion), esperado);
      }
    });
  }
});

describe('condiciones de §6.2', () => {
  it('no se puede tomar una tarea en un proyecto EN_PAUSA', () => {
    const t = tareaEn('DISPONIBLE');
    const ctx = contexto({ proyecto: { estado: 'EN_PAUSA' } });

    esperarResultado(
      puedeTransicionar(t, usuario('PRACTICANTE'), ctx, 'TOMAR'),
      'PROYECTO_EN_PAUSA',
    );
  });

  it('no se puede enviar a supervisión si la tarea no requiere supervisión', () => {
    const t = tareaEn('EN_PROGRESO', { requiere_supervision: false });

    esperarResultado(
      puedeTransicionar(t, usuario('PRACTICANTE'), contexto(), 'ENVIAR_A_SUPERVISION'),
      'TAREA_NO_REQUIERE_SUPERVISION',
    );
  });

  it('no se puede marcar terminada si la tarea requiere supervisión', () => {
    const t = tareaEn('EN_PROGRESO', { requiere_supervision: true });

    esperarResultado(
      puedeTransicionar(t, usuario('PRACTICANTE'), contexto(), 'MARCAR_TERMINADA'),
      'TAREA_REQUIERE_SUPERVISION',
    );
  });

  it('ENVIAR_A_SUPERVISION y MARCAR_TERMINADA nunca están ambas disponibles', () => {
    for (const requiere_supervision of [true, false]) {
      for (const rol of ['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'] as const) {
        const t = tareaEn('EN_PROGRESO', { requiere_supervision });
        const disponibles = nombres(transicionesDisponibles(t, usuario(rol), contexto()));

        const tieneEnviar = disponibles.includes('ENVIAR_A_SUPERVISION');
        const tieneTerminar = disponibles.includes('MARCAR_TERMINADA');

        expect(tieneEnviar && tieneTerminar).toBe(false);
        if (rol === 'PRACTICANTE') {
          expect(tieneEnviar).toBe(requiere_supervision);
          expect(tieneTerminar).toBe(!requiere_supervision);
        }
      }
    }
  });

  it('el proyecto EN_PAUSA solo bloquea TOMAR', () => {
    const ctx = contexto({ proyecto: { estado: 'EN_PAUSA' } });

    expect(
      nombres(transicionesDisponibles(tareaEn('DISPONIBLE'), usuario('PRACTICANTE'), ctx)),
    ).toEqual([]);

    const enProgreso = tareaEn('EN_PROGRESO', { requiere_supervision: true });
    expect(nombres(transicionesDisponibles(enProgreso, usuario('PRACTICANTE'), ctx))).toEqual([
      'LIBERAR',
      'ENVIAR_A_SUPERVISION',
    ]);

    const esperando = tareaEn('ESPERANDO_SUPERVISION', { requiere_supervision: true });
    expect(nombres(transicionesDisponibles(esperando, usuario('SUPERVISOR'), ctx))).toEqual([
      'APROBAR',
      'DEVOLVER',
    ]);

    const terminada = tareaEn('TERMINADA');
    expect(nombres(transicionesDisponibles(terminada, usuario('ADMINISTRADOR'), ctx))).toEqual([
      'REABRIR',
    ]);
  });
});

describe('proyecto FINALIZADO', () => {
  it('no deja ninguna transición disponible para ningún rol y estado', () => {
    const ctx = contexto({ proyecto: { estado: 'FINALIZADO' } });
    const roles: Rol[] = ['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'];

    for (const estado of ESTADOS_TAREA) {
      const t = tareaEn(estado);
      for (const rol of roles) {
        expect(transicionesDisponibles(t, usuario(rol), ctx)).toEqual([]);
      }
    }
  });

  it('devuelve PROYECTO_FINALIZADO cuando el rol y el alcance ya eran válidos', () => {
    const t = tareaEn('EN_PROGRESO', { requiere_supervision: false });
    const ctx = contexto({ proyecto: { estado: 'FINALIZADO' } });

    esperarResultado(
      puedeTransicionar(t, usuario('PRACTICANTE'), ctx, 'MARCAR_TERMINADA'),
      'PROYECTO_FINALIZADO',
    );
  });
});

describe('usuario INACTIVO', () => {
  it('no deja ninguna transición disponible para ningún rol y estado', () => {
    const ctx = contexto();
    const roles: Rol[] = ['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'];

    for (const estado of ESTADOS_TAREA) {
      const t = tareaEn(estado);
      for (const rol of roles) {
        expect(transicionesDisponibles(t, usuario(rol, { estado: 'INACTIVO' }), ctx)).toEqual([]);
      }
    }
  });

  it('devuelve USUARIO_INACTIVO antes que cualquier regla de estado', () => {
    const t = tareaEn('TERMINADA');

    esperarResultado(
      puedeTransicionar(t, usuario('ADMINISTRADOR', { estado: 'INACTIVO' }), contexto(), 'REABRIR'),
      'USUARIO_INACTIVO',
    );
  });
});

describe('orden: puede() antes que el estado', () => {
  it('un practicante sin asignación recibe FUERA_DE_ALCANCE aunque el estado no coincida', () => {
    // La tarea está EN_PROGRESO y TOMAR espera DISPONIBLE. Sin asignación, manda el alcance.
    const t = tareaEn('EN_PROGRESO');
    const ctx = contexto({ asignaciones: [] });

    esperarResultado(
      puedeTransicionar(t, usuario('PRACTICANTE'), ctx, 'TOMAR'),
      'FUERA_DE_ALCANCE',
    );
  });

  it('un practicante con la asignación dada de baja recibe FUERA_DE_ALCANCE', () => {
    const t = tareaEn('EN_PROGRESO');
    const ctx = contexto({ asignaciones: [asignacion({ fecha_baja: '2026-04-30' })] });

    esperarResultado(
      puedeTransicionar(t, usuario('PRACTICANTE'), ctx, 'TOMAR'),
      'FUERA_DE_ALCANCE',
    );
  });

  it('un supervisor ajeno recibe FUERA_DE_ALCANCE aunque el estado no coincida', () => {
    // La tarea está TERMINADA y APROBAR espera ESPERANDO_SUPERVISION. Manda el alcance.
    const t = tareaEn('TERMINADA');
    const ctx = contexto({ proyecto: { id_supervisor: IDS.supervisorAjeno } });

    esperarResultado(
      puedeTransicionar(t, usuario('SUPERVISOR'), ctx, 'APROBAR'),
      'FUERA_DE_ALCANCE',
    );
  });

  it('con alcance válido, un estado que no coincide devuelve TRANSICION_NO_APLICA', () => {
    const t = tareaEn('EN_PROGRESO');

    esperarResultado(
      puedeTransicionar(t, usuario('ADMINISTRADOR'), contexto(), 'REABRIR'),
      'TRANSICION_NO_APLICA',
    );
  });
});

describe('alcance del supervisor y del practicante', () => {
  it('el supervisor ajeno no puede aprobar una tarea que espera supervisión', () => {
    const t = tareaEn('ESPERANDO_SUPERVISION', { requiere_supervision: true });
    const ctx = contexto({ proyecto: { id_supervisor: IDS.supervisorAjeno } });

    esperarResultado(
      puedeTransicionar(t, usuario('SUPERVISOR'), ctx, 'APROBAR'),
      'FUERA_DE_ALCANCE',
    );
  });

  it('el practicante asignado que no es el responsable no puede liberar ni enviar', () => {
    const t = tareaEn('EN_PROGRESO', { id_practicante: IDS.practicanteAjeno });
    const ctx = contexto();

    esperarResultado(
      puedeTransicionar(t, usuario('PRACTICANTE'), ctx, 'LIBERAR'),
      'NO_ES_EL_RESPONSABLE',
    );
    esperarResultado(
      puedeTransicionar(t, usuario('PRACTICANTE'), ctx, 'ENVIAR_A_SUPERVISION'),
      'NO_ES_EL_RESPONSABLE',
    );
  });

  it('el practicante sin asignación no puede hacer nada en EN_PROGRESO', () => {
    const t = tareaEn('EN_PROGRESO');
    const ctx = contexto({ asignaciones: [] });

    expect(transicionesDisponibles(t, usuario('PRACTICANTE'), ctx)).toEqual([]);
  });
});

describe('texto obligatorio', () => {
  it('LIBERAR por Administrador o Supervisor exige motivo no vacío', () => {
    const t = tareaEn('EN_PROGRESO');
    const ctx = contexto();

    for (const rol of ['ADMINISTRADOR', 'SUPERVISOR'] as const) {
      esperarResultado(puedeTransicionar(t, usuario(rol), ctx, 'LIBERAR'), 'MOTIVO');
      esperarResultado(puedeTransicionar(t, usuario(rol), ctx, 'LIBERAR', {}), 'MOTIVO');
      esperarResultado(
        puedeTransicionar(t, usuario(rol), ctx, 'LIBERAR', { motivo: '' }),
        'TEXTO_OBLIGATORIO',
      );
      esperarResultado(
        puedeTransicionar(t, usuario(rol), ctx, 'LIBERAR', { motivo: '   ' }),
        'TEXTO_OBLIGATORIO',
      );
      esperarResultado(
        puedeTransicionar(t, usuario(rol), ctx, 'LIBERAR', { motivo: 'motivo' }),
        'MOTIVO',
      );
    }
  });

  it('LIBERAR por el practicante no exige texto y lo ignora', () => {
    const t = tareaEn('EN_PROGRESO');
    const ctx = contexto();

    esperarResultado(puedeTransicionar(t, usuario('PRACTICANTE'), ctx, 'LIBERAR'), true);
    esperarResultado(
      puedeTransicionar(t, usuario('PRACTICANTE'), ctx, 'LIBERAR', { motivo: '' }),
      true,
    );
    esperarResultado(
      puedeTransicionar(t, usuario('PRACTICANTE'), ctx, 'LIBERAR', { motivo: 'texto' }),
      true,
    );
  });

  it('DEVOLVER exige nota no vacía', () => {
    const t = tareaEn('ESPERANDO_SUPERVISION', { requiere_supervision: true });
    const ctx = contexto();
    const sup = usuario('SUPERVISOR');

    esperarResultado(puedeTransicionar(t, sup, ctx, 'DEVOLVER'), 'NOTA');
    esperarResultado(puedeTransicionar(t, sup, ctx, 'DEVOLVER', {}), 'NOTA');
    esperarResultado(puedeTransicionar(t, sup, ctx, 'DEVOLVER', { nota: '' }), 'TEXTO_OBLIGATORIO');
    esperarResultado(
      puedeTransicionar(t, sup, ctx, 'DEVOLVER', { nota: '   ' }),
      'TEXTO_OBLIGATORIO',
    );
    esperarResultado(puedeTransicionar(t, sup, ctx, 'DEVOLVER', { nota: 'corregir' }), 'NOTA');
  });

  it('REABRIR exige nota no vacía', () => {
    const t = tareaEn('TERMINADA');
    const ctx = contexto();

    for (const rol of ['ADMINISTRADOR', 'SUPERVISOR'] as const) {
      esperarResultado(puedeTransicionar(t, usuario(rol), ctx, 'REABRIR'), 'NOTA');
      esperarResultado(puedeTransicionar(t, usuario(rol), ctx, 'REABRIR', {}), 'NOTA');
      esperarResultado(
        puedeTransicionar(t, usuario(rol), ctx, 'REABRIR', { nota: '' }),
        'TEXTO_OBLIGATORIO',
      );
      esperarResultado(
        puedeTransicionar(t, usuario(rol), ctx, 'REABRIR', { nota: '   ' }),
        'TEXTO_OBLIGATORIO',
      );
      esperarResultado(
        puedeTransicionar(t, usuario(rol), ctx, 'REABRIR', { nota: 'reabrir' }),
        'NOTA',
      );
    }
  });

  it('las transiciones sin texto ignoran el texto enviado', () => {
    const ctx = contexto();

    esperarResultado(
      puedeTransicionar(tareaEn('DISPONIBLE'), usuario('PRACTICANTE'), ctx, 'TOMAR', {
        motivo: '',
      }),
      true,
    );
    esperarResultado(
      puedeTransicionar(
        tareaEn('EN_PROGRESO', { requiere_supervision: true }),
        usuario('PRACTICANTE'),
        ctx,
        'ENVIAR_A_SUPERVISION',
        { nota: '' },
      ),
      true,
    );
    esperarResultado(
      puedeTransicionar(
        tareaEn('EN_PROGRESO', { requiere_supervision: false }),
        usuario('PRACTICANTE'),
        ctx,
        'MARCAR_TERMINADA',
        { nota: '' },
      ),
      true,
    );
    esperarResultado(
      puedeTransicionar(
        tareaEn('ESPERANDO_SUPERVISION', { requiere_supervision: true }),
        usuario('SUPERVISOR'),
        ctx,
        'APROBAR',
        { nota: '' },
      ),
      true,
    );
  });
});

describe('transicionesDisponibles por rol y estado', () => {
  it('administrador: libera en progreso y reabre terminadas', () => {
    const ctx = contexto();

    expect(
      nombres(transicionesDisponibles(tareaEn('DISPONIBLE'), usuario('ADMINISTRADOR'), ctx)),
    ).toEqual([]);
    expect(transicionesDisponibles(tareaEn('EN_PROGRESO'), usuario('ADMINISTRADOR'), ctx)).toEqual([
      { transicion: 'LIBERAR', exige_texto: 'MOTIVO' },
    ]);
    expect(
      nombres(
        transicionesDisponibles(tareaEn('ESPERANDO_SUPERVISION'), usuario('ADMINISTRADOR'), ctx),
      ),
    ).toEqual([]);
    expect(transicionesDisponibles(tareaEn('TERMINADA'), usuario('ADMINISTRADOR'), ctx)).toEqual([
      { transicion: 'REABRIR', exige_texto: 'NOTA' },
    ]);
  });

  it('supervisor del proyecto: libera, aprueba, devuelve y reabre', () => {
    const ctx = contexto();

    expect(transicionesDisponibles(tareaEn('EN_PROGRESO'), usuario('SUPERVISOR'), ctx)).toEqual([
      { transicion: 'LIBERAR', exige_texto: 'MOTIVO' },
    ]);
    expect(
      transicionesDisponibles(
        tareaEn('ESPERANDO_SUPERVISION', { requiere_supervision: true }),
        usuario('SUPERVISOR'),
        ctx,
      ),
    ).toEqual([
      { transicion: 'APROBAR', exige_texto: null },
      { transicion: 'DEVOLVER', exige_texto: 'NOTA' },
    ]);
    expect(transicionesDisponibles(tareaEn('TERMINADA'), usuario('SUPERVISOR'), ctx)).toEqual([
      { transicion: 'REABRIR', exige_texto: 'NOTA' },
    ]);
    expect(transicionesDisponibles(tareaEn('DISPONIBLE'), usuario('SUPERVISOR'), ctx)).toEqual([]);
  });

  it('practicante responsable y asignado: toma, libera y elige una sola salida', () => {
    const ctx = contexto();

    expect(transicionesDisponibles(tareaEn('DISPONIBLE'), usuario('PRACTICANTE'), ctx)).toEqual([
      { transicion: 'TOMAR', exige_texto: null },
    ]);
    expect(
      transicionesDisponibles(
        tareaEn('EN_PROGRESO', { requiere_supervision: true }),
        usuario('PRACTICANTE'),
        ctx,
      ),
    ).toEqual([
      { transicion: 'LIBERAR', exige_texto: null },
      { transicion: 'ENVIAR_A_SUPERVISION', exige_texto: null },
    ]);
    expect(
      transicionesDisponibles(
        tareaEn('EN_PROGRESO', { requiere_supervision: false }),
        usuario('PRACTICANTE'),
        ctx,
      ),
    ).toEqual([
      { transicion: 'LIBERAR', exige_texto: null },
      { transicion: 'MARCAR_TERMINADA', exige_texto: null },
    ]);
    expect(
      transicionesDisponibles(tareaEn('ESPERANDO_SUPERVISION'), usuario('PRACTICANTE'), ctx),
    ).toEqual([]);
    expect(transicionesDisponibles(tareaEn('TERMINADA'), usuario('PRACTICANTE'), ctx)).toEqual([]);
  });

  it('practicante asignado que no es el responsable no ve transiciones en EN_PROGRESO', () => {
    const t = tareaEn('EN_PROGRESO', { id_practicante: IDS.practicanteAjeno });

    expect(transicionesDisponibles(t, usuario('PRACTICANTE'), contexto())).toEqual([]);
  });

  it('supervisor ajeno no ve ninguna transición', () => {
    const ctx = contexto({ proyecto: { id_supervisor: IDS.supervisorAjeno } });

    for (const estado of ESTADOS_TAREA) {
      expect(transicionesDisponibles(tareaEn(estado), usuario('SUPERVISOR'), ctx)).toEqual([]);
    }
  });
});

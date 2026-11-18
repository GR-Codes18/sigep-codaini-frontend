import { describe, expect, it } from 'vitest';

import type { Rol, TipoReglaInsight } from './enumeraciones';
import { ROLES, TIPOS_REGLA_INSIGHT } from './enumeraciones';
import {
  ACCIONES_PERMISO,
  AMBITO_POR_ACCION,
  AMBITOS_PERMISO,
  CODIGOS_DENEGACION,
  puede,
  puedeEnRol,
} from './permisos';
import type { AccionPermiso, AmbitoPermiso, ResultadoPermiso } from './permisos';
import {
  IDS,
  asignacion,
  contextoPara,
  insight,
  proyecto,
  tarea,
  usuario,
} from './pruebas/fabricas';

/**
 * La cobertura de contextos no se comprueba aquí: `ContextoPorAccion` es un tipo mapeado sobre
 * `AccionPermiso`, así que si falta una acción el proyecto no compila. Esa parte la verifica
 * `tsc -b` (`npm run build`); aquí se comprueba lo que existe en tiempo de ejecución.
 */
describe('contrato de permisos', () => {
  it('define 58 acciones sin repetidos', () => {
    expect(ACCIONES_PERMISO).toHaveLength(58);
    expect(new Set(ACCIONES_PERMISO).size).toBe(58);
  });

  it('cada acción tiene ámbito y el mapa no tiene sobrantes ni faltantes', () => {
    const acciones = Object.keys(AMBITO_POR_ACCION);

    expect(acciones).toHaveLength(58);
    expect(new Set(acciones)).toEqual(new Set(ACCIONES_PERMISO));

    for (const accion of ACCIONES_PERMISO) {
      expect(AMBITOS_PERMISO).toContain(AMBITO_POR_ACCION[accion]);
    }
  });

  it('reparte los ámbitos en 32 de proyecto, 7 propios y 19 globales', () => {
    const ambitos = ACCIONES_PERMISO.map((accion) => AMBITO_POR_ACCION[accion]);

    expect(ambitos.filter((ambito) => ambito === 'PROYECTO')).toHaveLength(32);
    expect(ambitos.filter((ambito) => ambito === 'PROPIO')).toHaveLength(7);
    expect(ambitos.filter((ambito) => ambito === 'GLOBAL')).toHaveLength(19);
  });

  it('define seis códigos de denegación sin repetidos', () => {
    expect(CODIGOS_DENEGACION).toHaveLength(6);
    expect(new Set(CODIGOS_DENEGACION).size).toBe(6);
  });
});

/**
 * Matriz transcrita a mano de §4 y de la tabla de 55 acciones de `DECISIONES.md` más las 3 de lectura del paso 11A. No se deriva
 * del código: si una regla de `permisos.ts` cambia, esta tabla no se entera y la prueba falla.
 *
 * Celdas: `true` (permitido sin texto), `'MOTIVO'` o `'NOTA'` (permitido y el servicio exige ese
 * texto) y `false` (denegado por rol).
 */
type Celda = boolean | 'MOTIVO' | 'NOTA';

type Bloque = 'TAREAS_PR' | 'PROYECTOS_EQUIPO' | 'PERSONAS_CUENTAS' | 'SEGUIMIENTO_SISTEMA';

interface FilaMatriz {
  accion: AccionPermiso;
  bloque: Bloque;
  ambito: AmbitoPermiso;
  admin: Celda;
  supervisor: Celda;
  practicante: Celda;
}

// Una fila por línea para poder leer la matriz como una tabla; Prettier la expandiría.
// prettier-ignore
const FILAS: FilaMatriz[] = [
  // Tareas y Pull Requests
  // §4 «Crear tareas» · 55: CREAR_TAREA
  { accion: 'CREAR_TAREA', bloque: 'TAREAS_PR', ambito: 'PROYECTO', admin: true, supervisor: true, practicante: false },
  // §4 «Editar título, descripción y fecha límite» · 55: EDITAR_DATOS_TAREA
  { accion: 'EDITAR_DATOS_TAREA', bloque: 'TAREAS_PR', ambito: 'PROYECTO', admin: true, supervisor: true, practicante: false },
  // §4 «Tomar una tarea disponible» · 55: TOMAR_TAREA
  { accion: 'TOMAR_TAREA', bloque: 'TAREAS_PR', ambito: 'PROYECTO', admin: false, supervisor: false, practicante: true },
  // §4 «Liberar una tarea en progreso» · 55: LIBERAR_TAREA
  { accion: 'LIBERAR_TAREA', bloque: 'TAREAS_PR', ambito: 'PROYECTO', admin: 'MOTIVO', supervisor: 'MOTIVO', practicante: true },
  // §4 «Enviar a supervisión o marcar como terminada» · 55: ENVIAR_TAREA
  { accion: 'ENVIAR_TAREA', bloque: 'TAREAS_PR', ambito: 'PROYECTO', admin: false, supervisor: false, practicante: true },
  // §4 «Aprobar o devolver una tarea» · 55: APROBAR_TAREA
  { accion: 'APROBAR_TAREA', bloque: 'TAREAS_PR', ambito: 'PROYECTO', admin: false, supervisor: true, practicante: false },
  // §4 «Aprobar o devolver una tarea» · 55: DEVOLVER_TAREA
  { accion: 'DEVOLVER_TAREA', bloque: 'TAREAS_PR', ambito: 'PROYECTO', admin: false, supervisor: 'NOTA', practicante: false },
  // §4 «Reabrir una tarea terminada» · 55: REABRIR_TAREA
  { accion: 'REABRIR_TAREA', bloque: 'TAREAS_PR', ambito: 'PROYECTO', admin: 'NOTA', supervisor: 'NOTA', practicante: false },
  // §4 «Eliminar una tarea disponible sin Pull Request» · 55: ELIMINAR_TAREA
  { accion: 'ELIMINAR_TAREA', bloque: 'TAREAS_PR', ambito: 'PROYECTO', admin: 'MOTIVO', supervisor: 'MOTIVO', practicante: false },
  // §4 «Cambiar "Requiere supervisión"» · 55: CAMBIAR_REQUIERE_SUPERVISION
  { accion: 'CAMBIAR_REQUIERE_SUPERVISION', bloque: 'TAREAS_PR', ambito: 'PROYECTO', admin: true, supervisor: true, practicante: false },
  // §4 «Activar o desactivar "Requiere PR"» · 55: ACTIVAR_REQUIERE_PR
  { accion: 'ACTIVAR_REQUIERE_PR', bloque: 'TAREAS_PR', ambito: 'PROYECTO', admin: true, supervisor: true, practicante: false },
  // §4 «Activar o desactivar "Requiere PR"» · 55: DESACTIVAR_REQUIERE_PR
  { accion: 'DESACTIVAR_REQUIERE_PR', bloque: 'TAREAS_PR', ambito: 'PROYECTO', admin: true, supervisor: true, practicante: 'MOTIVO' },
  // §4 «Crear un Pull Request» · 55: CREAR_PULL_REQUEST
  { accion: 'CREAR_PULL_REQUEST', bloque: 'TAREAS_PR', ambito: 'PROYECTO', admin: false, supervisor: false, practicante: true },
  // §4 «Cerrar un Pull Request» · 55: CERRAR_PULL_REQUEST
  { accion: 'CERRAR_PULL_REQUEST', bloque: 'TAREAS_PR', ambito: 'PROYECTO', admin: 'MOTIVO', supervisor: 'MOTIVO', practicante: 'MOTIVO' },
  // §4 «Ver el detalle de tareas ajenas» · 55: VER_TAREA
  { accion: 'VER_TAREA', bloque: 'TAREAS_PR', ambito: 'PROYECTO', admin: true, supervisor: true, practicante: true },

  // Proyectos y equipo
  // §4 «Crear proyectos (definiendo su código)» · 55: CREAR_PROYECTO
  { accion: 'CREAR_PROYECTO', bloque: 'PROYECTOS_EQUIPO', ambito: 'GLOBAL', admin: true, supervisor: false, practicante: false },
  // §4 «…editar nombre, descripción, fechas y repositorio» · 55: EDITAR_DATOS_PROYECTO
  { accion: 'EDITAR_DATOS_PROYECTO', bloque: 'PROYECTOS_EQUIPO', ambito: 'PROYECTO', admin: true, supervisor: false, practicante: false },
  // §4 «Cambiar la rama base» · 55: CAMBIAR_RAMA_BASE
  { accion: 'CAMBIAR_RAMA_BASE', bloque: 'PROYECTOS_EQUIPO', ambito: 'PROYECTO', admin: true, supervisor: true, practicante: false },
  // §4 «Definir la reunión semanal» · 55: DEFINIR_REUNION
  { accion: 'DEFINIR_REUNION', bloque: 'PROYECTOS_EQUIPO', ambito: 'PROYECTO', admin: true, supervisor: true, practicante: false },
  // §4 «Gestionar enlaces útiles» · 55: GESTIONAR_ENLACES
  { accion: 'GESTIONAR_ENLACES', bloque: 'PROYECTOS_EQUIPO', ambito: 'PROYECTO', admin: true, supervisor: true, practicante: false },
  // §4 «Cambiar de supervisor» · 55: CAMBIAR_SUPERVISOR
  { accion: 'CAMBIAR_SUPERVISOR', bloque: 'PROYECTOS_EQUIPO', ambito: 'PROYECTO', admin: true, supervisor: false, practicante: false },
  // §4 «Asignar o quitar practicantes» · 55: ASIGNAR_PRACTICANTE
  { accion: 'ASIGNAR_PRACTICANTE', bloque: 'PROYECTOS_EQUIPO', ambito: 'PROYECTO', admin: true, supervisor: false, practicante: false },
  // §4 «Asignar o quitar practicantes» · 55: QUITAR_PRACTICANTE
  { accion: 'QUITAR_PRACTICANTE', bloque: 'PROYECTOS_EQUIPO', ambito: 'PROYECTO', admin: true, supervisor: false, practicante: false },
  // §4 «Pausar, reanudar, finalizar o reactivar un proyecto» · 55: PAUSAR_PROYECTO
  { accion: 'PAUSAR_PROYECTO', bloque: 'PROYECTOS_EQUIPO', ambito: 'PROYECTO', admin: 'NOTA', supervisor: false, practicante: false },
  // §4 «Pausar, reanudar, finalizar o reactivar un proyecto» · 55: REANUDAR_PROYECTO
  { accion: 'REANUDAR_PROYECTO', bloque: 'PROYECTOS_EQUIPO', ambito: 'PROYECTO', admin: 'NOTA', supervisor: false, practicante: false },
  // §4 «Pausar, reanudar, finalizar o reactivar un proyecto» · 55: FINALIZAR_PROYECTO
  { accion: 'FINALIZAR_PROYECTO', bloque: 'PROYECTOS_EQUIPO', ambito: 'PROYECTO', admin: 'NOTA', supervisor: false, practicante: false },
  // §4 «Pausar, reanudar, finalizar o reactivar un proyecto» · 55: REACTIVAR_PROYECTO
  { accion: 'REACTIVAR_PROYECTO', bloque: 'PROYECTOS_EQUIPO', ambito: 'PROYECTO', admin: 'NOTA', supervisor: false, practicante: false },
  // §4 «Ver el proyecto y su tablero» · 55: VER_PROYECTO
  { accion: 'VER_PROYECTO', bloque: 'PROYECTOS_EQUIPO', ambito: 'PROYECTO', admin: true, supervisor: true, practicante: true },
  // §4 «Ver los proyectos anteriores» · 55: VER_RESUMEN_PROYECTO_ANTERIOR
  { accion: 'VER_RESUMEN_PROYECTO_ANTERIOR', bloque: 'PROYECTOS_EQUIPO', ambito: 'PROYECTO', admin: true, supervisor: true, practicante: true },
  // §4 «Ver a los practicantes» · 55: VER_PRACTICANTES
  { accion: 'VER_PRACTICANTES', bloque: 'PROYECTOS_EQUIPO', ambito: 'PROYECTO', admin: true, supervisor: true, practicante: true },

  // Personas y cuentas
  // §4 «Decidir postulaciones…» · 55: APROBAR_POSTULACION
  { accion: 'APROBAR_POSTULACION', bloque: 'PERSONAS_CUENTAS', ambito: 'GLOBAL', admin: true, supervisor: false, practicante: false },
  // §5.1 «Rechazar (motivo)» · 55: RECHAZAR_POSTULACION
  { accion: 'RECHAZAR_POSTULACION', bloque: 'PERSONAS_CUENTAS', ambito: 'GLOBAL', admin: 'MOTIVO', supervisor: false, practicante: false },
  // §5.1 «Reconsiderar (nota)» · 55: RECONSIDERAR_POSTULACION
  { accion: 'RECONSIDERAR_POSTULACION', bloque: 'PERSONAS_CUENTAS', ambito: 'GLOBAL', admin: 'NOTA', supervisor: false, practicante: false },
  // §4 «…gestionar criterios de evaluación» · 55: GESTIONAR_CRITERIOS_EVALUACION
  { accion: 'GESTIONAR_CRITERIOS_EVALUACION', bloque: 'PERSONAS_CUENTAS', ambito: 'GLOBAL', admin: true, supervisor: false, practicante: false },
  // §4 «Crear supervisores…» · 55: CREAR_SUPERVISOR
  { accion: 'CREAR_SUPERVISOR', bloque: 'PERSONAS_CUENTAS', ambito: 'GLOBAL', admin: true, supervisor: false, practicante: false },
  // §4 «…y restablecer contraseñas» · 55: RESTABLECER_CONTRASENA
  { accion: 'RESTABLECER_CONTRASENA', bloque: 'PERSONAS_CUENTAS', ambito: 'GLOBAL', admin: true, supervisor: false, practicante: false },
  // §4 «Finalizar o reactivar una práctica» · 55: FINALIZAR_PRACTICA
  { accion: 'FINALIZAR_PRACTICA', bloque: 'PERSONAS_CUENTAS', ambito: 'GLOBAL', admin: 'MOTIVO', supervisor: false, practicante: false },
  // §4 «Finalizar o reactivar una práctica» · 55: REACTIVAR_PRACTICA
  { accion: 'REACTIVAR_PRACTICA', bloque: 'PERSONAS_CUENTAS', ambito: 'GLOBAL', admin: 'NOTA', supervisor: false, practicante: false },
  // §4 «Editar los datos de la práctica» · 55: EDITAR_DATOS_PRACTICA
  { accion: 'EDITAR_DATOS_PRACTICA', bloque: 'PERSONAS_CUENTAS', ambito: 'GLOBAL', admin: true, supervisor: false, practicante: false },
  // §4 «Editar los propios datos personales» · 55: EDITAR_NOMBRE_PROPIO
  { accion: 'EDITAR_NOMBRE_PROPIO', bloque: 'PERSONAS_CUENTAS', ambito: 'PROPIO', admin: true, supervisor: false, practicante: true },
  // §4 «Editar los propios datos personales» · 55: EDITAR_CORREO_PROPIO
  { accion: 'EDITAR_CORREO_PROPIO', bloque: 'PERSONAS_CUENTAS', ambito: 'PROPIO', admin: true, supervisor: false, practicante: true },
  // §4 «Editar los propios datos personales» · 55: EDITAR_CELULAR_PROPIO
  { accion: 'EDITAR_CELULAR_PROPIO', bloque: 'PERSONAS_CUENTAS', ambito: 'PROPIO', admin: true, supervisor: true, practicante: true },
  // §4 «Editar los propios datos personales» · 55: EDITAR_DISCORD_PROPIO
  { accion: 'EDITAR_DISCORD_PROPIO', bloque: 'PERSONAS_CUENTAS', ambito: 'PROPIO', admin: false, supervisor: true, practicante: true },
  // §4 «Editar los propios datos personales» · 55: EDITAR_GITHUB_PROPIO
  { accion: 'EDITAR_GITHUB_PROPIO', bloque: 'PERSONAS_CUENTAS', ambito: 'PROPIO', admin: false, supervisor: true, practicante: true },
  // §4 «Editar los propios datos personales» · 55: EDITAR_DISPONIBILIDAD_PROPIA
  { accion: 'EDITAR_DISPONIBILIDAD_PROPIA', bloque: 'PERSONAS_CUENTAS', ambito: 'PROPIO', admin: false, supervisor: false, practicante: true },
  // §5.3 «Nombre y correo del supervisor» · 55: EDITAR_CREDENCIAL_SUPERVISOR
  { accion: 'EDITAR_CREDENCIAL_SUPERVISOR', bloque: 'PERSONAS_CUENTAS', ambito: 'GLOBAL', admin: true, supervisor: false, practicante: false },
  // §5.3 «No desactivar con proyectos activos» · 55: DESACTIVAR_SUPERVISOR
  { accion: 'DESACTIVAR_SUPERVISOR', bloque: 'PERSONAS_CUENTAS', ambito: 'GLOBAL', admin: true, supervisor: false, practicante: false },
  // §5.3 «Reactivar supervisor» · 55: REACTIVAR_SUPERVISOR
  { accion: 'REACTIVAR_SUPERVISOR', bloque: 'PERSONAS_CUENTAS', ambito: 'GLOBAL', admin: true, supervisor: false, practicante: false },
  // §8.2 «Cambiar la propia contraseña» · 55: CAMBIAR_CONTRASENA_PROPIA
  { accion: 'CAMBIAR_CONTRASENA_PROPIA', bloque: 'PERSONAS_CUENTAS', ambito: 'PROPIO', admin: true, supervisor: true, practicante: true },
  // Módulos solo del Administrador (paso 11A): la matriz de §4 no tiene fila «Ver …»; se suma a mano en docs/
  { accion: 'VER_POSTULACIONES', bloque: 'PERSONAS_CUENTAS', ambito: 'GLOBAL', admin: true, supervisor: false, practicante: false },
  { accion: 'VER_SUPERVISORES', bloque: 'PERSONAS_CUENTAS', ambito: 'GLOBAL', admin: true, supervisor: false, practicante: false },
  { accion: 'VER_DIRECTORIO_PRACTICANTES', bloque: 'PERSONAS_CUENTAS', ambito: 'GLOBAL', admin: true, supervisor: false, practicante: false },

  // Seguimiento y sistema
  // §4 «Ver Reportes» · 55: VER_REPORTES
  { accion: 'VER_REPORTES', bloque: 'SEGUIMIENTO_SISTEMA', ambito: 'PROYECTO', admin: true, supervisor: true, practicante: false },
  // §4 «Marcar un insight como revisado» · 55: MARCAR_INSIGHT_REVISADO
  { accion: 'MARCAR_INSIGHT_REVISADO', bloque: 'SEGUIMIENTO_SISTEMA', ambito: 'PROYECTO', admin: true, supervisor: true, practicante: false },
  // §4 «Notificar desde un insight» · 55: NOTIFICAR_DESDE_INSIGHT
  { accion: 'NOTIFICAR_DESDE_INSIGHT', bloque: 'SEGUIMIENTO_SISTEMA', ambito: 'PROYECTO', admin: true, supervisor: true, practicante: false },
  // §4 «Historial de actividad: vista global» · 55: VER_HISTORIAL_GLOBAL
  { accion: 'VER_HISTORIAL_GLOBAL', bloque: 'SEGUIMIENTO_SISTEMA', ambito: 'GLOBAL', admin: true, supervisor: false, practicante: false },
  // §4 «Configuración y datos de demostración» · 55: GESTIONAR_CONFIGURACION
  { accion: 'GESTIONAR_CONFIGURACION', bloque: 'SEGUIMIENTO_SISTEMA', ambito: 'GLOBAL', admin: true, supervisor: false, practicante: false },
  // §4 «Configuración y datos de demostración» · 55: RESTABLECER_DATOS_DEMOSTRACION
  { accion: 'RESTABLECER_DATOS_DEMOSTRACION', bloque: 'SEGUIMIENTO_SISTEMA', ambito: 'GLOBAL', admin: true, supervisor: false, practicante: false },
];

const CELDA_POR_ROL: Record<Rol, 'admin' | 'supervisor' | 'practicante'> = {
  ADMINISTRADOR: 'admin',
  SUPERVISOR: 'supervisor',
  PRACTICANTE: 'practicante',
};

/** Las 14 acciones que cambian tareas: tabla 1 de §4 sin `VER_TAREA`, con las de Pull Request. */
const ACCIONES_QUE_CAMBIAN_TAREA = [
  'CREAR_TAREA',
  'EDITAR_DATOS_TAREA',
  'TOMAR_TAREA',
  'LIBERAR_TAREA',
  'ENVIAR_TAREA',
  'APROBAR_TAREA',
  'DEVOLVER_TAREA',
  'REABRIR_TAREA',
  'ELIMINAR_TAREA',
  'CAMBIAR_REQUIERE_SUPERVISION',
  'ACTIVAR_REQUIERE_PR',
  'DESACTIVAR_REQUIERE_PR',
  'CREAR_PULL_REQUEST',
  'CERRAR_PULL_REQUEST',
] as const;

function filaDe(accion: AccionPermiso): FilaMatriz {
  const fila = FILAS.find((candidata) => candidata.accion === accion);
  if (!fila) throw new Error(`Falta la fila de ${accion} en la tabla de pruebas`);
  return fila;
}

/**
 * Comprueba una celda de la matriz. En el escenario `NORMAL` una celda «No» solo puede venir del
 * paso 2, así que el código esperado es siempre `ROL_NO_PERMITIDO`.
 */
function esperarCelda(resultado: ResultadoPermiso, esperado: Celda, descripcion: string): void {
  if (esperado === false) {
    expect(resultado, descripcion).toEqual({ permitido: false, codigo: 'ROL_NO_PERMITIDO' });
    return;
  }

  expect(resultado, descripcion).toEqual({
    permitido: true,
    exige_texto: esperado === true ? null : esperado,
  });
}

describe('matriz de §4 (58 acciones × 3 roles)', () => {
  it('tiene una fila por acción, sin sobrantes ni repetidas', () => {
    const accionesDeLaTabla = FILAS.map((fila) => fila.accion);

    expect(FILAS).toHaveLength(58);
    expect(new Set(accionesDeLaTabla).size).toBe(58);
    expect(new Set(accionesDeLaTabla)).toEqual(new Set(ACCIONES_PERMISO));
  });

  it('cada fila declara el ámbito de la tabla de 58', () => {
    for (const fila of FILAS) {
      expect(AMBITO_POR_ACCION[fila.accion], fila.accion).toBe(fila.ambito);
    }
  });

  it('exige texto en 14 acciones: 6 MOTIVO y 8 NOTA', () => {
    const accionesConTexto = (texto: 'MOTIVO' | 'NOTA') =>
      new Set(
        FILAS.filter((fila) => [fila.admin, fila.supervisor, fila.practicante].includes(texto)).map(
          (fila) => fila.accion,
        ),
      );

    const conMotivo = accionesConTexto('MOTIVO');
    const conNota = accionesConTexto('NOTA');

    expect(conMotivo.size).toBe(6);
    expect(conNota.size).toBe(8);
    expect(new Set([...conMotivo, ...conNota]).size).toBe(14);
  });

  it('las 14 acciones que cambian tareas son la tabla 1 sin VER_TAREA', () => {
    const delBloqueDeTareas = FILAS.filter(
      (fila) => fila.bloque === 'TAREAS_PR' && fila.accion !== 'VER_TAREA',
    ).map((fila) => fila.accion);

    expect(ACCIONES_QUE_CAMBIAN_TAREA).toHaveLength(14);
    expect(new Set(delBloqueDeTareas)).toEqual(new Set(ACCIONES_QUE_CAMBIAN_TAREA));
  });

  for (const rol of ROLES) {
    it(`respeta la matriz cuando actúa ${rol}`, () => {
      const usuarioQueActua = usuario(rol);
      const celda = CELDA_POR_ROL[rol];

      for (const fila of FILAS) {
        const resultado = puede(
          usuarioQueActua,
          fila.accion,
          contextoPara(fila.accion, usuarioQueActua),
        );

        esperarCelda(resultado, fila[celda], `${fila.accion} · ${rol}`);
      }
    });
  }
});

describe('alcance por proyecto', () => {
  const filasDeProyecto = FILAS.filter((fila) => fila.ambito === 'PROYECTO');

  it('el Supervisor ajeno recibe FUERA_DE_ALCANCE en todas las acciones de proyecto que le tocan', () => {
    const supervisor = usuario('SUPERVISOR');
    const filas = filasDeProyecto.filter((fila) => fila.supervisor !== false);

    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      expect(
        puede(supervisor, fila.accion, contextoPara(fila.accion, supervisor, 'AJENO')),
        fila.accion,
      ).toEqual({ permitido: false, codigo: 'FUERA_DE_ALCANCE' });
    }
  });

  it('el Practicante sin asignación recibe FUERA_DE_ALCANCE', () => {
    const practicante = usuario('PRACTICANTE');
    const filas = filasDeProyecto.filter(
      (fila) => fila.practicante !== false && fila.accion !== 'VER_TAREA',
    );

    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      expect(
        puede(practicante, fila.accion, contextoPara(fila.accion, practicante, 'SIN_ASIGNACION')),
        fila.accion,
      ).toEqual({ permitido: false, codigo: 'FUERA_DE_ALCANCE' });
    }
  });

  it('el Practicante con la asignación dada de baja recibe FUERA_DE_ALCANCE', () => {
    const practicante = usuario('PRACTICANTE');
    // `VER_RESUMEN_PROYECTO_ANTERIOR` admite la baja y `VER_TAREA` admite al responsable.
    const filas = filasDeProyecto.filter(
      (fila) =>
        fila.practicante !== false &&
        fila.accion !== 'VER_TAREA' &&
        fila.accion !== 'VER_RESUMEN_PROYECTO_ANTERIOR',
    );

    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      expect(
        puede(practicante, fila.accion, contextoPara(fila.accion, practicante, 'CON_BAJA')),
        fila.accion,
      ).toEqual({ permitido: false, codigo: 'FUERA_DE_ALCANCE' });
    }
  });

  it('una asignación vigente en otro proyecto no da acceso a este', () => {
    const practicante = usuario('PRACTICANTE');

    expect(
      puede(practicante, 'TOMAR_TAREA', contextoPara('TOMAR_TAREA', practicante, 'OTRO_PROYECTO')),
    ).toEqual({ permitido: false, codigo: 'FUERA_DE_ALCANCE' });
  });

  it('VER_RESUMEN_PROYECTO_ANTERIOR sí permite una asignación con baja', () => {
    const practicante = usuario('PRACTICANTE');

    expect(
      puede(
        practicante,
        'VER_RESUMEN_PROYECTO_ANTERIOR',
        contextoPara('VER_RESUMEN_PROYECTO_ANTERIOR', practicante, 'CON_BAJA'),
      ),
    ).toEqual({ permitido: true, exige_texto: null });
  });
});

describe('contexto incoherente', () => {
  it('se deniega en los tres roles cuando la tarea es de otro proyecto', () => {
    for (const rol of ROLES) {
      const usuarioQueActua = usuario(rol);
      const contexto = {
        proyecto: proyecto(),
        tarea: tarea({ id_proyecto: IDS.proyectoAjeno }),
        asignaciones: [asignacion({ id_practicante: usuarioQueActua.id })],
      };

      expect(puede(usuarioQueActua, 'CERRAR_PULL_REQUEST', contexto), rol).toEqual({
        permitido: false,
        codigo: 'FUERA_DE_ALCANCE',
      });
    }
  });

  it('también se deniega al Administrador en una acción de tarea', () => {
    const admin = usuario('ADMINISTRADOR');
    const contexto = {
      proyecto: proyecto(),
      tarea: tarea({ id_proyecto: IDS.proyectoAjeno }),
    };

    expect(puede(admin, 'EDITAR_DATOS_TAREA', contexto)).toEqual({
      permitido: false,
      codigo: 'FUERA_DE_ALCANCE',
    });
  });
});

describe('proyecto FINALIZADO', () => {
  for (const rol of ROLES) {
    it(`deniega las 14 acciones que cambian tareas (${rol})`, () => {
      const usuarioQueActua = usuario(rol);
      const celda = CELDA_POR_ROL[rol];

      for (const accion of ACCIONES_QUE_CAMBIAN_TAREA) {
        const resultado = puede(
          usuarioQueActua,
          accion,
          contextoPara(accion, usuarioQueActua, 'NORMAL', { estado: 'FINALIZADO' }),
        );

        if (filaDe(accion)[celda] === false) {
          expect(resultado, accion).toEqual({ permitido: false, codigo: 'ROL_NO_PERMITIDO' });
        } else {
          expect(resultado, accion).toEqual({ permitido: false, codigo: 'PROYECTO_FINALIZADO' });
        }
      }
    });
  }

  it('el Practicante pierde tablero y equipo, conserva el resumen anterior y su propia tarea', () => {
    const practicante = usuario('PRACTICANTE');
    const proyectoFinalizado = proyecto({ estado: 'FINALIZADO' });
    const asignacionVigente = asignacion();

    expect(
      puede(practicante, 'VER_PROYECTO', {
        proyecto: proyectoFinalizado,
        asignaciones: [asignacionVigente],
      }),
    ).toEqual({ permitido: false, codigo: 'FUERA_DE_ALCANCE' });

    expect(
      puede(practicante, 'VER_PRACTICANTES', {
        proyecto: proyectoFinalizado,
        asignaciones: [asignacionVigente],
      }),
    ).toEqual({ permitido: false, codigo: 'FUERA_DE_ALCANCE' });

    expect(
      puede(practicante, 'VER_RESUMEN_PROYECTO_ANTERIOR', {
        proyecto: proyectoFinalizado,
        asignaciones: [asignacionVigente],
      }),
    ).toEqual({ permitido: true, exige_texto: null });

    // Sus tareas terminadas siguen abriéndose desde Mi historial (§9.2.2).
    expect(
      puede(practicante, 'VER_TAREA', {
        proyecto: proyectoFinalizado,
        tarea: tarea(),
        asignaciones: [asignacionVigente],
      }),
    ).toEqual({ permitido: true, exige_texto: null });

    // La de un compañero, no.
    expect(
      puede(practicante, 'VER_TAREA', {
        proyecto: proyectoFinalizado,
        tarea: tarea({ id_practicante: IDS.practicanteAjeno }),
        asignaciones: [asignacionVigente],
      }),
    ).toEqual({ permitido: false, codigo: 'FUERA_DE_ALCANCE' });
  });

  it('reunión, enlaces, rama base y datos del proyecto siguen su fila de la matriz aunque esté FINALIZADO', () => {
    const acciones = [
      'CAMBIAR_RAMA_BASE',
      'DEFINIR_REUNION',
      'GESTIONAR_ENLACES',
      'EDITAR_DATOS_PROYECTO',
    ] as const;
    // Escrito a mano desde §4: el Supervisor define reunión, enlaces y rama base, pero no edita los
    // datos del proyecto; el Practicante no edita nada de esto.
    const puedenEditar: Record<Rol, readonly AccionPermiso[]> = {
      ADMINISTRADOR: acciones,
      SUPERVISOR: ['CAMBIAR_RAMA_BASE', 'DEFINIR_REUNION', 'GESTIONAR_ENLACES'],
      PRACTICANTE: [],
    };

    for (const rol of ROLES) {
      const quien = usuario(rol);
      for (const accion of acciones) {
        const resultado = puede(
          quien,
          accion,
          contextoPara(accion, quien, 'NORMAL', { estado: 'FINALIZADO' }),
        );
        expect(resultado, `${rol} ${accion}`).toEqual(
          puedenEditar[rol].includes(accion)
            ? { permitido: true, exige_texto: null }
            : { permitido: false, codigo: 'ROL_NO_PERMITIDO' },
        );
      }
    }
  });
});

describe('usuario INACTIVO', () => {
  it('no puede nada: las 58 acciones en los 3 roles', () => {
    for (const rol of ROLES) {
      const inactivo = usuario(rol, { estado: 'INACTIVO' });

      for (const accion of ACCIONES_PERMISO) {
        expect(
          puede(inactivo, accion, contextoPara(accion, inactivo)),
          `${accion} · ${rol}`,
        ).toEqual({ permitido: false, codigo: 'USUARIO_INACTIVO' });
      }
    }
  });
});

describe('objetivos de persona', () => {
  const admin = usuario('ADMINISTRADOR');

  it('RESTABLECER_CONTRASENA no aplica al Administrador', () => {
    expect(
      puede(admin, 'RESTABLECER_CONTRASENA', { usuario_objetivo: usuario('ADMINISTRADOR') }),
    ).toEqual({ permitido: false, codigo: 'FUERA_DE_ALCANCE' });
  });

  it('las acciones de supervisor solo apuntan a un Supervisor', () => {
    for (const accion of [
      'EDITAR_CREDENCIAL_SUPERVISOR',
      'DESACTIVAR_SUPERVISOR',
      'REACTIVAR_SUPERVISOR',
    ] as const) {
      expect(puede(admin, accion, { usuario_objetivo: usuario('PRACTICANTE') }), accion).toEqual({
        permitido: false,
        codigo: 'FUERA_DE_ALCANCE',
      });
    }
  });

  it('las acciones de práctica solo apuntan a un Practicante', () => {
    for (const accion of [
      'FINALIZAR_PRACTICA',
      'REACTIVAR_PRACTICA',
      'EDITAR_DATOS_PRACTICA',
    ] as const) {
      expect(puede(admin, accion, { usuario_objetivo: usuario('SUPERVISOR') }), accion).toEqual({
        permitido: false,
        codigo: 'FUERA_DE_ALCANCE',
      });
    }
  });
});

describe('identidad', () => {
  it('los datos propios no se editan en la cuenta de otra persona', () => {
    const admin = usuario('ADMINISTRADOR');
    const supervisor = usuario('SUPERVISOR');
    const practicante = usuario('PRACTICANTE');

    expect(puede(admin, 'EDITAR_NOMBRE_PROPIO', { usuario_objetivo: practicante })).toEqual({
      permitido: false,
      codigo: 'NO_ES_TU_CUENTA',
    });

    expect(
      puede(supervisor, 'EDITAR_CELULAR_PROPIO', {
        usuario_objetivo: usuario('SUPERVISOR', { id: 'u-otro-supervisor' }),
      }),
    ).toEqual({ permitido: false, codigo: 'NO_ES_TU_CUENTA' });

    expect(puede(practicante, 'CAMBIAR_CONTRASENA_PROPIA', { usuario_objetivo: admin })).toEqual({
      permitido: false,
      codigo: 'NO_ES_TU_CUENTA',
    });
  });

  it('cada rol sí edita su propia cuenta', () => {
    for (const rol of ROLES) {
      const usuarioQueActua = usuario(rol);

      expect(
        puede(usuarioQueActua, 'CAMBIAR_CONTRASENA_PROPIA', {
          usuario_objetivo: usuarioQueActua,
        }),
        rol,
      ).toEqual({ permitido: true, exige_texto: null });
    }
  });

  it('un practicante no libera la tarea de un compañero', () => {
    const companero = usuario('PRACTICANTE', { id: IDS.practicanteAjeno });
    const contexto = {
      proyecto: proyecto(),
      tarea: tarea(),
      asignaciones: [asignacion({ id: 'a-otra', id_practicante: companero.id })],
    };

    expect(puede(companero, 'LIBERAR_TAREA', contexto)).toEqual({
      permitido: false,
      codigo: 'NO_ES_EL_RESPONSABLE',
    });
  });

  it('el responsable sí libera su tarea y no se le exige motivo', () => {
    const practicante = usuario('PRACTICANTE');

    expect(puede(practicante, 'LIBERAR_TAREA', contextoPara('LIBERAR_TAREA', practicante))).toEqual(
      { permitido: true, exige_texto: null },
    );
  });
});

describe('orden de comprobación', () => {
  it('inactivo gana a rol, alcance e identidad', () => {
    const inactivo = usuario('PRACTICANTE', { estado: 'INACTIVO' });
    const contexto = {
      proyecto: proyecto({ id_supervisor: IDS.supervisorAjeno }),
      tarea: tarea({ id_proyecto: IDS.proyectoAjeno }),
      asignaciones: [],
    };

    expect(puede(inactivo, 'LIBERAR_TAREA', contexto)).toEqual({
      permitido: false,
      codigo: 'USUARIO_INACTIVO',
    });
  });

  it('el rol gana al alcance', () => {
    const supervisor = usuario('SUPERVISOR');

    expect(
      puede(supervisor, 'TOMAR_TAREA', contextoPara('TOMAR_TAREA', supervisor, 'AJENO')),
    ).toEqual({ permitido: false, codigo: 'ROL_NO_PERMITIDO' });
  });

  it('el alcance gana a la identidad: un ajeno recibe FUERA_DE_ALCANCE, no NO_ES_EL_RESPONSABLE', () => {
    const practicante = usuario('PRACTICANTE');

    expect(
      puede(
        practicante,
        'LIBERAR_TAREA',
        contextoPara('LIBERAR_TAREA', practicante, 'OTRO_PROYECTO'),
      ),
    ).toEqual({ permitido: false, codigo: 'FUERA_DE_ALCANCE' });
  });

  it('la identidad gana a FINALIZADO', () => {
    const companero = usuario('PRACTICANTE', { id: IDS.practicanteAjeno });
    const contexto = {
      proyecto: proyecto({ estado: 'FINALIZADO' }),
      tarea: tarea(),
      asignaciones: [asignacion({ id: 'a-otra', id_practicante: companero.id })],
    };

    expect(puede(companero, 'LIBERAR_TAREA', contexto)).toEqual({
      permitido: false,
      codigo: 'NO_ES_EL_RESPONSABLE',
    });
  });
});

describe('alcance de insights', () => {
  const supervisor = usuario('SUPERVISOR');

  it('un proyecto del insight que no es suyo queda fuera de alcance', () => {
    const contexto = {
      insight: insight({ ids_proyecto: [IDS.proyecto] }),
      proyectos: [proyecto({ id_supervisor: IDS.supervisorAjeno })],
    };

    expect(puede(supervisor, 'MARCAR_INSIGHT_REVISADO', contexto)).toEqual({
      permitido: false,
      codigo: 'FUERA_DE_ALCANCE',
    });
  });

  it('un insight sin proyectos nunca está en alcance', () => {
    const contexto = {
      insight: insight({ ids_proyecto: [] }),
      proyectos: [proyecto({ id_supervisor: supervisor.id })],
    };

    expect(puede(supervisor, 'MARCAR_INSIGHT_REVISADO', contexto)).toEqual({
      permitido: false,
      codigo: 'FUERA_DE_ALCANCE',
    });
  });

  it('un proyecto suyo que no está entre los ids del insight no da alcance', () => {
    const contexto = {
      insight: insight({ ids_proyecto: [IDS.proyectoAjeno] }),
      proyectos: [proyecto({ id_supervisor: supervisor.id })],
    };

    expect(puede(supervisor, 'MARCAR_INSIGHT_REVISADO', contexto)).toEqual({
      permitido: false,
      codigo: 'FUERA_DE_ALCANCE',
    });
  });

  it('con un proyecto suyo entre los ids, el Supervisor puede marcar y notificar', () => {
    const contexto = {
      insight: insight({ ids_proyecto: [IDS.proyecto] }),
      proyectos: [proyecto({ id_supervisor: supervisor.id })],
    };

    expect(puede(supervisor, 'MARCAR_INSIGHT_REVISADO', contexto)).toEqual({
      permitido: true,
      exige_texto: null,
    });
    expect(puede(supervisor, 'NOTIFICAR_DESDE_INSIGHT', contexto)).toEqual({
      permitido: true,
      exige_texto: null,
    });
  });

  it('NOTIFICAR_DESDE_INSIGHT solo admite las reglas de §4', () => {
    const admin = usuario('ADMINISTRADOR');
    const contexto = (tipo_regla: TipoReglaInsight) => ({
      insight: insight({ ids_proyecto: [IDS.proyecto], tipo_regla }),
      proyectos: [proyecto({ id_supervisor: supervisor.id })],
    });

    expect(puede(admin, 'NOTIFICAR_DESDE_INSIGHT', contexto('SUPERVISION_DEMORADA'))).toEqual({
      permitido: true,
      exige_texto: null,
    });
    expect(puede(admin, 'NOTIFICAR_DESDE_INSIGHT', contexto('CARGA_DESBALANCEADA'))).toEqual({
      permitido: false,
      codigo: 'ROL_NO_PERMITIDO',
    });
    expect(puede(supervisor, 'NOTIFICAR_DESDE_INSIGHT', contexto('SUPERVISION_DEMORADA'))).toEqual({
      permitido: false,
      codigo: 'ROL_NO_PERMITIDO',
    });
    expect(puede(supervisor, 'NOTIFICAR_DESDE_INSIGHT', contexto('PRACTICANTE_INACTIVO'))).toEqual({
      permitido: true,
      exige_texto: null,
    });
  });

  // Paso 8: nadie marca como revisado un insight de una regla que no ve (§9.1.4).
  const contextoMarcar = (tipo_regla: TipoReglaInsight, ids_proyecto: string[]) => ({
    insight: insight({ tipo_regla, ids_proyecto }),
    proyectos: [proyecto({ id_supervisor: supervisor.id })],
  });

  it('el Supervisor no marca FIN_PRACTICA aunque el insight sea de su proyecto', () => {
    expect(
      puede(supervisor, 'MARCAR_INSIGHT_REVISADO', contextoMarcar('FIN_PRACTICA', [IDS.proyecto])),
    ).toEqual({ permitido: false, codigo: 'ROL_NO_PERMITIDO' });
  });

  it('la regla se comprueba antes del alcance: POSTULACIONES sin proyectos da ROL_NO_PERMITIDO', () => {
    expect(
      puede(supervisor, 'MARCAR_INSIGHT_REVISADO', contextoMarcar('POSTULACIONES_SIN_DECIDIR', [])),
    ).toEqual({ permitido: false, codigo: 'ROL_NO_PERMITIDO' });
  });

  it.each(TIPOS_REGLA_INSIGHT)('el Administrador marca %s', (tipo_regla) => {
    expect(
      puede(usuario('ADMINISTRADOR'), 'MARCAR_INSIGHT_REVISADO', contextoMarcar(tipo_regla, [])),
    ).toEqual({ permitido: true, exige_texto: null });
  });

  it.each([
    'PRACTICANTE_INACTIVO',
    'CARGA_DESBALANCEADA',
    'POSIBLE_ATRASO_PROYECTO',
    'PROYECTO_SIN_ACTIVIDAD',
    'SUPERVISION_DEMORADA',
  ] as const)('el Supervisor marca %s en su proyecto', (tipo_regla) => {
    expect(
      puede(supervisor, 'MARCAR_INSIGHT_REVISADO', contextoMarcar(tipo_regla, [IDS.proyecto])),
    ).toEqual({ permitido: true, exige_texto: null });
  });
});

describe('códigos opacos', () => {
  it('una tarea de otro proyecto y un proyecto ajeno dan el mismo código', () => {
    const supervisor = usuario('SUPERVISOR');
    const proyectoAjeno = puede(
      supervisor,
      'VER_TAREA',
      contextoPara('VER_TAREA', supervisor, 'AJENO'),
    );
    const tareaIncoherente = puede(supervisor, 'VER_TAREA', {
      proyecto: proyecto(),
      tarea: tarea({ id_proyecto: IDS.proyectoAjeno }),
      asignaciones: [],
    });

    expect(proyectoAjeno).toEqual({ permitido: false, codigo: 'FUERA_DE_ALCANCE' });
    expect(tareaIncoherente).toEqual(proyectoAjeno);
    // El resultado no lleva más datos que el código: no revela si el recurso existe.
    expect(Object.keys(proyectoAjeno).sort()).toEqual(['codigo', 'permitido']);
  });

  it('los seis códigos de denegación son alcanzables', () => {
    const admin = usuario('ADMINISTRADOR');
    const supervisor = usuario('SUPERVISOR');
    const practicante = usuario('PRACTICANTE');

    const casos: ResultadoPermiso[] = [
      puede(
        usuario('PRACTICANTE', { estado: 'INACTIVO' }),
        'TOMAR_TAREA',
        contextoPara('TOMAR_TAREA', practicante),
      ),
      puede(supervisor, 'TOMAR_TAREA', contextoPara('TOMAR_TAREA', supervisor)),
      puede(supervisor, 'VER_PROYECTO', contextoPara('VER_PROYECTO', supervisor, 'AJENO')),
      puede(usuario('PRACTICANTE', { id: IDS.practicanteAjeno }), 'LIBERAR_TAREA', {
        proyecto: proyecto(),
        tarea: tarea(),
        asignaciones: [asignacion({ id: 'a-otra', id_practicante: IDS.practicanteAjeno })],
      }),
      puede(admin, 'EDITAR_NOMBRE_PROPIO', { usuario_objetivo: practicante }),
      puede(
        practicante,
        'TOMAR_TAREA',
        contextoPara('TOMAR_TAREA', practicante, 'NORMAL', { estado: 'FINALIZADO' }),
      ),
    ];

    const codigos = casos.map((caso) => (caso.permitido ? 'PERMITIDO' : caso.codigo));

    expect(new Set(codigos)).toEqual(new Set(CODIGOS_DENEGACION));
  });
});

describe('frontera del paso', () => {
  it('TOMAR_TAREA en un proyecto EN_PAUSA sigue permitido: la pausa es del paso 3', () => {
    const practicante = usuario('PRACTICANTE');

    expect(
      puede(
        practicante,
        'TOMAR_TAREA',
        contextoPara('TOMAR_TAREA', practicante, 'NORMAL', { estado: 'EN_PAUSA' }),
      ),
    ).toEqual({ permitido: true, exige_texto: null });
  });

  it('APROBAR_TAREA sobre una tarea DISPONIBLE sigue permitido: el estado es del paso 3', () => {
    const supervisor = usuario('SUPERVISOR');

    expect(
      puede(supervisor, 'APROBAR_TAREA', {
        proyecto: proyecto(),
        tarea: tarea({ estado: 'DISPONIBLE', id_practicante: null }),
      }),
    ).toEqual({ permitido: true, exige_texto: null });
  });
});

describe('puedeEnRol (permiso de módulo, sin contexto)', () => {
  it('coincide con la matriz: la celda de cada acción y rol', () => {
    for (const rol of ROLES) {
      const usuarioQueActua = usuario(rol);
      const celda = CELDA_POR_ROL[rol];

      for (const fila of FILAS) {
        esperarCelda(
          puedeEnRol(usuarioQueActua, fila.accion),
          fila[celda],
          `${fila.accion} · ${rol}`,
        );
      }
    }
  });

  it('un usuario INACTIVO recibe USUARIO_INACTIVO en las 58 acciones y los 3 roles', () => {
    for (const rol of ROLES) {
      const inactivo = usuario(rol, { estado: 'INACTIVO' });

      for (const accion of ACCIONES_PERMISO) {
        expect(puedeEnRol(inactivo, accion), `${accion} · ${rol}`).toEqual({
          permitido: false,
          codigo: 'USUARIO_INACTIVO',
        });
      }
    }
  });

  it('el estado se comprueba antes que el rol: un practicante inactivo en una acción de admin', () => {
    const inactivo = usuario('PRACTICANTE', { estado: 'INACTIVO' });

    expect(puedeEnRol(inactivo, 'VER_POSTULACIONES')).toEqual({
      permitido: false,
      codigo: 'USUARIO_INACTIVO',
    });
  });

  it('devuelve el texto exigido igual que puede()', () => {
    const supervisor = usuario('SUPERVISOR');

    expect(puedeEnRol(supervisor, 'LIBERAR_TAREA')).toEqual({
      permitido: true,
      exige_texto: 'MOTIVO',
    });
    expect(puedeEnRol(usuario('PRACTICANTE'), 'DESACTIVAR_REQUIERE_PR')).toEqual({
      permitido: true,
      exige_texto: 'MOTIVO',
    });
  });

  it('no mira alcance: un supervisor sin proyectos tiene permiso de módulo de reportes', () => {
    expect(puedeEnRol(usuario('SUPERVISOR'), 'VER_REPORTES')).toEqual({
      permitido: true,
      exige_texto: null,
    });
  });

  it('los módulos solo-Administrador se deniegan a Supervisor y Practicante', () => {
    for (const accion of [
      'VER_POSTULACIONES',
      'VER_SUPERVISORES',
      'VER_DIRECTORIO_PRACTICANTES',
    ] as const) {
      expect(puedeEnRol(usuario('SUPERVISOR'), accion), `${accion} · SUPERVISOR`).toEqual({
        permitido: false,
        codigo: 'ROL_NO_PERMITIDO',
      });
      expect(puedeEnRol(usuario('PRACTICANTE'), accion), `${accion} · PRACTICANTE`).toEqual({
        permitido: false,
        codigo: 'ROL_NO_PERMITIDO',
      });
      expect(puedeEnRol(usuario('ADMINISTRADOR'), accion)).toEqual({
        permitido: true,
        exige_texto: null,
      });
    }
  });
});

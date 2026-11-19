import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACCIONES_TAREA_ADICIONALES, type AccionDeTarea, type AccionDisponible } from '@/domain';
import type { TareaDetalle } from '@/compartido/DetalleTarea';
import * as servicios from '@/services';
import { crearEntorno, exito } from '@/services';
import { aAccionesTarea } from './accionesDelDetalle';

vi.mock('@/services', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services')>();
  const falso = () => vi.fn(async () => original.exito(null));
  return {
    ...original,
    tomarTarea: falso(),
    liberarTarea: falso(),
    enviarTareaASupervision: falso(),
    marcarTareaTerminada: falso(),
    aprobarTarea: falso(),
    devolverTarea: falso(),
    reabrirTarea: falso(),
    cambiarRequiereSupervision: falso(),
    cambiarRequierePR: falso(),
    cerrarPullRequest: falso(),
    eliminarTarea: falso(),
  };
});

const TRANSICIONES: AccionDeTarea[] = [
  'TOMAR',
  'LIBERAR',
  'ENVIAR_A_SUPERVISION',
  'MARCAR_TERMINADA',
  'APROBAR',
  'DEVOLVER',
  'REABRIR',
];
const TODAS: AccionDeTarea[] = [...TRANSICIONES, ...ACCIONES_TAREA_ADICIONALES];

const tarea: TareaDetalle = {
  id: 'tar-1',
  idLegible: 'PL2D-001',
  numero: 1,
  titulo: 'Tarea',
  descripcion: 'Descripción',
  estado: 'EN_PROGRESO',
  idProyecto: 'pry-1',
  proyecto: 'Plataforma 2D',
  idPracticante: 'usr-1',
  fechaLimite: '2026-11-30',
  requiereSupervision: false,
  requierePr: true,
  estadoPr: null,
};

const entorno = crearEntorno({ demoraMs: 0 });
const ACTOR = 'usr-actor';
const disponible = (
  accion: AccionDeTarea,
  exige_texto: AccionDisponible['exige_texto'] = null,
) => ({
  accion,
  exige_texto,
});

function una(accion: AccionDeTarea, exigeTexto: AccionDisponible['exige_texto'] = null, t = tarea) {
  const [resultado] = aAccionesTarea([disponible(accion, exigeTexto)], t, ACTOR, entorno);
  return resultado;
}

describe('aAccionesTarea', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sin acciones disponibles queda en solo lectura', () => {
    expect(aAccionesTarea([], tarea, ACTOR, entorno)).toEqual([]);
  });

  it('describe cada acción del dominio con una clave y una etiqueta propias', () => {
    const acciones = aAccionesTarea(
      TODAS.map((a) => disponible(a)),
      tarea,
      ACTOR,
      entorno,
    );
    expect(acciones).toHaveLength(TODAS.length);
    expect(new Set(acciones.map((a) => a.clave)).size).toBe(TODAS.length);
    for (const accion of acciones) expect(accion.etiqueta.length).toBeGreaterThan(0);
  });

  it('conserva el orden que decidió el dominio', () => {
    const acciones = aAccionesTarea(
      [disponible('ELIMINAR', 'MOTIVO'), disponible('TOMAR'), disponible('EDITAR_DATOS')],
      tarea,
      ACTOR,
      entorno,
    );
    expect(acciones.map((a) => a.clave)).toEqual(['eliminar', 'tomar', 'editar']);
  });

  it.each([
    ['TOMAR', 'tomar', 'Tomar tarea'],
    ['LIBERAR', 'liberar', 'Liberar'],
    ['ENVIAR_A_SUPERVISION', 'enviar', 'Enviar a supervisión'],
    ['MARCAR_TERMINADA', 'terminar', 'Marcar como terminada'],
    ['APROBAR', 'aprobar', 'Aprobar'],
    ['DEVOLVER', 'devolver', 'Devolver'],
    ['REABRIR', 'reabrir', 'Reabrir'],
    ['EDITAR_DATOS', 'editar', 'Editar'],
    ['ACTIVAR_REQUIERE_PR', 'requiere_pr', 'Requiere PR'],
    ['DESACTIVAR_REQUIERE_PR', 'no_requiere_pr', 'No requiere PR'],
    ['CREAR_PULL_REQUEST', 'crear_pr', 'Crear Pull Request'],
    ['CERRAR_PULL_REQUEST', 'cerrar_pr', 'Cerrar Pull Request'],
    ['ELIMINAR', 'eliminar', 'Eliminar'],
  ] as const)('%s → clave «%s» y etiqueta «%s»', (accion, clave, etiqueta) => {
    expect(una(accion)).toMatchObject({ clave, etiqueta });
  });

  it('«Crear Pull Request» pasa a «Crear nuevo» cuando el anterior está cerrado', () => {
    expect(una('CREAR_PULL_REQUEST', null, { ...tarea, estadoPr: 'CERRADO' }).etiqueta).toBe(
      'Crear nuevo Pull Request',
    );
    expect(una('CREAR_PULL_REQUEST', null, { ...tarea, estadoPr: 'PENDIENTE' }).etiqueta).toBe(
      'Crear Pull Request',
    );
  });

  it('«supervisión» ofrece el cambio contrario al valor actual', () => {
    expect(una('CAMBIAR_REQUIERE_SUPERVISION').etiqueta).toBe('Activar supervisión');
    expect(
      una('CAMBIAR_REQUIERE_SUPERVISION', null, { ...tarea, requiereSupervision: true }).etiqueta,
    ).toBe('Desactivar supervisión');
  });

  it('el texto que exige el dominio se pide como «Motivo» o «Nota», obligatorio', () => {
    expect(una('LIBERAR', 'MOTIVO').pedirMotivo).toEqual({ etiqueta: 'Motivo', obligatorio: true });
    expect(una('DEVOLVER', 'NOTA').pedirMotivo).toEqual({ etiqueta: 'Nota', obligatorio: true });
    expect(una('TOMAR', null)).not.toHaveProperty('pedirMotivo');
  });

  it('solo cerrar el PR y eliminar son destructivas; eliminar avisa «Tarea eliminada»', () => {
    for (const accion of TODAS) {
      const resultado = una(accion);
      const destructiva = accion === 'CERRAR_PULL_REQUEST' || accion === 'ELIMINAR';
      expect(resultado.destructivo === true, accion).toBe(destructiva);
    }
    expect(una('ELIMINAR').mensajeExito).toBe('Tarea eliminada');
  });

  it('crear el PR y editar no llaman a un servicio: los resuelve la página', () => {
    expect(una('CREAR_PULL_REQUEST')).not.toHaveProperty('ejecutar');
    expect(una('EDITAR_DATOS')).not.toHaveProperty('ejecutar');
  });

  it.each([
    ['TOMAR', 'tomarTarea', {}],
    ['LIBERAR', 'liberarTarea', { motivo: 'Cambio de prioridades' }],
    ['ENVIAR_A_SUPERVISION', 'enviarTareaASupervision', {}],
    ['MARCAR_TERMINADA', 'marcarTareaTerminada', {}],
    ['APROBAR', 'aprobarTarea', {}],
    ['DEVOLVER', 'devolverTarea', { nota: 'Falta la prueba' }],
    ['REABRIR', 'reabrirTarea', { nota: 'Se detectó un error' }],
    ['CAMBIAR_REQUIERE_SUPERVISION', 'cambiarRequiereSupervision', { valor: true }],
    ['ACTIVAR_REQUIERE_PR', 'cambiarRequierePR', { valor: true, motivo: 'Cambio de prioridades' }],
    [
      'DESACTIVAR_REQUIERE_PR',
      'cambiarRequierePR',
      { valor: false, motivo: 'Cambio de prioridades' },
    ],
    ['CERRAR_PULL_REQUEST', 'cerrarPullRequest', { motivo: 'Cambio de prioridades' }],
    ['ELIMINAR', 'eliminarTarea', { motivo: 'Cambio de prioridades' }],
  ] as const)(
    '%s llama a %s con quien actúa, la tarea y el texto',
    async (accion, nombre, extra) => {
      const exigeNota = accion === 'DEVOLVER' || accion === 'REABRIR';
      const texto = exigeNota
        ? 'nota' in extra
          ? extra.nota
          : undefined
        : 'motivo' in extra
          ? extra.motivo
          : undefined;

      await una(accion).ejecutar?.(texto);

      const servicio = servicios[nombre] as unknown as ReturnType<typeof vi.fn>;
      expect(servicio).toHaveBeenCalledTimes(1);
      expect(servicio).toHaveBeenCalledWith(
        { idActor: ACTOR, idTarea: 'tar-1', ...extra },
        entorno,
      );
    },
  );

  it('devuelve el resultado del servicio para que el detalle muestre su error', async () => {
    vi.mocked(servicios.aprobarTarea).mockResolvedValueOnce(servicios.fallo('TAREA_NO_ENCONTRADA'));

    const resultado = await una('APROBAR').ejecutar?.();

    expect(resultado?.ok).toBe(false);
    expect(await una('TOMAR').ejecutar?.()).toEqual(exito(null));
  });
});

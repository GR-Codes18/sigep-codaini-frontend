import { describe, expect, it, vi } from 'vitest';
import { asignacion, proyecto, tarea as tareaDominio, usuario } from '@/domain/pruebas/fabricas';
import { cerrarPullRequest, eliminarTarea, exito } from '@/services';
import type { TareaDetalle } from '@/compartido/DetalleTarea';
import { accionesDeTarea } from './accionesDeTarea';

vi.mock('@/services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services')>();
  return { ...actual, cerrarPullRequest: vi.fn(), eliminarTarea: vi.fn() };
});

const detalle = (cambios: Partial<TareaDetalle> = {}): TareaDetalle => ({
  id: 't-tarea',
  idLegible: 'PRB-001',
  numero: 1,
  titulo: 'Tarea de prueba',
  descripcion: 'Descripción',
  estado: 'DISPONIBLE',
  idProyecto: 'p-proyecto',
  proyecto: 'Proyecto de prueba',
  idPracticante: null,
  fechaLimite: '2026-11-30',
  requiereSupervision: false,
  requierePr: true,
  estadoPr: null,
  ...cambios,
});

const contexto = {
  usuario: usuario('PRACTICANTE'),
  proyecto: proyecto(),
  asignaciones: [asignacion()],
};

const claves = (tarea: TareaDetalle, c = contexto) =>
  accionesDeTarea(tarea, c).map((accion) => accion.clave);

describe('accionesDeTarea', () => {
  it('usa las transiciones del dominio para tomar, salvo que el proyecto esté en pausa', () => {
    expect(claves(detalle())).toContain('tomar');
    expect(
      claves(detalle(), { ...contexto, proyecto: proyecto({ estado: 'EN_PAUSA' }) }),
    ).not.toContain('tomar');
  });

  it('muestra la salida indicada por requiere_supervision y no ambas', () => {
    const enProgreso = detalle({
      estado: 'EN_PROGRESO',
      idPracticante: contexto.usuario.id,
    });

    expect(claves(enProgreso, { ...contexto, proyecto: proyecto() })).toContain('terminar');
    expect(claves(enProgreso, { ...contexto, proyecto: proyecto() })).not.toContain('enviar');
    expect(
      claves({ ...enProgreso, requiereSupervision: true }, { ...contexto, proyecto: proyecto() }),
    ).toContain('enviar');
  });

  it('solo el supervisor del proyecto puede aprobar o devolver', () => {
    const esperando = detalle({ estado: 'ESPERANDO_SUPERVISION', requiereSupervision: true });
    const accionesSupervisor = claves(esperando, { ...contexto, usuario: usuario('SUPERVISOR') });

    expect(accionesSupervisor).toContain('aprobar');
    expect(accionesSupervisor).toContain('devolver');
    expect(claves(esperando)).not.toContain('aprobar');
  });

  it('incluye la nota exigida por el dominio al devolver o reabrir', () => {
    const esperando = detalle({ estado: 'ESPERANDO_SUPERVISION', requiereSupervision: true });
    const enProgreso = detalle({
      estado: 'EN_PROGRESO',
      idPracticante: contexto.usuario.id,
      requiereSupervision: true,
    });
    const terminada = detalle({ estado: 'TERMINADA' });

    expect(
      accionesDeTarea(esperando, { ...contexto, usuario: usuario('SUPERVISOR') })[1].pedirMotivo,
    ).toEqual({ etiqueta: 'Nota', obligatorio: true });
    expect(
      accionesDeTarea(enProgreso, { ...contexto, usuario: usuario('SUPERVISOR') })[0].pedirMotivo,
    ).toEqual({ etiqueta: 'Motivo', obligatorio: true });
    expect(
      accionesDeTarea(terminada, { ...contexto, usuario: usuario('ADMINISTRADOR') })[0].pedirMotivo,
    ).toEqual({ etiqueta: 'Nota', obligatorio: true });
  });

  it('mantiene eliminar y crear PR solo cuando cumplen permisos y condiciones', () => {
    const disponible = detalle();
    const esperando = detalle({
      estado: 'ESPERANDO_SUPERVISION',
      estadoPr: 'PENDIENTE',
      idPracticante: contexto.usuario.id,
    });

    expect(claves(disponible, { ...contexto, usuario: usuario('ADMINISTRADOR') })).toContain(
      'eliminar',
    );
    expect(
      claves(
        { ...disponible, estadoPr: 'CREADO' },
        {
          ...contexto,
          usuario: usuario('ADMINISTRADOR'),
        },
      ),
    ).not.toContain('eliminar');
    expect(claves(esperando)).toContain('crear_pr');
    expect(claves(esperando, { ...contexto, usuario: usuario('SUPERVISOR') })).not.toContain(
      'crear_pr',
    );
  });

  it('permite al practicante responsable indicar que no requiere PR en EN_PROGRESO', () => {
    const enProgreso = detalle({
      estado: 'EN_PROGRESO',
      idPracticante: contexto.usuario.id,
    });
    const accion = accionesDeTarea(enProgreso, contexto).find(
      (item) => item.clave === 'no_requiere_pr',
    );

    expect(accion).toMatchObject({
      etiqueta: 'No requiere PR',
      pedirMotivo: { etiqueta: 'Motivo', obligatorio: true },
    });
    expect(accion?.deshabilitada).not.toBe(true);
  });

  it('muestra «No requiere PR» solo si el cambio está permitido y todavía no hay PR', () => {
    const enProgreso = detalle({
      estado: 'EN_PROGRESO',
      idPracticante: contexto.usuario.id,
    });

    expect(claves({ ...enProgreso, estado: 'DISPONIBLE' })).not.toContain('no_requiere_pr');
    expect(claves(enProgreso, { ...contexto, usuario: usuario('SUPERVISOR') })).toContain(
      'no_requiere_pr',
    );
    expect(
      claves({ ...enProgreso, urlPr: 'https://github.com/codaini/pl2d/pull/1' }),
    ).not.toContain('no_requiere_pr');
    expect(claves(enProgreso, { ...contexto, asignaciones: [] })).not.toContain('no_requiere_pr');
  });

  it('ofrece cerrar un PR abierto con motivo y conecta el servicio de cierre', async () => {
    const supervisor = usuario('SUPERVISOR');
    const tarea = detalle({
      estado: 'TERMINADA',
      estadoPr: 'CREADO',
      idPracticante: contexto.usuario.id,
      ramaOrigen: 'feat/tarea',
      ramaBase: 'main',
      urlPr: 'https://github.com/codaini/proyecto-prueba/pull/1',
    });
    const accion = accionesDeTarea(tarea, {
      ...contexto,
      usuario: supervisor,
    }).find((item) => item.clave === 'cerrar_pr');

    vi.mocked(cerrarPullRequest).mockResolvedValue(exito(tareaDominio()));
    expect(accion).toMatchObject({
      etiqueta: 'Cerrar Pull Request',
      destructivo: true,
      pedirMotivo: { etiqueta: 'Motivo', obligatorio: true },
    });
    await accion?.ejecutar?.('Ya no se necesita');
    expect(cerrarPullRequest).toHaveBeenCalledWith({
      idActor: supervisor.id,
      idTarea: tarea.id,
      motivo: 'Ya no se necesita',
    });
  });

  it('conecta la eliminación con el servicio y pasa el motivo obligatorio', async () => {
    const administrador = usuario('ADMINISTRADOR');
    const tarea = detalle();
    const accion = accionesDeTarea(tarea, {
      ...contexto,
      usuario: administrador,
    }).find((item) => item.clave === 'eliminar');

    vi.mocked(eliminarTarea).mockResolvedValue(exito({ id: tarea.id }));
    expect(accion).toMatchObject({
      etiqueta: 'Eliminar',
      destructivo: true,
      pedirMotivo: { etiqueta: 'Motivo', obligatorio: true },
      mensajeExito: 'Tarea eliminada',
    });
    await accion?.ejecutar?.('Tarea duplicada');
    expect(eliminarTarea).toHaveBeenCalledWith({
      idActor: administrador.id,
      idTarea: tarea.id,
      motivo: 'Tarea duplicada',
    });
  });

  it('permite crear un nuevo PR cuando el anterior está cerrado', () => {
    const cerrada = detalle({
      estado: 'TERMINADA',
      estadoPr: 'CERRADO',
      idPracticante: contexto.usuario.id,
      ramaOrigen: 'feat/tarea',
      ramaBase: 'main',
      urlPr: 'https://github.com/codaini/proyecto-prueba/pull/1',
    });

    expect(claves(cerrada)).toContain('crear_pr');
  });

  it('no muestra acciones al usuario inactivo', () => {
    expect(
      claves(detalle(), {
        ...contexto,
        usuario: usuario('PRACTICANTE', { estado: 'INACTIVO' }),
      }),
    ).toEqual([]);
  });
});

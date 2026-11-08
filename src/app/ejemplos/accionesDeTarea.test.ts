import { describe, expect, it } from 'vitest';
import { asignacion, proyecto, usuario } from '@/domain/pruebas/fabricas';
import type { TareaDetalle } from '@/compartido/DetalleTarea';
import { accionesDeTarea } from './accionesDeTarea';

const detalle = (cambios: Partial<TareaDetalle> = {}): TareaDetalle => ({
  id: 'PRB-001',
  numero: 1,
  titulo: 'Tarea de prueba',
  descripcion: 'Descripción',
  estado: 'DISPONIBLE',
  idProyecto: 'p-proyecto',
  proyecto: 'Proyecto de prueba',
  idPracticante: null,
  fechaLimite: new Date(2026, 10, 30),
  requiereSupervision: false,
  requierePr: true,
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

    expect(claves(esperando, { ...contexto, usuario: usuario('SUPERVISOR') })).toEqual([
      'aprobar',
      'devolver',
    ]);
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

  it('no muestra acciones al usuario inactivo', () => {
    expect(
      claves(detalle(), {
        ...contexto,
        usuario: usuario('PRACTICANTE', { estado: 'INACTIVO' }),
      }),
    ).toEqual([]);
  });
});

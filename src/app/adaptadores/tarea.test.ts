import { describe, expect, it } from 'vitest';
import type { TareaDetalleVista } from '@/services';
import { aTareaDetalle } from './tarea';

function vista(cambios: Partial<TareaDetalleVista> = {}): TareaDetalleVista {
  return {
    id: 'tar-1',
    numero: 7,
    id_legible: 'PL2D-007',
    titulo: 'Diseñar el menú',
    descripcion: 'Qué se espera.',
    estado: 'ESPERANDO_SUPERVISION',
    fecha_limite: '2026-11-20',
    vencida: false,
    fecha_termino: null,
    proyecto: {
      id: 'pry-1',
      codigo: 'PL2D',
      nombre: 'Plataforma 2D',
      estado: 'ACTIVO',
      rama_base: 'main',
    },
    responsable: { id: 'usr-1', nombre: 'Ana Quispe' },
    es_mia: true,
    requiere_supervision: true,
    requiere_pr: true,
    pull_request: {
      etiqueta: 'CREADO',
      url: 'https://github.com/codaini/pl2d/pull/12',
      rama_origen: 'feature/PL2D-007',
      rama_base: 'main',
    },
    devuelta: false,
    observacion: null,
    atencion_responsable: [],
    dias_esperando: 2,
    acciones: [],
    solo_lectura: true,
    eventos: [],
    ...cambios,
  };
}

describe('aTareaDetalle', () => {
  it('renombra y aplana los campos, con el proyecto y el responsable', () => {
    expect(aTareaDetalle(vista())).toEqual({
      id: 'tar-1',
      idLegible: 'PL2D-007',
      numero: 7,
      titulo: 'Diseñar el menú',
      descripcion: 'Qué se espera.',
      estado: 'ESPERANDO_SUPERVISION',
      idProyecto: 'pry-1',
      proyecto: 'Plataforma 2D',
      idPracticante: 'usr-1',
      responsable: 'Ana Quispe',
      fechaLimite: '2026-11-20',
      requiereSupervision: true,
      requierePr: true,
      estadoPr: 'CREADO',
      urlPr: 'https://github.com/codaini/pl2d/pull/12',
      ramaOrigen: 'feature/PL2D-007',
      ramaBase: 'main',
      devuelta: false,
    });
  });

  it('sin responsable: idPracticante es null y no hay nombre', () => {
    const tarea = aTareaDetalle(vista({ responsable: null, estado: 'DISPONIBLE' }));
    expect(tarea.idPracticante).toBeNull();
    expect(tarea).not.toHaveProperty('responsable');
  });

  it('sin PR visible: estadoPr es null y no hay URL ni ramas', () => {
    const tarea = aTareaDetalle(vista({ pull_request: null, estado: 'EN_PROGRESO' }));
    expect(tarea.estadoPr).toBeNull();
    expect(tarea).not.toHaveProperty('urlPr');
    expect(tarea).not.toHaveProperty('ramaOrigen');
    expect(tarea).not.toHaveProperty('ramaBase');
  });

  it('con la etiqueta «Pendiente» la consulta no trae URL y no se inventa una', () => {
    const tarea = aTareaDetalle(
      vista({
        pull_request: { etiqueta: 'PENDIENTE', url: null, rama_origen: null, rama_base: null },
      }),
    );
    expect(tarea.estadoPr).toBe('PENDIENTE');
    expect(tarea).not.toHaveProperty('urlPr');
  });

  it('pasa la marca «Devuelta» y la observación tal como las decide la consulta', () => {
    const conMarca = aTareaDetalle(
      vista({ estado: 'EN_PROGRESO', devuelta: true, observacion: 'Falta la prueba.' }),
    );
    expect(conMarca.devuelta).toBe(true);
    expect(conMarca.observacion).toBe('Falta la prueba.');

    const sinNota = aTareaDetalle(vista({ devuelta: false, observacion: null }));
    expect(sinNota.devuelta).toBe(false);
    expect(sinNota).not.toHaveProperty('observacion');
  });

  it('conserva la fecha de término como llega (ISO) y la omite si es null', () => {
    expect(aTareaDetalle(vista({ fecha_termino: '2026-11-19T15:00:00.000Z' })).fechaTermino).toBe(
      '2026-11-19T15:00:00.000Z',
    );
    expect(aTareaDetalle(vista({ fecha_termino: null }))).not.toHaveProperty('fechaTermino');
  });

  it('pasa los motivos de atención al responsable y los omite si no hay', () => {
    const conMotivos = aTareaDetalle(
      vista({ atencion_responsable: ['CUENTA_INACTIVA', 'SIN_ASIGNACION_VIGENTE'] }),
    );
    expect(conMotivos.atencionResponsable).toEqual(['CUENTA_INACTIVA', 'SIN_ASIGNACION_VIGENTE']);

    expect(aTareaDetalle(vista({ atencion_responsable: [] }))).not.toHaveProperty(
      'atencionResponsable',
    );
  });
});

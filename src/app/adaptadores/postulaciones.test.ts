import { describe, expect, it } from 'vitest';
import type { ListadoPostulaciones, PostulacionDetalle } from '@/services';
import { aDetallePostulacion, aPostulaciones } from './postulaciones';

const LISTADO: ListadoPostulaciones = {
  postulaciones: [
    {
      id: 'pos-1',
      nombre: 'Ana Quispe',
      correo: 'ana@correo.demo',
      area: { id: 'area-sw', nombre: 'Software' },
      especialidad: { id: 'esp-front', nombre: 'Frontend' },
      fecha_postulacion: '2026-11-08T03:30:00.000Z',
      estado: 'PENDIENTE',
      puntaje: 86,
      requiere_revision_manual: false,
    },
    {
      id: 'pos-2',
      nombre: 'Luis Mamani',
      correo: 'luis@correo.demo',
      area: null,
      especialidad: null,
      fecha_postulacion: '2026-11-01T17:00:00.000Z',
      estado: 'RECHAZADA',
      puntaje: null,
      requiere_revision_manual: true,
    },
  ],
  contadores: { TODAS: 2, PENDIENTES: 1, REQUIEREN_REVISION: 0, APROBADAS: 0, RECHAZADAS: 1 },
};

describe('aPostulaciones', () => {
  it('pasa las filas en el orden de la consulta y los contadores tal cual', () => {
    const vista = aPostulaciones(LISTADO);

    expect(vista.filas.map((f) => f.id)).toEqual(['pos-1', 'pos-2']);
    expect(vista.contadores).toEqual(LISTADO.contadores);
  });

  it('convierte la fecha a Date (parseISO en el borde) y la muestra en español', () => {
    const [primera] = aPostulaciones(LISTADO).filas;

    expect(primera.fecha).toBeInstanceOf(Date);
    expect(primera.fecha.toISOString()).toBe('2026-11-08T03:30:00.000Z');
    expect(primera.fechaTexto).toMatch(/nov 2026$/);
  });

  it('el día para el filtro por fechas es el de Perú: las 03:30 UTC del 8 son del 7', () => {
    const [primera, segunda] = aPostulaciones(LISTADO).filas;

    expect(primera.dia).toBe('2026-11-07');
    expect(segunda.dia).toBe('2026-11-01');
  });

  it('renombra los campos y conserva el puntaje, la marca y el estado', () => {
    const [primera, segunda] = aPostulaciones(LISTADO).filas;

    expect(primera).toMatchObject({
      nombre: 'Ana Quispe',
      correo: 'ana@correo.demo',
      area: { id: 'area-sw', nombre: 'Software' },
      puntaje: 86,
      requiereRevision: false,
      estado: 'PENDIENTE',
    });
    expect(segunda).toMatchObject({
      area: null,
      especialidad: null,
      puntaje: null,
      requiereRevision: true,
      estado: 'RECHAZADA',
    });
  });

  it('un listado vacío da filas vacías', () => {
    const vacio: ListadoPostulaciones = {
      postulaciones: [],
      contadores: { TODAS: 0, PENDIENTES: 0, REQUIEREN_REVISION: 0, APROBADAS: 0, RECHAZADAS: 0 },
    };

    expect(aPostulaciones(vacio).filas).toEqual([]);
  });
});

function detalle(cambios: Partial<PostulacionDetalle> = {}): PostulacionDetalle {
  return {
    postulante: {
      id: 'pos-1',
      nombre: 'Ana Quispe',
      correo: 'ana@correo.demo',
      celular: '987654321',
      fecha_postulacion: '2026-11-08T15:30:00.000Z',
      area: { id: 'area-sw', nombre: 'Software' },
      especialidad: { id: 'esp-front', nombre: 'Frontend' },
      cv: { nombre: 'cv-ana.pdf', url: '/cv-ejemplo/ana.pdf' },
    },
    estado: 'PENDIENTE',
    evaluacion: {
      puntaje_total: 86,
      puntaje_area: 80,
      puntaje_especialidad: 90,
      justificacion: 'Cumple 6 de 8 criterios.',
      requiere_revision_manual: false,
      fecha_evaluacion: '2026-11-08T16:00:00.000Z',
      proporcion: { area: 40, especialidad: 60 },
      bloques: {
        AREA: [
          {
            nombre: 'Nivel académico',
            peso: 50,
            cumplido: true,
            puntaje_obtenido: 50,
            observacion: 'Egresado',
          },
          {
            nombre: 'Disponibilidad',
            peso: 50,
            cumplido: false,
            puntaje_obtenido: 0,
            observacion: null,
          },
        ],
        ESPECIALIDAD: [
          { nombre: 'React', peso: 100, cumplido: true, puntaje_obtenido: 100, observacion: null },
        ],
      },
    },
    eventos: [],
    practicante: null,
    decisiones: ['APROBAR', 'RECHAZAR'],
    ...cambios,
  };
}

describe('aDetallePostulacion', () => {
  it('renombra los datos del postulante y trae solo el nombre del CV', () => {
    const vista = aDetallePostulacion(detalle());

    expect(vista).toMatchObject({
      id: 'pos-1',
      nombre: 'Ana Quispe',
      correo: 'ana@correo.demo',
      celular: '987654321',
      area: 'Software',
      especialidad: 'Frontend',
      estado: 'PENDIENTE',
      cv: { nombre: 'cv-ana.pdf' },
    });
    expect(JSON.stringify(vista)).not.toContain('/cv-ejemplo/');
  });

  it('el instante de la postulación se muestra con fecha y hora', () => {
    expect(aDetallePostulacion(detalle()).fechaTexto).toMatch(/^8 nov 2026, 10:30$/);
  });

  it('sin área ni especialidad (el catálogo ya no las tiene) dice «Sin área» y «Sin especialidad»', () => {
    const base = detalle();
    const vista = aDetallePostulacion(
      detalle({ postulante: { ...base.postulante, area: null, especialidad: null } }),
    );

    expect(vista.area).toBe('Sin área');
    expect(vista.especialidad).toBe('Sin especialidad');
  });

  it('los pesos y la fórmula con números salen de la proporción cuando reproduce la nota guardada', () => {
    const { evaluacion } = aDetallePostulacion(detalle());

    expect(evaluacion?.pesos).toEqual({
      area: 40,
      especialidad: 60,
      formula: 'Nota final = 0,4 × 80 + 0,6 × 90 = 86',
    });
  });

  it('si la proporción vigente ya no reproduce la nota guardada, no afirma ninguna fórmula', () => {
    const base = detalle();
    const vista = aDetallePostulacion(
      detalle({ evaluacion: { ...base.evaluacion!, proporcion: { area: 70, especialidad: 30 } } }),
    );

    expect(vista.evaluacion?.pesos).toBeNull();
  });

  it('sin proporción (parámetro roto) tampoco hay pesos', () => {
    const base = detalle();
    const vista = aDetallePostulacion(
      detalle({ evaluacion: { ...base.evaluacion!, proporcion: null } }),
    );

    expect(vista.evaluacion?.pesos).toBeNull();
  });

  it('la evaluación trae el puntaje final, los de cada bloque y el desglose con la observación vacía como texto vacío', () => {
    const { evaluacion } = aDetallePostulacion(detalle());

    expect(evaluacion).toMatchObject({
      puntajeTotal: 86,
      puntajeArea: 80,
      puntajeEspecialidad: 90,
      justificacion: 'Cumple 6 de 8 criterios.',
      requiereRevision: false,
    });
    expect(evaluacion?.bloques.AREA).toEqual([
      { nombre: 'Nivel académico', peso: 50, cumplido: true, puntaje: 50, observacion: 'Egresado' },
      { nombre: 'Disponibilidad', peso: 50, cumplido: false, puntaje: 0, observacion: '' },
    ]);
    expect(evaluacion?.bloques.ESPECIALIDAD).toHaveLength(1);
    expect(evaluacion?.fechaTexto).toMatch(/^8 nov 2026, 11:00$/);
  });

  it('sin evaluación, `evaluacion` es null', () => {
    expect(aDetallePostulacion(detalle({ evaluacion: null })).evaluacion).toBeNull();
  });

  it('pasa el practicante creado y las decisiones tal como las decidió la consulta', () => {
    const vista = aDetallePostulacion(
      detalle({
        estado: 'APROBADA',
        practicante: { id: 'usr-pra-17', nombre: 'Kevin Huertas' },
        decisiones: [],
      }),
    );

    expect(vista.practicante).toEqual({ id: 'usr-pra-17', nombre: 'Kevin Huertas' });
    expect(vista.decisiones).toEqual([]);
    expect(aDetallePostulacion(detalle()).decisiones).toEqual(['APROBAR', 'RECHAZAR']);
  });

  it('los eventos pasan por el adaptador de la línea de tiempo (autor, acción y nota)', () => {
    const vista = aDetallePostulacion(
      detalle({
        eventos: [
          {
            evento: {
              id: 'evt-1',
              fecha: '2026-11-09T15:00:00.000Z',
              autor: { tipo: 'USUARIO', id_usuario: 'demo-admin' },
              tipo_accion: 'POSTULACION_RECHAZADA',
              elemento: { tipo: 'POSTULANTE', id: 'pos-1', etiqueta: 'Ana Quispe' },
              id_proyecto: null,
              cambios: [{ campo: 'estado', valor_anterior: 'PENDIENTE', valor_nuevo: 'RECHAZADA' }],
              nota: 'No cumple el perfil',
            },
            autor_nombre: 'Admin Demo',
            autor_rol: 'ADMINISTRADOR',
          },
        ],
      }),
    );

    expect(vista.eventos).toHaveLength(1);
    expect(vista.eventos[0]).toMatchObject({
      autor: 'Admin Demo (Administrador)',
      accion: 'Rechazada',
      resumen: 'Pendiente → Rechazada',
      nota: 'No cumple el perfil',
    });
    expect(vista.eventos[0].fecha).toBeInstanceOf(Date);
  });
});

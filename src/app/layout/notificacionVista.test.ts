import { describe, expect, it } from 'vitest';
import { crearSemilla } from '@/data/semilla';
import { notificacionesParaVista } from './notificacionVista';

describe('notificacionesParaVista', () => {
  it('muestra solo avisos del usuario, convierte la fecha y deriva la existencia del elemento', () => {
    const datos = crearSemilla(new Date('2026-11-17T18:30:00.000Z'));
    const actor = datos.usuarios.find((item) => item.rol === 'PRACTICANTE');
    if (!actor) throw new Error('La semilla debe incluir un practicante.');
    const ajena = datos.usuarios.find((item) => item.id !== actor.id);
    if (!ajena) throw new Error('La semilla debe incluir más de una persona.');
    const tarea = datos.tareas.find((item) => item.id_proyecto !== 'pry-pl2d') ?? datos.tareas[0];
    const propias = [
      {
        id: 'ntf-propia',
        id_destinatario: actor.id,
        tipo: 'TAREA_APROBADA' as const,
        mensaje: 'Aprobaron tu tarea.',
        elemento: { tipo: 'TAREA' as const, id: tarea.id },
        fecha: '2026-11-17T18:30:00.000Z',
        leida: false,
      },
      {
        id: 'ntf-eliminada',
        id_destinatario: actor.id,
        tipo: 'TAREA_LIBERADA' as const,
        mensaje: 'Liberaron otra tarea.',
        elemento: { tipo: 'TAREA' as const, id: 'tar-eliminada' },
        fecha: '2026-11-17T17:30:00.000Z',
        leida: true,
      },
    ];
    const otraPersona = { ...propias[0], id: 'ntf-ajena', id_destinatario: ajena.id };
    const resultado = notificacionesParaVista(
      { ...datos, notificaciones: [...propias, otraPersona] },
      actor.id,
      actor.rol,
    );

    expect(resultado).toHaveLength(2);
    expect(resultado[0]).toMatchObject({
      id: 'ntf-propia',
      texto: 'Aprobaron tu tarea.',
      fecha: new Date('2026-11-17T18:30:00.000Z'),
      ruta: tarea.id_proyecto === 'pry-pl2d' ? '/practicante/desarrollo' : '/practicante/proyectos',
      existe: true,
    });
    expect(resultado[1]).toMatchObject({
      id: 'ntf-eliminada',
      existe: false,
      ruta: undefined,
    });
  });
});

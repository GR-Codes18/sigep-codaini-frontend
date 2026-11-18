import { describe, expect, it } from 'vitest';
import { asignacion, proyecto, tarea, usuario } from '@/domain/pruebas/fabricas';
import { responsabilidadesPendientes } from './responsabilidadesPerfil';

describe('responsabilidadesPendientes', () => {
  const practicante = usuario('PRACTICANTE', { id: 'u-practicante' });
  const supervisor = usuario('SUPERVISOR', { id: 'u-supervisor' });
  const administrador = usuario('ADMINISTRADOR', { id: 'u-admin' });
  const proyectoSupervisor = proyecto({
    id: 'p-supervisor',
    id_supervisor: supervisor.id,
    codigo: 'SUP01',
  });
  const proyectoAjeno = proyecto({
    id: 'p-ajeno',
    id_supervisor: 'u-otro',
    codigo: 'OTR01',
  });
  const proyectoFinalizado = proyecto({
    id: 'p-finalizado',
    id_supervisor: supervisor.id,
    codigo: 'FIN01',
    estado: 'FINALIZADO',
  });
  const asignacionVigente = asignacion({
    id_practicante: practicante.id,
    id_proyecto: proyectoSupervisor.id,
    fecha_baja: null,
  });
  const tareas = [
    tarea({
      id: 't-propia',
      id_proyecto: proyectoSupervisor.id,
      id_practicante: practicante.id,
      estado: 'EN_PROGRESO',
    }),
    tarea({
      id: 't-ajena',
      id_proyecto: proyectoSupervisor.id,
      id_practicante: 'u-otro',
      estado: 'ESPERANDO_SUPERVISION',
    }),
    tarea({
      id: 't-terminada',
      id_proyecto: proyectoSupervisor.id,
      id_practicante: practicante.id,
      estado: 'TERMINADA',
    }),
    tarea({
      id: 't-proyecto-ajeno',
      id_proyecto: proyectoAjeno.id,
      estado: 'EN_PROGRESO',
    }),
    tarea({
      id: 't-proyecto-finalizado',
      id_proyecto: proyectoFinalizado.id,
      estado: 'EN_PROGRESO',
    }),
  ];

  const datos = {
    asignaciones: [asignacionVigente],
    proyectos: [proyectoSupervisor, proyectoAjeno, proyectoFinalizado],
    tareas,
  };

  it('limita al practicante a tareas propias no terminadas en asignaciones vigentes', () => {
    expect(responsabilidadesPendientes(practicante, datos).map((item) => item.id)).toEqual([
      't-propia',
    ]);

    expect(
      responsabilidadesPendientes(practicante, {
        ...datos,
        asignaciones: [{ ...asignacionVigente, fecha_baja: '2026-11-17' }],
      }),
    ).toEqual([]);
  });

  it('limita al supervisor a sus proyectos y excluye tareas terminadas y proyectos finalizados', () => {
    expect(responsabilidadesPendientes(supervisor, datos).map((item) => item.id)).toEqual(
      expect.arrayContaining(['t-ajena', 't-propia']),
    );
  });

  it('permite al administrador ver la carga no terminada de todos los proyectos no finalizados', () => {
    expect(responsabilidadesPendientes(administrador, datos).map((item) => item.id)).toEqual(
      expect.arrayContaining(['t-ajena', 't-propia', 't-proyecto-ajeno']),
    );
  });
});

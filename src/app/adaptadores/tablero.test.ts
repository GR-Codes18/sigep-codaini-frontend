import { describe, expect, it } from 'vitest';
import type { TableroProyecto, TareaDeTablero, TerminadasDeProyecto } from '@/services';
import { aTablero, aTareaTablero, aTareasTerminadas } from './tablero';

function tarea(cambios: Partial<TareaDeTablero> = {}): TareaDeTablero {
  return {
    id: 'tar-1',
    numero: 1,
    id_legible: 'PL2D-001',
    titulo: 'Tarea',
    estado: 'EN_PROGRESO',
    fecha_limite: '2026-11-20',
    vencida: false,
    fecha_termino: null,
    id_practicante: 'usr-1',
    responsable: 'Ana Quispe',
    es_mia: true,
    requiere_supervision: false,
    etiqueta_pr_visible: null,
    devuelta: false,
    ...cambios,
  };
}

describe('aTareaTablero', () => {
  it('renombra los campos y conserva el ID interno', () => {
    expect(aTareaTablero(tarea({ requiere_supervision: true, devuelta: true }))).toEqual({
      id: 'tar-1',
      idLegible: 'PL2D-001',
      titulo: 'Tarea',
      estado: 'EN_PROGRESO',
      responsable: 'Ana Quispe',
      esMia: true,
      fechaLimite: '2026-11-20',
      vencida: false,
      requiereSupervision: true,
      estadoPr: null,
      devuelta: true,
    });
  });

  it('convierte la fecha de término a Date (parseISO en el borde)', () => {
    const resultado = aTareaTablero(
      tarea({ estado: 'TERMINADA', fecha_termino: '2026-11-19T15:00:00.000Z' }),
    );
    expect(resultado.fechaTermino).toBeInstanceOf(Date);
    expect(resultado.fechaTermino?.toISOString()).toBe('2026-11-19T15:00:00.000Z');
  });

  it('pasa «vencida» tal como la decide la consulta, sin recalcularla', () => {
    expect(aTareaTablero(tarea({ vencida: true })).vencida).toBe(true);
    expect(aTareaTablero(tarea({ vencida: false, fecha_limite: '2000-01-01' })).vencida).toBe(
      false,
    );
  });

  it('sin responsable ni fecha de término, no hay esas propiedades', () => {
    const resultado = aTareaTablero(
      tarea({ estado: 'DISPONIBLE', responsable: null, id_practicante: null, es_mia: false }),
    );
    expect(resultado).not.toHaveProperty('responsable');
    expect(resultado).not.toHaveProperty('fechaTermino');
    expect(resultado.esMia).toBe(false);
  });

  it('pasa la etiqueta de PR tal como viene filtrada por la consulta', () => {
    expect(
      aTareaTablero(tarea({ estado: 'TERMINADA', etiqueta_pr_visible: 'FUSIONADO' })).estadoPr,
    ).toBe('FUSIONADO');
    expect(aTareaTablero(tarea({ etiqueta_pr_visible: null })).estadoPr).toBeNull();
  });
});

describe('aTablero', () => {
  it('une las columnas en orden y deja las terminadas ya recortadas', () => {
    const tablero: TableroProyecto = {
      id_proyecto: 'pry-1',
      estado_proyecto: 'ACTIVO',
      disponibles: [tarea({ id: 'a', estado: 'DISPONIBLE' })],
      en_progreso: [tarea({ id: 'b' }), tarea({ id: 'c' })],
      esperando_supervision: [tarea({ id: 'd', estado: 'ESPERANDO_SUPERVISION' })],
      terminadas: [tarea({ id: 'e', estado: 'TERMINADA' })],
      total_terminadas: 9,
    };
    const resultado = aTablero(tablero);
    expect(resultado.tareas.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(resultado.totalTerminadas).toBe(9);
  });

  it('un tablero vacío da una lista vacía y cero terminadas', () => {
    expect(
      aTablero({
        id_proyecto: 'pry-1',
        estado_proyecto: 'EN_PAUSA',
        disponibles: [],
        en_progreso: [],
        esperando_supervision: [],
        terminadas: [],
        total_terminadas: 0,
      }),
    ).toEqual({ tareas: [], totalTerminadas: 0 });
  });
});

describe('aTareasTerminadas', () => {
  it('adapta todas las terminadas y conserva el orden recibido', () => {
    const terminadas: TerminadasDeProyecto = {
      id_proyecto: 'pry-1',
      tareas: [
        tarea({ id: 'nueva', estado: 'TERMINADA', fecha_termino: '2026-11-19T15:00:00.000Z' }),
        tarea({ id: 'vieja', estado: 'TERMINADA', fecha_termino: '2026-11-01T15:00:00.000Z' }),
      ],
    };
    const resultado = aTareasTerminadas(terminadas);
    expect(resultado.map((t) => t.id)).toEqual(['nueva', 'vieja']);
    expect(resultado[0].fechaTermino).toBeInstanceOf(Date);
  });
});

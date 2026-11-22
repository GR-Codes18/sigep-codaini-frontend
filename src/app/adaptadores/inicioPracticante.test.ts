import { describe, expect, it } from 'vitest';
import type { InicioPracticante } from '@/services';
import { aInicioPracticante } from './inicioPracticante';

const PL2D = { id: 'pry-pl2d', codigo: 'PL2D', nombre: 'Plataforma 2D' };

function tarea(id: string, extra: object = {}) {
  return {
    id,
    numero: 1,
    id_legible: `PL2D-${id.slice(-3)}`,
    titulo: `Tarea ${id}`,
    estado: 'EN_PROGRESO',
    fecha_limite: '2026-11-18',
    vencida: false,
    fecha_termino: null,
    id_practicante: 'usr-1',
    responsable: 'Ana',
    es_mia: true,
    requiere_supervision: false,
    etiqueta_pr_visible: null,
    devuelta: false,
    proyecto: PL2D,
    ...extra,
  };
}

const VISTA = {
  vacio: false,
  tarjetas: { en_progreso: 2, devueltas: 1, esperando_supervision: 3, disponibles: 4 },
  en_curso: [
    tarea('tar-002', { devuelta: true }),
    tarea('tar-001', { vencida: true, fecha_limite: '2026-10-09' }),
  ],
  pull_requests_por_atender: [
    tarea('tar-003', { estado: 'ESPERANDO_SUPERVISION', etiqueta_pr_visible: 'PENDIENTE' }),
    tarea('tar-004', { estado: 'TERMINADA', etiqueta_pr_visible: 'CON_CONFLICTOS' }),
    tarea('tar-005', { etiqueta_pr_visible: null }),
  ],
  proximas_reuniones: [
    { proyecto: PL2D, id_proyecto: 'pry-pl2d', dia_reunion: null, hora_reunion: null },
  ],
} as unknown as InicioPracticante;

describe('aInicioPracticante', () => {
  it('un Practicante sin proyectos vigentes es un solo mensaje, sin tarjetas', () => {
    expect(aInicioPracticante({ vacio: true })).toEqual({ vacio: true });
  });

  const vista = aInicioPracticante(VISTA);
  if (vista.vacio) throw new Error('La vista de prueba no es vacía.');

  it('conserva los números de las tarjetas tal como los entrega la consulta', () => {
    expect(vista.tarjetas).toEqual({
      enProgreso: 2,
      devueltas: 1,
      esperandoSupervision: 3,
      disponibles: 4,
    });
  });

  it('conserva el orden de las tareas en curso y presenta la marca, el vencimiento y la fecha con diaVisible', () => {
    expect(vista.enCurso.map((t) => t.id)).toEqual(['tar-002', 'tar-001']);
    expect(vista.enCurso[0]).toMatchObject({
      idLegible: 'PL2D-002',
      devuelta: true,
      vencida: false,
      fechaLimiteTexto: '18 nov 2026',
    });
    expect(vista.enCurso[1]).toMatchObject({ vencida: true, fechaLimiteTexto: '9 oct 2026' });
  });

  it('los enlaces al detalle van al panel del Practicante', () => {
    expect(vista.enCurso[0]!.rutaDetalle).toBe('/practicante/proyectos/tareas/tar-002');
    expect(vista.pullRequests[0]!.rutaDetalle).toBe('/practicante/proyectos/tareas/tar-003');
  });

  it('los Pull Requests por atender traen la etiqueta del PR y el estado de la tarea; no inventa los que no tienen etiqueta', () => {
    expect(vista.pullRequests.map((p) => [p.id, p.estadoPr, p.estado])).toEqual([
      ['tar-003', 'PENDIENTE', 'ESPERANDO_SUPERVISION'],
      ['tar-004', 'CON_CONFLICTOS', 'TERMINADA'],
    ]);
  });

  it('las reuniones enlazan al proyecto del Practicante y dicen «Sin definir» si no hay día', () => {
    expect(vista.reuniones).toHaveLength(1);
    expect(vista.reuniones[0]).toMatchObject({
      rutaProyecto: '/practicante/proyectos/pry-pl2d',
      reunionTexto: 'Sin definir',
      proximaTexto: 'Sin definir',
    });
  });
});

import { describe, expect, it } from 'vitest';
import { aTarjetaDeProyecto, type FilaProyecto } from './proyectos';

function fila(cambios: Partial<FilaProyecto> = {}): FilaProyecto {
  return {
    id: 'pry-1',
    nombre: 'Plataformas 2D',
    codigo: 'PL2D',
    estado: 'ACTIVO',
    supervisor: { id: 'sup-1', nombre: 'Ana' },
    practicantesActivos: 3,
    avance: { terminadas: 12, total: 30, porcentaje: 40, texto: '12 de 30 · 40 %' },
    tareasEsperandoSupervision: 2,
    proximaReunionTexto: '23 nov 2026, 10:00',
    ...cambios,
  };
}

const valorDe = (t: ReturnType<typeof aTarjetaDeProyecto>, etiqueta: string) =>
  t.detalles.find((d) => d.etiqueta === etiqueta);

describe('aTarjetaDeProyecto (§9.1.1)', () => {
  it('lleva nombre, código, estado y la barra de avance', () => {
    const t = aTarjetaDeProyecto(fila());

    expect(t).toMatchObject({
      id: 'pry-1',
      nombre: 'Plataformas 2D',
      codigo: 'PL2D',
      estado: 'ACTIVO',
      avance: 40,
    });
  });

  it('muestra los practicantes activos, las tareas por supervisar y la próxima reunión', () => {
    const t = aTarjetaDeProyecto(fila());

    expect(valorDe(t, 'Practicantes activos')?.valor).toBe('3');
    expect(valorDe(t, 'Esperando tu supervisión')?.valor).toBe('2');
    expect(valorDe(t, 'Próxima reunión')?.valor).toBe('23 nov 2026, 10:00');
  });

  it('las tareas por supervisar se resaltan solo si hay alguna', () => {
    expect(
      valorDe(
        aTarjetaDeProyecto(fila({ tareasEsperandoSupervision: 1 })),
        'Esperando tu supervisión',
      )?.resaltar,
    ).toBe(true);
    expect(
      valorDe(
        aTarjetaDeProyecto(fila({ tareasEsperandoSupervision: 0 })),
        'Esperando tu supervisión',
      )?.resaltar,
    ).toBe(false);
  });

  it('sin practicantes dice «Sin practicantes asignados»', () => {
    const t = aTarjetaDeProyecto(fila({ practicantesActivos: 0 }));

    expect(valorDe(t, 'Practicantes activos')?.valor).toBe('Sin practicantes asignados');
  });

  it('una reunión sin definir se dice así', () => {
    const t = aTarjetaDeProyecto(fila({ proximaReunionTexto: 'Sin definir' }));

    expect(valorDe(t, 'Próxima reunión')?.valor).toBe('Sin definir');
  });

  it('un proyecto sin tareas no dibuja una barra en cero: dice «Sin tareas»', () => {
    const t = aTarjetaDeProyecto(fila({ avance: null }));

    expect(t.avance).toBeUndefined();
    expect(valorDe(t, 'Avance')?.valor).toBe('Sin tareas');
  });

  it('no lleva tareas vencidas ni datos del supervisor: la tarjeta no los tiene', () => {
    const t = aTarjetaDeProyecto(fila());

    expect(t.detalles.map((d) => d.etiqueta).join(' ')).not.toMatch(/vencid|supervisor:/i);
    expect(JSON.stringify(t)).not.toContain('Ana');
  });
});

import { describe, expect, it } from 'vitest';
import type { MiHistorial } from '@/services';
import { aMiHistorial, filtrarMiHistorial, idProyectoValido } from './miHistorial';

const PL2D = { id: 'pry-pl2d', codigo: 'PL2D', nombre: 'Plataforma 2D' };
const TIE = { id: 'pry-tie', codigo: 'TIE', nombre: 'Tienda en línea' };

function tarea(id: string, titulo: string, proyecto: typeof PL2D, extra: object = {}) {
  return {
    id,
    numero: 1,
    id_legible: `${proyecto.codigo}-${id.slice(-3)}`,
    titulo,
    estado: 'TERMINADA',
    fecha_limite: '2026-10-01',
    vencida: false,
    fecha_termino: '2026-10-03T15:00:00.000Z',
    id_practicante: 'usr-1',
    responsable: 'Ana',
    es_mia: true,
    requiere_supervision: false,
    etiqueta_pr_visible: 'APROBADO',
    devuelta: false,
    proyecto,
    veces_devuelta: 0,
    ...extra,
  };
}

const HISTORIAL = {
  tareas: [
    tarea('tar-003', 'Pantalla de acceso', PL2D, { veces_devuelta: 2 }),
    tarea('tar-002', 'Catálogo de productos', TIE, { etiqueta_pr_visible: null }),
    tarea('tar-001', 'Menú principal', PL2D, { fecha_termino: null }),
  ],
  proyectos: [PL2D, TIE],
} as unknown as MiHistorial;

describe('aMiHistorial', () => {
  const vista = aMiHistorial(HISTORIAL);

  it('conserva el orden de la consulta y sus proyectos', () => {
    expect(vista.filas.map((f) => f.id)).toEqual(['tar-003', 'tar-002', 'tar-001']);
    expect(vista.proyectos).toEqual([PL2D, TIE]);
  });

  it('presenta el ID legible, el proyecto, las veces devuelta y la etiqueta del PR tal como llegan', () => {
    const [primera, segunda] = vista.filas;
    expect(primera).toMatchObject({
      idLegible: 'PL2D-003',
      titulo: 'Pantalla de acceso',
      proyecto: PL2D,
      vecesDevuelta: 2,
      estadoPr: 'APROBADO',
    });
    expect(segunda!.estadoPr).toBeNull();
  });

  it('da la fecha de término en el formato del resto de las pantallas, o «—» si no hay', () => {
    expect(vista.filas[0]!.fechaTerminoTexto).toBe('3 oct 2026');
    expect(vista.filas[2]!.fechaTerminoTexto).toBe('—');
  });
});

describe('idProyectoValido', () => {
  const mios = [{ id: 'pry-pl2d' }, { id: 'pry-tie' }];

  it('acepta un proyecto suyo, vigente o anterior', () => {
    expect(idProyectoValido('pry-pl2d', mios)).toBe('pry-pl2d');
    expect(idProyectoValido('pry-tie', mios)).toBe('pry-tie');
  });

  it('ignora lo que no es un proyecto suyo: ajeno, inexistente, vacío o sin parámetro', () => {
    expect(idProyectoValido('pry-inv', mios)).toBeNull();
    expect(idProyectoValido('no-existe', mios)).toBeNull();
    expect(idProyectoValido('', mios)).toBeNull();
    expect(idProyectoValido(null, mios)).toBeNull();
    expect(idProyectoValido('pry-pl2d', [])).toBeNull();
  });
});

describe('filtrarMiHistorial', () => {
  const { filas } = aMiHistorial(HISTORIAL);

  it('sin filtros devuelve todo, en el mismo orden', () => {
    expect(filtrarMiHistorial(filas, { idProyecto: null, busqueda: '' }).map((f) => f.id)).toEqual([
      'tar-003',
      'tar-002',
      'tar-001',
    ]);
  });

  it('filtra por proyecto', () => {
    expect(
      filtrarMiHistorial(filas, { idProyecto: 'pry-tie', busqueda: '' }).map((f) => f.id),
    ).toEqual(['tar-002']);
  });

  it('busca por título o por ID, sin distinguir mayúsculas ni tildes', () => {
    expect(
      filtrarMiHistorial(filas, { idProyecto: null, busqueda: 'catalogo' }).map((f) => f.id),
    ).toEqual(['tar-002']);
    expect(
      filtrarMiHistorial(filas, { idProyecto: null, busqueda: ' pl2d-001 ' }).map((f) => f.id),
    ).toEqual(['tar-001']);
  });

  it('combina el proyecto y la búsqueda', () => {
    expect(
      filtrarMiHistorial(filas, { idProyecto: 'pry-pl2d', busqueda: 'catalogo' }),
    ).toHaveLength(0);
    expect(
      filtrarMiHistorial(filas, { idProyecto: 'pry-pl2d', busqueda: 'menu' }).map((f) => f.id),
    ).toEqual(['tar-001']);
  });
});

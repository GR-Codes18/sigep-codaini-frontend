import { describe, expect, it } from 'vitest';
import type { FilaTarea } from '@/app/adaptadores';
import {
  FILTROS_INICIALES,
  filtrarTareas,
  hayFiltros,
  opcionesDeProyecto,
  opcionesDeResponsable,
  type FiltrosTareas,
} from './filtros';

const PL2D = { id: 'pry-pl2d', codigo: 'PL2D', nombre: 'Plataformas 2D' };
const RSV = { id: 'pry-rsv', codigo: 'RSV', nombre: 'Reservas' };

function fila(cambios: Partial<FilaTarea> & { id: string }): FilaTarea {
  return {
    idLegible: `PL2D-${cambios.id}`,
    titulo: `Tarea ${cambios.id}`,
    proyecto: PL2D,
    idResponsable: null,
    responsable: null,
    estado: 'DISPONIBLE',
    requiereSupervision: false,
    estadoPr: null,
    fechaLimite: '2026-12-01',
    fechaLimiteTexto: '01/12/2026',
    vencida: false,
    diasEsperando: null,
    ...cambios,
  };
}

const FILAS: FilaTarea[] = [
  fila({ id: '001', titulo: 'Pantalla de acceso', estado: 'DISPONIBLE' }),
  fila({
    id: '002',
    titulo: 'Árbol de decisiones',
    estado: 'EN_PROGRESO',
    idResponsable: 'u1',
    responsable: 'Ana Quispe',
    vencida: true,
  }),
  fila({
    id: '003',
    titulo: 'Reservas por correo',
    proyecto: RSV,
    estado: 'ESPERANDO_SUPERVISION',
    idResponsable: 'u2',
    responsable: 'Beto Ríos',
    requiereSupervision: true,
    estadoPr: 'CREADO',
  }),
  fila({
    id: '004',
    titulo: 'Pruebas finales',
    proyecto: RSV,
    estado: 'TERMINADA',
    idResponsable: 'u1',
    responsable: 'Ana Quispe',
    estadoPr: 'FUSIONADO',
  }),
];

const con = (cambios: Partial<FiltrosTareas>): FiltrosTareas => ({
  ...FILTROS_INICIALES,
  ...cambios,
});
const idsDe = (filas: FilaTarea[]) => filas.map((f) => f.id);

describe('filtrarTareas', () => {
  it('abre en «Todas» y sin filtros muestra todo', () => {
    expect(FILTROS_INICIALES.pestana).toBe('TODAS');
    expect(idsDe(filtrarTareas(FILAS, FILTROS_INICIALES))).toEqual(['001', '002', '003', '004']);
  });

  it('cada pestaña muestra las tareas de su estado', () => {
    expect(idsDe(filtrarTareas(FILAS, con({ pestana: 'DISPONIBLE' })))).toEqual(['001']);
    expect(idsDe(filtrarTareas(FILAS, con({ pestana: 'EN_PROGRESO' })))).toEqual(['002']);
    expect(idsDe(filtrarTareas(FILAS, con({ pestana: 'ESPERANDO_SUPERVISION' })))).toEqual(['003']);
    expect(idsDe(filtrarTareas(FILAS, con({ pestana: 'TERMINADA' })))).toEqual(['004']);
  });

  it('filtra por proyecto y por responsable', () => {
    expect(idsDe(filtrarTareas(FILAS, con({ idProyecto: RSV.id })))).toEqual(['003', '004']);
    expect(idsDe(filtrarTareas(FILAS, con({ idResponsable: 'u1' })))).toEqual(['002', '004']);
  });

  it('«Vencidas» deja solo las que la consulta marcó como vencidas', () => {
    expect(idsDe(filtrarTareas(FILAS, con({ soloVencidas: true })))).toEqual(['002']);
  });

  it('«Sin asignar» deja las que no tienen responsable', () => {
    expect(idsDe(filtrarTareas(FILAS, con({ soloSinAsignar: true })))).toEqual(['001']);
  });

  it('«Requiere supervisión» deja las que la requieren', () => {
    expect(idsDe(filtrarTareas(FILAS, con({ soloRequierenSupervision: true })))).toEqual(['003']);
  });

  it('filtra por la etiqueta del Pull Request; las que no la muestran no coinciden', () => {
    expect(idsDe(filtrarTareas(FILAS, con({ estadoPr: 'CREADO' })))).toEqual(['003']);
    expect(idsDe(filtrarTareas(FILAS, con({ estadoPr: 'FUSIONADO' })))).toEqual(['004']);
    expect(filtrarTareas(FILAS, con({ estadoPr: 'CERRADO' }))).toEqual([]);
  });

  it('busca por título o por ID, sin distinguir mayúsculas ni tildes', () => {
    expect(idsDe(filtrarTareas(FILAS, con({ busqueda: 'arbol' })))).toEqual(['002']);
    expect(idsDe(filtrarTareas(FILAS, con({ busqueda: 'pl2d-003' })))).toEqual(['003']);
    expect(idsDe(filtrarTareas(FILAS, con({ busqueda: 'RESERVAS' })))).toEqual(['003']);
    expect(filtrarTareas(FILAS, con({ busqueda: 'zzz' }))).toEqual([]);
  });

  it('una búsqueda de solo espacios no filtra', () => {
    expect(filtrarTareas(FILAS, con({ busqueda: '   ' }))).toHaveLength(4);
  });

  it('combina pestaña, proyecto, responsable y búsqueda, y no modifica la lista recibida', () => {
    const copia = [...FILAS];
    const resultado = filtrarTareas(
      FILAS,
      con({ pestana: 'TERMINADA', idProyecto: RSV.id, idResponsable: 'u1', busqueda: 'finales' }),
    );
    expect(idsDe(resultado)).toEqual(['004']);
    expect(FILAS).toEqual(copia);
  });
});

describe('opciones de los filtros', () => {
  it('los proyectos salen sin repetir y por nombre', () => {
    expect(opcionesDeProyecto(FILAS).map((p) => p.id)).toEqual([PL2D.id, RSV.id]);
  });

  it('los responsables salen sin repetir y por nombre, sin contar «Sin asignar»', () => {
    expect(opcionesDeResponsable(FILAS)).toEqual([
      { id: 'u1', nombre: 'Ana Quispe' },
      { id: 'u2', nombre: 'Beto Ríos' },
    ]);
  });
});

describe('hayFiltros', () => {
  it('no cuenta la pestaña, solo los filtros y la búsqueda', () => {
    expect(hayFiltros(FILTROS_INICIALES)).toBe(false);
    expect(hayFiltros(con({ pestana: 'TERMINADA' }))).toBe(false);
    expect(hayFiltros(con({ idProyecto: 'x' }))).toBe(true);
    expect(hayFiltros(con({ idResponsable: 'x' }))).toBe(true);
    expect(hayFiltros(con({ soloVencidas: true }))).toBe(true);
    expect(hayFiltros(con({ soloSinAsignar: true }))).toBe(true);
    expect(hayFiltros(con({ soloRequierenSupervision: true }))).toBe(true);
    expect(hayFiltros(con({ estadoPr: 'CREADO' }))).toBe(true);
    expect(hayFiltros(con({ busqueda: 'a' }))).toBe(true);
    expect(hayFiltros(con({ busqueda: '  ' }))).toBe(false);
  });
});

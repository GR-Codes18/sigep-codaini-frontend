import { describe, expect, it } from 'vitest';
import {
  ACCIONES_POR_CATEGORIA,
  type CategoriaEvento,
  type ElementoAfectado,
  type EventoHistorial,
  type TipoAccionHistorial,
} from '@/domain';
import { crearSemilla } from '@/data/semilla';
import { etiquetaPostulante, etiquetaProyecto, etiquetaTarea, etiquetaUsuario } from './etiquetas';
import {
  AUTOR_SISTEMA,
  agregarEventos,
  autorDe,
  cambio,
  crearEvento,
  diferencias,
} from './historial';
import { crearMarca } from './marca';

const marca = crearMarca(new Date('2026-11-17T18:30:00.000Z'));
const generarId = (prefijo: string) => `${prefijo}-x`;
const tarea: ElementoAfectado = { tipo: 'TAREA', id: 'tar-1', etiqueta: 'PL2D-001 · Menú' };

/** Las acciones cuyo evento debe llevar proyecto (contrato del paso 1 de la Fase 1). */
const CATEGORIAS_CON_PROYECTO: CategoriaEvento[] = ['TAREAS', 'PULL_REQUEST', 'PROYECTOS'];
const ACCIONES_SUELTAS_CON_PROYECTO: TipoAccionHistorial[] = [
  'PRACTICANTE_ASIGNADO_A_PROYECTO',
  'PRACTICANTE_QUITADO_DE_PROYECTO',
];
const conProyecto: TipoAccionHistorial[] = [
  ...CATEGORIAS_CON_PROYECTO.flatMap((c) => [...ACCIONES_POR_CATEGORIA[c]]),
  ...ACCIONES_SUELTAS_CON_PROYECTO,
];
const sinProyecto = (Object.values(ACCIONES_POR_CATEGORIA).flat() as TipoAccionHistorial[]).filter(
  (a) => !conProyecto.includes(a),
);

describe('crearEvento', () => {
  it('arma el evento con la fecha de la marca, el ID del generador y valores por defecto', () => {
    const evento = crearEvento(
      {
        autor: autorDe('usr-1'),
        tipo_accion: 'TAREA_TOMADA',
        elemento: tarea,
        id_proyecto: 'pry-1',
      },
      marca,
      generarId,
    );
    expect(evento).toEqual({
      id: 'evt-x',
      fecha: '2026-11-17T18:30:00.000Z',
      autor: { tipo: 'USUARIO', id_usuario: 'usr-1' },
      tipo_accion: 'TAREA_TOMADA',
      elemento: tarea,
      id_proyecto: 'pry-1',
      cambios: [],
      nota: null,
    });
  });

  it('la fecha sale de la marca recibida, no del reloj', () => {
    const otra = crearMarca(new Date('2030-01-02T03:04:05.000Z'));
    const evento = crearEvento(
      {
        autor: AUTOR_SISTEMA,
        tipo_accion: 'POSTULACION_EVALUADA',
        elemento: { ...tarea, tipo: 'POSTULANTE' },
      },
      otra,
      generarId,
    );
    expect(evento.fecha).toBe('2030-01-02T03:04:05.000Z');
  });

  it('el autor puede ser una persona o el Sistema', () => {
    const sistema = crearEvento(
      {
        autor: AUTOR_SISTEMA,
        tipo_accion: 'POSTULACION_RECIBIDA',
        elemento: { ...tarea, tipo: 'POSTULANTE' },
      },
      marca,
      generarId,
    );
    expect(sistema.autor).toEqual({ tipo: 'SISTEMA' });
    expect(autorDe('u-9')).toEqual({ tipo: 'USUARIO', id_usuario: 'u-9' });
  });

  it('conserva la nota y los cambios (con valor anterior y nuevo)', () => {
    const evento = crearEvento(
      {
        autor: autorDe('sup'),
        tipo_accion: 'TAREA_DEVUELTA',
        elemento: tarea,
        id_proyecto: 'pry-1',
        cambios: [cambio('estado', 'ESPERANDO_SUPERVISION', 'EN_PROGRESO')],
        nota: 'Falta la colisión.',
      },
      marca,
      generarId,
    );
    expect(evento.nota).toBe('Falta la colisión.');
    expect(evento.cambios).toEqual([
      { campo: 'estado', valor_anterior: 'ESPERANDO_SUPERVISION', valor_nuevo: 'EN_PROGRESO' },
    ]);
  });

  it('no comparte el arreglo de cambios con la entrada', () => {
    const cambios = [cambio('estado', 'A', 'B')];
    const evento = crearEvento(
      {
        autor: autorDe('u'),
        tipo_accion: 'TAREA_EDITADA',
        elemento: tarea,
        id_proyecto: 'p',
        cambios,
      },
      marca,
      generarId,
    );
    cambios.push(cambio('otro', 'x', 'y'));
    expect(evento.cambios).toHaveLength(1);
  });

  it.each(conProyecto)('id_proyecto es obligatorio en %s', (accion) => {
    const entrada = { autor: autorDe('u'), tipo_accion: accion, elemento: tarea };
    expect(() => crearEvento(entrada, marca, generarId)).toThrow(/proyecto/i);
    expect(() => crearEvento({ ...entrada, id_proyecto: null }, marca, generarId)).toThrow(
      /proyecto/i,
    );
    expect(crearEvento({ ...entrada, id_proyecto: 'pry-1' }, marca, generarId).id_proyecto).toBe(
      'pry-1',
    );
  });

  it.each(sinProyecto)('id_proyecto es opcional en %s', (accion) => {
    const evento = crearEvento(
      { autor: autorDe('u'), tipo_accion: accion, elemento: tarea },
      marca,
      generarId,
    );
    expect(evento.id_proyecto).toBeNull();
  });

  it('nunca registra una contraseña', () => {
    for (const campo of ['contrasena', 'contraseña', 'Contrasena_nueva', 'password']) {
      expect(
        () =>
          crearEvento(
            {
              autor: autorDe('u'),
              tipo_accion: 'CUENTA_CONTRASENA_CAMBIADA',
              elemento: { tipo: 'USUARIO', id: 'u', etiqueta: 'Ana' },
              cambios: [cambio(campo, 'vieja', 'nueva')],
            },
            marca,
            generarId,
          ),
        campo,
      ).toThrow(/contraseñas/);
    }
  });

  it('el evento de cambio de contraseña es válido si no lleva la contraseña', () => {
    const evento = crearEvento(
      {
        autor: autorDe('u'),
        tipo_accion: 'CUENTA_CONTRASENA_CAMBIADA',
        elemento: { tipo: 'USUARIO', id: 'u', etiqueta: 'Ana' },
      },
      marca,
      generarId,
    );
    expect(evento.cambios).toEqual([]);
  });
});

describe('agregarEventos (solo agrega)', () => {
  const evento = (id: string): EventoHistorial => ({
    id,
    fecha: '2026-11-17T10:00:00.000Z',
    autor: AUTOR_SISTEMA,
    tipo_accion: 'POSTULACION_RECIBIDA',
    elemento: { tipo: 'POSTULANTE', id: 'pos-1', etiqueta: 'Ana' },
    id_proyecto: null,
    cambios: [],
    nota: null,
  });

  it('suma al final, conserva las referencias y el orden, y no cambia la lista original', () => {
    const previo = [evento('e1'), evento('e2')];
    const copia = [...previo];
    const resultado = agregarEventos(previo, evento('e3'), evento('e4'));
    expect(resultado.map((e) => e.id)).toEqual(['e1', 'e2', 'e3', 'e4']);
    expect(resultado[0]).toBe(previo[0]);
    expect(resultado[1]).toBe(previo[1]);
    expect(previo).toEqual(copia);
    expect(previo).toHaveLength(2);
    expect(resultado).not.toBe(previo);
  });

  it('sin eventos nuevos devuelve una copia igual', () => {
    const previo = [evento('e1')];
    expect(agregarEventos(previo)).toEqual(previo);
  });
});

describe('cambio y diferencias', () => {
  it('cambio convierte los valores a texto y deja null como null', () => {
    expect(cambio('limite', '2026-11-20', '2026-11-25')).toEqual({
      campo: 'limite',
      valor_anterior: '2026-11-20',
      valor_nuevo: '2026-11-25',
    });
    expect(cambio('responsable', null, 'Ana')).toEqual({
      campo: 'responsable',
      valor_anterior: null,
      valor_nuevo: 'Ana',
    });
    expect(cambio('numero', 3, 4)).toMatchObject({ valor_anterior: '3', valor_nuevo: '4' });
    expect(cambio('requiere_pr', true, false)).toMatchObject({
      valor_anterior: 'Sí',
      valor_nuevo: 'No',
    });
    expect(cambio('x', undefined, 'a')).toMatchObject({ valor_anterior: null });
  });

  const antes = { titulo: 'A', limite: '2026-11-20', requiere_pr: false, contrasena: 'vieja' };
  const despues = { titulo: 'B', limite: '2026-11-20', requiere_pr: true, contrasena: 'nueva' };

  it('diferencias devuelve solo lo que cambió, en el orden pedido', () => {
    expect(diferencias(antes, despues, ['requiere_pr', 'limite', 'titulo'])).toEqual([
      { campo: 'requiere_pr', valor_anterior: 'No', valor_nuevo: 'Sí' },
      { campo: 'titulo', valor_anterior: 'A', valor_nuevo: 'B' },
    ]);
  });

  it('sin cambios devuelve una lista vacía', () => {
    expect(diferencias(antes, { ...antes }, ['titulo', 'limite', 'requiere_pr'])).toEqual([]);
  });

  it('omite siempre el campo de contraseña aunque cambie', () => {
    expect(diferencias(antes, despues, ['contrasena'])).toEqual([]);
    const campos = diferencias(antes, despues, ['titulo', 'contrasena']).map((c) => c.campo);
    expect(campos).toEqual(['titulo']);
  });
});

describe('etiquetas (mismo formato que la semilla)', () => {
  it('etiquetaTarea rellena a 3 dígitos mínimo y no tiene tope', () => {
    expect(etiquetaTarea({ codigo: 'PL2D' }, { numero: 18, titulo: 'Menú' })).toBe(
      'PL2D-018 · Menú',
    );
    expect(etiquetaTarea({ codigo: 'PL2D' }, { numero: 1, titulo: 'X' })).toBe('PL2D-001 · X');
    expect(etiquetaTarea({ codigo: 'PL2D' }, { numero: 1000, titulo: 'X' })).toBe('PL2D-1000 · X');
  });

  it('etiquetaTarea lanza si el número no es válido (nunca produce un ID mal formado)', () => {
    expect(() => etiquetaTarea({ codigo: 'PL2D' }, { numero: 0, titulo: 'X' })).toThrow();
  });

  it('las demás etiquetas', () => {
    expect(etiquetaProyecto({ codigo: 'PL2D', nombre: 'Plataforma' })).toBe('PL2D · Plataforma');
    expect(etiquetaUsuario({ nombre: 'Ana' })).toBe('Ana');
    expect(etiquetaPostulante({ nombre: 'Luis' })).toBe('Luis');
  });

  it('coinciden con las etiquetas de los eventos de la semilla', () => {
    const datos = crearSemilla(new Date('2026-11-17T18:30:00.000Z'));
    for (const e of datos.historial.filter((x) => x.elemento.tipo === 'TAREA')) {
      const t = datos.tareas.find((x) => x.id === e.elemento.id);
      if (t === undefined) continue; // la eliminada ya no existe
      const proyecto = datos.proyectos.find((p) => p.id === t.id_proyecto)!;
      expect(etiquetaTarea(proyecto, t), e.id).toBe(e.elemento.etiqueta);
    }
    for (const e of datos.historial.filter((x) => x.tipo_accion === 'PROYECTO_CREADO')) {
      const p = datos.proyectos.find((x) => x.id === e.elemento.id)!;
      expect(etiquetaProyecto(p)).toBe(e.elemento.etiqueta);
    }
  });
});

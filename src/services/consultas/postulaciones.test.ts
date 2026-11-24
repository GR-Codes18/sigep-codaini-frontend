import { describe, expect, it } from 'vitest';
import type { Id, PostulacionEvaluacion } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { codigo, desactivar, ids, valor } from '../pruebas/consultas';
import type { Resultado } from '../resultado';
import {
  listarCatalogoEvaluacion,
  listarPostulaciones,
  obtenerConfiguracion,
  obtenerPostulacion,
} from './postulaciones';

// Semilla en AHORA_DE_PRUEBA (martes 17 de noviembre de 2026).
const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const PRACTICANTE = 'demo-practicante';
const APROBADA = 'pos-17'; // 100 puntos; de ahí nació usr-pra-17
const PENDIENTE = 'pos-25'; // 100 puntos, pendiente

type Llamada = (p: PruebaPreparada, idActor: Id) => Promise<Resultado<unknown>>;

const CONSULTAS: ReadonlyArray<{ nombre: string; llamar: Llamada }> = [
  {
    nombre: 'listarPostulaciones',
    llamar: (p, idActor) => listarPostulaciones({ idActor }, p.entorno),
  },
  {
    nombre: 'obtenerPostulacion',
    llamar: (p, idActor) => obtenerPostulacion({ idActor, idPostulante: APROBADA }, p.entorno),
  },
  {
    nombre: 'listarCatalogoEvaluacion',
    llamar: (p, idActor) => listarCatalogoEvaluacion({ idActor }, p.entorno),
  },
  {
    nombre: 'obtenerConfiguracion',
    llamar: (p, idActor) => obtenerConfiguracion({ idActor }, p.entorno),
  },
];

describe.each(CONSULTAS)('$nombre · reglas comunes', ({ llamar }) => {
  it('el Administrador tiene éxito y no escribe nada', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    expect((await llamar(prueba, ADMIN)).ok).toBe(true);
    comprobar();
  });

  it('un actor inexistente da NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await llamar(prueba, 'no-existe'))).toBe('NO_ENCONTRADO');
  });

  it('un actor INACTIVO da USUARIO_INACTIVO, sea cual sea su rol', async () => {
    for (const idActor of [ADMIN, SUPERVISOR, PRACTICANTE]) {
      const prueba = prepararPrueba();
      desactivar(prueba, idActor);

      expect(codigo(await llamar(prueba, idActor)), idActor).toBe('USUARIO_INACTIVO');
    }
  });

  it('un identificador vacío da DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await llamar(prueba, ''))).toBe('DATOS_INVALIDOS');
  });

  it('el Supervisor y el Practicante reciben ROL_NO_PERMITIDO', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    for (const idActor of [SUPERVISOR, PRACTICANTE]) {
      expect(codigo(await llamar(prueba, idActor)), idActor).toBe('ROL_NO_PERMITIDO');
    }
    comprobar();
  });
});

// ── listarPostulaciones ──────────────────────────────────────────────────────────────────────

describe('listarPostulaciones', () => {
  const listar = (p: PruebaPreparada) => listarPostulaciones({ idActor: ADMIN }, p.entorno);

  it('trae las 42 postulaciones y los contadores de las pestañas', async () => {
    const prueba = prepararPrueba();

    const r = valor(await listar(prueba));

    expect(r.postulaciones).toHaveLength(42);
    expect(r.contadores).toEqual({
      TODAS: 42,
      PENDIENTES: 10,
      REQUIEREN_REVISION: 5,
      APROBADAS: 24,
      RECHAZADAS: 8,
    });
  });

  it('va de mayor a menor puntaje (el ranking) y, a igual puntaje, la más antigua primero', async () => {
    const prueba = prepararPrueba();

    const { postulaciones } = valor(await listar(prueba));

    for (let i = 1; i < postulaciones.length; i++) {
      const antes = postulaciones[i - 1]!;
      const ahora = postulaciones[i]!;
      expect(antes.puntaje! >= ahora.puntaje!, ahora.id).toBe(true);
      if (antes.puntaje === ahora.puntaje) {
        expect(antes.fecha_postulacion <= ahora.fecha_postulacion, ahora.id).toBe(true);
      }
    }
  });

  it('cada fila trae área, especialidad, puntaje y la marca de revisión manual', async () => {
    const prueba = prepararPrueba();

    const fila = valor(await listar(prueba)).postulaciones.find((p) => p.id === PENDIENTE)!;

    expect(fila).toMatchObject({
      estado: 'PENDIENTE',
      puntaje: 100,
      requiere_revision_manual: false,
      area: { id: expect.any(String), nombre: expect.any(String) },
      especialidad: { id: expect.any(String), nombre: expect.any(String) },
    });
    expect(Object.keys(fila).sort()).toEqual([
      'area',
      'correo',
      'especialidad',
      'estado',
      'fecha_postulacion',
      'id',
      'nombre',
      'puntaje',
      'requiere_revision_manual',
    ]);
  });

  it('«Requieren revisión» cuenta solo las pendientes con la marca', async () => {
    const prueba = prepararPrueba();
    const marcar = (id: Id) =>
      prueba.modificar((d) => ({
        evaluaciones: d.evaluaciones.map((e) =>
          e.id_postulante === id ? { ...e, requiere_revision_manual: true } : e,
        ),
      }));

    // Una aprobada con la marca no suma; una pendiente sí.
    marcar(APROBADA);
    expect(valor(await listar(prueba)).contadores.REQUIEREN_REVISION).toBe(5);
    marcar(PENDIENTE);
    expect(valor(await listar(prueba)).contadores.REQUIEREN_REVISION).toBe(6);
  });

  it('una postulación sin evaluación sale sin puntaje, sin marca y al final', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      evaluaciones: d.evaluaciones.filter((e) => e.id_postulante !== PENDIENTE),
    }));

    const { postulaciones } = valor(await listar(prueba));
    const fila = postulaciones.find((p) => p.id === PENDIENTE)!;

    expect(fila).toMatchObject({ puntaje: null, requiere_revision_manual: false });
    expect(postulaciones[postulaciones.length - 1]!.id).toBe(PENDIENTE);
  });

  it('con dos evaluaciones, vale la más reciente', async () => {
    const prueba = prepararPrueba();
    const nueva: PostulacionEvaluacion = {
      ...prueba.datos().evaluaciones.find((e) => e.id_postulante === PENDIENTE)!,
      id: 'eva-nueva',
      puntaje_total: 12,
      fecha_evaluacion: '2026-12-01T00:00:00.000Z',
    };
    prueba.modificar((d) => ({ evaluaciones: [...d.evaluaciones, nueva] }));

    expect(valor(await listar(prueba)).postulaciones.find((p) => p.id === PENDIENTE)!.puntaje).toBe(
      12,
    );
  });

  it('no trae el CV ni el celular del postulante', async () => {
    const prueba = prepararPrueba();

    const texto = JSON.stringify(valor(await listar(prueba)));

    for (const p of prueba.datos().postulantes.slice(0, 5)) {
      expect(texto).not.toContain(p.cv.url);
      expect(texto).not.toContain(p.celular);
    }
  });
});

// ── obtenerPostulacion ───────────────────────────────────────────────────────────────────────

describe('obtenerPostulacion', () => {
  const obtener = (p: PruebaPreparada, idPostulante: Id) =>
    obtenerPostulacion({ idActor: ADMIN, idPostulante }, p.entorno);

  it('trae los datos del postulante, su CV y su estado', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos().postulantes.find((p) => p.id === APROBADA)!;

    const r = valor(await obtener(prueba, APROBADA));

    expect(r.estado).toBe('APROBADA');
    expect(r.postulante).toMatchObject({
      id: APROBADA,
      nombre: datos.nombre,
      correo: datos.correo,
      celular: datos.celular,
      cv: datos.cv,
      area: { id: datos.id_area_tecnica },
      especialidad: { id: datos.id_especialidad },
    });
  });

  it('la evaluación viene separada en los bloques de área y de especialidad', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, APROBADA));
    const ev = r.evaluacion!;

    expect(ev).toMatchObject({ puntaje_total: 100, requiere_revision_manual: false });
    expect(ev.justificacion.length).toBeGreaterThan(0);
    expect(ev.bloques.AREA).toHaveLength(4);
    expect(ev.bloques.ESPECIALIDAD).toHaveLength(4);
    for (const bloque of [ev.bloques.AREA, ev.bloques.ESPECIALIDAD]) {
      expect(bloque.reduce((suma, c) => suma + c.peso, 0)).toBe(100);
      for (const c of bloque) {
        expect(Object.keys(c).sort()).toEqual([
          'cumplido',
          'nombre',
          'observacion',
          'peso',
          'puntaje_obtenido',
        ]);
      }
    }
  });

  it('la evaluación trae la proporción vigente de la nota, que es la de Configuración', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, APROBADA));

    expect(r.evaluacion!.proporcion).toEqual({ area: 40, especialidad: 60 });
  });

  it('cada bloque trae solo sus criterios y su evaluación', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();
    const evaluacion = datos.evaluaciones.find((e) => e.id_postulante === APROBADA)!;

    const ev = valor(await obtener(prueba, APROBADA)).evaluacion!;
    const nombres = (bloque: 'AREA' | 'ESPECIALIDAD') =>
      datos.detalles_evaluacion
        .filter((d) => d.id_evaluacion === evaluacion.id && d.bloque === bloque)
        .map((d) => d.nombre_criterio);

    expect(ev.bloques.AREA.map((c) => c.nombre)).toEqual(nombres('AREA'));
    expect(ev.bloques.ESPECIALIDAD.map((c) => c.nombre)).toEqual(nombres('ESPECIALIDAD'));
  });

  it('cambiar el catálogo después no cambia el desglose con el que se evaluó', async () => {
    const prueba = prepararPrueba();
    const antes = valor(await obtener(prueba, APROBADA)).evaluacion!.bloques;
    prueba.modificar((d) => ({
      criterios: d.criterios.map((c) => ({ ...c, nombre: 'Nombre nuevo', peso: 1, activo: false })),
    }));

    expect(valor(await obtener(prueba, APROBADA)).evaluacion!.bloques).toEqual(antes);
  });

  it('una postulación sin evaluación trae `evaluacion: null`', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      evaluaciones: d.evaluaciones.filter((e) => e.id_postulante !== PENDIENTE),
    }));

    expect(valor(await obtener(prueba, PENDIENTE)).evaluacion).toBeNull();
  });

  it('la línea de tiempo trae solo los eventos de esa postulación, del más reciente al más antiguo', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, APROBADA));
    const fechas = r.eventos.map((e) => Date.parse(e.evento.fecha));

    expect(r.eventos.length).toBeGreaterThan(0);
    expect(r.eventos.every((e) => e.evento.elemento.id === APROBADA)).toBe(true);
    expect([...fechas].sort((a, b) => b - a)).toEqual(fechas);
  });

  it('una aprobada trae la cuenta de practicante que nació de ella; una pendiente, no', async () => {
    const prueba = prepararPrueba();

    expect(valor(await obtener(prueba, APROBADA)).practicante).toEqual({
      id: 'usr-pra-17',
      nombre: 'Kevin Huertas Lara',
    });
    expect(valor(await obtener(prueba, PENDIENTE)).practicante).toBeNull();
  });

  describe('decisiones disponibles', () => {
    it('una pendiente se puede aprobar o rechazar', async () => {
      const prueba = prepararPrueba();

      expect(valor(await obtener(prueba, PENDIENTE)).decisiones).toEqual(['APROBAR', 'RECHAZAR']);
    });

    it('una rechazada solo se puede reconsiderar', async () => {
      const prueba = prepararPrueba();
      const rechazada = prueba.datos().postulantes.find((p) => p.estado === 'RECHAZADA')!;

      expect(valor(await obtener(prueba, rechazada.id)).decisiones).toEqual(['RECONSIDERAR']);
    });

    it('una aprobada no tiene decisiones: no se revierte aquí', async () => {
      const prueba = prepararPrueba();

      expect(valor(await obtener(prueba, APROBADA)).decisiones).toEqual([]);
    });

    it('siguen al estado: al pasar una pendiente a rechazada cambian', async () => {
      const prueba = prepararPrueba();
      prueba.modificar((d) => ({
        postulantes: d.postulantes.map((p) =>
          p.id === PENDIENTE ? { ...p, estado: 'RECHAZADA' as const } : p,
        ),
      }));

      expect(valor(await obtener(prueba, PENDIENTE)).decisiones).toEqual(['RECONSIDERAR']);
    });

    it('no dependen de que tenga evaluación: se decide siempre, con o sin ella', async () => {
      const prueba = prepararPrueba();
      prueba.modificar((d) => ({
        evaluaciones: d.evaluaciones.filter((e) => e.id_postulante !== PENDIENTE),
      }));

      expect(valor(await obtener(prueba, PENDIENTE)).decisiones).toEqual(['APROBAR', 'RECHAZAR']);
    });
  });

  it('una postulación inexistente da NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await obtener(prueba, 'no-existe'))).toBe('NO_ENCONTRADO');
  });
});

// ── listarCatalogoEvaluacion ─────────────────────────────────────────────────────────────────

describe('listarCatalogoEvaluacion', () => {
  const listar = (p: PruebaPreparada) => listarCatalogoEvaluacion({ idActor: ADMIN }, p.entorno);

  it('trae las 4 áreas con sus 9 especialidades, agrupadas por área', async () => {
    const prueba = prepararPrueba();

    const { areas } = valor(await listar(prueba));

    expect(ids(areas)).toEqual(['area-sw', 'area-vj', 'area-ux', 'area-da']);
    expect(areas.map((a) => a.especialidades.length)).toEqual([3, 2, 2, 2]);
    expect(ids(areas[0]!.especialidades)).toEqual(['esp-sw-front', 'esp-sw-back', 'esp-sw-movil']);
  });

  it('cada bloque suma 100 y es válido con los criterios de la semilla', async () => {
    const prueba = prepararPrueba();

    const { areas } = valor(await listar(prueba));

    for (const area of areas) {
      expect(area.bloque).toMatchObject({ suma_actual: 100, valido: true, codigo_invalido: null });
      expect(area.bloque.criterios.every((c) => c.id_especialidad === null)).toBe(true);
      for (const esp of area.especialidades) {
        expect(esp.bloque).toMatchObject({ suma_actual: 100, valido: true });
        expect(esp.bloque.criterios.every((c) => c.id_especialidad === esp.id)).toBe(true);
      }
    }
  });

  it('desactivar un criterio baja la «suma actual» y el bloque deja de ser válido', async () => {
    const prueba = prepararPrueba();
    const criterio = prueba
      .datos()
      .criterios.find((c) => c.id_especialidad === 'esp-sw-front' && c.activo)!;
    prueba.modificar((d) => ({
      criterios: d.criterios.map((c) => (c.id === criterio.id ? { ...c, activo: false } : c)),
    }));

    const esp = valor(await listar(prueba)).areas[0]!.especialidades[0]!;

    expect(esp.bloque).toMatchObject({
      suma_actual: 100 - criterio.peso,
      valido: false,
      codigo_invalido: 'PESOS_NO_SUMAN_100',
      mensaje_invalido: expect.any(String),
    });
    // El criterio desactivado no se borra: sigue en la lista.
    expect(esp.bloque.criterios.some((c) => c.id === criterio.id && !c.activo)).toBe(true);
  });

  it('un bloque sin criterios activos suma 0 y es BLOQUE_SIN_CRITERIOS', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      criterios: d.criterios.map((c) =>
        c.id_especialidad === 'esp-sw-back' ? { ...c, activo: false } : c,
      ),
    }));

    const esp = valor(await listar(prueba)).areas[0]!.especialidades[1]!;

    expect(esp.bloque).toMatchObject({
      suma_actual: 0,
      valido: false,
      codigo_invalido: 'BLOQUE_SIN_CRITERIOS',
    });
  });

  it('un peso que no es entero positivo hace inválido el bloque', async () => {
    const prueba = prepararPrueba();
    const criterio = prueba
      .datos()
      .criterios.find((c) => c.id_especialidad === null && c.id_area_tecnica === 'area-vj')!;
    prueba.modificar((d) => ({
      criterios: d.criterios.map((c) => (c.id === criterio.id ? { ...c, peso: 0 } : c)),
    }));

    expect(valor(await listar(prueba)).areas[1]!.bloque).toMatchObject({
      valido: false,
      codigo_invalido: 'PESO_INVALIDO',
    });
  });

  it('un área o una especialidad inactiva sigue en el catálogo, marcada como inactiva', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      areas_tecnicas: d.areas_tecnicas.map((a) =>
        a.id === 'area-ux' ? { ...a, activo: false } : a,
      ),
      especialidades: d.especialidades.map((e) =>
        e.id === 'esp-da-ml' ? { ...e, activo: false } : e,
      ),
    }));

    const { areas } = valor(await listar(prueba));

    expect(areas.find((a) => a.id === 'area-ux')!.activo).toBe(false);
    expect(
      areas.find((a) => a.id === 'area-da')!.especialidades.find((e) => e.id === 'esp-da-ml')!
        .activo,
    ).toBe(false);
    expect(areas).toHaveLength(4);
  });
});

// ── obtenerConfiguracion ─────────────────────────────────────────────────────────────────────

describe('obtenerConfiguracion', () => {
  const obtener = (p: PruebaPreparada) => obtenerConfiguracion({ idActor: ADMIN }, p.entorno);

  it('trae las tres secciones con todos los parámetros del catálogo, en orden', async () => {
    const prueba = prepararPrueba();

    const { secciones } = valor(await obtener(prueba));

    expect(secciones.map((s) => [s.seccion, s.parametros.length])).toEqual([
      ['EVALUACION', 2],
      ['PRACTICAS', 2],
      ['SEGUIMIENTO', 10],
    ]);
  });

  it('cada parámetro trae su etiqueta en español, su valor vigente y su predeterminado', async () => {
    const prueba = prepararPrueba();

    const banda = valor(await obtener(prueba)).secciones[0]!.parametros[0]!;

    expect(banda).toEqual({
      clave: 'EVALUACION_BANDA_AMBIGUA',
      etiqueta: 'Banda de puntaje ambiguo',
      valor: { tipo: 'rango', minimo: 50, maximo: 69 },
      valor_predeterminado: { tipo: 'rango', minimo: 50, maximo: 69 },
      es_predeterminado: true,
    });
  });

  it('con los valores de la semilla ningún parámetro se aparta del predeterminado', async () => {
    const prueba = prepararPrueba();

    const { secciones } = valor(await obtener(prueba));

    expect(secciones.every((s) => s.parametros.every((p) => p.es_predeterminado))).toBe(true);
  });

  it('un valor cambiado sale con `es_predeterminado: false` y conserva el predeterminado', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      parametros: d.parametros.map((p) =>
        p.clave === 'PRACTICA_AVISO_FIN_DIAS' ? { ...p, valor: { tipo: 'numero', valor: 30 } } : p,
      ),
    }));

    const aviso = valor(await obtener(prueba)).secciones[1]!.parametros.find(
      (p) => p.clave === 'PRACTICA_AVISO_FIN_DIAS',
    )!;

    expect(aviso).toMatchObject({
      valor: { tipo: 'numero', valor: 30 },
      valor_predeterminado: { tipo: 'numero', valor: 14 },
      es_predeterminado: false,
    });
  });

  it('un parámetro ausente es CONFIGURACION_INVALIDA', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      parametros: d.parametros.filter((p) => p.clave !== 'INSIGHT_INACTIVO_DIAS'),
    }));

    expect(codigo(await obtener(prueba))).toBe('CONFIGURACION_INVALIDA');
  });

  it('devuelve copias: modificar el resultado no cambia los datos', async () => {
    const prueba = prepararPrueba();
    const antes = JSON.stringify(prueba.datos().parametros);

    const r = valor(await obtener(prueba));
    const valorBanda = r.secciones[0]!.parametros[0]!.valor;
    if (valorBanda.tipo === 'rango') valorBanda.minimo = 1;

    expect(JSON.stringify(prueba.datos().parametros)).toBe(antes);
  });
});

import { describe, expect, it } from 'vitest';
import {
  CATALOGO_PARAMETROS,
  SECCIONES_CONFIGURACION,
  type ClaveParametro,
  type Id,
  type SeccionConfiguracion,
  type ValorParametro,
} from '@/domain';
import { etiquetaParametro } from '../etiquetas';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import { calcularInsightsVigentes } from '../seguimiento/comun';
import { guardarConfiguracionSeccion, restaurarSeccionConfiguracion } from './configuracion';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const PRACTICANTE = 'demo-practicante';
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

const numero = (valor: number): ValorParametro => ({ tipo: 'numero', valor });
const rango = (minimo: number, maximo: number): ValorParametro => ({
  tipo: 'rango',
  minimo,
  maximo,
});
const proporcion = (area: number, especialidad: number): ValorParametro => ({
  tipo: 'proporcion',
  area,
  especialidad,
});

type Valores = Partial<Record<ClaveParametro, ValorParametro>>;

const guardar = (
  p: PruebaPreparada,
  seccion: SeccionConfiguracion,
  valores: Valores,
  idActor: Id = ADMIN,
) => guardarConfiguracionSeccion({ idActor, seccion, valores }, p.entorno);
const restaurar = (p: PruebaPreparada, seccion: SeccionConfiguracion, idActor: Id = ADMIN) =>
  restaurarSeccionConfiguracion({ idActor, seccion }, p.entorno);

const parametro = (p: PruebaPreparada, clave: ClaveParametro) =>
  p.datos().parametros.find((x) => x.clave === clave)!;
const eventosDesde = (p: PruebaPreparada, cuantos: number) => p.datos().historial.slice(cuantos);

describe('guardarConfiguracionSeccion', () => {
  describe('éxito', () => {
    it('banda: cambia el parámetro, deja un evento con lo que cambió y escribe una sola vez', async () => {
      const prueba = prepararPrueba();
      const antes = prueba.datos();
      const escrituras = prueba.escrituras();

      const r = await guardar(prueba, 'EVALUACION', { EVALUACION_BANDA_AMBIGUA: rango(55, 70) });

      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.valor.seccion).toBe('EVALUACION');
      expect(r.valor.cambiados).toEqual(['EVALUACION_BANDA_AMBIGUA']);
      expect(r.valor.parametros.map((p) => p.clave)).toEqual([
        'EVALUACION_BANDA_AMBIGUA',
        'EVALUACION_PROPORCION',
      ]);
      expect(prueba.escrituras() - escrituras).toBe(1);

      const guardado = parametro(prueba, 'EVALUACION_BANDA_AMBIGUA');
      expect(guardado.valor).toEqual(rango(55, 70));
      // El valor predeterminado no se toca, y tampoco los demás parámetros.
      expect(guardado.valor_predeterminado).toEqual(rango(50, 69));
      expect(parametro(prueba, 'EVALUACION_PROPORCION')).toBe(
        antes.parametros.find((p) => p.clave === 'EVALUACION_PROPORCION'),
      );

      const eventos = eventosDesde(prueba, antes.historial.length);
      expect(eventos).toHaveLength(1);
      expect(eventos[0]).toMatchObject({
        autor: { tipo: 'USUARIO', id_usuario: ADMIN },
        tipo_accion: 'PARAMETRO_CONFIGURACION_CAMBIADO',
        elemento: {
          tipo: 'PARAMETRO_CONFIGURACION',
          id: 'EVALUACION_BANDA_AMBIGUA',
          etiqueta: 'Banda de puntaje ambiguo',
        },
        id_proyecto: null,
        fecha: AHORA_ISO,
        cambios: [
          { campo: 'minimo', valor_anterior: '50', valor_nuevo: '55' },
          { campo: 'maximo', valor_anterior: '69', valor_nuevo: '70' },
        ],
        nota: null,
      });
    });

    it('un rango registra solo el campo que cambió', async () => {
      const prueba = prepararPrueba();
      const antes = prueba.datos().historial.length;
      await guardar(prueba, 'EVALUACION', { EVALUACION_BANDA_AMBIGUA: rango(50, 80) });
      expect(eventosDesde(prueba, antes)[0]!.cambios).toEqual([
        { campo: 'maximo', valor_anterior: '69', valor_nuevo: '80' },
      ]);
    });

    it('una proporción registra el área y la especialidad que cambiaron', async () => {
      const prueba = prepararPrueba();
      const antes = prueba.datos().historial.length;
      await guardar(prueba, 'EVALUACION', { EVALUACION_PROPORCION: proporcion(50, 50) });
      expect(eventosDesde(prueba, antes)[0]!.cambios).toEqual([
        { campo: 'area', valor_anterior: '40', valor_nuevo: '50' },
        { campo: 'especialidad', valor_anterior: '60', valor_nuevo: '50' },
      ]);
    });

    it('un número registra el campo «valor»', async () => {
      const prueba = prepararPrueba();
      const antes = prueba.datos().historial.length;
      const r = await guardar(prueba, 'PRACTICAS', { PRACTICA_DURACION_MESES: numero(6) });
      expect(r.ok && r.valor.cambiados).toEqual(['PRACTICA_DURACION_MESES']);
      expect(parametro(prueba, 'PRACTICA_DURACION_MESES').valor).toEqual(numero(6));
      expect(eventosDesde(prueba, antes)[0]).toMatchObject({
        elemento: {
          id: 'PRACTICA_DURACION_MESES',
          etiqueta: 'Duración predeterminada de la práctica (meses)',
        },
        cambios: [{ campo: 'valor', valor_anterior: '4', valor_nuevo: '6' }],
      });
    });

    it('varios parámetros: un evento por cada uno, en el orden del catálogo', async () => {
      const prueba = prepararPrueba();
      const antes = prueba.datos().historial.length;
      const r = await guardar(prueba, 'PRACTICAS', {
        PRACTICA_AVISO_FIN_DIAS: numero(30),
        PRACTICA_DURACION_MESES: numero(5),
      });
      expect(r.ok && r.valor.cambiados).toEqual([
        'PRACTICA_DURACION_MESES',
        'PRACTICA_AVISO_FIN_DIAS',
      ]);
      expect(eventosDesde(prueba, antes).map((e) => e.elemento.id)).toEqual([
        'PRACTICA_DURACION_MESES',
        'PRACTICA_AVISO_FIN_DIAS',
      ]);
    });

    it('solo se escribe lo que cambió: un parámetro repetido con el mismo valor no deja evento', async () => {
      const prueba = prepararPrueba();
      const antes = prueba.datos().historial.length;
      const r = await guardar(prueba, 'PRACTICAS', {
        PRACTICA_DURACION_MESES: numero(4), // igual al vigente
        PRACTICA_AVISO_FIN_DIAS: numero(21),
      });
      expect(r.ok && r.valor.cambiados).toEqual(['PRACTICA_AVISO_FIN_DIAS']);
      expect(eventosDesde(prueba, antes)).toHaveLength(1);
    });

    it('Seguimiento: cambia un umbral y los demás siguen igual', async () => {
      const prueba = prepararPrueba();
      const antes = prueba.datos();
      const r = await guardar(prueba, 'SEGUIMIENTO', { INSIGHT_INACTIVO_DIAS: numero(10) });
      expect(r.ok && r.valor.cambiados).toEqual(['INSIGHT_INACTIVO_DIAS']);
      expect(r.ok && r.valor.parametros).toHaveLength(10);
      expect(parametro(prueba, 'INSIGHT_INACTIVO_DIAS').valor).toEqual(numero(10));
      for (const p of antes.parametros.filter((x) => x.clave !== 'INSIGHT_INACTIVO_DIAS')) {
        expect(parametro(prueba, p.clave)).toBe(p);
      }
    });

    it('los umbrales nuevos se usan al calcular los insights', async () => {
      const prueba = prepararPrueba();
      const demoradas = (p: PruebaPreparada) => {
        const r = calcularInsightsVigentes(p.datos(), AHORA_ISO);
        return r.ok ? r.valor.filter((i) => i.tipo_regla === 'SUPERVISION_DEMORADA').length : -1;
      };
      const antes = demoradas(prueba);
      await guardar(prueba, 'SEGUIMIENTO', { INSIGHT_SUPERVISION_DEMORADA_DIAS: numero(10) });
      expect(demoradas(prueba)).toBeLessThan(antes);
    });

    it('los cambios valen hacia adelante: no toca evaluaciones, practicantes, avisos ni revisiones', async () => {
      const prueba = prepararPrueba();
      const antes = prueba.datos();
      await guardar(prueba, 'EVALUACION', { EVALUACION_PROPORCION: proporcion(70, 30) });
      await guardar(prueba, 'PRACTICAS', { PRACTICA_DURACION_MESES: numero(12) });
      const despues = prueba.datos();
      expect(despues.evaluaciones).toBe(antes.evaluaciones);
      expect(despues.detalles_evaluacion).toBe(antes.detalles_evaluacion);
      expect(despues.practicantes).toBe(antes.practicantes);
      expect(despues.notificaciones).toBe(antes.notificaciones);
      expect(despues.revisiones_insight).toBe(antes.revisiones_insight);
      expect(despues.tareas).toBe(antes.tareas);
    });

    it('guardar una sección no toca los parámetros de las otras', async () => {
      const prueba = prepararPrueba();
      const antes = prueba.datos();
      await guardar(prueba, 'PRACTICAS', { PRACTICA_DURACION_MESES: numero(6) });
      for (const p of antes.parametros.filter((x) => x.clave !== 'PRACTICA_DURACION_MESES')) {
        expect(parametro(prueba, p.clave)).toBe(p);
      }
    });

    it('los bordes válidos se guardan', async () => {
      const prueba = prepararPrueba();
      expect((await guardar(prueba, 'PRACTICAS', { PRACTICA_DURACION_MESES: numero(24) })).ok).toBe(
        true,
      );
      expect(
        (await guardar(prueba, 'PRACTICAS', { PRACTICA_AVISO_FIN_DIAS: numero(365) })).ok,
      ).toBe(true);
      expect(
        (await guardar(prueba, 'EVALUACION', { EVALUACION_BANDA_AMBIGUA: rango(0, 100) })).ok,
      ).toBe(true);
      expect(
        (await guardar(prueba, 'EVALUACION', { EVALUACION_PROPORCION: proporcion(0, 100) })).ok,
      ).toBe(true);
    });
  });

  describe('sin cambios', () => {
    it('los mismos valores que ya tiene: SIN_CAMBIOS y no escribe', async () => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      const r = await guardar(prueba, 'EVALUACION', {
        EVALUACION_BANDA_AMBIGUA: rango(50, 69),
        EVALUACION_PROPORCION: proporcion(40, 60),
      });
      expect(r).toMatchObject({ ok: false, codigo: 'SIN_CAMBIOS' });
      verificar();
    });

    it('sin ningún valor: SIN_CAMBIOS', async () => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      expect(await guardar(prueba, 'SEGUIMIENTO', {})).toMatchObject({
        ok: false,
        codigo: 'SIN_CAMBIOS',
      });
      verificar();
    });
  });

  describe('validación de la sección (domain/)', () => {
    it.each([
      [
        'banda con mínimo mayor que el máximo',
        'EVALUACION',
        { EVALUACION_BANDA_AMBIGUA: rango(70, 60) },
        'BANDA_MINIMO_NO_MENOR',
        'EVALUACION_BANDA_AMBIGUA.minimo',
      ],
      [
        'banda fuera de rango',
        'EVALUACION',
        { EVALUACION_BANDA_AMBIGUA: rango(50, 101) },
        'VALOR_FUERA_DE_RANGO',
        'EVALUACION_BANDA_AMBIGUA.maximo',
      ],
      [
        'proporción que no suma 100',
        'EVALUACION',
        { EVALUACION_PROPORCION: proporcion(50, 49) },
        'PROPORCION_NO_SUMA_100',
        'EVALUACION_PROPORCION',
      ],
      [
        'proporción con decimales',
        'EVALUACION',
        { EVALUACION_PROPORCION: proporcion(40.5, 59.5) },
        'VALOR_NO_ENTERO',
        'EVALUACION_PROPORCION.area',
      ],
      [
        'duración de 25 meses',
        'PRACTICAS',
        { PRACTICA_DURACION_MESES: numero(25) },
        'VALOR_FUERA_DE_RANGO',
        'PRACTICA_DURACION_MESES',
      ],
      [
        'duración de 0 meses',
        'PRACTICAS',
        { PRACTICA_DURACION_MESES: numero(0) },
        'VALOR_FUERA_DE_RANGO',
        'PRACTICA_DURACION_MESES',
      ],
      [
        'aviso de 366 días',
        'PRACTICAS',
        { PRACTICA_AVISO_FIN_DIAS: numero(366) },
        'VALOR_FUERA_DE_RANGO',
        'PRACTICA_AVISO_FIN_DIAS',
      ],
      [
        'aviso con decimales',
        'PRACTICAS',
        { PRACTICA_AVISO_FIN_DIAS: numero(14.5) },
        'VALOR_NO_ENTERO',
        'PRACTICA_AVISO_FIN_DIAS',
      ],
      [
        'umbral de atraso de 101',
        'SEGUIMIENTO',
        { INSIGHT_ATRASO_PUNTOS: numero(101) },
        'UMBRAL_INVALIDO',
        'INSIGHT_ATRASO_PUNTOS',
      ],
      [
        'crítico no mayor que atención',
        'SEGUIMIENTO',
        { INSIGHT_INACTIVO_CRITICO_DIAS: numero(7) },
        'UMBRAL_INVALIDO',
        'INSIGHT_INACTIVO_CRITICO_DIAS',
      ],
      [
        'carga mínima no menor que la máxima',
        'SEGUIMIENTO',
        { INSIGHT_CARGA_MINIMA_TAREAS: numero(3) },
        'UMBRAL_INVALIDO',
        'INSIGHT_CARGA_MINIMA_TAREAS',
      ],
    ] as const)('%s se rechaza sin escribir', async (_caso, seccion, valores, codigo, campo) => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      const r = await guardar(prueba, seccion, valores);
      expect(r).toMatchObject({ ok: false, codigo, campos: { [campo]: expect.any(String) } });
      expect(r.ok === false && r.mensaje.length).toBeGreaterThan(10);
      verificar();
    });

    it('se valida la sección completa: un valor bueno que choca con uno vigente se rechaza', async () => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      // Atención en 20 días con crítico vigente en 14: cada valor es válido, pero juntos no.
      const r = await guardar(prueba, 'SEGUIMIENTO', { INSIGHT_INACTIVO_DIAS: numero(20) });
      expect(r).toMatchObject({
        ok: false,
        codigo: 'UMBRAL_INVALIDO',
        campos: { INSIGHT_INACTIVO_CRITICO_DIAS: expect.any(String) },
      });
      verificar();
    });

    it('todo o nada: si un parámetro es inválido no se guarda ninguno', async () => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      const r = await guardar(prueba, 'PRACTICAS', {
        PRACTICA_DURACION_MESES: numero(6), // válido
        PRACTICA_AVISO_FIN_DIAS: numero(0), // inválido
      });
      expect(r).toMatchObject({ ok: false, codigo: 'VALOR_FUERA_DE_RANGO' });
      verificar();
      expect(parametro(prueba, 'PRACTICA_DURACION_MESES').valor).toEqual(numero(4));
    });

    it('un valor del tipo equivocado es PARAMETRO_INVALIDO', async () => {
      const prueba = prepararPrueba();
      const r = await guardar(prueba, 'EVALUACION', { EVALUACION_BANDA_AMBIGUA: numero(5) });
      expect(r).toMatchObject({ ok: false, codigo: 'PARAMETRO_INVALIDO' });
    });
  });

  describe('datos inválidos', () => {
    it.each([
      ['NaN', { PRACTICA_DURACION_MESES: numero(Number.NaN) }],
      ['Infinity', { PRACTICA_DURACION_MESES: numero(Number.POSITIVE_INFINITY) }],
      ['un texto', { PRACTICA_DURACION_MESES: { tipo: 'numero', valor: '4' } }],
      ['un tipo desconocido', { PRACTICA_DURACION_MESES: { tipo: 'otro', valor: 4 } }],
      ['campos de más', { PRACTICA_DURACION_MESES: { tipo: 'numero', valor: 4, extra: 1 } }],
      ['un valor nulo', { PRACTICA_DURACION_MESES: null }],
    ])('%s es DATOS_INVALIDOS', async (_caso, valores) => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      const r = await guardar(prueba, 'PRACTICAS', valores as unknown as Valores);
      expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
      verificar();
    });

    it('un parámetro de otra sección se rechaza, no se ignora', async () => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      const r = await guardar(prueba, 'PRACTICAS', { INSIGHT_INACTIVO_DIAS: numero(8) });
      expect(r).toMatchObject({
        ok: false,
        codigo: 'DATOS_INVALIDOS',
        campos: { INSIGHT_INACTIVO_DIAS: 'Este parámetro no pertenece a la sección.' },
      });
      verificar();
    });

    it('un parámetro que no existe se rechaza', async () => {
      const prueba = prepararPrueba();
      const r = await guardar(prueba, 'PRACTICAS', { OTRA_COSA: numero(1) } as unknown as Valores);
      expect(r).toMatchObject({
        ok: false,
        codigo: 'DATOS_INVALIDOS',
        campos: { OTRA_COSA: expect.any(String) },
      });
    });

    it('una sección desconocida y un actor vacío son DATOS_INVALIDOS', async () => {
      const prueba = prepararPrueba();
      const seccion = await guardar(prueba, 'OTRA' as SeccionConfiguracion, {});
      const actor = await guardar(prueba, 'PRACTICAS', { PRACTICA_DURACION_MESES: numero(6) }, '');
      expect(seccion).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
      expect(actor).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    });

    it('una Configuración guardada a la que le falta un parámetro: CONFIGURACION_INVALIDA', async () => {
      const prueba = prepararPrueba();
      prueba.modificar((d) => ({
        parametros: d.parametros.filter((p) => p.clave !== 'PRACTICA_AVISO_FIN_DIAS'),
      }));
      const verificar = sinEscritura(prueba);
      const r = await guardar(prueba, 'PRACTICAS', { PRACTICA_DURACION_MESES: numero(6) });
      expect(r).toMatchObject({ ok: false, codigo: 'CONFIGURACION_INVALIDA' });
      verificar();
    });
  });

  describe('permisos', () => {
    it.each([
      ['el Supervisor', SUPERVISOR],
      ['un Practicante', PRACTICANTE],
    ])('%s no puede: ROL_NO_PERMITIDO', async (_n, actor) => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      const r = await guardar(prueba, 'PRACTICAS', { PRACTICA_DURACION_MESES: numero(6) }, actor);
      expect(r).toMatchObject({ ok: false, codigo: 'ROL_NO_PERMITIDO' });
      verificar();
    });

    it('un Administrador INACTIVO no puede', async () => {
      const prueba = prepararPrueba();
      prueba.modificar((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === ADMIN ? { ...u, estado: 'INACTIVO' as const } : u,
        ),
      }));
      const verificar = sinEscritura(prueba);
      const r = await guardar(prueba, 'PRACTICAS', { PRACTICA_DURACION_MESES: numero(6) });
      expect(r).toMatchObject({ ok: false, codigo: 'USUARIO_INACTIVO' });
      verificar();
    });

    it('un actor que no existe es NO_ENCONTRADO', async () => {
      const prueba = prepararPrueba();
      const r = await guardar(
        prueba,
        'PRACTICAS',
        { PRACTICA_DURACION_MESES: numero(6) },
        'usr-fantasma',
      );
      expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    });
  });
});

describe('restaurarSeccionConfiguracion', () => {
  it('devuelve la sección a sus valores predeterminados, con un evento por cada parámetro que cambió', async () => {
    const prueba = prepararPrueba();
    await guardar(prueba, 'EVALUACION', {
      EVALUACION_BANDA_AMBIGUA: rango(10, 20),
      EVALUACION_PROPORCION: proporcion(70, 30),
    });
    const antes = prueba.datos().historial.length;
    const escrituras = prueba.escrituras();

    const r = await restaurar(prueba, 'EVALUACION');

    expect(r.ok && r.valor.cambiados).toEqual([
      'EVALUACION_BANDA_AMBIGUA',
      'EVALUACION_PROPORCION',
    ]);
    expect(prueba.escrituras() - escrituras).toBe(1);
    expect(parametro(prueba, 'EVALUACION_BANDA_AMBIGUA').valor).toEqual(rango(50, 69));
    expect(parametro(prueba, 'EVALUACION_PROPORCION').valor).toEqual(proporcion(40, 60));
    const eventos = eventosDesde(prueba, antes);
    expect(eventos).toHaveLength(2);
    expect(eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      tipo_accion: 'PARAMETRO_CONFIGURACION_CAMBIADO',
      elemento: { tipo: 'PARAMETRO_CONFIGURACION', id: 'EVALUACION_BANDA_AMBIGUA' },
      cambios: [
        { campo: 'minimo', valor_anterior: '10', valor_nuevo: '50' },
        { campo: 'maximo', valor_anterior: '20', valor_nuevo: '69' },
      ],
    });
  });

  it('solo registra los parámetros que de verdad cambiaron', async () => {
    const prueba = prepararPrueba();
    await guardar(prueba, 'PRACTICAS', { PRACTICA_AVISO_FIN_DIAS: numero(30) });
    const antes = prueba.datos().historial.length;
    const r = await restaurar(prueba, 'PRACTICAS');
    expect(r.ok && r.valor.cambiados).toEqual(['PRACTICA_AVISO_FIN_DIAS']);
    expect(eventosDesde(prueba, antes)).toHaveLength(1);
  });

  it('restaura solo su sección: las demás conservan lo que el Administrador cambió', async () => {
    const prueba = prepararPrueba();
    await guardar(prueba, 'SEGUIMIENTO', { INSIGHT_INACTIVO_DIAS: numero(10) });
    await guardar(prueba, 'PRACTICAS', { PRACTICA_DURACION_MESES: numero(6) });
    await restaurar(prueba, 'SEGUIMIENTO');
    expect(parametro(prueba, 'INSIGHT_INACTIVO_DIAS').valor).toEqual(numero(7));
    expect(parametro(prueba, 'PRACTICA_DURACION_MESES').valor).toEqual(numero(6));
  });

  it('guardar y restaurar deja la Configuración como estaba al principio', async () => {
    const prueba = prepararPrueba();
    const inicial = prueba.datos().parametros;
    for (const seccion of SECCIONES_CONFIGURACION) {
      await guardar(
        prueba,
        seccion,
        seccion === 'EVALUACION'
          ? { EVALUACION_PROPORCION: proporcion(30, 70) }
          : seccion === 'PRACTICAS'
            ? { PRACTICA_DURACION_MESES: numero(9) }
            : { INSIGHT_POSTULACION_DIAS: numero(9) },
      );
      await restaurar(prueba, seccion);
    }
    expect(prueba.datos().parametros).toEqual(inicial);
  });

  it.each(SECCIONES_CONFIGURACION)(
    '%s ya en sus valores predeterminados: SIN_CAMBIOS y no escribe',
    async (seccion) => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      expect(await restaurar(prueba, seccion)).toMatchObject({ ok: false, codigo: 'SIN_CAMBIOS' });
      verificar();
    },
  );

  it('no recalcula nada: evaluaciones, practicantes y avisos quedan iguales', async () => {
    const prueba = prepararPrueba();
    await guardar(prueba, 'EVALUACION', { EVALUACION_PROPORCION: proporcion(70, 30) });
    const antes = prueba.datos();
    await restaurar(prueba, 'EVALUACION');
    const despues = prueba.datos();
    expect(despues.evaluaciones).toBe(antes.evaluaciones);
    expect(despues.notificaciones).toBe(antes.notificaciones);
    expect(despues.practicantes).toBe(antes.practicantes);
  });

  it('un valor predeterminado guardado que domain/ rechazaría: error y no escribe', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      parametros: d.parametros.map((p) =>
        p.clave === 'PRACTICA_DURACION_MESES' ? { ...p, valor_predeterminado: numero(99) } : p,
      ),
    }));
    const verificar = sinEscritura(prueba);
    const r = await restaurar(prueba, 'PRACTICAS');
    expect(r).toMatchObject({ ok: false, codigo: 'VALOR_FUERA_DE_RANGO' });
    verificar();
  });

  it('una Configuración a la que le falta un parámetro: CONFIGURACION_INVALIDA', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      parametros: d.parametros.filter((p) => p.clave !== 'EVALUACION_PROPORCION'),
    }));
    const verificar = sinEscritura(prueba);
    expect(await restaurar(prueba, 'EVALUACION')).toMatchObject({
      ok: false,
      codigo: 'CONFIGURACION_INVALIDA',
    });
    verificar();
  });

  it.each([
    ['el Supervisor', SUPERVISOR],
    ['un Practicante', PRACTICANTE],
  ])('%s no puede: ROL_NO_PERMITIDO', async (_n, actor) => {
    const prueba = prepararPrueba();
    await guardar(prueba, 'PRACTICAS', { PRACTICA_DURACION_MESES: numero(6) });
    const verificar = sinEscritura(prueba);
    expect(await restaurar(prueba, 'PRACTICAS', actor)).toMatchObject({
      ok: false,
      codigo: 'ROL_NO_PERMITIDO',
    });
    verificar();
  });

  it('un Administrador INACTIVO no puede', async () => {
    const prueba = prepararPrueba();
    await guardar(prueba, 'PRACTICAS', { PRACTICA_DURACION_MESES: numero(6) });
    prueba.modificar((d) => ({
      usuarios: d.usuarios.map((u) => (u.id === ADMIN ? { ...u, estado: 'INACTIVO' as const } : u)),
    }));
    const verificar = sinEscritura(prueba);
    expect(await restaurar(prueba, 'PRACTICAS')).toMatchObject({
      ok: false,
      codigo: 'USUARIO_INACTIVO',
    });
    verificar();
  });

  it('un actor que no existe es NO_ENCONTRADO; una sección desconocida, DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    expect(await restaurar(prueba, 'PRACTICAS', 'usr-fantasma')).toMatchObject({
      ok: false,
      codigo: 'NO_ENCONTRADO',
    });
    expect(await restaurar(prueba, 'OTRA' as SeccionConfiguracion)).toMatchObject({
      ok: false,
      codigo: 'DATOS_INVALIDOS',
    });
  });
});

describe('etiquetaParametro', () => {
  it('todo parámetro del catálogo tiene su nombre en español, distinto de los demás', () => {
    const nombres = CATALOGO_PARAMETROS.map((p) => etiquetaParametro(p.clave));
    expect(nombres.every((n) => n.length > 5)).toBe(true);
    expect(new Set(nombres).size).toBe(CATALOGO_PARAMETROS.length);
  });
});

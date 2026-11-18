import { describe, expect, it } from 'vitest';
import type { CambiosAlmacen, DatosAlmacen } from '@/data';
import type { CriterioEvaluacion, Id, ValorParametro } from '@/domain';
import type { PuertoEvaluador } from '../evaluador';
import { EVALUADOR_SIMULADO } from '../evaluador';
import { AHORA_DE_PRUEBA, crearEntornoDePrueba } from '../pruebas/entorno';
import { evaluarPostulacion, redactarJustificacion } from './evaluacion';

const POSTULANTE = 'pos-25'; // Mariana Condori Apaza, Frontend, pendiente
const AREA = ['cri-sw-a1', 'cri-sw-a2', 'cri-sw-a3', 'cri-sw-a4'];
const ESPECIALIDAD = ['cri-sw-front-1', 'cri-sw-front-2', 'cri-sw-front-3', 'cri-sw-front-4'];
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

/** Un «modelo» que da por cumplidos solo esos criterios. */
function evaluadorFijo(cumplidos: readonly Id[]): PuertoEvaluador {
  return {
    juzgar: (_postulante, criterios) =>
      criterios.map((c) => ({
        id_criterio: c.id,
        cumplido: cumplidos.includes(c.id),
        observacion: cumplidos.includes(c.id) ? 'Cumple.' : 'No cumple.',
      })),
  };
}

function preparar(evaluador?: PuertoEvaluador) {
  const prueba = crearEntornoDePrueba({ evaluador });
  const datos = () => prueba.almacen.getState().datos;
  const modificar = (operacion: (d: DatosAlmacen) => CambiosAlmacen) =>
    prueba.almacen.getState().transaccion(operacion);
  /** Quita la evaluación de la semilla: la postulación queda «sin evaluar». */
  const dejarSinEvaluar = (id: Id = POSTULANTE) => {
    const evaluacion = datos().evaluaciones.find((e) => e.id_postulante === id)!;
    modificar((d) => ({
      evaluaciones: d.evaluaciones.filter((e) => e.id !== evaluacion.id),
      detalles_evaluacion: d.detalles_evaluacion.filter((x) => x.id_evaluacion !== evaluacion.id),
    }));
    return evaluacion;
  };
  const cambiarCriterios = (cambio: (c: CriterioEvaluacion) => CriterioEvaluacion) =>
    modificar((d) => ({ criterios: d.criterios.map(cambio) }));
  const fijarParametro = (clave: string, valor: ValorParametro) =>
    modificar((d) => ({
      parametros: d.parametros.map((p) => (p.clave === clave ? { ...p, valor } : p)),
    }));
  return { ...prueba, datos, modificar, dejarSinEvaluar, cambiarCriterios, fijarParametro };
}

function sinEscritura(prueba: ReturnType<typeof preparar>) {
  const datosAntes = prueba.datos();
  const escriturasAntes = prueba.escrituras();
  return () => {
    expect(prueba.datos()).toBe(datosAntes);
    expect(prueba.escrituras()).toBe(escriturasAntes);
  };
}

describe('evaluarPostulacion: éxito', () => {
  it('crea la evaluación y su desglose en una escritura, con el evento del Sistema y sin avisos', async () => {
    const prueba = preparar(evaluadorFijo([...AREA, ...ESPECIALIDAD]));
    prueba.dejarSinEvaluar();
    const antes = prueba.datos();
    const escriturasAntes = prueba.escrituras();

    const r = await evaluarPostulacion({ idPostulante: POSTULANTE }, prueba.entorno);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(prueba.escrituras() - escriturasAntes).toBe(1);
    expect(r.valor.evaluacion).toMatchObject({
      id_postulante: POSTULANTE,
      puntaje_area: 100,
      puntaje_especialidad: 100,
      puntaje_total: 100,
      requiere_revision_manual: false,
      fecha_evaluacion: AHORA_ISO,
    });
    expect(r.valor.detalles).toHaveLength(8);
    expect(r.valor.detalles.map((d) => d.bloque)).toEqual([
      ...Array(4).fill('AREA'),
      ...Array(4).fill('ESPECIALIDAD'),
    ]);
    expect(r.valor.detalles.every((d) => d.id_evaluacion === r.valor.evaluacion.id)).toBe(true);

    const despues = prueba.datos();
    expect(despues.evaluaciones).toContainEqual(r.valor.evaluacion);
    expect(
      despues.detalles_evaluacion.filter((d) => d.id_evaluacion === r.valor.evaluacion.id),
    ).toEqual(r.valor.detalles);
    // Una sola cosa nueva en el historial: el evento del Sistema; ningún aviso.
    const nuevos = despues.historial.slice(antes.historial.length);
    expect(nuevos).toHaveLength(1);
    expect(nuevos[0]).toMatchObject({
      autor: { tipo: 'SISTEMA' },
      tipo_accion: 'POSTULACION_EVALUADA',
      elemento: { tipo: 'POSTULANTE', id: POSTULANTE, etiqueta: 'Mariana Condori Apaza' },
      id_proyecto: null,
      fecha: AHORA_ISO,
      cambios: [{ campo: 'puntaje_total', valor_anterior: null, valor_nuevo: '100' }],
    });
    expect(despues.notificaciones).toBe(antes.notificaciones);
    // No toca a la persona ni su estado.
    expect(despues.postulantes).toBe(antes.postulantes);
  });

  it('combina los bloques con la proporción vigente y redondea la nota', async () => {
    // Área 85 (a1, a2, a3) y especialidad 75 (1, 2, 4): 0,4 × 85 + 0,6 × 75 = 79.
    const prueba = preparar(
      evaluadorFijo([
        'cri-sw-a1',
        'cri-sw-a2',
        'cri-sw-a3',
        ...ESPECIALIDAD.filter((_, i) => i !== 2),
      ]),
    );
    prueba.dejarSinEvaluar();
    const r = await evaluarPostulacion({ idPostulante: POSTULANTE }, prueba.entorno);
    expect(r.ok && r.valor.evaluacion).toMatchObject({
      puntaje_area: 85,
      puntaje_especialidad: 75,
      puntaje_total: 79,
      requiere_revision_manual: false,
    });
  });

  it('usa la proporción vigente de Configuración, no 40/60 fijo', async () => {
    const prueba = preparar(
      evaluadorFijo([
        'cri-sw-a1',
        'cri-sw-a2',
        'cri-sw-a3',
        ...ESPECIALIDAD.filter((_, i) => i !== 2),
      ]),
    );
    prueba.dejarSinEvaluar();
    prueba.fijarParametro('EVALUACION_PROPORCION', {
      tipo: 'proporcion',
      area: 50,
      especialidad: 50,
    });
    const r = await evaluarPostulacion({ idPostulante: POSTULANTE }, prueba.entorno);
    expect(r.ok && r.valor.evaluacion.puntaje_total).toBe(80); // (50 × 85 + 50 × 75) / 100
  });

  it('usa la banda vigente de Configuración, no 50–69 fija', async () => {
    const prueba = preparar(
      evaluadorFijo([
        'cri-sw-a1',
        'cri-sw-a2',
        'cri-sw-a3',
        ...ESPECIALIDAD.filter((_, i) => i !== 2),
      ]),
    );
    prueba.dejarSinEvaluar();
    prueba.fijarParametro('EVALUACION_BANDA_AMBIGUA', { tipo: 'rango', minimo: 75, maximo: 85 });
    const r = await evaluarPostulacion({ idPostulante: POSTULANTE }, prueba.entorno);
    expect(r.ok && r.valor.evaluacion).toMatchObject({
      puntaje_total: 79,
      requiere_revision_manual: true,
    });
    expect(r.ok && r.valor.evaluacion.justificacion).toContain('banda ambigua');
  });

  it('un criterio obligatorio no cumplido solo pone la marca y lo dice la justificación', async () => {
    // Falta `cri-sw-front-1` (obligatorio, 35): área 100, especialidad 65 → 79.
    const prueba = preparar(evaluadorFijo([...AREA, ...ESPECIALIDAD.slice(1)]));
    prueba.dejarSinEvaluar();
    const r = await evaluarPostulacion({ idPostulante: POSTULANTE }, prueba.entorno);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.evaluacion).toMatchObject({
      puntaje_area: 100,
      puntaje_especialidad: 65,
      puntaje_total: 79,
      requiere_revision_manual: true,
    });
    expect(r.valor.evaluacion.justificacion).toContain('criterio obligatorio');
    expect(r.valor.evaluacion.justificacion).not.toContain('banda ambigua');
  });

  // Pesos del área 49 / 1 / 20 / 30 y proporción 100/0: la nota es la suma del área.
  it.each([
    { nota: 49, cumplen: ['cri-sw-a1'], marca: false },
    { nota: 50, cumplen: ['cri-sw-a1', 'cri-sw-a2'], marca: true },
    { nota: 69, cumplen: ['cri-sw-a1', 'cri-sw-a3'], marca: true },
    { nota: 70, cumplen: ['cri-sw-a1', 'cri-sw-a2', 'cri-sw-a3'], marca: false },
  ])(
    'nota $nota → revisión manual: $marca (bordes de la banda)',
    async ({ nota, cumplen, marca }) => {
      const prueba = preparar(evaluadorFijo([...cumplen, ...ESPECIALIDAD]));
      prueba.dejarSinEvaluar();
      const pesos: Record<string, number> = {
        'cri-sw-a1': 49,
        'cri-sw-a2': 1,
        'cri-sw-a3': 20,
        'cri-sw-a4': 30,
      };
      prueba.cambiarCriterios((c) =>
        c.id in pesos
          ? { ...c, peso: pesos[c.id], obligatorio: false }
          : { ...c, obligatorio: false },
      );
      prueba.fijarParametro('EVALUACION_PROPORCION', {
        tipo: 'proporcion',
        area: 100,
        especialidad: 0,
      });

      const r = await evaluarPostulacion({ idPostulante: POSTULANTE }, prueba.entorno);
      expect(r.ok && r.valor.evaluacion).toMatchObject({
        puntaje_total: nota,
        requiere_revision_manual: marca,
      });
    },
  );

  it('el evaluador simulado es determinista: dos entornos dan la misma evaluación', async () => {
    const resultados = [];
    for (let i = 0; i < 2; i += 1) {
      const prueba = preparar(EVALUADOR_SIMULADO);
      prueba.dejarSinEvaluar();
      const r = await evaluarPostulacion({ idPostulante: POSTULANTE }, prueba.entorno);
      if (!r.ok) throw new Error(r.mensaje);
      resultados.push(r.valor);
    }
    expect(resultados[1]).toEqual(resultados[0]);
  });

  it('con los mismos juicios, la justificación es la misma que escribió la semilla', async () => {
    // La semilla evaluó a `pos-25` con «SSSS» / «SSSS»: todo cumplido.
    const prueba = preparar(evaluadorFijo([...AREA, ...ESPECIALIDAD]));
    const deSemilla = prueba.dejarSinEvaluar();
    const r = await evaluarPostulacion({ idPostulante: POSTULANTE }, prueba.entorno);
    expect(r.ok && r.valor.evaluacion.justificacion).toBe(deSemilla.justificacion);
  });

  it('también evalúa a quien ya no está pendiente si nunca se evaluó', async () => {
    const prueba = preparar(evaluadorFijo([...AREA, ...ESPECIALIDAD]));
    const rechazada = 'pos-35';
    prueba.dejarSinEvaluar(rechazada);
    const r = await evaluarPostulacion({ idPostulante: rechazada }, prueba.entorno);
    expect(r.ok).toBe(true);
  });
});

describe('evaluarPostulacion: errores (no escriben nada)', () => {
  it('una postulación ya evaluada no se vuelve a calcular', async () => {
    const prueba = preparar();
    const igual = sinEscritura(prueba);
    const r = await evaluarPostulacion({ idPostulante: POSTULANTE }, prueba.entorno);
    expect(r).toMatchObject({ ok: false, codigo: 'POSTULACION_YA_EVALUADA' });
    igual();
  });

  it('no se puede evaluar dos veces seguidas', async () => {
    const prueba = preparar();
    prueba.dejarSinEvaluar();
    expect((await evaluarPostulacion({ idPostulante: POSTULANTE }, prueba.entorno)).ok).toBe(true);
    const r = await evaluarPostulacion({ idPostulante: POSTULANTE }, prueba.entorno);
    expect(r).toMatchObject({ ok: false, codigo: 'POSTULACION_YA_EVALUADA' });
  });

  it('una postulación que no existe', async () => {
    const prueba = preparar();
    const igual = sinEscritura(prueba);
    const r = await evaluarPostulacion({ idPostulante: 'pos-999' }, prueba.entorno);
    expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    igual();
  });

  it('datos inválidos: sin identificador', async () => {
    const prueba = preparar();
    const igual = sinEscritura(prueba);
    const r = await evaluarPostulacion({ idPostulante: '' }, prueba.entorno);
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(r.ok ? {} : r.campos).toHaveProperty('idPostulante');
    igual();
  });

  const casos: {
    nombre: string;
    codigo: string;
    preparar: (p: ReturnType<typeof preparar>) => void;
  }[] = [
    {
      nombre: 'el bloque de la especialidad sin criterios activos',
      codigo: 'BLOQUE_SIN_CRITERIOS',
      preparar: (p) =>
        p.cambiarCriterios((c) =>
          c.id_especialidad === 'esp-sw-front' ? { ...c, activo: false } : c,
        ),
    },
    {
      nombre: 'los pesos de un bloque no suman 100',
      codigo: 'PESOS_NO_SUMAN_100',
      preparar: (p) => p.cambiarCriterios((c) => (c.id === 'cri-sw-a1' ? { ...c, peso: 31 } : c)),
    },
    {
      nombre: 'un peso que no es entero',
      codigo: 'PESO_INVALIDO',
      preparar: (p) => p.cambiarCriterios((c) => (c.id === 'cri-sw-a1' ? { ...c, peso: 30.5 } : c)),
    },
    {
      nombre: 'la banda de Configuración inválida',
      codigo: 'BANDA_INVALIDA',
      preparar: (p) =>
        p.fijarParametro('EVALUACION_BANDA_AMBIGUA', { tipo: 'rango', minimo: 70, maximo: 60 }),
    },
    {
      nombre: 'la proporción de Configuración inválida',
      codigo: 'PROPORCION_INVALIDA',
      preparar: (p) =>
        p.fijarParametro('EVALUACION_PROPORCION', {
          tipo: 'proporcion',
          area: 50,
          especialidad: 60,
        }),
    },
    {
      nombre: 'un parámetro de Configuración de otro tipo',
      codigo: 'CONFIGURACION_INVALIDA',
      preparar: (p) => p.fijarParametro('EVALUACION_BANDA_AMBIGUA', { tipo: 'numero', valor: 5 }),
    },
    {
      nombre: 'falta un parámetro de Configuración',
      codigo: 'CONFIGURACION_INVALIDA',
      preparar: (p) =>
        p.modificar((d) => ({
          parametros: d.parametros.filter((x) => x.clave !== 'EVALUACION_PROPORCION'),
        })),
    },
  ];

  it.each(casos)('$nombre → $codigo', async ({ codigo, preparar: armar }) => {
    const prueba = preparar(evaluadorFijo([...AREA, ...ESPECIALIDAD]));
    prueba.dejarSinEvaluar();
    armar(prueba);
    const igual = sinEscritura(prueba);
    const r = await evaluarPostulacion({ idPostulante: POSTULANTE }, prueba.entorno);
    expect(r).toMatchObject({ ok: false, codigo });
    if (!r.ok) expect(r.mensaje.length).toBeGreaterThan(15);
    igual();
  });

  it('una falla del dominio deja la postulación sin evaluación y decidible', async () => {
    const prueba = preparar();
    prueba.dejarSinEvaluar();
    prueba.cambiarCriterios((c) => (c.id === 'cri-sw-a1' ? { ...c, peso: 31 } : c));
    await evaluarPostulacion({ idPostulante: POSTULANTE }, prueba.entorno);
    const datos = prueba.datos();
    expect(datos.evaluaciones.some((e) => e.id_postulante === POSTULANTE)).toBe(false);
    expect(datos.postulantes.find((p) => p.id === POSTULANTE)!.estado).toBe('PENDIENTE');
  });
});

describe('redactarJustificacion', () => {
  it('cuenta los criterios cumplidos y menciona cada motivo de revisión', () => {
    const texto = redactarJustificacion({
      ok: true,
      puntaje_area: 60,
      puntaje_especialidad: 50,
      puntaje_total: 54,
      requiere_revision_manual: true,
      motivos_revision: ['CRITERIO_OBLIGATORIO', 'BANDA_AMBIGUA'],
      detalles: [{ cumplido: true }, { cumplido: false }, { cumplido: true }] as never,
    });
    expect(texto).toBe(
      'Cumple 2 de 3 criterios. Puntaje del área: 60/100; de la especialidad: 50/100; nota final: 54/100. ' +
        'Falta un criterio obligatorio: requiere revisión manual. La nota cae en la banda ambigua: requiere revisión manual.',
    );
  });
});

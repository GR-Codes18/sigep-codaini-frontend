import { describe, expect, it } from 'vitest';
import {
  indicadoresDePostulaciones,
  indicadoresParaUsuario,
  insightsParaUsuario,
  ordenarInsights,
  puede,
  type Id,
  type Insight,
} from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { codigo, crearSupervisorSinProyectos, desactivar, valor } from '../pruebas/consultas';
import type { Resultado } from '../resultado';
import { umbralesDe } from '../seguimiento/comun';
import { listarInsights, obtenerIndicadores, practicantesPorArea } from './reportes';

// Semilla en AHORA_DE_PRUEBA (martes 17 de noviembre de 2026, 13:30 en Perú).
const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // pry-pl2d y pry-rsv
const SUPERVISOR_2 = 'usr-sup-02'; // pry-tie (finalizado) y pry-dat
const SUPERVISOR_3 = 'usr-sup-03'; // pry-inv
const PRACTICANTE = 'demo-practicante';
const PRA_DOS_PROYECTOS = 'usr-pra-06'; // pry-pl2d y pry-rsv

const PL2D = 'pry-pl2d';
const RSV = 'pry-rsv';
const INV = 'pry-inv';

const REGLAS_DEL_SUPERVISOR = [
  'PRACTICANTE_INACTIVO',
  'CARGA_DESBALANCEADA',
  'POSIBLE_ATRASO_PROYECTO',
  'PROYECTO_SIN_ACTIVIDAD',
  'SUPERVISION_DEMORADA',
];

/** Una copia del objeto sin ese campo (para comparar con el resultado de domain/). */
function sin<T extends object>(fila: T, campo: string): Record<string, unknown> {
  const copia = { ...fila } as Record<string, unknown>;
  delete copia[campo];
  return copia;
}

type Llamada = (p: PruebaPreparada, idActor: Id) => Promise<Resultado<unknown>>;

const CONSULTAS: ReadonlyArray<{ nombre: string; llamar: Llamada }> = [
  { nombre: 'listarInsights', llamar: (p, idActor) => listarInsights({ idActor }, p.entorno) },
  {
    nombre: 'obtenerIndicadores',
    llamar: (p, idActor) => obtenerIndicadores({ idActor }, p.entorno),
  },
];

describe.each(CONSULTAS)('$nombre · reglas comunes', ({ llamar }) => {
  it('el Administrador y el Supervisor tienen éxito y no se escribe nada', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    expect((await llamar(prueba, ADMIN)).ok).toBe(true);
    expect((await llamar(prueba, SUPERVISOR)).ok).toBe(true);
    comprobar();
  });

  it('el Practicante recibe ROL_NO_PERMITIDO', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await llamar(prueba, PRACTICANTE))).toBe('ROL_NO_PERMITIDO');
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
});

// ── listarInsights ───────────────────────────────────────────────────────────────────────────

describe('listarInsights', () => {
  const listar = (p: PruebaPreparada, idActor: Id, id_proyecto?: Id) =>
    listarInsights({ idActor, id_proyecto }, p.entorno);

  const claves = (insights: readonly Insight[]) =>
    insights.map((i) => `${i.tipo_regla}:${i.elemento.id}`);

  /** Un practicante en dos proyectos con una carga desbalanceada que los abarca a los dos. */
  function practicanteCompartido(prueba: PruebaPreparada) {
    prueba.modificar((d) => ({
      tareas: d.tareas.map((t) =>
        ['tar-pl2d-019', 'tar-pl2d-020', 'tar-pl2d-021'].includes(t.id)
          ? { ...t, estado: 'EN_PROGRESO', id_practicante: PRA_DOS_PROYECTOS }
          : t,
      ),
    }));
  }

  it('el Administrador ve las 7 reglas', async () => {
    const prueba = prepararPrueba();

    const { insights, contadores } = valor(await listar(prueba, ADMIN));

    expect(new Set(insights.map((i) => i.tipo_regla))).toEqual(
      new Set([...REGLAS_DEL_SUPERVISOR, 'POSTULACIONES_SIN_DECIDIR', 'FIN_PRACTICA']),
    );
    expect(contadores).toEqual({ TODOS: 14, ACTIVOS: 13, REVISADOS: 1 });
  });

  it('el Supervisor ve solo 5 reglas y solo sus proyectos', async () => {
    const prueba = prepararPrueba();
    const propios = new Set([PL2D, RSV]);

    const { insights } = valor(await listar(prueba, SUPERVISOR));

    expect(insights).toHaveLength(9);
    expect(insights.every((i) => REGLAS_DEL_SUPERVISOR.includes(i.tipo_regla))).toBe(true);
    expect(insights.every((i) => i.ids_proyecto.every((id) => propios.has(id)))).toBe(true);
    expect(insights.every((i) => i.ids_proyecto.length > 0)).toBe(true);
    expect(valor(await listar(prueba, SUPERVISOR_3)).insights.map((i) => i.elemento.id)).toEqual([
      'tar-inv-003',
    ]);
  });

  it('un Supervisor sin alertas, o sin proyectos, recibe un éxito vacío', async () => {
    const prueba = prepararPrueba();
    const idNuevo = crearSupervisorSinProyectos(prueba);
    const vacio = { insights: [], contadores: { TODOS: 0, ACTIVOS: 0, REVISADOS: 0 } };

    expect(valor(await listar(prueba, SUPERVISOR_2))).toEqual(vacio);
    expect(valor(await listar(prueba, idNuevo))).toEqual(vacio);
  });

  it('va por severidad y antigüedad, como ordenarInsights', async () => {
    const prueba = prepararPrueba();

    const { insights } = valor(await listar(prueba, ADMIN));

    expect(claves(insights)).toEqual(claves(ordenarInsights(insights)));
    expect(insights[0]!.severidad).toBe('CRITICO');
    expect(insights[insights.length - 1]!.severidad).toBe('INFORMATIVO');
  });

  it('es lo mismo que insightsParaUsuario de domain/ con los umbrales de Configuración', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();
    const ahora = prueba.entorno.ahora().toISOString();
    const umbrales = valor(umbralesDe(datos.parametros));

    for (const idActor of [ADMIN, SUPERVISOR, SUPERVISOR_3]) {
      const actor = datos.usuarios.find((u) => u.id === idActor)!;
      const esperado = insightsParaUsuario(actor, datos, umbrales, datos.revisiones_insight, ahora);
      if (!esperado.ok) throw new Error(esperado.mensaje);

      const { insights } = valor(await listar(prueba, idActor));

      expect(
        insights.map((i) => [
          i.tipo_regla,
          i.elemento.id,
          i.severidad,
          i.revisado,
          i.fecha_deteccion,
        ]),
        idActor,
      ).toEqual(
        esperado.insights.map((i) => [
          i.tipo_regla,
          i.elemento.id,
          i.severidad,
          i.revisado,
          i.fecha_deteccion,
        ]),
      );
    }
  });

  it('«revisado» es de quien mira: el que revisó el Administrador no está revisado para el Supervisor', async () => {
    const prueba = prepararPrueba();
    const carga = (r: Awaited<ReturnType<typeof listar>>) =>
      valor(r).insights.find(
        (i) => i.tipo_regla === 'CARGA_DESBALANCEADA' && i.elemento.id === 'usr-pra-04',
      )!;

    expect(carga(await listar(prueba, ADMIN)).revisado).toBe(true);
    expect(carga(await listar(prueba, SUPERVISOR)).revisado).toBe(false);
  });

  it('puede_marcar_revisado: sí si no está revisado; no si ya lo revisó quien mira', async () => {
    const prueba = prepararPrueba();

    const admin = valor(await listar(prueba, ADMIN)).insights;
    const supervisor = valor(await listar(prueba, SUPERVISOR)).insights;

    expect(admin.filter((i) => !i.puede_marcar_revisado).map((i) => i.elemento.id)).toEqual([
      'usr-pra-04',
    ]);
    expect(supervisor.every((i) => i.puede_marcar_revisado)).toBe(true);
  });

  it('puede_notificar: el Administrador en inactivo y supervisión demorada; el Supervisor solo en inactivo', async () => {
    const prueba = prepararPrueba();
    const reglasConBoton = (insights: Awaited<ReturnType<typeof listar>>) =>
      [
        ...new Set(
          valor(insights)
            .insights.filter((i) => i.puede_notificar)
            .map((i) => i.tipo_regla),
        ),
      ].sort();

    expect(reglasConBoton(await listar(prueba, ADMIN))).toEqual([
      'PRACTICANTE_INACTIVO',
      'SUPERVISION_DEMORADA',
    ]);
    expect(reglasConBoton(await listar(prueba, SUPERVISOR))).toEqual(['PRACTICANTE_INACTIVO']);
  });

  it('los permisos de cada insight coinciden con puede() de domain/', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();
    const original = Object.fromEntries(
      valor(await listar(prueba, ADMIN)).insights.map((i) => [
        `${i.tipo_regla}:${i.elemento.id}`,
        i,
      ]),
    );

    for (const idActor of [ADMIN, SUPERVISOR]) {
      const actor = datos.usuarios.find((u) => u.id === idActor)!;
      for (const i of valor(await listar(prueba, idActor)).insights) {
        const contexto = {
          insight: original[`${i.tipo_regla}:${i.elemento.id}`]!,
          proyectos: datos.proyectos,
        };
        expect(i.puede_notificar, `${idActor} ${i.tipo_regla}`).toBe(
          puede(actor, 'NOTIFICAR_DESDE_INSIGHT', contexto).permitido,
        );
      }
    }
  });

  it('recorta ids_proyecto a los proyectos del Supervisor (practicante compartido)', async () => {
    const prueba = prepararPrueba();
    practicanteCompartido(prueba);
    prueba.modificar((d) => ({
      proyectos: d.proyectos.map((p) => (p.id === RSV ? { ...p, id_supervisor: SUPERVISOR_3 } : p)),
    }));
    const carga = (r: Awaited<ReturnType<typeof listar>>) =>
      valor(r).insights.find(
        (i) => i.tipo_regla === 'CARGA_DESBALANCEADA' && i.elemento.id === PRA_DOS_PROYECTOS,
      );

    const admin = carga(await listar(prueba, ADMIN))!;
    const demo = carga(await listar(prueba, SUPERVISOR))!;
    const tres = carga(await listar(prueba, SUPERVISOR_3))!;

    expect([...admin.ids_proyecto].sort()).toEqual([PL2D, RSV]);
    expect(demo.ids_proyecto).toEqual([PL2D]);
    expect(demo.proyectos.map((p) => p.id)).toEqual([PL2D]);
    expect(tres.ids_proyecto).toEqual([RSV]);
    expect(JSON.stringify(demo)).not.toContain(RSV);
    // Recortar lo que se entrega no quita el permiso de actuar: el insight sigue en su alcance.
    expect(demo.puede_marcar_revisado).toBe(true);
    expect(tres.puede_marcar_revisado).toBe(true);
  });

  it('un insight de un proyecto que dejó de ser suyo desaparece del Supervisor anterior', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      proyectos: d.proyectos.map((p) => (p.id === RSV ? { ...p, id_supervisor: SUPERVISOR_3 } : p)),
    }));

    const { insights } = valor(await listar(prueba, SUPERVISOR));

    expect(insights.some((i) => i.ids_proyecto.includes(RSV))).toBe(false);
    expect(insights.every((i) => i.ids_proyecto.includes(PL2D))).toBe(true);
  });

  it('cada insight trae los proyectos con su nombre', async () => {
    const prueba = prepararPrueba();

    const inactivo = valor(await listar(prueba, ADMIN)).insights.find(
      (i) => i.tipo_regla === 'PRACTICANTE_INACTIVO' && i.elemento.id === 'usr-pra-05',
    )!;
    const postulacion = valor(await listar(prueba, ADMIN)).insights.find(
      (i) => i.tipo_regla === 'POSTULACIONES_SIN_DECIDIR',
    )!;

    expect(inactivo.proyectos).toEqual([
      { id: PL2D, codigo: 'PL2D', nombre: 'Plataforma 2D: Aventura Andina' },
    ]);
    expect(postulacion.proyectos).toEqual([]);
  });

  it('el filtro por proyecto deja los insights de ese proyecto', async () => {
    const prueba = prepararPrueba();

    const admin = valor(await listar(prueba, ADMIN, RSV)).insights;
    const supervisor = valor(await listar(prueba, SUPERVISOR, PL2D)).insights;

    expect(admin.length).toBeGreaterThan(0);
    expect(admin.every((i) => i.ids_proyecto.includes(RSV))).toBe(true);
    expect(claves(supervisor)).toEqual([
      'PRACTICANTE_INACTIVO:usr-pra-05',
      'CARGA_DESBALANCEADA:usr-pra-04',
    ]);
    expect(valor(await listar(prueba, ADMIN, 'pry-dat')).insights).toEqual([]);
  });

  it('filtrar por un proyecto ajeno da FUERA_DE_ALCANCE; uno inexistente, NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await listar(prueba, SUPERVISOR, INV))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await listar(prueba, SUPERVISOR, 'no-existe'))).toBe('NO_ENCONTRADO');
    expect(codigo(await listar(prueba, ADMIN, 'no-existe'))).toBe('NO_ENCONTRADO');
  });

  it('una revisión del Supervisor lo marca revisado solo para él', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      revisiones_insight: [
        ...d.revisiones_insight,
        {
          id: 'rev-sup',
          tipo_regla: 'PRACTICANTE_INACTIVO',
          elemento: { tipo: 'USUARIO', id: 'usr-pra-05' },
          severidad_al_revisar: 'CRITICO',
          fecha: '2026-11-17T12:00:00.000Z',
          id_usuario: SUPERVISOR,
          nota: null,
        },
      ],
    }));
    const inactivo = (r: Awaited<ReturnType<typeof listar>>) =>
      valor(r).insights.find(
        (i) => i.tipo_regla === 'PRACTICANTE_INACTIVO' && i.elemento.id === 'usr-pra-05',
      )!;

    const delSupervisor = inactivo(await listar(prueba, SUPERVISOR));
    const delAdmin = inactivo(await listar(prueba, ADMIN));

    expect(delSupervisor).toMatchObject({ revisado: true, puede_marcar_revisado: false });
    expect(delAdmin).toMatchObject({ revisado: false, puede_marcar_revisado: true });
  });

  it('usa los umbrales vigentes de Configuración', async () => {
    const prueba = prepararPrueba();
    const demoradas = async () =>
      valor(await listar(prueba, ADMIN)).insights.filter(
        (i) => i.tipo_regla === 'SUPERVISION_DEMORADA',
      );
    expect((await demoradas()).length).toBe(3);

    prueba.modificar((d) => ({
      parametros: d.parametros.map((p) =>
        p.clave === 'INSIGHT_SUPERVISION_DEMORADA_DIAS'
          ? { ...p, valor: { tipo: 'numero', valor: 100 } }
          : p,
      ),
    }));

    expect(await demoradas()).toEqual([]);
  });

  it('un parámetro de seguimiento ausente es CONFIGURACION_INVALIDA', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      parametros: d.parametros.filter((p) => p.clave !== 'INSIGHT_INACTIVO_DIAS'),
    }));

    expect(codigo(await listar(prueba, ADMIN))).toBe('CONFIGURACION_INVALIDA');
  });
});

// ── obtenerIndicadores ───────────────────────────────────────────────────────────────────────

describe('obtenerIndicadores', () => {
  const obtener = (p: PruebaPreparada, idActor: Id, dias?: number, id_proyecto?: Id) =>
    obtenerIndicadores({ idActor, dias, id_proyecto }, p.entorno);

  it('el Administrador recibe la vista completa, con 30 días por defecto', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, ADMIN));

    expect(r.vista).toBe('ADMINISTRADOR');
    expect(r.periodo).toEqual({
      desde: '2026-10-19T05:00:00.000Z',
      hasta: '2026-11-17T18:30:00.000Z',
      dias: 30,
    });
    expect(r.resumen).toEqual({
      tareas_terminadas: 7,
      tiempo_ciclo_dias: 17.1,
      espera_supervision_dias: 1.9,
      tasa_devolucion: { numerador: 2, denominador: 8, porcentaje: 25 },
    });
  });

  it('es lo mismo que indicadoresParaUsuario de domain/', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();
    const ahora = prueba.entorno.ahora().toISOString();

    for (const idActor of [ADMIN, SUPERVISOR, SUPERVISOR_2]) {
      const actor = datos.usuarios.find((u) => u.id === idActor)!;
      const esperado = indicadoresParaUsuario(actor, datos, { dias: 30, id_proyecto: null }, ahora);
      if (!esperado.ok) throw new Error(esperado.mensaje);

      const r = valor(await obtener(prueba, idActor));

      expect(r.resumen, idActor).toEqual(esperado.resumen);
      expect(r.periodo, idActor).toEqual(esperado.periodo);
      expect(
        r.por_proyecto.map((fila) => sin(fila, 'proyecto')),
        idActor,
      ).toEqual(esperado.por_proyecto);
      expect(
        r.por_practicante.map((fila) => sin(fila, 'nombre')),
        idActor,
      ).toEqual(esperado.por_practicante);
    }
  });

  it('el periodo se elige de 1 a 365 días', async () => {
    const prueba = prepararPrueba();

    expect(valor(await obtener(prueba, ADMIN, 7)).periodo.dias).toBe(7);
    expect(valor(await obtener(prueba, ADMIN, 365)).periodo.dias).toBe(365);
    expect(valor(await obtener(prueba, ADMIN, 1)).periodo.dias).toBe(1);
  });

  it('un periodo fuera de rango o no entero da PERIODO_INVALIDO; uno que no es número, DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();

    for (const dias of [0, 366, 1.5, -3]) {
      expect(codigo(await obtener(prueba, ADMIN, dias)), String(dias)).toBe('PERIODO_INVALIDO');
    }
    expect(
      codigo(
        await obtenerIndicadores(
          { idActor: ADMIN, dias: '30' as unknown as number },
          prueba.entorno,
        ),
      ),
    ).toBe('DATOS_INVALIDOS');
  });

  it('las tablas traen el proyecto y el nombre del practicante', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, ADMIN));

    expect(r.por_proyecto.map((p) => p.proyecto.codigo)).toEqual([
      'PL2D',
      'RSV',
      'INV',
      'TIE',
      'DAT',
    ]);
    expect(r.por_proyecto[0]).toMatchObject({
      proyecto: { id: PL2D, nombre: 'Plataforma 2D: Aventura Andina' },
      tareas_terminadas: 5,
    });
    expect(
      r.por_practicante.every((p) => p.nombre.length > 0 && p.nombre !== p.id_practicante),
    ).toBe(true);
  });

  it('el Administrador recibe las postulaciones decididas y el puntaje promedio por área, con su nombre', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();

    const r = valor(await obtener(prueba, ADMIN));
    if (r.vista !== 'ADMINISTRADOR') throw new Error('Se esperaba la vista del Administrador.');
    const esperado = indicadoresDePostulaciones(
      {
        postulantes: datos.postulantes,
        evaluaciones: datos.evaluaciones,
        historial: datos.historial,
        areas: datos.areas_tecnicas.map((a) => a.id),
      },
      r.periodo,
    );

    expect(r.postulaciones.decididas).toBe(8);
    expect(r.postulaciones.por_area.map((fila) => sin(fila, 'area'))).toEqual(esperado.por_area);
    expect(r.postulaciones.por_area.map((a) => a.area?.nombre)).toEqual([
      'Software',
      'Videojuegos',
      'Diseño UX/UI',
      'Datos e IA',
    ]);
  });

  it('las postulaciones cambian con el periodo', async () => {
    const prueba = prepararPrueba();

    const corto = valor(await obtener(prueba, ADMIN, 1));
    const largo = valor(await obtener(prueba, ADMIN, 365));
    if (corto.vista !== 'ADMINISTRADOR' || largo.vista !== 'ADMINISTRADOR')
      throw new Error('vista');

    expect(largo.postulaciones.decididas).toBeGreaterThan(corto.postulaciones.decididas);
    expect(largo.postulaciones.decididas).toBe(32);
  });

  it('practicantes por área: los activos de cada área, en el orden del catálogo', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, ADMIN));
    if (r.vista !== 'ADMINISTRADOR') throw new Error('Se esperaba la vista del Administrador.');

    expect(r.practicantes_por_area.map((a) => [a.area.id, a.practicantes])).toEqual([
      ['area-sw', 10],
      ['area-vj', 5],
      ['area-ux', 4],
      ['area-da', 4],
    ]);
  });

  it('practicantesPorArea no cuenta a quien finalizó su práctica y, con un proyecto, solo a sus asignados', () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();

    const todos = practicantesPorArea(datos);
    const enRsv = practicantesPorArea(datos, RSV);

    expect(todos.reduce((n, a) => n + a.practicantes, 0)).toBe(23);
    expect(enRsv.reduce((n, a) => n + a.practicantes, 0)).toBe(3);
    expect(practicantesPorArea(datos, 'no-existe').every((a) => a.practicantes === 0)).toBe(true);

    // Quien tiene baja en ese proyecto ya no cuenta.
    prueba.modificar((d) => ({
      asignaciones: d.asignaciones.map((a) =>
        a.id_practicante === 'usr-pra-08' && a.id_proyecto === RSV
          ? { ...a, fecha_baja: '2026-11-10' }
          : a,
      ),
    }));
    expect(practicantesPorArea(prueba.datos(), RSV).reduce((n, a) => n + a.practicantes, 0)).toBe(
      2,
    );
  });

  it('el Supervisor recibe su propia vista, solo de sus proyectos y sin postulaciones ni área', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, SUPERVISOR));
    const texto = JSON.stringify(r);

    expect(r.vista).toBe('SUPERVISOR');
    expect(Object.keys(r).sort()).toEqual([
      'periodo',
      'por_practicante',
      'por_proyecto',
      'resumen',
      'vacio',
      'vista',
    ]);
    expect(r.por_proyecto.map((p) => p.proyecto.id)).toEqual([PL2D, RSV]);
    expect(texto).not.toContain('postulaciones');
    expect(texto).not.toContain('practicantes_por_area');
    for (const area of prueba.datos().areas_tecnicas) expect(texto).not.toContain(area.id);
  });

  it('un Supervisor solo ve a los practicantes de sus proyectos', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();
    const suyos = new Set(
      datos.asignaciones
        .filter((a) => [PL2D, RSV].includes(a.id_proyecto))
        .map((a) => a.id_practicante),
    );

    const r = valor(await obtener(prueba, SUPERVISOR));

    expect(r.por_practicante.length).toBeGreaterThan(0);
    expect(r.por_practicante.every((p) => suyos.has(p.id_practicante))).toBe(true);
    expect(
      valor(await obtener(prueba, SUPERVISOR_3)).por_proyecto.map((p) => p.proyecto.id),
    ).toEqual([INV]);
  });

  it('un Supervisor sin proyectos recibe un éxito con el estado vacío', async () => {
    const prueba = prepararPrueba();
    const idNuevo = crearSupervisorSinProyectos(prueba);

    const r = valor(await obtener(prueba, idNuevo));

    expect(r).toMatchObject({
      vista: 'SUPERVISOR',
      vacio: true,
      por_proyecto: [],
      por_practicante: [],
    });
    expect(r.resumen).toMatchObject({
      tareas_terminadas: 0,
      tiempo_ciclo_dias: null,
      tasa_devolucion: null,
    });
  });

  it('el filtro por proyecto deja ese proyecto; uno ajeno o inexistente se rechaza', async () => {
    const prueba = prepararPrueba();

    expect(
      valor(await obtener(prueba, SUPERVISOR, 30, RSV)).por_proyecto.map((p) => p.proyecto.id),
    ).toEqual([RSV]);
    expect(
      valor(await obtener(prueba, ADMIN, 30, INV)).por_proyecto.map((p) => p.proyecto.id),
    ).toEqual([INV]);
    expect(codigo(await obtener(prueba, SUPERVISOR, 30, INV))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await obtener(prueba, SUPERVISOR, 30, 'no-existe'))).toBe('NO_ENCONTRADO');
    expect(codigo(await obtener(prueba, ADMIN, 30, 'no-existe'))).toBe('NO_ENCONTRADO');
  });

  it('con el filtro por proyecto, los practicantes por área son los de ese proyecto', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, ADMIN, 30, RSV));
    if (r.vista !== 'ADMINISTRADOR') throw new Error('Se esperaba la vista del Administrador.');

    expect(r.practicantes_por_area.reduce((n, a) => n + a.practicantes, 0)).toBe(3);
  });

  it('un Supervisor sin terminadas en el periodo ve «Sin datos» (null), no cero', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, SUPERVISOR_2));

    expect(r.resumen).toEqual({
      tareas_terminadas: 0,
      tiempo_ciclo_dias: null,
      espera_supervision_dias: null,
      tasa_devolucion: null,
    });
    expect(r.vacio).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import type { EventoHistorial, Id } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { codigo, crearSupervisorSinProyectos, desactivar, ids, valor } from '../pruebas/consultas';
import type { Resultado } from '../resultado';
import {
  MAXIMO_ALERTAS,
  MAXIMO_POR_REVISAR,
  MAXIMO_POSTULACIONES,
  obtenerDashboardAdministrador,
  obtenerDashboardSupervisor,
  obtenerInicioPracticante,
  type DashboardSupervisor,
  type InicioPracticante,
} from './dashboards';
import { listarPostulaciones } from './postulaciones';
import { listarPracticantes } from './practicantes';
import { listarInsights, practicantesPorArea } from './reportes';
import { listarMisTareasEnCurso, listarPullRequestsPorAtender } from './tareas';

// Semilla en AHORA_DE_PRUEBA (martes 17 de noviembre de 2026, 13:30 en Perú).
const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // pry-pl2d y pry-rsv
const SUPERVISOR_2 = 'usr-sup-02'; // pry-tie (finalizado) y pry-dat
const SUPERVISOR_3 = 'usr-sup-03'; // pry-inv (en pausa)
const PRACTICANTE = 'demo-practicante'; // solo pry-pl2d
const PRA_DOS_PROYECTOS = 'usr-pra-06'; // pry-pl2d y pry-rsv
const PRA_EN_PAUSA = 'usr-pra-09'; // pry-inv (en pausa)
const PRA_EN_FINALIZADO = 'usr-pra-15'; // vigente en pry-tie (finalizado)
const PRA_SIN_PROYECTO = 'usr-pra-21';
const PRA_CON_CARGA = 'usr-pra-04'; // 008, 013, 014 y 016 en progreso

const PL2D = 'pry-pl2d';
const RSV = 'pry-rsv';
const INV = 'pry-inv';

function cambiarProyecto(
  prueba: PruebaPreparada,
  idProyecto: Id,
  cambios: Record<string, unknown>,
) {
  prueba.modificar((d) => ({
    proyectos: d.proyectos.map((p) => (p.id === idProyecto ? { ...p, ...cambios } : p)),
  }));
}

function cambiarParametro(prueba: PruebaPreparada, clave: string, valorNuevo: number) {
  prueba.modificar((d) => ({
    parametros: d.parametros.map((p) =>
      p.clave === clave ? { ...p, valor: { tipo: 'numero', valor: valorNuevo } } : p,
    ),
  }));
}

function revisar(
  prueba: PruebaPreparada,
  idUsuario: Id,
  tipo_regla: string,
  idElemento: Id,
  severidad: string,
) {
  prueba.modificar((d) => ({
    revisiones_insight: [
      ...d.revisiones_insight,
      {
        id: `rev-${idUsuario}-${idElemento}`,
        tipo_regla,
        elemento: { tipo: 'USUARIO', id: idElemento },
        severidad_al_revisar: severidad,
        fecha: '2026-11-17T12:00:00.000Z',
        id_usuario: idUsuario,
        nota: null,
      } as never,
    ],
  }));
}

function devolver(prueba: PruebaPreparada, idTarea: Id) {
  const evento: EventoHistorial = {
    id: `evt-dev-${idTarea}`,
    fecha: '2026-11-17T17:00:00.000Z',
    autor: { tipo: 'USUARIO', id_usuario: SUPERVISOR },
    tipo_accion: 'TAREA_DEVUELTA',
    elemento: { tipo: 'TAREA', id: idTarea, etiqueta: idTarea },
    id_proyecto: PL2D,
    cambios: [],
    nota: 'Revisa los casos de borde.',
  };
  prueba.modificar((d) => ({ historial: [...d.historial, evento] }));
}

function conSupervisorVacio(
  valorDelResultado: DashboardSupervisor | { vacio: true },
): DashboardSupervisor {
  if (valorDelResultado.vacio) throw new Error('Se esperaba el resumen con tarjetas.');
  return valorDelResultado;
}

function conInicio(valorDelResultado: InicioPracticante | { vacio: true }): InicioPracticante {
  if (valorDelResultado.vacio) throw new Error('Se esperaba el inicio con tarjetas.');
  return valorDelResultado;
}

// ── Reglas comunes ───────────────────────────────────────────────────────────────────────────

type Llamada = (p: PruebaPreparada, idActor: Id) => Promise<Resultado<unknown>>;

const CONSULTAS: ReadonlyArray<{ nombre: string; llamar: Llamada; exito: Id; denegados: Id[] }> = [
  {
    nombre: 'obtenerDashboardAdministrador',
    llamar: (p, idActor) => obtenerDashboardAdministrador({ idActor }, p.entorno),
    exito: ADMIN,
    denegados: [SUPERVISOR, PRACTICANTE],
  },
  {
    nombre: 'obtenerDashboardSupervisor',
    llamar: (p, idActor) => obtenerDashboardSupervisor({ idActor }, p.entorno),
    exito: SUPERVISOR,
    denegados: [ADMIN, PRACTICANTE],
  },
  {
    nombre: 'obtenerInicioPracticante',
    llamar: (p, idActor) => obtenerInicioPracticante({ idActor }, p.entorno),
    exito: PRACTICANTE,
    denegados: [ADMIN, SUPERVISOR],
  },
];

describe.each(CONSULTAS)('$nombre · reglas comunes', ({ llamar, exito, denegados }) => {
  it('con el rol de su vista tiene éxito y no escribe nada', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    expect((await llamar(prueba, exito)).ok).toBe(true);
    comprobar();
  });

  it('los otros roles reciben ROL_NO_PERMITIDO', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    for (const idActor of denegados) {
      expect(codigo(await llamar(prueba, idActor)), idActor).toBe('ROL_NO_PERMITIDO');
    }
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
});

it('los topes de los bloques son 5 (§5.9, §9.1.5)', () => {
  expect([MAXIMO_ALERTAS, MAXIMO_POR_REVISAR, MAXIMO_POSTULACIONES]).toEqual([5, 5, 5]);
});

// ── Dashboard del Administrador ──────────────────────────────────────────────────────────────

describe('obtenerDashboardAdministrador', () => {
  const dashboard = async (p: PruebaPreparada) =>
    valor(await obtenerDashboardAdministrador({ idActor: ADMIN }, p.entorno));

  it('las cuatro tarjetas de métricas', async () => {
    const prueba = prepararPrueba();

    expect((await dashboard(prueba)).tarjetas).toEqual({
      postulaciones: { pendientes: 10, requieren_revision: 5 },
      proyectos: { activos: 3, en_pausa: 1 },
      practicantes: { activos: 23, sin_proyecto: 9 },
      tareas_esperando_supervision: { total: 5, demoradas: 3 },
    });
  });

  it('las tarjetas coinciden con las consultas de sus módulos', async () => {
    const prueba = prepararPrueba();

    const d = await dashboard(prueba);
    const post = valor(await listarPostulaciones({ idActor: ADMIN }, prueba.entorno));
    const pra = valor(await listarPracticantes({ idActor: ADMIN }, prueba.entorno));

    expect(d.tarjetas.postulaciones).toEqual({
      pendientes: post.contadores.PENDIENTES,
      requieren_revision: post.contadores.REQUIEREN_REVISION,
    });
    expect(d.tarjetas.practicantes).toEqual({
      activos: pra.contadores.ACTIVOS,
      sin_proyecto: pra.contadores.SIN_PROYECTO,
    });
  });

  it('«demasiado tiempo» usa el plazo de Supervisión demorada de Configuración, no un 3 fijo', async () => {
    const prueba = prepararPrueba();
    const demoradas = async () =>
      (await dashboard(prueba)).tarjetas.tareas_esperando_supervision.demoradas;
    expect(await demoradas()).toBe(3); // esperan 13, 9 y 8 días

    cambiarParametro(prueba, 'INSIGHT_SUPERVISION_DEMORADA_DIAS', 10);
    expect(await demoradas()).toBe(1);
    expect((await dashboard(prueba)).plazo_demora_dias).toBe(10);

    cambiarParametro(prueba, 'INSIGHT_SUPERVISION_DEMORADA_DIAS', 100);
    expect(await demoradas()).toBe(0);

    cambiarParametro(prueba, 'INSIGHT_SUPERVISION_DEMORADA_DIAS', 1);
    expect(await demoradas()).toBe(5);
  });

  it('un parámetro de seguimiento ausente es CONFIGURACION_INVALIDA', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      parametros: d.parametros.filter((p) => p.clave !== 'INSIGHT_SUPERVISION_DEMORADA_DIAS'),
    }));

    expect(codigo(await obtenerDashboardAdministrador({ idActor: ADMIN }, prueba.entorno))).toBe(
      'CONFIGURACION_INVALIDA',
    );
  });

  it('las cinco postulaciones pendientes de mayor puntaje', async () => {
    const prueba = prepararPrueba();

    const { postulaciones_pendientes } = await dashboard(prueba);

    expect(ids(postulaciones_pendientes)).toEqual([
      'pos-25',
      'pos-29',
      'pos-26',
      'pos-33',
      'pos-27',
    ]);
    expect(postulaciones_pendientes.every((p) => p.estado === 'PENDIENTE')).toBe(true);
    expect(postulaciones_pendientes.map((p) => p.puntaje)).toEqual([100, 91, 88, 85, 81]);
  });

  it('con menos de cinco pendientes, trae las que hay; sin ninguna, la lista vacía', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      postulantes: d.postulantes.map((p, i) =>
        p.estado === 'PENDIENTE' && i % 2 === 0 ? { ...p, estado: 'RECHAZADA' } : p,
      ),
    }));
    const quedan = (await dashboard(prueba)).tarjetas.postulaciones.pendientes;
    expect((await dashboard(prueba)).postulaciones_pendientes).toHaveLength(Math.min(5, quedan));

    prueba.modificar((d) => ({
      postulantes: d.postulantes.map((p) =>
        p.estado === 'PENDIENTE' ? { ...p, estado: 'RECHAZADA' } : p,
      ),
    }));
    expect((await dashboard(prueba)).postulaciones_pendientes).toEqual([]);
  });

  it('«por revisar»: la cola de tareas esperando supervisión, la que más lleva primero', async () => {
    const prueba = prepararPrueba();

    const { por_revisar } = await dashboard(prueba);

    expect(por_revisar.map((t) => [t.id, t.dias_esperando])).toEqual([
      ['tar-inv-003', 13],
      ['tar-rsv-006', 9],
      ['tar-rsv-005', 8],
      ['tar-pl2d-015', 2],
      ['tar-pl2d-017', 1],
    ]);
  });

  it('con más de cinco esperando, «por revisar» se corta en cinco y la tarjeta cuenta todas', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      tareas: d.tareas.map((t) =>
        t.id === 'tar-pl2d-019' ? { ...t, estado: 'ESPERANDO_SUPERVISION' } : t,
      ),
    }));

    const d = await dashboard(prueba);

    expect(d.tarjetas.tareas_esperando_supervision.total).toBe(6);
    expect(d.por_revisar).toHaveLength(5);
    // La tarea sin envío registrado (sin días) queda al final: no entra entre las cinco.
    expect(ids(d.por_revisar)).not.toContain('tar-pl2d-019');
  });

  it('alertas: los insights no revisados, de Crítico a Informativo, hasta cinco', async () => {
    const prueba = prepararPrueba();

    const d = await dashboard(prueba);

    expect(d.alertas).toHaveLength(5);
    expect(d.total_alertas).toBe(13);
    expect(d.alertas.map((a) => a.severidad)).toEqual([
      'CRITICO',
      'CRITICO',
      'CRITICO',
      'ATENCION',
      'ATENCION',
    ]);
    expect(d.alertas.every((a) => !a.revisado)).toBe(true);
  });

  it('las alertas son las mismas de Reportes: las primeras cinco no revisadas', async () => {
    const prueba = prepararPrueba();

    const d = await dashboard(prueba);
    const reportes = valor(await listarInsights({ idActor: ADMIN }, prueba.entorno)).insights;

    expect(d.alertas.map((a) => `${a.tipo_regla}:${a.elemento.id}`)).toEqual(
      reportes
        .filter((i) => !i.revisado)
        .slice(0, 5)
        .map((i) => `${i.tipo_regla}:${i.elemento.id}`),
    );
  });

  it('un insight revisado sale de las alertas y entra el siguiente', async () => {
    const prueba = prepararPrueba();
    const antes = await dashboard(prueba);
    expect(antes.alertas[0]!.elemento.id).toBe('usr-pra-05');

    revisar(prueba, ADMIN, 'PRACTICANTE_INACTIVO', 'usr-pra-05', 'CRITICO');
    const despues = await dashboard(prueba);

    expect(despues.alertas.map((a) => a.elemento.id)).not.toContain('usr-pra-05');
    expect(despues.total_alertas).toBe(12);
    expect(despues.alertas).toHaveLength(5);
  });

  it('practicantes por área: los de practicantesPorArea', async () => {
    const prueba = prepararPrueba();

    expect((await dashboard(prueba)).practicantes_por_area).toEqual(
      practicantesPorArea(prueba.datos()),
    );
  });

  it('próximas reuniones: la más cercana primero, los «Sin definir» al final y sin finalizados', async () => {
    const prueba = prepararPrueba();

    const { proximas_reuniones } = await dashboard(prueba);

    expect(proximas_reuniones.map((r) => [r.proyecto.codigo, r.proxima])).toEqual([
      ['RSV', '2026-11-18T20:30:00.000Z'], // miércoles 18, 15:30 en Perú
      ['PL2D', '2026-11-23T15:00:00.000Z'], // lunes 23, 10:00 en Perú
      ['DAT', null],
      ['INV', null],
    ]);
  });

  it('avance de los proyectos sin finalizar', async () => {
    const prueba = prepararPrueba();

    const { avance_proyectos } = await dashboard(prueba);

    expect(
      avance_proyectos.map((a) => [a.proyecto.codigo, a.estado, a.avance?.porcentaje]),
    ).toEqual([
      ['PL2D', 'ACTIVO', 30],
      ['RSV', 'ACTIVO', 44],
      ['INV', 'EN_PAUSA', 25],
      ['DAT', 'ACTIVO', 0],
    ]);
  });

  it('un proyecto en pausa conserva su reunión y su avance', async () => {
    const prueba = prepararPrueba();
    cambiarProyecto(prueba, INV, { dia_reunion: 'VIERNES', hora_reunion: '09:00' });

    const d = await dashboard(prueba);

    expect(d.proximas_reuniones.find((r) => r.proyecto.id === INV)?.proxima).toBe(
      '2026-11-20T14:00:00.000Z',
    );
    expect(d.avance_proyectos.map((a) => a.proyecto.id)).toContain(INV);
  });

  it('nunca trae contraseñas', async () => {
    const prueba = prepararPrueba();

    const texto = JSON.stringify(await dashboard(prueba));

    for (const u of prueba.datos().usuarios) expect(texto).not.toContain(u.contrasena);
  });
});

// ── Dashboard del Supervisor ─────────────────────────────────────────────────────────────────

describe('obtenerDashboardSupervisor', () => {
  const dashboard = async (p: PruebaPreparada, idActor: Id = SUPERVISOR) =>
    valor(await obtenerDashboardSupervisor({ idActor }, p.entorno));

  it('las cuatro tarjetas de su panel', async () => {
    const prueba = prepararPrueba();

    expect(conSupervisorVacio(await dashboard(prueba)).tarjetas).toEqual({
      tareas_esperando_supervision: { total: 4, demoradas: 2 },
      proyectos: { activos: 2, en_pausa: 0 },
      practicantes: { activos: 8, sin_tareas_en_progreso: 1 },
      tareas_vencidas: { total: 5, sin_asignar: 1 },
    });
  });

  it('cada Supervisor ve solo lo suyo', async () => {
    const prueba = prepararPrueba();

    const dos = conSupervisorVacio(await dashboard(prueba, SUPERVISOR_2));
    const tres = conSupervisorVacio(await dashboard(prueba, SUPERVISOR_3));

    expect(dos.tarjetas).toEqual({
      tareas_esperando_supervision: { total: 0, demoradas: 0 },
      proyectos: { activos: 1, en_pausa: 0 },
      practicantes: { activos: 4, sin_tareas_en_progreso: 4 },
      tareas_vencidas: { total: 0, sin_asignar: 0 },
    });
    expect(tres.tarjetas.proyectos).toEqual({ activos: 0, en_pausa: 1 });
    expect(ids(tres.por_revisar)).toEqual(['tar-inv-003']);
  });

  it('«demoradas» usa el plazo vigente de Configuración', async () => {
    const prueba = prepararPrueba();
    const demoradas = async () =>
      conSupervisorVacio(await dashboard(prueba)).tarjetas.tareas_esperando_supervision.demoradas;
    expect(await demoradas()).toBe(2); // esperan 9 y 8 días

    cambiarParametro(prueba, 'INSIGHT_SUPERVISION_DEMORADA_DIAS', 9);
    expect(await demoradas()).toBe(1);
    expect(conSupervisorVacio(await dashboard(prueba)).plazo_demora_dias).toBe(9);

    cambiarParametro(prueba, 'INSIGHT_SUPERVISION_DEMORADA_DIAS', 1);
    expect(await demoradas()).toBe(4);
  });

  it('«por revisar»: las que más tiempo llevan esperando su supervisión, solo de sus proyectos', async () => {
    const prueba = prepararPrueba();

    const { por_revisar } = conSupervisorVacio(await dashboard(prueba));

    expect(por_revisar.map((t) => [t.id, t.dias_esperando])).toEqual([
      ['tar-rsv-006', 9],
      ['tar-rsv-005', 8],
      ['tar-pl2d-015', 2],
      ['tar-pl2d-017', 1],
    ]);
    expect(ids(por_revisar)).not.toContain('tar-inv-003');
  });

  it('«por revisar» se corta en cinco', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      tareas: d.tareas.map((t) =>
        ['tar-pl2d-019', 'tar-pl2d-021'].includes(t.id)
          ? { ...t, estado: 'ESPERANDO_SUPERVISION' }
          : t,
      ),
    }));

    const d = conSupervisorVacio(await dashboard(prueba));

    expect(d.tarjetas.tareas_esperando_supervision.total).toBe(6);
    expect(d.por_revisar).toHaveLength(5);
  });

  it('las alertas son las de su alcance (5 reglas), sin revisadas y hasta cinco', async () => {
    const prueba = prepararPrueba();

    const d = conSupervisorVacio(await dashboard(prueba));
    const reportes = valor(await listarInsights({ idActor: SUPERVISOR }, prueba.entorno)).insights;

    expect(d.total_alertas).toBe(9);
    expect(d.alertas).toHaveLength(5);
    expect(d.alertas.map((a) => `${a.tipo_regla}:${a.elemento.id}`)).toEqual(
      reportes.slice(0, 5).map((i) => `${i.tipo_regla}:${i.elemento.id}`),
    );
    expect(
      d.alertas.some((a) => ['POSTULACIONES_SIN_DECIDIR', 'FIN_PRACTICA'].includes(a.tipo_regla)),
    ).toBe(false);
    expect(d.alertas.every((a) => a.ids_proyecto.every((id) => [PL2D, RSV].includes(id)))).toBe(
      true,
    );
  });

  it('sin alertas: la lista vacía y el total en cero, sin ser un estado vacío total', async () => {
    const prueba = prepararPrueba();

    const d = conSupervisorVacio(await dashboard(prueba, SUPERVISOR_2));

    expect(d.alertas).toEqual([]);
    expect(d.total_alertas).toBe(0);
    expect(d.por_revisar).toEqual([]);
  });

  it('lo que revisa el Supervisor sale de sus alertas, no de las del Administrador', async () => {
    const prueba = prepararPrueba();
    revisar(prueba, SUPERVISOR, 'PRACTICANTE_INACTIVO', 'usr-pra-05', 'CRITICO');

    const supervisor = conSupervisorVacio(await dashboard(prueba));
    const admin = valor(await obtenerDashboardAdministrador({ idActor: ADMIN }, prueba.entorno));

    expect(supervisor.alertas.map((a) => a.elemento.id)).not.toContain('usr-pra-05');
    expect(supervisor.total_alertas).toBe(8);
    expect(admin.alertas.map((a) => a.elemento.id)).toContain('usr-pra-05');
  });

  it('próximas reuniones y avance: solo sus proyectos sin finalizar', async () => {
    const prueba = prepararPrueba();

    const d = conSupervisorVacio(await dashboard(prueba));

    expect(d.proximas_reuniones.map((r) => r.proyecto.codigo)).toEqual(['RSV', 'PL2D']);
    expect(d.avance_proyectos.map((a) => [a.proyecto.codigo, a.avance?.porcentaje])).toEqual([
      ['PL2D', 30],
      ['RSV', 44],
    ]);
    const dos = conSupervisorVacio(await dashboard(prueba, SUPERVISOR_2));
    expect(dos.proximas_reuniones).toMatchObject([{ proyecto: { codigo: 'DAT' }, proxima: null }]);
    expect(dos.avance_proyectos.map((a) => a.proyecto.codigo)).toEqual(['DAT']);
  });

  it('«vencidas»: la que vence hoy todavía no lo está', async () => {
    const prueba = prepararPrueba();
    const vencidas = async () =>
      conSupervisorVacio(await dashboard(prueba)).tarjetas.tareas_vencidas;
    expect(await vencidas()).toEqual({ total: 5, sin_asignar: 1 });

    // tar-pl2d-020 está disponible, sin responsable y vence hoy: pasa a vencida al moverla a ayer.
    prueba.modificar((d) => ({
      tareas: d.tareas.map((t) =>
        t.id === 'tar-pl2d-020' ? { ...t, fecha_limite: '2026-11-16' } : t,
      ),
    }));

    expect(await vencidas()).toEqual({ total: 6, sin_asignar: 2 });
  });

  it('una terminada con la fecha pasada no cuenta como vencida', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      tareas: d.tareas.map((t) =>
        t.id === 'tar-pl2d-001' ? { ...t, fecha_limite: '2026-01-01' } : t,
      ),
    }));

    expect(conSupervisorVacio(await dashboard(prueba)).tarjetas.tareas_vencidas.total).toBe(5);
  });

  it('un Supervisor sin proyectos recibe el estado vacío total, sin tarjetas', async () => {
    const prueba = prepararPrueba();
    const idNuevo = crearSupervisorSinProyectos(prueba);

    expect(await dashboard(prueba, idNuevo)).toEqual({ vacio: true });
  });

  it('un Supervisor con solo proyectos finalizados no es un estado vacío: tiene tarjetas en cero', async () => {
    const prueba = prepararPrueba();
    cambiarProyecto(prueba, 'pry-dat', { estado: 'FINALIZADO', fecha_fin_real: '2026-11-10' });

    const d = conSupervisorVacio(await dashboard(prueba, SUPERVISOR_2));

    expect(d.tarjetas.proyectos).toEqual({ activos: 0, en_pausa: 0 });
    expect(d.proximas_reuniones).toEqual([]);
    expect(d.avance_proyectos).toEqual([]);
  });

  it('un proyecto reasignado deja de contar para el Supervisor anterior', async () => {
    const prueba = prepararPrueba();
    cambiarProyecto(prueba, RSV, { id_supervisor: SUPERVISOR_3 });

    const d = conSupervisorVacio(await dashboard(prueba));

    expect(d.tarjetas.proyectos).toEqual({ activos: 1, en_pausa: 0 });
    expect(d.tarjetas.tareas_esperando_supervision.total).toBe(2);
    expect(d.proximas_reuniones.map((r) => r.proyecto.codigo)).toEqual(['PL2D']);
  });

  it('no trae el área técnica ni el celular de nadie', async () => {
    const prueba = prepararPrueba();

    const texto = JSON.stringify(await dashboard(prueba));

    for (const area of prueba.datos().areas_tecnicas) expect(texto).not.toContain(area.id);
    for (const u of prueba.datos().usuarios) {
      expect(texto).not.toContain(u.celular);
      expect(texto).not.toContain(u.contrasena);
    }
  });
});

// ── Inicio del Practicante ───────────────────────────────────────────────────────────────────

describe('obtenerInicioPracticante', () => {
  const inicio = async (p: PruebaPreparada, idActor: Id = PRACTICANTE) =>
    valor(await obtenerInicioPracticante({ idActor }, p.entorno));

  it('las cuatro tarjetas', async () => {
    const prueba = prepararPrueba();

    expect(conInicio(await inicio(prueba)).tarjetas).toEqual({
      en_progreso: 1,
      devueltas: 1,
      esperando_supervision: 1,
      disponibles: 3,
    });
  });

  it('«devueltas» cuenta las devueltas con observaciones de sus tareas en curso', async () => {
    const prueba = prepararPrueba();
    expect(conInicio(await inicio(prueba, PRA_CON_CARGA)).tarjetas).toMatchObject({
      en_progreso: 4,
      devueltas: 0,
    });

    devolver(prueba, 'tar-pl2d-016');
    const d = conInicio(await inicio(prueba, PRA_CON_CARGA));

    expect(d.tarjetas.devueltas).toBe(1);
    // La devuelta va primero en «mis tareas en curso».
    expect(d.en_curso[0]!.id).toBe('tar-pl2d-016');
  });

  it('mis tareas en curso y los PR por atender son los de sus consultas', async () => {
    const prueba = prepararPrueba();

    for (const idActor of [PRACTICANTE, PRA_DOS_PROYECTOS, PRA_CON_CARGA, PRA_EN_PAUSA]) {
      const d = conInicio(await inicio(prueba, idActor));
      const curso = valor(await listarMisTareasEnCurso({ idActor }, prueba.entorno)).tareas;
      const prs = valor(await listarPullRequestsPorAtender({ idActor }, prueba.entorno)).tareas;

      expect(ids(d.en_curso), idActor).toEqual(ids(curso));
      expect(ids(d.pull_requests_por_atender), idActor).toEqual(ids(prs));
    }
  });

  it('en curso y PR por atender de la semilla', async () => {
    const prueba = prepararPrueba();

    const d = conInicio(await inicio(prueba));

    expect(ids(d.en_curso)).toEqual(['tar-pl2d-010']);
    expect(ids(d.pull_requests_por_atender)).toEqual(['tar-pl2d-006', 'tar-pl2d-017']);
  });

  it('«disponibles» no cuenta los proyectos en pausa', async () => {
    const prueba = prepararPrueba();
    // INV tiene una tarea disponible (tar-inv-001) pero está en pausa.
    expect(conInicio(await inicio(prueba, PRA_EN_PAUSA)).tarjetas.disponibles).toBe(0);

    cambiarProyecto(prueba, INV, { estado: 'ACTIVO' });

    expect(conInicio(await inicio(prueba, PRA_EN_PAUSA)).tarjetas.disponibles).toBe(1);
  });

  it('en un proyecto en pausa siguen apareciendo sus tareas en progreso y esperando', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      tareas: d.tareas.map((t) =>
        t.id === 'tar-inv-001' ? { ...t, estado: 'EN_PROGRESO', id_practicante: PRA_EN_PAUSA } : t,
      ),
    }));

    const d = conInicio(await inicio(prueba, PRA_EN_PAUSA));

    expect(d.tarjetas).toMatchObject({ en_progreso: 1, esperando_supervision: 1, disponibles: 0 });
    expect(ids(d.en_curso)).toEqual(['tar-inv-001']);
  });

  it('con dos proyectos suma sus disponibles y ordena sus reuniones', async () => {
    const prueba = prepararPrueba();

    const d = conInicio(await inicio(prueba, PRA_DOS_PROYECTOS));

    expect(d.tarjetas.disponibles).toBe(5); // 3 en PL2D y 2 en RSV
    expect(d.proximas_reuniones.map((r) => [r.proyecto.codigo, r.proxima])).toEqual([
      ['RSV', '2026-11-18T20:30:00.000Z'],
      ['PL2D', '2026-11-23T15:00:00.000Z'],
    ]);
  });

  it('un proyecto sin reunión sale como «Sin definir»', async () => {
    const prueba = prepararPrueba();

    const d = conInicio(await inicio(prueba, PRA_EN_PAUSA));

    expect(d.proximas_reuniones).toMatchObject([
      { proyecto: { codigo: 'INV' }, proxima: null, dia_reunion: null },
    ]);
  });

  it('solo sus tareas: las de sus compañeros no entran en ningún bloque', async () => {
    const prueba = prepararPrueba();

    const d = conInicio(await inicio(prueba));

    expect([...d.en_curso, ...d.pull_requests_por_atender].every((t) => t.es_mia)).toBe(true);
  });

  it('un Practicante sin asignaciones recibe el estado vacío total', async () => {
    const prueba = prepararPrueba();

    expect(await inicio(prueba, PRA_SIN_PROYECTO)).toEqual({ vacio: true });
  });

  it('quien solo tiene un proyecto finalizado también recibe el estado vacío', async () => {
    const prueba = prepararPrueba();

    expect(await inicio(prueba, PRA_EN_FINALIZADO)).toEqual({ vacio: true });
  });

  it('quien salió de su único proyecto recibe el estado vacío', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      asignaciones: d.asignaciones.map((a) =>
        a.id_practicante === PRACTICANTE ? { ...a, fecha_baja: '2026-11-16' } : a,
      ),
    }));

    expect(await inicio(prueba)).toEqual({ vacio: true });
  });

  it('nunca trae el correo ni el celular de nadie', async () => {
    const prueba = prepararPrueba();

    const texto = JSON.stringify(await inicio(prueba));

    for (const u of prueba.datos().usuarios) {
      expect(texto, u.id).not.toContain(u.correo);
      expect(texto, u.id).not.toContain(u.celular);
    }
  });
});

import { describe, expect, it } from 'vitest';
import type { CambiosAlmacen, DatosAlmacen } from '@/data';
import {
  devolucionVigente,
  type ConsultaGitHub,
  type EstadoTarea,
  type Id,
  type Proyecto,
  type Tarea,
  type Usuario,
} from '@/domain';
import type { Entorno } from '../entorno';
import {
  GITHUB_SIMULADO,
  consultaSimulada,
  type PuertoGitHub,
  type TareaConsultable,
} from '../github';
import { AHORA_DE_PRUEBA, crearEntornoDePrueba } from '../pruebas/entorno';
import { MENSAJES, type Resultado } from '../resultado';
import { crearTarea } from './datosTarea';
import {
  aprobarTarea,
  devolverTarea,
  enviarTareaASupervision,
  liberarTarea,
  marcarTareaTerminada,
  reabrirTarea,
  tomarTarea,
} from './transiciones';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // supervisor de PL2D y RSV
const SUPERVISOR_AJENO = 'usr-sup-02';
const DEMO = 'demo-practicante';
const DIEGO = 'usr-pra-02';
const PL2D = 'pry-pl2d';
const ENEMIGOS = 'tar-pl2d-010'; // de DEMO, EN_PROGRESO, devuelta, con supervisión, PENDIENTE sin URL
const JEFE = 'tar-pl2d-011'; // de DIEGO, EN_PROGRESO, sin supervisión, estado_pr null
const MOVIMIENTO = 'tar-pl2d-001'; // de DIEGO, TERMINADA, PR FUSIONADO con URL
const URL_PR = 'https://github.com/org-demo/pl2d/pull/42';
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

/** Puerto de GitHub que cuenta las consultas; responde `respuesta` o lo que diga la simulación. */
function puertoEspia(respuesta?: ConsultaGitHub) {
  const llamadas: TareaConsultable[] = [];
  const github: PuertoGitHub = {
    ...GITHUB_SIMULADO,
    consultarPullRequest: (tarea) => {
      llamadas.push(tarea);
      return respuesta ?? consultaSimulada(tarea);
    },
  };
  return { llamadas, github };
}

function preparar(github?: PuertoGitHub) {
  const prueba = crearEntornoDePrueba({ github });
  const datos = () => prueba.almacen.getState().datos;
  const modificar = (operacion: (d: DatosAlmacen) => CambiosAlmacen) =>
    prueba.almacen.getState().transaccion(operacion);
  const tarea = (id: Id) => datos().tareas.find((t) => t.id === id)!;
  const nombre = (id: Id) => datos().usuarios.find((u) => u.id === id)!.nombre;
  return { ...prueba, datos, modificar, tarea, nombre };
}
type Prueba = ReturnType<typeof preparar>;

const cambiarProyecto = (cambios: Partial<Proyecto>) => (d: DatosAlmacen) => ({
  proyectos: d.proyectos.map((p) => (p.id === PL2D ? { ...p, ...cambios } : p)),
});
const cambiarUsuario = (id: Id, cambios: Partial<Usuario>) => (d: DatosAlmacen) => ({
  usuarios: d.usuarios.map((u) => (u.id === id ? { ...u, ...cambios } : u)),
});
const cambiarTarea = (id: Id, cambios: Partial<Tarea>) => (d: DatosAlmacen) => ({
  tareas: d.tareas.map((t) => (t.id === id ? { ...t, ...cambios } : t)),
});
/** Da de baja las asignaciones vigentes de una persona en PL2D. */
const darDeBaja = (id: Id) => (d: DatosAlmacen) => ({
  asignaciones: d.asignaciones.map((a) =>
    a.id_practicante === id && a.id_proyecto === PL2D && a.fecha_baja === null
      ? { ...a, fecha_baja: '2026-11-16' }
      : a,
  ),
});

/** Una tarea ESPERANDO_SUPERVISION de PL2D (la semilla la tiene; si no, falla aquí). */
function esperandoDePL2D(datos: DatosAlmacen): Tarea {
  const tarea = datos.tareas.find(
    (t) => t.id_proyecto === PL2D && t.estado === 'ESPERANDO_SUPERVISION',
  );
  if (tarea === undefined) throw new Error('La semilla no tiene una tarea esperando en PL2D.');
  return tarea;
}

/** Un practicante activo sin asignación vigente en PL2D. */
function practicanteFueraDePL2D(datos: DatosAlmacen): Id {
  const vigentes = new Set(
    datos.asignaciones
      .filter((a) => a.id_proyecto === PL2D && a.fecha_baja === null)
      .map((a) => a.id_practicante),
  );
  const fuera = datos.usuarios.find(
    (u) => u.rol === 'PRACTICANTE' && u.estado === 'ACTIVO' && !vigentes.has(u.id),
  );
  if (fuera === undefined) throw new Error('No hay un practicante fuera de PL2D.');
  return fuera.id;
}

/** Crea una tarea DISPONIBLE en PL2D (con el servicio de 5A). */
async function crearDisponible(prueba: Prueba, opciones: { supervision?: boolean } = {}) {
  const r = await crearTarea(
    {
      idActor: SUPERVISOR,
      idProyecto: PL2D,
      titulo: 'Pantalla de créditos',
      descripcion: 'Lista del equipo al terminar el juego.',
      fecha_limite: '2026-12-15',
      requiere_supervision: opciones.supervision ?? false,
    },
    prueba.entorno,
  );
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

/** Comprueba que una operación fallida no escribió nada. */
function sinEscritura(prueba: Prueba) {
  const datosAntes = prueba.datos();
  const escriturasAntes = prueba.escrituras();
  return () => {
    expect(prueba.datos()).toBe(datosAntes);
    expect(prueba.escrituras()).toBe(escriturasAntes);
  };
}

/** Ejecuta un servicio y devuelve el resultado con el último evento y los avisos nuevos. */
async function ejecutar(prueba: Prueba, accion: () => Promise<Resultado<Tarea>>) {
  const avisosAntes = prueba.datos().notificaciones.length;
  const historialAntes = prueba.datos().historial.length;
  const escriturasAntes = prueba.escrituras();
  const resultado = await accion();
  return {
    resultado,
    escrituras: prueba.escrituras() - escriturasAntes,
    eventos: prueba.datos().historial.slice(historialAntes),
    avisos: prueba.datos().notificaciones.slice(avisosAntes),
  };
}

function aviso(destinatario: Id, tipo: string, mensaje: string, idTarea: Id) {
  return {
    id: expect.stringMatching(/^ntf-/),
    id_destinatario: destinatario,
    tipo,
    mensaje,
    elemento: { tipo: 'TAREA', id: idTarea },
    fecha: AHORA_ISO,
    leida: false,
  };
}

// ── Tomar ────────────────────────────────────────────────────────────────────────────────────

describe('tomarTarea', () => {
  it('el practicante del proyecto la toma: EN_PROGRESO a su nombre, sin aviso', async () => {
    const prueba = preparar();
    const tarea = await crearDisponible(prueba);

    const r = await ejecutar(prueba, () =>
      tomarTarea({ idActor: DEMO, idTarea: tarea.id }, prueba.entorno),
    );

    expect(r.resultado.ok && r.resultado.valor).toEqual({
      ...tarea,
      estado: 'EN_PROGRESO',
      id_practicante: DEMO,
    });
    expect(prueba.tarea(tarea.id)).toEqual({
      ...tarea,
      estado: 'EN_PROGRESO',
      id_practicante: DEMO,
    });
    expect(r.escrituras).toBe(1);
    expect(r.eventos).toEqual([
      {
        id: expect.stringMatching(/^evt-/),
        fecha: AHORA_ISO,
        autor: { tipo: 'USUARIO', id_usuario: DEMO },
        tipo_accion: 'TAREA_TOMADA',
        elemento: {
          tipo: 'TAREA',
          id: tarea.id,
          etiqueta: `PL2D-0${tarea.numero} · Pantalla de créditos`,
        },
        id_proyecto: PL2D,
        cambios: [
          { campo: 'estado', valor_anterior: 'DISPONIBLE', valor_nuevo: 'EN_PROGRESO' },
          { campo: 'responsable', valor_anterior: null, valor_nuevo: prueba.nombre(DEMO) },
        ],
        nota: null,
      },
    ]);
    expect(r.avisos).toEqual([]);
  });

  it('proyecto EN_PAUSA → PROYECTO_EN_PAUSA y no escribe', async () => {
    const prueba = preparar();
    const tarea = await crearDisponible(prueba);
    prueba.modificar(cambiarProyecto({ estado: 'EN_PAUSA' }));
    const comprobar = sinEscritura(prueba);
    expect(await tomarTarea({ idActor: DEMO, idTarea: tarea.id }, prueba.entorno)).toEqual({
      ok: false,
      codigo: 'PROYECTO_EN_PAUSA',
      mensaje: MENSAJES.PROYECTO_EN_PAUSA,
    });
    comprobar();
  });

  it('quién: Administrador y Supervisor no toman; sin asignación o con baja, fuera de alcance', async () => {
    const prueba = preparar();
    const tarea = await crearDisponible(prueba);
    const fuera = practicanteFueraDePL2D(prueba.datos());
    const comprobar = sinEscritura(prueba);
    for (const [idActor, codigo] of [
      [ADMIN, 'ROL_NO_PERMITIDO'],
      [SUPERVISOR, 'ROL_NO_PERMITIDO'],
      [fuera, 'FUERA_DE_ALCANCE'],
    ] as const) {
      const r = await tomarTarea({ idActor, idTarea: tarea.id }, prueba.entorno);
      expect(r, idActor).toMatchObject({ ok: false, codigo });
    }
    comprobar();

    prueba.modificar(darDeBaja(DEMO));
    expect(await tomarTarea({ idActor: DEMO, idTarea: tarea.id }, prueba.entorno)).toMatchObject({
      codigo: 'FUERA_DE_ALCANCE',
    });
  });

  it('una tarea que no está DISPONIBLE → TRANSICION_NO_APLICA', async () => {
    const prueba = preparar();
    expect(await tomarTarea({ idActor: DEMO, idTarea: JEFE }, prueba.entorno)).toMatchObject({
      codigo: 'TRANSICION_NO_APLICA',
    });
  });
});

// ── Liberar ──────────────────────────────────────────────────────────────────────────────────

describe('liberarTarea', () => {
  it('el responsable la libera sin motivo: DISPONIBLE, sin responsable y sin avisarse a sí mismo', async () => {
    const prueba = preparar();
    const antes = prueba.tarea(ENEMIGOS);

    const r = await ejecutar(prueba, () =>
      liberarTarea({ idActor: DEMO, idTarea: ENEMIGOS }, prueba.entorno),
    );

    expect(r.resultado.ok && r.resultado.valor).toEqual({
      ...antes,
      estado: 'DISPONIBLE',
      id_practicante: null,
    });
    expect(r.escrituras).toBe(1);
    expect(r.eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: DEMO },
      tipo_accion: 'TAREA_LIBERADA',
      cambios: [
        { campo: 'estado', valor_anterior: 'EN_PROGRESO', valor_nuevo: 'DISPONIBLE' },
        { campo: 'responsable', valor_anterior: prueba.nombre(DEMO), valor_nuevo: null },
      ],
      nota: null,
    });
    expect(r.avisos).toEqual([]);
  });

  it('el practicante puede dejar un motivo opcional, que se guarda recortado', async () => {
    const prueba = preparar();
    const r = await ejecutar(prueba, () =>
      liberarTarea(
        { idActor: DEMO, idTarea: ENEMIGOS, motivo: '  No me da el tiempo. ' },
        prueba.entorno,
      ),
    );
    expect(r.eventos[0]?.nota).toBe('No me da el tiempo.');
  });

  it.each([
    ['Supervisor', SUPERVISOR],
    ['Administrador', ADMIN],
  ])(
    '%s con motivo: avisa al responsable y conserva el PR y la marca «Devuelta»',
    async (_rol, idActor) => {
      const prueba = preparar();
      prueba.modificar(cambiarTarea(ENEMIGOS, { estado_pr: 'CREADO', url_pull_request: URL_PR }));

      const r = await ejecutar(prueba, () =>
        liberarTarea(
          { idActor, idTarea: ENEMIGOS, motivo: 'Lleva una semana sin avances.' },
          prueba.entorno,
        ),
      );

      expect(r.resultado.ok && r.resultado.valor).toMatchObject({
        estado: 'DISPONIBLE',
        id_practicante: null,
        estado_pr: 'CREADO',
        url_pull_request: URL_PR,
      });
      expect(r.eventos[0]).toMatchObject({
        autor: { tipo: 'USUARIO', id_usuario: idActor },
        nota: 'Lleva una semana sin avances.',
      });
      expect(r.avisos).toEqual([
        aviso(
          DEMO,
          'TAREA_LIBERADA',
          'Liberaron tu tarea «Enemigos básicos» (PL2D-010).',
          ENEMIGOS,
        ),
      ]);
      expect(devolucionVigente(ENEMIGOS, prueba.datos().historial)).toBe(true);
    },
  );

  it.each([
    ['ausente', undefined],
    ['vacío', ''],
    ['solo espacios', '   '],
  ])('Supervisor con motivo %s → TEXTO_OBLIGATORIO y no escribe', async (_caso, motivo) => {
    const prueba = preparar();
    const comprobar = sinEscritura(prueba);
    expect(
      await liberarTarea({ idActor: SUPERVISOR, idTarea: ENEMIGOS, motivo }, prueba.entorno),
    ).toEqual({ ok: false, codigo: 'TEXTO_OBLIGATORIO', mensaje: MENSAJES.TEXTO_OBLIGATORIO });
    comprobar();
  });

  it('otro practicante del proyecto → NO_ES_EL_RESPONSABLE', async () => {
    const prueba = preparar();
    expect(await liberarTarea({ idActor: DIEGO, idTarea: ENEMIGOS }, prueba.entorno)).toMatchObject(
      {
        codigo: 'NO_ES_EL_RESPONSABLE',
      },
    );
  });

  it('en un proyecto EN_PAUSA se puede liberar', async () => {
    const prueba = preparar();
    prueba.modificar(cambiarProyecto({ estado: 'EN_PAUSA' }));
    expect((await liberarTarea({ idActor: DEMO, idTarea: ENEMIGOS }, prueba.entorno)).ok).toBe(
      true,
    );
  });

  it('el estado va antes que el texto: tarea DISPONIBLE con motivo vacío → TRANSICION_NO_APLICA', async () => {
    const prueba = preparar();
    const tarea = await crearDisponible(prueba);
    expect(
      await liberarTarea({ idActor: SUPERVISOR, idTarea: tarea.id, motivo: '' }, prueba.entorno),
    ).toMatchObject({ codigo: 'TRANSICION_NO_APLICA' });
  });
});

// ── Enviar a supervisión ─────────────────────────────────────────────────────────────────────

describe('enviarTareaASupervision', () => {
  it('el responsable la envía: avisa al supervisor y apaga la marca «Devuelta»; sin PR previo no consulta GitHub', async () => {
    const espia = puertoEspia();
    const prueba = preparar(espia.github);
    const antes = prueba.tarea(ENEMIGOS);
    expect(devolucionVigente(ENEMIGOS, prueba.datos().historial)).toBe(true);

    const r = await ejecutar(prueba, () =>
      enviarTareaASupervision({ idActor: DEMO, idTarea: ENEMIGOS }, prueba.entorno),
    );

    // Ya estaba en PENDIENTE desde la primera llegada: no cambia ni se registra.
    expect(r.resultado.ok && r.resultado.valor).toEqual({
      ...antes,
      estado: 'ESPERANDO_SUPERVISION',
    });
    expect(r.escrituras).toBe(1);
    expect(r.eventos[0]).toMatchObject({
      tipo_accion: 'TAREA_ENVIADA_A_SUPERVISION',
      cambios: [
        { campo: 'estado', valor_anterior: 'EN_PROGRESO', valor_nuevo: 'ESPERANDO_SUPERVISION' },
      ],
    });
    expect(r.avisos).toEqual([
      aviso(
        SUPERVISOR,
        'TAREA_ENVIADA_A_SUPERVISION',
        `${prueba.nombre(DEMO)} envió «Enemigos básicos» (PL2D-010) a supervisión.`,
        ENEMIGOS,
      ),
    ]);
    expect(espia.llamadas).toHaveLength(0);
    expect(devolucionVigente(ENEMIGOS, prueba.datos().historial)).toBe(false);
  });

  it('primera llegada con «Requiere PR»: estado_pr null → PENDIENTE, en el mismo evento', async () => {
    const prueba = preparar();
    prueba.modificar(cambiarTarea(ENEMIGOS, { estado_pr: null }));
    const r = await ejecutar(prueba, () =>
      enviarTareaASupervision({ idActor: DEMO, idTarea: ENEMIGOS }, prueba.entorno),
    );
    expect(r.resultado.ok && r.resultado.valor.estado_pr).toBe('PENDIENTE');
    expect(r.eventos).toHaveLength(1);
    expect(r.eventos[0]?.cambios).toEqual([
      { campo: 'estado', valor_anterior: 'EN_PROGRESO', valor_nuevo: 'ESPERANDO_SUPERVISION' },
      { campo: 'estado_pr', valor_anterior: null, valor_nuevo: 'PENDIENTE' },
    ]);
  });

  it('sin «Requiere PR» el estado del PR se conserva (null) y no se registra', async () => {
    const prueba = preparar();
    prueba.modificar(cambiarTarea(ENEMIGOS, { estado_pr: null, requiere_pr: false }));
    const r = await ejecutar(prueba, () =>
      enviarTareaASupervision({ idActor: DEMO, idTarea: ENEMIGOS }, prueba.entorno),
    );
    expect(r.resultado.ok && r.resultado.valor.estado_pr).toBeNull();
    expect(r.eventos[0]?.cambios.map((c) => c.campo)).toEqual(['estado']);
  });

  it.each([
    ['abierto sin conflictos', { estado: 'ABIERTO', conflictos: false }, 'CREADO'],
    ['abierto con conflictos', { estado: 'ABIERTO', conflictos: true }, 'CON_CONFLICTOS'],
    ['fusionado', { estado: 'FUSIONADO' }, 'PENDIENTE'],
    ['cerrado', { estado: 'CERRADO' }, 'CERRADO'],
  ] as const)(
    'con PR previo consulta a GitHub una vez: %s → %s, y conserva la URL',
    async (_caso, respuesta, esperado) => {
      const espia = puertoEspia(respuesta);
      const prueba = preparar(espia.github);
      prueba.modificar(cambiarTarea(ENEMIGOS, { estado_pr: 'CREADO', url_pull_request: URL_PR }));

      const r = await ejecutar(prueba, () =>
        enviarTareaASupervision({ idActor: DEMO, idTarea: ENEMIGOS }, prueba.entorno),
      );

      expect(espia.llamadas).toHaveLength(1);
      expect(espia.llamadas[0]).toMatchObject({ url_pull_request: URL_PR, estado_pr: 'CREADO' });
      expect(r.resultado.ok && r.resultado.valor).toMatchObject({
        estado_pr: esperado,
        url_pull_request: URL_PR,
      });
      const cambiosPR = r.eventos[0]?.cambios.filter((c) => c.campo === 'estado_pr');
      expect(cambiosPR).toEqual(
        esperado === 'CREADO'
          ? []
          : [{ campo: 'estado_pr', valor_anterior: 'CREADO', valor_nuevo: esperado }],
      );
    },
  );

  it('sin «Requiere supervisión» → TAREA_NO_REQUIERE_SUPERVISION; el Supervisor → ROL_NO_PERMITIDO', async () => {
    const prueba = preparar();
    const comprobar = sinEscritura(prueba);
    expect(
      await enviarTareaASupervision({ idActor: DIEGO, idTarea: JEFE }, prueba.entorno),
    ).toMatchObject({ codigo: 'TAREA_NO_REQUIERE_SUPERVISION' });
    expect(
      await enviarTareaASupervision({ idActor: SUPERVISOR, idTarea: ENEMIGOS }, prueba.entorno),
    ).toMatchObject({ codigo: 'ROL_NO_PERMITIDO' });
    comprobar();
  });
});

// ── Marcar terminada ─────────────────────────────────────────────────────────────────────────

describe('marcarTareaTerminada', () => {
  it('el responsable la termina: fecha_termino = fecha del evento, estado_pr a PENDIENTE y sin aviso', async () => {
    const prueba = preparar();
    const antes = prueba.tarea(JEFE);

    const r = await ejecutar(prueba, () =>
      marcarTareaTerminada({ idActor: DIEGO, idTarea: JEFE }, prueba.entorno),
    );

    expect(r.resultado.ok && r.resultado.valor).toEqual({
      ...antes,
      estado: 'TERMINADA',
      estado_pr: 'PENDIENTE',
      fecha_termino: AHORA_ISO,
    });
    expect(r.escrituras).toBe(1);
    expect(r.eventos[0]).toMatchObject({
      fecha: AHORA_ISO,
      autor: { tipo: 'USUARIO', id_usuario: DIEGO },
      tipo_accion: 'TAREA_TERMINADA',
      cambios: [
        { campo: 'estado', valor_anterior: 'EN_PROGRESO', valor_nuevo: 'TERMINADA' },
        { campo: 'estado_pr', valor_anterior: null, valor_nuevo: 'PENDIENTE' },
      ],
    });
    expect(prueba.tarea(JEFE).fecha_termino).toBe(r.eventos[0]?.fecha);
    expect(r.avisos).toEqual([]);
  });

  it('flujo real de la semilla: reabrir un PR fusionado y volver a terminar → PENDIENTE con la URL vieja', async () => {
    const prueba = preparar();
    const url = prueba.tarea(MOVIMIENTO).url_pull_request;
    expect(prueba.tarea(MOVIMIENTO).estado_pr).toBe('FUSIONADO');

    const reabierta = await reabrirTarea(
      { idActor: SUPERVISOR, idTarea: MOVIMIENTO, nota: 'Falla el doble salto.' },
      prueba.entorno,
    );
    expect(reabierta.ok).toBe(true);
    const r = await marcarTareaTerminada({ idActor: DIEGO, idTarea: MOVIMIENTO }, prueba.entorno);

    expect(r.ok && r.valor).toMatchObject({
      estado: 'TERMINADA',
      estado_pr: 'PENDIENTE',
      url_pull_request: url,
    });
  });

  it('con «Requiere supervisión» → TAREA_REQUIERE_SUPERVISION y no escribe', async () => {
    const prueba = preparar();
    const comprobar = sinEscritura(prueba);
    expect(
      await marcarTareaTerminada({ idActor: DEMO, idTarea: ENEMIGOS }, prueba.entorno),
    ).toMatchObject({ codigo: 'TAREA_REQUIERE_SUPERVISION' });
    comprobar();
  });
});

// ── Aprobar ──────────────────────────────────────────────────────────────────────────────────

describe('aprobarTarea', () => {
  it('el supervisor la aprueba: TERMINADA con fecha_termino, avisa al responsable y no recalcula el PR', async () => {
    const espia = puertoEspia();
    const prueba = preparar(espia.github);
    const antes = esperandoDePL2D(prueba.datos());
    const responsable = antes.id_practicante!;

    const r = await ejecutar(prueba, () =>
      aprobarTarea({ idActor: SUPERVISOR, idTarea: antes.id }, prueba.entorno),
    );

    expect(r.resultado.ok && r.resultado.valor).toEqual({
      ...antes,
      estado: 'TERMINADA',
      fecha_termino: AHORA_ISO,
    });
    expect(r.eventos[0]).toMatchObject({
      fecha: AHORA_ISO,
      autor: { tipo: 'USUARIO', id_usuario: SUPERVISOR },
      tipo_accion: 'TAREA_APROBADA',
      cambios: [
        { campo: 'estado', valor_anterior: 'ESPERANDO_SUPERVISION', valor_nuevo: 'TERMINADA' },
      ],
      nota: null,
    });
    expect(r.avisos).toHaveLength(1);
    expect(r.avisos[0]).toMatchObject({
      id_destinatario: responsable,
      tipo: 'TAREA_APROBADA',
      mensaje: expect.stringMatching(/^Aprobaron tu tarea «.+» \(PL2D-\d{3,}\)\.$/),
    });
    expect(espia.llamadas).toHaveLength(0);
  });

  it('S5: aprobar no consulta GitHub aunque la tarea tenga PR', async () => {
    const espia = puertoEspia({ estado: 'FUSIONADO' });
    const prueba = preparar(espia.github);
    const tarea = esperandoDePL2D(prueba.datos());
    prueba.modificar(cambiarTarea(tarea.id, { estado_pr: 'CREADO', url_pull_request: URL_PR }));
    const r = await aprobarTarea({ idActor: SUPERVISOR, idTarea: tarea.id }, prueba.entorno);
    expect(r.ok && r.valor.estado_pr).toBe('CREADO');
    expect(espia.llamadas).toHaveLength(0);
  });

  it('quién: el Administrador y el practicante no aprueban; el supervisor ajeno queda fuera de alcance', async () => {
    const prueba = preparar();
    const tarea = esperandoDePL2D(prueba.datos());
    const comprobar = sinEscritura(prueba);
    for (const [idActor, codigo] of [
      [ADMIN, 'ROL_NO_PERMITIDO'],
      [tarea.id_practicante!, 'ROL_NO_PERMITIDO'],
      [SUPERVISOR_AJENO, 'FUERA_DE_ALCANCE'],
    ] as const) {
      const r = await aprobarTarea({ idActor, idTarea: tarea.id }, prueba.entorno);
      expect(r, idActor).toMatchObject({ ok: false, codigo });
    }
    comprobar();
  });

  it('en un proyecto EN_PAUSA se puede aprobar', async () => {
    const prueba = preparar();
    const tarea = esperandoDePL2D(prueba.datos());
    prueba.modificar(cambiarProyecto({ estado: 'EN_PAUSA' }));
    expect(
      (await aprobarTarea({ idActor: SUPERVISOR, idTarea: tarea.id }, prueba.entorno)).ok,
    ).toBe(true);
  });
});

// ── Devolver ─────────────────────────────────────────────────────────────────────────────────

describe('devolverTarea', () => {
  it('el supervisor la devuelve con nota: EN_PROGRESO, mismo responsable, aviso y marca «Devuelta»', async () => {
    const prueba = preparar();
    const antes = esperandoDePL2D(prueba.datos());

    const r = await ejecutar(prueba, () =>
      devolverTarea(
        { idActor: SUPERVISOR, idTarea: antes.id, nota: '  Faltan las pruebas.  ' },
        prueba.entorno,
      ),
    );

    expect(r.resultado.ok && r.resultado.valor).toEqual({ ...antes, estado: 'EN_PROGRESO' });
    expect(r.eventos[0]).toMatchObject({
      tipo_accion: 'TAREA_DEVUELTA',
      cambios: [
        { campo: 'estado', valor_anterior: 'ESPERANDO_SUPERVISION', valor_nuevo: 'EN_PROGRESO' },
      ],
      nota: 'Faltan las pruebas.',
    });
    expect(r.avisos).toHaveLength(1);
    expect(r.avisos[0]).toMatchObject({
      id_destinatario: antes.id_practicante,
      tipo: 'TAREA_DEVUELTA',
      mensaje: expect.stringMatching(/con observaciones\.$/),
    });
    expect(devolucionVigente(antes.id, prueba.datos().historial)).toBe(true);
  });

  it.each([
    ['ausente', undefined],
    ['vacía', ''],
    ['solo espacios', ' \n '],
  ])('nota %s → TEXTO_OBLIGATORIO y no escribe', async (_caso, nota) => {
    const prueba = preparar();
    const tarea = esperandoDePL2D(prueba.datos());
    const comprobar = sinEscritura(prueba);
    expect(
      await devolverTarea({ idActor: SUPERVISOR, idTarea: tarea.id, nota }, prueba.entorno),
    ).toMatchObject({ codigo: 'TEXTO_OBLIGATORIO' });
    comprobar();
  });

  it('el estado va antes que el texto: tarea EN_PROGRESO con nota vacía → TRANSICION_NO_APLICA', async () => {
    const prueba = preparar();
    expect(
      await devolverTarea({ idActor: SUPERVISOR, idTarea: ENEMIGOS, nota: '' }, prueba.entorno),
    ).toMatchObject({ codigo: 'TRANSICION_NO_APLICA' });
  });

  it('D6-A: con el responsable INACTIVO, la devuelve igual, lo conserva y le avisa', async () => {
    const prueba = preparar();
    const tarea = esperandoDePL2D(prueba.datos());
    prueba.modificar(cambiarUsuario(tarea.id_practicante!, { estado: 'INACTIVO' }));
    const r = await ejecutar(prueba, () =>
      devolverTarea({ idActor: SUPERVISOR, idTarea: tarea.id, nota: 'Revisar.' }, prueba.entorno),
    );
    expect(r.resultado.ok && r.resultado.valor.id_practicante).toBe(tarea.id_practicante);
    expect(r.avisos.map((a) => a.id_destinatario)).toEqual([tarea.id_practicante]);
  });
});

// ── Reabrir ──────────────────────────────────────────────────────────────────────────────────

describe('reabrirTarea', () => {
  it.each([
    ['Supervisor', SUPERVISOR],
    ['Administrador', ADMIN],
  ])(
    '%s la reabre con nota: EN_PROGRESO, sin fecha_termino, mismo responsable y PR conservado',
    async (_rol, idActor) => {
      const prueba = preparar();
      const antes = prueba.tarea(MOVIMIENTO);

      const r = await ejecutar(prueba, () =>
        reabrirTarea(
          { idActor, idTarea: MOVIMIENTO, nota: 'Falla el doble salto.' },
          prueba.entorno,
        ),
      );

      expect(r.resultado.ok && r.resultado.valor).toEqual({
        ...antes,
        estado: 'EN_PROGRESO',
        fecha_termino: null,
      });
      expect(r.resultado.ok && r.resultado.valor).toMatchObject({
        id_practicante: DIEGO,
        estado_pr: 'FUSIONADO',
      });
      expect(r.eventos[0]).toMatchObject({
        autor: { tipo: 'USUARIO', id_usuario: idActor },
        tipo_accion: 'TAREA_REABIERTA',
        cambios: [{ campo: 'estado', valor_anterior: 'TERMINADA', valor_nuevo: 'EN_PROGRESO' }],
        nota: 'Falla el doble salto.',
      });
      expect(r.avisos).toEqual([
        aviso(
          DIEGO,
          'TAREA_REABIERTA',
          'Reabrieron tu tarea «Prototipo de movimiento del jugador» (PL2D-001).',
          MOVIMIENTO,
        ),
      ]);
    },
  );

  it('sin nota → TEXTO_OBLIGATORIO; el practicante → ROL_NO_PERMITIDO', async () => {
    const prueba = preparar();
    const comprobar = sinEscritura(prueba);
    expect(
      await reabrirTarea({ idActor: SUPERVISOR, idTarea: MOVIMIENTO }, prueba.entorno),
    ).toMatchObject({ codigo: 'TEXTO_OBLIGATORIO' });
    expect(
      await reabrirTarea({ idActor: DIEGO, idTarea: MOVIMIENTO, nota: 'x' }, prueba.entorno),
    ).toMatchObject({ codigo: 'ROL_NO_PERMITIDO' });
    comprobar();
  });

  it('el alcance va antes que el estado: supervisor ajeno en una tarea EN_PROGRESO → FUERA_DE_ALCANCE', async () => {
    const prueba = preparar();
    expect(
      await reabrirTarea(
        { idActor: SUPERVISOR_AJENO, idTarea: ENEMIGOS, nota: 'x' },
        prueba.entorno,
      ),
    ).toMatchObject({ codigo: 'FUERA_DE_ALCANCE' });
  });
});

// ── Comunes a las 7 ──────────────────────────────────────────────────────────────────────────

type Caso = {
  nombre: string;
  /** Prepara la tarea y devuelve quién actúa y sobre qué tarea, con el texto que haga falta. */
  preparar: (prueba: Prueba) => Promise<{ idActor: Id; idTarea: Id }>;
  ejecutar: (entrada: { idActor: Id; idTarea: Id }, entorno: Entorno) => Promise<Resultado<Tarea>>;
  estadoInicial: EstadoTarea;
};

const CASOS: Caso[] = [
  {
    nombre: 'tomar',
    estadoInicial: 'DISPONIBLE',
    preparar: async (p) => ({ idActor: DEMO, idTarea: (await crearDisponible(p)).id }),
    ejecutar: (e, entorno) => tomarTarea(e, entorno),
  },
  {
    nombre: 'liberar',
    estadoInicial: 'EN_PROGRESO',
    preparar: async () => ({ idActor: SUPERVISOR, idTarea: ENEMIGOS }),
    ejecutar: (e, entorno) => liberarTarea({ ...e, motivo: 'Motivo' }, entorno),
  },
  {
    nombre: 'enviar',
    estadoInicial: 'EN_PROGRESO',
    preparar: async () => ({ idActor: DEMO, idTarea: ENEMIGOS }),
    ejecutar: (e, entorno) => enviarTareaASupervision(e, entorno),
  },
  {
    nombre: 'terminar',
    estadoInicial: 'EN_PROGRESO',
    preparar: async () => ({ idActor: DIEGO, idTarea: JEFE }),
    ejecutar: (e, entorno) => marcarTareaTerminada(e, entorno),
  },
  {
    nombre: 'aprobar',
    estadoInicial: 'ESPERANDO_SUPERVISION',
    preparar: async (p) => ({ idActor: SUPERVISOR, idTarea: esperandoDePL2D(p.datos()).id }),
    ejecutar: (e, entorno) => aprobarTarea(e, entorno),
  },
  {
    nombre: 'devolver',
    estadoInicial: 'ESPERANDO_SUPERVISION',
    preparar: async (p) => ({ idActor: SUPERVISOR, idTarea: esperandoDePL2D(p.datos()).id }),
    ejecutar: (e, entorno) => devolverTarea({ ...e, nota: 'Nota' }, entorno),
  },
  {
    nombre: 'reabrir',
    estadoInicial: 'TERMINADA',
    preparar: async () => ({ idActor: SUPERVISOR, idTarea: MOVIMIENTO }),
    ejecutar: (e, entorno) => reabrirTarea({ ...e, nota: 'Nota' }, entorno),
  },
];

describe('comunes a las 7 transiciones', () => {
  it.each(CASOS.map((c) => [c.nombre, c] as const))(
    '%s: los casos preparados parten del estado de origen y funcionan',
    async (_nombre, caso) => {
      const prueba = preparar();
      const entrada = await caso.preparar(prueba);
      expect(prueba.tarea(entrada.idTarea).estado).toBe(caso.estadoInicial);
      expect((await caso.ejecutar(entrada, prueba.entorno)).ok).toBe(true);
    },
  );

  it.each(CASOS.map((c) => [c.nombre, c] as const))(
    '%s: proyecto FINALIZADO → PROYECTO_FINALIZADO y no escribe',
    async (_nombre, caso) => {
      const prueba = preparar();
      const entrada = await caso.preparar(prueba);
      prueba.modificar(cambiarProyecto({ estado: 'FINALIZADO' }));
      const comprobar = sinEscritura(prueba);
      expect(await caso.ejecutar(entrada, prueba.entorno)).toMatchObject({
        ok: false,
        codigo: 'PROYECTO_FINALIZADO',
      });
      comprobar();
    },
  );

  it.each(CASOS.map((c) => [c.nombre, c] as const))(
    '%s: quien actúa INACTIVO → USUARIO_INACTIVO y no escribe',
    async (_nombre, caso) => {
      const prueba = preparar();
      const entrada = await caso.preparar(prueba);
      prueba.modificar(cambiarUsuario(entrada.idActor, { estado: 'INACTIVO' }));
      const comprobar = sinEscritura(prueba);
      expect(await caso.ejecutar(entrada, prueba.entorno)).toMatchObject({
        ok: false,
        codigo: 'USUARIO_INACTIVO',
      });
      comprobar();
    },
  );

  it.each(CASOS.map((c) => [c.nombre, c] as const))(
    '%s: tarea o actor inexistente → NO_ENCONTRADO; ID vacío → DATOS_INVALIDOS',
    async (_nombre, caso) => {
      const prueba = preparar();
      const entrada = await caso.preparar(prueba);
      const comprobar = sinEscritura(prueba);
      expect(
        await caso.ejecutar({ ...entrada, idTarea: 'no-existe' }, prueba.entorno),
      ).toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(
        await caso.ejecutar({ ...entrada, idActor: 'fantasma' }, prueba.entorno),
      ).toMatchObject({ codigo: 'NO_ENCONTRADO' });
      expect(await caso.ejecutar({ ...entrada, idActor: '' }, prueba.entorno)).toMatchObject({
        codigo: 'DATOS_INVALIDOS',
      });
      comprobar();
    },
  );
});

describe('la marca «Devuelta con observaciones» a lo largo del ciclo', () => {
  it('liberar y volver a tomar la conservan; volver a enviar la apaga', async () => {
    const prueba = preparar();
    const vigente = () => devolucionVigente(ENEMIGOS, prueba.datos().historial);
    // Un minuto entre pasos, para que el orden del historial no dependa del desempate.
    const avanzar = (minutos: number) =>
      prueba.fijarAhora(new Date(AHORA_DE_PRUEBA.getTime() + minutos * 60_000));
    expect(vigente()).toBe(true);

    expect((await liberarTarea({ idActor: DEMO, idTarea: ENEMIGOS }, prueba.entorno)).ok).toBe(
      true,
    );
    expect(vigente()).toBe(true);
    avanzar(1);
    expect((await tomarTarea({ idActor: DEMO, idTarea: ENEMIGOS }, prueba.entorno)).ok).toBe(true);
    expect(vigente()).toBe(true);
    avanzar(2);
    expect(
      (await enviarTareaASupervision({ idActor: DEMO, idTarea: ENEMIGOS }, prueba.entorno)).ok,
    ).toBe(true);
    expect(vigente()).toBe(false);
  });
});

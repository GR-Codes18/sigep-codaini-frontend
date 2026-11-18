import { describe, expect, it } from 'vitest';
import type { CambiosAlmacen, DatosAlmacen } from '@/data';
import type { Id, Proyecto, Tarea, Usuario } from '@/domain';
import {
  GITHUB_SIMULADO,
  ramaConConflictos,
  ramaEliminada,
  ramasSimuladas,
  type PuertoGitHub,
  type SolicitudPR,
} from '../github';
import { AHORA_DE_PRUEBA, crearEntornoDePrueba } from '../pruebas/entorno';
import { MENSAJES, type Resultado } from '../resultado';
import {
  NOTA_PR_VINCULADO,
  crearPullRequest,
  listarRamasParaPullRequest,
  type EntradaCrearPullRequest,
} from './pullRequests';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const DEMO = 'demo-practicante';
const DIEGO = 'usr-pra-02';
const PL2D = 'pry-pl2d';
const REPO = 'https://github.com/org-demo/plataforma-2d';
const EFECTOS = 'tar-pl2d-006'; // de DEMO, TERMINADA, PENDIENTE y sin PR
const MENU = 'tar-pl2d-004'; // de DEMO, TERMINADA, PR CERRADO (feature/pl2d-004)
const NIVEL1 = 'tar-pl2d-005'; // TERMINADA, PR CREADO (feature/pl2d-005)
const MOVIMIENTO = 'tar-pl2d-001'; // de DIEGO, TERMINADA, PR FUSIONADO (feature/pl2d-001)
const ENEMIGOS = 'tar-pl2d-010'; // de DEMO, EN_PROGRESO
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

/** Puerto que registra las solicitudes de creación; el resto, el GitHub simulado. */
function puertoEspia() {
  const creaciones: SolicitudPR[] = [];
  const ramasPedidas: number[] = [];
  const github: PuertoGitHub = {
    ...GITHUB_SIMULADO,
    listarRamas: (repositorio) => {
      ramasPedidas.push(1);
      return GITHUB_SIMULADO.listarRamas(repositorio);
    },
    crearPullRequest: (solicitud) => {
      creaciones.push(solicitud);
      return GITHUB_SIMULADO.crearPullRequest(solicitud);
    },
  };
  return { github, creaciones, ramasPedidas };
}

function preparar(github?: PuertoGitHub) {
  const prueba = crearEntornoDePrueba({ github });
  const datos = () => prueba.almacen.getState().datos;
  const modificar = (operacion: (d: DatosAlmacen) => CambiosAlmacen) =>
    prueba.almacen.getState().transaccion(operacion);
  const tarea = (id: Id) => datos().tareas.find((t) => t.id === id)!;
  const proyecto = () => datos().proyectos.find((p) => p.id === PL2D)!;
  return { ...prueba, datos, modificar, tarea, proyecto };
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
const darDeBaja = (id: Id) => (d: DatosAlmacen) => ({
  asignaciones: d.asignaciones.map((a) =>
    a.id_practicante === id && a.id_proyecto === PL2D && a.fecha_baja === null
      ? { ...a, fecha_baja: '2026-11-16' }
      : a,
  ),
});

/** El mayor número de PR conocido de PL2D (para calcular la URL siguiente). */
function mayorPR(datos: DatosAlmacen): number {
  return Math.max(
    0,
    ...datos.tareas
      .filter((t) => t.id_proyecto === PL2D && t.url_pull_request !== null)
      .map((t) => Number(/\/pull\/(\d+)$/.exec(t.url_pull_request!)?.[1] ?? 0)),
  );
}

function entrada(cambios: Partial<EntradaCrearPullRequest> = {}): EntradaCrearPullRequest {
  return {
    idActor: DEMO,
    idTarea: EFECTOS,
    rama_origen: 'feature/pl2d-006',
    titulo: 'PL2D-006 · Efectos de sonido',
    descripcion: 'Qué cambia y cómo probarlo.',
    ...cambios,
  };
}

function sinEscritura(prueba: Prueba) {
  const datosAntes = prueba.datos();
  const escriturasAntes = prueba.escrituras();
  return () => {
    expect(prueba.datos()).toBe(datosAntes);
    expect(prueba.escrituras()).toBe(escriturasAntes);
  };
}

async function ejecutar<T>(prueba: Prueba, accion: () => Promise<Resultado<T>>) {
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

describe('la semilla tiene los casos que usan estas pruebas', () => {
  it('estados de partida', () => {
    const prueba = preparar();
    expect(prueba.tarea(EFECTOS)).toMatchObject({
      id_practicante: DEMO,
      estado: 'TERMINADA',
      requiere_pr: true,
      estado_pr: 'PENDIENTE',
      url_pull_request: null,
    });
    expect(prueba.tarea(MENU)).toMatchObject({
      id_practicante: DEMO,
      estado_pr: 'CERRADO',
      rama_origen: 'feature/pl2d-004',
    });
    expect(prueba.tarea(NIVEL1)).toMatchObject({
      estado_pr: 'CREADO',
      rama_origen: 'feature/pl2d-005',
    });
    expect(prueba.tarea(MOVIMIENTO)).toMatchObject({
      id_practicante: DIEGO,
      estado_pr: 'FUSIONADO',
      rama_origen: 'feature/pl2d-001',
    });
    expect(prueba.proyecto()).toMatchObject({ repositorio_url: REPO, rama_base: 'develop' });
  });
});

// ── Listar ramas ─────────────────────────────────────────────────────────────────────────────

describe('listarRamasParaPullRequest', () => {
  it('el practicante responsable recibe el catálogo del repositorio y no se escribe nada', async () => {
    const prueba = preparar();
    const comprobar = sinEscritura(prueba);
    const r = await listarRamasParaPullRequest({ idActor: DEMO, idTarea: EFECTOS }, prueba.entorno);
    expect(r).toEqual({ ok: true, valor: ramasSimuladas(prueba.proyecto()) });
    expect(r.ok && r.valor).toContain(ramaEliminada(prueba.proyecto()));
    comprobar();
  });

  it('mismo permiso que crear: sin él, no consulta GitHub', async () => {
    const espia = puertoEspia();
    const prueba = preparar(espia.github);
    const comprobar = sinEscritura(prueba);
    for (const [idActor, idTarea, codigo] of [
      [SUPERVISOR, EFECTOS, 'ROL_NO_PERMITIDO'],
      [ADMIN, EFECTOS, 'ROL_NO_PERMITIDO'],
      [DIEGO, EFECTOS, 'NO_ES_EL_RESPONSABLE'],
      [DEMO, ENEMIGOS, 'TAREA_SIN_ETIQUETA_PR'],
      [DIEGO, MOVIMIENTO, 'ESTADO_PR_NO_APLICA'],
      [DEMO, 'no-existe', 'NO_ENCONTRADO'],
      ['', EFECTOS, 'DATOS_INVALIDOS'],
    ] as const) {
      const r = await listarRamasParaPullRequest({ idActor, idTarea }, prueba.entorno);
      expect(r, `${idActor} ${idTarea}`).toMatchObject({ ok: false, codigo });
    }
    expect(espia.ramasPedidas).toHaveLength(0);
    comprobar();
  });
});

// ── Crear ────────────────────────────────────────────────────────────────────────────────────

describe('crearPullRequest: PR nuevo', () => {
  it('crea el PR con la URL siguiente y la rama base del proyecto, en una sola escritura y sin aviso', async () => {
    const prueba = preparar();
    const antes = prueba.tarea(EFECTOS);
    const url = `${REPO}/pull/${mayorPR(prueba.datos()) + 1}`;

    const r = await ejecutar(prueba, () => crearPullRequest(entrada(), prueba.entorno));

    const esperada = {
      ...antes,
      estado_pr: 'CREADO',
      url_pull_request: url,
      rama_origen: 'feature/pl2d-006',
      rama_base: 'develop',
    };
    expect(r.resultado).toEqual({ ok: true, valor: { tarea: esperada, vinculado: false } });
    expect(prueba.tarea(EFECTOS)).toEqual(esperada);
    expect(r.escrituras).toBe(1);
    expect(r.eventos).toEqual([
      {
        id: expect.stringMatching(/^evt-/),
        fecha: AHORA_ISO,
        autor: { tipo: 'USUARIO', id_usuario: DEMO },
        tipo_accion: 'PULL_REQUEST_CREADO',
        elemento: { tipo: 'TAREA', id: EFECTOS, etiqueta: 'PL2D-006 · Efectos de sonido' },
        id_proyecto: PL2D,
        cambios: [
          { campo: 'estado_pr', valor_anterior: 'PENDIENTE', valor_nuevo: 'CREADO' },
          { campo: 'url_pull_request', valor_anterior: null, valor_nuevo: url },
          { campo: 'rama_origen', valor_anterior: null, valor_nuevo: 'feature/pl2d-006' },
          { campo: 'rama_base', valor_anterior: null, valor_nuevo: 'develop' },
        ],
        nota: null,
      },
    ]);
    expect(r.avisos).toEqual([]);
  });

  it('desde CERRADO («Crear nuevo PR») con la misma rama: su PR cerrado no bloquea y la URL es nueva', async () => {
    const prueba = preparar();
    const antes = prueba.tarea(MENU);
    const url = `${REPO}/pull/${mayorPR(prueba.datos()) + 1}`;

    const r = await ejecutar(prueba, () =>
      crearPullRequest(entrada({ idTarea: MENU, rama_origen: 'feature/pl2d-004' }), prueba.entorno),
    );

    expect(r.resultado.ok && r.resultado.valor).toEqual({
      tarea: { ...antes, estado_pr: 'CREADO', url_pull_request: url },
      vinculado: false,
    });
    // Ramas sin cambio: no se registran.
    expect(r.eventos[0]?.cambios).toEqual([
      { campo: 'estado_pr', valor_anterior: 'CERRADO', valor_nuevo: 'CREADO' },
      { campo: 'url_pull_request', valor_anterior: antes.url_pull_request, valor_nuevo: url },
    ]);
  });

  it('el PR anterior de la propia tarea (fusionado y recalculado a PENDIENTE) no se vincula: va uno nuevo', async () => {
    const prueba = preparar();
    prueba.modificar(
      cambiarTarea(EFECTOS, {
        url_pull_request: `${REPO}/pull/90`,
        rama_origen: 'feature/pl2d-006',
        rama_base: 'develop',
      }),
    );
    const r = await crearPullRequest(entrada(), prueba.entorno);
    expect(r.ok && r.valor).toMatchObject({
      vinculado: false,
      tarea: { estado_pr: 'CREADO', url_pull_request: `${REPO}/pull/91` },
    });
  });

  it('rama y título se recortan; la rama base sale siempre del proyecto', async () => {
    const espia = puertoEspia();
    const prueba = preparar(espia.github);
    prueba.modificar(cambiarProyecto({ rama_base: 'main' }));
    const r = await crearPullRequest(
      entrada({ rama_origen: '  feature/pl2d-006 ', titulo: '  Título  ' }),
      prueba.entorno,
    );
    expect(r.ok && r.valor.tarea).toMatchObject({
      rama_origen: 'feature/pl2d-006',
      rama_base: 'main',
    });
    expect(espia.creaciones).toHaveLength(1);
    expect(espia.creaciones[0]).toMatchObject({
      rama_origen: 'feature/pl2d-006',
      titulo: 'Título',
      repositorio: { repositorio_url: REPO, rama_base: 'main', codigo: 'PL2D' },
    });
    // GitHub recibe todos los PR conocidos del proyecto, con el propio marcado.
    const prs = espia.creaciones[0]!.prs_del_proyecto;
    expect(prs.length).toBeGreaterThan(0);
    expect(prs.every((pr) => pr.url.startsWith(`${REPO}/pull/`))).toBe(true);
    expect(prs.filter((pr) => pr.propio)).toEqual([]);
  });
});

describe('crearPullRequest: caso de error preparado (P2-A)', () => {
  it('la rama eliminada da RAMA_INEXISTENTE, no escribe y la etiqueta sigue en PENDIENTE; al reintentar con otra rama, funciona', async () => {
    const prueba = preparar();
    const comprobar = sinEscritura(prueba);
    const r = await crearPullRequest(
      entrada({ rama_origen: ramaEliminada(prueba.proyecto()) }),
      prueba.entorno,
    );
    expect(r).toEqual({
      ok: false,
      codigo: 'RAMA_INEXISTENTE',
      mensaje: MENSAJES.RAMA_INEXISTENTE,
    });
    comprobar();
    expect(prueba.tarea(EFECTOS).estado_pr).toBe('PENDIENTE');

    const reintento = await crearPullRequest(entrada(), prueba.entorno);
    expect(reintento.ok && reintento.valor.tarea.estado_pr).toBe('CREADO');
  });

  it('una rama que no está en el catálogo también da RAMA_INEXISTENTE', async () => {
    const prueba = preparar();
    expect(
      await crearPullRequest(entrada({ rama_origen: 'feature/inventada' }), prueba.entorno),
    ).toMatchObject({ codigo: 'RAMA_INEXISTENTE' });
  });
});

describe('crearPullRequest: PR que ya existía (P3-A, P4-A)', () => {
  it('abierto en otra tarea: se vincula su URL, queda CREADO y el evento lo explica', async () => {
    const prueba = preparar();
    const urlAjena = prueba.tarea(NIVEL1).url_pull_request;
    const r = await ejecutar(prueba, () =>
      crearPullRequest(entrada({ rama_origen: 'feature/pl2d-005' }), prueba.entorno),
    );
    expect(r.resultado.ok && r.resultado.valor).toMatchObject({
      vinculado: true,
      tarea: { estado_pr: 'CREADO', url_pull_request: urlAjena, rama_origen: 'feature/pl2d-005' },
    });
    expect(r.eventos).toHaveLength(1);
    expect(r.eventos[0]).toMatchObject({
      tipo_accion: 'PULL_REQUEST_CREADO',
      nota: NOTA_PR_VINCULADO,
    });
    expect(r.avisos).toEqual([]);
  });

  it('fusionado en otra tarea: se vincula como FUSIONADO', async () => {
    const prueba = preparar();
    const r = await crearPullRequest(entrada({ rama_origen: 'feature/pl2d-001' }), prueba.entorno);
    expect(r.ok && r.valor).toMatchObject({
      vinculado: true,
      tarea: {
        estado_pr: 'FUSIONADO',
        url_pull_request: prueba.tarea(MOVIMIENTO).url_pull_request,
      },
    });
  });

  it('abierto con conflictos en otra tarea: se vincula y el Sistema informa los conflictos', async () => {
    const prueba = preparar();
    prueba.modificar(cambiarTarea(NIVEL1, { estado_pr: 'CON_CONFLICTOS' }));
    const r = await ejecutar(prueba, () =>
      crearPullRequest(entrada({ rama_origen: 'feature/pl2d-005' }), prueba.entorno),
    );
    expect(r.resultado.ok && r.resultado.valor).toMatchObject({
      vinculado: true,
      tarea: { estado_pr: 'CON_CONFLICTOS' },
    });
    expect(r.eventos.map((e) => e.tipo_accion)).toEqual([
      'PULL_REQUEST_CREADO',
      'PULL_REQUEST_ESTADO_ACTUALIZADO',
    ]);
  });
});

describe('crearPullRequest: conflictos al crear (P5-A)', () => {
  it('la rama con conflictos: PR creado por el practicante y, en la misma escritura, el Sistema lo pasa a CON_CONFLICTOS y le avisa', async () => {
    const prueba = preparar();
    const rama = ramaConConflictos(prueba.proyecto());

    const r = await ejecutar(prueba, () =>
      crearPullRequest(entrada({ rama_origen: rama }), prueba.entorno),
    );

    expect(r.resultado.ok && r.resultado.valor).toMatchObject({
      vinculado: false,
      tarea: { estado_pr: 'CON_CONFLICTOS', rama_origen: rama },
    });
    expect(r.escrituras).toBe(1);
    expect(r.eventos).toHaveLength(2);
    expect(r.eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: DEMO },
      tipo_accion: 'PULL_REQUEST_CREADO',
      cambios: expect.arrayContaining([
        { campo: 'estado_pr', valor_anterior: 'PENDIENTE', valor_nuevo: 'CREADO' },
      ]),
    });
    expect(r.eventos[1]).toEqual({
      id: expect.stringMatching(/^evt-/),
      fecha: AHORA_ISO,
      autor: { tipo: 'SISTEMA' },
      tipo_accion: 'PULL_REQUEST_ESTADO_ACTUALIZADO',
      elemento: { tipo: 'TAREA', id: EFECTOS, etiqueta: 'PL2D-006 · Efectos de sonido' },
      id_proyecto: PL2D,
      cambios: [{ campo: 'estado_pr', valor_anterior: 'CREADO', valor_nuevo: 'CON_CONFLICTOS' }],
      nota: null,
    });
    expect(r.avisos).toEqual([
      {
        id: expect.stringMatching(/^ntf-/),
        id_destinatario: DEMO,
        tipo: 'PULL_REQUEST_CON_CONFLICTOS',
        mensaje: 'El Pull Request de «Efectos de sonido» (PL2D-006) tiene conflictos.',
        elemento: { tipo: 'TAREA', id: EFECTOS },
        fecha: AHORA_ISO,
        leida: false,
      },
    ]);
  });
});

describe('crearPullRequest: errores y orden de comprobación', () => {
  it('quién: Administrador y Supervisor no crean; otro practicante no es el responsable; con baja, fuera de alcance. GitHub no se consulta', async () => {
    const espia = puertoEspia();
    const prueba = preparar(espia.github);
    const comprobar = sinEscritura(prueba);
    for (const [idActor, codigo] of [
      [ADMIN, 'ROL_NO_PERMITIDO'],
      [SUPERVISOR, 'ROL_NO_PERMITIDO'],
      [DIEGO, 'NO_ES_EL_RESPONSABLE'],
    ] as const) {
      expect(await crearPullRequest(entrada({ idActor }), prueba.entorno), idActor).toMatchObject({
        ok: false,
        codigo,
      });
    }
    comprobar();
    prueba.modificar(darDeBaja(DEMO));
    expect(await crearPullRequest(entrada(), prueba.entorno)).toMatchObject({
      codigo: 'FUERA_DE_ALCANCE',
    });
    expect(espia.creaciones).toHaveLength(0);
  });

  it('estado: tarea EN_PROGRESO, sin «Requiere PR» o con un PR abierto o fusionado. GitHub no se consulta', async () => {
    const espia = puertoEspia();
    const prueba = preparar(espia.github);
    expect(await crearPullRequest(entrada({ idTarea: ENEMIGOS }), prueba.entorno)).toMatchObject({
      codigo: 'TAREA_SIN_ETIQUETA_PR',
    });
    expect(
      await crearPullRequest(entrada({ idActor: DIEGO, idTarea: MOVIMIENTO }), prueba.entorno),
    ).toMatchObject({ codigo: 'ESTADO_PR_NO_APLICA' });
    prueba.modificar(cambiarTarea(EFECTOS, { requiere_pr: false }));
    expect(await crearPullRequest(entrada(), prueba.entorno)).toMatchObject({
      codigo: 'TAREA_NO_REQUIERE_PR',
    });
    prueba.modificar(
      cambiarTarea(EFECTOS, {
        requiere_pr: true,
        estado_pr: 'CREADO',
        url_pull_request: `${REPO}/pull/80`,
      }),
    );
    expect(await crearPullRequest(entrada(), prueba.entorno)).toMatchObject({
      codigo: 'ESTADO_PR_NO_APLICA',
    });
    expect(espia.creaciones).toHaveLength(0);
  });

  it('FINALIZADO, INACTIVO, inexistentes y datos inválidos', async () => {
    const prueba = preparar();
    const comprobar = sinEscritura(prueba);
    expect(await crearPullRequest(entrada({ idTarea: 'no-existe' }), prueba.entorno)).toMatchObject(
      {
        codigo: 'NO_ENCONTRADO',
      },
    );
    expect(await crearPullRequest(entrada({ idActor: 'fantasma' }), prueba.entorno)).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    const invalida = await crearPullRequest(
      entrada({ rama_origen: '   ', titulo: '' }),
      prueba.entorno,
    );
    expect(invalida).toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    expect(!invalida.ok && Object.keys(invalida.campos ?? {}).sort()).toEqual([
      'rama_origen',
      'titulo',
    ]);
    comprobar();

    prueba.modificar(cambiarProyecto({ estado: 'FINALIZADO' }));
    expect(await crearPullRequest(entrada(), prueba.entorno)).toMatchObject({
      codigo: 'PROYECTO_FINALIZADO',
    });
    prueba.modificar(cambiarProyecto({ estado: 'ACTIVO' }));
    prueba.modificar(cambiarUsuario(DEMO, { estado: 'INACTIVO' }));
    expect(await crearPullRequest(entrada(), prueba.entorno)).toMatchObject({
      codigo: 'USUARIO_INACTIVO',
    });
  });

  it('en un proyecto EN_PAUSA se puede crear el PR', async () => {
    const prueba = preparar();
    prueba.modificar(cambiarProyecto({ estado: 'EN_PAUSA' }));
    expect((await crearPullRequest(entrada(), prueba.entorno)).ok).toBe(true);
  });
});

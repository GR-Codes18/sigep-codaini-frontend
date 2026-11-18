import { describe, expect, it } from 'vitest';
import {
  accionesDeTarea,
  diasEsperando,
  type EventoHistorial,
  type Id,
  type Tarea,
} from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import type { Resultado } from '../resultado';
import {
  listarMiHistorial,
  listarMisTareasEnCurso,
  listarPullRequestsPorAtender,
  listarTareas,
  obtenerTarea,
} from './tareas';

// Semilla en AHORA_DE_PRUEBA (martes 17 de noviembre de 2026, 13:30 en Perú).
const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // pry-pl2d y pry-rsv
const SUPERVISOR_2 = 'usr-sup-02'; // pry-tie (finalizado) y pry-dat
const SUPERVISOR_3 = 'usr-sup-03'; // pry-inv (en pausa)
const PRACTICANTE = 'demo-practicante'; // solo pry-pl2d
const PRA_CON_BAJA = 'usr-pra-03'; // pry-pl2d vigente; pry-tie con baja
const PRA_EN_FINALIZADO = 'usr-pra-15'; // asignación vigente en pry-tie (finalizado)
const PRA_CINCO_EN_CURSO = 'usr-pra-04'; // 008, 013, 014 y 016 en progreso en PL2D
const PRA_CON_PR_CONFLICTOS = 'usr-pra-02'; // 015 con conflictos
const PRA_PRACTICA_FINALIZADA = 'usr-pra-19'; // INACTIVO
const PRA_SIN_PROYECTO = 'usr-pra-21';

const PL2D = 'pry-pl2d';
const RSV = 'pry-rsv';
const TIE = 'pry-tie';

function valor<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(`${resultado.codigo}: ${resultado.mensaje}`);
  return resultado.valor;
}

function codigo(resultado: Resultado<unknown>): string {
  if (resultado.ok) throw new Error('Se esperaba un error y la consulta tuvo éxito.');
  return resultado.codigo;
}

const ids = (filas: readonly { id: Id }[]) => filas.map((f) => f.id);

function desactivar(prueba: PruebaPreparada, idUsuario: Id) {
  prueba.modificar((d) => ({
    usuarios: d.usuarios.map((u) => (u.id === idUsuario ? { ...u, estado: 'INACTIVO' } : u)),
  }));
}

function cambiarTarea(prueba: PruebaPreparada, idTarea: Id, cambios: Partial<Tarea>) {
  prueba.modificar((d) => ({
    tareas: d.tareas.map((t) => (t.id === idTarea ? { ...t, ...cambios } : t)),
  }));
}

function devolver(
  prueba: PruebaPreparada,
  idTarea: Id,
  idProyecto: Id,
  nota: string | null,
  fecha = '2026-11-17T17:00:00.000Z',
) {
  const evento: EventoHistorial = {
    id: `evt-dev-${idTarea}-${fecha}`,
    fecha,
    autor: { tipo: 'USUARIO', id_usuario: SUPERVISOR },
    tipo_accion: 'TAREA_DEVUELTA',
    elemento: { tipo: 'TAREA', id: idTarea, etiqueta: idTarea },
    id_proyecto: idProyecto,
    cambios: [],
    nota,
  };
  prueba.modificar((d) => ({ historial: [...d.historial, evento] }));
}

// ── Reglas comunes ───────────────────────────────────────────────────────────────────────────

type Llamada = (p: PruebaPreparada, idActor: Id) => Promise<Resultado<unknown>>;

const CONSULTAS: ReadonlyArray<{ nombre: string; llamar: Llamada; exito: Id }> = [
  {
    nombre: 'listarTareas',
    llamar: (p, idActor) => listarTareas({ idActor }, p.entorno),
    exito: ADMIN,
  },
  {
    nombre: 'obtenerTarea',
    llamar: (p, idActor) => obtenerTarea({ idActor, idTarea: 'tar-pl2d-017' }, p.entorno),
    exito: SUPERVISOR,
  },
  {
    nombre: 'listarMiHistorial',
    llamar: (p, idActor) => listarMiHistorial({ idActor }, p.entorno),
    exito: PRACTICANTE,
  },
  {
    nombre: 'listarMisTareasEnCurso',
    llamar: (p, idActor) => listarMisTareasEnCurso({ idActor }, p.entorno),
    exito: PRACTICANTE,
  },
  {
    nombre: 'listarPullRequestsPorAtender',
    llamar: (p, idActor) => listarPullRequestsPorAtender({ idActor }, p.entorno),
    exito: PRACTICANTE,
  },
];

describe.each(CONSULTAS)('$nombre · reglas comunes', ({ llamar, exito }) => {
  it('con un actor dentro del alcance tiene éxito y no escribe', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    expect((await llamar(prueba, exito)).ok).toBe(true);
    comprobar();
  });

  it('un actor inexistente da NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    expect(codigo(await llamar(prueba, 'no-existe'))).toBe('NO_ENCONTRADO');
    comprobar();
  });

  it('un actor INACTIVO da USUARIO_INACTIVO, sea cual sea su rol', async () => {
    for (const idActor of [ADMIN, SUPERVISOR, PRACTICANTE]) {
      const prueba = prepararPrueba();
      desactivar(prueba, idActor);
      const comprobar = sinEscritura(prueba);

      expect(codigo(await llamar(prueba, idActor)), idActor).toBe('USUARIO_INACTIVO');
      comprobar();
    }
  });

  it('un identificador vacío da DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await llamar(prueba, ''))).toBe('DATOS_INVALIDOS');
  });
});

describe.each(
  CONSULTAS.filter((c) => c.nombre.startsWith('listarMi') || c.nombre.endsWith('Atender')),
)('$nombre · solo Practicante', ({ llamar }) => {
  it('el Administrador y el Supervisor reciben ROL_NO_PERMITIDO', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await llamar(prueba, ADMIN))).toBe('ROL_NO_PERMITIDO');
    expect(codigo(await llamar(prueba, SUPERVISOR))).toBe('ROL_NO_PERMITIDO');
  });

  it('un practicante con la práctica finalizada (INACTIVO) no accede', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await llamar(prueba, PRA_PRACTICA_FINALIZADA))).toBe('USUARIO_INACTIVO');
  });

  it('un practicante sin proyectos recibe un éxito con la lista vacía', async () => {
    const prueba = prepararPrueba();

    const r = valor(await llamar(prueba, PRA_SIN_PROYECTO)) as { tareas: unknown[] };

    expect(r.tareas).toEqual([]);
  });
});

// ── listarTareas ─────────────────────────────────────────────────────────────────────────────

describe('listarTareas', () => {
  const listar = (p: PruebaPreparada, idActor: Id) => listarTareas({ idActor }, p.entorno);

  it('el Administrador ve las 43 tareas, con los contadores de las pestañas', async () => {
    const prueba = prepararPrueba();

    const { tareas, contadores } = valor(await listar(prueba, ADMIN));

    expect(tareas).toHaveLength(43);
    expect(contadores).toEqual({
      TODAS: 43,
      DISPONIBLE: 10,
      EN_PROGRESO: 11,
      ESPERANDO_SUPERVISION: 5,
      TERMINADA: 17,
    });
  });

  it('el Supervisor ve solo las tareas de sus proyectos', async () => {
    const prueba = prepararPrueba();

    const demo = valor(await listar(prueba, SUPERVISOR));
    expect(demo.tareas).toHaveLength(29);
    expect(new Set(demo.tareas.map((t) => t.proyecto.id))).toEqual(new Set([PL2D, RSV]));
    expect(demo.contadores).toEqual({
      TODAS: 29,
      DISPONIBLE: 5,
      EN_PROGRESO: 10,
      ESPERANDO_SUPERVISION: 4,
      TERMINADA: 10,
    });

    const otro = valor(await listar(prueba, SUPERVISOR_2));
    expect(new Set(otro.tareas.map((t) => t.proyecto.codigo))).toEqual(new Set(['TIE', 'DAT']));
    expect(otro.tareas).toHaveLength(10);
    expect(valor(await listar(prueba, SUPERVISOR_3)).tareas).toHaveLength(4);
  });

  it('un Supervisor sin proyectos recibe un éxito vacío', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      usuarios: [
        ...d.usuarios,
        {
          id: 'sup-nuevo',
          nombre: 'Supervisor Nuevo',
          correo: 'nuevo@codaini.test',
          celular: '900000000',
          contrasena: 'temporal-123',
          rol: 'SUPERVISOR',
          estado: 'ACTIVO',
          debe_cambiar_contrasena: true,
          fecha_alta: '2026-11-16T15:00:00.000Z',
        },
      ],
    }));

    expect(valor(await listar(prueba, 'sup-nuevo'))).toEqual({
      tareas: [],
      contadores: {
        TODAS: 0,
        DISPONIBLE: 0,
        EN_PROGRESO: 0,
        ESPERANDO_SUPERVISION: 0,
        TERMINADA: 0,
      },
    });
  });

  it('el Practicante ve el tablero completo de su proyecto y nada de los demás', async () => {
    const prueba = prepararPrueba();

    const { tareas } = valor(await listar(prueba, PRACTICANTE));

    expect(tareas).toHaveLength(20);
    expect(tareas.every((t) => t.proyecto.id === PL2D)).toBe(true);
  });

  it('el Practicante ve además las que tuvo a su cargo en un proyecto del que salió', async () => {
    const prueba = prepararPrueba();

    const { tareas } = valor(await listar(prueba, PRA_CON_BAJA));

    // PL2D (vigente) más su tarea terminada en TIE; el resto de TIE (finalizado) no.
    expect(tareas).toHaveLength(21);
    expect(tareas.filter((t) => t.proyecto.id === TIE).map((t) => t.id)).toEqual(['tar-tie-004']);
  });

  it('quien sigue asignado a un proyecto finalizado solo ve sus propias tareas', async () => {
    const prueba = prepararPrueba();

    const { tareas } = valor(await listar(prueba, PRA_EN_FINALIZADO));

    expect(ids(tareas)).toEqual(['tar-tie-001']);
    expect(tareas[0]!.es_mia).toBe(true);
  });

  it('va por código de proyecto y número', async () => {
    const prueba = prepararPrueba();

    const { tareas } = valor(await listar(prueba, ADMIN));
    const orden = tareas.map((t) => `${t.proyecto.codigo}|${String(t.numero).padStart(6, '0')}`);

    expect([...orden].sort()).toEqual(orden);
    expect(tareas[0]!.id_legible.startsWith('DAT-')).toBe(true);
  });

  it('cada fila trae ID legible, proyecto, responsable, vencida y etiqueta de PR visible', async () => {
    const prueba = prepararPrueba();

    const { tareas } = valor(await listar(prueba, SUPERVISOR));
    const por = (id: Id) => tareas.find((t) => t.id === id)!;

    expect(por('tar-pl2d-009')).toMatchObject({
      id_legible: 'PL2D-009',
      proyecto: { id: PL2D, codigo: 'PL2D', nombre: 'Plataforma 2D: Aventura Andina' },
      vencida: true,
    });
    expect(por('tar-pl2d-010').responsable).toBe('Practicante Demo');
    expect(por('tar-pl2d-019')).toMatchObject({ responsable: null, id_practicante: null });
    expect(por('tar-pl2d-006').etiqueta_pr_visible).toBe('PENDIENTE');
    expect(por('tar-pl2d-010').etiqueta_pr_visible).toBeNull();
    expect(por('tar-pl2d-002').etiqueta_pr_visible).toBeNull();
  });

  it('«días esperando» solo en las tareas esperando supervisión', async () => {
    const prueba = prepararPrueba();

    const { tareas } = valor(await listar(prueba, ADMIN));
    const conDias = tareas.filter((t) => t.dias_esperando !== null);

    expect(conDias.every((t) => t.estado === 'ESPERANDO_SUPERVISION')).toBe(true);
    expect(Object.fromEntries(conDias.map((t) => [t.id, t.dias_esperando]))).toEqual({
      'tar-pl2d-015': 2,
      'tar-pl2d-017': 1,
      'tar-rsv-005': 8,
      'tar-rsv-006': 9,
      'tar-inv-003': 13,
    });
  });

  it('«días esperando» coincide con la regla de domain/', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();

    const { tareas } = valor(await listar(prueba, ADMIN));

    for (const fila of tareas) {
      const tarea = datos.tareas.find((t) => t.id === fila.id)!;
      expect(fila.dias_esperando, fila.id).toBe(
        diasEsperando(tarea, datos.historial, prueba.entorno.ahora().toISOString()),
      );
    }
  });

  it('«Devuelta con observaciones»: el Practicante la ve solo en las suyas', async () => {
    const prueba = prepararPrueba();
    devolver(prueba, 'tar-pl2d-011', PL2D, 'Revisa los casos de borde.'); // de usr-pra-02

    const comoPracticante = valor(await listar(prueba, PRACTICANTE)).tareas;
    const comoSupervisor = valor(await listar(prueba, SUPERVISOR)).tareas;
    const devueltas = (t: typeof comoSupervisor) => ids(t.filter((x) => x.devuelta)).sort();

    expect(devueltas(comoSupervisor)).toEqual(['tar-pl2d-010', 'tar-pl2d-011']);
    expect(devueltas(comoPracticante)).toEqual(['tar-pl2d-010']);
  });

  it('las filas no traen correo ni celular de nadie', async () => {
    const prueba = prepararPrueba();

    const texto = JSON.stringify(valor(await listar(prueba, PRACTICANTE)));

    for (const u of prueba.datos().usuarios) {
      expect(texto, u.id).not.toContain(u.correo);
      expect(texto, u.id).not.toContain(u.celular);
    }
  });

  it('las tareas de un proyecto reasignado dejan de verse para el Supervisor anterior', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      proyectos: d.proyectos.map((p) => (p.id === RSV ? { ...p, id_supervisor: SUPERVISOR_3 } : p)),
    }));

    expect(valor(await listar(prueba, SUPERVISOR)).tareas).toHaveLength(20);
    expect(valor(await listar(prueba, SUPERVISOR_3)).tareas).toHaveLength(13);
  });
});

// ── obtenerTarea ─────────────────────────────────────────────────────────────────────────────

describe('obtenerTarea', () => {
  const obtener = (p: PruebaPreparada, idActor: Id, idTarea: Id) =>
    obtenerTarea({ idActor, idTarea }, p.entorno);

  it('una tarea inexistente da NO_ENCONTRADO, también para el Administrador', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await obtener(prueba, ADMIN, 'no-existe'))).toBe('NO_ENCONTRADO');
    expect(codigo(await obtener(prueba, PRACTICANTE, 'no-existe'))).toBe('NO_ENCONTRADO');
  });

  it('trae los datos de la tarea, su proyecto, su responsable y su ID legible', async () => {
    const prueba = prepararPrueba();

    const t = valor(await obtener(prueba, SUPERVISOR, 'tar-pl2d-017'));

    expect(t).toMatchObject({
      id: 'tar-pl2d-017',
      id_legible: 'PL2D-017',
      estado: 'ESPERANDO_SUPERVISION',
      requiere_supervision: true,
      requiere_pr: true,
      proyecto: { id: PL2D, codigo: 'PL2D', estado: 'ACTIVO' },
      responsable: { id: PRACTICANTE, nombre: 'Practicante Demo' },
      es_mia: false,
      dias_esperando: 1,
      vencida: false,
    });
    expect(t.descripcion.length).toBeGreaterThan(0);
  });

  it('un Supervisor ajeno recibe FUERA_DE_ALCANCE', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await obtener(prueba, SUPERVISOR_2, 'tar-pl2d-017'))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await obtener(prueba, SUPERVISOR, 'tar-tie-001'))).toBe('FUERA_DE_ALCANCE');
  });

  it('un Practicante ajeno al proyecto recibe FUERA_DE_ALCANCE', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await obtener(prueba, PRACTICANTE, 'tar-rsv-006'))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await obtener(prueba, PRA_SIN_PROYECTO, 'tar-pl2d-017'))).toBe(
      'FUERA_DE_ALCANCE',
    );
  });

  it('las acciones son las de domain/ para quien consulta', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();
    const tarea = datos.tareas.find((t) => t.id === 'tar-pl2d-017')!;
    const proyecto = datos.proyectos.find((p) => p.id === PL2D)!;

    for (const idActor of [ADMIN, SUPERVISOR, PRACTICANTE]) {
      const actor = datos.usuarios.find((u) => u.id === idActor)!;
      const asignaciones = datos.asignaciones.filter((a) => a.id_practicante === idActor);

      const t = valor(await obtener(prueba, idActor, 'tar-pl2d-017'));

      expect(t.acciones, idActor).toEqual(
        accionesDeTarea(tarea, actor, { proyecto, asignaciones }),
      );
    }
  });

  it('el Supervisor puede aprobar y devolver una tarea esperando; el Practicante, crear el PR', async () => {
    const prueba = prepararPrueba();

    const comoSupervisor = valor(await obtener(prueba, SUPERVISOR, 'tar-pl2d-017'));
    const comoPracticante = valor(await obtener(prueba, PRACTICANTE, 'tar-pl2d-017'));
    const comoAdmin = valor(await obtener(prueba, ADMIN, 'tar-pl2d-017'));

    expect(comoSupervisor.acciones.map((a) => a.accion)).toEqual(
      expect.arrayContaining(['APROBAR', 'DEVOLVER']),
    );
    expect(comoSupervisor.acciones.find((a) => a.accion === 'DEVOLVER')?.exige_texto).toBe('NOTA');
    expect(comoPracticante.acciones.map((a) => a.accion)).toContain('CREAR_PULL_REQUEST');
    expect(comoPracticante.acciones.map((a) => a.accion)).not.toContain('APROBAR');
    // El Administrador no aprueba ni devuelve.
    expect(comoAdmin.acciones.map((a) => a.accion)).not.toContain('APROBAR');
    expect(comoSupervisor.solo_lectura).toBe(false);
  });

  it('la tarea de un compañero es de solo lectura: sin acciones', async () => {
    const prueba = prepararPrueba();

    const t = valor(await obtener(prueba, PRACTICANTE, 'tar-pl2d-011'));

    expect(t).toMatchObject({ acciones: [], solo_lectura: true, es_mia: false });
  });

  it('en un proyecto finalizado nadie tiene acciones y el detalle es de solo lectura', async () => {
    const prueba = prepararPrueba();

    for (const idActor of [ADMIN, SUPERVISOR_2, PRA_EN_FINALIZADO]) {
      const t = valor(await obtener(prueba, idActor, 'tar-tie-001'));
      expect(t.acciones, idActor).toEqual([]);
      expect(t.solo_lectura, idActor).toBe(true);
    }
  });

  it('el responsable abre su tarea de un proyecto finalizado o del que salió, y no las de otros', async () => {
    const prueba = prepararPrueba();

    expect(valor(await obtener(prueba, PRA_CON_BAJA, 'tar-tie-004')).es_mia).toBe(true);
    expect(codigo(await obtener(prueba, PRA_CON_BAJA, 'tar-tie-001'))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await obtener(prueba, PRA_EN_FINALIZADO, 'tar-tie-002'))).toBe(
      'FUERA_DE_ALCANCE',
    );
  });

  it('un proyecto en pausa: el Supervisor aún puede aprobar, el Practicante no puede tomar', async () => {
    const prueba = prepararPrueba();

    const supervisor = valor(await obtener(prueba, SUPERVISOR_3, 'tar-inv-003'));
    const disponible = valor(await obtener(prueba, 'usr-pra-09', 'tar-inv-001'));

    expect(supervisor.acciones.map((a) => a.accion)).toContain('APROBAR');
    expect(disponible.acciones.map((a) => a.accion)).not.toContain('TOMAR');
  });

  it('«Devuelta con observaciones» y su nota: el dueño y el supervisor las ven; un compañero no', async () => {
    const prueba = prepararPrueba();
    devolver(prueba, 'tar-pl2d-010', PL2D, 'Nota de prueba.'); // de demo-practicante
    devolver(prueba, 'tar-pl2d-011', PL2D, 'Revisa los casos de borde.'); // de usr-pra-02

    const propia = valor(await obtener(prueba, PRACTICANTE, 'tar-pl2d-010'));
    const ajena = valor(await obtener(prueba, PRACTICANTE, 'tar-pl2d-011'));
    const comoSupervisor = valor(await obtener(prueba, SUPERVISOR, 'tar-pl2d-011'));

    expect(propia).toMatchObject({ devuelta: true, observacion: 'Nota de prueba.' });
    expect(ajena).toMatchObject({ devuelta: false, observacion: null });
    expect(comoSupervisor).toMatchObject({
      devuelta: true,
      observacion: 'Revisa los casos de borde.',
    });
    // La nota sigue visible en la línea de tiempo de la tarea (§6.7: se muestra en cualquier detalle que pueda abrir).
    expect(ajena.eventos.some((e) => e.evento.nota === 'Revisa los casos de borde.')).toBe(true);
  });

  it('sin devolución vigente la observación es null', async () => {
    const prueba = prepararPrueba();

    expect(valor(await obtener(prueba, SUPERVISOR, 'tar-pl2d-017'))).toMatchObject({
      devuelta: false,
      observacion: null,
    });
  });

  it('los datos del PR salen solo con la etiqueta visible', async () => {
    const prueba = prepararPrueba();

    const creado = valor(await obtener(prueba, SUPERVISOR, 'tar-pl2d-005'));
    const enProgreso = valor(await obtener(prueba, SUPERVISOR, 'tar-pl2d-010'));
    const sinPR = valor(await obtener(prueba, SUPERVISOR, 'tar-pl2d-002'));

    expect(creado.pull_request).toEqual({
      etiqueta: 'CREADO',
      url: 'https://github.com/org-demo/plataforma-2d/pull/4',
      rama_origen: 'feature/pl2d-005',
      rama_base: expect.any(String),
    });
    // Con la tarea en progreso o sin «Requiere PR» la etiqueta no se muestra (§7.3).
    expect(enProgreso.pull_request).toBeNull();
    expect(sinPR.pull_request).toBeNull();
  });

  it('con la etiqueta «Pendiente» no se ofrece la URL de un PR anterior', async () => {
    const prueba = prepararPrueba();
    cambiarTarea(prueba, 'tar-pl2d-017', {
      url_pull_request: 'https://github.com/org-demo/plataforma-2d/pull/9',
      rama_origen: 'feature/pl2d-017',
    });

    const t = valor(await obtener(prueba, SUPERVISOR, 'tar-pl2d-017'));

    expect(t.pull_request).toMatchObject({ etiqueta: 'PENDIENTE', url: null });
  });

  it('la línea de tiempo trae solo los eventos de la tarea, del más reciente al más antiguo, con autor', async () => {
    const prueba = prepararPrueba();

    const t = valor(await obtener(prueba, SUPERVISOR, 'tar-pl2d-004'));
    const fechas = t.eventos.map((e) => Date.parse(e.evento.fecha));

    expect(t.eventos).toHaveLength(5);
    expect(t.eventos.every((e) => e.evento.elemento.id === 'tar-pl2d-004')).toBe(true);
    expect([...fechas].sort((a, b) => b - a)).toEqual(fechas);
    expect(t.eventos.every((e) => e.autor_nombre.length > 0)).toBe(true);
  });

  it('el Practicante ve toda la línea de tiempo de la tarea ajena que puede abrir, sin datos personales', async () => {
    const prueba = prepararPrueba();

    const comoAdmin = valor(await obtener(prueba, ADMIN, 'tar-pl2d-011'));
    const comoPracticante = valor(await obtener(prueba, PRACTICANTE, 'tar-pl2d-011'));

    expect(comoPracticante.eventos).toEqual(comoAdmin.eventos);
    expect(comoPracticante.eventos.length).toBeGreaterThan(0);
    const texto = JSON.stringify(comoPracticante);
    for (const u of prueba.datos().usuarios) {
      expect(texto, u.id).not.toContain(u.correo);
      expect(texto, u.id).not.toContain(u.celular);
    }
  });

  it('la línea de tiempo no mezcla eventos de otras tareas ni de cuentas', async () => {
    const prueba = prepararPrueba();

    const t = valor(await obtener(prueba, ADMIN, 'tar-pl2d-010'));

    expect(t.eventos.every((e) => e.evento.elemento.tipo === 'TAREA')).toBe(true);
    expect(t.eventos.every((e) => e.evento.elemento.id === 'tar-pl2d-010')).toBe(true);
  });

  it('«vencida» sigue la regla: vence hoy aún no lo está', async () => {
    const prueba = prepararPrueba();

    expect(valor(await obtener(prueba, ADMIN, 'tar-pl2d-009')).vencida).toBe(true);
    expect(valor(await obtener(prueba, ADMIN, 'tar-pl2d-020')).vencida).toBe(false);
  });
});

// ── listarMiHistorial ────────────────────────────────────────────────────────────────────────

describe('listarMiHistorial', () => {
  const historial = (p: PruebaPreparada, idActor: Id, id_proyecto?: Id) =>
    listarMiHistorial({ idActor, id_proyecto }, p.entorno);

  it('trae las tareas que terminó, de la más reciente a la más antigua', async () => {
    const prueba = prepararPrueba();

    const r = valor(await historial(prueba, PRACTICANTE));

    expect(ids(r.tareas)).toEqual(['tar-pl2d-006', 'tar-pl2d-004']);
    expect(r.tareas[0]).toMatchObject({
      id_legible: 'PL2D-006',
      proyecto: { id: PL2D, codigo: 'PL2D' },
      veces_devuelta: 0,
      etiqueta_pr_visible: 'PENDIENTE',
    });
    expect(r.proyectos).toEqual([
      { id: PL2D, codigo: 'PL2D', nombre: 'Plataforma 2D: Aventura Andina' },
    ]);
  });

  it('incluye los proyectos anteriores y no las tareas de otras personas', async () => {
    const prueba = prepararPrueba();

    const r = valor(await historial(prueba, PRA_CON_BAJA));

    expect(ids(r.tareas)).toEqual(['tar-pl2d-002', 'tar-tie-004']);
    expect(r.tareas.every((t) => t.es_mia)).toBe(true);
    expect(r.proyectos.map((p) => p.id)).toEqual([PL2D, TIE]);
  });

  it('quien sigue asignado a un proyecto finalizado conserva sus terminadas', async () => {
    const prueba = prepararPrueba();

    expect(ids(valor(await historial(prueba, PRA_EN_FINALIZADO)).tareas)).toEqual(['tar-tie-001']);
  });

  it('el filtro por proyecto deja solo ese proyecto, también uno anterior', async () => {
    const prueba = prepararPrueba();

    expect(ids(valor(await historial(prueba, PRA_CON_BAJA, TIE)).tareas)).toEqual(['tar-tie-004']);
    expect(ids(valor(await historial(prueba, PRA_CON_BAJA, PL2D)).tareas)).toEqual([
      'tar-pl2d-002',
    ]);
  });

  it('filtrar por un proyecto en el que nunca estuvo da FUERA_DE_ALCANCE; uno inexistente, NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await historial(prueba, PRACTICANTE, RSV))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await historial(prueba, PRACTICANTE, 'no-existe'))).toBe('NO_ENCONTRADO');
    expect(codigo(await historial(prueba, PRACTICANTE, ''))).toBe('DATOS_INVALIDOS');
  });

  it('cuenta las veces que se la devolvieron', async () => {
    const prueba = prepararPrueba();
    devolver(prueba, 'tar-pl2d-004', PL2D, 'Primera.', '2026-10-25T12:00:00.000Z');
    devolver(prueba, 'tar-pl2d-004', PL2D, 'Segunda.', '2026-10-26T12:00:00.000Z');

    const r = valor(await historial(prueba, PRACTICANTE));

    expect(r.tareas.find((t) => t.id === 'tar-pl2d-004')!.veces_devuelta).toBe(2);
    expect(r.tareas.find((t) => t.id === 'tar-pl2d-006')!.veces_devuelta).toBe(0);
  });

  it('una tarea reabierta sale mientras está en progreso y vuelve al terminarse', async () => {
    const prueba = prepararPrueba();
    cambiarTarea(prueba, 'tar-pl2d-004', { estado: 'EN_PROGRESO', fecha_termino: null });

    expect(ids(valor(await historial(prueba, PRACTICANTE)).tareas)).toEqual(['tar-pl2d-006']);

    cambiarTarea(prueba, 'tar-pl2d-004', {
      estado: 'TERMINADA',
      fecha_termino: '2026-11-17T12:00:00.000Z',
    });

    expect(ids(valor(await historial(prueba, PRACTICANTE)).tareas)).toEqual([
      'tar-pl2d-004',
      'tar-pl2d-006',
    ]);
  });

  it('una tarea liberada no aparece', async () => {
    const prueba = prepararPrueba();
    cambiarTarea(prueba, 'tar-pl2d-006', {
      estado: 'DISPONIBLE',
      id_practicante: null,
      fecha_termino: null,
    });

    expect(ids(valor(await historial(prueba, PRACTICANTE)).tareas)).toEqual(['tar-pl2d-004']);
  });

  it('un practicante sin terminadas recibe la lista vacía y sus proyectos', async () => {
    const prueba = prepararPrueba();
    cambiarTarea(prueba, 'tar-pl2d-004', {
      estado: 'DISPONIBLE',
      id_practicante: null,
      fecha_termino: null,
    });
    cambiarTarea(prueba, 'tar-pl2d-006', {
      estado: 'DISPONIBLE',
      id_practicante: null,
      fecha_termino: null,
    });

    const r = valor(await historial(prueba, PRACTICANTE));

    expect(r.tareas).toEqual([]);
    expect(r.proyectos.map((p) => p.id)).toEqual([PL2D]);
  });
});

// ── listarMisTareasEnCurso ───────────────────────────────────────────────────────────────────

describe('listarMisTareasEnCurso', () => {
  const enCurso = (p: PruebaPreparada, idActor: Id) =>
    listarMisTareasEnCurso({ idActor }, p.entorno);

  it('trae sus tareas en progreso, con la devuelta primero', async () => {
    const prueba = prepararPrueba();

    const { tareas } = valor(await enCurso(prueba, PRACTICANTE));

    expect(ids(tareas)).toEqual(['tar-pl2d-010']);
    expect(tareas[0]).toMatchObject({
      id_legible: 'PL2D-010',
      proyecto: { codigo: 'PL2D' },
      devuelta: true,
      es_mia: true,
    });
  });

  it('el orden es: devueltas, vencidas y luego fecha límite', async () => {
    const prueba = prepararPrueba();

    // 008 (23/11), 013 (26/11), 014 (1/12), 016 (7/12).
    expect(ids(valor(await enCurso(prueba, PRA_CINCO_EN_CURSO)).tareas)).toEqual([
      'tar-pl2d-008',
      'tar-pl2d-013',
      'tar-pl2d-014',
      'tar-pl2d-016',
    ]);

    devolver(prueba, 'tar-pl2d-016', PL2D, 'Falta probar.');
    cambiarTarea(prueba, 'tar-pl2d-014', { fecha_limite: '2026-11-10' });

    expect(ids(valor(await enCurso(prueba, PRA_CINCO_EN_CURSO)).tareas)).toEqual([
      'tar-pl2d-016', // devuelta
      'tar-pl2d-014', // vencida
      'tar-pl2d-008',
      'tar-pl2d-013',
    ]);
  });

  it('solo las suyas: nunca las de un compañero ni las que no están en progreso', async () => {
    const prueba = prepararPrueba();

    const { tareas } = valor(await enCurso(prueba, PRA_CON_BAJA));

    expect(ids(tareas)).toEqual(['tar-pl2d-012']);
    expect(tareas.every((t) => t.es_mia && t.estado === 'EN_PROGRESO')).toBe(true);
  });

  it('junta sus tareas de todos sus proyectos vigentes', async () => {
    const prueba = prepararPrueba();
    cambiarTarea(prueba, 'tar-rsv-006', { estado: 'EN_PROGRESO', id_practicante: 'usr-pra-06' });

    const { tareas } = valor(await enCurso(prueba, 'usr-pra-06'));

    expect(new Set(tareas.map((t) => t.proyecto.id))).toEqual(new Set([PL2D, RSV]));
  });

  it('no incluye una tarea suya en un proyecto finalizado ni de uno del que salió', async () => {
    const prueba = prepararPrueba();
    cambiarTarea(prueba, 'tar-tie-004', { estado: 'EN_PROGRESO', fecha_termino: null });
    cambiarTarea(prueba, 'tar-tie-001', { estado: 'EN_PROGRESO', fecha_termino: null });

    expect(ids(valor(await enCurso(prueba, PRA_CON_BAJA)).tareas)).toEqual(['tar-pl2d-012']);
    expect(valor(await enCurso(prueba, PRA_EN_FINALIZADO)).tareas).toEqual([]);
  });

  it('un proyecto en pausa conserva sus tareas en progreso', async () => {
    const prueba = prepararPrueba();
    cambiarTarea(prueba, 'tar-inv-001', { estado: 'EN_PROGRESO', id_practicante: 'usr-pra-09' });

    const { tareas } = valor(await enCurso(prueba, 'usr-pra-09'));

    expect(tareas.map((t) => t.proyecto.codigo)).toEqual(['INV']);
  });

  it('la marca «Devuelta» solo la trae en sus tareas', async () => {
    const prueba = prepararPrueba();
    devolver(prueba, 'tar-pl2d-011', PL2D, 'Otra persona.');

    expect(
      valor(await enCurso(prueba, PRA_CON_PR_CONFLICTOS)).tareas.map((t) => t.devuelta),
    ).toEqual([true]);
    expect(valor(await enCurso(prueba, PRA_CINCO_EN_CURSO)).tareas.every((t) => !t.devuelta)).toBe(
      true,
    );
  });
});

// ── listarPullRequestsPorAtender ─────────────────────────────────────────────────────────────

describe('listarPullRequestsPorAtender', () => {
  const porAtender = (p: PruebaPreparada, idActor: Id) =>
    listarPullRequestsPorAtender({ idActor }, p.entorno);

  it('incluye tareas terminadas o esperando supervisión con el PR pendiente, por fecha límite', async () => {
    const prueba = prepararPrueba();

    const { tareas } = valor(await porAtender(prueba, PRACTICANTE));

    // 006 está terminada (límite 11/11) y 017 esperando supervisión (25/11); 010 está en progreso y la
    // etiqueta no se muestra todavía.
    expect(ids(tareas)).toEqual(['tar-pl2d-006', 'tar-pl2d-017']);
    expect(tareas.map((t) => t.etiqueta_pr_visible)).toEqual(['PENDIENTE', 'PENDIENTE']);
    expect(tareas.map((t) => t.estado)).toEqual(['TERMINADA', 'ESPERANDO_SUPERVISION']);
  });

  it('incluye las que tienen conflictos', async () => {
    const prueba = prepararPrueba();

    const { tareas } = valor(await porAtender(prueba, PRA_CON_PR_CONFLICTOS));

    expect(tareas).toMatchObject([{ id: 'tar-pl2d-015', etiqueta_pr_visible: 'CON_CONFLICTOS' }]);
  });

  it('no incluye PR creados, fusionados o cerrados', async () => {
    for (const estado_pr of ['CREADO', 'FUSIONADO', 'CERRADO'] as const) {
      const prueba = prepararPrueba();
      cambiarTarea(prueba, 'tar-pl2d-006', { estado_pr });
      cambiarTarea(prueba, 'tar-pl2d-017', { estado_pr });

      expect(valor(await porAtender(prueba, PRACTICANTE)).tareas, estado_pr).toEqual([]);
    }
  });

  it('no incluye tareas en progreso aunque tengan la etiqueta pendiente', async () => {
    const prueba = prepararPrueba();

    // usr-pra-04 tiene 008 en progreso con el PR pendiente, que todavía no se muestra.
    expect(valor(await porAtender(prueba, PRA_CINCO_EN_CURSO)).tareas).toEqual([]);
  });

  it('no incluye las que no requieren PR', async () => {
    const prueba = prepararPrueba();
    cambiarTarea(prueba, 'tar-pl2d-006', { requiere_pr: false });

    expect(ids(valor(await porAtender(prueba, PRACTICANTE)).tareas)).toEqual(['tar-pl2d-017']);
  });

  it('solo las suyas', async () => {
    const prueba = prepararPrueba();

    const { tareas } = valor(await porAtender(prueba, PRACTICANTE));

    expect(tareas.every((t) => t.es_mia)).toBe(true);
    expect(ids(valor(await porAtender(prueba, PRA_CON_PR_CONFLICTOS)).tareas)).not.toContain(
      'tar-pl2d-017',
    );
  });

  it('no incluye las de un proyecto finalizado ni del que salió: ya no puede actuar', async () => {
    const prueba = prepararPrueba();
    cambiarTarea(prueba, 'tar-tie-004', { estado_pr: 'PENDIENTE' });
    cambiarTarea(prueba, 'tar-tie-001', { estado_pr: 'CON_CONFLICTOS' });

    expect(valor(await porAtender(prueba, PRA_CON_BAJA)).tareas).toEqual([]);
    expect(valor(await porAtender(prueba, PRA_EN_FINALIZADO)).tareas).toEqual([]);
  });
});

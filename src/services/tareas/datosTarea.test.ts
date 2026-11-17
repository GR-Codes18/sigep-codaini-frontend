import { describe, expect, it } from 'vitest';
import type { CambiosAlmacen, DatosAlmacen } from '@/data';
import type { EstadoTarea, Id, Proyecto, Tarea, Usuario } from '@/domain';
import { AHORA_DE_PRUEBA, crearEntornoDePrueba } from '../pruebas/entorno';
import { MENSAJES } from '../resultado';
import { crearTarea, editarTarea, eliminarTarea, type EntradaCrearTarea } from './datosTarea';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // supervisor de PL2D y RSV
const SUPERVISOR_AJENO = 'usr-sup-02';
const DEMO = 'demo-practicante';
const PL2D = 'pry-pl2d';
const EN_PROGRESO_DE_DEMO = 'tar-pl2d-010'; // «Enemigos básicos», devuelta y en progreso
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

function preparar() {
  const prueba = crearEntornoDePrueba();
  const datos = () => prueba.almacen.getState().datos;
  const modificar = (operacion: (d: DatosAlmacen) => CambiosAlmacen) =>
    prueba.almacen.getState().transaccion(operacion);
  return { ...prueba, datos, modificar };
}

const cambiarProyecto = (cambios: Partial<Proyecto>) => (d: DatosAlmacen) => ({
  proyectos: d.proyectos.map((p) => (p.id === PL2D ? { ...p, ...cambios } : p)),
});

const cambiarUsuario = (id: Id, cambios: Partial<Usuario>) => (d: DatosAlmacen) => ({
  usuarios: d.usuarios.map((u) => (u.id === id ? { ...u, ...cambios } : u)),
});

const cambiarTarea = (id: Id, cambios: Partial<Tarea>) => (d: DatosAlmacen) => ({
  tareas: d.tareas.map((t) => (t.id === id ? { ...t, ...cambios } : t)),
});

function entradaCrear(cambios: Partial<EntradaCrearTarea> = {}): EntradaCrearTarea {
  return {
    idActor: SUPERVISOR,
    idProyecto: PL2D,
    titulo: 'Pantalla de créditos',
    descripcion: 'Lista de personas del equipo al terminar el juego.',
    fecha_limite: '2026-12-15',
    ...cambios,
  };
}

/** Una tarea en ese estado de algún proyecto del supervisor demo. */
function tareaDelSupervisor(datos: DatosAlmacen, estado: EstadoTarea): Tarea {
  const propios = new Set(
    datos.proyectos.filter((p) => p.id_supervisor === SUPERVISOR).map((p) => p.id),
  );
  const tarea = datos.tareas.find((t) => propios.has(t.id_proyecto) && t.estado === estado);
  if (tarea === undefined) throw new Error(`La semilla no tiene una tarea ${estado}.`);
  return tarea;
}

/** Crea una tarea DISPONIBLE en PL2D con el servicio y la devuelve. */
async function crearDisponible(prueba: ReturnType<typeof preparar>): Promise<Tarea> {
  const r = await crearTarea(entradaCrear(), prueba.entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

/** Comprueba que una operación fallida no escribió nada. */
function sinEscritura(prueba: ReturnType<typeof preparar>) {
  const datosAntes = prueba.datos();
  const escriturasAntes = prueba.escrituras();
  return () => {
    expect(prueba.datos()).toBe(datosAntes);
    expect(prueba.escrituras()).toBe(escriturasAntes);
  };
}

// ── Crear ────────────────────────────────────────────────────────────────────────────────────

describe('crearTarea', () => {
  it('crea una tarea DISPONIBLE, guarda número y contador en una sola escritura y registra el evento', async () => {
    const prueba = preparar();
    const proyectoAntes = prueba.datos().proyectos.find((p) => p.id === PL2D)!;
    const historialAntes = prueba.datos().historial.length;
    const avisosAntes = prueba.datos().notificaciones.length;
    const escriturasAntes = prueba.escrituras();

    const r = await crearTarea(entradaCrear(), prueba.entorno);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(prueba.escrituras() - escriturasAntes).toBe(1);
    const numero = proyectoAntes.ultimo_numero_tarea + 1;
    expect(r.valor).toEqual({
      id: r.valor.id,
      numero,
      titulo: 'Pantalla de créditos',
      descripcion: 'Lista de personas del equipo al terminar el juego.',
      fecha_limite: '2026-12-15',
      id_proyecto: PL2D,
      id_practicante: null,
      estado: 'DISPONIBLE',
      requiere_supervision: false,
      requiere_pr: true,
      estado_pr: null,
      rama_origen: null,
      rama_base: null,
      url_pull_request: null,
      fecha_termino: null,
    });
    expect(r.valor.id).toMatch(/^tar-/);
    expect(prueba.datos().tareas.find((t) => t.id === r.valor.id)).toEqual(r.valor);
    expect(prueba.datos().proyectos.find((p) => p.id === PL2D)?.ultimo_numero_tarea).toBe(numero);

    const historial = prueba.datos().historial;
    expect(historial).toHaveLength(historialAntes + 1);
    expect(historial.at(-1)).toMatchObject({
      fecha: AHORA_ISO,
      autor: { tipo: 'USUARIO', id_usuario: SUPERVISOR },
      tipo_accion: 'TAREA_CREADA',
      elemento: {
        tipo: 'TAREA',
        id: r.valor.id,
        etiqueta: `PL2D-0${numero} · Pantalla de créditos`,
      },
      id_proyecto: PL2D,
      cambios: [{ campo: 'estado', valor_anterior: null, valor_nuevo: 'DISPONIBLE' }],
      nota: null,
    });
    // §8.1: no se avisa cuando se crean tareas.
    expect(prueba.datos().notificaciones).toHaveLength(avisosAntes);
  });

  it('el Administrador crea con las opciones elegidas y los textos recortados', async () => {
    const prueba = preparar();
    const r = await crearTarea(
      entradaCrear({
        idActor: ADMIN,
        titulo: '  Créditos  ',
        descripcion: '\tLista final\n',
        requiere_supervision: true,
        requiere_pr: false,
      }),
      prueba.entorno,
    );
    expect(r.ok && r.valor).toMatchObject({
      titulo: 'Créditos',
      descripcion: 'Lista final',
      requiere_supervision: true,
      requiere_pr: false,
    });
  });

  it('números correlativos: dos tareas seguidas toman n y n + 1', async () => {
    const prueba = preparar();
    const a = await crearDisponible(prueba);
    const b = await crearDisponible(prueba);
    expect(b.numero).toBe(a.numero + 1);
  });

  it('un número eliminado no se reutiliza', async () => {
    const prueba = preparar();
    const a = await crearDisponible(prueba);
    const borrada = await eliminarTarea(
      { idActor: SUPERVISOR, idTarea: a.id, motivo: 'Duplicada' },
      prueba.entorno,
    );
    expect(borrada.ok).toBe(true);
    const b = await crearDisponible(prueba);
    expect(b.numero).toBe(a.numero + 1);
  });

  it('un proyecto EN_PAUSA admite crear tareas (solo bloquea tomarlas)', async () => {
    const prueba = preparar();
    prueba.modificar(cambiarProyecto({ estado: 'EN_PAUSA' }));
    expect((await crearTarea(entradaCrear(), prueba.entorno)).ok).toBe(true);
  });

  it.each([
    ['practicante', DEMO, 'ROL_NO_PERMITIDO'],
    ['supervisor ajeno', SUPERVISOR_AJENO, 'FUERA_DE_ALCANCE'],
  ])('sin permiso (%s, %s) → %s y no escribe', async (_caso, idActor, codigo) => {
    const prueba = preparar();
    const comprobar = sinEscritura(prueba);
    const r = await crearTarea(entradaCrear({ idActor }), prueba.entorno);
    expect(r).toEqual({ ok: false, codigo, mensaje: MENSAJES[codigo] });
    comprobar();
  });

  it('proyecto FINALIZADO → PROYECTO_FINALIZADO, también para el Administrador', async () => {
    const prueba = preparar();
    prueba.modificar(cambiarProyecto({ estado: 'FINALIZADO' }));
    for (const idActor of [ADMIN, SUPERVISOR]) {
      const comprobar = sinEscritura(prueba);
      const r = await crearTarea(entradaCrear({ idActor }), prueba.entorno);
      expect(r, idActor).toMatchObject({ ok: false, codigo: 'PROYECTO_FINALIZADO' });
      comprobar();
    }
  });

  it('usuario INACTIVO → USUARIO_INACTIVO', async () => {
    const prueba = preparar();
    prueba.modificar(cambiarUsuario(SUPERVISOR, { estado: 'INACTIVO' }));
    const comprobar = sinEscritura(prueba);
    const r = await crearTarea(entradaCrear(), prueba.entorno);
    expect(r).toMatchObject({ ok: false, codigo: 'USUARIO_INACTIVO' });
    comprobar();
  });

  it('proyecto o actor inexistente → NO_ENCONTRADO', async () => {
    const prueba = preparar();
    const comprobar = sinEscritura(prueba);
    expect(await crearTarea(entradaCrear({ idProyecto: 'pry-x' }), prueba.entorno)).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    expect(await crearTarea(entradaCrear({ idActor: 'fantasma' }), prueba.entorno)).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    comprobar();
  });

  it('datos inválidos → DATOS_INVALIDOS con un mensaje por campo', async () => {
    const prueba = preparar();
    const comprobar = sinEscritura(prueba);
    const r = await crearTarea(
      entradaCrear({ titulo: '   ', descripcion: '', fecha_limite: '2026-02-30' }),
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(!r.ok && Object.keys(r.campos ?? {}).sort()).toEqual([
      'descripcion',
      'fecha_limite',
      'titulo',
    ]);
    comprobar();
  });

  it('la forma se valida antes que el actor: actor inexistente con datos inválidos → DATOS_INVALIDOS', async () => {
    const prueba = preparar();
    const r = await crearTarea(entradaCrear({ idActor: 'fantasma', titulo: '' }), prueba.entorno);
    expect(r).toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('contador inválido en el proyecto → ULTIMO_NUMERO_INVALIDO con el mensaje de domain/', async () => {
    const prueba = preparar();
    prueba.modificar(cambiarProyecto({ ultimo_numero_tarea: -1 }));
    const comprobar = sinEscritura(prueba);
    const r = await crearTarea(entradaCrear(), prueba.entorno);
    expect(r).toMatchObject({ ok: false, codigo: 'ULTIMO_NUMERO_INVALIDO' });
    expect(!r.ok && r.mensaje.length).toBeGreaterThan(15);
    comprobar();
  });
});

// ── Editar ───────────────────────────────────────────────────────────────────────────────────

describe('editarTarea', () => {
  it('DISPONIBLE: registra solo los campos que cambiaron y no avisa a nadie', async () => {
    const prueba = preparar();
    const tarea = await crearDisponible(prueba);
    const avisosAntes = prueba.datos().notificaciones.length;
    const escriturasAntes = prueba.escrituras();

    const r = await editarTarea(
      {
        idActor: SUPERVISOR,
        idTarea: tarea.id,
        titulo: 'Créditos finales',
        descripcion: tarea.descripcion,
        fecha_limite: '2026-12-20',
      },
      prueba.entorno,
    );

    expect(r.ok && r.valor).toMatchObject({
      titulo: 'Créditos finales',
      fecha_limite: '2026-12-20',
    });
    expect(prueba.escrituras() - escriturasAntes).toBe(1);
    expect(prueba.datos().historial.at(-1)).toMatchObject({
      fecha: AHORA_ISO,
      tipo_accion: 'TAREA_EDITADA',
      elemento: { id: tarea.id, etiqueta: expect.stringMatching(/· Créditos finales$/) },
      id_proyecto: PL2D,
      cambios: [
        {
          campo: 'titulo',
          valor_anterior: 'Pantalla de créditos',
          valor_nuevo: 'Créditos finales',
        },
        { campo: 'fecha_limite', valor_anterior: '2026-12-15', valor_nuevo: '2026-12-20' },
      ],
    });
    expect(prueba.datos().notificaciones).toHaveLength(avisosAntes);
  });

  it.each([
    ['Supervisor', SUPERVISOR],
    ['Administrador', ADMIN],
  ])('EN_PROGRESO (%s): avisa al responsable con la misma marca', async (_rol, idActor) => {
    const prueba = preparar();
    const tarea = prueba.datos().tareas.find((t) => t.id === EN_PROGRESO_DE_DEMO)!;
    const avisosAntes = prueba.datos().notificaciones.length;

    const r = await editarTarea(
      {
        idActor,
        idTarea: tarea.id,
        titulo: tarea.titulo,
        descripcion: 'Patrullan, persiguen y chocan con las paredes.',
        fecha_limite: tarea.fecha_limite,
      },
      prueba.entorno,
    );

    expect(r.ok).toBe(true);
    const nuevas = prueba.datos().notificaciones.slice(avisosAntes);
    expect(nuevas).toEqual([
      {
        id: expect.stringMatching(/^ntf-/),
        id_destinatario: DEMO,
        tipo: 'TAREA_EDITADA_EN_PROGRESO',
        mensaje: `Editaron tu tarea «Enemigos básicos» (PL2D-010) mientras estaba en progreso.`,
        elemento: { tipo: 'TAREA', id: tarea.id },
        fecha: AHORA_ISO,
        leida: false,
      },
    ]);
    expect(
      prueba
        .datos()
        .historial.at(-1)
        ?.cambios.map((c) => c.campo),
    ).toEqual(['descripcion']);
  });

  it.each(['ESPERANDO_SUPERVISION', 'TERMINADA'] as const)(
    '%s → TAREA_NO_EDITABLE y no escribe',
    async (estado) => {
      const prueba = preparar();
      const tarea = tareaDelSupervisor(prueba.datos(), estado);
      const comprobar = sinEscritura(prueba);
      const r = await editarTarea(
        { idActor: SUPERVISOR, idTarea: tarea.id, ...tarea, titulo: 'Otro título' },
        prueba.entorno,
      );
      expect(r).toMatchObject({ ok: false, codigo: 'TAREA_NO_EDITABLE' });
      comprobar();
    },
  );

  it('sin cambios (también tras recortar) → SIN_CAMBIOS y no escribe', async () => {
    const prueba = preparar();
    const tarea = await crearDisponible(prueba);
    const comprobar = sinEscritura(prueba);
    const r = await editarTarea(
      {
        idActor: SUPERVISOR,
        idTarea: tarea.id,
        titulo: `  ${tarea.titulo} `,
        descripcion: tarea.descripcion,
        fecha_limite: tarea.fecha_limite,
      },
      prueba.entorno,
    );
    expect(r).toEqual({ ok: false, codigo: 'SIN_CAMBIOS', mensaje: MENSAJES.SIN_CAMBIOS });
    comprobar();
  });

  it('el permiso va antes que «sin cambios»: el practicante recibe ROL_NO_PERMITIDO', async () => {
    const prueba = preparar();
    const tarea = prueba.datos().tareas.find((t) => t.id === EN_PROGRESO_DE_DEMO)!;
    const r = await editarTarea({ idActor: DEMO, idTarea: tarea.id, ...tarea }, prueba.entorno);
    expect(r).toMatchObject({ codigo: 'ROL_NO_PERMITIDO' });
  });

  it('el alcance va antes que el estado: supervisor ajeno en una tarea TERMINADA → FUERA_DE_ALCANCE', async () => {
    const prueba = preparar();
    const tarea = tareaDelSupervisor(prueba.datos(), 'TERMINADA');
    const r = await editarTarea(
      { idActor: SUPERVISOR_AJENO, idTarea: tarea.id, ...tarea, titulo: 'X' },
      prueba.entorno,
    );
    expect(r).toMatchObject({ codigo: 'FUERA_DE_ALCANCE' });
  });

  it('proyecto FINALIZADO, usuario INACTIVO, tarea inexistente y datos inválidos', async () => {
    const prueba = preparar();
    const tarea = prueba.datos().tareas.find((t) => t.id === EN_PROGRESO_DE_DEMO)!;
    const base = { idActor: SUPERVISOR, idTarea: tarea.id, ...tarea, titulo: 'Otro' };

    const comprobar = sinEscritura(prueba);
    expect(await editarTarea({ ...base, idTarea: 'no-existe' }, prueba.entorno)).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    expect(await editarTarea({ ...base, fecha_limite: 'mañana' }, prueba.entorno)).toMatchObject({
      codigo: 'DATOS_INVALIDOS',
      campos: { fecha_limite: 'La fecha límite no es válida.' },
    });
    comprobar();

    prueba.modificar(cambiarProyecto({ estado: 'FINALIZADO' }));
    expect(await editarTarea(base, prueba.entorno)).toMatchObject({
      codigo: 'PROYECTO_FINALIZADO',
    });

    prueba.modificar(cambiarProyecto({ estado: 'ACTIVO' }));
    prueba.modificar(cambiarUsuario(SUPERVISOR, { estado: 'INACTIVO' }));
    expect(await editarTarea(base, prueba.entorno)).toMatchObject({ codigo: 'USUARIO_INACTIVO' });
  });
});

// ── Eliminar ─────────────────────────────────────────────────────────────────────────────────

describe('eliminarTarea', () => {
  it('quita la tarea, conserva el evento con el motivo recortado y no toca el contador', async () => {
    const prueba = preparar();
    const tarea = await crearDisponible(prueba);
    const contador = prueba.datos().proyectos.find((p) => p.id === PL2D)!.ultimo_numero_tarea;
    const avisosAntes = prueba.datos().notificaciones.length;
    const escriturasAntes = prueba.escrituras();

    const r = await eliminarTarea(
      { idActor: SUPERVISOR, idTarea: tarea.id, motivo: '  Se creó por error.  ' },
      prueba.entorno,
    );

    expect(r).toEqual({ ok: true, valor: { id: tarea.id } });
    expect(prueba.escrituras() - escriturasAntes).toBe(1);
    expect(prueba.datos().tareas.some((t) => t.id === tarea.id)).toBe(false);
    expect(prueba.datos().proyectos.find((p) => p.id === PL2D)?.ultimo_numero_tarea).toBe(contador);
    expect(prueba.datos().historial.at(-1)).toMatchObject({
      fecha: AHORA_ISO,
      autor: { tipo: 'USUARIO', id_usuario: SUPERVISOR },
      tipo_accion: 'TAREA_ELIMINADA',
      elemento: {
        tipo: 'TAREA',
        id: tarea.id,
        etiqueta: `PL2D-0${tarea.numero} · ${tarea.titulo}`,
      },
      id_proyecto: PL2D,
      cambios: [{ campo: 'estado', valor_anterior: 'DISPONIBLE', valor_nuevo: null }],
      nota: 'Se creó por error.',
    });
    expect(prueba.datos().historial.filter((e) => e.elemento.id === tarea.id)).toHaveLength(2);
    expect(prueba.datos().notificaciones).toHaveLength(avisosAntes);
  });

  it('el Administrador también elimina', async () => {
    const prueba = preparar();
    const tarea = await crearDisponible(prueba);
    const r = await eliminarTarea(
      { idActor: ADMIN, idTarea: tarea.id, motivo: 'Proyecto equivocado' },
      prueba.entorno,
    );
    expect(r.ok).toBe(true);
  });

  it.each([
    ['ausente', undefined],
    ['vacío', ''],
    ['solo espacios', '   '],
  ])('motivo %s → TEXTO_OBLIGATORIO y no escribe', async (_caso, motivo) => {
    const prueba = preparar();
    const tarea = await crearDisponible(prueba);
    const comprobar = sinEscritura(prueba);
    const r = await eliminarTarea(
      { idActor: SUPERVISOR, idTarea: tarea.id, motivo },
      prueba.entorno,
    );
    expect(r).toEqual({
      ok: false,
      codigo: 'TEXTO_OBLIGATORIO',
      mensaje: MENSAJES.TEXTO_OBLIGATORIO,
    });
    comprobar();
  });

  it.each([
    ['con motivo', 'Ya no hace falta'],
    ['con motivo vacío', ''],
    ['sin motivo', undefined],
  ])(
    'tarea EN_PROGRESO (%s) → TAREA_NO_ELIMINABLE: el estado va antes que el texto',
    async (_c, motivo) => {
      const prueba = preparar();
      const comprobar = sinEscritura(prueba);
      const r = await eliminarTarea(
        { idActor: SUPERVISOR, idTarea: EN_PROGRESO_DE_DEMO, motivo },
        prueba.entorno,
      );
      expect(r).toMatchObject({ ok: false, codigo: 'TAREA_NO_ELIMINABLE' });
      comprobar();
    },
  );

  it.each([
    ['con motivo', 'Ya no hace falta'],
    ['con motivo vacío', ''],
    ['sin motivo', undefined],
  ])(
    'DISPONIBLE que tuvo PR (%s) → TAREA_YA_TIENE_PR: el PR va antes que el texto',
    async (_c, motivo) => {
      const prueba = preparar();
      const tarea = await crearDisponible(prueba);
      prueba.modificar(
        cambiarTarea(tarea.id, {
          estado_pr: 'CERRADO',
          url_pull_request: 'https://github.com/org-demo/pl2d/pull/99',
        }),
      );
      const comprobar = sinEscritura(prueba);
      const r = await eliminarTarea(
        { idActor: SUPERVISOR, idTarea: tarea.id, motivo },
        prueba.entorno,
      );
      expect(r).toMatchObject({ ok: false, codigo: 'TAREA_YA_TIENE_PR' });
      comprobar();
    },
  );

  it('sin permiso, FINALIZADO, INACTIVO e inexistente', async () => {
    const prueba = preparar();
    const tarea = await crearDisponible(prueba);
    const base = { idActor: SUPERVISOR, idTarea: tarea.id, motivo: 'Duplicada' };
    const comprobar = sinEscritura(prueba);

    expect(await eliminarTarea({ ...base, idActor: DEMO }, prueba.entorno)).toMatchObject({
      codigo: 'ROL_NO_PERMITIDO',
    });
    expect(
      await eliminarTarea({ ...base, idActor: SUPERVISOR_AJENO }, prueba.entorno),
    ).toMatchObject({ codigo: 'FUERA_DE_ALCANCE' });
    expect(await eliminarTarea({ ...base, idTarea: 'no-existe' }, prueba.entorno)).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    expect(await eliminarTarea({ ...base, idTarea: '' }, prueba.entorno)).toMatchObject({
      codigo: 'DATOS_INVALIDOS',
    });
    comprobar();

    prueba.modificar(cambiarProyecto({ estado: 'FINALIZADO' }));
    expect(await eliminarTarea(base, prueba.entorno)).toMatchObject({
      codigo: 'PROYECTO_FINALIZADO',
    });
    prueba.modificar(cambiarProyecto({ estado: 'ACTIVO' }));
    prueba.modificar(cambiarUsuario(SUPERVISOR, { estado: 'INACTIVO' }));
    expect(await eliminarTarea(base, prueba.entorno)).toMatchObject({ codigo: 'USUARIO_INACTIVO' });
    expect(prueba.datos().tareas.some((t) => t.id === tarea.id)).toBe(true);
  });
});

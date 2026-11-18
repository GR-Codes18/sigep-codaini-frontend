import { describe, expect, it } from 'vitest';
import type { CambiosAlmacen, DatosAlmacen } from '@/data';
import { etiquetaPRVisible, type Id, type Proyecto, type Tarea, type Usuario } from '@/domain';
import { AHORA_DE_PRUEBA, crearEntornoDePrueba } from '../pruebas/entorno';
import { MENSAJES, type Resultado } from '../resultado';
import { cambiarRequierePR, cambiarRequiereSupervision } from './opciones';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // supervisor de PL2D y RSV
const SUPERVISOR_AJENO = 'usr-sup-02';
const DEMO = 'demo-practicante';
const DIEGO = 'usr-pra-02';
const PL2D = 'pry-pl2d';
const ENEMIGOS = 'tar-pl2d-010'; // de DEMO, EN_PROGRESO, con supervisión y PR requerido, PENDIENTE sin URL
const JEFE = 'tar-pl2d-011'; // de DIEGO, EN_PROGRESO, sin supervisión, estado_pr null
const MOVIMIENTO = 'tar-pl2d-001'; // de DIEGO, TERMINADA, con PR fusionado (tiene URL)
const ARTE = 'tar-pl2d-002'; // de CAMILA, TERMINADA sin «Requiere PR» y sin estado_pr
const URL_PR = 'https://github.com/org-demo/pl2d/pull/42';
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

function preparar() {
  const prueba = crearEntornoDePrueba();
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
const darDeBaja = (id: Id) => (d: DatosAlmacen) => ({
  asignaciones: d.asignaciones.map((a) =>
    a.id_practicante === id && a.id_proyecto === PL2D && a.fecha_baja === null
      ? { ...a, fecha_baja: '2026-11-16' }
      : a,
  ),
});

/** Una tarea de PL2D en ese estado. */
function tareaDePL2D(datos: DatosAlmacen, estado: Tarea['estado']): Tarea {
  const tarea = datos.tareas.find((t) => t.id_proyecto === PL2D && t.estado === estado);
  if (tarea === undefined) throw new Error(`La semilla no tiene una tarea ${estado} en PL2D.`);
  return tarea;
}

function sinEscritura(prueba: Prueba) {
  const datosAntes = prueba.datos();
  const escriturasAntes = prueba.escrituras();
  return () => {
    expect(prueba.datos()).toBe(datosAntes);
    expect(prueba.escrituras()).toBe(escriturasAntes);
  };
}

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

// ── Requiere supervisión ─────────────────────────────────────────────────────────────────────

describe('cambiarRequiereSupervision', () => {
  it.each([
    ['Supervisor', SUPERVISOR],
    ['Administrador', ADMIN],
  ])(
    '%s la activa en una tarea EN_PROGRESO: evento con Sí/No y sin aviso',
    async (_rol, idActor) => {
      const prueba = preparar();
      const antes = prueba.tarea(JEFE);

      const r = await ejecutar(prueba, () =>
        cambiarRequiereSupervision({ idActor, idTarea: JEFE, valor: true }, prueba.entorno),
      );

      expect(r.resultado.ok && r.resultado.valor).toEqual({ ...antes, requiere_supervision: true });
      expect(prueba.tarea(JEFE).requiere_supervision).toBe(true);
      expect(r.escrituras).toBe(1);
      expect(r.eventos).toEqual([
        {
          id: expect.stringMatching(/^evt-/),
          fecha: AHORA_ISO,
          autor: { tipo: 'USUARIO', id_usuario: idActor },
          tipo_accion: 'TAREA_OPCIONES_CAMBIADAS',
          elemento: { tipo: 'TAREA', id: JEFE, etiqueta: `PL2D-011 · ${antes.titulo}` },
          id_proyecto: PL2D,
          cambios: [{ campo: 'requiere_supervision', valor_anterior: 'No', valor_nuevo: 'Sí' }],
          nota: null,
        },
      ]);
      expect(r.avisos).toEqual([]);
    },
  );

  it('se desactiva en una tarea EN_PROGRESO y se cambia en una DISPONIBLE', async () => {
    const prueba = preparar();
    const desactivar = await ejecutar(prueba, () =>
      cambiarRequiereSupervision(
        { idActor: SUPERVISOR, idTarea: ENEMIGOS, valor: false },
        prueba.entorno,
      ),
    );
    expect(desactivar.resultado.ok && desactivar.resultado.valor.requiere_supervision).toBe(false);
    expect(desactivar.eventos[0]?.cambios).toEqual([
      { campo: 'requiere_supervision', valor_anterior: 'Sí', valor_nuevo: 'No' },
    ]);

    const disponible = tareaDePL2D(prueba.datos(), 'DISPONIBLE');
    const r = await cambiarRequiereSupervision(
      { idActor: SUPERVISOR, idTarea: disponible.id, valor: !disponible.requiere_supervision },
      prueba.entorno,
    );
    expect(r.ok).toBe(true);
  });

  it.each(['ESPERANDO_SUPERVISION', 'TERMINADA'] as const)(
    '%s → TAREA_NO_EDITABLE y no escribe',
    async (estado) => {
      const prueba = preparar();
      const tarea = tareaDePL2D(prueba.datos(), estado);
      const comprobar = sinEscritura(prueba);
      expect(
        await cambiarRequiereSupervision(
          { idActor: SUPERVISOR, idTarea: tarea.id, valor: !tarea.requiere_supervision },
          prueba.entorno,
        ),
      ).toEqual({ ok: false, codigo: 'TAREA_NO_EDITABLE', mensaje: MENSAJES.TAREA_NO_EDITABLE });
      comprobar();
    },
  );

  it('mismo valor → SIN_CAMBIOS; el permiso va antes: el practicante → ROL_NO_PERMITIDO', async () => {
    const prueba = preparar();
    const comprobar = sinEscritura(prueba);
    expect(
      await cambiarRequiereSupervision(
        { idActor: SUPERVISOR, idTarea: ENEMIGOS, valor: true },
        prueba.entorno,
      ),
    ).toEqual({ ok: false, codigo: 'SIN_CAMBIOS', mensaje: MENSAJES.SIN_CAMBIOS });
    expect(
      await cambiarRequiereSupervision(
        { idActor: DEMO, idTarea: ENEMIGOS, valor: true },
        prueba.entorno,
      ),
    ).toMatchObject({ codigo: 'ROL_NO_PERMITIDO' });
    comprobar();
  });

  it('alcance antes que el estado: supervisor ajeno en una tarea TERMINADA → FUERA_DE_ALCANCE', async () => {
    const prueba = preparar();
    const comprobar = sinEscritura(prueba);
    for (const idTarea of [JEFE, MOVIMIENTO]) {
      expect(
        await cambiarRequiereSupervision(
          { idActor: SUPERVISOR_AJENO, idTarea, valor: true },
          prueba.entorno,
        ),
        idTarea,
      ).toMatchObject({ codigo: 'FUERA_DE_ALCANCE' });
    }
    comprobar();
  });

  it('FINALIZADO, INACTIVO, inexistentes y valor que no es booleano', async () => {
    const prueba = preparar();
    const base = { idActor: SUPERVISOR, idTarea: JEFE, valor: true };
    const comprobar = sinEscritura(prueba);
    expect(
      await cambiarRequiereSupervision({ ...base, idTarea: 'no-existe' }, prueba.entorno),
    ).toMatchObject({ codigo: 'NO_ENCONTRADO' });
    expect(
      await cambiarRequiereSupervision({ ...base, idActor: 'fantasma' }, prueba.entorno),
    ).toMatchObject({ codigo: 'NO_ENCONTRADO' });
    expect(
      await cambiarRequiereSupervision(
        { ...base, valor: 'sí' } as unknown as typeof base,
        prueba.entorno,
      ),
    ).toMatchObject({ codigo: 'DATOS_INVALIDOS', campos: { valor: expect.any(String) } });
    comprobar();

    prueba.modificar(cambiarProyecto({ estado: 'FINALIZADO' }));
    expect(await cambiarRequiereSupervision(base, prueba.entorno)).toMatchObject({
      codigo: 'PROYECTO_FINALIZADO',
    });
    prueba.modificar(cambiarProyecto({ estado: 'ACTIVO' }));
    prueba.modificar(cambiarUsuario(SUPERVISOR, { estado: 'INACTIVO' }));
    expect(await cambiarRequiereSupervision(base, prueba.entorno)).toMatchObject({
      codigo: 'USUARIO_INACTIVO',
    });
  });
});

// ── Requiere PR ──────────────────────────────────────────────────────────────────────────────

describe('cambiarRequierePR: C1 al activar', () => {
  it('TERMINADA sin estado_pr (caso real de la semilla) → PENDIENTE, con los dos cambios en el mismo evento', async () => {
    const prueba = preparar();
    const antes = prueba.tarea(ARTE);
    expect(antes).toMatchObject({
      estado: 'TERMINADA',
      requiere_pr: false,
      estado_pr: null,
      url_pull_request: null,
    });

    const r = await ejecutar(prueba, () =>
      cambiarRequierePR({ idActor: SUPERVISOR, idTarea: ARTE, valor: true }, prueba.entorno),
    );

    expect(r.resultado.ok && r.resultado.valor).toEqual({
      ...antes,
      requiere_pr: true,
      estado_pr: 'PENDIENTE',
    });
    expect(r.escrituras).toBe(1);
    expect(r.eventos).toHaveLength(1);
    expect(r.eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: SUPERVISOR },
      tipo_accion: 'TAREA_OPCIONES_CAMBIADAS',
      cambios: [
        { campo: 'requiere_pr', valor_anterior: 'No', valor_nuevo: 'Sí' },
        { campo: 'estado_pr', valor_anterior: null, valor_nuevo: 'PENDIENTE' },
      ],
      nota: null,
    });
    expect(r.avisos).toEqual([]);
    expect(etiquetaPRVisible(prueba.tarea(ARTE))).toBe('PENDIENTE');
  });

  it('ESPERANDO_SUPERVISION sin estado_pr → PENDIENTE', async () => {
    const prueba = preparar();
    const tarea = tareaDePL2D(prueba.datos(), 'ESPERANDO_SUPERVISION');
    prueba.modificar(
      cambiarTarea(tarea.id, { requiere_pr: false, estado_pr: null, url_pull_request: null }),
    );
    const r = await cambiarRequierePR(
      { idActor: ADMIN, idTarea: tarea.id, valor: true },
      prueba.entorno,
    );
    expect(r.ok && r.valor).toMatchObject({ requiere_pr: true, estado_pr: 'PENDIENTE' });
  });

  it('antes de llegar (EN_PROGRESO o DISPONIBLE) sigue en null: lo calculará la llegada', async () => {
    const prueba = preparar();
    prueba.modificar(cambiarTarea(JEFE, { requiere_pr: false }));
    const r = await ejecutar(prueba, () =>
      cambiarRequierePR({ idActor: SUPERVISOR, idTarea: JEFE, valor: true }, prueba.entorno),
    );
    expect(r.resultado.ok && r.resultado.valor).toMatchObject({
      requiere_pr: true,
      estado_pr: null,
    });
    expect(r.eventos[0]?.cambios.map((c) => c.campo)).toEqual(['requiere_pr']);
  });

  it('con un estado_pr ya calculado, activar lo conserva', async () => {
    const prueba = preparar();
    prueba.modificar(cambiarTarea(ENEMIGOS, { requiere_pr: false })); // sigue en PENDIENTE
    const r = await ejecutar(prueba, () =>
      cambiarRequierePR({ idActor: SUPERVISOR, idTarea: ENEMIGOS, valor: true }, prueba.entorno),
    );
    expect(r.resultado.ok && r.resultado.valor.estado_pr).toBe('PENDIENTE');
    expect(r.eventos[0]?.cambios.map((c) => c.campo)).toEqual(['requiere_pr']);
  });
});

describe('cambiarRequierePR: desactivar («No requiere PR»)', () => {
  it('el practicante responsable con motivo: PULL_REQUEST_NO_REQUERIDO, nota recortada y aviso al supervisor', async () => {
    const prueba = preparar();
    const antes = prueba.tarea(ENEMIGOS);

    const r = await ejecutar(prueba, () =>
      cambiarRequierePR(
        {
          idActor: DEMO,
          idTarea: ENEMIGOS,
          valor: false,
          motivo: '  Es solo diseño de niveles.  ',
        },
        prueba.entorno,
      ),
    );

    // estado_pr se conserva: desactivar nunca lo cambia.
    expect(r.resultado.ok && r.resultado.valor).toEqual({ ...antes, requiere_pr: false });
    expect(r.escrituras).toBe(1);
    expect(r.eventos).toEqual([
      {
        id: expect.stringMatching(/^evt-/),
        fecha: AHORA_ISO,
        autor: { tipo: 'USUARIO', id_usuario: DEMO },
        tipo_accion: 'PULL_REQUEST_NO_REQUERIDO',
        elemento: { tipo: 'TAREA', id: ENEMIGOS, etiqueta: 'PL2D-010 · Enemigos básicos' },
        id_proyecto: PL2D,
        cambios: [{ campo: 'requiere_pr', valor_anterior: 'Sí', valor_nuevo: 'No' }],
        nota: 'Es solo diseño de niveles.',
      },
    ]);
    expect(r.avisos).toEqual([
      {
        id: expect.stringMatching(/^ntf-/),
        id_destinatario: SUPERVISOR,
        tipo: 'PULL_REQUEST_NO_REQUERIDO_POR_PRACTICANTE',
        mensaje: `${prueba.nombre(DEMO)} marcó «Enemigos básicos» (PL2D-010) como «No requiere PR».`,
        elemento: { tipo: 'TAREA', id: ENEMIGOS },
        fecha: AHORA_ISO,
        leida: false,
      },
    ]);
  });

  it.each([
    ['Supervisor', SUPERVISOR, undefined],
    ['Administrador', ADMIN, 'Es documentación.'],
  ])(
    '%s desactiva: PULL_REQUEST_NO_REQUERIDO y sin aviso (con o sin motivo)',
    async (_rol, idActor, motivo) => {
      const prueba = preparar();
      const r = await ejecutar(prueba, () =>
        cambiarRequierePR({ idActor, idTarea: ENEMIGOS, valor: false, motivo }, prueba.entorno),
      );
      expect(r.resultado.ok && r.resultado.valor.requiere_pr).toBe(false);
      expect(r.eventos[0]).toMatchObject({
        tipo_accion: 'PULL_REQUEST_NO_REQUERIDO',
        nota: motivo ?? null,
      });
      expect(r.avisos).toEqual([]);
    },
  );

  it('desactivar en una tarea que ya llegó oculta la etiqueta y conserva estado_pr', async () => {
    const prueba = preparar();
    const tarea = tareaDePL2D(prueba.datos(), 'ESPERANDO_SUPERVISION');
    prueba.modificar(
      cambiarTarea(tarea.id, { requiere_pr: true, estado_pr: 'PENDIENTE', url_pull_request: null }),
    );
    expect(etiquetaPRVisible(prueba.tarea(tarea.id))).toBe('PENDIENTE');
    const r = await cambiarRequierePR(
      { idActor: SUPERVISOR, idTarea: tarea.id, valor: false },
      prueba.entorno,
    );
    expect(r.ok && r.valor.estado_pr).toBe('PENDIENTE');
    expect(etiquetaPRVisible(prueba.tarea(tarea.id))).toBeNull();
  });

  it('sin restricción por estado: se desactiva en una tarea TERMINADA sin PR', async () => {
    const prueba = preparar();
    prueba.modificar(cambiarTarea(ARTE, { requiere_pr: true }));
    const r = await cambiarRequierePR(
      { idActor: SUPERVISOR, idTarea: ARTE, valor: false },
      prueba.entorno,
    );
    expect(r.ok).toBe(true);
  });
});

describe('cambiarRequierePR: errores y orden de comprobación', () => {
  it.each([
    ['ausente', undefined],
    ['vacío', ''],
    ['solo espacios', '   '],
  ])('practicante con motivo %s → TEXTO_OBLIGATORIO y no escribe', async (_caso, motivo) => {
    const prueba = preparar();
    const comprobar = sinEscritura(prueba);
    expect(
      await cambiarRequierePR(
        { idActor: DEMO, idTarea: ENEMIGOS, valor: false, motivo },
        prueba.entorno,
      ),
    ).toEqual({ ok: false, codigo: 'TEXTO_OBLIGATORIO', mensaje: MENSAJES.TEXTO_OBLIGATORIO });
    comprobar();
  });

  it('quién: el practicante no activa; no responsable, sin asignación o con baja; supervisor ajeno', async () => {
    const prueba = preparar();
    prueba.modificar(cambiarTarea(ENEMIGOS, { requiere_pr: false }));
    const comprobar = sinEscritura(prueba);
    expect(
      await cambiarRequierePR({ idActor: DEMO, idTarea: ENEMIGOS, valor: true }, prueba.entorno),
    ).toMatchObject({ codigo: 'ROL_NO_PERMITIDO' });
    expect(
      await cambiarRequierePR(
        { idActor: DIEGO, idTarea: ENEMIGOS, valor: false, motivo: 'x' },
        prueba.entorno,
      ),
    ).toMatchObject({ codigo: 'NO_ES_EL_RESPONSABLE' });
    expect(
      await cambiarRequierePR(
        { idActor: SUPERVISOR_AJENO, idTarea: ENEMIGOS, valor: true },
        prueba.entorno,
      ),
    ).toMatchObject({ codigo: 'FUERA_DE_ALCANCE' });
    comprobar();

    prueba.modificar(cambiarTarea(ENEMIGOS, { requiere_pr: true }));
    prueba.modificar(darDeBaja(DEMO));
    expect(
      await cambiarRequierePR(
        { idActor: DEMO, idTarea: ENEMIGOS, valor: false, motivo: 'x' },
        prueba.entorno,
      ),
    ).toMatchObject({ codigo: 'FUERA_DE_ALCANCE' });
  });

  it.each([
    ['Supervisor activa', SUPERVISOR, true, undefined],
    ['Administrador desactiva', ADMIN, false, undefined],
    ['practicante con motivo', DEMO, false, 'Sin código'],
    ['practicante con motivo vacío', DEMO, false, ''],
    ['practicante sin motivo', DEMO, false, undefined],
  ])(
    'tarea que ya tuvo PR (cerrado) → TAREA_YA_TIENE_PR: %s (el PR va antes que el texto)',
    async (_caso, idActor, valor, motivo) => {
      const prueba = preparar();
      prueba.modificar(
        cambiarTarea(ENEMIGOS, {
          requiere_pr: !valor,
          estado_pr: 'CERRADO',
          url_pull_request: URL_PR,
        }),
      );
      const comprobar = sinEscritura(prueba);
      expect(
        await cambiarRequierePR({ idActor, idTarea: ENEMIGOS, valor, motivo }, prueba.entorno),
      ).toMatchObject({ ok: false, codigo: 'TAREA_YA_TIENE_PR' });
      comprobar();
    },
  );

  it('tarea real de la semilla con PR fusionado → TAREA_YA_TIENE_PR', async () => {
    const prueba = preparar();
    expect(
      await cambiarRequierePR(
        { idActor: SUPERVISOR, idTarea: MOVIMIENTO, valor: false },
        prueba.entorno,
      ),
    ).toMatchObject({ codigo: 'TAREA_YA_TIENE_PR' });
  });

  it('SIN_CAMBIOS: activar algo activo o desactivar algo desactivado (con motivo)', async () => {
    const prueba = preparar();
    const comprobar = sinEscritura(prueba);
    expect(
      await cambiarRequierePR(
        { idActor: SUPERVISOR, idTarea: ENEMIGOS, valor: true },
        prueba.entorno,
      ),
    ).toEqual({ ok: false, codigo: 'SIN_CAMBIOS', mensaje: MENSAJES.SIN_CAMBIOS });
    comprobar();

    prueba.modificar(cambiarTarea(ENEMIGOS, { requiere_pr: false }));
    const comprobar2 = sinEscritura(prueba);
    expect(
      await cambiarRequierePR(
        { idActor: DEMO, idTarea: ENEMIGOS, valor: false, motivo: 'x' },
        prueba.entorno,
      ),
    ).toMatchObject({ codigo: 'SIN_CAMBIOS' });
    comprobar2();
  });

  it('el texto va antes que «sin cambios»: desactivar algo ya desactivado sin motivo → TEXTO_OBLIGATORIO', async () => {
    const prueba = preparar();
    prueba.modificar(cambiarTarea(ENEMIGOS, { requiere_pr: false }));
    expect(
      await cambiarRequierePR({ idActor: DEMO, idTarea: ENEMIGOS, valor: false }, prueba.entorno),
    ).toMatchObject({ codigo: 'TEXTO_OBLIGATORIO' });
  });

  it('FINALIZADO, INACTIVO, inexistentes y valor inválido', async () => {
    const prueba = preparar();
    const base = { idActor: SUPERVISOR, idTarea: ENEMIGOS, valor: false };
    const comprobar = sinEscritura(prueba);
    expect(
      await cambiarRequierePR({ ...base, idTarea: 'no-existe' }, prueba.entorno),
    ).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    expect(await cambiarRequierePR({ ...base, idActor: 'fantasma' }, prueba.entorno)).toMatchObject(
      {
        codigo: 'NO_ENCONTRADO',
      },
    );
    expect(
      await cambiarRequierePR({ ...base, valor: null } as unknown as typeof base, prueba.entorno),
    ).toMatchObject({ codigo: 'DATOS_INVALIDOS' });
    comprobar();

    prueba.modificar(cambiarProyecto({ estado: 'FINALIZADO' }));
    expect(await cambiarRequierePR(base, prueba.entorno)).toMatchObject({
      codigo: 'PROYECTO_FINALIZADO',
    });
    prueba.modificar(cambiarProyecto({ estado: 'ACTIVO' }));
    prueba.modificar(cambiarUsuario(SUPERVISOR, { estado: 'INACTIVO' }));
    expect(await cambiarRequierePR(base, prueba.entorno)).toMatchObject({
      codigo: 'USUARIO_INACTIVO',
    });
  });
});

import { describe, expect, it } from 'vitest';
import { ultimaActividadDeUsuario, type Id } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { codigo, crearSupervisorSinProyectos, desactivar, ids, valor } from '../pruebas/consultas';
import type { Resultado } from '../resultado';
import {
  listarPracticantes,
  listarPracticantesACargo,
  listarProyectosAsignables,
  obtenerPracticante,
  obtenerPracticanteACargo,
} from './practicantes';

// Semilla en AHORA_DE_PRUEBA (martes 17 de noviembre de 2026, 13:30 en Perú).
const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // pry-pl2d y pry-rsv
const SUPERVISOR_2 = 'usr-sup-02'; // pry-tie (finalizado) y pry-dat
const SUPERVISOR_3 = 'usr-sup-03'; // pry-inv
const PRACTICANTE = 'demo-practicante';
const PRA_CON_BAJA = 'usr-pra-03'; // pry-pl2d vigente; pry-tie con baja
const PRA_DOS_PROYECTOS = 'usr-pra-06'; // pry-pl2d y pry-rsv
const PRA_EN_FINALIZADO = 'usr-pra-15'; // vigente en pry-tie (finalizado)
const PRA_PRACTICA_FINALIZADA = 'usr-pra-19'; // INACTIVO

const PL2D = 'pry-pl2d';
const RSV = 'pry-rsv';
const TIE = 'pry-tie';

// ── Reglas comunes ───────────────────────────────────────────────────────────────────────────

type Llamada = (p: PruebaPreparada, idActor: Id) => Promise<Resultado<unknown>>;

const CONSULTAS: ReadonlyArray<{
  nombre: string;
  llamar: Llamada;
  exito: Id;
  /** Los roles que no tienen esta vista. */
  denegados: Id[];
}> = [
  {
    nombre: 'listarPracticantes',
    llamar: (p, idActor) => listarPracticantes({ idActor }, p.entorno),
    exito: ADMIN,
    denegados: [SUPERVISOR, PRACTICANTE],
  },
  {
    nombre: 'obtenerPracticante',
    llamar: (p, idActor) => obtenerPracticante({ idActor, idPracticante: PRA_CON_BAJA }, p.entorno),
    exito: ADMIN,
    denegados: [SUPERVISOR, PRACTICANTE],
  },
  {
    nombre: 'listarPracticantesACargo',
    llamar: (p, idActor) => listarPracticantesACargo({ idActor }, p.entorno),
    exito: SUPERVISOR,
    denegados: [ADMIN, PRACTICANTE],
  },
  {
    nombre: 'obtenerPracticanteACargo',
    llamar: (p, idActor) =>
      obtenerPracticanteACargo({ idActor, idPracticante: PRACTICANTE }, p.entorno),
    exito: SUPERVISOR,
    denegados: [ADMIN, PRACTICANTE],
  },
];

describe.each(CONSULTAS)('$nombre · reglas comunes', ({ llamar, exito, denegados }) => {
  it('con el rol de su vista tiene éxito y no escribe', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    expect((await llamar(prueba, exito)).ok).toBe(true);
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

  it('los otros roles reciben ROL_NO_PERMITIDO, sin que importe si el recurso existe', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    for (const idActor of denegados) {
      expect(codigo(await llamar(prueba, idActor)), idActor).toBe('ROL_NO_PERMITIDO');
    }
    comprobar();
  });
});

// ── listarPracticantes (Administrador) ───────────────────────────────────────────────────────

describe('listarPracticantes', () => {
  const listar = (p: PruebaPreparada) => listarPracticantes({ idActor: ADMIN }, p.entorno);

  it('trae a los 24 practicantes, por nombre, y ninguna otra cuenta', async () => {
    const prueba = prepararPrueba();

    const { practicantes } = valor(await listar(prueba));
    const nombres = practicantes.map((p) => p.nombre);

    expect(practicantes).toHaveLength(24);
    expect([...nombres].sort((a, b) => a.localeCompare(b, 'es'))).toEqual(nombres);
    expect(ids(practicantes)).not.toContain(ADMIN);
    expect(ids(practicantes)).not.toContain(SUPERVISOR);
  });

  it('los contadores: Activos incluye a los «Sin proyecto»', async () => {
    const prueba = prepararPrueba();

    expect(valor(await listar(prueba)).contadores).toEqual({
      TODOS: 24,
      ACTIVOS: 23,
      SIN_PROYECTO: 9,
      FINALIZADOS: 1,
    });
  });

  it('«Sin proyecto»: quienes no tienen proyecto vigente sin finalizar', async () => {
    const prueba = prepararPrueba();

    const { practicantes } = valor(await listar(prueba));
    const sin = ids(practicantes.filter((p) => p.situacion.sin_proyecto)).sort();

    // 15 a 18 siguen asignados a un proyecto finalizado; 20 a 24 no tienen asignación vigente.
    expect(sin).toEqual(
      ['15', '16', '17', '18', '20', '21', '22', '23', '24'].map((n) => `usr-pra-${n}`),
    );
  });

  it('quien finalizó la práctica sale como Finalizado, nunca «sin proyecto», y sin estado de fin', async () => {
    const prueba = prepararPrueba();

    const fila = valor(await listar(prueba)).practicantes.find(
      (p) => p.id === PRA_PRACTICA_FINALIZADA,
    )!;

    expect(fila.situacion).toEqual({ estado: 'FINALIZADO', sin_proyecto: false });
    expect(fila.fin).toBeNull();
  });

  it('cada fila trae área, especialidad, proyectos activos, carga, fechas y estado de fin', async () => {
    const prueba = prepararPrueba();

    const fila = valor(await listar(prueba)).practicantes.find((p) => p.id === PRACTICANTE)!;

    expect(fila).toMatchObject({
      nombre: 'Practicante Demo',
      correo: 'practicante@codaini.demo',
      area: { id: 'area-sw' },
      especialidad: { id: 'esp-sw-front' },
      situacion: { estado: 'ACTIVO', sin_proyecto: false },
      proyectos_activos: [{ id: PL2D, codigo: 'PL2D' }],
      carga: 1,
      fecha_fin_prevista: '2027-01-26',
      fin: { situacion: 'EN_CURSO', dias_restantes: 70 },
    });
  });

  it('un practicante en dos proyectos los lista a los dos; la carga cuenta ambos', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      tareas: d.tareas.map((t) =>
        t.id === 'tar-rsv-006'
          ? { ...t, estado: 'EN_PROGRESO', id_practicante: PRA_DOS_PROYECTOS }
          : t,
      ),
    }));

    const fila = valor(await listar(prueba)).practicantes.find((p) => p.id === PRA_DOS_PROYECTOS)!;

    expect(ids(fila.proyectos_activos)).toEqual([PL2D, RSV]);
    expect(fila.carga).toBe(2);
  });

  it('el estado de fin sigue el aviso previo de Configuración', async () => {
    const prueba = prepararPrueba();
    const fin = async (id: Id) =>
      valor(await listar(prueba)).practicantes.find((p) => p.id === id)!.fin;

    // usr-pra-02 está a 9 días (dentro del aviso de 14), usr-pra-03 ya venció, usr-pra-05 está a 50.
    expect(await fin('usr-pra-02')).toEqual({ situacion: 'AVISO', dias_restantes: 9 });
    expect(await fin(PRA_CON_BAJA)).toEqual({ situacion: 'VENCIDA', dias_restantes: -6 });
    expect(await fin('usr-pra-05')).toEqual({ situacion: 'EN_CURSO', dias_restantes: 50 });

    prueba.modificar((d) => ({
      parametros: d.parametros.map((p) =>
        p.clave === 'PRACTICA_AVISO_FIN_DIAS' ? { ...p, valor: { tipo: 'numero', valor: 60 } } : p,
      ),
    }));

    expect(await fin('usr-pra-05')).toEqual({ situacion: 'AVISO', dias_restantes: 50 });
  });

  it('sin el parámetro del aviso es CONFIGURACION_INVALIDA', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      parametros: d.parametros.filter((p) => p.clave !== 'PRACTICA_AVISO_FIN_DIAS'),
    }));

    expect(codigo(await listar(prueba))).toBe('CONFIGURACION_INVALIDA');
  });

  it('la última actividad es la de domain/ y la carga cuenta solo proyectos vigentes', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();

    const { practicantes } = valor(await listar(prueba));

    for (const fila of practicantes) {
      expect(fila.ultima_actividad, fila.id).toBe(
        ultimaActividadDeUsuario(fila.id, datos.historial),
      );
    }
    expect(practicantes.find((p) => p.id === 'usr-pra-04')!.carga).toBe(4);
    expect(practicantes.find((p) => p.id === PRA_EN_FINALIZADO)!.carga).toBe(0);
  });

  it('nunca trae contraseñas ni datos de acceso', async () => {
    const prueba = prepararPrueba();

    const texto = JSON.stringify(valor(await listar(prueba)));

    for (const u of prueba.datos().usuarios) expect(texto).not.toContain(u.contrasena);
    expect(texto).not.toContain('"celular"');
  });
});

// ── obtenerPracticante (Administrador) ───────────────────────────────────────────────────────

describe('obtenerPracticante', () => {
  const obtener = (p: PruebaPreparada, idPracticante: Id) =>
    obtenerPracticante({ idActor: ADMIN, idPracticante }, p.entorno);

  it('trae los datos personales de solo lectura, los de la práctica y la postulación de origen', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, PRA_CON_BAJA));

    expect(r.datos_personales).toMatchObject({
      id: PRA_CON_BAJA,
      correo: expect.any(String),
      celular: expect.any(String),
    });
    expect(r.practica).toMatchObject({
      area: { id: expect.any(String) },
      fecha_fin_prevista: expect.any(String),
      fin: { situacion: 'VENCIDA', dias_restantes: -6 },
      situacion: { estado: 'ACTIVO', sin_proyecto: false },
    });
    expect(r.postulacion_origen).toEqual({ id: 'pos-03', nombre: 'Camila Torres Ávila' });
  });

  it('separa los proyectos actuales de los anteriores, con sus fechas de alta y baja', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, PRA_CON_BAJA));

    expect(r.proyectos_actuales).toMatchObject([
      { proyecto: { codigo: 'PL2D' }, estado_proyecto: 'ACTIVO', fecha_baja: null },
    ]);
    expect(r.proyectos_anteriores).toMatchObject([
      {
        proyecto: { codigo: 'TIE' },
        estado_proyecto: 'FINALIZADO',
        fecha_alta: '2026-08-13',
        fecha_baja: '2026-09-18',
      },
    ]);
  });

  it('una asignación vigente en un proyecto finalizado es «anterior»', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, PRA_EN_FINALIZADO));

    expect(r.proyectos_actuales).toEqual([]);
    expect(r.proyectos_anteriores).toMatchObject([
      { proyecto: { codigo: 'TIE' }, fecha_baja: null },
    ]);
    expect(r.practica.situacion).toEqual({ estado: 'ACTIVO', sin_proyecto: true });
  });

  it('quien finalizó la práctica: Finalizado, sin estado de fin y su proyecto con baja', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, PRA_PRACTICA_FINALIZADA));

    expect(r.practica.situacion).toEqual({ estado: 'FINALIZADO', sin_proyecto: false });
    expect(r.practica.fin).toBeNull();
    expect(r.proyectos_anteriores).toMatchObject([{ fecha_baja: '2026-11-14' }]);
  });

  it('tareas actuales (en progreso o esperando) y completadas, de la más reciente a la más antigua', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, PRA_CON_BAJA));

    expect(ids(r.tareas_actuales)).toEqual(['tar-pl2d-012']);
    // 002 terminó el 20/10 en PL2D y tie-004 el 12/9 en TIE (proyecto del que salió).
    expect(ids(r.tareas_completadas)).toEqual(['tar-pl2d-002', 'tar-tie-004']);
    expect(r.tareas_completadas.every((t) => t.es_mia === false)).toBe(true);
    expect(r.tareas_completadas[1]!.proyecto.codigo).toBe('TIE');
  });

  it('la línea de tiempo trae lo que hizo y lo que se hizo sobre su cuenta, del más reciente al más antiguo', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();

    const r = valor(await obtener(prueba, PRA_CON_BAJA));
    const esperados = datos.historial.filter(
      (e) =>
        (e.autor.tipo === 'USUARIO' && e.autor.id_usuario === PRA_CON_BAJA) ||
        (e.elemento.tipo === 'USUARIO' && e.elemento.id === PRA_CON_BAJA),
    );
    const fechas = r.eventos.map((e) => Date.parse(e.evento.fecha));

    expect(r.eventos).toHaveLength(esperados.length);
    expect(esperados.length).toBeGreaterThan(0);
    expect([...fechas].sort((a, b) => b - a)).toEqual(fechas);
  });

  it('un id que no es de un practicante da NO_ENCONTRADO: ni el Administrador ni un Supervisor', async () => {
    const prueba = prepararPrueba();

    for (const id of [ADMIN, SUPERVISOR, 'no-existe']) {
      expect(codigo(await obtener(prueba, id)), id).toBe('NO_ENCONTRADO');
    }
  });

  it('nunca trae contraseñas', async () => {
    const prueba = prepararPrueba();

    const texto = JSON.stringify(valor(await obtener(prueba, PRA_CON_BAJA)));

    for (const u of prueba.datos().usuarios) expect(texto).not.toContain(u.contrasena);
  });
});

// ── listarPracticantesACargo (Supervisor) ────────────────────────────────────────────────────

describe('listarPracticantesACargo', () => {
  const listar = (p: PruebaPreparada, idActor: Id) =>
    listarPracticantesACargo({ idActor }, p.entorno);

  it('el Supervisor ve solo a las personas de sus proyectos', async () => {
    const prueba = prepararPrueba();

    const demo = valor(await listar(prueba, SUPERVISOR));
    const otro = valor(await listar(prueba, SUPERVISOR_3));

    expect(demo.practicantes).toHaveLength(8);
    expect(ids(demo.practicantes)).toContain(PRACTICANTE);
    expect(new Set(ids(otro.practicantes))).toEqual(
      new Set(['09', '10', '11', '12', '13', '14'].map((n) => `usr-pra-${n}`)),
    );
    // Nadie de un proyecto ajeno.
    expect(ids(demo.practicantes).filter((id) => ids(otro.practicantes).includes(id))).toEqual([]);
  });

  it('una persona en dos proyectos suyos sale en una sola fila con las dos participaciones', async () => {
    const prueba = prepararPrueba();

    const { practicantes } = valor(await listar(prueba, SUPERVISOR));
    const filas = practicantes.filter((p) => p.id === PRA_DOS_PROYECTOS);

    expect(filas).toHaveLength(1);
    expect(filas[0]!.proyectos.map((p) => p.proyecto.id).sort()).toEqual([PL2D, RSV]);
    expect(new Set(ids(practicantes)).size).toBe(practicantes.length);
  });

  it('Activos y Anteriores: los que salieron de todos sus proyectos o ya no tienen cuenta activa', async () => {
    const prueba = prepararPrueba();

    const r = valor(await listar(prueba, SUPERVISOR_2));

    expect(r.contadores).toEqual({ ACTIVOS: 4, ANTERIORES: 3 });
    const situacion = Object.fromEntries(r.practicantes.map((p) => [p.id, p.situacion]));
    expect(situacion).toMatchObject({
      'usr-pra-15': 'ACTIVO',
      'usr-pra-16': 'ACTIVO',
      [PRA_CON_BAJA]: 'ANTERIOR',
      [PRA_PRACTICA_FINALIZADA]: 'ANTERIOR',
      'usr-pra-20': 'ANTERIOR',
    });
  });

  it('las participaciones traen solo sus proyectos, con alta y baja', async () => {
    const prueba = prepararPrueba();

    const fila = valor(await listar(prueba, SUPERVISOR_2)).practicantes.find(
      (p) => p.id === PRA_CON_BAJA,
    )!;

    expect(fila.proyectos).toEqual([
      {
        proyecto: { id: TIE, codigo: 'TIE', nombre: 'Tienda en Línea Artesanal' },
        fecha_alta: '2026-08-13',
        fecha_baja: '2026-09-18',
      },
    ]);
  });

  it('la carga y «esperando mi revisión» cuentan solo los proyectos de este Supervisor', async () => {
    const prueba = prepararPrueba();
    // usr-pra-06 trabaja en PL2D y en RSV; con RSV a otro supervisor, cada uno ve solo su parte.
    prueba.modificar((d) => ({
      tareas: d.tareas.map((t) =>
        t.id === 'tar-rsv-006'
          ? { ...t, estado: 'EN_PROGRESO', id_practicante: PRA_DOS_PROYECTOS }
          : t,
      ),
      proyectos: d.proyectos.map((p) => (p.id === RSV ? { ...p, id_supervisor: SUPERVISOR_3 } : p)),
    }));
    const fila = (r: Awaited<ReturnType<typeof listar>>) =>
      valor(r).practicantes.find((p) => p.id === PRA_DOS_PROYECTOS)!;

    const comoDemo = fila(await listar(prueba, SUPERVISOR));
    const comoTres = fila(await listar(prueba, SUPERVISOR_3));

    // En PL2D: 018 en progreso y 0 esperando. En RSV: 006 en progreso y 005 esperando.
    expect(comoDemo).toMatchObject({ carga: 1, esperando_mi_revision: 0 });
    expect(comoTres).toMatchObject({ carga: 1, esperando_mi_revision: 1 });
    expect(comoDemo.proyectos.map((p) => p.proyecto.id)).toEqual([PL2D]);
    expect(comoTres.proyectos.map((p) => p.proyecto.id)).toEqual([RSV]);
  });

  it('una cuenta inactiva con una asignación vigente sale como «Anterior», no como «Activo»', async () => {
    const prueba = prepararPrueba();
    desactivar(prueba, 'usr-pra-15');

    const fila = valor(await listar(prueba, SUPERVISOR_2)).practicantes.find(
      (p) => p.id === 'usr-pra-15',
    )!;

    expect(fila.situacion).toBe('ANTERIOR');
  });

  it('la última actividad no cuenta lo que esa persona hizo en un proyecto de otro supervisor', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      proyectos: d.proyectos.map((p) => (p.id === RSV ? { ...p, id_supervisor: SUPERVISOR_3 } : p)),
      historial: [
        ...d.historial,
        {
          id: 'evt-reciente-rsv',
          fecha: '2026-11-17T18:00:00.000Z',
          autor: { tipo: 'USUARIO', id_usuario: PRA_DOS_PROYECTOS },
          tipo_accion: 'TAREA_TOMADA',
          elemento: { tipo: 'TAREA', id: 'tar-rsv-006', etiqueta: 'RSV-006' },
          id_proyecto: RSV,
          cambios: [],
          nota: null,
        },
      ],
    }));
    const ultima = async (idActor: Id) =>
      valor(await listar(prueba, idActor)).practicantes.find((p) => p.id === PRA_DOS_PROYECTOS)!
        .ultima_actividad;

    expect(await ultima(SUPERVISOR_3)).toBe('2026-11-17T18:00:00.000Z');
    expect(await ultima(SUPERVISOR)).not.toBe('2026-11-17T18:00:00.000Z');
    expect(await ultima(SUPERVISOR)).not.toBeNull();
  });

  it('«esperando mi revisión» cuenta las tareas de esa persona esperando supervisión', async () => {
    const prueba = prepararPrueba();

    const filas = valor(await listar(prueba, SUPERVISOR)).practicantes;
    const por = (id: Id) => filas.find((p) => p.id === id)!;

    expect(por('usr-pra-02')).toMatchObject({ carga: 1, esperando_mi_revision: 1 });
    expect(por('usr-pra-04')).toMatchObject({ carga: 4, esperando_mi_revision: 0 });
    expect(por(PRACTICANTE)).toMatchObject({ carga: 1, esperando_mi_revision: 1 });
  });

  it('la última actividad es la acción de esa persona en los proyectos de este Supervisor', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();
    const idsProyecto = new Set([PL2D, RSV]);
    const delSupervisor = datos.historial.filter(
      (e) => e.id_proyecto !== null && idsProyecto.has(e.id_proyecto),
    );

    const { practicantes } = valor(await listar(prueba, SUPERVISOR));

    for (const fila of practicantes) {
      expect(fila.ultima_actividad, fila.id).toBe(ultimaActividadDeUsuario(fila.id, delSupervisor));
    }
  });

  it('un Supervisor sin proyectos recibe un éxito con la lista vacía', async () => {
    const prueba = prepararPrueba();
    const idNuevo = crearSupervisorSinProyectos(prueba);

    expect(valor(await listar(prueba, idNuevo))).toEqual({
      practicantes: [],
      contadores: { ACTIVOS: 0, ANTERIORES: 0 },
    });
  });

  it('un proyecto reasignado deja de traer sus practicantes al Supervisor anterior', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      proyectos: d.proyectos.map((p) => (p.id === RSV ? { ...p, id_supervisor: SUPERVISOR_3 } : p)),
    }));

    const { practicantes } = valor(await listar(prueba, SUPERVISOR));

    expect(ids(practicantes)).not.toContain('usr-pra-07');
    expect(ids(practicantes)).toContain(PRA_DOS_PROYECTOS);
  });

  it('el tipo no tiene área técnica ni postulación de origen, y no filtra el celular ni la contraseña', async () => {
    const prueba = prepararPrueba();

    const r = valor(await listar(prueba, SUPERVISOR));
    const texto = JSON.stringify(r);

    expect(Object.keys(r.practicantes[0]!).sort()).toEqual([
      'carga',
      'correo',
      'especialidad',
      'esperando_mi_revision',
      'id',
      'nombre',
      'proyectos',
      'situacion',
      'ultima_actividad',
    ]);
    for (const practicante of prueba.datos().practicantes) {
      expect(texto).not.toContain(practicante.id_area_tecnica);
      expect(texto).not.toContain(practicante.id_postulante);
    }
    for (const u of prueba.datos().usuarios) {
      expect(texto).not.toContain(u.contrasena);
      expect(texto).not.toContain(u.celular);
    }
  });
});

// ── obtenerPracticanteACargo (Supervisor) ────────────────────────────────────────────────────

describe('obtenerPracticanteACargo', () => {
  const obtener = (p: PruebaPreparada, idActor: Id, idPracticante: Id) =>
    obtenerPracticanteACargo({ idActor, idPracticante }, p.entorno);

  it('trae los datos de contacto, la disponibilidad y la fecha de fin de la práctica', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, SUPERVISOR, PRACTICANTE));

    expect(r).toMatchObject({
      id: PRACTICANTE,
      nombre: 'Practicante Demo',
      correo: 'practicante@codaini.demo',
      celular: '917654321',
      discord: 'practicante-practicante',
      cuenta_github: 'practicante-practicante',
      disponibilidad_horaria: 25,
      especialidad: expect.any(String),
      fecha_fin_prevista: '2027-01-26',
      situacion: 'ACTIVO',
    });
  });

  it('el tipo no tiene área técnica, postulación ni estado de fin; solo la fecha de fin', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, SUPERVISOR, PRACTICANTE));
    const texto = JSON.stringify(r);

    expect(Object.keys(r).sort()).toEqual(
      [
        'correo',
        'celular',
        'cuenta_github',
        'discord',
        'disponibilidad_horaria',
        'especialidad',
        'eventos',
        'fecha_fin_prevista',
        'id',
        'nombre',
        'proyectos',
        'situacion',
        'tareas_actuales',
        'tareas_completadas',
      ].sort(),
    );
    for (const practicante of prueba.datos().practicantes) {
      expect(texto).not.toContain(practicante.id_area_tecnica);
      expect(texto).not.toContain(practicante.id_postulante);
    }
    for (const u of prueba.datos().usuarios) expect(texto).not.toContain(u.contrasena);
  });

  it('las tareas y la línea de tiempo son solo de los proyectos de este Supervisor', async () => {
    const prueba = prepararPrueba();

    // usr-pra-03 está en PL2D (de demo-supervisor) y salió de TIE (de usr-sup-02).
    const comoDemo = valor(await obtener(prueba, SUPERVISOR, PRA_CON_BAJA));
    const comoDos = valor(await obtener(prueba, SUPERVISOR_2, PRA_CON_BAJA));

    expect(comoDemo.proyectos.map((p) => p.proyecto.id)).toEqual([PL2D]);
    expect(ids(comoDemo.tareas_actuales)).toEqual(['tar-pl2d-012']);
    expect(ids(comoDemo.tareas_completadas)).toEqual(['tar-pl2d-002']);
    expect(comoDemo.situacion).toBe('ACTIVO');

    expect(comoDos.proyectos.map((p) => p.proyecto.id)).toEqual([TIE]);
    expect(comoDos.tareas_actuales).toEqual([]);
    expect(ids(comoDos.tareas_completadas)).toEqual(['tar-tie-004']);
    expect(comoDos.situacion).toBe('ANTERIOR');

    const proyectosDe = (r: typeof comoDemo) => new Set(r.eventos.map((e) => e.evento.id_proyecto));
    expect(proyectosDe(comoDemo)).toEqual(new Set([PL2D]));
    expect(proyectosDe(comoDos)).toEqual(new Set([TIE]));
    expect(
      [...comoDemo.eventos, ...comoDos.eventos].every(
        (e) => e.evento.autor.tipo === 'USUARIO' && e.evento.autor.id_usuario === PRA_CON_BAJA,
      ),
    ).toBe(true);
  });

  it('las tareas de un proyecto que pasó a otro supervisor ya no salen en el detalle', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      proyectos: d.proyectos.map((p) => (p.id === RSV ? { ...p, id_supervisor: SUPERVISOR_3 } : p)),
    }));

    const r = valor(await obtener(prueba, SUPERVISOR, PRA_DOS_PROYECTOS));
    const todas = [...r.tareas_actuales, ...r.tareas_completadas];

    expect(todas.length).toBeGreaterThan(0);
    expect(todas.every((t) => t.proyecto.id === PL2D)).toBe(true);
    expect(r.proyectos.map((p) => p.proyecto.id)).toEqual([PL2D]);
  });

  it('una persona de un proyecto ajeno da FUERA_DE_ALCANCE', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await obtener(prueba, SUPERVISOR_2, PRACTICANTE))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await obtener(prueba, SUPERVISOR, 'usr-pra-09'))).toBe('FUERA_DE_ALCANCE');
  });

  it('un Supervisor sin proyectos recibe FUERA_DE_ALCANCE con cualquier practicante', async () => {
    const prueba = prepararPrueba();
    const idNuevo = crearSupervisorSinProyectos(prueba);

    expect(codigo(await obtener(prueba, idNuevo, PRACTICANTE))).toBe('FUERA_DE_ALCANCE');
  });

  it('un id que no es de un practicante o no existe da NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();

    for (const id of [ADMIN, SUPERVISOR, 'no-existe']) {
      expect(codigo(await obtener(prueba, SUPERVISOR, id)), id).toBe('NO_ENCONTRADO');
    }
  });

  it('quien finalizó la práctica sigue visible como «anterior» con su historial en esos proyectos', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, SUPERVISOR_2, PRA_PRACTICA_FINALIZADA));

    expect(r.situacion).toBe('ANTERIOR');
    expect(r.proyectos).toMatchObject([{ fecha_baja: '2026-11-14' }]);
    expect(ids(r.tareas_completadas)).toEqual(['tar-tie-006']);
  });
});

// ── Acciones disponibles y proyectos asignables (Fase 5, módulo 5.2) ─────────────────────────

describe('obtenerPracticante: acciones y tareas a liberar', () => {
  const detalle = async (p: PruebaPreparada, id: Id) =>
    valor(await obtenerPracticante({ idActor: ADMIN, idPracticante: id }, p.entorno));

  it('una práctica activa ofrece editar, restablecer la contraseña y finalizar, pero no reactivar', async () => {
    const prueba = prepararPrueba();

    const { acciones } = await detalle(prueba, PRA_CON_BAJA);

    expect(acciones).toEqual(['EDITAR_DATOS', 'RESTABLECER_CONTRASENA', 'FINALIZAR']);
  });

  it('una práctica finalizada ofrece editar y reactivar, pero no restablecer ni finalizar', async () => {
    const prueba = prepararPrueba();

    const { acciones, tareas_a_liberar } = await detalle(prueba, PRA_PRACTICA_FINALIZADA);

    expect(acciones).toEqual(['EDITAR_DATOS', 'REACTIVAR']);
    expect(tareas_a_liberar).toBe(0);
  });

  it('las tareas a liberar son las EN_PROGRESO del practicante, no las que esperan supervisión', async () => {
    const prueba = prepararPrueba();
    const tareas = prueba.datos().tareas.filter((t) => t.id_practicante === PRA_DOS_PROYECTOS);
    const enProgreso = tareas.filter((t) => t.estado === 'EN_PROGRESO').length;
    expect(enProgreso).toBeGreaterThan(0);

    const { tareas_a_liberar } = await detalle(prueba, PRA_DOS_PROYECTOS);

    expect(tareas_a_liberar).toBe(enProgreso);
  });

  it('un practicante sin tareas en progreso tiene 0 por liberar', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      tareas: d.tareas.map((t) =>
        t.id_practicante === PRA_CON_BAJA && t.estado === 'EN_PROGRESO'
          ? { ...t, estado: 'ESPERANDO_SUPERVISION' as const }
          : t,
      ),
    }));

    expect((await detalle(prueba, PRA_CON_BAJA)).tareas_a_liberar).toBe(0);
  });

  it('no escribe', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    await detalle(prueba, PRA_CON_BAJA);

    comprobar();
  });
});

describe('listarProyectosAsignables', () => {
  const listar = async (p: PruebaPreparada, id: Id, idActor: Id = ADMIN) =>
    await listarProyectosAsignables({ idActor, idPracticante: id }, p.entorno);

  it('excluye los proyectos finalizados y aquellos donde ya tiene una asignación vigente', async () => {
    const prueba = prepararPrueba();

    const { proyectos } = valor(await listar(prueba, PRA_DOS_PROYECTOS));
    const idsAsignables = ids(proyectos);

    expect(idsAsignables).not.toContain(PL2D);
    expect(idsAsignables).not.toContain(RSV);
    expect(idsAsignables).not.toContain(TIE);
    expect(idsAsignables.length).toBeGreaterThan(0);
  });

  it('un proyecto donde tuvo baja vuelve a ser asignable (se crea otra asignación)', async () => {
    const prueba = prepararPrueba();
    expect(ids(valor(await listar(prueba, PRA_CON_BAJA)).proyectos)).not.toContain(PL2D);

    prueba.modificar((d) => ({
      asignaciones: d.asignaciones.map((a) =>
        a.id_practicante === PRA_CON_BAJA && a.id_proyecto === PL2D && a.fecha_baja === null
          ? { ...a, fecha_baja: '2026-11-01' }
          : a,
      ),
    }));

    expect(ids(valor(await listar(prueba, PRA_CON_BAJA)).proyectos)).toContain(PL2D);
  });

  it('un practicante con la práctica finalizada no puede asignarse a ninguno', async () => {
    const prueba = prepararPrueba();

    expect(valor(await listar(prueba, PRA_PRACTICA_FINALIZADA)).proyectos).toEqual([]);
  });

  it('viene por nombre y solo con el resumen del proyecto', async () => {
    const prueba = prepararPrueba();

    const { proyectos } = valor(await listar(prueba, PRA_CON_BAJA));
    const nombres = proyectos.map((p) => p.nombre);

    expect([...nombres].sort((a, b) => a.localeCompare(b, 'es'))).toEqual(nombres);
    for (const p of proyectos) expect(Object.keys(p).sort()).toEqual(['codigo', 'id', 'nombre']);
  });

  it('un practicante inexistente da NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await listar(prueba, 'no-existe'))).toBe('NO_ENCONTRADO');
  });

  it('el Supervisor y el Practicante reciben ROL_NO_PERMITIDO', async () => {
    const prueba = prepararPrueba();

    for (const idActor of [SUPERVISOR, PRACTICANTE]) {
      expect(codigo(await listar(prueba, PRA_CON_BAJA, idActor)), idActor).toBe('ROL_NO_PERMITIDO');
    }
  });

  it('un actor INACTIVO da USUARIO_INACTIVO y un identificador vacío, DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    desactivar(prueba, ADMIN);

    expect(codigo(await listar(prueba, PRA_CON_BAJA))).toBe('USUARIO_INACTIVO');
    expect(codigo(await listar(prepararPrueba(), ''))).toBe('DATOS_INVALIDOS');
  });

  it('no escribe', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    await listar(prueba, PRA_CON_BAJA);

    comprobar();
  });
});

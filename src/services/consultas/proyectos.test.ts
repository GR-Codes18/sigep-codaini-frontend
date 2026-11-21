import { describe, expect, it } from 'vitest';
import type { EventoHistorial, Id } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import type { Resultado } from '../resultado';
import {
  ACTIVIDAD_RECIENTE_MAXIMA,
  listarMisProyectos,
  listarPracticantesAsignables,
  listarProyectos,
  listarTerminadasDeProyecto,
  obtenerEquipoProyecto,
  obtenerProyecto,
  obtenerResumenProyectoAnterior,
  obtenerTableroProyecto,
} from './proyectos';

// Semilla en AHORA_DE_PRUEBA (martes 17 de noviembre de 2026, 13:30 en Perú).
const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // pry-pl2d y pry-rsv
const SUPERVISOR_2 = 'usr-sup-02'; // pry-tie (finalizado) y pry-dat (sin practicantes)
const SUPERVISOR_3 = 'usr-sup-03'; // pry-inv (en pausa)
const PRACTICANTE = 'demo-practicante'; // solo pry-pl2d
const PRA_PL2D_RSV = 'usr-pra-06'; // pry-pl2d y pry-rsv
const PRA_RSV = 'usr-pra-07'; // solo pry-rsv
const PRA_INV = 'usr-pra-09'; // pry-inv (en pausa)
const PRA_CON_BAJA = 'usr-pra-03'; // pry-pl2d vigente; pry-tie con baja
const PRA_EN_FINALIZADO = 'usr-pra-15'; // asignación vigente en pry-tie (finalizado)
const PRA_PRACTICA_FINALIZADA = 'usr-pra-19'; // INACTIVO
const PRA_SIN_PROYECTO = 'usr-pra-21';

const PL2D = 'pry-pl2d';
const RSV = 'pry-rsv';
const INV = 'pry-inv';
const TIE = 'pry-tie';
const DAT = 'pry-dat';

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

function crearSupervisorSinProyectos(prueba: PruebaPreparada): Id {
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
    supervisores: [
      ...d.supervisores,
      { id_usuario: 'sup-nuevo', discord: null, cuenta_github: null },
    ],
  }));
  return 'sup-nuevo';
}

function eventoDevuelta(idTarea: Id, idProyecto: Id): EventoHistorial {
  return {
    id: `evt-dev-${idTarea}`,
    fecha: '2026-11-17T17:00:00.000Z',
    autor: { tipo: 'USUARIO', id_usuario: SUPERVISOR },
    tipo_accion: 'TAREA_DEVUELTA',
    elemento: { tipo: 'TAREA', id: idTarea, etiqueta: idTarea },
    id_proyecto: idProyecto,
    cambios: [],
    nota: 'Revisa los casos de borde.',
  };
}

// ── Reglas comunes a las siete consultas ─────────────────────────────────────────────────────

type Llamada = (p: PruebaPreparada, idActor: Id, idProyecto?: Id) => Promise<Resultado<unknown>>;

const CONSULTAS: ReadonlyArray<{
  nombre: string;
  llamar: Llamada;
  /** Un actor y un proyecto con los que la consulta tiene éxito. */
  exito: { idActor: Id; idProyecto?: Id };
}> = [
  {
    nombre: 'listarProyectos',
    llamar: (p, idActor) => listarProyectos({ idActor }, p.entorno),
    exito: { idActor: ADMIN },
  },
  {
    nombre: 'listarMisProyectos',
    llamar: (p, idActor) => listarMisProyectos({ idActor }, p.entorno),
    exito: { idActor: PRACTICANTE },
  },
  {
    nombre: 'obtenerProyecto',
    llamar: (p, idActor, idProyecto = PL2D) => obtenerProyecto({ idActor, idProyecto }, p.entorno),
    exito: { idActor: SUPERVISOR, idProyecto: PL2D },
  },
  {
    nombre: 'obtenerEquipoProyecto',
    llamar: (p, idActor, idProyecto = PL2D) =>
      obtenerEquipoProyecto({ idActor, idProyecto }, p.entorno),
    exito: { idActor: SUPERVISOR, idProyecto: PL2D },
  },
  {
    nombre: 'obtenerTableroProyecto',
    llamar: (p, idActor, idProyecto = PL2D) =>
      obtenerTableroProyecto({ idActor, idProyecto }, p.entorno),
    exito: { idActor: PRACTICANTE, idProyecto: PL2D },
  },
  {
    nombre: 'listarTerminadasDeProyecto',
    llamar: (p, idActor, idProyecto = PL2D) =>
      listarTerminadasDeProyecto({ idActor, idProyecto }, p.entorno),
    exito: { idActor: ADMIN, idProyecto: TIE },
  },
  {
    nombre: 'obtenerResumenProyectoAnterior',
    llamar: (p, idActor, idProyecto = TIE) =>
      obtenerResumenProyectoAnterior({ idActor, idProyecto }, p.entorno),
    exito: { idActor: PRA_CON_BAJA, idProyecto: TIE },
  },
];

describe.each(CONSULTAS)('$nombre · reglas comunes', ({ llamar, exito }) => {
  it('con un actor y un recurso dentro del alcance tiene éxito y no escribe', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    const r = await llamar(prueba, exito.idActor, exito.idProyecto);

    expect(r.ok).toBe(true);
    comprobar();
  });

  it('un actor inexistente da NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    expect(codigo(await llamar(prueba, 'no-existe', exito.idProyecto))).toBe('NO_ENCONTRADO');
    comprobar();
  });

  it('un actor INACTIVO da USUARIO_INACTIVO, sea cual sea su rol', async () => {
    for (const idActor of [ADMIN, SUPERVISOR, PRACTICANTE]) {
      const prueba = prepararPrueba();
      desactivar(prueba, idActor);
      const comprobar = sinEscritura(prueba);

      expect(codigo(await llamar(prueba, idActor, exito.idProyecto)), idActor).toBe(
        'USUARIO_INACTIVO',
      );
      comprobar();
    }
  });

  it('un identificador vacío da DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await llamar(prueba, ''))).toBe('DATOS_INVALIDOS');
  });
});

describe.each(CONSULTAS.filter((c) => c.exito.idProyecto !== undefined))(
  '$nombre · proyecto',
  ({ llamar, exito }) => {
    it('un proyecto inexistente da NO_ENCONTRADO', async () => {
      const prueba = prepararPrueba();

      expect(codigo(await llamar(prueba, exito.idActor, 'no-existe'))).toBe('NO_ENCONTRADO');
    });
  },
);

// ── listarProyectos ──────────────────────────────────────────────────────────────────────────

describe('listarProyectos', () => {
  const listar = (p: PruebaPreparada, idActor: Id) => listarProyectos({ idActor }, p.entorno);

  describe('puede_crear y supervisores_disponibles', () => {
    it('el Administrador puede crear y recibe a los supervisores activos, por nombre', async () => {
      const prueba = prepararPrueba();
      const esperados = prueba
        .datos()
        .usuarios.filter((u) => u.rol === 'SUPERVISOR' && u.estado === 'ACTIVO')
        .map((u) => u.nombre)
        .sort((a, b) => a.localeCompare(b, 'es'));

      const r = valor(await listar(prueba, ADMIN));

      expect(r.puede_crear).toBe(true);
      expect(r.supervisores_disponibles.map((s) => s.nombre)).toEqual(esperados);
      expect(esperados.length).toBeGreaterThan(1);
    });

    it('un supervisor inactivo no se ofrece', async () => {
      const prueba = prepararPrueba();
      desactivar(prueba, SUPERVISOR_3);

      const r = valor(await listar(prueba, ADMIN));

      expect(ids(r.supervisores_disponibles)).not.toContain(SUPERVISOR_3);
      expect(ids(r.supervisores_disponibles)).toContain(SUPERVISOR_2);
    });

    it('el Supervisor no puede crear proyectos y no recibe candidatos', async () => {
      const prueba = prepararPrueba();

      const r = valor(await listar(prueba, SUPERVISOR));

      expect(r.puede_crear).toBe(false);
      expect(r.supervisores_disponibles).toEqual([]);
    });
  });

  it('el Administrador ve los 5 proyectos, con los contadores de las pestañas', async () => {
    const prueba = prepararPrueba();

    const { proyectos, contadores } = valor(await listar(prueba, ADMIN));

    expect(ids(proyectos)).toEqual([PL2D, RSV, INV, TIE, DAT]);
    expect(contadores).toEqual({ TODOS: 5, ACTIVO: 3, EN_PAUSA: 1, FINALIZADO: 1 });
  });

  it('el Supervisor ve solo los suyos', async () => {
    const prueba = prepararPrueba();

    expect(ids(valor(await listar(prueba, SUPERVISOR)).proyectos)).toEqual([PL2D, RSV]);
    expect(ids(valor(await listar(prueba, SUPERVISOR_2)).proyectos)).toEqual([TIE, DAT]);
    expect(ids(valor(await listar(prueba, SUPERVISOR_3)).proyectos)).toEqual([INV]);
  });

  it('los contadores del Supervisor cuentan solo sus proyectos', async () => {
    const prueba = prepararPrueba();

    expect(valor(await listar(prueba, SUPERVISOR_2)).contadores).toEqual({
      TODOS: 2,
      ACTIVO: 1,
      EN_PAUSA: 0,
      FINALIZADO: 1,
    });
  });

  it('un Supervisor sin proyectos recibe un éxito con la lista vacía', async () => {
    const prueba = prepararPrueba();
    const idNuevo = crearSupervisorSinProyectos(prueba);

    expect(valor(await listar(prueba, idNuevo))).toEqual({
      proyectos: [],
      contadores: { TODOS: 0, ACTIVO: 0, EN_PAUSA: 0, FINALIZADO: 0 },
      puede_crear: false,
      supervisores_disponibles: [],
    });
  });

  it('el Practicante no tiene esta vista: ROL_NO_PERMITIDO', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await listar(prueba, PRACTICANTE))).toBe('ROL_NO_PERMITIDO');
  });

  it('cada fila trae supervisor, equipo, avance, supervisión pendiente, reunión y última actividad', async () => {
    const prueba = prepararPrueba();

    const { proyectos } = valor(await listar(prueba, SUPERVISOR));
    const pl2d = proyectos.find((p) => p.id === PL2D)!;

    expect(pl2d).toMatchObject({
      nombre: 'Plataforma 2D: Aventura Andina',
      codigo: 'PL2D',
      estado: 'ACTIVO',
      supervisor: { id: SUPERVISOR, nombre: 'Supervisor Demo' },
      practicantes_activos: 6,
      avance: { numerador: 6, denominador: 20, porcentaje: 30 },
      tareas_esperando_supervision: 2,
    });
    expect(pl2d.ultima_actividad).not.toBeNull();
  });

  it('la próxima reunión sale en hora de Perú; sin reunión queda «Sin definir»', async () => {
    const prueba = prepararPrueba();

    const { proyectos } = valor(await listar(prueba, ADMIN));
    const por = (id: Id) => proyectos.find((p) => p.id === id)!.reunion;

    // Hoy es martes 17: el miércoles 18 a las 15:30 y el lunes 23 a las 10:00 (Perú, UTC−5).
    expect(por(RSV)).toEqual({
      dia_reunion: 'MIERCOLES',
      hora_reunion: '15:30',
      proxima: '2026-11-18T20:30:00.000Z',
    });
    expect(por(PL2D).proxima).toBe('2026-11-23T15:00:00.000Z');
    expect(por(INV)).toEqual({ dia_reunion: null, hora_reunion: null, proxima: null });
  });

  it('un proyecto sin practicantes ni avance medible lo dice con 0 y con proporción 0 sobre el total', async () => {
    const prueba = prepararPrueba();

    const dat = valor(await listar(prueba, ADMIN)).proyectos.find((p) => p.id === DAT)!;

    expect(dat.practicantes_activos).toBe(0);
    expect(dat.avance).toEqual({ numerador: 0, denominador: 4, porcentaje: 0 });
  });

  it('un proyecto sin tareas tiene avance null', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({ tareas: d.tareas.filter((t) => t.id_proyecto !== DAT) }));

    const dat = valor(await listar(prueba, ADMIN)).proyectos.find((p) => p.id === DAT)!;

    expect(dat.avance).toBeNull();
  });

  it('un proyecto reasignado deja de salir en la lista del Supervisor anterior', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      proyectos: d.proyectos.map((p) => (p.id === RSV ? { ...p, id_supervisor: SUPERVISOR_3 } : p)),
    }));

    expect(ids(valor(await listar(prueba, SUPERVISOR)).proyectos)).toEqual([PL2D]);
    expect(ids(valor(await listar(prueba, SUPERVISOR_3)).proyectos)).toEqual([RSV, INV]);
  });

  it('las filas no traen correo ni celular de nadie', async () => {
    const prueba = prepararPrueba();

    const texto = JSON.stringify(valor(await listar(prueba, SUPERVISOR)));

    for (const u of prueba.datos().usuarios) {
      expect(texto, u.id).not.toContain(u.correo);
      expect(texto, u.id).not.toContain(u.celular);
    }
  });
});

// ── listarMisProyectos ───────────────────────────────────────────────────────────────────────

describe('listarMisProyectos', () => {
  const listar = (p: PruebaPreparada, idActor: Id) => listarMisProyectos({ idActor }, p.entorno);

  it('un practicante con un proyecto: sus datos, su carga y las tareas por tomar', async () => {
    const prueba = prepararPrueba();

    const { vigentes, anteriores } = valor(await listar(prueba, PRACTICANTE));

    expect(ids(vigentes)).toEqual([PL2D]);
    expect(vigentes[0]).toMatchObject({
      codigo: 'PL2D',
      estado: 'ACTIVO',
      supervisor: { id: SUPERVISOR, nombre: 'Supervisor Demo' },
      mi_carga: 1,
      tareas_disponibles: 3,
      avance: { numerador: 6, denominador: 20, porcentaje: 30 },
      reunion: { dia_reunion: 'LUNES', hora_reunion: '10:00' },
    });
    expect(anteriores).toEqual([]);
  });

  it('un practicante en dos proyectos los ve a los dos, y su carga es por proyecto', async () => {
    const prueba = prepararPrueba();

    const { vigentes } = valor(await listar(prueba, PRA_PL2D_RSV));

    expect(ids(vigentes)).toEqual([PL2D, RSV]);
    expect(vigentes.map((p) => p.mi_carga)).toEqual([1, 0]);
  });

  it('un proyecto en pausa sigue siendo vigente', async () => {
    const prueba = prepararPrueba();

    const { vigentes } = valor(await listar(prueba, PRA_INV));

    expect(vigentes).toMatchObject([{ id: INV, estado: 'EN_PAUSA' }]);
  });

  it('un proyecto del que salió pasa a «anteriores» con «Ya no participas» y su periodo', async () => {
    const prueba = prepararPrueba();

    const { vigentes, anteriores } = valor(await listar(prueba, PRA_CON_BAJA));

    expect(ids(vigentes)).toEqual([PL2D]);
    expect(anteriores).toEqual([
      {
        id: TIE,
        nombre: 'Tienda en Línea Artesanal',
        codigo: 'TIE',
        motivo: 'YA_NO_PARTICIPAS',
        supervisor: { id: SUPERVISOR_2, nombre: 'Ricardo Salinas Vega' },
        fecha_alta: '2026-08-13',
        fecha_fin: '2026-09-18',
      },
    ]);
  });

  it('un proyecto finalizado con asignación vigente es «anterior» y no «vigente»', async () => {
    const prueba = prepararPrueba();

    const { vigentes, anteriores } = valor(await listar(prueba, PRA_EN_FINALIZADO));
    const fin = prueba.datos().proyectos.find((p) => p.id === TIE)!.fecha_fin_real;

    expect(vigentes).toEqual([]);
    expect(anteriores).toMatchObject([{ id: TIE, motivo: 'FINALIZADO', fecha_fin: fin }]);
    expect(fin).not.toBeNull();
  });

  it('un anterior trae solo datos mínimos: sin avance, carga, reunión ni tareas', async () => {
    const prueba = prepararPrueba();

    const { anteriores } = valor(await listar(prueba, PRA_CON_BAJA));

    expect(Object.keys(anteriores[0]!).sort()).toEqual([
      'codigo',
      'fecha_alta',
      'fecha_fin',
      'id',
      'motivo',
      'nombre',
      'supervisor',
    ]);
  });

  it('si volvió a un proyecto, aparece una sola vez con su asignación más reciente', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      asignaciones: [
        ...d.asignaciones,
        {
          id: 'asi-nueva',
          id_practicante: PRA_CON_BAJA,
          id_proyecto: TIE,
          fecha_alta: '2026-10-01',
          fecha_baja: null,
        },
      ],
    }));

    const { anteriores } = valor(await listar(prueba, PRA_CON_BAJA));

    expect(anteriores).toMatchObject([{ id: TIE, motivo: 'FINALIZADO', fecha_alta: '2026-10-01' }]);
  });

  it('sin ninguna asignación: éxito con las dos listas vacías', async () => {
    const prueba = prepararPrueba();

    expect(valor(await listar(prueba, PRA_SIN_PROYECTO))).toEqual({ vigentes: [], anteriores: [] });
  });

  it('nunca incluye proyectos en los que no estuvo', async () => {
    const prueba = prepararPrueba();

    const r = valor(await listar(prueba, PRA_RSV));

    expect(ids(r.vigentes)).toEqual([RSV]);
    expect(r.anteriores).toEqual([]);
  });

  it('el Administrador y el Supervisor no tienen esta vista: ROL_NO_PERMITIDO', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await listar(prueba, ADMIN))).toBe('ROL_NO_PERMITIDO');
    expect(codigo(await listar(prueba, SUPERVISOR))).toBe('ROL_NO_PERMITIDO');
  });

  it('un practicante con la práctica finalizada (INACTIVO) no accede', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await listar(prueba, PRA_PRACTICA_FINALIZADA))).toBe('USUARIO_INACTIVO');
  });
});

// ── obtenerProyecto ──────────────────────────────────────────────────────────────────────────

describe('obtenerProyecto', () => {
  const obtener = (p: PruebaPreparada, idActor: Id, idProyecto: Id) =>
    obtenerProyecto({ idActor, idProyecto }, p.entorno);

  describe('acciones', () => {
    const gestion = async (p: PruebaPreparada, idActor: Id, idProyecto: Id) => {
      const r = valor(await obtener(p, idActor, idProyecto));
      if (r.vista !== 'GESTION') throw new Error('Se esperaba la vista de gestión.');
      return r;
    };

    it('el Administrador puede cambiar los datos, la rama base, la reunión y los enlaces, y llevar el ciclo de vida', async () => {
      const prueba = prepararPrueba();

      expect((await gestion(prueba, ADMIN, PL2D)).acciones).toEqual([
        'EDITAR_DATOS',
        'CAMBIAR_RAMA_BASE',
        'DEFINIR_REUNION',
        'GESTIONAR_ENLACES',
        'CAMBIAR_SUPERVISOR',
        'PAUSAR',
        'FINALIZAR',
      ]);
    });

    it('también en un proyecto finalizado (los datos siguen editables) y solo se puede reactivar', async () => {
      const prueba = prepararPrueba();

      expect((await gestion(prueba, ADMIN, TIE)).acciones).toEqual([
        'EDITAR_DATOS',
        'CAMBIAR_RAMA_BASE',
        'DEFINIR_REUNION',
        'GESTIONAR_ENLACES',
        'REACTIVAR',
      ]);
    });

    it('el Supervisor del proyecto no edita los datos: solo la rama base, la reunión y los enlaces', async () => {
      const prueba = prepararPrueba();

      expect((await gestion(prueba, SUPERVISOR, PL2D)).acciones).toEqual([
        'CAMBIAR_RAMA_BASE',
        'DEFINIR_REUNION',
        'GESTIONAR_ENLACES',
      ]);
    });

    it('el código nunca figura entre las acciones: no se edita', async () => {
      const prueba = prepararPrueba();

      const { acciones } = await gestion(prueba, ADMIN, PL2D);

      expect(acciones.join(' ')).not.toMatch(/CODIGO/);
    });

    describe('ciclo de vida', () => {
      it('un proyecto en pausa ofrece reanudar y finalizar, pero no pausar', async () => {
        const prueba = prepararPrueba();

        const { acciones } = await gestion(prueba, ADMIN, INV);

        expect(acciones).toContain('REANUDAR');
        expect(acciones).toContain('FINALIZAR');
        expect(acciones).not.toContain('PAUSAR');
        expect(acciones).not.toContain('REACTIVAR');
      });

      it('con tareas esperando supervisión finalizar se ofrece, con la cantidad que bloquea', async () => {
        const prueba = prepararPrueba();

        const r = await gestion(prueba, ADMIN, PL2D);

        expect(r.acciones).toContain('FINALIZAR');
        expect(r.ciclo_de_vida.tareas_esperando_supervision).toBe(2);
        expect(r.ciclo_de_vida.tareas_a_liberar).toBe(0);
      });

      it('sin tareas esperando, informa cuántas «En progreso» se liberarían', async () => {
        const prueba = prepararPrueba();
        prueba.modificar((d) => ({
          tareas: d.tareas.map((t) =>
            t.id_proyecto === PL2D && t.estado === 'ESPERANDO_SUPERVISION'
              ? { ...t, estado: 'TERMINADA' as const }
              : t,
          ),
        }));
        const enProgreso = prueba
          .datos()
          .tareas.filter((t) => t.id_proyecto === PL2D && t.estado === 'EN_PROGRESO').length;

        const r = await gestion(prueba, ADMIN, PL2D);

        expect(r.ciclo_de_vida.tareas_esperando_supervision).toBe(0);
        expect(r.ciclo_de_vida.tareas_a_liberar).toBe(enProgreso);
        expect(enProgreso).toBeGreaterThan(0);
      });

      it('reactivar se ofrece también con el supervisor inactivo, y lo marca', async () => {
        const prueba = prepararPrueba();
        desactivar(prueba, SUPERVISOR_2);

        const r = await gestion(prueba, ADMIN, TIE);

        expect(r.acciones).toContain('REACTIVAR');
        expect(r.ciclo_de_vida.supervisor_inactivo).toBe(true);
      });

      it('con el supervisor activo, reactivar no está bloqueado', async () => {
        const prueba = prepararPrueba();

        expect((await gestion(prueba, ADMIN, TIE)).ciclo_de_vida.supervisor_inactivo).toBe(false);
      });

      it('el Supervisor del proyecto no controla el ciclo de vida: eso es del Administrador', async () => {
        const prueba = prepararPrueba();

        const { acciones } = await gestion(prueba, SUPERVISOR, PL2D);

        for (const a of [
          'PAUSAR',
          'REANUDAR',
          'FINALIZAR',
          'REACTIVAR',
          'CAMBIAR_SUPERVISOR',
        ] as const) {
          expect(acciones).not.toContain(a);
        }
      });
    });

    describe('supervisores_destino', () => {
      it('son los demás supervisores activos, por nombre, sin el actual', async () => {
        const prueba = prepararPrueba();
        const esperados = prueba
          .datos()
          .usuarios.filter(
            (u) => u.rol === 'SUPERVISOR' && u.estado === 'ACTIVO' && u.id !== SUPERVISOR,
          )
          .map((u) => u.nombre)
          .sort((a, b) => a.localeCompare(b, 'es'));

        const { supervisores_destino } = await gestion(prueba, ADMIN, PL2D);

        expect(supervisores_destino.map((s) => s.nombre)).toEqual(esperados);
        expect(ids(supervisores_destino)).not.toContain(SUPERVISOR);
      });

      it('un supervisor inactivo no es destino', async () => {
        const prueba = prepararPrueba();
        desactivar(prueba, SUPERVISOR_3);

        const { supervisores_destino } = await gestion(prueba, ADMIN, PL2D);

        expect(ids(supervisores_destino)).not.toContain(SUPERVISOR_3);
      });

      it('un proyecto finalizado no admite cambiar de supervisor: la lista viene vacía', async () => {
        const prueba = prepararPrueba();

        const r = await gestion(prueba, ADMIN, TIE);

        expect(r.supervisores_destino).toEqual([]);
        expect(r.acciones).not.toContain('CAMBIAR_SUPERVISOR');
      });
    });

    it('la vista del Practicante no trae acciones de gestión', async () => {
      const prueba = prepararPrueba();

      const r = valor(await obtener(prueba, PRACTICANTE, PL2D));

      expect(r.vista).toBe('PRACTICANTE');
      expect(r).not.toHaveProperty('acciones');
    });
  });

  it('el Administrador recibe la vista de gestión de cualquier proyecto, también el finalizado', async () => {
    const prueba = prepararPrueba();

    for (const id of [PL2D, RSV, INV, TIE, DAT]) {
      expect(valor(await obtener(prueba, ADMIN, id)).vista, id).toBe('GESTION');
    }
  });

  it('el Supervisor recibe la vista de gestión de sus proyectos (también el finalizado)', async () => {
    const prueba = prepararPrueba();

    expect(valor(await obtener(prueba, SUPERVISOR, PL2D)).vista).toBe('GESTION');
    expect(valor(await obtener(prueba, SUPERVISOR_2, TIE)).vista).toBe('GESTION');
  });

  it('la vista de gestión trae datos, enlaces, avance, tareas por estado, vencidas y actividad', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, SUPERVISOR, PL2D));
    if (r.vista !== 'GESTION') throw new Error('Se esperaba la vista de gestión.');

    expect(r.proyecto).toMatchObject({
      id: PL2D,
      codigo: 'PL2D',
      rama_base: 'develop',
      repositorio_url: 'https://github.com/org-demo/plataforma-2d',
      supervisor: { id: SUPERVISOR, nombre: 'Supervisor Demo' },
    });
    expect(r.enlaces.map((e) => e.nombre)).toEqual([
      'Documento de diseño del juego',
      'Tablero de arte en Figma',
    ]);
    expect(r.avance).toEqual({ numerador: 6, denominador: 20, porcentaje: 30 });
    expect(r.tareas_por_estado).toEqual({
      DISPONIBLE: 3,
      EN_PROGRESO: 9,
      ESPERANDO_SUPERVISION: 2,
      TERMINADA: 6,
    });
    // Vencidas (fecha límite anterior a hoy, 17 de noviembre, y sin terminar): 009 y 012.
    expect(r.tareas_vencidas).toBe(2);
  });

  it('la actividad reciente trae los 10 eventos más nuevos del proyecto, con autor', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, ADMIN, PL2D));
    if (r.vista !== 'GESTION') throw new Error('Se esperaba la vista de gestión.');
    const fechas = r.actividad_reciente.map((a) => Date.parse(a.evento.fecha));

    expect(ACTIVIDAD_RECIENTE_MAXIMA).toBe(10);
    expect(r.actividad_reciente).toHaveLength(10);
    expect([...fechas].sort((a, b) => b - a)).toEqual(fechas);
    expect(r.actividad_reciente.every((a) => a.evento.id_proyecto === PL2D)).toBe(true);
    expect(r.actividad_reciente.every((a) => a.autor_nombre.length > 0)).toBe(true);
  });

  it('un evento del Sistema sale con autor «Sistema» y sin rol', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      historial: [
        ...d.historial,
        {
          id: 'evt-sistema',
          fecha: '2026-11-17T18:00:00.000Z',
          autor: { tipo: 'SISTEMA' },
          tipo_accion: 'TAREA_LIBERADA',
          elemento: { tipo: 'TAREA', id: 'tar-pl2d-011', etiqueta: 'PL2D-011' },
          id_proyecto: PL2D,
          cambios: [],
          nota: null,
        },
      ],
    }));

    const r = valor(await obtener(prueba, ADMIN, PL2D));
    if (r.vista !== 'GESTION') throw new Error('Se esperaba la vista de gestión.');

    expect(r.actividad_reciente[0]).toMatchObject({ autor_nombre: 'Sistema', autor_rol: null });
  });

  it('un Supervisor ajeno recibe FUERA_DE_ALCANCE', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await obtener(prueba, SUPERVISOR_2, PL2D))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await obtener(prueba, SUPERVISOR, TIE))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await obtener(prueba, SUPERVISOR_3, PL2D))).toBe('FUERA_DE_ALCANCE');
  });

  it('un proyecto reasignado deja de ser accesible para su Supervisor anterior', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      proyectos: d.proyectos.map((p) => (p.id === RSV ? { ...p, id_supervisor: SUPERVISOR_3 } : p)),
    }));

    expect(codigo(await obtener(prueba, SUPERVISOR, RSV))).toBe('FUERA_DE_ALCANCE');
    expect(valor(await obtener(prueba, SUPERVISOR_3, RSV)).vista).toBe('GESTION');
  });

  it('el Practicante recibe su propia vista: sus tareas abiertas y su actividad, sin nada del equipo', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, PRACTICANTE, PL2D));
    if (r.vista !== 'PRACTICANTE') throw new Error('Se esperaba la vista del practicante.');

    expect(r.proyecto).toMatchObject({ codigo: 'PL2D', rama_base: 'develop' });
    expect(r.avance).toEqual({ numerador: 6, denominador: 20, porcentaje: 30 });
    // Las suyas sin terminar, por fecha límite: 010 (22/11) y 017 (25/11); las terminadas van a Mi historial.
    expect(ids(r.mis_tareas)).toEqual(['tar-pl2d-010', 'tar-pl2d-017']);
    expect(r.mis_tareas.every((t) => t.es_mia)).toBe(true);
    expect(r.mi_actividad.length).toBeGreaterThan(0);
    expect(
      r.mi_actividad.every(
        (a) => a.evento.autor.tipo === 'USUARIO' && a.evento.autor.id_usuario === PRACTICANTE,
      ),
    ).toBe(true);
  });

  it('«mi actividad» trae como máximo los 10 eventos propios más recientes', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      historial: [
        ...d.historial,
        ...Array.from({ length: 12 }, (_, i): EventoHistorial => ({
          id: `evt-mio-${String(i).padStart(2, '0')}`,
          fecha: `2026-11-17T1${i % 8}:${String(10 + i).padStart(2, '0')}:00.000Z`,
          autor: { tipo: 'USUARIO', id_usuario: PRACTICANTE },
          tipo_accion: 'TAREA_TOMADA',
          elemento: { tipo: 'TAREA', id: 'tar-pl2d-010', etiqueta: 'PL2D-010' },
          id_proyecto: PL2D,
          cambios: [],
          nota: null,
        })),
      ],
    }));

    const r = valor(await obtener(prueba, PRACTICANTE, PL2D));
    if (r.vista !== 'PRACTICANTE') throw new Error('Se esperaba la vista del practicante.');
    const fechas = r.mi_actividad.map((a) => Date.parse(a.evento.fecha));

    expect(r.mi_actividad).toHaveLength(10);
    expect([...fechas].sort((a, b) => b - a)).toEqual(fechas);
  });

  it('la vista del Practicante no tiene los campos de gestión', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, PRACTICANTE, PL2D));

    expect(Object.keys(r).sort()).toEqual([
      'avance',
      'enlaces',
      'mi_actividad',
      'mis_tareas',
      'proyecto',
      'vista',
    ]);
  });

  it('la actividad de otras personas no llega al Practicante: ningún evento ajeno en su vista', async () => {
    const prueba = prepararPrueba();
    const ajenos = prueba
      .datos()
      .historial.filter(
        (e) =>
          e.id_proyecto === PL2D &&
          e.autor.tipo === 'USUARIO' &&
          e.autor.id_usuario !== PRACTICANTE,
      );
    expect(ajenos.length).toBeGreaterThan(0);

    const texto = JSON.stringify(valor(await obtener(prueba, PRACTICANTE, PL2D)));

    for (const evento of ajenos) expect(texto).not.toContain(`"id":"${evento.id}"`);
  });

  it('el Practicante abre un proyecto en pausa en el que participa', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, PRA_INV, INV));

    expect(r.vista).toBe('PRACTICANTE');
    expect(r.proyecto.estado).toBe('EN_PAUSA');
  });

  it('el Practicante no abre un proyecto ajeno, uno finalizado ni uno de donde salió', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await obtener(prueba, PRACTICANTE, RSV))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await obtener(prueba, PRA_EN_FINALIZADO, TIE))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await obtener(prueba, PRA_CON_BAJA, TIE))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await obtener(prueba, PRA_SIN_PROYECTO, PL2D))).toBe('FUERA_DE_ALCANCE');
  });

  it('un proyecto finalizado se reactiva: el practicante recupera el acceso', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      proyectos: d.proyectos.map((p) =>
        p.id === TIE ? { ...p, estado: 'ACTIVO', fecha_fin_real: null } : p,
      ),
    }));

    expect(valor(await obtener(prueba, PRA_EN_FINALIZADO, TIE)).vista).toBe('PRACTICANTE');
  });
});

// ── obtenerEquipoProyecto ────────────────────────────────────────────────────────────────────

describe('obtenerEquipoProyecto', () => {
  const equipo = (p: PruebaPreparada, idActor: Id, idProyecto: Id) =>
    obtenerEquipoProyecto({ idActor, idProyecto }, p.entorno);

  it('el Administrador y el Supervisor ven a los activos con su correo, especialidad y carga en el proyecto', async () => {
    const prueba = prepararPrueba();

    for (const idActor of [ADMIN, SUPERVISOR]) {
      const r = valor(await equipo(prueba, idActor, PL2D));
      if (r.vista !== 'GESTION') throw new Error('Se esperaba la vista de gestión.');

      expect(r.activos).toHaveLength(6);
      expect(r.anteriores).toEqual([]);
      const mario = r.activos.find((m) => m.id === 'usr-pra-04')!;
      // 008, 013, 014 y 016 están en progreso a nombre de usr-pra-04 en PL2D.
      expect(mario.carga).toBe(4);
      expect(mario.correo).toContain('@');
      expect(mario.especialidad).not.toBeNull();
    }
  });

  it('la carga de un practicante en dos proyectos cuenta solo el proyecto consultado', async () => {
    const prueba = prepararPrueba();

    const r = valor(await equipo(prueba, SUPERVISOR, RSV));
    if (r.vista !== 'GESTION') throw new Error('Se esperaba la vista de gestión.');
    const pl2d = valor(await equipo(prueba, SUPERVISOR, PL2D));
    if (pl2d.vista !== 'GESTION') throw new Error('Se esperaba la vista de gestión.');

    const en = (e: typeof r) => e.activos.find((m) => m.id === PRA_PL2D_RSV)!.carga;
    expect(en(r)).toBe(0);
    expect(en(pl2d)).toBe(1);
  });

  it('los anteriores traen alta y baja, del más reciente al más antiguo', async () => {
    const prueba = prepararPrueba();

    const r = valor(await equipo(prueba, SUPERVISOR_2, TIE));
    if (r.vista !== 'GESTION') throw new Error('Se esperaba la vista de gestión.');

    expect(r.activos).toHaveLength(4);
    expect(r.anteriores.map((a) => a.id)).toEqual([
      PRA_PRACTICA_FINALIZADA,
      PRA_CON_BAJA,
      'usr-pra-20',
    ]);
    expect(r.anteriores[1]).toEqual({
      id: PRA_CON_BAJA,
      nombre: expect.any(String),
      fecha_alta: '2026-08-13',
      fecha_baja: '2026-09-18',
    });
  });

  it('la vista de gestión no trae el área técnica ni la postulación de origen', async () => {
    const prueba = prepararPrueba();

    const texto = JSON.stringify(valor(await equipo(prueba, SUPERVISOR, PL2D)));

    for (const practicante of prueba.datos().practicantes) {
      expect(texto).not.toContain(practicante.id_area_tecnica);
      expect(texto).not.toContain(practicante.id_postulante);
    }
  });

  it('un Supervisor ajeno recibe FUERA_DE_ALCANCE', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await equipo(prueba, SUPERVISOR_2, PL2D))).toBe('FUERA_DE_ALCANCE');
  });

  it('el Practicante ve a sus compañeros con nombre, especialidad, carga, Discord y GitHub, y al supervisor sin celular', async () => {
    const prueba = prepararPrueba();

    const r = valor(await equipo(prueba, PRACTICANTE, PL2D));
    if (r.vista !== 'PRACTICANTE') throw new Error('Se esperaba la vista del practicante.');

    expect(r.companeros).toHaveLength(5);
    expect(ids(r.companeros)).not.toContain(PRACTICANTE);
    for (const c of r.companeros) {
      expect(Object.keys(c).sort()).toEqual([
        'carga',
        'cuenta_github',
        'discord',
        'especialidad',
        'id',
        'nombre',
      ]);
    }
    expect(r.supervisor).toEqual({
      id: SUPERVISOR,
      nombre: 'Supervisor Demo',
      discord: 'supervisor-supervisor',
      cuenta_github: 'supervisor-supervisor',
    });
  });

  it('el Practicante nunca recibe el correo ni el celular de nadie, ni sus ids de área o postulación', async () => {
    const prueba = prepararPrueba();

    const texto = JSON.stringify(valor(await equipo(prueba, PRACTICANTE, PL2D)));

    for (const u of prueba.datos().usuarios) {
      expect(texto, u.id).not.toContain(u.correo);
      expect(texto, u.id).not.toContain(u.celular);
    }
    for (const practicante of prueba.datos().practicantes) {
      expect(texto).not.toContain(practicante.id_postulante);
    }
  });

  it('un compañero que salió o cuya práctica terminó no aparece en el equipo del Practicante', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      asignaciones: d.asignaciones.map((a) =>
        a.id_practicante === 'usr-pra-08' && a.id_proyecto === RSV
          ? { ...a, fecha_baja: '2026-11-10' }
          : a,
      ),
    }));

    const antes = valor(await equipo(prueba, PRA_RSV, RSV));
    if (antes.vista !== 'PRACTICANTE') throw new Error('Se esperaba la vista del practicante.');
    expect(ids(antes.companeros)).toEqual([PRA_PL2D_RSV]);

    desactivar(prueba, PRA_PL2D_RSV);
    const despues = valor(await equipo(prueba, PRA_RSV, RSV));
    if (despues.vista !== 'PRACTICANTE') throw new Error('Se esperaba la vista del practicante.');
    expect(despues.companeros).toEqual([]);
  });

  it('el Practicante no ve el equipo de un proyecto ajeno, finalizado o del que salió', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await equipo(prueba, PRACTICANTE, RSV))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await equipo(prueba, PRA_EN_FINALIZADO, TIE))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await equipo(prueba, PRA_CON_BAJA, TIE))).toBe('FUERA_DE_ALCANCE');
  });
});

// ── obtenerTableroProyecto ───────────────────────────────────────────────────────────────────

describe('obtenerTableroProyecto', () => {
  const tablero = (p: PruebaPreparada, idActor: Id, idProyecto: Id) =>
    obtenerTableroProyecto({ idActor, idProyecto }, p.entorno);

  it('reparte las tareas en las cuatro columnas y la de terminadas trae las 5 más recientes', async () => {
    const prueba = prepararPrueba();

    const t = valor(await tablero(prueba, ADMIN, PL2D));

    expect(t).toMatchObject({ id_proyecto: PL2D, estado_proyecto: 'ACTIVO', total_terminadas: 6 });
    expect(t.disponibles).toHaveLength(3);
    expect(t.en_progreso).toHaveLength(9);
    expect(t.esperando_supervision).toHaveLength(2);
    expect(ids(t.terminadas)).toEqual([
      'tar-pl2d-006',
      'tar-pl2d-005',
      'tar-pl2d-004',
      'tar-pl2d-003',
      'tar-pl2d-002',
    ]);
  });

  describe('puede_crear_tarea', () => {
    it('el Administrador y el Supervisor del proyecto pueden crear en un proyecto activo', async () => {
      const prueba = prepararPrueba();

      expect(valor(await tablero(prueba, ADMIN, PL2D)).puede_crear_tarea).toBe(true);
      expect(valor(await tablero(prueba, SUPERVISOR, PL2D)).puede_crear_tarea).toBe(true);
    });

    it('un proyecto en pausa también permite crear (solo se bloquea tomar tareas)', async () => {
      const prueba = prepararPrueba();

      expect(valor(await tablero(prueba, ADMIN, INV)).puede_crear_tarea).toBe(true);
    });

    it('un proyecto finalizado no permite crear, ni siquiera al Administrador', async () => {
      const prueba = prepararPrueba();

      expect(valor(await tablero(prueba, ADMIN, TIE)).puede_crear_tarea).toBe(false);
    });

    it('el Practicante nunca puede crear tareas', async () => {
      const prueba = prepararPrueba();

      expect(valor(await tablero(prueba, PRACTICANTE, PL2D)).puede_crear_tarea).toBe(false);
    });

    it('un proyecto que se finaliza pasa de permitir a no permitir', async () => {
      const prueba = prepararPrueba();
      prueba.modificar((d) => ({
        proyectos: d.proyectos.map((p) =>
          p.id === PL2D ? { ...p, estado: 'FINALIZADO' as const } : p,
        ),
      }));

      expect(valor(await tablero(prueba, ADMIN, PL2D)).puede_crear_tarea).toBe(false);
    });
  });

  it('cada tarjeta trae su ID legible, responsable, vencida y la etiqueta del PR ya filtrada', async () => {
    const prueba = prepararPrueba();

    const t = valor(await tablero(prueba, ADMIN, PL2D));
    const por = (id: Id) =>
      [...t.en_progreso, ...t.disponibles, ...t.terminadas].find((x) => x.id === id)!;

    expect(por('tar-pl2d-009')).toMatchObject({ id_legible: 'PL2D-009', vencida: true });
    // Vence hoy: todavía no está vencida.
    expect(por('tar-pl2d-020')).toMatchObject({ fecha_limite: '2026-11-17', vencida: false });
    expect(por('tar-pl2d-019')).toMatchObject({ responsable: null, id_practicante: null });
    expect(por('tar-pl2d-010').responsable).toBe('Practicante Demo');
    // Con el PR pendiente pero la tarea todavía en progreso, la etiqueta no se muestra (§7.3).
    expect(por('tar-pl2d-010').etiqueta_pr_visible).toBeNull();
    expect(por('tar-pl2d-006').etiqueta_pr_visible).toBe('PENDIENTE');
    // Una tarea sin «Requiere PR» no muestra etiqueta.
    expect(por('tar-pl2d-002').etiqueta_pr_visible).toBeNull();
  });

  it('una terminada vencida no cuenta como vencida', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      tareas: d.tareas.map((t) =>
        t.id === 'tar-pl2d-001' ? { ...t, fecha_limite: '2026-01-01' } : t,
      ),
    }));

    const t = valor(await tablero(prueba, ADMIN, PL2D));
    const terminada = valor(
      await listarTerminadasDeProyecto({ idActor: ADMIN, idProyecto: PL2D }, prueba.entorno),
    );

    expect(t.terminadas.every((x) => !x.vencida)).toBe(true);
    expect(terminada.tareas.find((x) => x.id === 'tar-pl2d-001')!.vencida).toBe(false);
  });

  it('«es_mia» marca las del Practicante para el filtro «Solo mis tareas»', async () => {
    const prueba = prepararPrueba();

    const t = valor(await tablero(prueba, PRACTICANTE, PL2D));
    const todas = [...t.disponibles, ...t.en_progreso, ...t.esperando_supervision, ...t.terminadas];

    expect(ids(todas.filter((x) => x.es_mia)).sort()).toEqual([
      'tar-pl2d-004',
      'tar-pl2d-006',
      'tar-pl2d-010',
      'tar-pl2d-017',
    ]);
  });

  it('«Devuelta con observaciones»: el Practicante la ve solo en sus tareas; el Supervisor, en todas', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      historial: [
        ...d.historial,
        eventoDevuelta('tar-pl2d-010', PL2D), // de demo-practicante
        eventoDevuelta('tar-pl2d-011', PL2D), // de usr-pra-02
      ],
    }));

    const comoPracticante = valor(await tablero(prueba, PRACTICANTE, PL2D));
    const comoSupervisor = valor(await tablero(prueba, SUPERVISOR, PL2D));
    const devueltas = (t: typeof comoSupervisor) =>
      ids(t.en_progreso.filter((x) => x.devuelta)).sort();

    expect(devueltas(comoSupervisor)).toEqual(['tar-pl2d-010', 'tar-pl2d-011']);
    expect(devueltas(comoPracticante)).toEqual(['tar-pl2d-010']);
  });

  it('el Practicante ve todo el tablero de un proyecto en pausa', async () => {
    const prueba = prepararPrueba();

    const t = valor(await tablero(prueba, PRA_INV, INV));

    expect(t.estado_proyecto).toBe('EN_PAUSA');
    expect(t.disponibles).toHaveLength(1);
  });

  it('el Administrador y su Supervisor ven el tablero de un finalizado: 5 de 6 terminadas', async () => {
    const prueba = prepararPrueba();

    for (const idActor of [ADMIN, SUPERVISOR_2]) {
      const t = valor(await tablero(prueba, idActor, TIE));
      expect(t.estado_proyecto).toBe('FINALIZADO');
      expect(t.terminadas).toHaveLength(5);
      expect(t.total_terminadas).toBe(6);
    }
  });

  it('un proyecto sin tareas devuelve las columnas vacías', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({ tareas: d.tareas.filter((t) => t.id_proyecto !== DAT) }));

    expect(valor(await tablero(prueba, ADMIN, DAT))).toEqual({
      id_proyecto: DAT,
      estado_proyecto: 'ACTIVO',
      puede_crear_tarea: true,
      disponibles: [],
      en_progreso: [],
      esperando_supervision: [],
      terminadas: [],
      total_terminadas: 0,
    });
  });

  it('un Supervisor ajeno y un Practicante ajeno, de donde salió o de un finalizado, no ven el tablero', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await tablero(prueba, SUPERVISOR_2, PL2D))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await tablero(prueba, PRACTICANTE, RSV))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await tablero(prueba, PRA_CON_BAJA, TIE))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await tablero(prueba, PRA_EN_FINALIZADO, TIE))).toBe('FUERA_DE_ALCANCE');
  });

  it('el tablero no trae tareas de otros proyectos', async () => {
    const prueba = prepararPrueba();

    const t = valor(await tablero(prueba, ADMIN, RSV));
    const todas = [...t.disponibles, ...t.en_progreso, ...t.esperando_supervision, ...t.terminadas];

    expect(todas.every((x) => x.id_legible.startsWith('RSV-'))).toBe(true);
  });
});

// ── listarTerminadasDeProyecto ───────────────────────────────────────────────────────────────

describe('listarTerminadasDeProyecto', () => {
  const terminadas = (p: PruebaPreparada, idActor: Id, idProyecto: Id) =>
    listarTerminadasDeProyecto({ idActor, idProyecto }, p.entorno);

  it('trae todas las terminadas, de la más reciente a la más antigua', async () => {
    const prueba = prepararPrueba();

    const r = valor(await terminadas(prueba, ADMIN, PL2D));

    expect(r.id_proyecto).toBe(PL2D);
    expect(ids(r.tareas)).toEqual([
      'tar-pl2d-006',
      'tar-pl2d-005',
      'tar-pl2d-004',
      'tar-pl2d-003',
      'tar-pl2d-002',
      'tar-pl2d-001',
    ]);
    expect(r.tareas.every((t) => t.estado === 'TERMINADA' && t.fecha_termino !== null)).toBe(true);
  });

  it('un proyecto sin terminadas da una lista vacía', async () => {
    const prueba = prepararPrueba();

    expect(valor(await terminadas(prueba, SUPERVISOR_2, DAT)).tareas).toEqual([]);
  });

  it('el Practicante la ve en sus proyectos vigentes y no en los ajenos o finalizados', async () => {
    const prueba = prepararPrueba();

    expect(valor(await terminadas(prueba, PRACTICANTE, PL2D)).tareas).toHaveLength(6);
    expect(codigo(await terminadas(prueba, PRACTICANTE, RSV))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await terminadas(prueba, PRA_EN_FINALIZADO, TIE))).toBe('FUERA_DE_ALCANCE');
  });

  it('un Supervisor ajeno recibe FUERA_DE_ALCANCE', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await terminadas(prueba, SUPERVISOR, TIE))).toBe('FUERA_DE_ALCANCE');
  });
});

// ── obtenerResumenProyectoAnterior ───────────────────────────────────────────────────────────

describe('obtenerResumenProyectoAnterior', () => {
  const resumen = (p: PruebaPreparada, idActor: Id, idProyecto: Id) =>
    obtenerResumenProyectoAnterior({ idActor, idProyecto }, p.entorno);

  it('quien salió del proyecto ve datos mínimos, su periodo y cuántas tareas terminó', async () => {
    const prueba = prepararPrueba();

    const r = valor(await resumen(prueba, PRA_CON_BAJA, TIE));

    expect(r.proyecto).toMatchObject({
      id: TIE,
      codigo: 'TIE',
      estado: 'FINALIZADO',
      supervisor: { id: SUPERVISOR_2, nombre: 'Ricardo Salinas Vega' },
    });
    expect(r.participacion).toEqual({
      fecha_alta: '2026-08-13',
      fecha_baja: '2026-09-18',
      tareas_terminadas: 1,
    });
  });

  it('quien sigue asignado a un proyecto finalizado tiene la baja en null', async () => {
    const prueba = prepararPrueba();

    expect(valor(await resumen(prueba, PRA_EN_FINALIZADO, TIE)).participacion).toMatchObject({
      fecha_baja: null,
      tareas_terminadas: 1,
    });
  });

  it('cuenta solo las terminadas con él como responsable en ese proyecto', async () => {
    const prueba = prepararPrueba();

    // demo-practicante terminó 004 y 006 en PL2D; el proyecto sigue vigente pero el resumen se permite.
    expect(valor(await resumen(prueba, PRACTICANTE, PL2D)).participacion?.tareas_terminadas).toBe(
      2,
    );
  });

  it('el resumen no trae tablero, equipo, repositorio, rama, enlaces ni reunión', async () => {
    const prueba = prepararPrueba();

    const r = valor(await resumen(prueba, PRA_CON_BAJA, TIE));

    expect(Object.keys(r).sort()).toEqual(['participacion', 'proyecto']);
    expect(Object.keys(r.proyecto).sort()).toEqual([
      'codigo',
      'descripcion',
      'estado',
      'fecha_fin_prevista',
      'fecha_fin_real',
      'fecha_inicio',
      'id',
      'nombre',
      'supervisor',
    ]);
  });

  it('quien nunca estuvo en el proyecto recibe FUERA_DE_ALCANCE', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await resumen(prueba, PRACTICANTE, RSV))).toBe('FUERA_DE_ALCANCE');
    expect(codigo(await resumen(prueba, PRA_SIN_PROYECTO, TIE))).toBe('FUERA_DE_ALCANCE');
  });

  it('el Administrador y el Supervisor del proyecto lo ven, sin «participación»', async () => {
    const prueba = prepararPrueba();

    expect(valor(await resumen(prueba, ADMIN, TIE)).participacion).toBeNull();
    expect(valor(await resumen(prueba, SUPERVISOR_2, TIE)).participacion).toBeNull();
  });

  it('un Supervisor ajeno recibe FUERA_DE_ALCANCE', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await resumen(prueba, SUPERVISOR, TIE))).toBe('FUERA_DE_ALCANCE');
  });
});

// ── Equipo: asignar y quitar (Fase 5, módulo 5.4, bloque 4) ──────────────────────────────────

describe('obtenerEquipoProyecto: asignar y quitar', () => {
  const equipo = async (p: PruebaPreparada, idActor: Id, idProyecto: Id) => {
    const r = valor(await obtenerEquipoProyecto({ idActor, idProyecto }, p.entorno));
    if (r.vista !== 'GESTION') throw new Error('Se esperaba la vista de gestión.');
    return r;
  };

  it('en un proyecto activo se puede asignar y quitar a cada miembro', async () => {
    const prueba = prepararPrueba();

    const r = await equipo(prueba, ADMIN, PL2D);

    expect(r.estado_proyecto).toBe('ACTIVO');
    expect(r.puede_asignar).toBe(true);
    expect(r.activos.length).toBeGreaterThan(0);
    for (const m of r.activos) expect(m.puede_quitar).toBe(true);
  });

  it('las tareas a liberar son las «En progreso» de cada miembro en ese proyecto', async () => {
    const prueba = prepararPrueba();

    const r = await equipo(prueba, ADMIN, PL2D);

    for (const m of r.activos) {
      const esperadas = prueba
        .datos()
        .tareas.filter(
          (t) => t.id_proyecto === PL2D && t.id_practicante === m.id && t.estado === 'EN_PROGRESO',
        ).length;
      expect(m.tareas_a_liberar, m.id).toBe(esperadas);
    }
  });

  it('un proyecto finalizado no admite asignar ni quitar', async () => {
    const prueba = prepararPrueba();

    const r = await equipo(prueba, ADMIN, TIE);

    expect(r.estado_proyecto).toBe('FINALIZADO');
    expect(r.puede_asignar).toBe(false);
    expect(r.activos.length).toBeGreaterThan(0);
    for (const m of r.activos) {
      expect(m.puede_quitar).toBe(false);
      expect(m.tareas_a_liberar).toBe(0);
    }
  });

  it('el Supervisor del proyecto no asigna ni quita: eso es del Administrador', async () => {
    const prueba = prepararPrueba();

    const r = await equipo(prueba, SUPERVISOR, PL2D);

    expect(r.puede_asignar).toBe(false);
    for (const m of r.activos) expect(m.puede_quitar).toBe(false);
  });

  it('si no queda a quién asignar, puede_asignar es falso', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      usuarios: d.usuarios.map((u) =>
        u.rol === 'PRACTICANTE' ? { ...u, estado: 'INACTIVO' as const } : u,
      ),
    }));

    expect((await equipo(prueba, ADMIN, PL2D)).puede_asignar).toBe(false);
  });
});

describe('listarPracticantesAsignables', () => {
  const asignables = (p: PruebaPreparada, idActor: Id, idProyecto: Id) =>
    listarPracticantesAsignables({ idActor, idProyecto }, p.entorno);

  it('trae a los practicantes activos que aún no están en el proyecto, por nombre', async () => {
    const prueba = prepararPrueba();
    const miembros = new Set(
      prueba
        .datos()
        .asignaciones.filter((a) => a.id_proyecto === PL2D && a.fecha_baja === null)
        .map((a) => a.id_practicante),
    );

    const { practicantes } = valor(await asignables(prueba, ADMIN, PL2D));

    expect(practicantes.length).toBeGreaterThan(0);
    for (const p of practicantes) expect(miembros.has(p.id), p.id).toBe(false);
    const nombres = practicantes.map((p) => p.nombre);
    expect([...nombres].sort((a, b) => a.localeCompare(b, 'es'))).toEqual(nombres);
  });

  it('no ofrece a un practicante con la práctica finalizada', async () => {
    const prueba = prepararPrueba();

    const { practicantes } = valor(await asignables(prueba, ADMIN, PL2D));

    expect(ids(practicantes)).not.toContain(PRA_PRACTICA_FINALIZADA);
  });

  it('ofrece a quien salió del proyecto (se crearía otra asignación) y a quien está sin proyecto', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      asignaciones: d.asignaciones.map((a) =>
        a.id_practicante === PRA_PL2D_RSV && a.id_proyecto === PL2D && a.fecha_baja === null
          ? { ...a, fecha_baja: '2026-11-01' }
          : a,
      ),
    }));

    const { practicantes } = valor(await asignables(prueba, ADMIN, PL2D));

    expect(ids(practicantes)).toContain(PRA_PL2D_RSV);
    expect(ids(practicantes)).toContain(PRA_SIN_PROYECTO);
  });

  it('la carga de cada uno es la que da el dominio para sus proyectos vigentes', async () => {
    const prueba = prepararPrueba();

    const { practicantes } = valor(await asignables(prueba, ADMIN, PL2D));

    const conCarga = practicantes.find((p) => p.carga > 0);
    expect(conCarga).toBeDefined();
    const sinProyecto = practicantes.find((p) => p.id === PRA_SIN_PROYECTO)!;
    expect(sinProyecto.carga).toBe(0);
  });

  it('con el proyecto finalizado la lista viene vacía', async () => {
    const prueba = prepararPrueba();

    expect(valor(await asignables(prueba, ADMIN, TIE)).practicantes).toEqual([]);
  });

  it('solo el Administrador recibe candidatos: el Supervisor y el Practicante, una lista vacía', async () => {
    const prueba = prepararPrueba();

    expect(valor(await asignables(prueba, SUPERVISOR, PL2D)).practicantes).toEqual([]);
    expect(valor(await asignables(prueba, PRACTICANTE, PL2D)).practicantes).toEqual([]);
  });

  it('un proyecto que no existe da NO_ENCONTRADO y un identificador vacío, DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await asignables(prueba, ADMIN, 'no-existe'))).toBe('NO_ENCONTRADO');
    expect(codigo(await asignables(prueba, ADMIN, ''))).toBe('DATOS_INVALIDOS');
  });

  it('un actor inactivo da USUARIO_INACTIVO', async () => {
    const prueba = prepararPrueba();
    desactivar(prueba, ADMIN);

    expect(codigo(await asignables(prueba, ADMIN, PL2D))).toBe('USUARIO_INACTIVO');
  });

  it('no escribe', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    await asignables(prueba, ADMIN, PL2D);

    comprobar();
  });
});

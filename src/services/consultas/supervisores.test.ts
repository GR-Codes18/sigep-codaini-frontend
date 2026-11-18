import { describe, expect, it } from 'vitest';
import { diasEsperando, ultimaActividadDeUsuario, type Id } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { codigo, crearSupervisorSinProyectos, desactivar, ids, valor } from '../pruebas/consultas';
import type { Resultado } from '../resultado';
import { listarSupervisores, obtenerSupervisor } from './supervisores';

// Semilla en AHORA_DE_PRUEBA (martes 17 de noviembre de 2026, 13:30 en Perú).
const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // pry-pl2d y pry-rsv
const SUPERVISOR_2 = 'usr-sup-02'; // pry-tie (finalizado) y pry-dat
const SUPERVISOR_3 = 'usr-sup-03'; // pry-inv (en pausa)
const PRACTICANTE = 'demo-practicante';

type Llamada = (p: PruebaPreparada, idActor: Id) => Promise<Resultado<unknown>>;

const CONSULTAS: ReadonlyArray<{ nombre: string; llamar: Llamada }> = [
  {
    nombre: 'listarSupervisores',
    llamar: (p, idActor) => listarSupervisores({ idActor }, p.entorno),
  },
  {
    nombre: 'obtenerSupervisor',
    llamar: (p, idActor) => obtenerSupervisor({ idActor, idSupervisor: SUPERVISOR }, p.entorno),
  },
];

describe.each(CONSULTAS)('$nombre · reglas comunes', ({ llamar }) => {
  it('el Administrador tiene éxito y no escribe nada', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    expect((await llamar(prueba, ADMIN)).ok).toBe(true);
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

  it('el Supervisor y el Practicante reciben ROL_NO_PERMITIDO', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    for (const idActor of [SUPERVISOR, PRACTICANTE]) {
      expect(codigo(await llamar(prueba, idActor)), idActor).toBe('ROL_NO_PERMITIDO');
    }
    comprobar();
  });
});

describe('listarSupervisores', () => {
  const listar = (p: PruebaPreparada) => listarSupervisores({ idActor: ADMIN }, p.entorno);

  it('trae a los 3 supervisores, por nombre, con sus contadores', async () => {
    const prueba = prepararPrueba();

    const r = valor(await listar(prueba));

    expect(r.supervisores.map((s) => s.nombre)).toEqual([
      'Patricia Lazo Núñez',
      'Ricardo Salinas Vega',
      'Supervisor Demo',
    ]);
    expect(r.contadores).toEqual({ TODOS: 3, ACTIVOS: 3, INACTIVOS: 0 });
  });

  it('proyectos y practicantes a cargo, y tareas por revisar', async () => {
    const prueba = prepararPrueba();

    const por = Object.fromEntries(valor(await listar(prueba)).supervisores.map((s) => [s.id, s]));

    expect(por[SUPERVISOR]).toMatchObject({
      proyectos_a_cargo: 2,
      practicantes_a_cargo: 8,
      tareas_por_revisar: 4,
    });
    expect(por[SUPERVISOR_3]).toMatchObject({
      proyectos_a_cargo: 1,
      practicantes_a_cargo: 6,
      tareas_por_revisar: 1,
    });
  });

  it('los proyectos finalizados no cuentan como «a cargo»', async () => {
    const prueba = prepararPrueba();

    // usr-sup-02 tiene TIE (finalizado, con 4 asignaciones vigentes) y DAT (activo y sin practicantes).
    const dos = valor(await listar(prueba)).supervisores.find((s) => s.id === SUPERVISOR_2)!;

    expect(dos).toMatchObject({
      proyectos_a_cargo: 1,
      practicantes_a_cargo: 0,
      tareas_por_revisar: 0,
    });
  });

  it('una persona en dos proyectos del mismo supervisor cuenta una sola vez', async () => {
    const prueba = prepararPrueba();

    // PL2D tiene 6 asignaciones vigentes y RSV 3; usr-pra-06 está en las dos: 9 − 1 = 8.
    expect(
      valor(await listar(prueba)).supervisores.find((s) => s.id === SUPERVISOR)!
        .practicantes_a_cargo,
    ).toBe(8);
  });

  it('la última actividad es la última acción registrada por esa persona', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();

    const { supervisores } = valor(await listar(prueba));

    for (const fila of supervisores) {
      expect(fila.ultima_actividad, fila.id).toBe(
        ultimaActividadDeUsuario(fila.id, datos.historial),
      );
    }
    expect(supervisores.find((s) => s.id === SUPERVISOR)!.ultima_actividad).not.toBeNull();
  });

  it('un supervisor inactivo sigue en el listado, en la pestaña Inactivos', async () => {
    const prueba = prepararPrueba();
    desactivar(prueba, SUPERVISOR_3);

    const r = valor(await listar(prueba));

    expect(r.supervisores.find((s) => s.id === SUPERVISOR_3)!.estado).toBe('INACTIVO');
    expect(r.contadores).toEqual({ TODOS: 3, ACTIVOS: 2, INACTIVOS: 1 });
  });

  it('un supervisor nuevo sin proyectos sale con todo en cero y sin actividad', async () => {
    const prueba = prepararPrueba();
    const idNuevo = crearSupervisorSinProyectos(prueba);

    const fila = valor(await listar(prueba)).supervisores.find((s) => s.id === idNuevo)!;

    expect(fila).toMatchObject({
      proyectos_a_cargo: 0,
      practicantes_a_cargo: 0,
      tareas_por_revisar: 0,
      ultima_actividad: null,
    });
  });

  it('un proyecto reasignado pasa a la cuenta del nuevo supervisor', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      proyectos: d.proyectos.map((p) =>
        p.id === 'pry-rsv' ? { ...p, id_supervisor: SUPERVISOR_3 } : p,
      ),
    }));

    const por = Object.fromEntries(valor(await listar(prueba)).supervisores.map((s) => [s.id, s]));

    expect(por[SUPERVISOR]).toMatchObject({ proyectos_a_cargo: 1, tareas_por_revisar: 2 });
    expect(por[SUPERVISOR_3]).toMatchObject({ proyectos_a_cargo: 2, tareas_por_revisar: 3 });
  });

  it('nunca trae contraseñas ni celulares', async () => {
    const prueba = prepararPrueba();

    const texto = JSON.stringify(valor(await listar(prueba)));

    for (const u of prueba.datos().usuarios) {
      expect(texto).not.toContain(u.contrasena);
      expect(texto).not.toContain(u.celular);
    }
  });
});

describe('obtenerSupervisor', () => {
  const obtener = (p: PruebaPreparada, idSupervisor: Id) =>
    obtenerSupervisor({ idActor: ADMIN, idSupervisor }, p.entorno);

  it('trae los datos de contacto y el estado', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, SUPERVISOR_2));

    expect(r.datos).toMatchObject({
      id: SUPERVISOR_2,
      nombre: 'Ricardo Salinas Vega',
      correo: 'ricardo.salinas@codaini.demo',
      discord: 'ricardo-salinas',
      cuenta_github: 'ricardo-salinas',
      estado: 'ACTIVO',
    });
    expect(r.datos.celular.length).toBeGreaterThan(0);
  });

  it('proyectos a cargo con su reunión y su equipo', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, SUPERVISOR));

    expect(
      r.proyectos_a_cargo.map((p) => [p.proyecto.codigo, p.estado, p.practicantes_activos]),
    ).toEqual([
      ['PL2D', 'ACTIVO', 6],
      ['RSV', 'ACTIVO', 3],
    ]);
    expect(r.proyectos_a_cargo[0]!.reunion).toMatchObject({
      dia_reunion: 'LUNES',
      hora_reunion: '10:00',
      proxima: '2026-11-23T15:00:00.000Z',
    });
  });

  it('las tareas por revisar, la que lleva más tiempo esperando primero, con sus días', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();

    const r = valor(await obtener(prueba, SUPERVISOR));

    expect(r.tareas_por_revisar.map((t) => [t.id, t.dias_esperando])).toEqual([
      ['tar-rsv-006', 9],
      ['tar-rsv-005', 8],
      ['tar-pl2d-015', 2],
      ['tar-pl2d-017', 1],
    ]);
    for (const t of r.tareas_por_revisar) {
      const tarea = datos.tareas.find((x) => x.id === t.id)!;
      expect(t.dias_esperando).toBe(
        diasEsperando(tarea, datos.historial, prueba.entorno.ahora().toISOString()),
      );
      expect(t.id_legible).toMatch(/^[A-Z0-9]+-\d{3,}$/);
    }
  });

  it('un proyecto en pausa también está a cargo y su cola se cuenta', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, SUPERVISOR_3));

    expect(r.proyectos_a_cargo).toMatchObject([
      { proyecto: { codigo: 'INV' }, estado: 'EN_PAUSA' },
    ]);
    expect(ids(r.tareas_por_revisar)).toEqual(['tar-inv-003']);
  });

  it('los proyectos finalizados van a «anteriores», con su fecha de fin', async () => {
    const prueba = prepararPrueba();

    const r = valor(await obtener(prueba, SUPERVISOR_2));

    expect(r.proyectos_a_cargo.map((p) => p.proyecto.codigo)).toEqual(['DAT']);
    expect(r.proyectos_anteriores).toMatchObject([{ proyecto: { codigo: 'TIE' } }]);
    expect(r.proyectos_anteriores[0]!.fecha_fin_real).not.toBeNull();
    expect(r.tareas_por_revisar).toEqual([]);
  });

  it('la línea de tiempo trae solo lo que él hizo, del más reciente al más antiguo', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();

    const r = valor(await obtener(prueba, SUPERVISOR));
    const propios = datos.historial.filter(
      (e) => e.autor.tipo === 'USUARIO' && e.autor.id_usuario === SUPERVISOR,
    );
    const fechas = r.eventos.map((e) => Date.parse(e.evento.fecha));

    expect(r.eventos).toHaveLength(propios.length);
    expect(propios.length).toBeGreaterThan(0);
    expect([...fechas].sort((a, b) => b - a)).toEqual(fechas);
  });

  it('un supervisor sin proyectos: todo vacío', async () => {
    const prueba = prepararPrueba();
    const idNuevo = crearSupervisorSinProyectos(prueba);

    const r = valor(await obtener(prueba, idNuevo));

    expect(r).toMatchObject({
      proyectos_a_cargo: [],
      tareas_por_revisar: [],
      proyectos_anteriores: [],
      eventos: [],
    });
  });

  it('un id que no es de un supervisor o no existe da NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();

    for (const id of [ADMIN, PRACTICANTE, 'usr-pra-03', 'no-existe']) {
      expect(codigo(await obtener(prueba, id)), id).toBe('NO_ENCONTRADO');
    }
  });

  it('nunca trae contraseñas', async () => {
    const prueba = prepararPrueba();

    const texto = JSON.stringify(valor(await obtener(prueba, SUPERVISOR)));

    for (const u of prueba.datos().usuarios) expect(texto).not.toContain(u.contrasena);
  });
});

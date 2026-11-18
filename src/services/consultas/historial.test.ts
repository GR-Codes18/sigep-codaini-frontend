import { describe, expect, it } from 'vitest';
import { ACCIONES_POR_CATEGORIA, type EventoHistorial, type Id } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { codigo, desactivar, valor } from '../pruebas/consultas';
import type { Resultado } from '../resultado';
import {
  FILTRO_AUTOR_SISTEMA,
  categoriaDeAccion,
  listarHistorial,
  obtenerLineaDeTiempo,
  type FiltrosHistorial,
} from './historial';

// Semilla en AHORA_DE_PRUEBA (martes 17 de noviembre de 2026, 13:30 en Perú).
const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // pry-pl2d y pry-rsv
const SUPERVISOR_2 = 'usr-sup-02'; // pry-tie (finalizado) y pry-dat
const PRACTICANTE = 'demo-practicante'; // solo pry-pl2d
const PRA_CON_BAJA = 'usr-pra-03'; // pry-pl2d vigente; pry-tie con baja

const PL2D = 'pry-pl2d';
const RSV = 'pry-rsv';
const TIE = 'pry-tie';

function agregarEventos(prueba: PruebaPreparada, ...eventos: EventoHistorial[]) {
  prueba.modificar((d) => ({ historial: [...d.historial, ...eventos] }));
}

function eventoDeCuenta(
  id: string,
  autor: Id,
  tipo: 'CUENTA_CORREO_CAMBIADO' | 'CUENTA_NOMBRE_CAMBIADO',
  idProyecto: Id | null = null,
): EventoHistorial {
  return {
    id,
    fecha: '2026-11-17T17:00:00.000Z',
    autor: { tipo: 'USUARIO', id_usuario: autor },
    tipo_accion: tipo,
    elemento: { tipo: 'USUARIO', id: autor, etiqueta: autor },
    id_proyecto: idProyecto,
    cambios: [
      { campo: 'correo', valor_anterior: 'viejo@codaini.test', valor_nuevo: 'nuevo@codaini.test' },
    ],
    nota: null,
  };
}

// ── categoriaDeAccion ────────────────────────────────────────────────────────────────────────

describe('categoriaDeAccion', () => {
  it('cada acción del catálogo tiene su categoría', () => {
    for (const [categoria, acciones] of Object.entries(ACCIONES_POR_CATEGORIA)) {
      for (const accion of acciones) {
        expect(categoriaDeAccion(accion), accion).toBe(categoria);
      }
    }
  });
});

// ── listarHistorial ──────────────────────────────────────────────────────────────────────────

describe('listarHistorial', () => {
  const listar = (p: PruebaPreparada, idActor: Id, filtros?: FiltrosHistorial) =>
    listarHistorial({ idActor, filtros }, p.entorno);

  const contar = async (prueba: PruebaPreparada, filtros: FiltrosHistorial) =>
    valor(await listar(prueba, ADMIN, filtros)).eventos.length;

  it('el Administrador tiene éxito y no se escribe nada', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    expect((await listar(prueba, ADMIN)).ok).toBe(true);
    comprobar();
  });

  it('el Supervisor y el Practicante reciben ROL_NO_PERMITIDO', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    expect(codigo(await listar(prueba, SUPERVISOR))).toBe('ROL_NO_PERMITIDO');
    expect(codigo(await listar(prueba, PRACTICANTE))).toBe('ROL_NO_PERMITIDO');
    comprobar();
  });

  it('un actor inexistente, INACTIVO o un id vacío se rechazan', async () => {
    const prueba = prepararPrueba();
    expect(codigo(await listar(prueba, 'no-existe'))).toBe('NO_ENCONTRADO');
    expect(codigo(await listar(prueba, ''))).toBe('DATOS_INVALIDOS');

    for (const idActor of [ADMIN, SUPERVISOR, PRACTICANTE]) {
      const otra = prepararPrueba();
      desactivar(otra, idActor);
      expect(codigo(await listar(otra, idActor)), idActor).toBe('USUARIO_INACTIVO');
    }
  });

  it('sin filtros trae los 321 eventos, del más reciente al más antiguo, con su categoría', async () => {
    const prueba = prepararPrueba();

    const { eventos } = valor(await listar(prueba, ADMIN));
    const fechas = eventos.map((e) => Date.parse(e.evento.fecha));

    expect(eventos).toHaveLength(321);
    expect([...fechas].sort((a, b) => b - a)).toEqual(fechas);
    for (const e of eventos) expect(e.categoria).toBe(categoriaDeAccion(e.evento.tipo_accion));
  });

  it('el autor sale con su nombre y rol, o como «Sistema»', async () => {
    const prueba = prepararPrueba();

    const { eventos } = valor(await listar(prueba, ADMIN));
    const delSupervisor = eventos.find(
      (e) => e.evento.autor.tipo === 'USUARIO' && e.evento.autor.id_usuario === SUPERVISOR,
    )!;
    const delSistema = eventos.find((e) => e.evento.autor.tipo === 'SISTEMA')!;

    expect(delSupervisor).toMatchObject({
      autor_nombre: 'Supervisor Demo',
      autor_rol: 'SUPERVISOR',
    });
    expect(delSistema).toMatchObject({ autor_nombre: 'Sistema', autor_rol: null });
  });

  it('filtra por autor: una persona o el Sistema', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();

    expect(await contar(prueba, { id_autor: SUPERVISOR })).toBe(
      datos.historial.filter((e) => e.autor.tipo === 'USUARIO' && e.autor.id_usuario === SUPERVISOR)
        .length,
    );
    expect(await contar(prueba, { id_autor: FILTRO_AUTOR_SISTEMA })).toBe(
      datos.historial.filter((e) => e.autor.tipo === 'SISTEMA').length,
    );
    expect(await contar(prueba, { id_autor: 'no-existe' })).toBe(0);
  });

  it('filtra por categoría', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();

    for (const categoria of ['PROYECTOS', 'TAREAS', 'POSTULACIONES'] as const) {
      const esperado = datos.historial.filter((e) =>
        (ACCIONES_POR_CATEGORIA[categoria] as readonly string[]).includes(e.tipo_accion),
      ).length;
      const { eventos } = valor(await listar(prueba, ADMIN, { categoria }));

      expect(eventos.length, categoria).toBe(esperado);
      expect(esperado, categoria).toBeGreaterThan(0);
      expect(eventos.every((e) => e.categoria === categoria)).toBe(true);
    }
    expect(await contar(prueba, { categoria: 'CUENTA_PROPIA' })).toBe(0);
  });

  it('filtra por tipo de elemento', async () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();

    expect(await contar(prueba, { tipo_elemento: 'TAREA' })).toBe(
      datos.historial.filter((e) => e.elemento.tipo === 'TAREA').length,
    );
    expect(await contar(prueba, { tipo_elemento: 'POSTULANTE' })).toBeGreaterThan(0);
  });

  it('filtra por proyecto', async () => {
    const prueba = prepararPrueba();

    expect(await contar(prueba, { id_proyecto: PL2D })).toBe(75);
    expect(await contar(prueba, { id_proyecto: 'no-existe' })).toBe(0);
  });

  it('busca texto, como un ID de tarea, sin distinguir mayúsculas ni tildes', async () => {
    const prueba = prepararPrueba();

    expect(await contar(prueba, { texto: 'PL2D-018' })).toBe(2);
    expect(await contar(prueba, { texto: 'pl2d-018' })).toBe(2);
    expect(await contar(prueba, { texto: '  PL2D-018  ' })).toBe(2);
    expect(await contar(prueba, { texto: 'supervisor demo' })).toBeGreaterThan(0);
    expect(await contar(prueba, { texto: 'zzz-no-existe' })).toBe(0);
    // Un texto vacío o de espacios no filtra.
    expect(await contar(prueba, { texto: '   ' })).toBe(321);
  });

  it('el texto también busca en la nota y sin tildes', async () => {
    const prueba = prepararPrueba();
    agregarEventos(prueba, {
      id: 'evt-nota',
      fecha: '2026-11-17T17:00:00.000Z',
      autor: { tipo: 'USUARIO', id_usuario: SUPERVISOR },
      tipo_accion: 'TAREA_DEVUELTA',
      elemento: { tipo: 'TAREA', id: 'tar-pl2d-011', etiqueta: 'PL2D-011 · Otra' },
      id_proyecto: PL2D,
      cambios: [],
      nota: 'Revisa la validación del correo',
    });

    const { eventos } = valor(await listar(prueba, ADMIN, { texto: 'VALIDACION' }));

    expect(eventos.map((e) => e.evento.id)).toContain('evt-nota');
  });

  it('el rango de fechas es de días de calendario en hora de Perú, con los dos extremos incluidos', async () => {
    const prueba = prepararPrueba();
    const evento = (id: string, fecha: string): EventoHistorial => ({
      id,
      fecha,
      autor: { tipo: 'SISTEMA' },
      tipo_accion: 'TAREA_LIBERADA',
      elemento: { tipo: 'TAREA', id: 'tar-pl2d-011', etiqueta: 'PL2D-011' },
      id_proyecto: PL2D,
      cambios: [],
      nota: id,
    });
    agregarEventos(
      prueba,
      evento('antes', '2030-06-15T04:59:59.999Z'), // 14 de junio, 23:59 en Perú
      evento('primero', '2030-06-15T05:00:00.000Z'), // 15 de junio, 00:00 en Perú
      evento('ultimo', '2030-06-16T04:59:59.999Z'), // 15 de junio, 23:59 en Perú
      evento('despues', '2030-06-16T05:00:00.000Z'), // 16 de junio, 00:00 en Perú
    );

    const { eventos } = valor(
      await listar(prueba, ADMIN, { desde: '2030-06-15', hasta: '2030-06-15' }),
    );

    expect(eventos.map((e) => e.evento.id).sort()).toEqual(['primero', 'ultimo']);
    expect(await contar(prueba, { desde: '2030-06-16' })).toBe(1);
    expect(await contar(prueba, { hasta: '2030-06-14' })).toBe(321 + 1);
  });

  it('los filtros se combinan con «y»', async () => {
    const prueba = prepararPrueba();

    const solo = await contar(prueba, { id_proyecto: PL2D });
    const combinado = await contar(prueba, {
      id_proyecto: PL2D,
      categoria: 'TAREAS',
      id_autor: SUPERVISOR,
    });

    expect(combinado).toBeGreaterThan(0);
    expect(combinado).toBeLessThan(solo);
    expect(await contar(prueba, { id_proyecto: PL2D, categoria: 'SUPERVISORES' })).toBe(0);
  });

  it('un rango al revés, una fecha inexistente o una categoría desconocida dan DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await listar(prueba, ADMIN, { desde: '2026-11-17', hasta: '2026-11-01' }))).toBe(
      'DATOS_INVALIDOS',
    );
    expect(codigo(await listar(prueba, ADMIN, { desde: '2026-02-30' }))).toBe('DATOS_INVALIDOS');
    expect(
      codigo(await listar(prueba, ADMIN, { categoria: 'INVENTADA' as unknown as 'TAREAS' })),
    ).toBe('DATOS_INVALIDOS');
  });

  it('un filtro sin coincidencias es un éxito con la lista vacía', async () => {
    const prueba = prepararPrueba();

    expect(valor(await listar(prueba, ADMIN, { texto: 'no aparece' }))).toEqual({ eventos: [] });
  });

  it('nunca trae contraseñas', async () => {
    const prueba = prepararPrueba();

    const texto = JSON.stringify(valor(await listar(prueba, ADMIN)));

    for (const u of prueba.datos().usuarios) expect(texto).not.toContain(u.contrasena);
  });
});

// ── obtenerLineaDeTiempo ─────────────────────────────────────────────────────────────────────

describe('obtenerLineaDeTiempo', () => {
  const linea = (p: PruebaPreparada, idActor: Id, tipo: string, id: Id) =>
    obtenerLineaDeTiempo({ idActor, elemento: { tipo: tipo as 'TAREA', id } }, p.entorno);
  const idsDeEventos = (r: Resultado<{ eventos: Array<{ evento: { id: string } }> }>) =>
    valor(r).eventos.map((e) => e.evento.id);

  it('un actor inexistente, INACTIVO, un id vacío o un tipo desconocido se rechazan', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    expect(codigo(await linea(prueba, 'no-existe', 'TAREA', 'tar-pl2d-004'))).toBe('NO_ENCONTRADO');
    expect(codigo(await linea(prueba, '', 'TAREA', 'tar-pl2d-004'))).toBe('DATOS_INVALIDOS');
    expect(codigo(await linea(prueba, ADMIN, 'INVENTADO', 'tar-pl2d-004'))).toBe('DATOS_INVALIDOS');
    comprobar();
    for (const idActor of [ADMIN, SUPERVISOR, PRACTICANTE]) {
      const otra = prepararPrueba();
      desactivar(otra, idActor);
      expect(codigo(await linea(otra, idActor, 'TAREA', 'tar-pl2d-004')), idActor).toBe(
        'USUARIO_INACTIVO',
      );
    }
  });

  describe('Administrador', () => {
    it('una tarea: sus eventos, del más reciente al más antiguo, con autor', async () => {
      const prueba = prepararPrueba();

      const r = valor(await linea(prueba, ADMIN, 'TAREA', 'tar-pl2d-004'));
      const fechas = r.eventos.map((e) => Date.parse(e.evento.fecha));

      expect(r.elemento).toEqual({ tipo: 'TAREA', id: 'tar-pl2d-004' });
      expect(r.eventos).toHaveLength(5);
      expect([...fechas].sort((a, b) => b - a)).toEqual(fechas);
      expect(r.eventos.every((e) => e.autor_nombre.length > 0)).toBe(true);
    });

    it('un proyecto: toda la actividad del proyecto, incluidas sus tareas', async () => {
      const prueba = prepararPrueba();

      const r = valor(await linea(prueba, ADMIN, 'PROYECTO', PL2D));

      expect(r.eventos).toHaveLength(75);
      expect(r.eventos.some((e) => e.evento.elemento.tipo === 'TAREA')).toBe(true);
    });

    it('una persona: lo que hizo y lo que se hizo sobre su cuenta', async () => {
      const prueba = prepararPrueba();
      const datos = prueba.datos();
      const esperados = datos.historial.filter(
        (e) =>
          (e.autor.tipo === 'USUARIO' && e.autor.id_usuario === PRA_CON_BAJA) ||
          (e.elemento.tipo === 'USUARIO' && e.elemento.id === PRA_CON_BAJA),
      );

      const r = valor(await linea(prueba, ADMIN, 'USUARIO', PRA_CON_BAJA));

      expect(r.eventos).toHaveLength(esperados.length);
      expect(esperados.length).toBeGreaterThan(0);
    });

    it('una postulación', async () => {
      const prueba = prepararPrueba();

      const r = valor(await linea(prueba, ADMIN, 'POSTULANTE', 'pos-17'));

      expect(r.eventos).toHaveLength(3);
      expect(r.eventos.every((e) => e.evento.elemento.id === 'pos-17')).toBe(true);
    });

    it('una tarea eliminada conserva su historial; un elemento sin nada ni existencia es NO_ENCONTRADO', async () => {
      const prueba = prepararPrueba();
      prueba.modificar((d) => ({ tareas: d.tareas.filter((t) => t.id !== 'tar-pl2d-004') }));

      expect(valor(await linea(prueba, ADMIN, 'TAREA', 'tar-pl2d-004')).eventos).toHaveLength(5);
      expect(codigo(await linea(prueba, ADMIN, 'TAREA', 'no-existe'))).toBe('NO_ENCONTRADO');
      expect(codigo(await linea(prueba, ADMIN, 'PROYECTO', 'no-existe'))).toBe('NO_ENCONTRADO');
    });

    it('ve también los eventos de cuenta', async () => {
      const prueba = prepararPrueba();
      agregarEventos(prueba, eventoDeCuenta('evt-cuenta', PRA_CON_BAJA, 'CUENTA_CORREO_CAMBIADO'));

      expect(idsDeEventos(await linea(prueba, ADMIN, 'USUARIO', PRA_CON_BAJA))).toContain(
        'evt-cuenta',
      );
    });
  });

  describe('Supervisor', () => {
    it('una tarea de sus proyectos: todos sus eventos', async () => {
      const prueba = prepararPrueba();

      expect(valor(await linea(prueba, SUPERVISOR, 'TAREA', 'tar-pl2d-004')).eventos).toHaveLength(
        5,
      );
    });

    it('una tarea o un proyecto ajenos dan FUERA_DE_ALCANCE; uno inexistente, NO_ENCONTRADO', async () => {
      const prueba = prepararPrueba();

      expect(codigo(await linea(prueba, SUPERVISOR_2, 'TAREA', 'tar-pl2d-004'))).toBe(
        'FUERA_DE_ALCANCE',
      );
      expect(codigo(await linea(prueba, SUPERVISOR_2, 'PROYECTO', PL2D))).toBe('FUERA_DE_ALCANCE');
      expect(codigo(await linea(prueba, SUPERVISOR, 'TAREA', 'no-existe'))).toBe('NO_ENCONTRADO');
      expect(codigo(await linea(prueba, SUPERVISOR, 'PROYECTO', 'no-existe'))).toBe(
        'NO_ENCONTRADO',
      );
    });

    it('un proyecto suyo: toda su actividad', async () => {
      const prueba = prepararPrueba();

      expect(valor(await linea(prueba, SUPERVISOR, 'PROYECTO', PL2D)).eventos).toHaveLength(75);
    });

    it('un practicante a cargo: solo lo que hizo en los proyectos de este Supervisor', async () => {
      const prueba = prepararPrueba();

      const comoDemo = valor(await linea(prueba, SUPERVISOR, 'USUARIO', PRA_CON_BAJA));
      const comoDos = valor(await linea(prueba, SUPERVISOR_2, 'USUARIO', PRA_CON_BAJA));

      expect(comoDemo.eventos.length).toBeGreaterThan(0);
      expect(comoDemo.eventos.every((e) => e.evento.id_proyecto === PL2D)).toBe(true);
      expect(comoDos.eventos.length).toBeGreaterThan(0);
      expect(comoDos.eventos.every((e) => e.evento.id_proyecto === TIE)).toBe(true);
      expect(
        [...comoDemo.eventos, ...comoDos.eventos].every(
          (e) => e.evento.autor.tipo === 'USUARIO' && e.evento.autor.id_usuario === PRA_CON_BAJA,
        ),
      ).toBe(true);
    });

    it('una persona de otro proyecto da FUERA_DE_ALCANCE; una inexistente, NO_ENCONTRADO', async () => {
      const prueba = prepararPrueba();

      expect(codigo(await linea(prueba, SUPERVISOR_2, 'USUARIO', PRACTICANTE))).toBe(
        'FUERA_DE_ALCANCE',
      );
      expect(codigo(await linea(prueba, SUPERVISOR, 'USUARIO', 'no-existe'))).toBe('NO_ENCONTRADO');
    });

    it('su propia actividad en sus proyectos', async () => {
      const prueba = prepararPrueba();

      const r = valor(await linea(prueba, SUPERVISOR, 'USUARIO', SUPERVISOR));

      expect(r.eventos.length).toBeGreaterThan(0);
      expect(
        r.eventos.every(
          (e) =>
            e.evento.autor.tipo === 'USUARIO' &&
            e.evento.autor.id_usuario === SUPERVISOR &&
            [PL2D, RSV].includes(e.evento.id_proyecto ?? ''),
        ),
      ).toBe(true);
    });

    it('otros elementos (postulaciones…) dan FUERA_DE_ALCANCE', async () => {
      const prueba = prepararPrueba();

      expect(codigo(await linea(prueba, SUPERVISOR, 'POSTULANTE', 'pos-17'))).toBe(
        'FUERA_DE_ALCANCE',
      );
      expect(codigo(await linea(prueba, SUPERVISOR, 'PARAMETRO_CONFIGURACION', 'x'))).toBe(
        'FUERA_DE_ALCANCE',
      );
    });

    it('nunca ve los eventos de cuenta de otra persona, aunque traigan un proyecto', async () => {
      const prueba = prepararPrueba();
      agregarEventos(
        prueba,
        eventoDeCuenta('evt-cuenta-ajena', PRA_CON_BAJA, 'CUENTA_CORREO_CAMBIADO', PL2D),
      );

      expect(idsDeEventos(await linea(prueba, SUPERVISOR, 'PROYECTO', PL2D))).not.toContain(
        'evt-cuenta-ajena',
      );
      expect(idsDeEventos(await linea(prueba, SUPERVISOR, 'USUARIO', PRA_CON_BAJA))).not.toContain(
        'evt-cuenta-ajena',
      );
      expect(
        JSON.stringify(valor(await linea(prueba, SUPERVISOR, 'PROYECTO', PL2D))),
      ).not.toContain('nuevo@codaini.test');
    });

    it('sí ve sus propios eventos de cuenta', async () => {
      const prueba = prepararPrueba();
      agregarEventos(
        prueba,
        eventoDeCuenta('evt-cuenta-propia', SUPERVISOR, 'CUENTA_NOMBRE_CAMBIADO', PL2D),
      );

      expect(idsDeEventos(await linea(prueba, SUPERVISOR, 'PROYECTO', PL2D))).toContain(
        'evt-cuenta-propia',
      );
    });
  });

  describe('Practicante', () => {
    it('una tarea propia o la de un compañero que puede abrir: toda su línea de tiempo', async () => {
      const prueba = prepararPrueba();

      const propia = valor(await linea(prueba, PRACTICANTE, 'TAREA', 'tar-pl2d-004'));
      const ajena = valor(await linea(prueba, PRACTICANTE, 'TAREA', 'tar-pl2d-011'));
      const comoAdmin = valor(await linea(prueba, ADMIN, 'TAREA', 'tar-pl2d-011'));

      expect(propia.eventos).toHaveLength(5);
      expect(ajena.eventos).toEqual(comoAdmin.eventos);
      expect(ajena.eventos.length).toBeGreaterThan(0);
    });

    it('una tarea de un proyecto ajeno da FUERA_DE_ALCANCE', async () => {
      const prueba = prepararPrueba();

      expect(codigo(await linea(prueba, PRACTICANTE, 'TAREA', 'tar-rsv-006'))).toBe(
        'FUERA_DE_ALCANCE',
      );
      expect(codigo(await linea(prueba, PRACTICANTE, 'TAREA', 'no-existe'))).toBe('NO_ENCONTRADO');
    });

    it('un proyecto suyo: solo lo que él hizo («mi actividad»)', async () => {
      const prueba = prepararPrueba();

      const r = valor(await linea(prueba, PRACTICANTE, 'PROYECTO', PL2D));

      expect(r.eventos.length).toBeGreaterThan(0);
      expect(r.eventos.length).toBeLessThan(75);
      expect(
        r.eventos.every(
          (e) =>
            e.evento.id_proyecto === PL2D &&
            e.evento.autor.tipo === 'USUARIO' &&
            e.evento.autor.id_usuario === PRACTICANTE,
        ),
      ).toBe(true);
    });

    it('un proyecto ajeno, o uno finalizado, da FUERA_DE_ALCANCE', async () => {
      const prueba = prepararPrueba();

      expect(codigo(await linea(prueba, PRACTICANTE, 'PROYECTO', RSV))).toBe('FUERA_DE_ALCANCE');
      expect(codigo(await linea(prueba, 'usr-pra-15', 'PROYECTO', TIE))).toBe('FUERA_DE_ALCANCE');
    });

    it('su propia persona: lo que hizo; la de otra persona da FUERA_DE_ALCANCE', async () => {
      const prueba = prepararPrueba();

      const propia = valor(await linea(prueba, PRACTICANTE, 'USUARIO', PRACTICANTE));

      expect(propia.eventos.length).toBeGreaterThan(0);
      expect(
        propia.eventos.every(
          (e) => e.evento.autor.tipo === 'USUARIO' && e.evento.autor.id_usuario === PRACTICANTE,
        ),
      ).toBe(true);
      expect(codigo(await linea(prueba, PRACTICANTE, 'USUARIO', PRA_CON_BAJA))).toBe(
        'FUERA_DE_ALCANCE',
      );
      expect(codigo(await linea(prueba, PRACTICANTE, 'USUARIO', SUPERVISOR))).toBe(
        'FUERA_DE_ALCANCE',
      );
      expect(codigo(await linea(prueba, PRACTICANTE, 'USUARIO', 'no-existe'))).toBe(
        'NO_ENCONTRADO',
      );
    });

    it('otros elementos (postulaciones, parámetros…) dan FUERA_DE_ALCANCE', async () => {
      const prueba = prepararPrueba();

      expect(codigo(await linea(prueba, PRACTICANTE, 'POSTULANTE', 'pos-01'))).toBe(
        'FUERA_DE_ALCANCE',
      );
    });

    it('nunca ve los eventos de cuenta de un compañero, aunque traigan un proyecto', async () => {
      const prueba = prepararPrueba();
      agregarEventos(
        prueba,
        eventoDeCuenta('evt-cuenta-ajena', PRA_CON_BAJA, 'CUENTA_CORREO_CAMBIADO', PL2D),
      );

      for (const [tipo, id] of [
        ['PROYECTO', PL2D],
        ['USUARIO', PRACTICANTE],
      ] as const) {
        expect(idsDeEventos(await linea(prueba, PRACTICANTE, tipo, id)), tipo).not.toContain(
          'evt-cuenta-ajena',
        );
      }
      expect(codigo(await linea(prueba, PRACTICANTE, 'USUARIO', PRA_CON_BAJA))).toBe(
        'FUERA_DE_ALCANCE',
      );
    });

    it('sí ve sus propios eventos de cuenta', async () => {
      const prueba = prepararPrueba();
      agregarEventos(
        prueba,
        eventoDeCuenta('evt-cuenta-propia', PRACTICANTE, 'CUENTA_CORREO_CAMBIADO'),
      );

      expect(idsDeEventos(await linea(prueba, PRACTICANTE, 'USUARIO', PRACTICANTE))).toContain(
        'evt-cuenta-propia',
      );
    });

    it('la línea de otra persona no trae su correo ni su celular', async () => {
      const prueba = prepararPrueba();

      const texto = JSON.stringify(
        valor(await linea(prueba, PRACTICANTE, 'TAREA', 'tar-pl2d-011')),
      );

      for (const u of prueba.datos().usuarios) {
        expect(texto, u.id).not.toContain(u.correo);
        expect(texto, u.id).not.toContain(u.celular);
      }
    });
  });
});

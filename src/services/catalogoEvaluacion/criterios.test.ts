import { describe, expect, it } from 'vitest';
import type { CriterioEvaluacion, Id } from '@/domain';
import { evaluarPostulacion } from '../postulaciones';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import { guardarCriteriosDeBloque, type EntradaGuardarCriteriosDeBloque } from './criterios';
import { cambiarActivoEspecialidad } from './especialidades';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const PRACTICANTE = 'demo-practicante';
const AREA = 'area-sw';
const ESPECIALIDAD = 'esp-sw-front';
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

type Entrada = EntradaGuardarCriteriosDeBloque['criterios'][number];

/** Un criterio del almacén como lo pide el servicio. */
const comoEntrada = (c: CriterioEvaluacion): Entrada => ({
  id: c.id,
  nombre: c.nombre,
  tipo: c.tipo,
  peso: c.peso,
  obligatorio: c.obligatorio,
  activo: c.activo,
});

/** El bloque general de Software tal como está hoy: a1 30, a2 30, a3 25, a4 15 y a5 inactivo (10). */
function bloqueArea(p: PruebaPreparada): Entrada[] {
  return p
    .datos()
    .criterios.filter((c) => c.id_area_tecnica === AREA && c.id_especialidad === null)
    .map(comoEntrada);
}

/** El bloque de Frontend: 35, 25, 25 y 15. */
function bloqueEspecialidad(p: PruebaPreparada): Entrada[] {
  return p
    .datos()
    .criterios.filter((c) => c.id_especialidad === ESPECIALIDAD)
    .map(comoEntrada);
}

const conCambios = (lista: Entrada[], cambios: Record<Id, Partial<Entrada>>): Entrada[] =>
  lista.map((c) => ({ ...c, ...cambios[c.id as Id] }));

function guardarArea(p: PruebaPreparada, criterios: Entrada[], idActor: Id = ADMIN) {
  return guardarCriteriosDeBloque(
    { idActor, idAreaTecnica: AREA, idEspecialidad: null, criterios },
    p.entorno,
  );
}

function guardarEspecialidad(p: PruebaPreparada, criterios: Entrada[], idActor: Id = ADMIN) {
  return guardarCriteriosDeBloque(
    { idActor, idAreaTecnica: AREA, idEspecialidad: ESPECIALIDAD, criterios },
    p.entorno,
  );
}

const bloqueEspecialidadIds = [
  'cri-sw-front-1',
  'cri-sw-front-2',
  'cri-sw-front-3',
  'cri-sw-front-4',
];

const reparto = (a1: number, a2: number, a3: number, a4: number): Record<Id, Partial<Entrada>> => ({
  'cri-sw-a1': { peso: a1 },
  'cri-sw-a2': { peso: a2 },
  'cri-sw-a3': { peso: a3 },
  'cri-sw-a4': { peso: a4 },
});

describe('guardarCriteriosDeBloque: permisos', () => {
  const casos = {
    'bloque del área': (p: PruebaPreparada, idActor: Id) =>
      guardarArea(p, conCambios(bloqueArea(p), reparto(40, 20, 25, 15)), idActor),
    'bloque de la especialidad': (p: PruebaPreparada, idActor: Id) =>
      guardarEspecialidad(
        p,
        conCambios(bloqueEspecialidad(p), {
          'cri-sw-front-1': { peso: 45 },
          'cri-sw-front-2': { peso: 15 },
        }),
        idActor,
      ),
  };

  describe.each(Object.entries(casos))('%s', (_nombre, ejecutar) => {
    it('el Administrador activo puede, con una sola escritura y sin avisos', async () => {
      const prueba = prepararPrueba();
      const antes = prueba.datos();
      const escrituras = prueba.escrituras();
      expect((await ejecutar(prueba, ADMIN)).ok).toBe(true);
      expect(prueba.escrituras() - escrituras).toBe(1);
      expect(prueba.datos().notificaciones).toBe(antes.notificaciones);
    });

    it.each([
      ['Supervisor', SUPERVISOR],
      ['Practicante', PRACTICANTE],
    ])('%s → ROL_NO_PERMITIDO y no escribe nada', async (_rol, actor) => {
      const prueba = prepararPrueba();
      const igual = sinEscritura(prueba);
      expect(await ejecutar(prueba, actor)).toMatchObject({
        ok: false,
        codigo: 'ROL_NO_PERMITIDO',
      });
      igual();
    });

    it('Administrador INACTIVO → USUARIO_INACTIVO; actor inexistente → NO_ENCONTRADO', async () => {
      const prueba = prepararPrueba();
      prueba.modificar((d) => ({
        usuarios: d.usuarios.map((u) => (u.id === ADMIN ? { ...u, estado: 'INACTIVO' } : u)),
      }));
      const igual = sinEscritura(prueba);
      expect(await ejecutar(prueba, ADMIN)).toMatchObject({ codigo: 'USUARIO_INACTIVO' });
      expect(await ejecutar(prueba, 'nadie')).toMatchObject({ codigo: 'NO_ENCONTRADO' });
      igual();
    });
  });
});

describe('guardarCriteriosDeBloque: guardar el bloque completo', () => {
  it('repartir los pesos 30/30/25/15 → 40/20/25/15 pasa por una sola operación y un evento por cambio', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const r = await guardarArea(prueba, conCambios(bloqueArea(prueba), reparto(40, 20, 25, 15)));

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.map((c) => [c.id, c.peso, c.activo])).toEqual([
      ['cri-sw-a1', 40, true],
      ['cri-sw-a2', 20, true],
      ['cri-sw-a3', 25, true],
      ['cri-sw-a4', 15, true],
      ['cri-sw-a5', 10, false],
    ]);
    const despues = prueba.datos();
    expect(despues.criterios.find((c) => c.id === 'cri-sw-a1')!.peso).toBe(40);
    expect(despues.criterios.find((c) => c.id === 'cri-sw-a2')!.peso).toBe(20);
    // El resto de la colección conserva su orden y sus objetos.
    expect(despues.criterios).toHaveLength(antes.criterios.length);
    expect(despues.criterios.find((c) => c.id === 'cri-sw-a3')).toBe(
      antes.criterios.find((c) => c.id === 'cri-sw-a3'),
    );

    const nuevos = despues.historial.slice(antes.historial.length);
    expect(nuevos).toHaveLength(2);
    expect(nuevos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      tipo_accion: 'CRITERIO_EDITADO',
      elemento: { tipo: 'CRITERIO_EVALUACION', id: 'cri-sw-a1' },
      id_proyecto: null,
      fecha: AHORA_ISO,
      cambios: [{ campo: 'peso', valor_anterior: '30', valor_nuevo: '40' }],
    });
    expect(nuevos[1]).toMatchObject({
      tipo_accion: 'CRITERIO_EDITADO',
      elemento: { id: 'cri-sw-a2' },
      cambios: [{ campo: 'peso', valor_anterior: '30', valor_nuevo: '20' }],
    });
  });

  it('crea un criterio nuevo (sin id) junto con el reparto de pesos', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const lista = [
      ...conCambios(bloqueArea(prueba), reparto(30, 30, 20, 10)),
      {
        nombre: '  Experiencia en equipo ',
        tipo: 'PALABRA_CLAVE' as const,
        peso: 10,
        obligatorio: false,
        activo: true,
      },
    ];
    const r = await guardarArea(prueba, lista);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const creado = r.valor.at(-1)!;
    expect(creado).toEqual({
      id: 'cri-t001',
      id_area_tecnica: AREA,
      id_especialidad: null,
      nombre: 'Experiencia en equipo',
      tipo: 'PALABRA_CLAVE',
      peso: 10,
      obligatorio: false,
      activo: true,
    });
    const despues = prueba.datos();
    expect(despues.criterios.at(-1)).toEqual(creado);
    expect(despues.criterios).toHaveLength(antes.criterios.length + 1);
    const nuevos = despues.historial.slice(antes.historial.length);
    expect(nuevos.map((e) => [e.tipo_accion, e.elemento.id])).toEqual([
      ['CRITERIO_EDITADO', 'cri-sw-a3'],
      ['CRITERIO_EDITADO', 'cri-sw-a4'],
      ['CRITERIO_CREADO', 'cri-t001'],
    ]);
    expect(nuevos[2]).toMatchObject({
      elemento: { etiqueta: 'Experiencia en equipo' },
      cambios: [
        { campo: 'nombre', valor_anterior: null, valor_nuevo: 'Experiencia en equipo' },
        { campo: 'tipo', valor_anterior: null, valor_nuevo: 'PALABRA_CLAVE' },
        { campo: 'peso', valor_anterior: null, valor_nuevo: '10' },
        { campo: 'obligatorio', valor_anterior: null, valor_nuevo: 'No' },
        { campo: 'activo', valor_anterior: null, valor_nuevo: 'Sí' },
      ],
    });
  });

  it('activa un criterio inactivo y desactiva otro, cada uno con su evento', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    // a5 (10) entra y a4 (15) sale: 30 + 30 + 25 + 10 = 95, y a3 sube a 30 → 100.
    const r = await guardarArea(
      prueba,
      conCambios(bloqueArea(prueba), {
        'cri-sw-a3': { peso: 30 },
        'cri-sw-a4': { activo: false },
        'cri-sw-a5': { activo: true },
      }),
    );
    expect(r.ok).toBe(true);
    const nuevos = prueba.datos().historial.slice(antes.historial.length);
    expect(nuevos.map((e) => [e.tipo_accion, e.elemento.id])).toEqual([
      ['CRITERIO_EDITADO', 'cri-sw-a3'],
      ['CRITERIO_DESACTIVADO', 'cri-sw-a4'],
      ['CRITERIO_ACTIVADO', 'cri-sw-a5'],
    ]);
    expect(nuevos[1].cambios).toEqual([
      { campo: 'activo', valor_anterior: 'Sí', valor_nuevo: 'No' },
    ]);
    expect(nuevos[2].cambios).toEqual([
      { campo: 'activo', valor_anterior: 'No', valor_nuevo: 'Sí' },
    ]);
  });

  it('un criterio editado y activado a la vez deja dos eventos, en ese orden', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    // a5 entra con otro nombre y 10; a1 baja de 30 a 20.
    const r = await guardarArea(
      prueba,
      conCambios(bloqueArea(prueba), {
        'cri-sw-a1': { peso: 20 },
        'cri-sw-a5': { nombre: 'Carta de presentación', activo: true },
      }),
    );
    expect(r.ok).toBe(true);
    const nuevos = prueba.datos().historial.slice(antes.historial.length);
    expect(nuevos.map((e) => [e.tipo_accion, e.elemento.id])).toEqual([
      ['CRITERIO_EDITADO', 'cri-sw-a1'],
      ['CRITERIO_EDITADO', 'cri-sw-a5'],
      ['CRITERIO_ACTIVADO', 'cri-sw-a5'],
    ]);
    expect(nuevos[1].cambios).toEqual([
      {
        campo: 'nombre',
        valor_anterior: 'Carta de recomendación',
        valor_nuevo: 'Carta de presentación',
      },
    ]);
  });

  it('cambiar el tipo y «obligatorio» también se registra, sin tocar el peso', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const r = await guardarArea(
      prueba,
      conCambios(bloqueArea(prueba), { 'cri-sw-a3': { tipo: 'TECNOLOGIA', obligatorio: true } }),
    );
    expect(r.ok).toBe(true);
    const nuevos = prueba.datos().historial.slice(antes.historial.length);
    expect(nuevos).toHaveLength(1);
    expect(nuevos[0].cambios).toEqual([
      { campo: 'tipo', valor_anterior: 'PALABRA_CLAVE', valor_nuevo: 'TECNOLOGIA' },
      { campo: 'obligatorio', valor_anterior: 'No', valor_nuevo: 'Sí' },
    ]);
  });

  it('el bloque de una especialidad se guarda igual, sin tocar el del área', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const r = await guardarEspecialidad(
      prueba,
      conCambios(bloqueEspecialidad(prueba), {
        'cri-sw-front-1': { peso: 45 },
        'cri-sw-front-2': { peso: 15 },
      }),
    );
    expect(r.ok).toBe(true);
    const despues = prueba.datos();
    for (const c of antes.criterios.filter((x) => x.id_especialidad !== ESPECIALIDAD)) {
      expect(despues.criterios.find((x) => x.id === c.id)).toBe(c);
    }
    expect(despues.criterios.find((c) => c.id === 'cri-sw-front-1')!.peso).toBe(45);
  });

  it('el nombre se guarda recortado', async () => {
    const prueba = prepararPrueba();
    const r = await guardarArea(
      prueba,
      conCambios(bloqueArea(prueba), { 'cri-sw-a1': { nombre: '  Nivel académico  ' } }),
    );
    expect(r.ok && r.valor.find((c) => c.id === 'cri-sw-a1')!.nombre).toBe('Nivel académico');
  });
});

describe('guardarCriteriosDeBloque: la regla de los 100 puntos', () => {
  it.each([
    ['99', reparto(30, 30, 25, 14), 'PESOS_NO_SUMAN_100'],
    ['101', reparto(31, 30, 25, 15), 'PESOS_NO_SUMAN_100'],
    ['un peso en 0', reparto(30, 30, 0, 40), 'PESO_INVALIDO'],
    ['un peso negativo', reparto(30, 30, -5, 45), 'PESO_INVALIDO'],
    ['un peso decimal', reparto(30, 30, 24.5, 15.5), 'PESO_INVALIDO'],
  ])('suma %s → %s y no escribe nada', async (_caso, pesos, codigo) => {
    const prueba = prepararPrueba();
    const lista = conCambios(bloqueArea(prueba), pesos);
    const igual = sinEscritura(prueba);
    const r = await guardarArea(prueba, lista);
    expect(r).toMatchObject({ ok: false, codigo });
    if (!r.ok) expect(r.mensaje.length).toBeGreaterThan(15);
    igual();
  });

  it('un peso que no es un número → DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    const lista = conCambios(bloqueArea(prueba), { 'cri-sw-a1': { peso: Number.NaN } });
    const igual = sinEscritura(prueba);
    expect(await guardarArea(prueba, lista)).toMatchObject({
      ok: false,
      codigo: 'DATOS_INVALIDOS',
    });
    igual();
  });

  it('los criterios inactivos no cuentan: un peso raro en uno inactivo no estorba', async () => {
    const prueba = prepararPrueba();
    const r = await guardarArea(
      prueba,
      conCambios(bloqueArea(prueba), { 'cri-sw-a5': { peso: 7 } }),
    );
    expect(r.ok).toBe(true);
  });

  it('con el dueño activo, dejar el bloque sin criterios activos → BLOQUE_SIN_CRITERIOS', async () => {
    const prueba = prepararPrueba();
    const lista = bloqueArea(prueba).map((c) => ({ ...c, activo: false }));
    const igual = sinEscritura(prueba);
    const r = await guardarArea(prueba, lista);
    expect(r).toMatchObject({ ok: false, codigo: 'BLOQUE_SIN_CRITERIOS' });
    igual();
  });

  it('con el dueño inactivo, un bloque sin criterios activos sí se admite; luego no se puede activar', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      especialidades: d.especialidades.map((e) =>
        e.id === ESPECIALIDAD ? { ...e, activo: false } : e,
      ),
    }));
    const lista = bloqueEspecialidad(prueba).map((c) => ({ ...c, activo: false }));
    const r = await guardarEspecialidad(prueba, lista);
    expect(r.ok).toBe(true);
    expect(
      prueba
        .datos()
        .historial.slice(-4)
        .map((e) => e.tipo_accion),
    ).toEqual(Array(4).fill('CRITERIO_DESACTIVADO'));
    // Y con el bloque vacío no se puede volver a activar (C2-B).
    const igual = sinEscritura(prueba);
    expect(
      await cambiarActivoEspecialidad(
        { idActor: ADMIN, idEspecialidad: ESPECIALIDAD, activo: true },
        prueba.entorno,
      ),
    ).toMatchObject({ ok: false, codigo: 'BLOQUE_SIN_CRITERIOS' });
    igual();
  });

  it('con el dueño inactivo, con criterios activos siguen valiendo los 100 puntos', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      especialidades: d.especialidades.map((e) =>
        e.id === ESPECIALIDAD ? { ...e, activo: false } : e,
      ),
    }));
    const lista = conCambios(bloqueEspecialidad(prueba), { 'cri-sw-front-1': { peso: 30 } });
    expect(await guardarEspecialidad(prueba, lista)).toMatchObject({
      ok: false,
      codigo: 'PESOS_NO_SUMAN_100',
    });
  });
});

describe('guardarCriteriosDeBloque: la lista debe ser el bloque completo', () => {
  it('si falta un criterio existente → CRITERIOS_INCOMPLETOS, que nombra el que falta', async () => {
    const prueba = prepararPrueba();
    // Sin a5 (inactivo): el bloque activo sigue sumando 100, pero no se puede «borrar».
    const lista = bloqueArea(prueba).filter((c) => c.id !== 'cri-sw-a5');
    const igual = sinEscritura(prueba);
    const r = await guardarArea(prueba, lista);
    expect(r).toMatchObject({ ok: false, codigo: 'CRITERIOS_INCOMPLETOS' });
    if (!r.ok) expect(r.mensaje).toContain('Carta de recomendación');
    igual();
  });

  it('un criterio de otro bloque → CRITERIO_DE_OTRO_BLOQUE', async () => {
    const prueba = prepararPrueba();
    const ajeno = prueba.datos().criterios.find((c) => c.id === 'cri-sw-front-1')!;
    const lista = [...bloqueArea(prueba), comoEntrada(ajeno)];
    const igual = sinEscritura(prueba);
    expect(await guardarArea(prueba, lista)).toMatchObject({
      ok: false,
      codigo: 'CRITERIO_DE_OTRO_BLOQUE',
    });
    igual();
  });

  it('un id que no existe → CRITERIO_DE_OTRO_BLOQUE', async () => {
    const prueba = prepararPrueba();
    const lista = [
      ...bloqueArea(prueba),
      {
        id: 'cri-zz',
        nombre: 'X',
        tipo: 'TECNOLOGIA' as const,
        peso: 0,
        obligatorio: false,
        activo: false,
      },
    ];
    expect(await guardarArea(prueba, lista)).toMatchObject({
      ok: false,
      codigo: 'CRITERIO_DE_OTRO_BLOQUE',
    });
  });

  it('el mismo id dos veces → DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    const lista = [...bloqueArea(prueba), bloqueArea(prueba)[0]];
    const igual = sinEscritura(prueba);
    expect(await guardarArea(prueba, lista)).toMatchObject({
      ok: false,
      codigo: 'DATOS_INVALIDOS',
    });
    igual();
  });
});

describe('guardarCriteriosDeBloque: nombres y datos', () => {
  it.each([
    ['con otras mayúsculas', 'PORTAFOLIO O PROYECTOS PREVIOS'],
    ['con espacios de más', '  Portafolio   o proyectos previos '],
  ])('un nombre repetido dentro del bloque (%s) → NOMBRE_DUPLICADO', async (_caso, nombre) => {
    const prueba = prepararPrueba();
    const lista = conCambios(bloqueArea(prueba), { 'cri-sw-a4': { nombre } });
    const igual = sinEscritura(prueba);
    const r = await guardarArea(prueba, lista);
    expect(r).toMatchObject({ ok: false, codigo: 'NOMBRE_DUPLICADO' });
    expect(r.ok ? {} : r.campos).toHaveProperty(['criterios.3.nombre']);
    igual();
  });

  it('el mismo nombre en otro bloque sí se permite (la unicidad es por bloque)', async () => {
    const prueba = prepararPrueba();
    const lista = conCambios(bloqueEspecialidad(prueba), {
      'cri-sw-front-2': { nombre: 'Nivel académico (técnico o universitario en curso)' },
    });
    expect((await guardarEspecialidad(prueba, lista)).ok).toBe(true);
  });

  it.each([
    ['nombre vacío', { nombre: '   ' }],
    ['tipo desconocido', { tipo: 'OTRO' as never }],
    ['obligatorio que no es booleano', { obligatorio: 'si' as never }],
  ])('%s → DATOS_INVALIDOS', async (_caso, cambio) => {
    const prueba = prepararPrueba();
    const lista = conCambios(bloqueArea(prueba), { 'cri-sw-a1': cambio });
    const igual = sinEscritura(prueba);
    expect(await guardarArea(prueba, lista)).toMatchObject({
      ok: false,
      codigo: 'DATOS_INVALIDOS',
    });
    igual();
  });

  it('enviar el bloque tal cual está → SIN_CAMBIOS', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await guardarArea(prueba, bloqueArea(prueba))).toMatchObject({
      ok: false,
      codigo: 'SIN_CAMBIOS',
    });
    igual();
  });

  it('no hay límite de largo en el nombre de un criterio', async () => {
    const prueba = prepararPrueba();
    const lista = conCambios(bloqueArea(prueba), { 'cri-sw-a1': { nombre: 'N'.repeat(500) } });
    expect((await guardarArea(prueba, lista)).ok).toBe(true);
  });
});

describe('guardarCriteriosDeBloque: el área y la especialidad', () => {
  it('un área que no existe → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await guardarCriteriosDeBloque(
      { idActor: ADMIN, idAreaTecnica: 'area-zz', idEspecialidad: null, criterios: [] },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    igual();
  });

  it('una especialidad que no existe → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    const r = await guardarCriteriosDeBloque(
      { idActor: ADMIN, idAreaTecnica: AREA, idEspecialidad: 'esp-zz', criterios: [] },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
  });

  it('una especialidad de otra área → ESPECIALIDAD_DE_OTRA_AREA', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await guardarCriteriosDeBloque(
      { idActor: ADMIN, idAreaTecnica: 'area-vj', idEspecialidad: ESPECIALIDAD, criterios: [] },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'ESPECIALIDAD_DE_OTRA_AREA' });
    igual();
  });

  it('una lista vacía en un bloque que ya tiene criterios → CRITERIOS_INCOMPLETOS', async () => {
    const prueba = prepararPrueba();
    expect(await guardarArea(prueba, [])).toMatchObject({
      ok: false,
      codigo: 'CRITERIOS_INCOMPLETOS',
    });
  });
});

describe('guardarCriteriosDeBloque: las evaluaciones ya hechas no se recalculan', () => {
  it('guardar el bloque no toca las evaluaciones ni su desglose', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const r = await guardarArea(prueba, conCambios(bloqueArea(prueba), reparto(40, 20, 25, 15)));
    expect(r.ok).toBe(true);
    const despues = prueba.datos();
    expect(despues.evaluaciones).toBe(antes.evaluaciones);
    expect(despues.detalles_evaluacion).toBe(antes.detalles_evaluacion);
    // El desglose conserva la copia del peso con el que se evaluó.
    const detalle = despues.detalles_evaluacion.find((d) => d.id_criterio === 'cri-sw-a1')!;
    expect(detalle.peso).toBe(30);
  });

  it('una evaluación nueva sí usa los pesos nuevos', async () => {
    const solo = (cumplidos: Id[]) => ({
      juzgar: (_p: unknown, criterios: readonly CriterioEvaluacion[]) =>
        criterios.map((c) => ({
          id_criterio: c.id,
          cumplido: cumplidos.includes(c.id),
          observacion: null,
        })),
    });
    // Cumple todo menos `cri-sw-a1`.
    const prueba = prepararPrueba({
      evaluador: solo(['cri-sw-a2', 'cri-sw-a3', 'cri-sw-a4', ...bloqueEspecialidadIds]),
    });
    const vieja = prueba.datos().evaluaciones.find((e) => e.id_postulante === 'pos-25')!;
    prueba.modificar((d) => ({
      evaluaciones: d.evaluaciones.filter((e) => e.id !== vieja.id),
      detalles_evaluacion: d.detalles_evaluacion.filter((x) => x.id_evaluacion !== vieja.id),
    }));
    await guardarArea(prueba, conCambios(bloqueArea(prueba), reparto(40, 20, 25, 15)));
    const r = await evaluarPostulacion({ idPostulante: 'pos-25' }, prueba.entorno);
    // a1 pesa 40 y no se cumple: el área da 60 (con los pesos viejos habría dado 70).
    expect(r.ok && r.valor.evaluacion.puntaje_area).toBe(60);
  });
});

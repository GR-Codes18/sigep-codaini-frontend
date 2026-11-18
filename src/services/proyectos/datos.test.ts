import { describe, expect, it } from 'vitest';
import type { Id, Proyecto } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import { asignarPracticantes } from '../practicantes';
import { crearTarea } from '../tareas';
import {
  cambiarRamaBase,
  crearProyecto,
  editarDatosProyecto,
  type EntradaCrearProyecto,
  type EntradaEditarDatosProyecto,
} from './datos';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // PL2D y RSV
const SUPERVISOR_AJENO = 'usr-sup-02'; // TIE y DAT
const PRACTICANTE = 'demo-practicante';
const PL2D = 'pry-pl2d';
const TIE = 'pry-tie'; // finalizado
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

const DATOS: EntradaCrearProyecto = {
  idActor: ADMIN,
  nombre: 'Tienda Móvil',
  codigo: 'TMV',
  descripcion: 'Aplicación de compras para la tienda artesanal.',
  fecha_inicio: '2026-11-18',
  fecha_fin_prevista: '2027-03-18',
  idSupervisor: SUPERVISOR_AJENO,
  repositorio_url: 'https://github.com/org-demo/tienda-movil',
  rama_base: 'main',
};

const crear = (p: PruebaPreparada, cambios: Partial<EntradaCrearProyecto> = {}) =>
  crearProyecto({ ...DATOS, ...cambios }, p.entorno);
const editar = (
  p: PruebaPreparada,
  cambios: Partial<EntradaEditarDatosProyecto>,
  idProyecto: Id = PL2D,
  idActor: Id = ADMIN,
) => editarDatosProyecto({ idActor, idProyecto, ...cambios }, p.entorno);
const rama = (p: PruebaPreparada, rama_base: string, idProyecto: Id = PL2D, idActor: Id = ADMIN) =>
  cambiarRamaBase({ idActor, idProyecto, rama_base }, p.entorno);

const proyecto = (p: PruebaPreparada, id: Id) => p.datos().proyectos.find((x) => x.id === id)!;

function inactivarAdmin(p: PruebaPreparada) {
  p.modificar((d) => ({
    usuarios: d.usuarios.map((u) => (u.id === ADMIN ? { ...u, estado: 'INACTIVO' as const } : u)),
  }));
}

describe('crearProyecto: éxito', () => {
  it('crea el proyecto ACTIVO y sin equipo, con su evento y el aviso al supervisor, en una escritura', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const escrituras = prueba.escrituras();
    const supervisor = antes.usuarios.find((u) => u.id === SUPERVISOR_AJENO)!;

    const r = await crear(prueba);

    const esperado: Proyecto = {
      id: 'pry-t001',
      nombre: 'Tienda Móvil',
      codigo: 'TMV',
      descripcion: 'Aplicación de compras para la tienda artesanal.',
      fecha_inicio: '2026-11-18',
      fecha_fin_prevista: '2027-03-18',
      fecha_fin_real: null,
      estado: 'ACTIVO',
      dia_reunion: null,
      hora_reunion: null,
      repositorio_url: 'https://github.com/org-demo/tienda-movil',
      rama_base: 'main',
      id_supervisor: SUPERVISOR_AJENO,
      ultimo_numero_tarea: 0,
    };
    expect(r).toEqual({ ok: true, valor: esperado });
    expect(prueba.escrituras() - escrituras).toBe(1);
    const despues = prueba.datos();
    expect(despues.proyectos.at(-1)).toEqual(esperado);
    expect(despues.proyectos).toHaveLength(antes.proyectos.length + 1);
    // Sin equipo, enlaces ni tareas.
    expect(despues.asignaciones).toBe(antes.asignaciones);
    expect(despues.tareas).toBe(antes.tareas);
    expect(despues.enlaces_proyecto).toBe(antes.enlaces_proyecto);

    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      tipo_accion: 'PROYECTO_CREADO',
      elemento: { tipo: 'PROYECTO', id: 'pry-t001', etiqueta: 'TMV · Tienda Móvil' },
      id_proyecto: 'pry-t001',
      fecha: AHORA_ISO,
      cambios: [{ campo: 'supervisor', valor_anterior: null, valor_nuevo: supervisor.nombre }],
    });

    // §8.1: se avisa al supervisor y a nadie más.
    const avisos = despues.notificaciones.slice(antes.notificaciones.length);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({
      id_destinatario: SUPERVISOR_AJENO,
      tipo: 'ASIGNADO_A_PROYECTO',
      mensaje: 'Te asignaron como supervisor del proyecto Tienda Móvil.',
      elemento: { tipo: 'PROYECTO', id: 'pry-t001' },
      leida: false,
    });
  });

  it('con reunión semanal opcional (día y hora juntos)', async () => {
    const prueba = prepararPrueba();
    const r = await crear(prueba, { dia_reunion: 'MARTES', hora_reunion: '16:30' });
    expect(r.ok && r.valor).toMatchObject({ dia_reunion: 'MARTES', hora_reunion: '16:30' });
  });

  it('recorta el nombre, la descripción y el repositorio, pero no toca el código', async () => {
    const prueba = prepararPrueba();
    const r = await crear(prueba, {
      nombre: '  Tienda Móvil ',
      descripcion: '  Compras. ',
      repositorio_url: ' https://github.com/org-demo/tienda-movil ',
      rama_base: ' main ',
    });
    expect(r.ok && r.valor).toMatchObject({
      nombre: 'Tienda Móvil',
      descripcion: 'Compras.',
      repositorio_url: 'https://github.com/org-demo/tienda-movil',
      rama_base: 'main',
      codigo: 'TMV',
    });
  });

  it('un proyecto con el mismo nombre que otro se permite (solo el código es único)', async () => {
    const prueba = prepararPrueba();
    const nombre = proyecto(prueba, PL2D).nombre;
    expect((await crear(prueba, { nombre })).ok).toBe(true);
  });

  it('fin igual al inicio es válido', async () => {
    const prueba = prepararPrueba();
    expect((await crear(prueba, { fecha_fin_prevista: DATOS.fecha_inicio })).ok).toBe(true);
  });

  it('el proyecto nuevo ya sirve: se asigna a alguien y su primera tarea es TMV-001', async () => {
    const prueba = prepararPrueba();
    const r = await crear(prueba);
    if (!r.ok) throw new Error(r.mensaje);
    const asignada = await asignarPracticantes(
      { idActor: ADMIN, asignaciones: [{ idPracticante: 'usr-pra-20', idProyecto: r.valor.id }] },
      prueba.entorno,
    );
    expect(asignada.ok).toBe(true);
    const tarea = await crearTarea(
      {
        idActor: ADMIN,
        idProyecto: r.valor.id,
        titulo: 'Pantalla de inicio',
        descripcion: 'La primera pantalla de la aplicación.',
        fecha_limite: '2026-12-15',
      },
      prueba.entorno,
    );
    expect(tarea.ok && tarea.valor.numero).toBe(1);
    expect(proyecto(prueba, r.valor.id).ultimo_numero_tarea).toBe(1);
    expect(prueba.datos().historial.at(-1)!.elemento.etiqueta).toBe('TMV-001 · Pantalla de inicio');
  });
});

describe('crearProyecto: errores', () => {
  it.each([
    ['Supervisor', SUPERVISOR],
    ['Practicante', PRACTICANTE],
  ])('%s → ROL_NO_PERMITIDO (antes que cualquier otra comprobación)', async (_rol, actor) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(
      await crear(prueba, { idActor: actor, codigo: 'PL2D', idSupervisor: 'nadie' }),
    ).toMatchObject({
      ok: false,
      codigo: 'ROL_NO_PERMITIDO',
    });
    igual();
  });

  it('Administrador INACTIVO → USUARIO_INACTIVO; actor inexistente → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    expect(await crear(prueba, { idActor: 'nadie' })).toMatchObject({ codigo: 'NO_ENCONTRADO' });
    inactivarAdmin(prueba);
    expect(await crear(prueba)).toMatchObject({ codigo: 'USUARIO_INACTIVO' });
  });

  describe('el código (formato y unicidad, tal como llega)', () => {
    it.each([
      ['repetido', 'PL2D', 'CODIGO_DUPLICADO'],
      ['repetido de un proyecto finalizado', 'TIE', 'CODIGO_DUPLICADO'],
      ['con minúsculas (no se pasa a mayúsculas)', 'tmv', 'CARACTERES_INVALIDOS'],
      ['con espacios alrededor (no se recorta)', ' TMV ', 'CARACTERES_INVALIDOS'],
      ['con un símbolo', 'TM-V', 'CARACTERES_INVALIDOS'],
      ['muy corto', 'TM', 'LONGITUD_INVALIDA'],
      ['muy largo', 'TMVXYZ', 'LONGITUD_INVALIDA'],
      ['vacío', '', 'CODIGO_PROYECTO_VACIO'],
      ['de solo espacios', '   ', 'CODIGO_PROYECTO_VACIO'],
    ])('%s → %s', async (_caso, codigo, codigoError) => {
      const prueba = prepararPrueba();
      const igual = sinEscritura(prueba);
      const r = await crear(prueba, { codigo });
      expect(r).toMatchObject({ ok: false, codigo: codigoError });
      if (!r.ok) {
        expect(r.mensaje.length).toBeGreaterThan(10);
        expect(r.campos).toEqual({ codigo: r.mensaje });
      }
      igual();
    });

    it('un código de 3 a 5 caracteres, letras y dígitos, es válido', async () => {
      const prueba = prepararPrueba();
      expect((await crear(prueba, { codigo: 'A1B2C' })).ok).toBe(true);
      expect((await crear(prueba, { codigo: '123' })).ok).toBe(true);
    });
  });

  describe('el supervisor', () => {
    it('que no existe → NO_ENCONTRADO', async () => {
      const prueba = prepararPrueba();
      const igual = sinEscritura(prueba);
      const r = await crear(prueba, { idSupervisor: 'usr-zz' });
      expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
      expect(r.ok ? {} : r.campos).toHaveProperty('idSupervisor');
      igual();
    });

    it.each([
      ['un practicante', PRACTICANTE],
      ['el administrador', ADMIN],
    ])('%s → SUPERVISOR_NO_VALIDO', async (_caso, id) => {
      const prueba = prepararPrueba();
      const igual = sinEscritura(prueba);
      const r = await crear(prueba, { idSupervisor: id });
      expect(r).toMatchObject({ ok: false, codigo: 'SUPERVISOR_NO_VALIDO' });
      expect(r.ok ? {} : r.campos).toHaveProperty('idSupervisor');
      igual();
    });

    it('inactivo → SUPERVISOR_NO_VALIDO («siempre con un supervisor activo»)', async () => {
      const prueba = prepararPrueba();
      prueba.modificar((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === SUPERVISOR_AJENO ? { ...u, estado: 'INACTIVO' as const } : u,
        ),
      }));
      const igual = sinEscritura(prueba);
      expect(await crear(prueba)).toMatchObject({ ok: false, codigo: 'SUPERVISOR_NO_VALIDO' });
      igual();
    });
  });

  it.each([
    ['nombre vacío', { nombre: '  ' }, 'nombre'],
    ['descripción vacía', { descripcion: '' }, 'descripcion'],
    ['fecha de inicio inexistente', { fecha_inicio: '2026-02-30' }, 'fecha_inicio'],
    ['fecha de fin con otro formato', { fecha_fin_prevista: '18/03/2027' }, 'fecha_fin_prevista'],
    [
      'repositorio con «/» final',
      { repositorio_url: 'https://github.com/org/repo/' },
      'repositorio_url',
    ],
    [
      'repositorio con «.git»',
      { repositorio_url: 'https://github.com/org/repo.git' },
      'repositorio_url',
    ],
    [
      'repositorio de otro sitio',
      { repositorio_url: 'https://gitlab.com/org/repo' },
      'repositorio_url',
    ],
    ['rama base vacía', { rama_base: '' }, 'rama_base'],
    ['rama base con espacios', { rama_base: 'mi rama' }, 'rama_base'],
    ['reunión con día y sin hora', { dia_reunion: 'LUNES' as const }, 'hora_reunion'],
    ['reunión con hora y sin día', { hora_reunion: '10:00' }, 'dia_reunion'],
    [
      'hora de reunión 24:00',
      { dia_reunion: 'LUNES' as const, hora_reunion: '24:00' },
      'hora_reunion',
    ],
  ])('%s → DATOS_INVALIDOS', async (_caso, cambios, campo) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await crear(prueba, cambios as Partial<EntradaCrearProyecto>);
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(r.ok ? {} : r.campos).toHaveProperty(campo);
    igual();
  });

  it('un fin anterior al inicio → FIN_ANTES_DE_INICIO', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await crear(prueba, { fecha_inicio: '2026-12-01', fecha_fin_prevista: '2026-11-30' });
    expect(r).toMatchObject({ ok: false, codigo: 'FIN_ANTES_DE_INICIO' });
    expect(r.ok ? {} : r.campos).toHaveProperty('fecha_fin_prevista');
    igual();
  });

  it('dos veces el mismo código: la segunda es CODIGO_DUPLICADO', async () => {
    const prueba = prepararPrueba();
    await crear(prueba);
    expect(await crear(prueba)).toMatchObject({ ok: false, codigo: 'CODIGO_DUPLICADO' });
  });
});

describe('editarDatosProyecto', () => {
  it('cambia nombre, descripción, fechas y repositorio, con dos eventos del mismo instante', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const original = proyecto(prueba, PL2D);
    const escrituras = prueba.escrituras();

    const r = await editar(prueba, {
      nombre: '  Plataforma 2D Andina ',
      descripcion: 'Nueva descripción.',
      fecha_inicio: '2026-01-05',
      fecha_fin_prevista: '2027-01-05',
      repositorio_url: 'https://github.com/org-demo/plataforma-2d-andina',
    });

    expect(r.ok && r.valor).toEqual({
      ...original,
      nombre: 'Plataforma 2D Andina',
      descripcion: 'Nueva descripción.',
      fecha_inicio: '2026-01-05',
      fecha_fin_prevista: '2027-01-05',
      repositorio_url: 'https://github.com/org-demo/plataforma-2d-andina',
    });
    expect(prueba.escrituras() - escrituras).toBe(1);
    const despues = prueba.datos();
    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos.map((e) => e.tipo_accion)).toEqual([
      'PROYECTO_EDITADO',
      'PROYECTO_REPOSITORIO_CAMBIADO',
    ]);
    expect(eventos[0].cambios.map((c) => c.campo)).toEqual([
      'nombre',
      'descripcion',
      'fecha_inicio',
      'fecha_fin_prevista',
    ]);
    expect(eventos[0].cambios[0]).toEqual({
      campo: 'nombre',
      valor_anterior: original.nombre,
      valor_nuevo: 'Plataforma 2D Andina',
    });
    expect(eventos[1].cambios).toEqual([
      {
        campo: 'repositorio_url',
        valor_anterior: original.repositorio_url,
        valor_nuevo: 'https://github.com/org-demo/plataforma-2d-andina',
      },
    ]);
    for (const e of eventos) {
      expect(e).toMatchObject({
        autor: { tipo: 'USUARIO', id_usuario: ADMIN },
        elemento: { tipo: 'PROYECTO', id: PL2D, etiqueta: 'PL2D · Plataforma 2D Andina' },
        id_proyecto: PL2D,
        fecha: AHORA_ISO,
      });
    }
    // Sin avisos; las tareas y sus URL de PR no se tocan; los demás proyectos tampoco.
    expect(despues.notificaciones).toBe(antes.notificaciones);
    expect(despues.tareas).toBe(antes.tareas);
    expect(despues.proyectos.filter((p) => p.id !== PL2D)).toEqual(
      antes.proyectos.filter((p) => p.id !== PL2D),
    );
  });

  it('solo el repositorio deja un único evento de repositorio', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos().historial.length;
    await editar(prueba, { repositorio_url: 'https://github.com/org-demo/otro' });
    const eventos = prueba.datos().historial.slice(antes);
    expect(eventos.map((e) => e.tipo_accion)).toEqual(['PROYECTO_REPOSITORIO_CAMBIADO']);
  });

  it('solo el nombre deja un único evento de edición', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos().historial.length;
    await editar(prueba, { nombre: 'Otro nombre' });
    const eventos = prueba.datos().historial.slice(antes);
    expect(eventos.map((e) => e.tipo_accion)).toEqual(['PROYECTO_EDITADO']);
    expect(eventos[0].cambios.map((c) => c.campo)).toEqual(['nombre']);
  });

  it('se puede editar un proyecto FINALIZADO', async () => {
    const prueba = prepararPrueba();
    const r = await editar(prueba, { descripcion: 'Notas finales del proyecto.' }, TIE);
    expect(r.ok && r.valor.estado).toBe('FINALIZADO');
  });

  it('el código nunca cambia: uno distinto → CODIGO_INMUTABLE y no escribe nada', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await editar(prueba, { codigo: 'NUEVO', nombre: 'Otro nombre' });
    expect(r).toMatchObject({ ok: false, codigo: 'CODIGO_INMUTABLE' });
    expect(r.ok ? {} : r.campos).toHaveProperty('codigo');
    igual();
    expect(proyecto(prueba, PL2D).codigo).toBe('PL2D');
  });

  it('el mismo código en la entrada (un formulario que manda todo) se ignora', async () => {
    const prueba = prepararPrueba();
    const r = await editar(prueba, { codigo: 'PL2D', nombre: 'Otro nombre' });
    expect(r.ok && r.valor.codigo).toBe('PL2D');
  });

  it.each([
    ['sin ningún dato', {}],
    ['solo el código', { codigo: 'PL2D' }],
  ])('%s → DATOS_INVALIDOS', async (_caso, cambios) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await editar(prueba, cambios);
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(r.ok ? {} : r.campos).toHaveProperty('_general');
    igual();
  });

  it.each([
    ['nombre vacío', { nombre: ' ' }, 'nombre'],
    ['descripción vacía', { descripcion: '' }, 'descripcion'],
    ['fecha inexistente', { fecha_fin_prevista: '2027-02-29' }, 'fecha_fin_prevista'],
    [
      'repositorio inválido',
      { repositorio_url: 'https://github.com/org/repo/' },
      'repositorio_url',
    ],
  ])('%s → DATOS_INVALIDOS', async (_caso, cambios, campo) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await editar(prueba, cambios);
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(r.ok ? {} : r.campos).toHaveProperty(campo);
    igual();
  });

  it.each([
    [
      'solo el fin, antes del inicio',
      (p: Proyecto) => ({
        fecha_fin_prevista: p.fecha_inicio.replace(/-\d\d$/, '-01').replace(/^\d{4}/, '2000'),
      }),
    ],
    ['solo el inicio, después del fin', () => ({ fecha_inicio: '2099-01-01' })],
  ])('%s → FIN_ANTES_DE_INICIO (con los valores que quedarían)', async (_caso, cambios) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await editar(prueba, cambios(proyecto(prueba, PL2D)));
    expect(r).toMatchObject({ ok: false, codigo: 'FIN_ANTES_DE_INICIO' });
    igual();
  });

  it('los mismos valores → SIN_CAMBIOS', async () => {
    const prueba = prepararPrueba();
    const p = proyecto(prueba, PL2D);
    const igual = sinEscritura(prueba);
    expect(
      await editar(prueba, {
        nombre: p.nombre,
        descripcion: p.descripcion,
        repositorio_url: p.repositorio_url,
      }),
    ).toMatchObject({ ok: false, codigo: 'SIN_CAMBIOS' });
    igual();
  });

  it.each([
    ['Supervisor del proyecto', SUPERVISOR],
    ['Supervisor ajeno', SUPERVISOR_AJENO],
    ['Practicante', PRACTICANTE],
  ])('%s → ROL_NO_PERMITIDO y no escribe nada', async (_rol, actor) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await editar(prueba, { nombre: 'Otro nombre' }, PL2D, actor)).toMatchObject({
      ok: false,
      codigo: 'ROL_NO_PERMITIDO',
    });
    igual();
  });

  it('Administrador INACTIVO → USUARIO_INACTIVO; proyecto o actor inexistente → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    expect(await editar(prueba, { nombre: 'X' }, 'pry-zz')).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    expect(await editar(prueba, { nombre: 'X' }, PL2D, 'nadie')).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    inactivarAdmin(prueba);
    expect(await editar(prueba, { nombre: 'X' })).toMatchObject({ codigo: 'USUARIO_INACTIVO' });
  });
});

describe('cambiarRamaBase', () => {
  it('el Administrador la cambia y queda el evento', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const original = proyecto(prueba, PL2D);
    const escrituras = prueba.escrituras();

    const r = await rama(prueba, ' estable ');

    expect(r.ok && r.valor).toEqual({ ...original, rama_base: 'estable' });
    expect(prueba.escrituras() - escrituras).toBe(1);
    const despues = prueba.datos();
    expect(proyecto(prueba, PL2D).rama_base).toBe('estable');
    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      tipo_accion: 'PROYECTO_RAMA_BASE_CAMBIADA',
      elemento: { tipo: 'PROYECTO', id: PL2D },
      id_proyecto: PL2D,
      cambios: [{ campo: 'rama_base', valor_anterior: original.rama_base, valor_nuevo: 'estable' }],
    });
    expect(despues.notificaciones).toBe(antes.notificaciones);
    // Las tareas con PR conservan las ramas con las que se crearon.
    expect(despues.tareas).toBe(antes.tareas);
  });

  it('el Supervisor del proyecto también puede', async () => {
    const prueba = prepararPrueba();
    const r = await rama(prueba, 'estable', PL2D, SUPERVISOR);
    expect(r.ok).toBe(true);
    expect(prueba.datos().historial.at(-1)!.autor).toEqual({
      tipo: 'USUARIO',
      id_usuario: SUPERVISOR,
    });
  });

  it('también con el proyecto FINALIZADO', async () => {
    const prueba = prepararPrueba();
    expect((await rama(prueba, 'estable', TIE)).ok).toBe(true);
  });

  it('un Supervisor ajeno → FUERA_DE_ALCANCE; un Practicante → ROL_NO_PERMITIDO', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await rama(prueba, 'estable', PL2D, SUPERVISOR_AJENO)).toMatchObject({
      ok: false,
      codigo: 'FUERA_DE_ALCANCE',
    });
    expect(await rama(prueba, 'estable', PL2D, PRACTICANTE)).toMatchObject({
      ok: false,
      codigo: 'ROL_NO_PERMITIDO',
    });
    igual();
  });

  it.each([
    ['vacía', ''],
    ['de solo espacios', '   '],
    ['con espacios por dentro', 'mi rama'],
  ])('una rama %s → DATOS_INVALIDOS', async (_caso, valor) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await rama(prueba, valor);
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(r.ok ? {} : r.campos).toHaveProperty('rama_base');
    igual();
  });

  it('la misma rama → SIN_CAMBIOS; Administrador INACTIVO → USUARIO_INACTIVO; proyecto inexistente → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    expect(await rama(prueba, proyecto(prueba, PL2D).rama_base)).toMatchObject({
      codigo: 'SIN_CAMBIOS',
    });
    expect(await rama(prueba, 'estable', 'pry-zz')).toMatchObject({ codigo: 'NO_ENCONTRADO' });
    inactivarAdmin(prueba);
    expect(await rama(prueba, 'estable')).toMatchObject({ codigo: 'USUARIO_INACTIVO' });
  });
});

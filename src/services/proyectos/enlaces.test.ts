import { describe, expect, it } from 'vitest';
import type { Id } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import { agregarEnlace, editarEnlace, quitarEnlace } from './enlaces';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // PL2D y RSV
const SUPERVISOR_AJENO = 'usr-sup-02';
const PRACTICANTE = 'demo-practicante';
const PL2D = 'pry-pl2d';
const RSV = 'pry-rsv';
const TIE = 'pry-tie'; // finalizado
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

const agregar = (
  p: PruebaPreparada,
  cambios: { nombre?: string; url?: string } = {},
  idProyecto: Id = PL2D,
  idActor: Id = ADMIN,
) =>
  agregarEnlace(
    {
      idActor,
      idProyecto,
      nombre: 'Carpeta de documentos',
      url: 'https://drive.ejemplo.com/pl2d',
      ...cambios,
    },
    p.entorno,
  );
const editar = (
  p: PruebaPreparada,
  idEnlace: Id,
  cambios: { nombre?: string; url?: string },
  idProyecto: Id = PL2D,
  idActor: Id = ADMIN,
) => editarEnlace({ idActor, idProyecto, idEnlace, ...cambios }, p.entorno);
const quitar = (p: PruebaPreparada, idEnlace: Id, idProyecto: Id = PL2D, idActor: Id = ADMIN) =>
  quitarEnlace({ idActor, idProyecto, idEnlace }, p.entorno);

/** Un enlace de la semilla de ese proyecto. */
const enlaceDe = (p: PruebaPreparada, idProyecto: Id) =>
  p.datos().enlaces_proyecto.find((e) => e.id_proyecto === idProyecto)!;

function inactivarAdmin(p: PruebaPreparada) {
  p.modificar((d) => ({
    usuarios: d.usuarios.map((u) => (u.id === ADMIN ? { ...u, estado: 'INACTIVO' as const } : u)),
  }));
}

describe('permisos de los enlaces', () => {
  const casos: [string, (p: PruebaPreparada, actor: Id) => Promise<{ ok: boolean }>][] = [
    ['agregarEnlace', (p, actor) => agregar(p, {}, PL2D, actor)],
    [
      'editarEnlace',
      (p, actor) => editar(p, enlaceDe(p, PL2D).id, { nombre: 'Otro' }, PL2D, actor),
    ],
    ['quitarEnlace', (p, actor) => quitar(p, enlaceDe(p, PL2D).id, PL2D, actor)],
  ];

  describe.each(casos)('%s', (_nombre, ejecutar) => {
    it.each([
      ['el Administrador', ADMIN],
      ['el Supervisor del proyecto', SUPERVISOR],
    ])('%s puede, con una sola escritura y sin avisos', async (_quien, actor) => {
      const prueba = prepararPrueba();
      const antes = prueba.datos();
      const escrituras = prueba.escrituras();
      expect((await ejecutar(prueba, actor)).ok).toBe(true);
      expect(prueba.escrituras() - escrituras).toBe(1);
      expect(prueba.datos().notificaciones).toBe(antes.notificaciones);
    });

    it('un Supervisor ajeno → FUERA_DE_ALCANCE y no escribe nada', async () => {
      const prueba = prepararPrueba();
      const igual = sinEscritura(prueba);
      expect(await ejecutar(prueba, SUPERVISOR_AJENO)).toMatchObject({
        ok: false,
        codigo: 'FUERA_DE_ALCANCE',
      });
      igual();
    });

    it('un Practicante → ROL_NO_PERMITIDO y no escribe nada', async () => {
      const prueba = prepararPrueba();
      const igual = sinEscritura(prueba);
      expect(await ejecutar(prueba, PRACTICANTE)).toMatchObject({
        ok: false,
        codigo: 'ROL_NO_PERMITIDO',
      });
      igual();
    });

    it('Administrador INACTIVO → USUARIO_INACTIVO; actor inexistente → NO_ENCONTRADO', async () => {
      const prueba = prepararPrueba();
      expect(await ejecutar(prueba, 'nadie')).toMatchObject({ codigo: 'NO_ENCONTRADO' });
      inactivarAdmin(prueba);
      expect(await ejecutar(prueba, ADMIN)).toMatchObject({ codigo: 'USUARIO_INACTIVO' });
    });
  });
});

describe('agregarEnlace', () => {
  it('crea el enlace del proyecto y deja el evento con su nombre', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();

    const r = await agregar(prueba, {
      nombre: '  Canal de Discord ',
      url: ' https://discord.gg/abc123 ',
    });

    expect(r).toEqual({
      ok: true,
      valor: {
        id: 'enl-t001',
        id_proyecto: PL2D,
        nombre: 'Canal de Discord',
        url: 'https://discord.gg/abc123',
      },
    });
    const despues = prueba.datos();
    expect(despues.enlaces_proyecto.at(-1)).toEqual(r.ok ? r.valor : null);
    expect(despues.enlaces_proyecto).toHaveLength(antes.enlaces_proyecto.length + 1);
    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      tipo_accion: 'PROYECTO_ENLACE_AGREGADO',
      elemento: { tipo: 'PROYECTO', id: PL2D },
      id_proyecto: PL2D,
      fecha: AHORA_ISO,
      cambios: [{ campo: 'enlace', valor_anterior: null, valor_nuevo: 'Canal de Discord' }],
    });
  });

  it('el Supervisor deja su nombre como autor; también con el proyecto FINALIZADO', async () => {
    const prueba = prepararPrueba();
    await agregar(prueba, {}, PL2D, SUPERVISOR);
    expect(prueba.datos().historial.at(-1)!.autor).toEqual({
      tipo: 'USUARIO',
      id_usuario: SUPERVISOR,
    });
    expect((await agregar(prueba, {}, TIE)).ok).toBe(true);
  });

  it('se permiten dos enlaces con el mismo nombre', async () => {
    const prueba = prepararPrueba();
    await agregar(prueba);
    expect((await agregar(prueba)).ok).toBe(true);
  });

  it.each([
    ['nombre vacío', { nombre: '   ' }, 'nombre'],
    ['dirección vacía', { url: '' }, 'url'],
    ['dirección sin formato', { url: 'esto no es un enlace' }, 'url'],
    ['dirección ftp', { url: 'ftp://ejemplo.com/archivo' }, 'url'],
    ['dirección con javascript', { url: 'javascript:alert(1)' }, 'url'],
    ['dirección sin protocolo', { url: 'ejemplo.com' }, 'url'],
  ])('%s → DATOS_INVALIDOS', async (_caso, cambios, campo) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await agregar(prueba, cambios);
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(r.ok ? {} : r.campos).toHaveProperty(campo);
    igual();
  });

  it('un proyecto que no existe → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    expect(await agregar(prueba, {}, 'pry-zz')).toMatchObject({
      ok: false,
      codigo: 'NO_ENCONTRADO',
    });
  });
});

describe('editarEnlace', () => {
  it('cambia el nombre y la dirección y registra lo anterior y lo nuevo', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const enlace = enlaceDe(prueba, PL2D);

    const r = await editar(prueba, enlace.id, {
      nombre: 'Documentos 2026',
      url: 'https://nuevo.ejemplo.com',
    });

    expect(r).toEqual({
      ok: true,
      valor: { ...enlace, nombre: 'Documentos 2026', url: 'https://nuevo.ejemplo.com' },
    });
    const despues = prueba.datos();
    expect(despues.enlaces_proyecto.find((e) => e.id === enlace.id)).toEqual(r.ok ? r.valor : null);
    // Los demás enlaces no cambian.
    expect(despues.enlaces_proyecto.filter((e) => e.id !== enlace.id)).toEqual(
      antes.enlaces_proyecto.filter((e) => e.id !== enlace.id),
    );
    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      tipo_accion: 'PROYECTO_ENLACE_EDITADO',
      id_proyecto: PL2D,
      cambios: [
        { campo: 'nombre', valor_anterior: enlace.nombre, valor_nuevo: 'Documentos 2026' },
        { campo: 'url', valor_anterior: enlace.url, valor_nuevo: 'https://nuevo.ejemplo.com' },
      ],
    });
  });

  it('solo el nombre o solo la dirección registran solo ese cambio', async () => {
    const prueba = prepararPrueba();
    const enlace = enlaceDe(prueba, PL2D);
    await editar(prueba, enlace.id, { nombre: 'Solo nombre' });
    expect(
      prueba
        .datos()
        .historial.at(-1)!
        .cambios.map((c) => c.campo),
    ).toEqual(['nombre']);
    await editar(prueba, enlace.id, { url: 'https://solo.ejemplo.com' });
    expect(
      prueba
        .datos()
        .historial.at(-1)!
        .cambios.map((c) => c.campo),
    ).toEqual(['url']);
  });

  it('los mismos valores → SIN_CAMBIOS; sin ningún dato → DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    const enlace = enlaceDe(prueba, PL2D);
    const igual = sinEscritura(prueba);
    expect(
      await editar(prueba, enlace.id, { nombre: enlace.nombre, url: enlace.url }),
    ).toMatchObject({
      codigo: 'SIN_CAMBIOS',
    });
    const r = await editar(prueba, enlace.id, {});
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(r.ok ? {} : r.campos).toHaveProperty('_general');
    igual();
  });

  it('una dirección inválida → DATOS_INVALIDOS en «url»', async () => {
    const prueba = prepararPrueba();
    const r = await editar(prueba, enlaceDe(prueba, PL2D).id, { url: 'no es un enlace' });
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(r.ok ? {} : r.campos).toHaveProperty('url');
  });

  it('un enlace de otro proyecto o que no existe → NO_ENCONTRADO y no escribe nada', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await editar(prueba, enlaceDe(prueba, RSV).id, { nombre: 'X' })).toMatchObject({
      ok: false,
      codigo: 'NO_ENCONTRADO',
    });
    expect(await editar(prueba, 'enl-zz', { nombre: 'X' })).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    igual();
  });
});

describe('quitarEnlace', () => {
  it('borra el enlace y deja el evento con su nombre', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const enlace = enlaceDe(prueba, PL2D);

    const r = await quitar(prueba, enlace.id);

    expect(r).toEqual({ ok: true, valor: { id: enlace.id } });
    const despues = prueba.datos();
    expect(despues.enlaces_proyecto.some((e) => e.id === enlace.id)).toBe(false);
    expect(despues.enlaces_proyecto).toHaveLength(antes.enlaces_proyecto.length - 1);
    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      tipo_accion: 'PROYECTO_ENLACE_QUITADO',
      elemento: { tipo: 'PROYECTO', id: PL2D },
      id_proyecto: PL2D,
      cambios: [{ campo: 'enlace', valor_anterior: enlace.nombre, valor_nuevo: null }],
    });
  });

  it('un enlace de otro proyecto o que no existe → NO_ENCONTRADO y no escribe nada', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await quitar(prueba, enlaceDe(prueba, RSV).id)).toMatchObject({
      ok: false,
      codigo: 'NO_ENCONTRADO',
    });
    expect(await quitar(prueba, 'enl-zz')).toMatchObject({ codigo: 'NO_ENCONTRADO' });
    igual();
  });

  it('quitar dos veces el mismo: el segundo es NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    const enlace = enlaceDe(prueba, PL2D);
    await quitar(prueba, enlace.id);
    expect(await quitar(prueba, enlace.id)).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
  });

  it('también con el proyecto FINALIZADO', async () => {
    const prueba = prepararPrueba();
    const enlace = enlaceDe(prueba, TIE);
    expect((await quitar(prueba, enlace.id, TIE)).ok).toBe(true);
  });
});

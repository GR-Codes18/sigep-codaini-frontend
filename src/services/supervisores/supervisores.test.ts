import { describe, expect, it } from 'vitest';
import type { Id } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import type { Resultado } from '../resultado';
import {
  crearSupervisor,
  desactivarSupervisor,
  editarSupervisor,
  reactivarSupervisor,
  type EntradaCrearSupervisor,
} from './supervisores';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // PL2D y RSV, ambos activos
const SUPERVISOR_INV = 'usr-sup-03'; // INV, en pausa
const SUPERVISOR_DAT = 'usr-sup-02'; // TIE (finalizado) y DAT (activo)
const PRACTICANTE = 'demo-practicante';
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

const DATOS: EntradaCrearSupervisor = {
  idActor: ADMIN,
  nombre: 'Ana Pérez Rojas',
  correo: 'ana.perez@codaini.demo',
  celular: '987654321',
};

const crear = (p: PruebaPreparada, cambios: Partial<EntradaCrearSupervisor> = {}) =>
  crearSupervisor({ ...DATOS, ...cambios }, p.entorno);
const editar = (
  p: PruebaPreparada,
  idSupervisor: Id,
  cambios: { nombre?: string; correo?: string },
  idActor: Id = ADMIN,
) => editarSupervisor({ idActor, idSupervisor, ...cambios }, p.entorno);
const desactivar = (p: PruebaPreparada, idSupervisor: Id, idActor: Id = ADMIN) =>
  desactivarSupervisor({ idActor, idSupervisor }, p.entorno);
const reactivar = (p: PruebaPreparada, idSupervisor: Id, idActor: Id = ADMIN) =>
  reactivarSupervisor({ idActor, idSupervisor }, p.entorno);

const usuario = (p: PruebaPreparada, id: Id) => p.datos().usuarios.find((u) => u.id === id)!;

/** Un supervisor sin proyectos: se crea con el servicio. */
async function supervisorNuevo(p: PruebaPreparada): Promise<Id> {
  const r = await crear(p);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor.id_usuario;
}

function inactivarAdmin(p: PruebaPreparada) {
  p.modificar((d) => ({
    usuarios: d.usuarios.map((u) => (u.id === ADMIN ? { ...u, estado: 'INACTIVO' as const } : u)),
  }));
}

describe('permisos de los servicios de supervisores', () => {
  // El permiso se comprueba antes que el estado y que los proyectos: sirve cualquier supervisor de destino.
  const casos: [string, (p: PruebaPreparada, actor: Id) => Promise<Resultado<unknown>>][] = [
    ['crearSupervisor', (p, actor) => crear(p, { idActor: actor })],
    ['editarSupervisor', (p, actor) => editar(p, SUPERVISOR, { nombre: 'Otro nombre' }, actor)],
    ['desactivarSupervisor', (p, actor) => desactivar(p, SUPERVISOR, actor)],
    ['reactivarSupervisor', (p, actor) => reactivar(p, SUPERVISOR, actor)],
  ];

  describe.each(casos)('%s', (_nombre, ejecutar) => {
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
      inactivarAdmin(prueba);
      expect(await ejecutar(prueba, ADMIN)).toMatchObject({
        ok: false,
        codigo: 'USUARIO_INACTIVO',
      });
      expect(await ejecutar(prueba, 'nadie')).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    });
  });
});

describe('crearSupervisor', () => {
  it('crea la cuenta y el detalle, con una contraseña temporal, en una sola escritura', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const escrituras = prueba.escrituras();

    const r = await crear(prueba);

    expect(r).toEqual({
      ok: true,
      valor: { id_usuario: 'usr-t001', contrasena_temporal: 'Clave-t001' },
    });
    expect(prueba.escrituras() - escrituras).toBe(1);
    const despues = prueba.datos();
    expect(usuario(prueba, 'usr-t001')).toEqual({
      id: 'usr-t001',
      nombre: 'Ana Pérez Rojas',
      correo: 'ana.perez@codaini.demo',
      celular: '987654321',
      contrasena: 'Clave-t001',
      rol: 'SUPERVISOR',
      estado: 'ACTIVO',
      debe_cambiar_contrasena: true,
      fecha_alta: AHORA_ISO,
    });
    // Discord y GitHub nacen vacíos y los completa la persona en Mi perfil.
    expect(despues.supervisores.at(-1)).toEqual({
      id_usuario: 'usr-t001',
      discord: null,
      cuenta_github: null,
    });
    expect(despues.usuarios).toHaveLength(antes.usuarios.length + 1);
    // Un supervisor nuevo no tiene proyectos (estado vacío) y no se avisa a nadie.
    expect(despues.proyectos).toBe(antes.proyectos);
    expect(despues.notificaciones).toBe(antes.notificaciones);

    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      tipo_accion: 'SUPERVISOR_CREADO',
      elemento: { tipo: 'USUARIO', id: 'usr-t001', etiqueta: 'Ana Pérez Rojas' },
      id_proyecto: null,
      fecha: AHORA_ISO,
      cambios: [
        { campo: 'nombre', valor_anterior: null, valor_nuevo: 'Ana Pérez Rojas' },
        { campo: 'correo', valor_anterior: null, valor_nuevo: 'ana.perez@codaini.demo' },
      ],
    });
  });

  it('la contraseña temporal no aparece en ningún evento del historial', async () => {
    const prueba = prepararPrueba();
    const r = await crear(prueba);
    if (!r.ok) throw new Error(r.mensaje);
    expect(JSON.stringify(prueba.datos().historial)).not.toContain(r.valor.contrasena_temporal);
  });

  it('recorta los espacios del nombre, el correo y el celular', async () => {
    const prueba = prepararPrueba();
    await crear(prueba, {
      nombre: '  Ana Pérez  ',
      correo: '  ana@codaini.demo ',
      celular: ' 987654321 ',
    });
    expect(usuario(prueba, 'usr-t001')).toMatchObject({
      nombre: 'Ana Pérez',
      correo: 'ana@codaini.demo',
      celular: '987654321',
    });
  });

  it.each([
    ['otro supervisor, con otras mayúsculas', SUPERVISOR, (c: string) => c.toUpperCase()],
    ['un practicante, con espacios alrededor', PRACTICANTE, (c: string) => `  ${c}  `],
    ['el administrador, tal cual', ADMIN, (c: string) => c],
  ])('un correo que ya usa %s → CORREO_YA_REGISTRADO', async (_caso, idDueno, variante) => {
    const prueba = prepararPrueba();
    const correo = variante(usuario(prueba, idDueno).correo);
    const igual = sinEscritura(prueba);
    const r = await crear(prueba, { correo });
    expect(r).toMatchObject({ ok: false, codigo: 'CORREO_YA_REGISTRADO' });
    expect(r.ok ? {} : r.campos).toHaveProperty('correo');
    igual();
  });

  it.each([
    ['nombre vacío', { nombre: '   ' }, 'nombre'],
    ['correo sin formato', { correo: 'sin-arroba' }, 'correo'],
    ['correo vacío', { correo: '' }, 'correo'],
    ['celular de 8 dígitos', { celular: '98765432' }, 'celular'],
    ['celular que no empieza con 9', { celular: '887654321' }, 'celular'],
    ['celular con letras', { celular: '98765432x' }, 'celular'],
  ])('%s → DATOS_INVALIDOS', async (_caso, cambios, campo) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await crear(prueba, cambios);
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(r.ok ? {} : r.campos).toHaveProperty(campo);
    igual();
  });

  it('cada supervisor recibe una contraseña distinta', async () => {
    const prueba = prepararPrueba();
    const a = await crear(prueba);
    const b = await crear(prueba, { correo: 'otra@codaini.demo' });
    expect(a.ok && b.ok && a.valor.contrasena_temporal !== b.valor.contrasena_temporal).toBe(true);
  });
});

describe('editarSupervisor', () => {
  it('cambia el nombre y el correo y registra el valor anterior y el nuevo', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const persona = usuario(prueba, SUPERVISOR);

    const r = await editar(prueba, SUPERVISOR, {
      nombre: ' Carlos Nuevo ',
      correo: ' CARLOS@codaini.demo ',
    });

    expect(r).toEqual({
      ok: true,
      valor: { ...persona, nombre: 'Carlos Nuevo', correo: 'CARLOS@codaini.demo' },
    });
    const despues = prueba.datos();
    expect(usuario(prueba, SUPERVISOR)).toEqual(r.ok ? r.valor : null);
    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      tipo_accion: 'SUPERVISOR_EDITADO',
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      elemento: { tipo: 'USUARIO', id: SUPERVISOR, etiqueta: 'Carlos Nuevo' },
      id_proyecto: null,
      cambios: [
        { campo: 'nombre', valor_anterior: persona.nombre, valor_nuevo: 'Carlos Nuevo' },
        { campo: 'correo', valor_anterior: persona.correo, valor_nuevo: 'CARLOS@codaini.demo' },
      ],
    });
    // No toca la contraseña, el detalle ni a nadie más, y no avisa.
    expect(despues.supervisores).toBe(antes.supervisores);
    expect(despues.notificaciones).toBe(antes.notificaciones);
    expect(usuario(prueba, SUPERVISOR).contrasena).toBe(persona.contrasena);
    expect(despues.usuarios.filter((u) => u.id !== SUPERVISOR)).toEqual(
      antes.usuarios.filter((u) => u.id !== SUPERVISOR),
    );
  });

  it('solo el nombre o solo el correo registra solo ese cambio', async () => {
    const prueba = prepararPrueba();
    await editar(prueba, SUPERVISOR, { nombre: 'Solo Nombre' });
    expect(
      prueba
        .datos()
        .historial.at(-1)!
        .cambios.map((c) => c.campo),
    ).toEqual(['nombre']);
    await editar(prueba, SUPERVISOR, { correo: 'solo.correo@codaini.demo' });
    expect(
      prueba
        .datos()
        .historial.at(-1)!
        .cambios.map((c) => c.campo),
    ).toEqual(['correo']);
  });

  it('su propio correo con otras mayúsculas es una edición válida (no choca consigo mismo)', async () => {
    const prueba = prepararPrueba();
    const correo = usuario(prueba, SUPERVISOR).correo.toUpperCase();
    const r = await editar(prueba, SUPERVISOR, { correo });
    expect(r.ok && r.valor.correo).toBe(correo);
  });

  it.each([
    ['el de otro supervisor, con otras mayúsculas', SUPERVISOR_DAT, (c: string) => c.toUpperCase()],
    ['el de un practicante, con espacios', PRACTICANTE, (c: string) => `  ${c} `],
  ])('%s → CORREO_YA_REGISTRADO y no escribe nada', async (_caso, idDueno, variante) => {
    const prueba = prepararPrueba();
    const correo = variante(usuario(prueba, idDueno).correo);
    const igual = sinEscritura(prueba);
    const r = await editar(prueba, SUPERVISOR, { correo });
    expect(r).toMatchObject({ ok: false, codigo: 'CORREO_YA_REGISTRADO' });
    expect(r.ok ? {} : r.campos).toHaveProperty('correo');
    igual();
  });

  it('los mismos datos → SIN_CAMBIOS', async () => {
    const prueba = prepararPrueba();
    const persona = usuario(prueba, SUPERVISOR);
    const igual = sinEscritura(prueba);
    expect(
      await editar(prueba, SUPERVISOR, { nombre: persona.nombre, correo: persona.correo }),
    ).toMatchObject({
      ok: false,
      codigo: 'SIN_CAMBIOS',
    });
    igual();
  });

  it.each([
    ['sin ningún dato', {}, '_general'],
    ['nombre vacío', { nombre: '  ' }, 'nombre'],
    ['correo sin formato', { correo: 'xx' }, 'correo'],
  ])('%s → DATOS_INVALIDOS', async (_caso, cambios, campo) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await editar(prueba, SUPERVISOR, cambios);
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(r.ok ? {} : r.campos).toHaveProperty(campo);
    igual();
  });

  it('una persona que no es supervisor → FUERA_DE_ALCANCE; inexistente → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await editar(prueba, PRACTICANTE, { nombre: 'X Y' })).toMatchObject({
      codigo: 'FUERA_DE_ALCANCE',
    });
    expect(await editar(prueba, 'usr-zz', { nombre: 'X Y' })).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    igual();
  });

  it('también se puede editar a un supervisor inactivo', async () => {
    const prueba = prepararPrueba();
    const id = await supervisorNuevo(prueba);
    await desactivar(prueba, id);
    expect((await editar(prueba, id, { nombre: 'Nuevo Nombre' })).ok).toBe(true);
  });
});

describe('desactivarSupervisor', () => {
  it('desactiva a un supervisor sin proyectos y registra el evento', async () => {
    const prueba = prepararPrueba();
    const id = await supervisorNuevo(prueba);
    const antes = prueba.datos();
    const escrituras = prueba.escrituras();

    const r = await desactivar(prueba, id);

    expect(r.ok && r.valor).toEqual({ ...usuario(prueba, id), estado: 'INACTIVO' });
    expect(prueba.escrituras() - escrituras).toBe(1);
    const eventos = prueba.datos().historial.slice(antes.historial.length);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      tipo_accion: 'SUPERVISOR_DESACTIVADO',
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      elemento: { tipo: 'USUARIO', id },
      id_proyecto: null,
      cambios: [{ campo: 'estado', valor_anterior: 'ACTIVO', valor_nuevo: 'INACTIVO' }],
    });
    expect(prueba.datos().notificaciones).toBe(antes.notificaciones);
  });

  it('con proyectos activos → SUPERVISOR_CON_PROYECTOS, con la cantidad y sin escribir', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await desactivar(prueba, SUPERVISOR);
    expect(r).toMatchObject({ ok: false, codigo: 'SUPERVISOR_CON_PROYECTOS' });
    expect(!r.ok && r.mensaje).toContain('2 proyectos activos o en pausa');
    igual();
  });

  it('un proyecto en pausa también cuenta (y el mensaje va en singular)', async () => {
    const prueba = prepararPrueba();
    const r = await desactivar(prueba, SUPERVISOR_INV);
    expect(r).toMatchObject({ ok: false, codigo: 'SUPERVISOR_CON_PROYECTOS' });
    expect(!r.ok && r.mensaje).toContain('1 proyecto activo o en pausa');
  });

  it('los proyectos finalizados no cuentan', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      proyectos: d.proyectos.map((p) =>
        p.id_supervisor === SUPERVISOR_DAT ? { ...p, estado: 'FINALIZADO' as const } : p,
      ),
    }));
    expect((await desactivar(prueba, SUPERVISOR_DAT)).ok).toBe(true);
    expect(usuario(prueba, SUPERVISOR_DAT).estado).toBe('INACTIVO');
  });

  it('uno ya inactivo → SUPERVISOR_YA_INACTIVO', async () => {
    const prueba = prepararPrueba();
    const id = await supervisorNuevo(prueba);
    await desactivar(prueba, id);
    const igual = sinEscritura(prueba);
    expect(await desactivar(prueba, id)).toMatchObject({
      ok: false,
      codigo: 'SUPERVISOR_YA_INACTIVO',
    });
    igual();
  });

  it('una persona que no es supervisor → FUERA_DE_ALCANCE; inexistente → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    expect(await desactivar(prueba, PRACTICANTE)).toMatchObject({ codigo: 'FUERA_DE_ALCANCE' });
    expect(await desactivar(prueba, 'usr-zz')).toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('no se puede desactivar a un supervisor con proyectos, pero sí tras finalizarlos', async () => {
    const prueba = prepararPrueba();
    expect(await desactivar(prueba, SUPERVISOR_DAT)).toMatchObject({
      codigo: 'SUPERVISOR_CON_PROYECTOS',
    });
  });
});

describe('reactivarSupervisor', () => {
  it('vuelve a ACTIVO y registra el evento', async () => {
    const prueba = prepararPrueba();
    const id = await supervisorNuevo(prueba);
    await desactivar(prueba, id);
    const antes = prueba.datos();

    const r = await reactivar(prueba, id);

    expect(r.ok && r.valor.estado).toBe('ACTIVO');
    expect(usuario(prueba, id).estado).toBe('ACTIVO');
    const eventos = prueba.datos().historial.slice(antes.historial.length);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      tipo_accion: 'SUPERVISOR_REACTIVADO',
      cambios: [{ campo: 'estado', valor_anterior: 'INACTIVO', valor_nuevo: 'ACTIVO' }],
    });
    // No pide texto y no avisa a nadie.
    expect(eventos[0].nota).toBeNull();
    expect(prueba.datos().notificaciones).toBe(antes.notificaciones);
  });

  it('uno que ya está activo → SUPERVISOR_YA_ACTIVO', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await reactivar(prueba, SUPERVISOR);
    expect(r).toMatchObject({ ok: false, codigo: 'SUPERVISOR_YA_ACTIVO' });
    expect(!r.ok && r.mensaje).toContain('supervisor inactivo');
    igual();
  });

  it('una persona que no es supervisor → FUERA_DE_ALCANCE; inexistente → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    expect(await reactivar(prueba, PRACTICANTE)).toMatchObject({ codigo: 'FUERA_DE_ALCANCE' });
    expect(await reactivar(prueba, 'usr-zz')).toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('crear → desactivar → reactivar deja al supervisor activo y con su historia', async () => {
    const prueba = prepararPrueba();
    const inicio = prueba.datos().historial.length;
    const id = await supervisorNuevo(prueba);
    await desactivar(prueba, id);
    await reactivar(prueba, id);
    expect(
      prueba
        .datos()
        .historial.slice(inicio)
        .map((e) => e.tipo_accion),
    ).toEqual(['SUPERVISOR_CREADO', 'SUPERVISOR_DESACTIVADO', 'SUPERVISOR_REACTIVADO']);
    expect(usuario(prueba, id).estado).toBe('ACTIVO');
  });
});

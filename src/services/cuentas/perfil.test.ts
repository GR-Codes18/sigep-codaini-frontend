import { describe, expect, it } from 'vitest';
import type { Id } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import { editarMiPerfil, type EntradaEditarMiPerfil } from './perfil';
import { iniciarSesion } from './sesion';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const PRACTICANTE = 'demo-practicante';
const OTRO_PRACTICANTE = 'usr-pra-04';
const FINALIZADO = 'usr-pra-19';
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

const editar = (p: PruebaPreparada, idActor: Id, cambios: Omit<EntradaEditarMiPerfil, 'idActor'>) =>
  editarMiPerfil({ idActor, ...cambios }, p.entorno);

const usuario = (p: PruebaPreparada, id: Id) => p.datos().usuarios.find((u) => u.id === id)!;
const practicante = (p: PruebaPreparada, id: Id) =>
  p.datos().practicantes.find((x) => x.id_usuario === id)!;
const supervisor = (p: PruebaPreparada, id: Id) =>
  p.datos().supervisores.find((x) => x.id_usuario === id)!;

describe('editarMiPerfil — Practicante', () => {
  it('edita todos sus datos en una sola escritura y deja solo los eventos de nombre y correo', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const persona = usuario(prueba, PRACTICANTE);
    const detalle = practicante(prueba, PRACTICANTE);
    const escrituras = prueba.escrituras();

    const r = await editar(prueba, PRACTICANTE, {
      nombre: '  Practicante Nuevo  ',
      correo: ' Nuevo.Correo@Codaini.demo ',
      celular: '912345678',
      discord: 'nuevo-discord',
      cuenta_github: 'nuevo-github',
      disponibilidad_horaria: 30,
    });

    expect(r).toEqual({
      ok: true,
      valor: {
        id: PRACTICANTE,
        nombre: 'Practicante Nuevo',
        correo: 'Nuevo.Correo@Codaini.demo',
        rol: 'PRACTICANTE',
        debe_cambiar_contrasena: false,
      },
    });
    expect(prueba.escrituras() - escrituras).toBe(1);
    expect(usuario(prueba, PRACTICANTE)).toEqual({
      ...persona,
      nombre: 'Practicante Nuevo',
      correo: 'Nuevo.Correo@Codaini.demo',
      celular: '912345678',
    });
    expect(practicante(prueba, PRACTICANTE)).toEqual({
      ...detalle,
      discord: 'nuevo-discord',
      cuenta_github: 'nuevo-github',
      disponibilidad_horaria: 30,
    });

    const despues = prueba.datos();
    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos).toHaveLength(2);
    expect(eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: PRACTICANTE },
      tipo_accion: 'CUENTA_NOMBRE_CAMBIADO',
      elemento: { tipo: 'USUARIO', id: PRACTICANTE, etiqueta: 'Practicante Nuevo' },
      id_proyecto: null,
      fecha: AHORA_ISO,
      cambios: [
        { campo: 'nombre', valor_anterior: persona.nombre, valor_nuevo: 'Practicante Nuevo' },
      ],
      nota: null,
    });
    expect(eventos[1]).toMatchObject({
      tipo_accion: 'CUENTA_CORREO_CAMBIADO',
      cambios: [
        {
          campo: 'correo',
          valor_anterior: persona.correo,
          valor_nuevo: 'Nuevo.Correo@Codaini.demo',
        },
      ],
    });
    // Celular, Discord, GitHub y disponibilidad no van al historial, y no hay avisos.
    expect(JSON.stringify(eventos)).not.toContain('912345678');
    expect(JSON.stringify(eventos)).not.toContain('nuevo-discord');
    expect(despues.notificaciones).toBe(antes.notificaciones);
    // No toca a nadie más.
    expect(despues.usuarios.filter((u) => u.id !== PRACTICANTE)).toEqual(
      antes.usuarios.filter((u) => u.id !== PRACTICANTE),
    );
    expect(despues.practicantes.filter((p) => p.id_usuario !== PRACTICANTE)).toEqual(
      antes.practicantes.filter((p) => p.id_usuario !== PRACTICANTE),
    );
  });

  it('solo el nombre: un evento de nombre y ninguno de correo', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos().historial.length;
    await editar(prueba, PRACTICANTE, { nombre: 'Otro Nombre' });
    const eventos = prueba.datos().historial.slice(antes);
    expect(eventos.map((e) => e.tipo_accion)).toEqual(['CUENTA_NOMBRE_CAMBIADO']);
  });

  it('solo el celular: cambia el dato y no deja evento', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const escrituras = prueba.escrituras();
    const r = await editar(prueba, PRACTICANTE, { celular: '911111111' });
    expect(r.ok).toBe(true);
    expect(usuario(prueba, PRACTICANTE).celular).toBe('911111111');
    expect(prueba.escrituras() - escrituras).toBe(1);
    expect(prueba.datos().historial).toBe(antes.historial);
    expect(prueba.datos().notificaciones).toBe(antes.notificaciones);
  });

  it('el cambio de correo cambia también el usuario de acceso', async () => {
    const prueba = prepararPrueba();
    await editar(prueba, PRACTICANTE, { correo: 'otro@codaini.demo' });
    expect(
      (
        await iniciarSesion(
          { correo: 'otro@codaini.demo', contrasena: 'demo12345' },
          prueba.entorno,
        )
      ).ok,
    ).toBe(true);
    expect(
      (
        await iniciarSesion(
          { correo: 'practicante@codaini.demo', contrasena: 'demo12345' },
          prueba.entorno,
        )
      ).ok,
    ).toBe(false);
  });

  it('Discord, GitHub y disponibilidad se pueden quitar (vacío o null)', async () => {
    const prueba = prepararPrueba();
    const r = await editar(prueba, PRACTICANTE, {
      discord: '   ',
      cuenta_github: null,
      disponibilidad_horaria: null,
    });
    expect(r.ok).toBe(true);
    expect(practicante(prueba, PRACTICANTE)).toMatchObject({
      discord: null,
      cuenta_github: null,
      disponibilidad_horaria: null,
    });
  });

  it('Discord de 32 caracteres y GitHub de 39 son el máximo', async () => {
    const prueba = prepararPrueba();
    const r = await editar(prueba, PRACTICANTE, {
      discord: 'd'.repeat(32),
      cuenta_github: 'g'.repeat(39),
    });
    expect(r.ok).toBe(true);
  });

  it.each([
    ['discord', 'con espacio', 'Discord no puede tener espacios.'],
    ['discord', 'd'.repeat(33), 'Discord admite hasta 32 caracteres.'],
    ['cuenta_github', 'otro nombre', 'GitHub no puede tener espacios.'],
    ['cuenta_github', 'g'.repeat(40), 'GitHub admite hasta 39 caracteres.'],
  ] as const)('%s inválido (%s) se rechaza sin escribir', async (campo, valor, mensaje) => {
    const prueba = prepararPrueba();
    const verificar = sinEscritura(prueba);
    const r = await editar(prueba, PRACTICANTE, { [campo]: valor });
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS', campos: { [campo]: mensaje } });
    verificar();
  });

  it.each([0, -3, 2.5, Number.NaN])('disponibilidad %s se rechaza', async (valor) => {
    const prueba = prepararPrueba();
    const verificar = sinEscritura(prueba);
    const r = await editar(prueba, PRACTICANTE, { disponibilidad_horaria: valor });
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(r.ok === false && r.campos?.disponibilidad_horaria).toBeDefined();
    verificar();
  });

  it('disponibilidad: un texto no es un número', async () => {
    const prueba = prepararPrueba();
    const r = await editar(prueba, PRACTICANTE, {
      disponibilidad_horaria: '8' as unknown as number,
    });
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
  });

  it('disponibilidad de 1 hora es válida', async () => {
    const prueba = prepararPrueba();
    expect((await editar(prueba, PRACTICANTE, { disponibilidad_horaria: 1 })).ok).toBe(true);
  });

  it.each(['', '   '])('el nombre vacío (%j) se rechaza', async (nombre) => {
    const prueba = prepararPrueba();
    const verificar = sinEscritura(prueba);
    const r = await editar(prueba, PRACTICANTE, { nombre });
    expect(r).toMatchObject({
      ok: false,
      codigo: 'DATOS_INVALIDOS',
      campos: { nombre: 'Escribe tu nombre.' },
    });
    verificar();
  });

  it('celular con formato inválido', async () => {
    const prueba = prepararPrueba();
    const verificar = sinEscritura(prueba);
    for (const celular of ['12345', '812345678', '91234567a', '9123456789', '']) {
      const r = await editar(prueba, PRACTICANTE, { celular });
      expect(r, celular).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    }
    verificar();
  });

  it('correo con formato inválido', async () => {
    const prueba = prepararPrueba();
    const verificar = sinEscritura(prueba);
    const r = await editar(prueba, PRACTICANTE, { correo: 'sin-arroba' });
    expect(r).toMatchObject({
      ok: false,
      codigo: 'DATOS_INVALIDOS',
      campos: { correo: 'Escribe un correo válido.' },
    });
    verificar();
  });

  it('el correo de otra cuenta se rechaza, sin distinguir mayúsculas ni espacios', async () => {
    const prueba = prepararPrueba();
    const verificar = sinEscritura(prueba);
    const ajeno = usuario(prueba, OTRO_PRACTICANTE).correo;
    for (const correo of [ajeno, ` ${ajeno.toUpperCase()} `, 'admin@codaini.demo']) {
      const r = await editar(prueba, PRACTICANTE, { correo });
      expect(r, correo).toEqual({
        ok: false,
        codigo: 'CORREO_YA_REGISTRADO',
        mensaje: 'Ya existe una cuenta con ese correo.',
        campos: { correo: 'Ya existe una cuenta con ese correo.' },
      });
    }
    verificar();
  });

  it('el correo de una cuenta finalizada también cuenta como repetido', async () => {
    const prueba = prepararPrueba();
    const r = await editar(prueba, PRACTICANTE, { correo: usuario(prueba, FINALIZADO).correo });
    expect(r).toMatchObject({ ok: false, codigo: 'CORREO_YA_REGISTRADO' });
  });

  it('escribir otra vez su propio correo (con otras mayúsculas) no es un duplicado', async () => {
    const prueba = prepararPrueba();
    const r = await editar(prueba, PRACTICANTE, { correo: 'PRACTICANTE@codaini.demo' });
    expect(r.ok).toBe(true);
  });

  it('los mismos valores que ya tiene: SIN_CAMBIOS y no escribe', async () => {
    const prueba = prepararPrueba();
    const persona = usuario(prueba, PRACTICANTE);
    const detalle = practicante(prueba, PRACTICANTE);
    const verificar = sinEscritura(prueba);
    const r = await editar(prueba, PRACTICANTE, {
      nombre: persona.nombre,
      correo: persona.correo,
      celular: persona.celular,
      discord: detalle.discord,
      cuenta_github: detalle.cuenta_github,
      disponibilidad_horaria: detalle.disponibilidad_horaria,
    });
    expect(r).toMatchObject({ ok: false, codigo: 'SIN_CAMBIOS' });
    verificar();
  });

  it('no enviar ningún dato es DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    const verificar = sinEscritura(prueba);
    const r = await editar(prueba, PRACTICANTE, {});
    expect(r).toMatchObject({
      ok: false,
      codigo: 'DATOS_INVALIDOS',
      campos: { _general: expect.any(String) },
    });
    verificar();
  });
});

describe('editarMiPerfil — Supervisor', () => {
  it('edita celular, Discord y GitHub, sin eventos', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const r = await editar(prueba, SUPERVISOR, {
      celular: '922222222',
      discord: 'sup-nuevo',
      cuenta_github: 'sup-gh',
    });
    expect(r.ok).toBe(true);
    expect(usuario(prueba, SUPERVISOR).celular).toBe('922222222');
    expect(supervisor(prueba, SUPERVISOR)).toEqual({
      id_usuario: SUPERVISOR,
      discord: 'sup-nuevo',
      cuenta_github: 'sup-gh',
    });
    expect(prueba.datos().historial).toBe(antes.historial);
    expect(prueba.datos().practicantes).toBe(antes.practicantes);
  });

  it('solo Discord: escribe solo la tabla de supervisores', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    await editar(prueba, SUPERVISOR, { discord: 'solo-discord' });
    expect(prueba.datos().usuarios).toBe(antes.usuarios);
    expect(prueba.datos().supervisores).not.toBe(antes.supervisores);
  });

  it.each([
    ['nombre', { nombre: 'Otro Nombre' }],
    ['correo', { correo: 'nuevo@codaini.demo' }],
    ['disponibilidad', { disponibilidad_horaria: 10 }],
  ] as const)('su %s es de solo lectura: se rechaza', async (_campo, cambios) => {
    const prueba = prepararPrueba();
    const verificar = sinEscritura(prueba);
    const r = await editar(prueba, SUPERVISOR, cambios);
    expect(r).toMatchObject({ ok: false, codigo: 'ROL_NO_PERMITIDO' });
    verificar();
  });

  it('un campo prohibido rechaza todo el cambio, aunque los demás sí sean suyos', async () => {
    const prueba = prepararPrueba();
    const verificar = sinEscritura(prueba);
    const r = await editar(prueba, SUPERVISOR, { celular: '933333333', nombre: 'Intruso' });
    expect(r).toMatchObject({ ok: false, codigo: 'ROL_NO_PERMITIDO' });
    verificar();
  });

  it('el permiso se comprueba antes que el correo repetido', async () => {
    const prueba = prepararPrueba();
    const r = await editar(prueba, SUPERVISOR, { correo: 'admin@codaini.demo' });
    expect(r).toMatchObject({ ok: false, codigo: 'ROL_NO_PERMITIDO' });
  });
});

describe('editarMiPerfil — Administrador', () => {
  it('edita nombre, correo y celular, con los dos eventos', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos().historial.length;
    const r = await editar(prueba, ADMIN, {
      nombre: 'Admin Nuevo',
      correo: 'admin.nuevo@codaini.demo',
      celular: '944444444',
    });
    expect(r.ok).toBe(true);
    expect(usuario(prueba, ADMIN)).toMatchObject({
      nombre: 'Admin Nuevo',
      correo: 'admin.nuevo@codaini.demo',
      celular: '944444444',
    });
    expect(
      prueba
        .datos()
        .historial.slice(antes)
        .map((e) => e.tipo_accion),
    ).toEqual(['CUENTA_NOMBRE_CAMBIADO', 'CUENTA_CORREO_CAMBIADO']);
  });

  it.each([
    ['Discord', { discord: 'admin-discord' }],
    ['GitHub', { cuenta_github: 'admin-gh' }],
    ['disponibilidad', { disponibilidad_horaria: 10 }],
  ] as const)('no tiene %s: se rechaza', async (_campo, cambios) => {
    const prueba = prepararPrueba();
    const verificar = sinEscritura(prueba);
    const r = await editar(prueba, ADMIN, cambios);
    expect(r).toMatchObject({ ok: false, codigo: 'ROL_NO_PERMITIDO' });
    verificar();
  });
});

describe('editarMiPerfil — actor', () => {
  it('un actor que no existe es NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    const verificar = sinEscritura(prueba);
    const r = await editar(prueba, 'usr-fantasma', { celular: '911111111' });
    expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    verificar();
  });

  it('un usuario INACTIVO no puede editar su perfil', async () => {
    const prueba = prepararPrueba();
    const verificar = sinEscritura(prueba);
    const r = await editar(prueba, FINALIZADO, { celular: '911111111' });
    expect(r).toMatchObject({ ok: false, codigo: 'USUARIO_INACTIVO' });
    verificar();
  });

  it('un idActor vacío es DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    const r = await editar(prueba, '', { celular: '911111111' });
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
  });
});

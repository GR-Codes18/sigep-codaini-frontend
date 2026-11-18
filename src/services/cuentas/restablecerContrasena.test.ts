import { describe, expect, it } from 'vitest';
import type { Id } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import { restablecerContrasena } from './restablecerContrasena';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const PRACTICANTE = 'demo-practicante';
const OTRO_PRACTICANTE = 'usr-pra-04';
const FINALIZADO = 'usr-pra-19';
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

const restablecer = (p: PruebaPreparada, idUsuario: Id, idActor: Id = ADMIN) =>
  restablecerContrasena({ idActor, idUsuario }, p.entorno);

const usuario = (p: PruebaPreparada, id: Id) => p.datos().usuarios.find((u) => u.id === id)!;

describe('restablecerContrasena', () => {
  it('a un practicante: nueva contraseña temporal, marcada para cambiarla, en una sola escritura', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const persona = usuario(prueba, PRACTICANTE);
    const escrituras = prueba.escrituras();

    const r = await restablecer(prueba, PRACTICANTE);

    expect(r).toEqual({
      ok: true,
      valor: { id_usuario: PRACTICANTE, contrasena_temporal: 'Clave-t001' },
    });
    expect(prueba.escrituras() - escrituras).toBe(1);
    expect(usuario(prueba, PRACTICANTE)).toEqual({
      ...persona,
      contrasena: 'Clave-t001',
      debe_cambiar_contrasena: true,
    });
    expect(usuario(prueba, PRACTICANTE).contrasena).not.toBe(persona.contrasena);

    // Un evento sin «cambios» (el historial rechaza cualquier campo de contraseña) y sin avisos.
    const despues = prueba.datos();
    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      tipo_accion: 'PRACTICANTE_CONTRASENA_RESTABLECIDA',
      elemento: { tipo: 'USUARIO', id: PRACTICANTE, etiqueta: persona.nombre },
      id_proyecto: null,
      fecha: AHORA_ISO,
      cambios: [],
      nota: null,
    });
    expect(despues.notificaciones).toBe(antes.notificaciones);
    // No toca a nadie más.
    expect(despues.usuarios.filter((u) => u.id !== PRACTICANTE)).toEqual(
      antes.usuarios.filter((u) => u.id !== PRACTICANTE),
    );
  });

  it('a un supervisor: deja el evento de supervisores', async () => {
    const prueba = prepararPrueba();
    const r = await restablecer(prueba, SUPERVISOR);
    expect(r.ok).toBe(true);
    expect(prueba.datos().historial.at(-1)).toMatchObject({
      tipo_accion: 'SUPERVISOR_CONTRASENA_RESTABLECIDA',
      elemento: { id: SUPERVISOR },
    });
    expect(usuario(prueba, SUPERVISOR).debe_cambiar_contrasena).toBe(true);
  });

  it('ni la contraseña nueva ni la anterior aparecen en el historial', async () => {
    const prueba = prepararPrueba();
    const anterior = usuario(prueba, PRACTICANTE).contrasena;
    const r = await restablecer(prueba, PRACTICANTE);
    if (!r.ok) throw new Error(r.mensaje);
    const historial = JSON.stringify(prueba.datos().historial);
    expect(historial).not.toContain(r.valor.contrasena_temporal);
    expect(historial).not.toContain(`"${anterior}"`);
  });

  it('cada restablecimiento da una contraseña distinta, y la anterior deja de valer', async () => {
    const prueba = prepararPrueba();
    const a = await restablecer(prueba, PRACTICANTE);
    const b = await restablecer(prueba, PRACTICANTE);
    if (!a.ok || !b.ok) throw new Error('No se restableció.');
    expect(a.valor.contrasena_temporal).not.toBe(b.valor.contrasena_temporal);
    expect(usuario(prueba, PRACTICANTE).contrasena).toBe(b.valor.contrasena_temporal);
  });

  it('usa el generador del entorno (mínimo de 8 caracteres)', async () => {
    const prueba = prepararPrueba();
    const r = await restablecer(prueba, OTRO_PRACTICANTE);
    expect(r.ok && r.valor.contrasena_temporal.length).toBeGreaterThanOrEqual(8);
  });

  it.each([
    ['Supervisor', SUPERVISOR],
    ['Practicante', PRACTICANTE],
  ])('%s → ROL_NO_PERMITIDO y no escribe nada', async (_rol, actor) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await restablecer(prueba, OTRO_PRACTICANTE, actor)).toMatchObject({
      ok: false,
      codigo: 'ROL_NO_PERMITIDO',
    });
    igual();
  });

  it('Administrador INACTIVO → USUARIO_INACTIVO; actor inexistente → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    expect(await restablecer(prueba, PRACTICANTE, 'nadie')).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    prueba.modificar((d) => ({
      usuarios: d.usuarios.map((u) => (u.id === ADMIN ? { ...u, estado: 'INACTIVO' as const } : u)),
    }));
    expect(await restablecer(prueba, PRACTICANTE)).toMatchObject({ codigo: 'USUARIO_INACTIVO' });
  });

  it('una persona que no existe → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await restablecer(prueba, 'usr-zz')).toMatchObject({
      ok: false,
      codigo: 'NO_ENCONTRADO',
    });
    igual();
  });

  it('al administrador no se le restablece desde aquí → FUERA_DE_ALCANCE', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await restablecer(prueba, ADMIN)).toMatchObject({
      ok: false,
      codigo: 'FUERA_DE_ALCANCE',
    });
    igual();
  });

  it('un practicante con la práctica finalizada → USUARIO_OBJETIVO_INACTIVO, con su mensaje', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await restablecer(prueba, FINALIZADO);
    expect(r).toMatchObject({ ok: false, codigo: 'USUARIO_OBJETIVO_INACTIVO' });
    expect(!r.ok && r.mensaje).toContain('reactívala');
    igual();
  });

  it('un supervisor inactivo → USUARIO_OBJETIVO_INACTIVO', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      usuarios: d.usuarios.map((u) =>
        u.id === SUPERVISOR ? { ...u, estado: 'INACTIVO' as const } : u,
      ),
    }));
    expect(await restablecer(prueba, SUPERVISOR)).toMatchObject({
      ok: false,
      codigo: 'USUARIO_OBJETIVO_INACTIVO',
    });
  });

  it('el permiso se comprueba antes que el estado de la persona', async () => {
    const prueba = prepararPrueba();
    expect(await restablecer(prueba, FINALIZADO, SUPERVISOR)).toMatchObject({
      codigo: 'ROL_NO_PERMITIDO',
    });
  });

  it('sin identificador de la persona → DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await restablecer(prueba, '');
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(r.ok ? {} : r.campos).toHaveProperty('idUsuario');
    igual();
  });
});

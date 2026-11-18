import { describe, expect, it } from 'vitest';
import type { Id } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import { cambiarMiContrasena } from './contrasenaPropia';
import { iniciarSesion } from './sesion';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const PRACTICANTE = 'demo-practicante';
const CON_TEMPORAL = 'usr-pra-24'; // tiene `debe_cambiar_contrasena`
const FINALIZADO = 'usr-pra-19';
const ACTUAL = 'demo12345';
const NUEVA = 'otra-clave-123';

const cambiar = (
  p: PruebaPreparada,
  idActor: Id,
  datos: Partial<{ contrasenaActual: string; contrasenaNueva: string; confirmacion: string }> = {},
) =>
  cambiarMiContrasena(
    {
      idActor,
      contrasenaActual: ACTUAL,
      contrasenaNueva: NUEVA,
      confirmacion: datos.contrasenaNueva ?? NUEVA,
      ...datos,
    },
    p.entorno,
  );

const usuario = (p: PruebaPreparada, id: Id) => p.datos().usuarios.find((u) => u.id === id)!;

describe('cambiarMiContrasena', () => {
  it.each([ADMIN, SUPERVISOR, PRACTICANTE])(
    '%s cambia su contraseña en una sola escritura',
    async (id) => {
      const prueba = prepararPrueba();
      const antes = prueba.datos();
      const escrituras = prueba.escrituras();

      const r = await cambiar(prueba, id);

      expect(r).toMatchObject({ ok: true, valor: { id, debe_cambiar_contrasena: false } });
      expect(JSON.stringify(r)).not.toContain(NUEVA);
      expect(prueba.escrituras() - escrituras).toBe(1);
      expect(usuario(prueba, id)).toEqual({
        ...usuario({ ...prueba, datos: () => antes } as PruebaPreparada, id),
        contrasena: NUEVA,
        debe_cambiar_contrasena: false,
      });
      // Nadie más cambia y no hay avisos.
      const despues = prueba.datos();
      expect(despues.usuarios.filter((u) => u.id !== id)).toEqual(
        antes.usuarios.filter((u) => u.id !== id),
      );
      expect(despues.notificaciones).toBe(antes.notificaciones);
    },
  );

  it('deja un evento sin «cambios» y ninguna contraseña en el historial', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos().historial.length;
    const persona = usuario(prueba, PRACTICANTE);
    await cambiar(prueba, PRACTICANTE);

    const eventos = prueba.datos().historial.slice(antes);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: PRACTICANTE },
      tipo_accion: 'CUENTA_CONTRASENA_CAMBIADA',
      elemento: { tipo: 'USUARIO', id: PRACTICANTE, etiqueta: persona.nombre },
      id_proyecto: null,
      fecha: AHORA_DE_PRUEBA.toISOString(),
      cambios: [],
      nota: null,
    });
    const historial = JSON.stringify(prueba.datos().historial);
    expect(historial).not.toContain(NUEVA);
    expect(historial).not.toContain(`"${ACTUAL}"`);
  });

  it('limpia la marca de contraseña temporal', async () => {
    const prueba = prepararPrueba();
    const persona = usuario(prueba, CON_TEMPORAL);
    expect(persona.debe_cambiar_contrasena).toBe(true);
    const r = await cambiar(prueba, CON_TEMPORAL, { contrasenaActual: persona.contrasena });
    expect(r).toMatchObject({ ok: true, valor: { debe_cambiar_contrasena: false } });
    expect(usuario(prueba, CON_TEMPORAL).debe_cambiar_contrasena).toBe(false);
  });

  it('después entra con la nueva y ya no con la anterior', async () => {
    const prueba = prepararPrueba();
    await cambiar(prueba, SUPERVISOR);
    const correo = 'supervisor@codaini.demo';
    expect((await iniciarSesion({ correo, contrasena: NUEVA }, prueba.entorno)).ok).toBe(true);
    expect((await iniciarSesion({ correo, contrasena: ACTUAL }, prueba.entorno)).ok).toBe(false);
  });

  it('la contraseña actual incorrecta se rechaza, con el error en su campo', async () => {
    const prueba = prepararPrueba();
    const verificar = sinEscritura(prueba);
    const r = await cambiar(prueba, PRACTICANTE, { contrasenaActual: 'incorrecta' });
    expect(r).toEqual({
      ok: false,
      codigo: 'CONTRASENA_ACTUAL_INCORRECTA',
      mensaje: 'La contraseña actual no es correcta.',
      campos: { contrasenaActual: 'La contraseña actual no es correcta.' },
    });
    verificar();
  });

  it('la nueva igual a la actual se rechaza', async () => {
    const prueba = prepararPrueba();
    const verificar = sinEscritura(prueba);
    const r = await cambiar(prueba, PRACTICANTE, { contrasenaNueva: ACTUAL });
    expect(r).toEqual({
      ok: false,
      codigo: 'CONTRASENA_IGUAL_A_LA_ACTUAL',
      mensaje: 'La contraseña nueva debe ser distinta de la actual.',
      campos: { contrasenaNueva: 'La contraseña nueva debe ser distinta de la actual.' },
    });
    verificar();
  });

  it('primero se comprueba la actual: con la actual mal, no se dice que la nueva se repite', async () => {
    const prueba = prepararPrueba();
    const r = await cambiar(prueba, PRACTICANTE, {
      contrasenaActual: 'mala',
      contrasenaNueva: ACTUAL,
    });
    expect(r).toMatchObject({ ok: false, codigo: 'CONTRASENA_ACTUAL_INCORRECTA' });
  });

  it('distingue mayúsculas: «DEMO12345» no es la contraseña actual', async () => {
    const prueba = prepararPrueba();
    const r = await cambiar(prueba, PRACTICANTE, { contrasenaNueva: 'DEMO12345' });
    expect(r.ok).toBe(true);
  });

  it('mínimo de 8 caracteres: 7 se rechaza y 8 se acepta', async () => {
    const prueba = prepararPrueba();
    const verificar = sinEscritura(prueba);
    const corta = await cambiar(prueba, PRACTICANTE, { contrasenaNueva: '1234567' });
    expect(corta).toMatchObject({
      ok: false,
      codigo: 'DATOS_INVALIDOS',
      campos: { contrasenaNueva: 'La contraseña nueva debe tener al menos 8 caracteres.' },
    });
    verificar();
    expect((await cambiar(prueba, PRACTICANTE, { contrasenaNueva: '12345678' })).ok).toBe(true);
  });

  it('las contraseñas no se recortan: ocho espacios son una contraseña válida', async () => {
    const prueba = prepararPrueba();
    const r = await cambiar(prueba, PRACTICANTE, { contrasenaNueva: '        ' });
    expect(r.ok).toBe(true);
    expect(usuario(prueba, PRACTICANTE).contrasena).toBe('        ');
  });

  it('la confirmación distinta se rechaza, con el error en su campo', async () => {
    const prueba = prepararPrueba();
    const verificar = sinEscritura(prueba);
    const r = await cambiar(prueba, PRACTICANTE, { confirmacion: 'no-coincide-123' });
    expect(r).toMatchObject({
      ok: false,
      codigo: 'DATOS_INVALIDOS',
      campos: { confirmacion: 'La confirmación no coincide con la contraseña nueva.' },
    });
    verificar();
  });

  it('la contraseña actual vacía se rechaza', async () => {
    const prueba = prepararPrueba();
    const r = await cambiar(prueba, PRACTICANTE, { contrasenaActual: '' });
    expect(r).toMatchObject({
      ok: false,
      codigo: 'DATOS_INVALIDOS',
      campos: { contrasenaActual: 'Escribe tu contraseña actual.' },
    });
  });

  it('un actor que no existe es NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    const verificar = sinEscritura(prueba);
    expect(await cambiar(prueba, 'usr-fantasma')).toMatchObject({
      ok: false,
      codigo: 'NO_ENCONTRADO',
    });
    verificar();
  });

  it('un usuario INACTIVO no puede cambiar su contraseña, ni con la actual correcta', async () => {
    const prueba = prepararPrueba();
    const actual = usuario(prueba, FINALIZADO).contrasena;
    const verificar = sinEscritura(prueba);
    const r = await cambiar(prueba, FINALIZADO, { contrasenaActual: actual });
    expect(r).toMatchObject({ ok: false, codigo: 'USUARIO_INACTIVO' });
    verificar();
  });
});

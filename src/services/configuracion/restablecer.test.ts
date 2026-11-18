import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearSemilla } from '@/data';
import type { Id } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import { restablecerDatosDemostracion } from './restablecer';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const PRACTICANTE = 'demo-practicante';

const restablecer = (p: PruebaPreparada, idActor: Id = ADMIN) =>
  restablecerDatosDemostracion({ idActor }, p.entorno);

/** Deja los datos muy distintos de la semilla, para comprobar que todo vuelve. */
function ensuciar(p: PruebaPreparada) {
  p.modificar((d) => ({
    usuarios: d.usuarios.map((u) =>
      u.id === ADMIN
        ? { ...u, nombre: 'Otro Nombre', correo: 'otro@codaini.demo', contrasena: 'cambiada-123' }
        : u,
    ),
    tareas: [],
    proyectos: d.proyectos.slice(0, 1),
    notificaciones: [],
    revisiones_insight: [],
    parametros: d.parametros.map((x) =>
      x.clave === 'PRACTICA_DURACION_MESES'
        ? { ...x, valor: { tipo: 'numero' as const, valor: 12 } }
        : x,
    ),
    historial: [
      ...d.historial,
      {
        id: 'evt-extra',
        fecha: AHORA_DE_PRUEBA.toISOString(),
        autor: { tipo: 'SISTEMA' as const },
        tipo_accion: 'CUENTA_NOMBRE_CAMBIADO' as const,
        elemento: { tipo: 'USUARIO' as const, id: ADMIN, etiqueta: 'x' },
        id_proyecto: null,
        cambios: [],
        nota: null,
      },
    ],
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('restablecerDatosDemostracion', () => {
  it('vuelve a la semilla: todas las colecciones, en una sola escritura', async () => {
    const prueba = prepararPrueba();
    ensuciar(prueba);
    const escrituras = prueba.escrituras();

    const r = await restablecer(prueba);

    expect(r.ok).toBe(true);
    expect(prueba.datos()).toEqual(crearSemilla(AHORA_DE_PRUEBA));
    expect(prueba.escrituras() - escrituras).toBe(1);
  });

  it('no deja evento de historial ni avisos: la base queda como la semilla', async () => {
    const prueba = prepararPrueba();
    ensuciar(prueba);
    await restablecer(prueba);
    const semilla = crearSemilla(AHORA_DE_PRUEBA);
    expect(prueba.datos().historial).toEqual(semilla.historial);
    expect(prueba.datos().notificaciones).toEqual(semilla.notificaciones);
    expect(prueba.datos().historial.some((e) => e.id === 'evt-extra')).toBe(false);
  });

  it('las fechas de la semilla nueva salen del reloj del entorno', async () => {
    const prueba = prepararPrueba();
    const despues = new Date(AHORA_DE_PRUEBA.getTime() + 10 * 86_400_000);
    prueba.fijarAhora(despues);
    await restablecer(prueba);
    expect(prueba.datos()).toEqual(crearSemilla(despues));
    expect(prueba.datos()).not.toEqual(crearSemilla(AHORA_DE_PRUEBA));
  });

  it('también restablece la Configuración cambiada', async () => {
    const prueba = prepararPrueba();
    ensuciar(prueba);
    await restablecer(prueba);
    expect(
      prueba.datos().parametros.find((p) => p.clave === 'PRACTICA_DURACION_MESES')!.valor,
    ).toEqual({
      tipo: 'numero',
      valor: 4,
    });
  });

  describe('la sesión activa', () => {
    it('devuelve al actor refrescado con los datos de la semilla nueva, sin la contraseña', async () => {
      const prueba = prepararPrueba();
      ensuciar(prueba);
      const r = await restablecer(prueba);
      expect(r).toEqual({
        ok: true,
        valor: {
          usuario: {
            id: ADMIN,
            nombre: 'Administrador Demo',
            correo: 'admin@codaini.demo',
            rol: 'ADMINISTRADOR',
            debe_cambiar_contrasena: false,
          },
        },
      });
      expect(JSON.stringify(r)).not.toContain('demo12345');
    });

    it('si el actor existe pero queda INACTIVO en la semilla nueva, devuelve null para cerrar la sesión', async () => {
      const prueba = prepararPrueba();
      // La semilla de la prueba siempre trae al administrador activo: se simula una que lo deje inactivo.
      const entorno = {
        ...prueba.entorno,
        almacen: {
          getState: () => ({
            ...prueba.almacen.getState(),
            restablecer: (ahora?: Date) => {
              prueba.almacen.getState().restablecer(ahora);
              prueba.modificar((d) => ({
                usuarios: d.usuarios.map((u) =>
                  u.id === ADMIN ? { ...u, estado: 'INACTIVO' as const } : u,
                ),
              }));
            },
          }),
        },
      };
      const r = await restablecerDatosDemostracion({ idActor: ADMIN }, entorno);
      expect(r).toEqual({ ok: true, valor: { usuario: null } });
    });

    it('si el actor ya no existe en la semilla nueva, devuelve null para cerrar la sesión', async () => {
      const prueba = prepararPrueba();
      prueba.modificar((d) => ({
        usuarios: [
          ...d.usuarios,
          {
            ...d.usuarios.find((u) => u.id === ADMIN)!,
            id: 'adm-extra',
            correo: 'extra@codaini.demo',
          },
        ],
      }));
      const r = await restablecer(prueba, 'adm-extra');
      expect(r).toEqual({ ok: true, valor: { usuario: null } });
      // Aun así se restableció todo.
      expect(prueba.datos()).toEqual(crearSemilla(AHORA_DE_PRUEBA));
      expect(prueba.datos().usuarios.some((u) => u.id === 'adm-extra')).toBe(false);
    });
  });

  describe('permisos y datos inválidos', () => {
    it.each([
      ['el Supervisor', SUPERVISOR],
      ['un Practicante', PRACTICANTE],
    ])('%s no puede: ROL_NO_PERMITIDO y no se toca nada', async (_n, actor) => {
      const prueba = prepararPrueba();
      ensuciar(prueba);
      const verificar = sinEscritura(prueba);
      const r = await restablecer(prueba, actor);
      expect(r).toMatchObject({ ok: false, codigo: 'ROL_NO_PERMITIDO' });
      verificar();
    });

    it('un Administrador INACTIVO no puede', async () => {
      const prueba = prepararPrueba();
      prueba.modificar((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === ADMIN ? { ...u, estado: 'INACTIVO' as const } : u,
        ),
      }));
      const verificar = sinEscritura(prueba);
      expect(await restablecer(prueba)).toMatchObject({ ok: false, codigo: 'USUARIO_INACTIVO' });
      verificar();
    });

    it('un actor que no existe es NO_ENCONTRADO', async () => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      expect(await restablecer(prueba, 'usr-fantasma')).toMatchObject({
        ok: false,
        codigo: 'NO_ENCONTRADO',
      });
      verificar();
    });

    it('un actor vacío es DATOS_INVALIDOS', async () => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      expect(await restablecer(prueba, '')).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
      verificar();
    });
  });

  describe('errores inesperados', () => {
    it('si no se puede crear la semilla: ERROR_INESPERADO y los datos siguen intactos', async () => {
      const prueba = prepararPrueba();
      ensuciar(prueba);
      vi.spyOn(console, 'error').mockImplementation(() => {});
      let llamadas = 0;
      // La primera llamada (la marca de la consulta) es válida; la segunda (la semilla nueva), no.
      const entorno = {
        ...prueba.entorno,
        ahora: () => (++llamadas === 1 ? AHORA_DE_PRUEBA : new Date(Number.NaN)),
      };
      const antes = prueba.datos();
      const r = await restablecerDatosDemostracion({ idActor: ADMIN }, entorno);
      expect(r).toMatchObject({ ok: false, codigo: 'ERROR_INESPERADO' });
      expect(prueba.datos()).toBe(antes);
    });

    it('un reloj inválido desde el principio: ERROR_INESPERADO y no se toca nada', async () => {
      const prueba = prepararPrueba();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const verificar = sinEscritura(prueba);
      const r = await restablecerDatosDemostracion(
        { idActor: ADMIN },
        { ...prueba.entorno, ahora: () => new Date(Number.NaN) },
      );
      expect(r).toMatchObject({ ok: false, codigo: 'ERROR_INESPERADO' });
      verificar();
    });
  });
});

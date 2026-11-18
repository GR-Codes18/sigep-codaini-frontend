import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepararPrueba, type PruebaPreparada } from '../pruebas/almacen';
import { accesoRapido, iniciarSesion } from './sesion';

const CLAVE = 'demo12345';
const FINALIZADO = 'usr-pra-19'; // práctica finalizada: usuario INACTIVO
const CORREO_FINALIZADO = 'marisol.cornejo@codaini.demo';

const entrar = (p: PruebaPreparada, correo: string, contrasena: string = CLAVE) =>
  iniciarSesion({ correo, contrasena }, p.entorno);

const CREDENCIALES_INVALIDAS = {
  ok: false,
  codigo: 'CREDENCIALES_INVALIDAS',
  mensaje: 'Correo o contraseña incorrectos',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('iniciarSesion', () => {
  it('entra con credenciales correctas y devuelve la sesión sin la contraseña', async () => {
    const prueba = prepararPrueba();
    const r = await entrar(prueba, 'admin@codaini.demo');
    expect(r).toEqual({
      ok: true,
      valor: {
        id: 'demo-admin',
        nombre: 'Administrador Demo',
        correo: 'admin@codaini.demo',
        rol: 'ADMINISTRADOR',
        debe_cambiar_contrasena: false,
      },
    });
    expect(JSON.stringify(r)).not.toContain(CLAVE);
  });

  it('lee las cuentas de data/: entra cada rol con su cuenta de la semilla', async () => {
    const prueba = prepararPrueba();
    const supervisor = await entrar(prueba, 'supervisor@codaini.demo');
    const practicante = await entrar(prueba, 'practicante@codaini.demo');
    const otroPracticante = await entrar(prueba, 'mateo.salazar@codaini.demo');
    expect(supervisor.ok && supervisor.valor.rol).toBe('SUPERVISOR');
    expect(practicante.ok && practicante.valor.rol).toBe('PRACTICANTE');
    expect(otroPracticante.ok && otroPracticante.valor.id).toBe('usr-pra-04');
  });

  it('ignora mayúsculas y espacios del correo escrito', async () => {
    const prueba = prepararPrueba();
    const r = await entrar(prueba, '  Admin@CODAINI.demo ');
    expect(r.ok).toBe(true);
  });

  it('ignora mayúsculas del correo guardado', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      usuarios: d.usuarios.map((u) =>
        u.id === 'demo-admin' ? { ...u, correo: 'Admin@Codaini.Demo' } : u,
      ),
    }));
    expect((await entrar(prueba, 'admin@codaini.demo')).ok).toBe(true);
  });

  it('la contraseña sí distingue mayúsculas', async () => {
    const prueba = prepararPrueba();
    expect(await entrar(prueba, 'admin@codaini.demo', 'DEMO12345')).toEqual(CREDENCIALES_INVALIDAS);
  });

  it('contraseña errónea y correo inexistente dan el mismo error, sin revelar cuál falló', async () => {
    const prueba = prepararPrueba();
    const mala = await entrar(prueba, 'admin@codaini.demo', 'otra-clave');
    const inexistente = await entrar(prueba, 'nadie@codaini.demo');
    expect(mala).toEqual(CREDENCIALES_INVALIDAS);
    expect(inexistente).toEqual(CREDENCIALES_INVALIDAS);
  });

  it('correo o contraseña vacíos (o solo espacios) no entran', async () => {
    const prueba = prepararPrueba();
    expect(await entrar(prueba, '', '')).toEqual(CREDENCIALES_INVALIDAS);
    expect(await entrar(prueba, '   ', CLAVE)).toEqual(CREDENCIALES_INVALIDAS);
    expect(await entrar(prueba, 'admin@codaini.demo', '')).toEqual(CREDENCIALES_INVALIDAS);
  });

  it('una entrada que no es texto es DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    const r = await iniciarSesion(
      { correo: 42, contrasena: null } as unknown as Parameters<typeof iniciarSesion>[0],
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
  });

  describe('cuentas INACTIVO', () => {
    it('un practicante con la práctica finalizada no entra, aunque la contraseña sea correcta', async () => {
      const prueba = prepararPrueba();
      const r = await entrar(prueba, CORREO_FINALIZADO);
      expect(r).toEqual({
        ok: false,
        codigo: 'USUARIO_INACTIVO',
        mensaje: 'Tu cuenta está inactiva. Consulta con el administrador.',
      });
    });

    it('un supervisor desactivado no entra', async () => {
      const prueba = prepararPrueba();
      prueba.modificar((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === 'demo-supervisor' ? { ...u, estado: 'INACTIVO' as const } : u,
        ),
      }));
      const r = await entrar(prueba, 'supervisor@codaini.demo');
      expect(r).toMatchObject({ ok: false, codigo: 'USUARIO_INACTIVO' });
    });

    it('con una contraseña falsa no se revela que la cuenta existe ni que está inactiva', async () => {
      const prueba = prepararPrueba();
      expect(await entrar(prueba, CORREO_FINALIZADO, 'otra-clave')).toEqual(CREDENCIALES_INVALIDAS);
    });

    it('al reactivar la cuenta vuelve a entrar', async () => {
      const prueba = prepararPrueba();
      prueba.modificar((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === FINALIZADO ? { ...u, estado: 'ACTIVO' as const } : u,
        ),
      }));
      expect((await entrar(prueba, CORREO_FINALIZADO)).ok).toBe(true);
    });
  });

  describe('efectos', () => {
    it('no registra el inicio de sesión ni escribe nada (§5.7)', async () => {
      const prueba = prepararPrueba();
      const antes = prueba.datos();
      const escrituras = prueba.escrituras();
      await entrar(prueba, 'admin@codaini.demo');
      await entrar(prueba, 'admin@codaini.demo', 'mala');
      expect(prueba.datos()).toBe(antes);
      expect(prueba.escrituras()).toBe(escrituras);
    });

    it('el acceso fallido no emite los avisos de fin de práctica', async () => {
      const prueba = prepararPrueba();
      // A la práctica demo le faltan exactamente 14 días (el aviso previo de la semilla).
      prueba.modificar((d) => ({
        practicantes: d.practicantes.map((p) =>
          p.id_usuario === 'demo-practicante' ? { ...p, fecha_fin_prevista: '2026-12-01' } : p,
        ),
      }));
      const antes = prueba.datos().notificaciones.length;
      await entrar(prueba, 'admin@codaini.demo', 'mala');
      await entrar(prueba, CORREO_FINALIZADO);
      expect(prueba.datos().notificaciones).toHaveLength(antes);
    });

    it('un acceso correcto emite los avisos de fin de práctica, una sola vez', async () => {
      const prueba = prepararPrueba();
      prueba.modificar((d) => ({
        practicantes: d.practicantes.map((p) =>
          p.id_usuario === 'demo-practicante' ? { ...p, fecha_fin_prevista: '2026-12-01' } : p,
        ),
      }));
      const antes = prueba.datos().notificaciones.length;

      await entrar(prueba, 'admin@codaini.demo');
      const nuevas = prueba.datos().notificaciones.slice(antes);
      expect(nuevas.length).toBeGreaterThan(0);
      expect(nuevas.every((n) => n.tipo === 'PRACTICA_PROXIMA_A_FINALIZAR')).toBe(true);
      expect(nuevas.map((n) => n.id_destinatario)).toContain('demo-practicante');

      // Otro acceso el mismo día no repite el aviso (el servicio es idempotente).
      await entrar(prueba, 'practicante@codaini.demo');
      expect(prueba.datos().notificaciones).toHaveLength(antes + nuevas.length);
    });

    it('si los avisos fallan, el acceso sigue adelante y queda un aviso en la consola', async () => {
      const prueba = prepararPrueba();
      const advertencia = vi.spyOn(console, 'warn').mockImplementation(() => {});
      prueba.modificar((d) => ({
        parametros: d.parametros.filter((p) => p.clave !== 'PRACTICA_AVISO_FIN_DIAS'),
      }));
      const r = await entrar(prueba, 'admin@codaini.demo');
      expect(r.ok).toBe(true);
      expect(advertencia).toHaveBeenCalled();
    });
  });
});

describe('accesoRapido', () => {
  it.each([
    ['ADMINISTRADOR', 'demo-admin'],
    ['SUPERVISOR', 'demo-supervisor'],
    ['PRACTICANTE', 'demo-practicante'],
  ] as const)('entra como %s con la cuenta de demostración', async (rol, id) => {
    const prueba = prepararPrueba();
    const r = await accesoRapido({ rol }, prueba.entorno);
    expect(r).toMatchObject({ ok: true, valor: { id, rol, debe_cambiar_contrasena: false } });
    expect(JSON.stringify(r)).not.toContain(CLAVE);
  });

  it('también respeta INACTIVO', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      usuarios: d.usuarios.map((u) =>
        u.id === 'demo-practicante' ? { ...u, estado: 'INACTIVO' as const } : u,
      ),
    }));
    const r = await accesoRapido({ rol: 'PRACTICANTE' }, prueba.entorno);
    expect(r).toMatchObject({ ok: false, codigo: 'USUARIO_INACTIVO' });
  });

  it('sin la cuenta de demostración en data/ responde NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({ usuarios: d.usuarios.filter((u) => u.id !== 'demo-admin') }));
    const r = await accesoRapido({ rol: 'ADMINISTRADOR' }, prueba.entorno);
    expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
  });

  it('un rol desconocido es DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    const r = await accesoRapido(
      { rol: 'SUPER' } as unknown as Parameters<typeof accesoRapido>[0],
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
  });

  it('un acceso rápido correcto también emite los avisos de fin de práctica', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      practicantes: d.practicantes.map((p) =>
        p.id_usuario === 'demo-practicante' ? { ...p, fecha_fin_prevista: '2026-12-01' } : p,
      ),
    }));
    const antes = prueba.datos().notificaciones.length;
    await accesoRapido({ rol: 'SUPERVISOR' }, prueba.entorno);
    expect(prueba.datos().notificaciones.length).toBeGreaterThan(antes);
  });
});

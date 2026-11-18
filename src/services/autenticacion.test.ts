import { describe, expect, it } from 'vitest';
import { crearEntornoDePrueba } from './pruebas/entorno';
import { autenticarUsuario, obtenerUsuarioDeAccesoRapido } from './autenticacion';

describe('autenticarUsuario', () => {
  it('autentica contra los usuarios de la semilla y devuelve solo el resumen de sesión', async () => {
    const { entorno, escrituras } = crearEntornoDePrueba();
    const escriturasAntes = escrituras();

    const resultado = await autenticarUsuario('  Admin@CODAINI.demo ', 'demo12345', entorno);

    expect(resultado).toEqual({
      ok: true,
      valor: {
        id: 'demo-admin',
        nombre: 'Administrador Demo',
        correo: 'admin@codaini.demo',
        rol: 'ADMINISTRADOR',
        debe_cambiar_contrasena: false,
      },
    });
    expect(resultado.ok && resultado.valor).not.toHaveProperty('contrasena');
    expect(escrituras()).toBe(escriturasAntes);
  });

  it('usa el mismo error para correo inexistente, contraseña incorrecta y cuenta inactiva', async () => {
    const { entorno, almacen } = crearEntornoDePrueba();
    almacen.getState().transaccion((datos) => ({
      usuarios: datos.usuarios.map((usuario) =>
        usuario.id === 'demo-practicante' ? { ...usuario, estado: 'INACTIVO' } : usuario,
      ),
    }));

    const inexistente = await autenticarUsuario('nadie@codaini.demo', 'demo12345', entorno);
    const contrasenaIncorrecta = await autenticarUsuario(
      'admin@codaini.demo',
      'incorrecta',
      entorno,
    );
    const inactiva = await autenticarUsuario('practicante@codaini.demo', 'demo12345', entorno);

    expect(inexistente).toEqual(contrasenaIncorrecta);
    expect(inactiva).toEqual(contrasenaIncorrecta);
    expect(contrasenaIncorrecta).toEqual({
      ok: false,
      codigo: 'CREDENCIALES_INVALIDAS',
      mensaje: 'Correo o contraseña incorrectos',
    });
  });
});

describe('obtenerUsuarioDeAccesoRapido', () => {
  it('obtiene el usuario por ID y confirma que su rol coincide', async () => {
    const { entorno } = crearEntornoDePrueba();

    await expect(
      obtenerUsuarioDeAccesoRapido('demo-supervisor', 'SUPERVISOR', entorno),
    ).resolves.toMatchObject({
      ok: true,
      valor: {
        id: 'demo-supervisor',
        rol: 'SUPERVISOR',
        correo: 'supervisor@codaini.demo',
      },
    });

    await expect(
      obtenerUsuarioDeAccesoRapido('demo-supervisor', 'ADMINISTRADOR', entorno),
    ).resolves.toMatchObject({
      ok: false,
      codigo: 'ACCESO_RAPIDO_NO_DISPONIBLE',
    });
  });

  it('devuelve un error explícito si falta la cuenta rápida o está inactiva', async () => {
    const { entorno, almacen } = crearEntornoDePrueba();
    almacen.getState().transaccion((datos) => ({
      usuarios: datos.usuarios.filter((usuario) => usuario.id !== 'demo-admin'),
    }));

    const faltante = await obtenerUsuarioDeAccesoRapido('demo-admin', 'ADMINISTRADOR', entorno);

    almacen.getState().transaccion((datos) => ({
      usuarios: datos.usuarios.map((usuario) =>
        usuario.id === 'demo-practicante' ? { ...usuario, estado: 'INACTIVO' } : usuario,
      ),
    }));
    const inactivo = await obtenerUsuarioDeAccesoRapido('demo-practicante', 'PRACTICANTE', entorno);

    expect(faltante).toMatchObject({ ok: false, codigo: 'ACCESO_RAPIDO_NO_DISPONIBLE' });
    expect(inactivo).toEqual(faltante);
  });
});

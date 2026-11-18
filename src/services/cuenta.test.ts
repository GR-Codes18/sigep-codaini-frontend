import { describe, expect, it } from 'vitest';
import { crearEntornoDePrueba } from './pruebas/entorno';
import { actualizarPerfil, cambiarContrasenaPropia, type DatosPerfilCuenta } from './cuenta';

function usuarioPorId(almacen: ReturnType<typeof crearEntornoDePrueba>['almacen'], id: string) {
  const usuario = almacen.getState().datos.usuarios.find((item) => item.id === id);
  if (!usuario) throw new Error(`Falta el usuario ${id} en la semilla.`);
  return usuario;
}

function perfilDe(
  almacen: ReturnType<typeof crearEntornoDePrueba>['almacen'],
  id: string,
): DatosPerfilCuenta {
  const datos = almacen.getState().datos;
  const usuario = usuarioPorId(almacen, id);
  const practicante = datos.practicantes.find((item) => item.id_usuario === id);
  const supervisor = datos.supervisores.find((item) => item.id_usuario === id);
  return {
    nombre: usuario.nombre,
    correo: usuario.correo,
    celular: usuario.celular,
    discord: practicante?.discord ?? supervisor?.discord ?? '',
    github: practicante?.cuenta_github ?? supervisor?.cuenta_github ?? '',
    disponibilidad: practicante?.disponibilidad_horaria ?? null,
  };
}

describe('actualizarPerfil', () => {
  it('actualiza los campos permitidos, normaliza el correo y registra cambios sin secretos', async () => {
    const { entorno, almacen, escrituras } = crearEntornoDePrueba();
    const antes = escrituras();
    const perfil = perfilDe(almacen, 'demo-practicante');

    const resultado = await actualizarPerfil(
      {
        idActor: 'demo-practicante',
        datos: {
          ...perfil,
          nombre: 'Practicante Actualizada',
          correo: 'NUEVO@CODAINI.DEMO',
          celular: '987654321',
          discord: 'nuevo-discord',
          github: 'nuevo-github',
          disponibilidad: 24,
        },
      },
      entorno,
    );

    expect(resultado).toMatchObject({
      ok: true,
      valor: {
        nombre: 'Practicante Actualizada',
        correo: 'nuevo@codaini.demo',
        celular: '987654321',
        discord: 'nuevo-discord',
        github: 'nuevo-github',
        disponibilidad: 24,
      },
    });
    expect(
      almacen.getState().datos.usuarios.find((item) => item.id === 'demo-practicante'),
    ).toMatchObject({
      nombre: 'Practicante Actualizada',
      correo: 'nuevo@codaini.demo',
      celular: '987654321',
    });
    expect(
      almacen
        .getState()
        .datos.historial.filter(
          (evento) =>
            evento.autor.tipo === 'USUARIO' && evento.autor.id_usuario === 'demo-practicante',
        )
        .slice(-2)
        .map((evento) => evento.tipo_accion),
    ).toEqual(['CUENTA_NOMBRE_CAMBIADO', 'CUENTA_CORREO_CAMBIADO']);
    expect(JSON.stringify(almacen.getState().datos.historial)).not.toContain('demo12345');
    expect(escrituras()).toBe(antes + 1);
  });

  it('rechaza correo duplicado y no escribe', async () => {
    const { entorno, almacen, escrituras } = crearEntornoDePrueba();
    const perfil = perfilDe(almacen, 'demo-practicante');
    const antes = escrituras();

    await expect(
      actualizarPerfil(
        {
          idActor: 'demo-practicante',
          datos: { ...perfil, correo: 'admin@codaini.demo' },
        },
        entorno,
      ),
    ).resolves.toMatchObject({
      ok: false,
      codigo: 'CORREO_YA_REGISTRADO',
      campos: { correo: expect.any(String) },
    });
    expect(escrituras()).toBe(antes);
  });

  it('aplica permisos del rol y bloquea la edición del nombre al Supervisor', async () => {
    const { entorno, almacen } = crearEntornoDePrueba();
    const perfil = perfilDe(almacen, 'demo-supervisor');

    await expect(
      actualizarPerfil(
        {
          idActor: 'demo-supervisor',
          datos: { ...perfil, nombre: 'Nombre no permitido' },
        },
        entorno,
      ),
    ).resolves.toMatchObject({ ok: false, codigo: 'ROL_NO_PERMITIDO' });
  });

  it('rechaza entradas inválidas y una cuenta inactiva', async () => {
    const { entorno, almacen, escrituras } = crearEntornoDePrueba();
    const perfil = perfilDe(almacen, 'demo-practicante');
    const antes = escrituras();

    await expect(
      actualizarPerfil(
        { idActor: 'demo-practicante', datos: { ...perfil, correo: 'no-es-correo' } },
        entorno,
      ),
    ).resolves.toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });

    almacen.getState().transaccion((datos) => ({
      usuarios: datos.usuarios.map((usuario) =>
        usuario.id === 'demo-practicante' ? { ...usuario, estado: 'INACTIVO' } : usuario,
      ),
    }));
    const despuesDeDesactivar = escrituras();
    await expect(
      actualizarPerfil({ idActor: 'demo-practicante', datos: perfil }, entorno),
    ).resolves.toMatchObject({ ok: false, codigo: 'USUARIO_INACTIVO' });
    expect(escrituras()).toBe(despuesDeDesactivar);
    expect(despuesDeDesactivar).toBe(antes + 1);
  });
});

describe('cambiarContrasenaPropia', () => {
  it('rechaza la contraseña actual incorrecta sin escribir', async () => {
    const { entorno, escrituras } = crearEntornoDePrueba();
    const antes = escrituras();

    await expect(
      cambiarContrasenaPropia(
        {
          idActor: 'demo-practicante',
          actual: 'incorrecta',
          nueva: 'nueva-clave-1',
          confirmacion: 'nueva-clave-1',
        },
        entorno,
      ),
    ).resolves.toMatchObject({ ok: false, codigo: 'CONTRASENA_ACTUAL_INVALIDA' });
    expect(escrituras()).toBe(antes);
  });

  it('actualiza la clave y quita la marca temporal sin registrar la contraseña', async () => {
    const { entorno, almacen } = crearEntornoDePrueba();
    const usuarioAntes = usuarioPorId(almacen, 'demo-practicante');
    almacen.getState().transaccion((datos) => ({
      usuarios: datos.usuarios.map((usuario) =>
        usuario.id === usuarioAntes.id ? { ...usuario, debe_cambiar_contrasena: true } : usuario,
      ),
    }));

    await expect(
      cambiarContrasenaPropia(
        {
          idActor: usuarioAntes.id,
          actual: usuarioAntes.contrasena,
          nueva: 'clave-nueva-123',
          confirmacion: 'clave-nueva-123',
        },
        entorno,
      ),
    ).resolves.toEqual({ ok: true, valor: undefined });

    const usuarioDespues = usuarioPorId(almacen, usuarioAntes.id);
    expect(usuarioDespues.contrasena).toBe('clave-nueva-123');
    expect(usuarioDespues.debe_cambiar_contrasena).toBe(false);
    const evento = almacen.getState().datos.historial.at(-1);
    expect(evento).toMatchObject({
      tipo_accion: 'CUENTA_CONTRASENA_CAMBIADA',
      cambios: [],
    });
    expect(JSON.stringify(evento)).not.toContain('clave-nueva-123');
    expect(evento).not.toHaveProperty('contrasena');
  });

  it('valida la longitud, confirmación y actividad de la cuenta', async () => {
    const { entorno, almacen, escrituras } = crearEntornoDePrueba();

    await expect(
      cambiarContrasenaPropia(
        {
          idActor: 'demo-practicante',
          actual: 'demo12345',
          nueva: 'corta',
          confirmacion: 'otra',
        },
        entorno,
      ),
    ).resolves.toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });

    almacen.getState().transaccion((datos) => ({
      usuarios: datos.usuarios.map((usuario) =>
        usuario.id === 'demo-practicante' ? { ...usuario, estado: 'INACTIVO' } : usuario,
      ),
    }));
    const antes = escrituras();
    await expect(
      cambiarContrasenaPropia(
        {
          idActor: 'demo-practicante',
          actual: 'demo12345',
          nueva: 'clave-nueva-123',
          confirmacion: 'clave-nueva-123',
        },
        entorno,
      ),
    ).resolves.toMatchObject({ ok: false, codigo: 'USUARIO_INACTIVO' });
    expect(escrituras()).toBe(antes);
  });
});

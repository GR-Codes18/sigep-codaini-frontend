import { z } from 'zod';
import type { CambiosAlmacen } from '@/data';
import { puede, type EventoHistorial, type Usuario } from '@/domain';
import { ENTORNO, type Entorno } from './entorno';
import { autorDe, cambio, crearEvento } from './historial';
import { obtenerActor } from './actor';
import { denegar, exito, fallo, validarEntrada, type Resultado } from './resultado';
import { conEfectos, ejecutarServicio } from './transaccional';

const esquemaId = z.string().trim().min(1);
const esquemaDatosPerfil = z.object({
  nombre: z.string().trim().min(1, 'Ingresa tu nombre'),
  correo: z
    .string()
    .trim()
    .pipe(z.email('Ingresa un correo válido'))
    .transform((correo) => correo.toLowerCase()),
  celular: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{7,15}$/, 'Ingresa un celular válido'),
  discord: z.string().trim(),
  github: z.string().trim(),
  disponibilidad: z.number().int().positive().nullable(),
});

const esquemaActualizarPerfil = z.object({
  idActor: esquemaId,
  datos: esquemaDatosPerfil,
});

const esquemaCambiarContrasena = z
  .object({
    idActor: esquemaId,
    actual: z.string().min(1, 'Ingresa tu contraseña actual'),
    nueva: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmacion: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .refine((entrada) => entrada.nueva === entrada.confirmacion, {
    path: ['confirmacion'],
    message: 'Las contraseñas no coinciden',
  })
  .refine((entrada) => entrada.nueva !== entrada.actual, {
    path: ['nueva'],
    message: 'Debe ser distinta de la actual',
  });

export type DatosPerfilCuenta = z.infer<typeof esquemaDatosPerfil>;
export type EntradaActualizarPerfil = z.input<typeof esquemaActualizarPerfil>;
export type EntradaCambiarContrasena = z.input<typeof esquemaCambiarContrasena>;

type CampoPerfil = keyof DatosPerfilCuenta;

function permisoParaCampo(actor: Usuario, campo: CampoPerfil) {
  const contexto = { usuario_objetivo: actor };
  switch (campo) {
    case 'nombre':
      return puede(actor, 'EDITAR_NOMBRE_PROPIO', contexto);
    case 'correo':
      return puede(actor, 'EDITAR_CORREO_PROPIO', contexto);
    case 'celular':
      return puede(actor, 'EDITAR_CELULAR_PROPIO', contexto);
    case 'discord':
      return puede(actor, 'EDITAR_DISCORD_PROPIO', contexto);
    case 'github':
      return puede(actor, 'EDITAR_GITHUB_PROPIO', contexto);
    case 'disponibilidad':
      return puede(actor, 'EDITAR_DISPONIBILIDAD_PROPIA', contexto);
  }
}

function permisoParaContrasena(actor: Usuario) {
  return puede(actor, 'CAMBIAR_CONTRASENA_PROPIA', { usuario_objetivo: actor });
}

function perfilDe(
  usuario: Usuario,
  discord: string | null,
  github: string | null,
  disponibilidad: number | null,
): DatosPerfilCuenta {
  return {
    nombre: usuario.nombre,
    correo: usuario.correo,
    celular: usuario.celular,
    discord: discord ?? '',
    github: github ?? '',
    disponibilidad,
  };
}

function permisoBasico(actor: Usuario): Resultado<true> {
  const permiso = puede(actor, 'EDITAR_CELULAR_PROPIO', { usuario_objetivo: actor });
  return permiso.permitido ? exito(true) : denegar(permiso);
}

function valorOpcional(valor: string): string | null {
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
}

export function actualizarPerfil(
  entrada: EntradaActualizarPerfil,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<DatosPerfilCuenta>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const validacion = validarEntrada(esquemaActualizarPerfil, entrada);
    if (!validacion.ok) return validacion;

    const resultadoActor = obtenerActor(datos, validacion.valor.idActor);
    if (!resultadoActor.ok) return resultadoActor;
    const actor = resultadoActor.valor;

    const basico = permisoBasico(actor);
    if (!basico.ok) return basico;

    const practicante = datos.practicantes.find((item) => item.id_usuario === actor.id);
    const supervisor = datos.supervisores.find((item) => item.id_usuario === actor.id);
    if (actor.rol === 'PRACTICANTE' && !practicante) {
      return fallo('NO_ENCONTRADO', 'No se encontraron los datos de tu práctica.');
    }
    if (actor.rol === 'SUPERVISOR' && !supervisor) {
      return fallo('NO_ENCONTRADO', 'No se encontraron los datos de tu cuenta de supervisor.');
    }

    const datosPerfil = validacion.valor.datos;
    if (actor.rol === 'PRACTICANTE' && datosPerfil.disponibilidad === null) {
      return fallo('DATOS_INVALIDOS', undefined, {
        disponibilidad: 'Debe ser un número entero mayor que 0.',
      });
    }

    const actuales = perfilDe(
      actor,
      practicante?.discord ?? supervisor?.discord ?? null,
      practicante?.cuenta_github ?? supervisor?.cuenta_github ?? null,
      practicante?.disponibilidad_horaria ?? null,
    );
    const campos: CampoPerfil[] = [
      'nombre',
      'correo',
      'celular',
      'discord',
      'github',
      'disponibilidad',
    ];
    for (const campo of campos) {
      if (actuales[campo] === datosPerfil[campo]) continue;
      const permiso = permisoParaCampo(actor, campo);
      if (!permiso.permitido) return denegar(permiso);
    }

    if (
      datosPerfil.correo !== actor.correo &&
      datos.usuarios.some(
        (usuario) => usuario.id !== actor.id && usuario.correo.toLowerCase() === datosPerfil.correo,
      )
    ) {
      return fallo('CORREO_YA_REGISTRADO', undefined, {
        correo: 'Este correo ya está asociado a otra cuenta.',
      });
    }

    if (campos.every((campo) => actuales[campo] === datosPerfil[campo])) {
      return fallo('SIN_CAMBIOS');
    }

    const usuarioActualizado: Usuario = {
      ...actor,
      nombre: datosPerfil.nombre,
      correo: datosPerfil.correo,
      celular: datosPerfil.celular,
    };
    const cambiosPerfil: CambiosAlmacen = {
      usuarios: datos.usuarios.map((usuario) =>
        usuario.id === actor.id ? usuarioActualizado : usuario,
      ),
    };

    if (actor.rol === 'PRACTICANTE' && practicante) {
      cambiosPerfil.practicantes = datos.practicantes.map((item) =>
        item.id_usuario === actor.id
          ? {
              ...item,
              discord: valorOpcional(datosPerfil.discord),
              cuenta_github: valorOpcional(datosPerfil.github),
              disponibilidad_horaria: datosPerfil.disponibilidad,
            }
          : item,
      );
    } else if (actor.rol === 'SUPERVISOR' && supervisor) {
      cambiosPerfil.supervisores = datos.supervisores.map((item) =>
        item.id_usuario === actor.id
          ? {
              ...item,
              discord: valorOpcional(datosPerfil.discord),
              cuenta_github: valorOpcional(datosPerfil.github),
            }
          : item,
      );
    }

    const eventos: EventoHistorial[] = [];
    if (actor.nombre !== usuarioActualizado.nombre) {
      eventos.push(
        crearEvento(
          {
            autor: autorDe(actor.id),
            tipo_accion: 'CUENTA_NOMBRE_CAMBIADO',
            elemento: { tipo: 'USUARIO', id: actor.id, etiqueta: usuarioActualizado.nombre },
            cambios: [cambio('nombre', actor.nombre, usuarioActualizado.nombre)],
          },
          marca,
          e.generarId,
        ),
      );
    }
    if (actor.correo !== usuarioActualizado.correo) {
      eventos.push(
        crearEvento(
          {
            autor: autorDe(actor.id),
            tipo_accion: 'CUENTA_CORREO_CAMBIADO',
            elemento: { tipo: 'USUARIO', id: actor.id, etiqueta: usuarioActualizado.nombre },
            cambios: [cambio('correo', actor.correo, usuarioActualizado.correo)],
          },
          marca,
          e.generarId,
        ),
      );
    }

    return {
      ok: true,
      valor: perfilDe(
        usuarioActualizado,
        valorOpcional(datosPerfil.discord),
        valorOpcional(datosPerfil.github),
        datosPerfil.disponibilidad,
      ),
      cambios: conEfectos(datos, cambiosPerfil, { eventos }),
    };
  });
}

export function cambiarContrasenaPropia(
  entrada: EntradaCambiarContrasena,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<void>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const validacion = validarEntrada(esquemaCambiarContrasena, entrada);
    if (!validacion.ok) return validacion;

    const resultadoActor = obtenerActor(datos, validacion.valor.idActor);
    if (!resultadoActor.ok) return resultadoActor;
    const actor = resultadoActor.valor;
    const permiso = permisoParaContrasena(actor);
    if (!permiso.permitido) return denegar(permiso);
    if (actor.contrasena !== validacion.valor.actual) {
      return fallo('CONTRASENA_ACTUAL_INVALIDA', undefined, {
        actual: 'La contraseña actual no es correcta.',
      });
    }

    const actualizado = {
      ...actor,
      contrasena: validacion.valor.nueva,
      debe_cambiar_contrasena: false,
    };
    const evento = crearEvento(
      {
        autor: autorDe(actor.id),
        tipo_accion: 'CUENTA_CONTRASENA_CAMBIADA',
        elemento: { tipo: 'USUARIO', id: actor.id, etiqueta: actualizado.nombre },
      },
      marca,
      e.generarId,
    );

    return {
      ok: true,
      valor: undefined,
      cambios: conEfectos(
        datos,
        {
          usuarios: datos.usuarios.map((usuario) =>
            usuario.id === actor.id ? actualizado : usuario,
          ),
        },
        { eventos: [evento] },
      ),
    };
  });
}

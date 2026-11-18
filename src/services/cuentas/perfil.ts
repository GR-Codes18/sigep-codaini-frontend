/**
 * Mi perfil: datos personales propios (Fase 2, paso 10A; propuesta §8.2 y §5.7).
 *
 * Qué puede editar cada rol lo decide `puede()` con una acción por campo (`EDITAR_*_PROPIO`): Practicante todo;
 * Supervisor celular, Discord y GitHub; Administrador nombre, correo y celular. Un campo que el rol no puede editar
 * se **rechaza** con el código del permiso (no se ignora en silencio).
 *
 *   - Correo: formato válido y único entre todas las cuentas (`correoEnUso`, sin distinguir mayúsculas ni espacios).
 *     Cambiar el correo cambia también el usuario de acceso, porque el acceso se hace con él.
 *   - Celular: nueve dígitos que empiezan con 9 (F7-A); no se puede quitar.
 *   - Discord y GitHub: sin espacios, hasta 32 y 39 caracteres; vacío (o `null`) quita el dato. La propuesta no fija
 *     más formato.
 *   - Disponibilidad: entero mayor que 0 (horas por semana); `null` quita el dato.
 *
 * Historial (§5.7): solo los cambios de **nombre** y de **correo**, uno por cada uno; celular, Discord, GitHub y
 * disponibilidad no dejan evento. Sin avisos. Orden: Zod → actor → permisos → correo único → una sola escritura.
 */

import { z } from 'zod';
import {
  puede,
  type AccionPermiso,
  type Practicante,
  type Supervisor,
  type Usuario,
} from '@/domain';
import { obtenerActor } from '../actor';
import { ENTORNO, type Entorno } from '../entorno';
import { etiquetaUsuario } from '../etiquetas';
import { autorDe, crearEvento, diferencias } from '../historial';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';
import { conEfectos, ejecutarServicio } from '../transaccional';
import { aSesionUsuario, type SesionUsuario } from './sesion';
import { correoEnUso, esquemaCelular, esquemaCorreo } from './validaciones';

const MAX_DISCORD = 32;
const MAX_GITHUB = 39;

/** Nombre de usuario de una plataforma: sin espacios y con largo máximo; vacío o `null` lo quita. */
const nombreDeUsuario = (plataforma: string, maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, `${plataforma} admite hasta ${maximo} caracteres.`)
    .regex(/^\S*$/, `${plataforma} no puede tener espacios.`)
    .transform((valor) => (valor === '' ? null : valor))
    .nullable();

const MENSAJE_DISPONIBILIDAD = 'La disponibilidad debe ser un número entero mayor que 0.';

const esquemaPerfil = z
  .object({
    idActor: esquemaId,
    nombre: z.string().trim().min(1, 'Escribe tu nombre.').optional(),
    correo: esquemaCorreo.optional(),
    celular: esquemaCelular.optional(),
    discord: nombreDeUsuario('Discord', MAX_DISCORD).optional(),
    cuenta_github: nombreDeUsuario('GitHub', MAX_GITHUB).optional(),
    disponibilidad_horaria: z
      .number(MENSAJE_DISPONIBILIDAD)
      .int(MENSAJE_DISPONIBILIDAD)
      .positive(MENSAJE_DISPONIBILIDAD)
      .nullable()
      .optional(),
  })
  .refine(
    (v) =>
      v.nombre !== undefined ||
      v.correo !== undefined ||
      v.celular !== undefined ||
      v.discord !== undefined ||
      v.cuenta_github !== undefined ||
      v.disponibilidad_horaria !== undefined,
    { message: 'Indica al menos un dato que quieras cambiar.' },
  );

export type EntradaEditarMiPerfil = z.input<typeof esquemaPerfil>;

const CORREO_REPETIDO = 'Ya existe una cuenta con ese correo.';

/** El permiso que exige cada campo, en el orden en que se comprueban. */
const PERMISO_POR_CAMPO = [
  ['nombre', 'EDITAR_NOMBRE_PROPIO'],
  ['correo', 'EDITAR_CORREO_PROPIO'],
  ['celular', 'EDITAR_CELULAR_PROPIO'],
  ['discord', 'EDITAR_DISCORD_PROPIO'],
  ['cuenta_github', 'EDITAR_GITHUB_PROPIO'],
  ['disponibilidad_horaria', 'EDITAR_DISPONIBILIDAD_PROPIA'],
] as const satisfies readonly (readonly [string, AccionPermiso])[];

export function editarMiPerfil(
  entrada: EntradaEditarMiPerfil,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<SesionUsuario>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaPerfil, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const actor = obtenerActor(datos, v.idActor);
    if (!actor.ok) return actor;
    const persona = actor.valor;

    for (const [campo, accion] of PERMISO_POR_CAMPO) {
      if (v[campo] === undefined) continue;
      const permiso = puede(persona, accion, { usuario_objetivo: persona });
      if (!permiso.permitido) return denegar(permiso);
    }

    if (v.correo !== undefined && correoEnUso(datos.usuarios, v.correo, persona.id)) {
      return fallo('CORREO_YA_REGISTRADO', CORREO_REPETIDO, { correo: CORREO_REPETIDO });
    }

    const nuevo: Usuario = {
      ...persona,
      nombre: v.nombre ?? persona.nombre,
      correo: v.correo ?? persona.correo,
      celular: v.celular ?? persona.celular,
    };

    // Discord, GitHub y disponibilidad viven en la tabla de detalle de cada rol.
    const practicante = datos.practicantes.find((p) => p.id_usuario === persona.id);
    const supervisor = datos.supervisores.find((s) => s.id_usuario === persona.id);
    const tocaDetalle =
      v.discord !== undefined ||
      v.cuenta_github !== undefined ||
      v.disponibilidad_horaria !== undefined;
    if (tocaDetalle && practicante === undefined && supervisor === undefined) {
      throw new Error(`La cuenta ${persona.id} no tiene el detalle de su rol.`);
    }
    const practicanteNuevo: Practicante | undefined =
      practicante === undefined
        ? undefined
        : {
            ...practicante,
            discord: v.discord === undefined ? practicante.discord : v.discord,
            cuenta_github:
              v.cuenta_github === undefined ? practicante.cuenta_github : v.cuenta_github,
            disponibilidad_horaria:
              v.disponibilidad_horaria === undefined
                ? practicante.disponibilidad_horaria
                : v.disponibilidad_horaria,
          };
    const supervisorNuevo: Supervisor | undefined =
      supervisor === undefined
        ? undefined
        : {
            ...supervisor,
            discord: v.discord === undefined ? supervisor.discord : v.discord,
            cuenta_github:
              v.cuenta_github === undefined ? supervisor.cuenta_github : v.cuenta_github,
          };

    const cambiaUsuario = diferencias(persona, nuevo, ['nombre', 'correo', 'celular']).length > 0;
    const cambiaPracticante =
      practicante !== undefined &&
      practicanteNuevo !== undefined &&
      diferencias(practicante, practicanteNuevo, [
        'discord',
        'cuenta_github',
        'disponibilidad_horaria',
      ]).length > 0;
    const cambiaSupervisor =
      supervisor !== undefined &&
      supervisorNuevo !== undefined &&
      diferencias(supervisor, supervisorNuevo, ['discord', 'cuenta_github']).length > 0;
    if (!cambiaUsuario && !cambiaPracticante && !cambiaSupervisor) return fallo('SIN_CAMBIOS');

    // Solo nombre y correo van al historial, un evento por cada uno.
    const elemento = { tipo: 'USUARIO', id: nuevo.id, etiqueta: etiquetaUsuario(nuevo) } as const;
    const evento = (
      tipo_accion: 'CUENTA_NOMBRE_CAMBIADO' | 'CUENTA_CORREO_CAMBIADO',
      campo: 'nombre' | 'correo',
    ) =>
      diferencias(persona, nuevo, [campo]).map((cambios) =>
        crearEvento(
          {
            autor: autorDe(persona.id),
            tipo_accion,
            elemento,
            id_proyecto: null,
            cambios: [cambios],
          },
          marca,
          e.generarId,
        ),
      );
    const eventos = [
      ...evento('CUENTA_NOMBRE_CAMBIADO', 'nombre'),
      ...evento('CUENTA_CORREO_CAMBIADO', 'correo'),
    ];

    return {
      ok: true,
      valor: aSesionUsuario(nuevo),
      cambios: conEfectos(
        datos,
        {
          ...(cambiaUsuario
            ? { usuarios: datos.usuarios.map((u) => (u.id === nuevo.id ? nuevo : u)) }
            : {}),
          ...(cambiaPracticante && practicanteNuevo !== undefined
            ? {
                practicantes: datos.practicantes.map((p) =>
                  p.id_usuario === nuevo.id ? practicanteNuevo : p,
                ),
              }
            : {}),
          ...(cambiaSupervisor && supervisorNuevo !== undefined
            ? {
                supervisores: datos.supervisores.map((s) =>
                  s.id_usuario === nuevo.id ? supervisorNuevo : s,
                ),
              }
            : {}),
        },
        { eventos },
      ),
    };
  });
}

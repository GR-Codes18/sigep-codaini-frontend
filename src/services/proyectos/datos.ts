/**
 * Crear un proyecto, editar sus datos y cambiar su rama base (Fase 2, paso 9A; propuesta §5.4 y §8.1).
 *
 * Crear (solo el Administrador): el código se valida con `validarCodigoProyecto` contra los códigos de **todos**
 * los proyectos (también los finalizados), tal como llega: no se recorta ni se pasa a mayúsculas (eso lo hace la
 * pantalla). Nace ACTIVO, sin equipo, con `ultimo_numero_tarea` en 0 y siempre con un supervisor activo. Avisa al
 * supervisor («Te asignaron como supervisor del proyecto…», §8.1).
 *
 * Editar datos (solo el Administrador, también en un proyecto FINALIZADO): nombre, descripción, fechas y
 * repositorio. **El código no cambia nunca**: si llega uno distinto, `CODIGO_INMUTABLE`. Un cambio de nombre,
 * descripción o fechas es `PROYECTO_EDITADO` y uno de repositorio, `PROYECTO_REPOSITORIO_CAMBIADO`, ambos con el
 * mismo instante. Las URL de Pull Request ya guardadas en las tareas no se tocan. No avisa a nadie.
 *
 * Rama base (Administrador y Supervisor del proyecto, también en FINALIZADO): `PROYECTO_RAMA_BASE_CAMBIADA`.
 */

import { z } from 'zod';
import { puede, validarCodigoProyecto, type DiaSemana, type Hora, type Proyecto } from '@/domain';
import { obtenerActor } from '../actor';
import { ENTORNO, type Entorno } from '../entorno';
import { autorDe, cambio, diferencias } from '../historial';
import { crearNotificaciones } from '../notificaciones';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';
import { conEfectos, ejecutarServicio } from '../transaccional';
import { cargarContextoProyecto, eventoDeProyecto, reemplazarProyecto } from './comun';
import {
  esquemaDescripcionProyecto,
  esquemaDiaReunion,
  esquemaFechaProyecto,
  esquemaHoraReunion,
  esquemaNombreProyecto,
  esquemaRamaBase,
  esquemaRepositorio,
  exigirReunionCompleta,
} from './esquemas';

const esquemaCrear = z
  .object({
    idActor: esquemaId,
    nombre: esquemaNombreProyecto,
    /** Tal como llega: `validarCodigoProyecto` no lo recorta ni lo pasa a mayúsculas. */
    codigo: z.string(),
    descripcion: esquemaDescripcionProyecto,
    fecha_inicio: esquemaFechaProyecto,
    fecha_fin_prevista: esquemaFechaProyecto,
    idSupervisor: esquemaId,
    repositorio_url: esquemaRepositorio,
    rama_base: esquemaRamaBase,
    dia_reunion: esquemaDiaReunion.nullish(),
    hora_reunion: esquemaHoraReunion.nullish(),
  })
  .superRefine(exigirReunionCompleta);

const esquemaEditar = z
  .object({
    idActor: esquemaId,
    idProyecto: esquemaId,
    /** Solo para rechazar un cambio: el código no se edita. */
    codigo: z.string().optional(),
    nombre: esquemaNombreProyecto.optional(),
    descripcion: esquemaDescripcionProyecto.optional(),
    fecha_inicio: esquemaFechaProyecto.optional(),
    fecha_fin_prevista: esquemaFechaProyecto.optional(),
    repositorio_url: esquemaRepositorio.optional(),
  })
  .refine(
    (v) =>
      v.nombre !== undefined ||
      v.descripcion !== undefined ||
      v.fecha_inicio !== undefined ||
      v.fecha_fin_prevista !== undefined ||
      v.repositorio_url !== undefined,
    { message: 'Indica al menos un dato del proyecto para cambiar.' },
  );

const esquemaRama = z.object({
  idActor: esquemaId,
  idProyecto: esquemaId,
  rama_base: esquemaRamaBase,
});

export type EntradaCrearProyecto = z.input<typeof esquemaCrear>;
export type EntradaEditarDatosProyecto = z.input<typeof esquemaEditar>;
export type EntradaCambiarRamaBase = z.input<typeof esquemaRama>;

const FIN_ANTES_DE_INICIO = { fecha_fin_prevista: 'No puede ser anterior a la fecha de inicio.' };

// ── Crear ────────────────────────────────────────────────────────────────────────────────────

export function crearProyecto(
  entrada: EntradaCrearProyecto,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Proyecto>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaCrear, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const actor = obtenerActor(datos, v.idActor);
    if (!actor.ok) return actor;
    const permiso = puede(actor.valor, 'CREAR_PROYECTO', {});
    if (!permiso.permitido) return denegar(permiso);

    // «Siempre con un supervisor activo» (§5.4).
    const supervisor = datos.usuarios.find((u) => u.id === v.idSupervisor);
    if (supervisor === undefined) {
      return fallo('NO_ENCONTRADO', undefined, { idSupervisor: 'No se encontró al supervisor.' });
    }
    if (supervisor.rol !== 'SUPERVISOR' || supervisor.estado !== 'ACTIVO') {
      return fallo('SUPERVISOR_NO_VALIDO', undefined, {
        idSupervisor: 'Elige a un supervisor activo.',
      });
    }

    // Formato y unicidad entre **todos** los proyectos, también los finalizados.
    const codigo = validarCodigoProyecto(
      v.codigo,
      datos.proyectos.map((p) => p.codigo),
    );
    if (!codigo.valido) return fallo(codigo.codigo, codigo.mensaje, { codigo: codigo.mensaje });

    // Las fechas `AAAA-MM-DD` se ordenan como texto.
    if (v.fecha_fin_prevista < v.fecha_inicio) {
      return fallo('FIN_ANTES_DE_INICIO', undefined, FIN_ANTES_DE_INICIO);
    }

    const proyecto: Proyecto = {
      id: e.generarId('pry'),
      nombre: v.nombre,
      codigo: v.codigo,
      descripcion: v.descripcion,
      fecha_inicio: v.fecha_inicio,
      fecha_fin_prevista: v.fecha_fin_prevista,
      fecha_fin_real: null,
      estado: 'ACTIVO',
      dia_reunion: (v.dia_reunion ?? null) as DiaSemana | null,
      hora_reunion: (v.hora_reunion ?? null) as Hora | null,
      repositorio_url: v.repositorio_url,
      rama_base: v.rama_base,
      id_supervisor: supervisor.id,
      ultimo_numero_tarea: 0,
    };
    const evento = eventoDeProyecto(
      {
        actor: actor.valor,
        proyecto,
        tipo_accion: 'PROYECTO_CREADO',
        cambios: [cambio('supervisor', null, supervisor.nombre)],
      },
      marca,
      e.generarId,
    );
    const avisos = crearNotificaciones(
      {
        autor: autorDe(actor.valor.id),
        destinatarios: [supervisor.id],
        tipo: 'ASIGNADO_A_PROYECTO',
        mensaje: `Te asignaron como supervisor del proyecto ${proyecto.nombre}.`,
        elemento: { tipo: 'PROYECTO', id: proyecto.id },
      },
      datos.usuarios,
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: proyecto,
      cambios: conEfectos(
        datos,
        { proyectos: [...datos.proyectos, proyecto] },
        { eventos: [evento], notificaciones: avisos },
      ),
    };
  });
}

// ── Editar datos ─────────────────────────────────────────────────────────────────────────────

const CAMPOS_EDITADOS = ['nombre', 'descripcion', 'fecha_inicio', 'fecha_fin_prevista'] as const;

export function editarDatosProyecto(
  entrada: EntradaEditarDatosProyecto,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Proyecto>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaEditar, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const contexto = cargarContextoProyecto(datos, v.idActor, v.idProyecto);
    if (!contexto.ok) return contexto;
    const { actor, proyecto } = contexto.valor;

    // Solo el Administrador; vale también con el proyecto FINALIZADO.
    const permiso = puede(actor, 'EDITAR_DATOS_PROYECTO', { proyecto });
    if (!permiso.permitido) return denegar(permiso);

    if (v.codigo !== undefined && v.codigo !== proyecto.codigo) {
      return fallo('CODIGO_INMUTABLE', undefined, { codigo: 'El código no se puede cambiar.' });
    }

    const nuevo: Proyecto = {
      ...proyecto,
      nombre: v.nombre ?? proyecto.nombre,
      descripcion: v.descripcion ?? proyecto.descripcion,
      fecha_inicio: v.fecha_inicio ?? proyecto.fecha_inicio,
      fecha_fin_prevista: v.fecha_fin_prevista ?? proyecto.fecha_fin_prevista,
      repositorio_url: v.repositorio_url ?? proyecto.repositorio_url,
    };
    // Con los valores que quedarían, también si solo cambia una de las dos fechas.
    if (nuevo.fecha_fin_prevista < nuevo.fecha_inicio) {
      return fallo('FIN_ANTES_DE_INICIO', undefined, FIN_ANTES_DE_INICIO);
    }

    const cambiosDatos = diferencias(proyecto, nuevo, CAMPOS_EDITADOS);
    const cambiaRepositorio = nuevo.repositorio_url !== proyecto.repositorio_url;
    if (cambiosDatos.length === 0 && !cambiaRepositorio) return fallo('SIN_CAMBIOS');

    const eventos = [
      ...(cambiosDatos.length > 0
        ? [
            eventoDeProyecto(
              { actor, proyecto: nuevo, tipo_accion: 'PROYECTO_EDITADO', cambios: cambiosDatos },
              marca,
              e.generarId,
            ),
          ]
        : []),
      ...(cambiaRepositorio
        ? [
            eventoDeProyecto(
              {
                actor,
                proyecto: nuevo,
                tipo_accion: 'PROYECTO_REPOSITORIO_CAMBIADO',
                cambios: [
                  cambio('repositorio_url', proyecto.repositorio_url, nuevo.repositorio_url),
                ],
              },
              marca,
              e.generarId,
            ),
          ]
        : []),
    ];
    return {
      ok: true,
      valor: nuevo,
      cambios: conEfectos(
        datos,
        { proyectos: reemplazarProyecto(datos.proyectos, nuevo) },
        { eventos },
      ),
    };
  });
}

// ── Rama base ────────────────────────────────────────────────────────────────────────────────

export function cambiarRamaBase(
  entrada: EntradaCambiarRamaBase,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Proyecto>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaRama, entrada);
    if (!valida.ok) return valida;
    const contexto = cargarContextoProyecto(datos, valida.valor.idActor, valida.valor.idProyecto);
    if (!contexto.ok) return contexto;
    const { actor, proyecto } = contexto.valor;

    // Administrador o Supervisor del proyecto; vale también con el proyecto FINALIZADO.
    const permiso = puede(actor, 'CAMBIAR_RAMA_BASE', { proyecto });
    if (!permiso.permitido) return denegar(permiso);
    if (valida.valor.rama_base === proyecto.rama_base) return fallo('SIN_CAMBIOS');

    const nuevo: Proyecto = { ...proyecto, rama_base: valida.valor.rama_base };
    const evento = eventoDeProyecto(
      {
        actor,
        proyecto: nuevo,
        tipo_accion: 'PROYECTO_RAMA_BASE_CAMBIADA',
        cambios: [cambio('rama_base', proyecto.rama_base, nuevo.rama_base)],
      },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: nuevo,
      cambios: conEfectos(
        datos,
        { proyectos: reemplazarProyecto(datos.proyectos, nuevo) },
        { eventos: [evento] },
      ),
    };
  });
}

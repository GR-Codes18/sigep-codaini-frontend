/**
 * Servicios de las especialidades (Fase 2, paso 7B): crear, editar y activar o desactivar.
 *
 * Igual que las áreas: nace **inactiva** (C2-B) y solo se activa con un bloque de criterios activos
 * válido; desactivar es libre y sin cascadas. La especialidad pertenece a su área para siempre: editar
 * solo cambia el nombre (la entrada es estricta y rechaza cualquier otro campo, como un cambio de área).
 */

import { z } from 'zod';
import { validarBloqueCriterios, type Especialidad } from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { cambio } from '../historial';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';
import { conEfectos, ejecutarServicio } from '../transaccional';
import {
  autorizarGestion,
  bloqueDeEspecialidad,
  esquemaNombre,
  eventoDeCatalogo,
  normalizarNombre,
} from './comun';

const esquemaCrear = z.object({
  idActor: esquemaId,
  idAreaTecnica: esquemaId,
  nombre: esquemaNombre,
});
const esquemaEditar = z.strictObject({
  idActor: esquemaId,
  idEspecialidad: esquemaId,
  nombre: esquemaNombre,
});
const esquemaActivo = z.object({
  idActor: esquemaId,
  idEspecialidad: esquemaId,
  activo: z.boolean(),
});

export type EntradaCrearEspecialidad = z.input<typeof esquemaCrear>;
export type EntradaEditarEspecialidad = z.input<typeof esquemaEditar>;
export type EntradaCambiarActivoEspecialidad = z.input<typeof esquemaActivo>;

const NOMBRE_REPETIDO = 'Ya existe una especialidad con ese nombre en esta área.';

function elemento(especialidad: Pick<Especialidad, 'id' | 'nombre'>) {
  return { tipo: 'ESPECIALIDAD', id: especialidad.id, etiqueta: especialidad.nombre } as const;
}

export function crearEspecialidad(
  entrada: EntradaCrearEspecialidad,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Especialidad>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaCrear, entrada);
    if (!valida.ok) return valida;
    const actor = autorizarGestion(datos, valida.valor.idActor);
    if (!actor.ok) return actor;

    const area = datos.areas_tecnicas.find((a) => a.id === valida.valor.idAreaTecnica);
    if (area === undefined) return fallo('NO_ENCONTRADO');
    const nombre = valida.valor.nombre;
    if (
      datos.especialidades.some(
        (x) =>
          x.id_area_tecnica === area.id && normalizarNombre(x.nombre) === normalizarNombre(nombre),
      )
    ) {
      return fallo('NOMBRE_DUPLICADO', NOMBRE_REPETIDO);
    }

    const especialidad: Especialidad = {
      id: e.generarId('esp'),
      id_area_tecnica: area.id,
      nombre,
      activo: false,
    };
    const evento = eventoDeCatalogo(
      {
        actor: actor.valor,
        tipo_accion: 'ESPECIALIDAD_CREADA',
        elemento: elemento(especialidad),
        cambios: [
          cambio('nombre', null, especialidad.nombre),
          cambio('activo', null, especialidad.activo),
        ],
      },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: especialidad,
      cambios: conEfectos(
        datos,
        { especialidades: [...datos.especialidades, especialidad] },
        { eventos: [evento] },
      ),
    };
  });
}

export function editarEspecialidad(
  entrada: EntradaEditarEspecialidad,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Especialidad>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaEditar, entrada);
    if (!valida.ok) return valida;
    const actor = autorizarGestion(datos, valida.valor.idActor);
    if (!actor.ok) return actor;

    const especialidad = datos.especialidades.find((x) => x.id === valida.valor.idEspecialidad);
    if (especialidad === undefined) return fallo('NO_ENCONTRADO');
    const nombre = valida.valor.nombre;
    if (
      datos.especialidades.some(
        (x) =>
          x.id !== especialidad.id &&
          x.id_area_tecnica === especialidad.id_area_tecnica &&
          normalizarNombre(x.nombre) === normalizarNombre(nombre),
      )
    ) {
      return fallo('NOMBRE_DUPLICADO', NOMBRE_REPETIDO);
    }
    if (nombre === especialidad.nombre) return fallo('SIN_CAMBIOS');

    const nueva: Especialidad = { ...especialidad, nombre };
    const evento = eventoDeCatalogo(
      {
        actor: actor.valor,
        tipo_accion: 'ESPECIALIDAD_EDITADA',
        elemento: elemento(nueva),
        cambios: [cambio('nombre', especialidad.nombre, nueva.nombre)],
      },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: nueva,
      cambios: conEfectos(
        datos,
        {
          especialidades: datos.especialidades.map((x) => (x.id === especialidad.id ? nueva : x)),
        },
        { eventos: [evento] },
      ),
    };
  });
}

export function cambiarActivoEspecialidad(
  entrada: EntradaCambiarActivoEspecialidad,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Especialidad>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaActivo, entrada);
    if (!valida.ok) return valida;
    const actor = autorizarGestion(datos, valida.valor.idActor);
    if (!actor.ok) return actor;

    const especialidad = datos.especialidades.find((x) => x.id === valida.valor.idEspecialidad);
    if (especialidad === undefined) return fallo('NO_ENCONTRADO');
    const activo = valida.valor.activo;
    if (especialidad.activo === activo) return fallo('SIN_CAMBIOS');

    // Solo se activa una especialidad cuyo bloque ya permite calcular el puntaje (C2-B).
    if (activo) {
      const bloque = validarBloqueCriterios(
        bloqueDeEspecialidad(datos.criterios, especialidad.id),
        'ESPECIALIDAD',
      );
      if (!bloque.ok) return denegar(bloque);
    }

    const nueva: Especialidad = { ...especialidad, activo };
    const evento = eventoDeCatalogo(
      {
        actor: actor.valor,
        tipo_accion: activo ? 'ESPECIALIDAD_ACTIVADA' : 'ESPECIALIDAD_DESACTIVADA',
        elemento: elemento(nueva),
        cambios: [cambio('activo', especialidad.activo, activo)],
      },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: nueva,
      cambios: conEfectos(
        datos,
        {
          especialidades: datos.especialidades.map((x) => (x.id === especialidad.id ? nueva : x)),
        },
        { eventos: [evento] },
      ),
    };
  });
}

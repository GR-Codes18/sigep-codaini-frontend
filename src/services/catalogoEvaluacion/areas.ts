/**
 * Servicios de las áreas técnicas (Fase 2, paso 7B): crear, editar y activar o desactivar.
 *
 * Un área nueva nace **inactiva** (C2-B) y solo se activa cuando su bloque general de criterios activos es
 * válido. Desactivarla es libre y no desactiva sus especialidades ni sus criterios. No se borra.
 */

import { z } from 'zod';
import { validarBloqueCriterios, type AreaTecnica } from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { cambio } from '../historial';
import { conEfectos, ejecutarServicio } from '../transaccional';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';
import {
  autorizarGestion,
  bloqueDeArea,
  esquemaNombre,
  eventoDeCatalogo,
  normalizarNombre,
} from './comun';

const esquemaCrear = z.object({ idActor: esquemaId, nombre: esquemaNombre });
const esquemaEditar = z.object({
  idActor: esquemaId,
  idAreaTecnica: esquemaId,
  nombre: esquemaNombre,
});
const esquemaActivo = z.object({
  idActor: esquemaId,
  idAreaTecnica: esquemaId,
  activo: z.boolean(),
});

export type EntradaCrearAreaTecnica = z.input<typeof esquemaCrear>;
export type EntradaEditarAreaTecnica = z.input<typeof esquemaEditar>;
export type EntradaCambiarActivoAreaTecnica = z.input<typeof esquemaActivo>;

const NOMBRE_REPETIDO = 'Ya existe un área técnica con ese nombre.';

function elemento(area: Pick<AreaTecnica, 'id' | 'nombre'>) {
  return { tipo: 'AREA_TECNICA', id: area.id, etiqueta: area.nombre } as const;
}

export function crearAreaTecnica(
  entrada: EntradaCrearAreaTecnica,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<AreaTecnica>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaCrear, entrada);
    if (!valida.ok) return valida;
    const actor = autorizarGestion(datos, valida.valor.idActor);
    if (!actor.ok) return actor;

    const nombre = valida.valor.nombre;
    if (datos.areas_tecnicas.some((a) => normalizarNombre(a.nombre) === normalizarNombre(nombre))) {
      return fallo('NOMBRE_DUPLICADO', NOMBRE_REPETIDO);
    }

    const area: AreaTecnica = { id: e.generarId('area'), nombre, activo: false };
    const evento = eventoDeCatalogo(
      {
        actor: actor.valor,
        tipo_accion: 'AREA_TECNICA_CREADA',
        elemento: elemento(area),
        cambios: [cambio('nombre', null, area.nombre), cambio('activo', null, area.activo)],
      },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: area,
      cambios: conEfectos(
        datos,
        { areas_tecnicas: [...datos.areas_tecnicas, area] },
        { eventos: [evento] },
      ),
    };
  });
}

export function editarAreaTecnica(
  entrada: EntradaEditarAreaTecnica,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<AreaTecnica>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaEditar, entrada);
    if (!valida.ok) return valida;
    const actor = autorizarGestion(datos, valida.valor.idActor);
    if (!actor.ok) return actor;

    const area = datos.areas_tecnicas.find((a) => a.id === valida.valor.idAreaTecnica);
    if (area === undefined) return fallo('NO_ENCONTRADO');

    const nombre = valida.valor.nombre;
    if (
      datos.areas_tecnicas.some(
        (a) => a.id !== area.id && normalizarNombre(a.nombre) === normalizarNombre(nombre),
      )
    ) {
      return fallo('NOMBRE_DUPLICADO', NOMBRE_REPETIDO);
    }
    if (nombre === area.nombre) return fallo('SIN_CAMBIOS');

    const nueva: AreaTecnica = { ...area, nombre };
    const evento = eventoDeCatalogo(
      {
        actor: actor.valor,
        tipo_accion: 'AREA_TECNICA_EDITADA',
        elemento: elemento(nueva),
        cambios: [cambio('nombre', area.nombre, nueva.nombre)],
      },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: nueva,
      cambios: conEfectos(
        datos,
        { areas_tecnicas: datos.areas_tecnicas.map((a) => (a.id === area.id ? nueva : a)) },
        { eventos: [evento] },
      ),
    };
  });
}

export function cambiarActivoAreaTecnica(
  entrada: EntradaCambiarActivoAreaTecnica,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<AreaTecnica>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaActivo, entrada);
    if (!valida.ok) return valida;
    const actor = autorizarGestion(datos, valida.valor.idActor);
    if (!actor.ok) return actor;

    const area = datos.areas_tecnicas.find((a) => a.id === valida.valor.idAreaTecnica);
    if (area === undefined) return fallo('NO_ENCONTRADO');
    const activo = valida.valor.activo;
    if (area.activo === activo) return fallo('SIN_CAMBIOS');

    // Solo se activa un área cuyo bloque general ya permite calcular el puntaje (C2-B).
    if (activo) {
      const bloque = validarBloqueCriterios(bloqueDeArea(datos.criterios, area.id), 'AREA');
      if (!bloque.ok) return denegar(bloque);
    }

    const nueva: AreaTecnica = { ...area, activo };
    const evento = eventoDeCatalogo(
      {
        actor: actor.valor,
        tipo_accion: activo ? 'AREA_TECNICA_ACTIVADA' : 'AREA_TECNICA_DESACTIVADA',
        elemento: elemento(nueva),
        cambios: [cambio('activo', area.activo, activo)],
      },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: nueva,
      cambios: conEfectos(
        datos,
        { areas_tecnicas: datos.areas_tecnicas.map((a) => (a.id === area.id ? nueva : a)) },
        { eventos: [evento] },
      ),
    };
  });
}

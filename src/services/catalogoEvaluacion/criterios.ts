/**
 * Servicio de los criterios de evaluación (Fase 2, paso 7B; decisión C1-B).
 *
 * `guardarCriteriosDeBloque` recibe el **estado completo** de un bloque (el general de un área o el de una
 * especialidad) y lo guarda en una sola operación atómica: crea los criterios sin `id`, edita los demás y
 * activa o desactiva. Así se puede repartir 30/70 → 40/60 sin pasar por una suma distinta de 100: la regla
 * se comprueba una sola vez, al final, con `validarBloqueCriterios`.
 *
 * Reglas:
 *   - nada se borra: la lista debe traer **todos** los criterios del bloque (`CRITERIOS_INCOMPLETOS`);
 *   - los criterios activos suman 100 con pesos enteros mayores que 0; un bloque sin criterios activos solo
 *     se admite si su especialidad (o su área) está inactiva (C2-B);
 *   - los nombres son únicos dentro del bloque, sin distinguir mayúsculas ni espacios;
 *   - un evento por cada cambio: `CRITERIO_CREADO`, `CRITERIO_EDITADO` (nombre, tipo, peso, obligatorio) y
 *     `CRITERIO_ACTIVADO` o `CRITERIO_DESACTIVADO`, todos con el mismo instante;
 *   - las evaluaciones ya hechas no se tocan (cada una guarda su copia del criterio).
 */

import { z } from 'zod';
import {
  TIPOS_CRITERIO,
  validarBloqueCriterios,
  type CriterioEvaluacion,
  type EventoHistorial,
  type Id,
} from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { cambio, diferencias } from '../historial';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';
import { conEfectos, ejecutarServicio } from '../transaccional';
import {
  autorizarGestion,
  bloqueDeArea,
  bloqueDeEspecialidad,
  esquemaNombre,
  eventoDeCatalogo,
  normalizarNombre,
} from './comun';

const esquemaCriterio = z.object({
  /** Sin `id` = criterio nuevo. */
  id: esquemaId.optional(),
  nombre: esquemaNombre,
  tipo: z.enum(TIPOS_CRITERIO),
  /** Que sea entero mayor que 0 lo decide `domain/` (`PESO_INVALIDO`) para los criterios activos. */
  peso: z.number(),
  obligatorio: z.boolean(),
  activo: z.boolean(),
});

const esquemaGuardar = z.object({
  idActor: esquemaId,
  idAreaTecnica: esquemaId,
  /** `null` = el bloque general del área. */
  idEspecialidad: esquemaId.nullable(),
  criterios: z.array(esquemaCriterio).superRefine((criterios, contexto) => {
    const vistos = new Set<string>();
    for (const [i, c] of criterios.entries()) {
      if (c.id === undefined) continue;
      if (vistos.has(c.id)) {
        contexto.addIssue({ code: 'custom', path: [i, 'id'], message: 'Criterio repetido.' });
      }
      vistos.add(c.id);
    }
  }),
});

export type EntradaGuardarCriteriosDeBloque = z.input<typeof esquemaGuardar>;

const CAMPOS_EDITABLES = ['nombre', 'tipo', 'peso', 'obligatorio'] as const;

export function guardarCriteriosDeBloque(
  entrada: EntradaGuardarCriteriosDeBloque,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<CriterioEvaluacion[]>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaGuardar, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const actor = autorizarGestion(datos, v.idActor);
    if (!actor.ok) return actor;

    const area = datos.areas_tecnicas.find((a) => a.id === v.idAreaTecnica);
    if (area === undefined) return fallo('NO_ENCONTRADO');
    const especialidad =
      v.idEspecialidad === null
        ? null
        : (datos.especialidades.find((x) => x.id === v.idEspecialidad) ?? null);
    if (v.idEspecialidad !== null) {
      if (especialidad === null) return fallo('NO_ENCONTRADO');
      if (especialidad.id_area_tecnica !== area.id) return fallo('ESPECIALIDAD_DE_OTRA_AREA');
    }
    const bloque = especialidad === null ? 'AREA' : 'ESPECIALIDAD';
    const duenoActivo = especialidad === null ? area.activo : especialidad.activo;

    const existentes =
      especialidad === null
        ? bloqueDeArea(datos.criterios, area.id)
        : bloqueDeEspecialidad(datos.criterios, especialidad.id);
    const idsExistentes = new Set(existentes.map((c) => c.id));

    // Todo criterio con `id` debe ser de este bloque, y no puede faltar ninguno (nada se borra).
    if (v.criterios.some((c) => c.id !== undefined && !idsExistentes.has(c.id))) {
      return fallo('CRITERIO_DE_OTRO_BLOQUE');
    }
    const enviados = new Set(v.criterios.map((c) => c.id));
    const faltantes = existentes.filter((c) => !enviados.has(c.id));
    if (faltantes.length > 0) {
      return fallo(
        'CRITERIOS_INCOMPLETOS',
        `Faltan criterios del bloque: ${faltantes.map((c) => `«${c.nombre}»`).join(', ')}. Los criterios no se borran: desactívalos.`,
      );
    }

    const nombres = new Set<string>();
    for (const [i, c] of v.criterios.entries()) {
      const clave = normalizarNombre(c.nombre);
      if (nombres.has(clave)) {
        return fallo('NOMBRE_DUPLICADO', 'Ya hay un criterio con ese nombre en este bloque.', {
          [`criterios.${i}.nombre`]: 'Ya hay un criterio con ese nombre en este bloque.',
        });
      }
      nombres.add(clave);
    }

    // El bloque como quedaría: se valida una sola vez, con todos los cambios juntos.
    const porId = new Map(existentes.map((c) => [c.id, c]));
    const resultado: CriterioEvaluacion[] = v.criterios.map((c) => ({
      id: c.id ?? e.generarId('cri'),
      id_area_tecnica: area.id,
      id_especialidad: especialidad?.id ?? null,
      nombre: c.nombre,
      tipo: c.tipo,
      peso: c.peso,
      obligatorio: c.obligatorio,
      activo: c.activo,
    }));
    const valido = validarBloqueCriterios(resultado, bloque);
    const vacioPermitido = !valido.ok && valido.codigo === 'BLOQUE_SIN_CRITERIOS' && !duenoActivo;
    if (!valido.ok && !vacioPermitido) return denegar(valido);

    // Un evento por cada cambio, en el orden de la lista.
    const eventos: EventoHistorial[] = [];
    const nuevos: CriterioEvaluacion[] = [];
    const reemplazos = new Map<Id, CriterioEvaluacion>();
    for (const despues of resultado) {
      const antes = porId.get(despues.id);
      const elemento = {
        tipo: 'CRITERIO_EVALUACION',
        id: despues.id,
        etiqueta: despues.nombre,
      } as const;
      const evento = (
        tipo_accion: Parameters<typeof eventoDeCatalogo>[0]['tipo_accion'],
        cambios: ReturnType<typeof diferencias>,
      ) =>
        eventos.push(
          eventoDeCatalogo(
            { actor: actor.valor, tipo_accion, elemento, cambios },
            marca,
            e.generarId,
          ),
        );

      if (antes === undefined) {
        nuevos.push(despues);
        evento('CRITERIO_CREADO', [
          cambio('nombre', null, despues.nombre),
          cambio('tipo', null, despues.tipo),
          cambio('peso', null, despues.peso),
          cambio('obligatorio', null, despues.obligatorio),
          cambio('activo', null, despues.activo),
        ]);
        continue;
      }
      const editados = diferencias(antes, despues, CAMPOS_EDITABLES);
      if (editados.length > 0) evento('CRITERIO_EDITADO', editados);
      if (antes.activo !== despues.activo) {
        evento(despues.activo ? 'CRITERIO_ACTIVADO' : 'CRITERIO_DESACTIVADO', [
          cambio('activo', antes.activo, despues.activo),
        ]);
      }
      if (editados.length > 0 || antes.activo !== despues.activo)
        reemplazos.set(despues.id, despues);
    }
    if (eventos.length === 0) return fallo('SIN_CAMBIOS');

    return {
      ok: true,
      valor: resultado,
      cambios: conEfectos(
        datos,
        { criterios: [...datos.criterios.map((c) => reemplazos.get(c.id) ?? c), ...nuevos] },
        { eventos },
      ),
    };
  });
}

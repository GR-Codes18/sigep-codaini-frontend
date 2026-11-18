/**
 * Piezas comunes de los servicios del catálogo de evaluación (Fase 2, paso 7B): áreas técnicas,
 * especialidades y criterios (propuesta §5.1).
 *
 * Orden de comprobación de todos: Zod (forma) → actor → `puede('GESTIONAR_CRITERIOS_EVALUACION')` →
 * entidades → reglas propias (nombre único, bloque válido) → «sin cambios» → una sola escritura.
 *
 * Reglas del módulo (decisiones C1-B, C2-B y los supuestos confirmados, ver `DECISIONES.md`):
 *   - nada se borra: solo se desactiva;
 *   - un área o una especialidad **nace inactiva** y solo se activa cuando su bloque de criterios activos
 *     es válido (enteros mayores que 0 que suman 100);
 *   - los nombres son únicos por nivel (áreas entre sí, especialidades dentro de su área, criterios dentro
 *     de su bloque), sin distinguir mayúsculas ni espacios;
 *   - desactivar no tiene cascadas y la especialidad no cambia de área;
 *   - cambiar el catálogo **no recalcula** las evaluaciones ya hechas (cada una guarda su copia);
 *   - ninguna acción notifica a nadie (§8.1).
 */

import { z } from 'zod';
import type { DatosAlmacen } from '@/data';
import {
  puede,
  type CriterioEvaluacion,
  type EventoHistorial,
  type Id,
  type TipoAccionHistorial,
  type TipoElemento,
  type Usuario,
  type CambioRegistrado,
} from '@/domain';
import { obtenerActor } from '../actor';
import { autorDe, crearEvento } from '../historial';
import type { Marca } from '../marca';
import { denegar, type Resultado, exito } from '../resultado';

export const esquemaNombre = z.string().trim().min(1, 'Escribe un nombre.');

/** Para comparar nombres: sin distinguir mayúsculas ni espacios de más. */
export function normalizarNombre(nombre: string): string {
  return nombre.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Actor → permiso de gestionar el catálogo de evaluación (solo el Administrador activo). */
export function autorizarGestion(
  datos: Pick<DatosAlmacen, 'usuarios'>,
  idActor: Id,
): Resultado<Usuario> {
  const actor = obtenerActor(datos, idActor);
  if (!actor.ok) return actor;
  const permiso = puede(actor.valor, 'GESTIONAR_CRITERIOS_EVALUACION', {});
  if (!permiso.permitido) return denegar(permiso);
  return exito(actor.valor);
}

/** Criterios del bloque general del área (los que no son de ninguna especialidad). */
export function bloqueDeArea(criterios: readonly CriterioEvaluacion[], idArea: Id) {
  return criterios.filter((c) => c.id_area_tecnica === idArea && c.id_especialidad === null);
}

/** Criterios del bloque de una especialidad. */
export function bloqueDeEspecialidad(criterios: readonly CriterioEvaluacion[], idEspecialidad: Id) {
  return criterios.filter((c) => c.id_especialidad === idEspecialidad);
}

export function eventoDeCatalogo(
  entrada: {
    actor: Pick<Usuario, 'id'>;
    tipo_accion: TipoAccionHistorial;
    elemento: { tipo: TipoElemento; id: Id; etiqueta: string };
    cambios: readonly CambioRegistrado[];
  },
  marca: Marca,
  generarId: (prefijo: string) => Id,
): EventoHistorial {
  return crearEvento(
    {
      autor: autorDe(entrada.actor.id),
      tipo_accion: entrada.tipo_accion,
      elemento: entrada.elemento,
      id_proyecto: null,
      cambios: entrada.cambios,
    },
    marca,
    generarId,
  );
}

/**
 * Piezas comunes de los servicios de postulaciones (Fase 2, paso 7A).
 *
 * Orden de comprobación de las decisiones (aprobar, rechazar, reconsiderar):
 *   Zod (forma) → actor → postulante → `puede()` → estado (`puedeDecidirPostulacion`) → texto ausente →
 *   reglas propias → escritura.
 * Igual que en tareas, Zod no exige contenido en el motivo o la nota: lo hace `exigirTexto`, después
 * del estado, para que una postulación en el estado equivocado responda por su estado y no por el texto.
 */

import { z } from 'zod';
import type { DatosAlmacen } from '@/data';
import type {
  BandaAmbigua,
  Id,
  Postulante,
  ProporcionNota,
  Usuario,
  ValorParametro,
} from '@/domain';
import { obtenerActor } from '../actor';
import { exito, fallo, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';

export const esquemaDecision = z.object({
  idActor: esquemaId,
  idPostulante: esquemaId,
  /** Motivo (rechazar) o nota (reconsiderar): ver la cabecera. */
  texto: z.string().optional(),
});

export interface ContextoPostulacion {
  actor: Usuario;
  postulante: Postulante;
}

/** Actor → postulante. Una postulación inexistente es `NO_ENCONTRADO`. */
export function cargarContextoPostulacion(
  datos: Pick<DatosAlmacen, 'usuarios' | 'postulantes'>,
  idActor: Id,
  idPostulante: Id,
): Resultado<ContextoPostulacion> {
  const actor = obtenerActor(datos, idActor);
  if (!actor.ok) return actor;
  const postulante = datos.postulantes.find((p) => p.id === idPostulante);
  if (postulante === undefined) return fallo('NO_ENCONTRADO');
  return exito({ actor: actor.valor, postulante });
}

// ── Parámetros vigentes de Configuración ─────────────────────────────────────────────────────

function valorDe(datos: Pick<DatosAlmacen, 'parametros'>, clave: string): ValorParametro | null {
  return datos.parametros.find((p) => p.clave === clave)?.valor ?? null;
}

/** Banda ambigua vigente. Un parámetro ausente o de otro tipo es un dato roto: `CONFIGURACION_INVALIDA`. */
export function leerBanda(datos: Pick<DatosAlmacen, 'parametros'>): Resultado<BandaAmbigua> {
  const valor = valorDe(datos, 'EVALUACION_BANDA_AMBIGUA');
  if (valor?.tipo !== 'rango') return fallo('CONFIGURACION_INVALIDA');
  return exito({ minimo: valor.minimo, maximo: valor.maximo });
}

export function leerProporcion(datos: Pick<DatosAlmacen, 'parametros'>): Resultado<ProporcionNota> {
  const valor = valorDe(datos, 'EVALUACION_PROPORCION');
  if (valor?.tipo !== 'proporcion') return fallo('CONFIGURACION_INVALIDA');
  return exito({ area: valor.area, especialidad: valor.especialidad });
}

/** Duración de la práctica en meses (`PRACTICA_DURACION_MESES`). Los límites los valida `domain/`. */
export function leerDuracionMeses(datos: Pick<DatosAlmacen, 'parametros'>): Resultado<number> {
  const valor = valorDe(datos, 'PRACTICA_DURACION_MESES');
  if (valor?.tipo !== 'numero') return fallo('CONFIGURACION_INVALIDA');
  return exito(valor.valor);
}

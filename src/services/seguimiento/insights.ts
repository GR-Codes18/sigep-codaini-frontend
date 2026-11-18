/**
 * Acciones sobre un insight (Fase 2, paso 10B; propuesta §5.6, §8.1 y §5.7).
 *
 * Un insight no se guarda, así que se identifica por su regla y su elemento (`tipo_regla` + `elemento`) y el
 * servicio lo **recalcula** con los datos vigentes (`calcularInsightsVigentes`); si ya no existe (la condición dejó de
 * cumplirse), `NO_ENCONTRADO`. Después `puede()` decide por rol y alcance con la entidad ya resuelta.
 *
 *   - `marcarInsightRevisado`: guarda una `InsightRevision` de **quien actúa** (el estado «revisado» es
 *     independiente por persona). Si ya lo tiene revisado (y no ha reaparecido), `INSIGHT_YA_REVISADO`. Sin evento de
 *     historial (§5.7 no lo lista) y sin avisos.
 *   - `notificarDesdeInsight`: avisa a la persona afectada, con un texto automático armado con el título y el motivo
 *     del insight (la propuesta no define un campo libre). Inactividad → el practicante; supervisión demorada → el
 *     supervisor del proyecto de la tarea. Se puede avisar más de una vez: la propuesta no define un límite. Sin
 *     evento de historial.
 */

import { z } from 'zod';
import {
  TIPOS_ELEMENTO,
  TIPOS_REGLA_INSIGHT,
  aplicarRevisiones,
  puede,
  type Id,
  type Insight,
  type InsightRevision,
  type TipoReglaInsight,
} from '@/domain';
import type { DatosAlmacen } from '@/data';
import { obtenerActor } from '../actor';
import { ENTORNO, type Entorno } from '../entorno';
import { autorDe } from '../historial';
import { crearNotificaciones } from '../notificaciones';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';
import { conEfectos, ejecutarServicio } from '../transaccional';
import { calcularInsightsVigentes } from './comun';

const esquemaElemento = z.object({ tipo: z.enum(TIPOS_ELEMENTO), id: esquemaId });
const esquemaInsight = {
  idActor: esquemaId,
  tipo_regla: z.enum(TIPOS_REGLA_INSIGHT),
  elemento: esquemaElemento,
};

const esquemaRevisar = z.object({
  ...esquemaInsight,
  nota: z
    .string()
    .trim()
    .transform((texto) => (texto === '' ? null : texto))
    .nullable()
    .optional(),
});
const esquemaNotificar = z.object(esquemaInsight);

export type EntradaMarcarInsightRevisado = z.input<typeof esquemaRevisar>;
export type EntradaNotificarDesdeInsight = z.input<typeof esquemaNotificar>;

/** Recalcula los insights y busca el que se nombra. */
function buscarInsight(
  datos: DatosAlmacen,
  ahora: string,
  tipo_regla: TipoReglaInsight,
  elemento: { tipo: string; id: Id },
): Resultado<Insight> {
  const calculo = calcularInsightsVigentes(datos, ahora);
  if (!calculo.ok) return calculo;
  const insight = calculo.valor.find(
    (i) =>
      i.tipo_regla === tipo_regla &&
      i.elemento.tipo === elemento.tipo &&
      i.elemento.id === elemento.id,
  );
  return insight === undefined ? fallo('NO_ENCONTRADO') : { ok: true, valor: insight };
}

// ── Marcar como revisado ─────────────────────────────────────────────────────────────────────

export function marcarInsightRevisado(
  entrada: EntradaMarcarInsightRevisado,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<InsightRevision>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaRevisar, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const actor = obtenerActor(datos, v.idActor);
    if (!actor.ok) return actor;

    const encontrado = buscarInsight(datos, marca.ahora, v.tipo_regla, v.elemento);
    if (!encontrado.ok) return encontrado;
    const insight = encontrado.valor;

    const permiso = puede(actor.valor, 'MARCAR_INSIGHT_REVISADO', {
      insight,
      proyectos: datos.proyectos,
    });
    if (!permiso.permitido) return denegar(permiso);

    const [vista] = aplicarRevisiones(
      [insight],
      datos.revisiones_insight,
      actor.valor.id,
      marca.ahora,
    );
    if (vista?.revisado === true) return fallo('INSIGHT_YA_REVISADO');

    const revision: InsightRevision = {
      id: e.generarId('rev'),
      tipo_regla: insight.tipo_regla,
      elemento: { ...insight.elemento },
      severidad_al_revisar: insight.severidad,
      fecha: marca.ahora,
      id_usuario: actor.valor.id,
      nota: v.nota ?? null,
    };
    return {
      ok: true,
      valor: revision,
      cambios: { revisiones_insight: [...datos.revisiones_insight, revision] },
    };
  });
}

// ── Notificar desde un insight ───────────────────────────────────────────────────────────────

/** A quién avisa cada regla notificable; `null` si el dato necesario no está. */
function destinatarioDe(datos: DatosAlmacen, insight: Insight): Id | null {
  switch (insight.tipo_regla) {
    case 'PRACTICANTE_INACTIVO':
      return insight.elemento.id;
    case 'SUPERVISION_DEMORADA': {
      const proyecto = datos.proyectos.find((p) => p.id === insight.ids_proyecto[0]);
      return proyecto?.id_supervisor ?? null;
    }
    default:
      return null;
  }
}

export interface InsightNotificado {
  id_destinatario: Id;
}

export function notificarDesdeInsight(
  entrada: EntradaNotificarDesdeInsight,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<InsightNotificado>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaNotificar, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const actor = obtenerActor(datos, v.idActor);
    if (!actor.ok) return actor;

    const encontrado = buscarInsight(datos, marca.ahora, v.tipo_regla, v.elemento);
    if (!encontrado.ok) return encontrado;
    const insight = encontrado.valor;

    const permiso = puede(actor.valor, 'NOTIFICAR_DESDE_INSIGHT', {
      insight,
      proyectos: datos.proyectos,
    });
    if (!permiso.permitido) return denegar(permiso);

    const idDestinatario = destinatarioDe(datos, insight);
    const destinatario = datos.usuarios.find((u) => u.id === idDestinatario);
    if (destinatario === undefined) return fallo('NO_ENCONTRADO');
    if (destinatario.estado !== 'ACTIVO') return fallo('USUARIO_OBJETIVO_INACTIVO');

    const avisos = crearNotificaciones(
      {
        autor: autorDe(actor.valor.id),
        destinatarios: [destinatario.id],
        tipo: 'NOTIFICACION_DESDE_INSIGHT',
        mensaje: `${insight.titulo}. ${insight.motivo}`,
        elemento: { ...insight.elemento },
      },
      datos.usuarios,
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: { id_destinatario: destinatario.id },
      cambios: conEfectos(datos, {}, { notificaciones: avisos }),
    };
  });
}

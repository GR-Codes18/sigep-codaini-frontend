/**
 * Asignar practicantes a proyectos y quitarlos (Fase 2, paso 8A; propuesta §5.2, §5.4 y §8.1).
 *
 * Asignar (decisión F2-A): una lista de pares `{ idPracticante, idProyecto }` que se aplica **entera o
 * ninguna**: cubre el atajo «Asignar a proyecto» de «Sin proyecto», varios proyectos para una persona y
 * varios practicantes para un proyecto con una sola confirmación. Cada par pasa por
 * `puedeAsignarPracticante` teniendo en cuenta lo que ya se asignó en el mismo lote. Una asignación nunca
 * se borra: volver a un proyecto crea una nueva.
 *
 * Quitar: la asignación recibe `fecha_baja` y las tareas EN_PROGRESO del practicante en ese proyecto se
 * liberan, con un `TAREA_LIBERADA` y un aviso por cada una (F3-A, además del aviso de salida). El motivo es
 * opcional (la matriz de §4 no lo exige).
 *
 * Avisos (§8.1): solo al practicante afectado; el supervisor no recibe ninguno.
 */

import { z } from 'zod';
import {
  puedeAsignarPracticante,
  puedeQuitarPracticante,
  type Asignacion,
  type EventoHistorial,
  type Id,
  type Notificacion,
} from '@/domain';
import { obtenerActor } from '../actor';
import { denegarCicloVida } from '../cicloVida';
import { ENTORNO, type Entorno } from '../entorno';
import { etiquetaUsuario } from '../etiquetas';
import { autorDe, cambio, crearEvento } from '../historial';
import { crearNotificaciones } from '../notificaciones';
import { fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId, esquemaTextoOpcional, referenciaTarea, textoGuardado } from '../tareas/comun';
import { conEfectos, ejecutarServicio } from '../transaccional';
import { cargarPersona, conTareasLiberadas, liberarTareasDe } from './comun';

const esquemaPar = z.object({ idPracticante: esquemaId, idProyecto: esquemaId });

const esquemaAsignar = z.object({
  idActor: esquemaId,
  asignaciones: z
    .array(esquemaPar)
    .min(1, 'Elige al menos una asignación.')
    .superRefine((pares, contexto) => {
      const vistos = new Set<string>();
      for (const [i, par] of pares.entries()) {
        const clave = `${par.idPracticante}|${par.idProyecto}`;
        if (vistos.has(clave)) {
          contexto.addIssue({ code: 'custom', path: [i], message: 'Asignación repetida.' });
        }
        vistos.add(clave);
      }
    }),
});

const esquemaQuitar = z.object({
  idActor: esquemaId,
  idProyecto: esquemaId,
  idPracticante: esquemaId,
  motivo: esquemaTextoOpcional,
});

export type EntradaAsignarPracticantes = z.input<typeof esquemaAsignar>;
export type EntradaQuitarPracticante = z.input<typeof esquemaQuitar>;

// ── Asignar ──────────────────────────────────────────────────────────────────────────────────

export function asignarPracticantes(
  entrada: EntradaAsignarPracticantes,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Asignacion[]>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaAsignar, entrada);
    if (!valida.ok) return valida;
    const actor = obtenerActor(datos, valida.valor.idActor);
    if (!actor.ok) return actor;

    const creadas: Asignacion[] = [];
    const eventos: EventoHistorial[] = [];
    const avisos: Notificacion[] = [];

    for (const [i, par] of valida.valor.asignaciones.entries()) {
      const campo = `asignaciones.${i}`;
      const proyecto = datos.proyectos.find((p) => p.id === par.idProyecto);
      const practicante = datos.usuarios.find((u) => u.id === par.idPracticante);
      if (proyecto === undefined || practicante === undefined) {
        const f = fallo('NO_ENCONTRADO');
        return { ...f, campos: { [campo]: f.mensaje } };
      }

      // Las que se crearon antes en el mismo lote cuentan: así un par repetido no pasa.
      const regla = puedeAsignarPracticante(actor.valor, proyecto, practicante, [
        ...datos.asignaciones,
        ...creadas,
      ]);
      if (!regla.ok) {
        const f = denegarCicloVida(regla);
        return { ...f, campos: { [campo]: f.mensaje } };
      }

      creadas.push({
        id: e.generarId('asi'),
        id_practicante: practicante.id,
        id_proyecto: proyecto.id,
        fecha_alta: marca.hoy,
        fecha_baja: null,
      });
      eventos.push(
        crearEvento(
          {
            autor: autorDe(actor.valor.id),
            tipo_accion: 'PRACTICANTE_ASIGNADO_A_PROYECTO',
            elemento: {
              tipo: 'USUARIO',
              id: practicante.id,
              etiqueta: etiquetaUsuario(practicante),
            },
            id_proyecto: proyecto.id,
            cambios: [cambio('proyecto', null, proyecto.codigo)],
          },
          marca,
          e.generarId,
        ),
      );
      avisos.push(
        ...crearNotificaciones(
          {
            autor: autorDe(actor.valor.id),
            destinatarios: [practicante.id],
            tipo: 'ASIGNADO_A_PROYECTO',
            mensaje: `Te asignaron al proyecto ${proyecto.nombre}.`,
            elemento: { tipo: 'PROYECTO', id: proyecto.id },
          },
          datos.usuarios,
          marca,
          e.generarId,
        ),
      );
    }

    return {
      ok: true,
      valor: creadas,
      cambios: conEfectos(
        datos,
        { asignaciones: [...datos.asignaciones, ...creadas] },
        { eventos, notificaciones: avisos },
      ),
    };
  });
}

// ── Quitar ───────────────────────────────────────────────────────────────────────────────────

export function quitarPracticante(
  entrada: EntradaQuitarPracticante,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<{ asignacion: Asignacion; tareas_liberadas: Id[] }>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaQuitar, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const actor = obtenerActor(datos, v.idActor);
    if (!actor.ok) return actor;
    const proyecto = datos.proyectos.find((p) => p.id === v.idProyecto);
    if (proyecto === undefined) return fallo('NO_ENCONTRADO');

    const regla = puedeQuitarPracticante(
      actor.valor,
      proyecto,
      v.idPracticante,
      datos.asignaciones,
      datos.tareas,
    );
    if (!regla.ok) return denegarCicloVida(regla);

    const practicante = cargarPersona(datos, v.idPracticante);
    if (!practicante.ok) return practicante;
    const nota = textoGuardado(v.motivo);

    const liberadas = liberarTareasDe(
      { actor: actor.valor, ids: regla.efectos.tareas_a_liberar, nota },
      datos,
      marca,
      e.generarId,
    );
    const asignacion = datos.asignaciones.find((a) => a.id === regla.efectos.asignacion_a_cerrar)!;
    const cerrada: Asignacion = { ...asignacion, fecha_baja: marca.hoy };

    const autor = autorDe(actor.valor.id);
    const eventos: EventoHistorial[] = [
      crearEvento(
        {
          autor,
          tipo_accion: 'PRACTICANTE_QUITADO_DE_PROYECTO',
          elemento: {
            tipo: 'USUARIO',
            id: practicante.valor.id,
            etiqueta: etiquetaUsuario(practicante.valor),
          },
          id_proyecto: proyecto.id,
          cambios: [cambio('proyecto', proyecto.codigo, null)],
          nota,
        },
        marca,
        e.generarId,
      ),
      ...liberadas.map((l) => l.evento),
    ];
    const avisos: Notificacion[] = [
      ...crearNotificaciones(
        {
          autor,
          destinatarios: [practicante.valor.id],
          tipo: 'QUITADO_DE_PROYECTO',
          mensaje: `Saliste del proyecto ${proyecto.nombre}.`,
          elemento: { tipo: 'PROYECTO', id: proyecto.id },
        },
        datos.usuarios,
        marca,
        e.generarId,
      ),
      ...liberadas.flatMap((l) =>
        crearNotificaciones(
          {
            autor,
            destinatarios: [practicante.valor.id],
            tipo: 'TAREA_LIBERADA',
            mensaje: `Liberaron tu tarea ${referenciaTarea(proyecto, l.despues)}.`,
            elemento: { tipo: 'TAREA', id: l.despues.id },
          },
          datos.usuarios,
          marca,
          e.generarId,
        ),
      ),
    ];

    return {
      ok: true,
      valor: { asignacion: cerrada, tareas_liberadas: liberadas.map((l) => l.despues.id) },
      cambios: conEfectos(
        datos,
        {
          asignaciones: datos.asignaciones.map((a) => (a.id === cerrada.id ? cerrada : a)),
          ...(liberadas.length > 0 ? { tareas: conTareasLiberadas(datos.tareas, liberadas) } : {}),
        },
        { eventos, notificaciones: avisos },
      ),
    };
  });
}

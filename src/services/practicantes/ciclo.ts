/**
 * Finalizar y reactivar la práctica de un practicante (Fase 2, paso 8A; propuesta §5.2 y §8.1).
 *
 * Finalizar (motivo obligatorio): en una sola operación,
 *   - da baja (`fecha_baja` = hoy en hora de Perú) a **todas** sus asignaciones vigentes, también en un
 *     proyecto FINALIZADO;
 *   - libera sus tareas EN_PROGRESO (un `TAREA_LIBERADA` por cada una, con el motivo); las
 *     ESPERANDO_SUPERVISION se quedan con el supervisor;
 *   - deja `Usuario.estado = INACTIVO`, que es lo que bloquea su acceso;
 *   - registra un solo `PRACTICANTE_FINALIZADO` (sin proyecto, como la semilla);
 *   - avisa `PRACTICA_FINALIZADA_CON_TAREAS_LIBERADAS` a los supervisores de los proyectos donde se liberó
 *     alguna tarea, uno por supervisor y proyecto afectado, para que el enlace lleve a ese proyecto. No se
 *     avisa a la persona: su acceso queda bloqueado.
 *
 * Reactivar (nota obligatoria, F4-A): vuelve a ACTIVO. Sus asignaciones antiguas no se reactivan (queda «Sin
 * proyecto») y la fecha de fin prevista no cambia: se edita después con `editarDatosPractica`.
 */

import { z } from 'zod';
import {
  finalizarPractica as reglaFinalizarPractica,
  reactivarPractica as reglaReactivarPractica,
  type EventoHistorial,
  type Id,
  type Notificacion,
  type Usuario,
} from '@/domain';
import { denegarCicloVida } from '../cicloVida';
import { ENTORNO, type Entorno } from '../entorno';
import { etiquetaUsuario } from '../etiquetas';
import { autorDe, cambio, crearEvento } from '../historial';
import { crearNotificaciones } from '../notificaciones';
import { validarEntrada, type Resultado } from '../resultado';
import { esquemaId, esquemaTextoOpcional, exigirTexto, textoGuardado } from '../tareas/comun';
import { conEfectos, ejecutarServicio } from '../transaccional';
import { obtenerActor } from '../actor';
import { cargarPersona, conTareasLiberadas, liberarTareasDe } from './comun';

const esquemaFinalizar = z.object({
  idActor: esquemaId,
  idPracticante: esquemaId,
  motivo: esquemaTextoOpcional,
});
const esquemaReactivar = z.object({
  idActor: esquemaId,
  idPracticante: esquemaId,
  nota: esquemaTextoOpcional,
});

export type EntradaFinalizarPractica = z.input<typeof esquemaFinalizar>;
export type EntradaReactivarPractica = z.input<typeof esquemaReactivar>;

export interface PracticaFinalizada {
  practicante: Usuario;
  asignaciones_cerradas: Id[];
  tareas_liberadas: Id[];
}

export function finalizarPractica(
  entrada: EntradaFinalizarPractica,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<PracticaFinalizada>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaFinalizar, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const actor = obtenerActor(datos, v.idActor);
    if (!actor.ok) return actor;
    const objetivo = cargarPersona(datos, v.idPracticante);
    if (!objetivo.ok) return objetivo;

    // Quién, estado y motivo vacío: todo en `domain/`. El motivo ausente lo rechaza el servicio.
    const regla = reglaFinalizarPractica(
      actor.valor,
      objetivo.valor,
      { proyectos: datos.proyectos, asignaciones: datos.asignaciones, tareas: datos.tareas },
      marca.ahora,
      { motivo: v.motivo },
    );
    if (!regla.ok) return denegarCicloVida(regla);
    const sinTexto = exigirTexto(regla.exige_texto, v.motivo);
    if (sinTexto !== null) return sinTexto;

    const { efectos } = regla;
    const nota = textoGuardado(v.motivo);
    const autor = autorDe(actor.valor.id);
    const liberadas = liberarTareasDe(
      { actor: actor.valor, ids: efectos.tareas_a_liberar, nota },
      datos,
      marca,
      e.generarId,
    );
    const cerrar = new Set(efectos.asignaciones_a_cerrar);
    const practicante: Usuario = { ...objetivo.valor, estado: 'INACTIVO' };

    const eventos: EventoHistorial[] = [
      crearEvento(
        {
          autor,
          tipo_accion: 'PRACTICANTE_FINALIZADO',
          elemento: { tipo: 'USUARIO', id: practicante.id, etiqueta: etiquetaUsuario(practicante) },
          id_proyecto: null,
          cambios: [cambio('estado', objetivo.valor.estado, practicante.estado)],
          nota,
        },
        marca,
        e.generarId,
      ),
      ...liberadas.map((l) => l.evento),
    ];

    // Un aviso por supervisor y proyecto donde se liberó alguna tarea.
    const porProyecto = new Map<Id, typeof liberadas>();
    for (const l of liberadas) {
      porProyecto.set(l.proyecto.id, [...(porProyecto.get(l.proyecto.id) ?? []), l]);
    }
    const avisos: Notificacion[] = [...porProyecto.values()].flatMap((delProyecto) => {
      const proyecto = delProyecto[0].proyecto;
      if (!efectos.supervisores_a_avisar.includes(proyecto.id_supervisor)) return [];
      const n = delProyecto.length;
      const que =
        n === 1
          ? '1 tarea en progreso quedó disponible'
          : `${n} tareas en progreso quedaron disponibles`;
      return crearNotificaciones(
        {
          autor,
          destinatarios: [proyecto.id_supervisor],
          tipo: 'PRACTICA_FINALIZADA_CON_TAREAS_LIBERADAS',
          mensaje: `${practicante.nombre} finalizó su práctica: ${que} en «${proyecto.nombre}».`,
          elemento: { tipo: 'PROYECTO', id: proyecto.id },
        },
        datos.usuarios,
        marca,
        e.generarId,
      );
    });

    return {
      ok: true,
      valor: {
        practicante,
        asignaciones_cerradas: [...efectos.asignaciones_a_cerrar],
        tareas_liberadas: liberadas.map((l) => l.despues.id),
      },
      cambios: conEfectos(
        datos,
        {
          usuarios: datos.usuarios.map((u) => (u.id === practicante.id ? practicante : u)),
          asignaciones: datos.asignaciones.map((a) =>
            cerrar.has(a.id) ? { ...a, fecha_baja: efectos.fecha_baja } : a,
          ),
          ...(liberadas.length > 0 ? { tareas: conTareasLiberadas(datos.tareas, liberadas) } : {}),
        },
        { eventos, notificaciones: avisos },
      ),
    };
  });
}

export function reactivarPractica(
  entrada: EntradaReactivarPractica,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Usuario>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaReactivar, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const actor = obtenerActor(datos, v.idActor);
    if (!actor.ok) return actor;
    const objetivo = cargarPersona(datos, v.idPracticante);
    if (!objetivo.ok) return objetivo;

    const regla = reglaReactivarPractica(actor.valor, objetivo.valor, { nota: v.nota });
    if (!regla.ok) return denegarCicloVida(regla);
    const sinTexto = exigirTexto(regla.exige_texto, v.nota);
    if (sinTexto !== null) return sinTexto;

    const practicante: Usuario = { ...objetivo.valor, estado: 'ACTIVO' };
    const evento = crearEvento(
      {
        autor: autorDe(actor.valor.id),
        tipo_accion: 'PRACTICANTE_REACTIVADO',
        elemento: { tipo: 'USUARIO', id: practicante.id, etiqueta: etiquetaUsuario(practicante) },
        id_proyecto: null,
        cambios: [cambio('estado', objetivo.valor.estado, practicante.estado)],
        nota: textoGuardado(v.nota),
      },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: practicante,
      cambios: conEfectos(
        datos,
        { usuarios: datos.usuarios.map((u) => (u.id === practicante.id ? practicante : u)) },
        { eventos: [evento] },
      ),
    };
  });
}

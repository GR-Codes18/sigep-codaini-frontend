/**
 * Pausar, reanudar, finalizar y reactivar un proyecto (Fase 2, paso 9B; propuesta §5.4 y §8.1).
 *
 * Solo el Administrador, siempre con una **nota obligatoria** (`exigirTexto` si falta). Cada acción deja su evento con
 * el estado anterior y el nuevo y la nota recortada.
 *   - pausar (ACTIVO → EN_PAUSA) y reanudar (EN_PAUSA → ACTIVO): las tareas no cambian; en pausa nadie toma tareas
 *     nuevas, lo demás sigue igual. Avisan al equipo.
 *   - finalizar (ACTIVO o EN_PAUSA → FINALIZADO), con `finalizarProyecto` de `domain/cicloVida.ts`: se bloquea con
 *     tareas ESPERANDO_SUPERVISION (el mensaje trae la cantidad); libera las EN_PROGRESO, con un `TAREA_LIBERADA`
 *     por cada una y su aviso al responsable (como al quitar a un practicante, F3-A); fija `fecha_fin_real` con el
 *     día de Perú. **No cierra las asignaciones**: si se reactiva, el equipo recupera su acceso. Avisa al equipo.
 *   - reactivar (FINALIZADO → ACTIVO): `fecha_fin_real` vuelve a `null` y exige un supervisor ACTIVO
 *     (`SUPERVISOR_DEL_PROYECTO_INACTIVO`). **No avisa a nadie** (G2-A): §8.1 no lo lista.
 *
 * El equipo es el supervisor y los practicantes activos con asignación vigente, sin quien hizo la acción.
 */

import { z } from 'zod';
import {
  finalizarProyecto as reglaFinalizarProyecto,
  puedePausarProyecto,
  puedeReactivarProyecto,
  puedeReanudarProyecto,
  type EventoHistorial,
  type Notificacion,
  type Proyecto,
  type TipoNotificacion,
} from '@/domain';
import { denegarCicloVida } from '../cicloVida';
import { ENTORNO, type Entorno } from '../entorno';
import { autorDe, cambio } from '../historial';
import { crearNotificaciones } from '../notificaciones';
import { conTareasLiberadas, liberarTareasDe } from '../practicantes/comun';
import { validarEntrada, type Resultado } from '../resultado';
import {
  esquemaId,
  esquemaTextoOpcional,
  exigirTexto,
  referenciaTarea,
  textoGuardado,
} from '../tareas/comun';
import { conEfectos, ejecutarServicio } from '../transaccional';
import {
  cargarContextoProyecto,
  equipoDelProyecto,
  eventoDeProyecto,
  reemplazarProyecto,
} from './comun';

const esquemaEstado = z.object({
  idActor: esquemaId,
  idProyecto: esquemaId,
  nota: esquemaTextoOpcional,
});

export type EntradaCambiarEstadoProyecto = z.input<typeof esquemaEstado>;

type ReglaSimple = (
  ...argumentos: Parameters<typeof puedePausarProyecto>
) => ReturnType<typeof puedePausarProyecto>;

/** Pausar y reanudar comparten forma: regla de `domain/` → nota → estado → evento → aviso al equipo. */
function cambiarEstado(
  regla: ReglaSimple,
  tipo_accion: 'PROYECTO_PAUSADO' | 'PROYECTO_REANUDADO',
  tipo_aviso: Extract<TipoNotificacion, 'PROYECTO_PAUSADO' | 'PROYECTO_REANUDADO'>,
  verbo: string,
  entrada: EntradaCambiarEstadoProyecto,
  entorno: Entorno,
): Promise<Resultado<Proyecto>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaEstado, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const contexto = cargarContextoProyecto(datos, v.idActor, v.idProyecto);
    if (!contexto.ok) return contexto;
    const { actor, proyecto } = contexto.valor;

    // Quién, estado y nota vacía: todo en `domain/`. La nota ausente la rechaza el servicio.
    const permiso = regla(actor, proyecto, { nota: v.nota });
    if (!permiso.ok) return denegarCicloVida(permiso);
    const sinTexto = exigirTexto(permiso.exige_texto, v.nota);
    if (sinTexto !== null) return sinTexto;

    const nuevo: Proyecto = { ...proyecto, estado: permiso.estado_nuevo };
    const evento = eventoDeProyecto(
      {
        actor,
        proyecto: nuevo,
        tipo_accion,
        cambios: [cambio('estado', proyecto.estado, nuevo.estado)],
        nota: textoGuardado(v.nota),
      },
      marca,
      e.generarId,
    );
    const avisos = crearNotificaciones(
      {
        autor: autorDe(actor.id),
        destinatarios: equipoDelProyecto(datos, nuevo),
        tipo: tipo_aviso,
        mensaje: `El proyecto ${nuevo.nombre} fue ${verbo}.`,
        elemento: { tipo: 'PROYECTO', id: nuevo.id },
      },
      datos.usuarios,
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: nuevo,
      cambios: conEfectos(
        datos,
        { proyectos: reemplazarProyecto(datos.proyectos, nuevo) },
        { eventos: [evento], notificaciones: avisos },
      ),
    };
  });
}

export function pausarProyecto(
  entrada: EntradaCambiarEstadoProyecto,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Proyecto>> {
  return cambiarEstado(
    puedePausarProyecto,
    'PROYECTO_PAUSADO',
    'PROYECTO_PAUSADO',
    'pausado',
    entrada,
    entorno,
  );
}

export function reanudarProyecto(
  entrada: EntradaCambiarEstadoProyecto,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Proyecto>> {
  return cambiarEstado(
    puedeReanudarProyecto,
    'PROYECTO_REANUDADO',
    'PROYECTO_REANUDADO',
    'reanudado',
    entrada,
    entorno,
  );
}

// ── Finalizar ────────────────────────────────────────────────────────────────────────────────

export interface ProyectoFinalizado {
  proyecto: Proyecto;
  tareas_liberadas: string[];
}

export function finalizarProyecto(
  entrada: EntradaCambiarEstadoProyecto,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<ProyectoFinalizado>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaEstado, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const contexto = cargarContextoProyecto(datos, v.idActor, v.idProyecto);
    if (!contexto.ok) return contexto;
    const { actor, proyecto } = contexto.valor;

    // Quién, estado, tareas esperando supervisión (con su cantidad) y nota vacía: todo en `domain/`.
    const regla = reglaFinalizarProyecto(actor, proyecto, datos.tareas, marca.ahora, {
      nota: v.nota,
    });
    if (!regla.ok) return denegarCicloVida(regla);
    const sinTexto = exigirTexto(regla.exige_texto, v.nota);
    if (sinTexto !== null) return sinTexto;

    const nota = textoGuardado(v.nota);
    const autor = autorDe(actor.id);
    const nuevo: Proyecto = {
      ...proyecto,
      estado: 'FINALIZADO',
      fecha_fin_real: regla.efectos.fecha_fin_real,
    };
    const liberadas = liberarTareasDe(
      { actor, ids: regla.efectos.tareas_a_liberar, nota },
      datos,
      marca,
      e.generarId,
    );

    const eventos: EventoHistorial[] = [
      eventoDeProyecto(
        {
          actor,
          proyecto: nuevo,
          tipo_accion: 'PROYECTO_FINALIZADO',
          cambios: [
            cambio('estado', proyecto.estado, nuevo.estado),
            cambio('fecha_fin_real', proyecto.fecha_fin_real, nuevo.fecha_fin_real),
          ],
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
          destinatarios: equipoDelProyecto(datos, nuevo),
          tipo: 'PROYECTO_FINALIZADO',
          mensaje: `El proyecto ${nuevo.nombre} fue finalizado.`,
          elemento: { tipo: 'PROYECTO', id: nuevo.id },
        },
        datos.usuarios,
        marca,
        e.generarId,
      ),
      // Quien tenía una tarea en progreso se entera de que la liberaron (§8.1).
      ...liberadas.flatMap((l) =>
        l.antes.id_practicante === null
          ? []
          : crearNotificaciones(
              {
                autor,
                destinatarios: [l.antes.id_practicante],
                tipo: 'TAREA_LIBERADA',
                mensaje: `Liberaron tu tarea ${referenciaTarea(nuevo, l.despues)}.`,
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
      valor: { proyecto: nuevo, tareas_liberadas: liberadas.map((l) => l.despues.id) },
      cambios: conEfectos(
        datos,
        {
          proyectos: reemplazarProyecto(datos.proyectos, nuevo),
          ...(liberadas.length > 0 ? { tareas: conTareasLiberadas(datos.tareas, liberadas) } : {}),
        },
        { eventos, notificaciones: avisos },
      ),
    };
  });
}

// ── Reactivar ────────────────────────────────────────────────────────────────────────────────

export function reactivarProyecto(
  entrada: EntradaCambiarEstadoProyecto,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Proyecto>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaEstado, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const contexto = cargarContextoProyecto(datos, v.idActor, v.idProyecto);
    if (!contexto.ok) return contexto;
    const { actor, proyecto } = contexto.valor;

    const supervisor = datos.usuarios.find((u) => u.id === proyecto.id_supervisor);
    const regla = puedeReactivarProyecto(actor, proyecto, supervisor, { nota: v.nota });
    if (!regla.ok) return denegarCicloVida(regla);
    const sinTexto = exigirTexto(regla.exige_texto, v.nota);
    if (sinTexto !== null) return sinTexto;

    const nuevo: Proyecto = { ...proyecto, estado: regla.estado_nuevo, fecha_fin_real: null };
    const evento = eventoDeProyecto(
      {
        actor,
        proyecto: nuevo,
        tipo_accion: 'PROYECTO_REACTIVADO',
        cambios: [
          cambio('estado', proyecto.estado, nuevo.estado),
          cambio('fecha_fin_real', proyecto.fecha_fin_real, nuevo.fecha_fin_real),
        ],
        nota: textoGuardado(v.nota),
      },
      marca,
      e.generarId,
    );
    // G2-A: sin aviso. Las asignaciones nunca se cerraron, así que el equipo recupera su acceso solo.
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

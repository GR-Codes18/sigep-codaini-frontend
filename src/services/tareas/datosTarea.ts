/**
 * Servicios de los datos de una tarea: crear, editar y eliminar (Fase 2, paso 5A).
 *
 * Cada uno sigue el contrato del paso 4: `servicio(entrada, entorno = ENTORNO)`, todo dentro de
 * `ejecutarServicio` (demora → transacción → resultado) y con una sola marca de tiempo.
 * Ninguno avisa al crear ni al eliminar (§8.1); editar avisa al responsable si la tarea está
 * EN_PROGRESO (§6.4).
 */

import { z } from 'zod';
import {
  puede,
  puedeEditarDatosTarea,
  puedeEliminarTarea,
  siguienteNumeroTarea,
  type Id,
  type Tarea,
} from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { cambio, diferencias } from '../historial';
import { crearNotificaciones } from '../notificaciones';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { conEfectos, ejecutarServicio } from '../transaccional';
import {
  cargarContextoProyecto,
  cargarContextoTarea,
  esquemaDescripcion,
  esquemaFechaLimite,
  esquemaId,
  esquemaTextoOpcional,
  esquemaTitulo,
  eventoDeTarea,
  exigirTexto,
  referenciaTarea,
  reemplazarTarea,
  textoGuardado,
} from './comun';

// ── Crear ────────────────────────────────────────────────────────────────────────────────────

const esquemaCrear = z.object({
  idActor: esquemaId,
  idProyecto: esquemaId,
  titulo: esquemaTitulo,
  descripcion: esquemaDescripcion,
  fecha_limite: esquemaFechaLimite,
  /** Nace desactivada (§6.3). */
  requiere_supervision: z.boolean().default(false),
  /** Nace activado (§7.5); Administrador y Supervisor pueden desactivarlo al crear. */
  requiere_pr: z.boolean().default(true),
});

export type EntradaCrearTarea = z.input<typeof esquemaCrear>;

/**
 * Crea una tarea DISPONIBLE y sin responsable. El `numero` sale de `siguienteNumeroTarea` y el
 * nuevo `ultimo_numero_tarea` del proyecto se guarda en la **misma** operación: si una de las dos
 * escrituras fallara, no queda la otra (pendiente del paso 6 de la Fase 1).
 */
export function crearTarea(
  entrada: EntradaCrearTarea,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Tarea>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaCrear, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;

    const contexto = cargarContextoProyecto(datos, v.idActor, v.idProyecto);
    if (!contexto.ok) return contexto;
    const { actor, proyecto } = contexto.valor;

    // Rol, alcance, usuario activo y proyecto FINALIZADO. EN_PAUSA no impide crear.
    const permiso = puede(actor, 'CREAR_TAREA', { proyecto });
    if (!permiso.permitido) return denegar(permiso);

    const numero = siguienteNumeroTarea(proyecto);
    if (!numero.ok) return denegar(numero);

    const tarea: Tarea = {
      id: e.generarId('tar'),
      numero: numero.numero,
      titulo: v.titulo,
      descripcion: v.descripcion,
      fecha_limite: v.fecha_limite,
      id_proyecto: proyecto.id,
      id_practicante: null,
      estado: 'DISPONIBLE',
      requiere_supervision: v.requiere_supervision,
      requiere_pr: v.requiere_pr,
      estado_pr: null,
      rama_origen: null,
      rama_base: null,
      url_pull_request: null,
      fecha_termino: null,
    };
    const evento = eventoDeTarea(
      {
        actor,
        proyecto,
        tarea,
        tipo_accion: 'TAREA_CREADA',
        cambios: [cambio('estado', null, 'DISPONIBLE')],
      },
      marca,
      e.generarId,
    );

    return {
      ok: true,
      valor: tarea,
      cambios: conEfectos(
        datos,
        {
          tareas: [...datos.tareas, tarea],
          proyectos: datos.proyectos.map((p) =>
            p.id === proyecto.id ? { ...p, ultimo_numero_tarea: numero.ultimo_numero_tarea } : p,
          ),
        },
        { eventos: [evento] },
      ),
    };
  });
}

// ── Editar ───────────────────────────────────────────────────────────────────────────────────

const esquemaEditar = z.object({
  idActor: esquemaId,
  idTarea: esquemaId,
  titulo: esquemaTitulo,
  descripcion: esquemaDescripcion,
  fecha_limite: esquemaFechaLimite,
});

export type EntradaEditarTarea = z.input<typeof esquemaEditar>;

/** Campos que se editan juntos (§6.4); `diferencias` decide cuáles cambiaron. */
const CAMPOS_EDITABLES = ['titulo', 'descripcion', 'fecha_limite'] as const;

/**
 * Edita título, descripción y fecha límite (solo DISPONIBLE o EN_PROGRESO). El formulario envía
 * los tres campos; si ninguno cambia, `SIN_CAMBIOS` y no se escribe nada. Con la tarea EN_PROGRESO
 * se avisa al responsable.
 */
export function editarTarea(
  entrada: EntradaEditarTarea,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Tarea>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaEditar, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;

    const contexto = cargarContextoTarea(datos, v.idActor, v.idTarea);
    if (!contexto.ok) return contexto;
    const { actor, tarea, proyecto, asignaciones } = contexto.valor;

    const permiso = puedeEditarDatosTarea(tarea, actor, { proyecto, asignaciones });
    if (!permiso.permitido) return denegar(permiso);

    const nueva: Tarea = {
      ...tarea,
      titulo: v.titulo,
      descripcion: v.descripcion,
      fecha_limite: v.fecha_limite,
    };
    const cambios = diferencias(tarea, nueva, CAMPOS_EDITABLES);
    if (cambios.length === 0) return fallo('SIN_CAMBIOS');

    const evento = eventoDeTarea(
      { actor, proyecto, tarea: nueva, tipo_accion: 'TAREA_EDITADA', cambios },
      marca,
      e.generarId,
    );
    const avisos =
      permiso.avisar_responsable && tarea.id_practicante !== null
        ? crearNotificaciones(
            {
              autor: evento.autor,
              destinatarios: [tarea.id_practicante],
              tipo: 'TAREA_EDITADA_EN_PROGRESO',
              mensaje: `Editaron tu tarea ${referenciaTarea(proyecto, nueva)} mientras estaba en progreso.`,
              elemento: { tipo: 'TAREA', id: tarea.id },
            },
            datos.usuarios,
            marca,
            e.generarId,
          )
        : [];

    return {
      ok: true,
      valor: nueva,
      cambios: conEfectos(
        datos,
        { tareas: reemplazarTarea(datos.tareas, nueva) },
        { eventos: [evento], notificaciones: avisos },
      ),
    };
  });
}

// ── Eliminar ─────────────────────────────────────────────────────────────────────────────────

const esquemaEliminar = z.object({
  idActor: esquemaId,
  idTarea: esquemaId,
  motivo: esquemaTextoOpcional,
});

export type EntradaEliminarTarea = z.input<typeof esquemaEliminar>;

/**
 * Elimina una tarea DISPONIBLE que nunca tuvo PR, con motivo (§6.4). Es la única excepción a «nada
 * se borra»: la tarea sale de `tareas`, el evento conserva la copia del ID y del título y
 * `ultimo_numero_tarea` no cambia, así que su número no se reutiliza.
 */
export function eliminarTarea(
  entrada: EntradaEliminarTarea,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<{ id: Id }>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaEliminar, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;

    const contexto = cargarContextoTarea(datos, v.idActor, v.idTarea);
    if (!contexto.ok) return contexto;
    const { actor, tarea, proyecto, asignaciones } = contexto.valor;

    // `puede()` → estado → PR → motivo vacío.
    const permiso = puedeEliminarTarea(tarea, actor, { proyecto, asignaciones }, v.motivo);
    if (!permiso.permitido) return denegar(permiso);
    // Motivo ausente: `domain/` lo deja pasar, el servicio no.
    const sinTexto = exigirTexto(permiso.exige_texto, v.motivo);
    if (sinTexto !== null) return sinTexto;

    const evento = eventoDeTarea(
      {
        actor,
        proyecto,
        tarea,
        tipo_accion: 'TAREA_ELIMINADA',
        cambios: [cambio('estado', 'DISPONIBLE', null)],
        nota: textoGuardado(v.motivo),
      },
      marca,
      e.generarId,
    );

    return {
      ok: true,
      valor: { id: tarea.id },
      cambios: conEfectos(
        datos,
        { tareas: datos.tareas.filter((t) => t.id !== tarea.id) },
        { eventos: [evento] },
      ),
    };
  });
}

/**
 * Piezas comunes de los servicios de proyectos (Fase 2, paso 9).
 *
 * Orden de comprobación: Zod (forma) → actor → proyecto → `puede()` → reglas propias → «sin cambios» → una sola
 * escritura. Un proyecto FINALIZADO sigue admitiendo cambiar sus datos, la reunión, la rama base y los enlaces
 * (la guarda de finalizado de `puede()` es solo de las acciones de tareas).
 */

import type { DatosAlmacen } from '@/data';
import type {
  CambioRegistrado,
  DiaSemana,
  EventoHistorial,
  Hora,
  Id,
  Proyecto,
  TipoAccionHistorial,
  Usuario,
} from '@/domain';
import { obtenerActor } from '../actor';
import { etiquetaProyecto } from '../etiquetas';
import { autorDe, crearEvento } from '../historial';
import type { Marca } from '../marca';
import { exito, fallo, type Resultado } from '../resultado';

export interface ContextoProyecto {
  actor: Usuario;
  proyecto: Proyecto;
}

/** Actor → proyecto. Un proyecto que no existe es `NO_ENCONTRADO`. */
export function cargarContextoProyecto(
  datos: Pick<DatosAlmacen, 'usuarios' | 'proyectos'>,
  idActor: Id,
  idProyecto: Id,
): Resultado<ContextoProyecto> {
  const actor = obtenerActor(datos, idActor);
  if (!actor.ok) return actor;
  const proyecto = datos.proyectos.find((p) => p.id === idProyecto);
  if (proyecto === undefined) return fallo('NO_ENCONTRADO');
  return exito({ actor: actor.valor, proyecto });
}

/**
 * El equipo que recibe los avisos del proyecto (§8.1): su supervisor y los practicantes **activos** con una
 * asignación vigente. Sin repetidos. `crearNotificaciones` descarta después a quien hizo la acción.
 */
export function equipoDelProyecto(
  datos: Pick<DatosAlmacen, 'usuarios' | 'asignaciones'>,
  proyecto: Pick<Proyecto, 'id' | 'id_supervisor'>,
): Id[] {
  const activos = new Set(datos.usuarios.filter((u) => u.estado === 'ACTIVO').map((u) => u.id));
  const practicantes = datos.asignaciones
    .filter((a) => a.id_proyecto === proyecto.id && a.fecha_baja === null)
    .map((a) => a.id_practicante)
    .filter((id) => activos.has(id));
  return [...new Set([proyecto.id_supervisor, ...practicantes])];
}

const NOMBRES_DIA: Record<DiaSemana, string> = {
  LUNES: 'lunes',
  MARTES: 'martes',
  MIERCOLES: 'miércoles',
  JUEVES: 'jueves',
  VIERNES: 'viernes',
  SABADO: 'sábado',
  DOMINGO: 'domingo',
};

/** «lunes a las 10:00»; `null` si la reunión no está definida. */
export function textoReunion(dia: DiaSemana | null, hora: Hora | null): string | null {
  if (dia === null || hora === null) return null;
  return `${NOMBRES_DIA[dia]} a las ${hora}`;
}

export interface EntradaEventoProyecto {
  actor: Pick<Usuario, 'id'>;
  /** El proyecto como queda (su código y nombre van en la etiqueta del evento). */
  proyecto: Pick<Proyecto, 'id' | 'codigo' | 'nombre'>;
  tipo_accion: TipoAccionHistorial;
  cambios?: readonly CambioRegistrado[];
  nota?: string | null;
}

/** Evento de un proyecto: autor, etiqueta `CODIGO · Nombre` e `id_proyecto` siempre presentes. */
export function eventoDeProyecto(
  entrada: EntradaEventoProyecto,
  marca: Marca,
  generarId: (prefijo: string) => Id,
): EventoHistorial {
  return crearEvento(
    {
      autor: autorDe(entrada.actor.id),
      tipo_accion: entrada.tipo_accion,
      elemento: {
        tipo: 'PROYECTO',
        id: entrada.proyecto.id,
        etiqueta: etiquetaProyecto(entrada.proyecto),
      },
      id_proyecto: entrada.proyecto.id,
      cambios: entrada.cambios ?? [],
      nota: entrada.nota ?? null,
    },
    marca,
    generarId,
  );
}

/** Lista nueva con el proyecto reemplazado. No cambia la original. */
export function reemplazarProyecto(proyectos: readonly Proyecto[], nuevo: Proyecto): Proyecto[] {
  return proyectos.map((p) => (p.id === nuevo.id ? nuevo : p));
}

/**
 * Piezas comunes de los servicios de practicantes (Fase 2, paso 8A; propuesta §5.2 y §5.4).
 *
 * Orden de comprobación de todos: Zod (forma) → actor → proyecto o persona → regla de `domain/`
 * (`puede()` incluido) → texto ausente → reglas propias → una sola escritura.
 *
 * `liberarTareasDe` es la liberación de tareas que comparten **quitar a un practicante de un proyecto** y
 * **finalizar su práctica**: la tarea pasa de EN_PROGRESO a DISPONIBLE sin responsable y deja un
 * `TAREA_LIBERADA` por cada una, con el mismo contenido que el de `liberarTarea` (estado y responsable).
 */

import type { DatosAlmacen } from '@/data';
import type { EventoHistorial, Id, Proyecto, Tarea, Usuario } from '@/domain';
import { cambio } from '../historial';
import type { Marca } from '../marca';
import { fallo, type Resultado, exito } from '../resultado';
import { eventoDeTarea } from '../tareas/comun';

export interface TareaLiberada {
  antes: Tarea;
  despues: Tarea;
  proyecto: Proyecto;
  evento: EventoHistorial;
}

/** La persona con ese `id`; si no existe, `NO_ENCONTRADO`. No mira su rol: eso lo decide `domain/`. */
export function cargarPersona(
  datos: Pick<DatosAlmacen, 'usuarios'>,
  idPersona: Id,
): Resultado<Usuario> {
  const persona = datos.usuarios.find((u) => u.id === idPersona);
  return persona === undefined ? fallo('NO_ENCONTRADO') : exito(persona);
}

/**
 * Libera las tareas indicadas (las que `domain/` dijo que hay que liberar). Un id que no existe o una tarea
 * sin proyecto son datos rotos: lanzan y, como van dentro de la transacción, no se escribe nada.
 */
export function liberarTareasDe(
  entrada: {
    actor: Pick<Usuario, 'id'>;
    ids: readonly Id[];
    nota: string | null;
  },
  datos: Pick<DatosAlmacen, 'tareas' | 'proyectos' | 'usuarios'>,
  marca: Marca,
  generarId: (prefijo: string) => Id,
): TareaLiberada[] {
  return entrada.ids.map((id) => {
    const antes = datos.tareas.find((t) => t.id === id);
    if (antes === undefined) throw new Error(`No existe la tarea ${id} que había que liberar.`);
    const proyecto = datos.proyectos.find((p) => p.id === antes.id_proyecto);
    if (proyecto === undefined) throw new Error(`La tarea ${id} no tiene proyecto.`);
    const responsable = datos.usuarios.find((u) => u.id === antes.id_practicante);
    if (responsable === undefined) throw new Error(`La tarea ${id} no tiene responsable.`);

    const despues: Tarea = { ...antes, estado: 'DISPONIBLE', id_practicante: null };
    const evento = eventoDeTarea(
      {
        actor: entrada.actor,
        proyecto,
        tarea: despues,
        tipo_accion: 'TAREA_LIBERADA',
        cambios: [
          cambio('estado', antes.estado, despues.estado),
          cambio('responsable', responsable.nombre, null),
        ],
        nota: entrada.nota,
      },
      marca,
      generarId,
    );
    return { antes, despues, proyecto, evento };
  });
}

/** Lista nueva con las tareas liberadas en su lugar. No cambia la original. */
export function conTareasLiberadas(
  tareas: readonly Tarea[],
  liberadas: readonly TareaLiberada[],
): Tarea[] {
  const porId = new Map(liberadas.map((l) => [l.despues.id, l.despues]));
  return tareas.map((t) => porId.get(t.id) ?? t);
}

import { puede, type Proyecto, type Tarea, type Usuario } from '@/domain';
import type { DatosAlmacen } from '@/data';

export interface ResponsabilidadPerfil {
  id: string;
  titulo: string;
  estado: Tarea['estado'];
  fechaLimite: string;
  codigoProyecto: string;
  nombreProyecto: string;
}

export function responsabilidadesPendientes(
  usuario: Usuario,
  datos: Pick<DatosAlmacen, 'asignaciones' | 'proyectos' | 'tareas'>,
): ResponsabilidadPerfil[] {
  const asignacionesUsuario = datos.asignaciones.filter(
    (asignacion) => asignacion.id_practicante === usuario.id,
  );
  const proyectos = datos.proyectos.filter(
    (proyecto) =>
      proyecto.estado !== 'FINALIZADO' &&
      puede(usuario, 'VER_PROYECTO', { proyecto, asignaciones: asignacionesUsuario }).permitido,
  );
  const proyectosPorId = new Map<string, Proyecto>(
    proyectos.map((proyecto) => [proyecto.id, proyecto]),
  );

  return datos.tareas
    .filter((tarea) => {
      if (tarea.estado === 'TERMINADA') return false;
      if (usuario.rol === 'PRACTICANTE' && tarea.id_practicante !== usuario.id) return false;
      const proyecto = proyectosPorId.get(tarea.id_proyecto);
      return (
        proyecto !== undefined &&
        puede(usuario, 'VER_TAREA', {
          proyecto,
          tarea,
          asignaciones: asignacionesUsuario,
        }).permitido
      );
    })
    .map((tarea) => {
      const proyecto = proyectosPorId.get(tarea.id_proyecto);
      if (!proyecto) throw new Error(`No se encontró el proyecto de la tarea ${tarea.id}.`);
      return {
        id: tarea.id,
        titulo: tarea.titulo,
        estado: tarea.estado,
        fechaLimite: tarea.fecha_limite,
        codigoProyecto: proyecto.codigo,
        nombreProyecto: proyecto.nombre,
      };
    })
    .sort(
      (a, b) =>
        a.codigoProyecto.localeCompare(b.codigoProyecto) ||
        a.fechaLimite.localeCompare(b.fechaLimite) ||
        a.titulo.localeCompare(b.titulo),
    );
}

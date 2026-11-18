import { parseISO } from 'date-fns';
import type { DatosAlmacen } from '@/data';
import type { Id, Notificacion, Rol } from '@/domain';
import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';
import type { NotificacionItem } from '@/compartido/CampanaNotificaciones';

function existeElemento(datos: DatosAlmacen, notificacion: Notificacion): boolean {
  const id = notificacion.elemento.id;
  switch (notificacion.elemento.tipo) {
    case 'USUARIO':
      return datos.usuarios.some((item) => item.id === id);
    case 'PROYECTO':
      return datos.proyectos.some((item) => item.id === id);
    case 'TAREA':
      return datos.tareas.some((item) => item.id === id);
    case 'POSTULANTE':
      return datos.postulantes.some((item) => item.id === id);
    case 'AREA_TECNICA':
      return datos.areas_tecnicas.some((item) => item.id === id);
    case 'ESPECIALIDAD':
      return datos.especialidades.some((item) => item.id === id);
    case 'CRITERIO_EVALUACION':
      return datos.criterios.some((item) => item.id === id);
    case 'PARAMETRO_CONFIGURACION':
      return datos.parametros.some((item) => item.id === id);
  }
}

function rutaElemento(
  datos: DatosAlmacen,
  notificacion: Notificacion,
  idUsuario: Id,
  rol: Rol,
): string | undefined {
  const prefijo = PREFIJO_POR_ROL[rol];
  switch (notificacion.elemento.tipo) {
    case 'TAREA': {
      const tarea = datos.tareas.find((item) => item.id === notificacion.elemento.id);
      if (!tarea) return undefined;
      if (tarea.id_proyecto === 'pry-pl2d') return `${prefijo}/desarrollo`;
      return rol === 'PRACTICANTE' ? `${prefijo}/proyectos` : `${prefijo}/tareas`;
    }
    case 'PROYECTO':
      return `${prefijo}/proyectos`;
    case 'USUARIO':
      if (notificacion.elemento.id === idUsuario) return `${prefijo}/perfil`;
      return rol === 'PRACTICANTE' ? undefined : `${prefijo}/practicantes`;
    case 'POSTULANTE':
      return rol === 'ADMINISTRADOR' ? `${prefijo}/postulaciones` : undefined;
    case 'PARAMETRO_CONFIGURACION':
      return rol === 'ADMINISTRADOR' ? `${prefijo}/configuracion` : undefined;
    case 'AREA_TECNICA':
    case 'ESPECIALIDAD':
    case 'CRITERIO_EVALUACION':
      return undefined;
  }
}

export function notificacionesParaVista(
  datos: DatosAlmacen,
  idUsuario: Id,
  rol: Rol,
): NotificacionItem[] {
  return datos.notificaciones
    .filter((notificacion) => notificacion.id_destinatario === idUsuario)
    .map((notificacion) => ({
      id: notificacion.id,
      texto: notificacion.mensaje,
      fecha: parseISO(notificacion.fecha),
      leida: notificacion.leida,
      ruta: rutaElemento(datos, notificacion, idUsuario, rol),
      existe: existeElemento(datos, notificacion),
    }));
}

import { parseISO } from 'date-fns';
import type { Id, Rol, TipoElemento } from '@/domain';
import { INICIO_POR_ROL, PREFIJO_POR_ROL } from '@/auth/rutasPorRol';
import type { NotificacionItem } from '@/compartido/CampanaNotificaciones';
import type { NotificacionVista } from '@/services';

/**
 * A qué página lleva el enlace de un aviso (decisión D4-A). Mientras los módulos de los paneles no tengan
 * pantalla de detalle, cada tipo de elemento lleva a la página de su módulo; cuando exista el detalle, se afina
 * aquí sin tocar los componentes. Es un dato, no una regla: qué elemento puede abrir cada persona lo decide la
 * consulta (`destino` y `enlace_activo`). Un tipo sin entrada cae al inicio del rol.
 */
export const RUTA_DE_MODULO: Record<Rol, Partial<Record<TipoElemento, string>>> = {
  ADMINISTRADOR: {
    TAREA: '/tareas',
    PROYECTO: '/proyectos',
    USUARIO: '/practicantes',
    POSTULANTE: '/postulaciones',
    // Los criterios, áreas y especialidades se gestionan dentro de Postulaciones (§5.1).
    AREA_TECNICA: '/postulaciones',
    ESPECIALIDAD: '/postulaciones',
    CRITERIO_EVALUACION: '/postulaciones',
    PARAMETRO_CONFIGURACION: '/configuracion',
  },
  SUPERVISOR: {
    TAREA: '/tareas',
    PROYECTO: '/proyectos',
    USUARIO: '/practicantes',
  },
  PRACTICANTE: {
    TAREA: '/proyectos',
    PROYECTO: '/proyectos',
  },
};

/**
 * Los elementos que ya tienen página de detalle, por rol: el enlace del aviso lleva a ella y no a la página del módulo.
 * Cuando existan los demás detalles (Fases 5 a 7) se suman aquí.
 */
export const RUTA_DE_DETALLE: Record<Rol, Partial<Record<TipoElemento, (id: Id) => string>>> = {
  ADMINISTRADOR: {
    POSTULANTE: (id) => `/postulaciones/${id}`,
    // El catálogo de evaluación se gestiona en una sola página: no hay detalle por elemento.
    AREA_TECNICA: () => '/postulaciones/criterios',
    ESPECIALIDAD: () => '/postulaciones/criterios',
    CRITERIO_EVALUACION: () => '/postulaciones/criterios',
  },
  SUPERVISOR: {},
  PRACTICANTE: {},
};

/** El aviso trata de la propia cuenta: lleva a Mi perfil, igual para los tres roles. */
export const RUTA_MI_PERFIL = '/perfil';

export interface ContextoNotificacion {
  idUsuario: Id;
  rol: Rol;
}

/** Ruta del enlace de un aviso, o `undefined` si el enlace está desactivado (`destino` nulo). */
export function rutaDeNotificacion(
  notificacion: Pick<NotificacionVista, 'destino' | 'elemento'>,
  { idUsuario, rol }: ContextoNotificacion,
): string | undefined {
  if (notificacion.destino === null) return undefined;
  const { tipo, id } = notificacion.elemento;
  const prefijo = PREFIJO_POR_ROL[rol];
  if (tipo === 'USUARIO' && id === idUsuario) return `${prefijo}${RUTA_MI_PERFIL}`;
  const detalle = RUTA_DE_DETALLE[rol][tipo];
  if (detalle !== undefined) return `${prefijo}${detalle(id)}`;
  const modulo = RUTA_DE_MODULO[rol][tipo];
  return modulo === undefined ? INICIO_POR_ROL[rol] : `${prefijo}${modulo}`;
}

/** Un aviso de `listarNotificaciones` a la fila de la campana y de «Ver todas». */
export function aNotificacionItem(
  notificacion: NotificacionVista,
  contexto: ContextoNotificacion,
): NotificacionItem {
  const ruta = rutaDeNotificacion(notificacion, contexto);
  return {
    id: notificacion.id,
    texto: notificacion.mensaje,
    fecha: parseISO(notificacion.fecha),
    leida: notificacion.leida,
    ...(ruta !== undefined ? { ruta } : {}),
    existe: notificacion.enlace_activo,
  };
}

import type { PestanaPostulaciones } from '../postulaciones/filtros';
import { RUTA_POSTULACIONES } from '../postulaciones/rutas';
import type { PestanaPracticantes } from '../practicantes/filtros';
import { RUTA_PRACTICANTES } from '../practicantes/rutas';
import type { PestanaProyectos } from '../proyectos/filtros';
import { RUTA_PROYECTOS } from '../proyectos/rutas';
import type { PestanaTareas } from '../tareas/filtros';
import { RUTA_TAREAS } from '../tareas/rutas';

/** Un módulo con su pestaña ya elegida; `T` es el tipo de pestañas de ese módulo, y el compilador comprueba que exista. */
export function conPestana<T extends string>(ruta: string, pestana: T): string {
  return `${ruta}?pestana=${pestana}`;
}

/**
 * Los enlaces de las tarjetas del Dashboard (§5.9): cada una lleva al módulo con el filtro ya aplicado. Los listados de
 * los módulos 5.1 a 5.5 leen la pestaña de `?pestana=`.
 */
export const ENLACES_DASHBOARD = {
  postulacionesPendientes: conPestana<PestanaPostulaciones>(RUTA_POSTULACIONES, 'PENDIENTES'),
  postulacionesRequierenRevision: conPestana<PestanaPostulaciones>(
    RUTA_POSTULACIONES,
    'REQUIEREN_REVISION',
  ),
  proyectosActivos: conPestana<PestanaProyectos>(RUTA_PROYECTOS, 'ACTIVO'),
  proyectosEnPausa: conPestana<PestanaProyectos>(RUTA_PROYECTOS, 'EN_PAUSA'),
  practicantesActivos: conPestana<PestanaPracticantes>(RUTA_PRACTICANTES, 'ACTIVOS'),
  practicantesSinProyecto: conPestana<PestanaPracticantes>(RUTA_PRACTICANTES, 'SIN_PROYECTO'),
  tareasEsperando: conPestana<PestanaTareas>(RUTA_TAREAS, 'ESPERANDO_SUPERVISION'),
} as const;

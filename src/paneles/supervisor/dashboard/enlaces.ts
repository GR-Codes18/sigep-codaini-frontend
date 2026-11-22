import { conPestana } from '@/paneles/administrador/dashboard/enlaces';
import type { PestanaProyectos } from '@/paneles/administrador/proyectos/filtros';
import { rutaDeProyectos } from '@/paneles/administrador/proyectos/rutas';
import type { PestanaTareas } from '@/paneles/administrador/tareas/filtros';
import { rutaDeTareas } from '@/paneles/administrador/tareas/rutas';
import { RUTA_PRACTICANTES_A_CARGO } from '../practicantes/rutas';

const TAREAS = rutaDeTareas('SUPERVISOR');
const PROYECTOS = rutaDeProyectos('SUPERVISOR');

/**
 * Los enlaces de las tarjetas del Dashboard del Supervisor (§9.1.5): cada una lleva al módulo con el filtro ya aplicado.
 * Tareas lee `?pestana=`, `?vencidas=1` y `?sin_asignar=1`, y Mis proyectos lee `?pestana=`; un valor que no entiendan se
 * ignora. «Practicantes a cargo» abre en «Activos». Las cifras «con N días o más de espera» y «sin tareas en progreso» no
 * tienen filtro propio en ningún módulo y quedan como texto.
 */
export const ENLACES_DASHBOARD_SUPERVISOR = {
  tareasEsperando: conPestana<PestanaTareas>(TAREAS, 'ESPERANDO_SUPERVISION'),
  proyectosActivos: conPestana<PestanaProyectos>(PROYECTOS, 'ACTIVO'),
  proyectosEnPausa: conPestana<PestanaProyectos>(PROYECTOS, 'EN_PAUSA'),
  practicantes: RUTA_PRACTICANTES_A_CARGO,
  tareasVencidas: `${conPestana<PestanaTareas>(TAREAS, 'TODAS')}&vencidas=1`,
  tareasVencidasSinAsignar: `${conPestana<PestanaTareas>(TAREAS, 'TODAS')}&vencidas=1&sin_asignar=1`,
} as const;

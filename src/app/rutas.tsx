import type { ReactElement } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { GuardaRuta } from '@/auth/GuardaRuta';
import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';
import type { Rol } from '@/auth/tipos';
import { LayoutPanel } from '@/app/layout/LayoutPanel';
import { PaginaVacia } from '@/app/layout/PaginaVacia';
import { MENU_POR_ROL } from '@/app/menus';
import { PaginaDesarrollo } from '@/app/desarrollo/PaginaDesarrollo';
import { PaginaNotificaciones } from '@/app/layout/PaginaNotificaciones';
import { PaginaPerfil } from '@/app/perfil/PaginaPerfil';
import { AccesoSiNoHaySesion, RaizSegunSesion } from '@/app/RedireccionesSesion';
import { PaginaCriterios } from '@/paneles/administrador/postulaciones/PaginaCriterios';
import { PaginaDetallePostulacion } from '@/paneles/administrador/postulaciones/PaginaDetallePostulacion';
import { PaginaPostulaciones } from '@/paneles/administrador/postulaciones/PaginaPostulaciones';
import { RUTA_CRITERIOS, RUTA_POSTULACIONES } from '@/paneles/administrador/postulaciones/rutas';
import { PaginaDetalleTarea } from '@/paneles/administrador/tareas/PaginaDetalleTarea';
import { PaginaTareas } from '@/paneles/administrador/tareas/PaginaTareas';
import { RUTA_TAREAS, rutaDeTareas } from '@/paneles/administrador/tareas/rutas';
import { PaginaDashboardSupervisor } from '@/paneles/supervisor/dashboard/PaginaDashboardSupervisor';
import { RUTA_DASHBOARD_SUPERVISOR } from '@/paneles/supervisor/dashboard/rutas';
import { PaginaDetallePracticanteACargo } from '@/paneles/supervisor/practicantes/PaginaDetallePracticanteACargo';
import { PaginaPracticantesACargo } from '@/paneles/supervisor/practicantes/PaginaPracticantesACargo';
import { RUTA_PRACTICANTES_A_CARGO } from '@/paneles/supervisor/practicantes/rutas';
import { PaginaMisProyectos } from '@/paneles/supervisor/proyectos/PaginaMisProyectos';
import { RUTA_MIS_PROYECTOS } from '@/paneles/supervisor/proyectos/rutas';
import { PaginaDashboard } from '@/paneles/administrador/dashboard/PaginaDashboard';
import { RUTA_DASHBOARD } from '@/paneles/administrador/dashboard/rutas';
import { PaginaConfiguracion } from '@/paneles/administrador/configuracion/PaginaConfiguracion';
import { RUTA_CONFIGURACION } from '@/paneles/administrador/configuracion/rutas';
import { PaginaHistorial } from '@/paneles/administrador/historial/PaginaHistorial';
import { RUTA_HISTORIAL } from '@/paneles/administrador/historial/rutas';
import { PaginaReportes } from '@/paneles/administrador/reportes/PaginaReportes';
import { RUTA_REPORTES, rutaDeReportes } from '@/paneles/administrador/reportes/rutas';
import { PaginaDetalleProyecto } from '@/paneles/administrador/proyectos/PaginaDetalleProyecto';
import { PaginaDetalleTareaDeProyecto } from '@/paneles/administrador/proyectos/PaginaDetalleTareaDeProyecto';
import { PaginaProyectos } from '@/paneles/administrador/proyectos/PaginaProyectos';
import { RUTA_PROYECTOS } from '@/paneles/administrador/proyectos/rutas';
import { PaginaDetallePracticante } from '@/paneles/administrador/practicantes/PaginaDetallePracticante';
import { PaginaPracticantes } from '@/paneles/administrador/practicantes/PaginaPracticantes';
import { RUTA_PRACTICANTES } from '@/paneles/administrador/practicantes/rutas';
import { PaginaDetalleSupervisor } from '@/paneles/administrador/supervisores/PaginaDetalleSupervisor';
import { PaginaSupervisores } from '@/paneles/administrador/supervisores/PaginaSupervisores';
import { RUTA_SUPERVISORES } from '@/paneles/administrador/supervisores/rutas';

/**
 * Los módulos que ya tienen pantalla, por la ruta de su ítem del menú. Los demás siguen con su página vacía hasta que se
 * construyan (Fases 5 a 7).
 */
const PAGINAS_DE_MODULO: Readonly<Record<string, ReactElement>> = {
  [RUTA_POSTULACIONES]: <PaginaPostulaciones />,
  [RUTA_PRACTICANTES]: <PaginaPracticantes />,
  [RUTA_SUPERVISORES]: <PaginaSupervisores />,
  [RUTA_PROYECTOS]: <PaginaProyectos />,
  [RUTA_TAREAS]: <PaginaTareas />,
  [RUTA_REPORTES]: <PaginaReportes />,
  [rutaDeReportes('SUPERVISOR')]: <PaginaReportes />,
  [RUTA_HISTORIAL]: <PaginaHistorial />,
  [RUTA_CONFIGURACION]: <PaginaConfiguracion />,
  [RUTA_DASHBOARD]: <PaginaDashboard />,
  [RUTA_DASHBOARD_SUPERVISOR]: <PaginaDashboardSupervisor />,
  [RUTA_MIS_PROYECTOS]: <PaginaMisProyectos />,
  [rutaDeTareas('SUPERVISOR')]: <PaginaTareas />,
  [RUTA_PRACTICANTES_A_CARGO]: <PaginaPracticantesACargo />,
};

/** Las páginas internas de un módulo (detalles), por la ruta que cuelga del módulo. */
const PAGINAS_INTERNAS: readonly RouteObject[] = [
  // La ruta fija «criterios» gana a `:idPostulante` (React Router da prioridad a los segmentos estáticos).
  { path: RUTA_CRITERIOS, element: <PaginaCriterios /> },
  { path: `${RUTA_POSTULACIONES}/:idPostulante`, element: <PaginaDetallePostulacion /> },
  { path: `${RUTA_PRACTICANTES}/:idPracticante`, element: <PaginaDetallePracticante /> },
  { path: `${RUTA_SUPERVISORES}/:idSupervisor`, element: <PaginaDetalleSupervisor /> },
  { path: `${RUTA_PROYECTOS}/:idProyecto`, element: <PaginaDetalleProyecto /> },
  { path: `${RUTA_TAREAS}/:idTarea`, element: <PaginaDetalleTarea /> },
  {
    path: `${RUTA_PROYECTOS}/:idProyecto/tareas/:idTarea`,
    element: <PaginaDetalleTareaDeProyecto />,
  },
  // El Supervisor usa el mismo detalle de proyecto (§9.1.1) bajo su prefijo; qué botones ve lo deciden las consultas.
  { path: `${rutaDeTareas('SUPERVISOR')}/:idTarea`, element: <PaginaDetalleTarea /> },
  // «Practicantes a cargo» (§9.1.2): el detalle del Supervisor es otra pantalla, de solo lectura.
  {
    path: `${RUTA_PRACTICANTES_A_CARGO}/:idPracticante`,
    element: <PaginaDetallePracticanteACargo />,
  },
  { path: `${RUTA_MIS_PROYECTOS}/:idProyecto`, element: <PaginaDetalleProyecto /> },
  {
    path: `${RUTA_MIS_PROYECTOS}/:idProyecto/tareas/:idTarea`,
    element: <PaginaDetalleTareaDeProyecto />,
  },
];

function rutasDeRol(rol: Rol): RouteObject[] {
  const items = MENU_POR_ROL[rol].flatMap((g) => g.items);
  const prefijo = PREFIJO_POR_ROL[rol];
  return [
    ...items.map((i) => ({
      path: i.ruta,
      element: PAGINAS_DE_MODULO[i.ruta] ?? <PaginaVacia titulo={i.etiqueta} />,
    })),
    ...PAGINAS_INTERNAS.filter((r) => r.path?.startsWith(`${prefijo}/`)),
    { path: `${prefijo}/perfil`, element: <PaginaPerfil /> },
    { path: `${prefijo}/notificaciones`, element: <PaginaNotificaciones /> },
    { path: `${prefijo}/desarrollo`, element: <PaginaDesarrollo /> },
  ];
}

const ROLES: Rol[] = ['ADMINISTRADOR', 'SUPERVISOR', 'PRACTICANTE'];

export const router = createBrowserRouter([
  { path: '/', element: <RaizSegunSesion /> },
  { path: '/acceso', element: <AccesoSiNoHaySesion /> },
  {
    element: <GuardaRuta />,
    children: [{ element: <LayoutPanel />, children: ROLES.flatMap(rutasDeRol) }],
  },
  { path: '*', element: <RaizSegunSesion /> },
]);

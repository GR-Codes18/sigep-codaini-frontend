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
import { PaginaDetallePostulacion } from '@/paneles/administrador/postulaciones/PaginaDetallePostulacion';
import { PaginaPostulaciones } from '@/paneles/administrador/postulaciones/PaginaPostulaciones';
import { RUTA_POSTULACIONES } from '@/paneles/administrador/postulaciones/rutas';

/**
 * Los módulos que ya tienen pantalla, por la ruta de su ítem del menú. Los demás siguen con su página vacía hasta que se
 * construyan (Fases 5 a 7).
 */
const PAGINAS_DE_MODULO: Readonly<Record<string, ReactElement>> = {
  [RUTA_POSTULACIONES]: <PaginaPostulaciones />,
};

/** Las páginas internas de un módulo (detalles), por la ruta que cuelga del módulo. */
const PAGINAS_INTERNAS: readonly RouteObject[] = [
  { path: `${RUTA_POSTULACIONES}/:idPostulante`, element: <PaginaDetallePostulacion /> },
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

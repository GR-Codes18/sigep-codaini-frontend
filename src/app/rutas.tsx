import { createBrowserRouter, type RouteObject } from 'react-router';
import { GuardaRuta } from '@/auth/GuardaRuta';
import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';
import type { Rol } from '@/auth/tipos';
import { LayoutPanel } from '@/app/layout/LayoutPanel';
import { PaginaVacia } from '@/app/layout/PaginaVacia';
import { MENU_POR_ROL } from '@/app/menus';
import { PaginaDesarrollo } from '@/app/ejemplos/PaginaDesarrollo';
import { PaginaNotificaciones } from '@/app/layout/PaginaNotificaciones';
import { PaginaPerfil } from '@/app/ejemplos/PaginaPerfil';
import { DetallePostulacion } from '@/paneles/administrador/postulaciones/DetallePostulacion';
import { ListadoPostulaciones } from '@/paneles/administrador/postulaciones/ListadoPostulaciones';
import { AccesoSiNoHaySesion, RaizSegunSesion } from '@/app/RedireccionesSesion';

function rutasDeRol(rol: Rol): RouteObject[] {
  const items = MENU_POR_ROL[rol].flatMap((g) => g.items);
  const prefijo = PREFIJO_POR_ROL[rol];
  return [
    ...items
      .filter((i) => i.ruta !== '/administrador/postulaciones')
      .map((i) => ({ path: i.ruta, element: <PaginaVacia titulo={i.etiqueta} /> })),
    { path: `${prefijo}/perfil`, element: <PaginaPerfil /> },
    { path: `${prefijo}/notificaciones`, element: <PaginaNotificaciones /> },
    { path: `${prefijo}/desarrollo`, element: <PaginaDesarrollo /> },
    ...(rol === 'ADMINISTRADOR'
      ? [{ path: '/administrador/postulaciones', element: <ListadoPostulaciones /> }]
      : []),
    { path: '/administrador/postulaciones/:id', element: <DetallePostulacion /> },
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

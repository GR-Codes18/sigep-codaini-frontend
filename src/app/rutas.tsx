import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { GuardaRuta } from '@/auth/GuardaRuta';
import { PaginaAcceso } from '@/auth/PaginaAcceso';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { INICIO_POR_ROL, PREFIJO_POR_ROL } from '@/auth/rutasPorRol';
import type { Rol } from '@/auth/tipos';
import { LayoutPanel } from '@/app/layout/LayoutPanel';
import { PaginaVacia } from '@/app/layout/PaginaVacia';
import { MENU_POR_ROL } from '@/app/menus';
import { PaginaDesarrollo } from '@/app/ejemplos/PaginaDesarrollo';

function RaizSegunSesion() {
  const usuario = useAlmacenSesion((s) => s.usuario);
  return <Navigate to={usuario ? INICIO_POR_ROL[usuario.rol] : '/acceso'} replace />;
}

function AccesoSiNoHaySesion() {
  const usuario = useAlmacenSesion((s) => s.usuario);
  if (usuario) return <Navigate to={INICIO_POR_ROL[usuario.rol]} replace />;
  return <PaginaAcceso />;
}

function rutasDeRol(rol: Rol): RouteObject[] {
  const items = MENU_POR_ROL[rol].flatMap((g) => g.items);
  return [
    ...items.map((i) => ({ path: i.ruta, element: <PaginaVacia titulo={i.etiqueta} /> })),
    /*{ path: `${PREFIJO_POR_ROL[rol]}/perfil`, element: <PaginaVacia titulo="Mi perfil" /> },*/
    { path: `${PREFIJO_POR_ROL[rol]}/desarrollo`, element: <PaginaDesarrollo /> },
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

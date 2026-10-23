import { Navigate, Outlet, useLocation } from 'react-router';
import { useAlmacenSesion } from './almacenSesion';
import { INICIO_POR_ROL, puedeVerRuta } from './rutasPorRol';

export function GuardaRuta() {
  const usuario = useAlmacenSesion((s) => s.usuario);
  const { pathname } = useLocation();

  if (!usuario) return <Navigate to="/acceso" replace />;
  if (!puedeVerRuta(usuario.rol, pathname)) {
    return <Navigate to={INICIO_POR_ROL[usuario.rol]} replace />;
  }
  return <Outlet />;
}
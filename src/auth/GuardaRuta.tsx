import { Navigate, Outlet, useLocation } from 'react-router';
import { useSesionActiva } from './useSesionActiva';
import { INICIO_POR_ROL, puedeVerRuta } from './rutasPorRol';

export function GuardaRuta() {
  const { sesion } = useSesionActiva();
  const { pathname } = useLocation();

  if (!sesion) return <Navigate to="/acceso" replace />;
  if (!puedeVerRuta(sesion.rol, pathname)) {
    return <Navigate to={INICIO_POR_ROL[sesion.rol]} replace />;
  }
  return <Outlet />;
}

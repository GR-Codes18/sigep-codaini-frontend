import { Navigate } from 'react-router';
import { PaginaAcceso } from '@/auth/PaginaAcceso';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { INICIO_POR_ROL } from '@/auth/rutasPorRol';

export function RaizSegunSesion() {
  const { sesion } = useSesionActiva();
  return <Navigate to={sesion ? INICIO_POR_ROL[sesion.rol] : '/acceso'} replace />;
}

export function AccesoSiNoHaySesion() {
  const { sesion } = useSesionActiva();
  if (sesion) return <Navigate to={INICIO_POR_ROL[sesion.rol]} replace />;
  return <PaginaAcceso />;
}

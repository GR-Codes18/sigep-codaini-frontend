import { Navigate } from 'react-router';
import { PaginaAcceso } from '@/auth/PaginaAcceso';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { INICIO_POR_ROL } from '@/auth/rutasPorRol';

export function RaizSegunSesion() {
  const usuario = useAlmacenSesion((s) => s.usuario);
  return <Navigate to={usuario ? INICIO_POR_ROL[usuario.rol] : '/acceso'} replace />;
}

export function AccesoSiNoHaySesion() {
  const usuario = useAlmacenSesion((s) => s.usuario);
  if (usuario) return <Navigate to={INICIO_POR_ROL[usuario.rol]} replace />;
  return <PaginaAcceso />;
}

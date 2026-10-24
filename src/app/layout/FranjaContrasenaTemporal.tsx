import { Info } from 'lucide-react';
import { Link } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';

export function FranjaContrasenaTemporal() {
  const usuario = useAlmacenSesion((s) => s.usuario);

  if (!usuario || usuario.rol === 'ADMINISTRADOR' || !usuario.debe_cambiar_contrasena) {
    return null;
  }

  return (
    <div
      role="status"
      className="bg-surface-2 border-border text-text flex items-center justify-center gap-3 border-b px-6 py-2 text-sm"
    >
      <Info className="text-text-2 size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
      <span>Estás usando una contraseña temporal. Cámbiala ahora.</span>
      <Link
        to={`${PREFIJO_POR_ROL[usuario.rol]}/perfil`}
        className="text-link font-medium underline underline-offset-2"
      >
        Ir a mi perfil
      </Link>
    </div>
  );
}
import { useNavigate } from 'react-router';
import { useAlmacenNotificaciones } from '@/app/ejemplos/almacenNotificaciones';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';
import { CampanaNotificaciones } from '@/compartido/CampanaNotificaciones';

export function CampanaConectada() {
  const rol = useAlmacenSesion((s) => s.usuario?.rol);
  const navegar = useNavigate();
  const { notificaciones, marcarLeida, marcarTodas } = useAlmacenNotificaciones();
  if (!rol) return null;

  return (
    <CampanaNotificaciones
      notificaciones={notificaciones}
      onAbrir={(n) => {
        marcarLeida(n.id);
        if (n.existe && n.ruta) navegar(n.ruta);
      }}
      onMarcarTodas={marcarTodas}
      onVerTodas={() => navegar(`${PREFIJO_POR_ROL[rol]}/notificaciones`)}
    />
  );
}

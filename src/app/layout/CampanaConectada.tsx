import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';
import { useAlmacen } from '@/data';
import { marcarNotificacionLeida, marcarTodasLeidas } from '@/services';
import { CampanaNotificaciones } from '@/compartido/CampanaNotificaciones';
import { notificacionesParaVista } from './notificacionVista';

export function CampanaConectada() {
  const { sesion } = useSesionActiva();
  const datos = useAlmacen((s) => s.datos);
  const navegar = useNavigate();
  if (!sesion) return null;
  const idUsuario = sesion.id;
  const notificaciones = notificacionesParaVista(datos, idUsuario, sesion.rol);

  async function marcarTodas() {
    const resultado = await marcarTodasLeidas({ idActor: idUsuario });
    if (!resultado.ok) toast.error(resultado.mensaje);
  }

  return (
    <CampanaNotificaciones
      notificaciones={notificaciones}
      onAbrir={async (n) => {
        const resultado = await marcarNotificacionLeida({
          idActor: idUsuario,
          idNotificacion: n.id,
        });
        if (!resultado.ok) {
          toast.error(resultado.mensaje);
          return;
        }
        if (n.existe && n.ruta) navegar(n.ruta);
      }}
      onMarcarTodas={marcarTodas}
      onVerTodas={() => navegar(`${PREFIJO_POR_ROL[sesion.rol]}/notificaciones`)}
    />
  );
}

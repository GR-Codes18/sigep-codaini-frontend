import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';
import { marcarNotificacionLeida, marcarTodasLeidas } from '@/services';
import { CampanaNotificaciones } from '@/compartido/CampanaNotificaciones';
import { useNotificaciones } from './useNotificaciones';

/** La campana lee las últimas 8 (§8.1). */
const LIMITE_CAMPANA = 8;

export function CampanaConectada() {
  const { sesion } = useSesionActiva();
  const { items, noLeidas } = useNotificaciones({ limite: LIMITE_CAMPANA });
  const navegar = useNavigate();
  if (!sesion) return null;
  const idUsuario = sesion.id;

  async function marcarTodas() {
    const resultado = await marcarTodasLeidas({ idActor: idUsuario });
    if (!resultado.ok) toast.error(resultado.mensaje);
  }

  return (
    <CampanaNotificaciones
      notificaciones={items}
      noLeidas={noLeidas}
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

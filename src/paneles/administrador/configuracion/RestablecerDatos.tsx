import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { INICIO_POR_ROL } from '@/auth/rutasPorRol';
import { PanelDeDatos } from '@/compartido/PanelDeDatos';
import { Insignia } from '@/compartido/Insignia';
import { ModalConfirmacion } from '@/compartido/ModalConfirmacion';
import { Button } from '@/compartido/ui/button';
import type { Id } from '@/domain';
import { restablecerDatosDemostracion, type Entorno } from '@/services';

/**
 * «Datos de demostración» (§5.8, solo en el prototipo): vuelve los datos de ejemplo a su estado original. Pide
 * confirmación. Después aplica la sesión que devuelve el servicio (la refresca o, si la persona ya no existe, la
 * cierra) y vuelve al inicio, para no dejar pantallas abiertas sobre registros que ya no existen.
 */
export function RestablecerDatos({ idActor, entorno }: { idActor: Id; entorno: Entorno }) {
  const [confirmando, setConfirmando] = useState(false);
  const navegar = useNavigate();

  return (
    <PanelDeDatos
      titulo="Datos de demostración"
      acciones={<Insignia tipo="marca" estado="SOLO_PROTOTIPO" />}
    >
      <p className="text-sm text-text-2">
        Restablece los datos de ejemplo a su estado original. Se pierde todo lo hecho desde
        entonces.
      </p>
      <div className="flex justify-end border-t border-border pt-3">
        <Button type="button" variant="destructive" onClick={() => setConfirmando(true)}>
          Restablecer datos
        </Button>
      </div>

      {confirmando && (
        <ModalConfirmacion
          abierto
          onCerrar={() => setConfirmando(false)}
          titulo="Restablecer datos"
          descripcion="Se descartará todo lo guardado y volverán los datos de ejemplo originales. Esta acción solo existe en el prototipo y no se puede deshacer."
          etiquetaConfirmar="Restablecer datos"
          destructivo
          onConfirmar={async () => {
            const r = await restablecerDatosDemostracion({ idActor }, entorno);
            if (!r.ok) throw new Error(r.mensaje);
            const { usuario } = r.valor;
            if (usuario === null) {
              useAlmacenSesion.getState().cerrarSesion();
              navegar('/', { replace: true });
            } else {
              useAlmacenSesion.getState().abrirSesion(usuario);
              navegar(INICIO_POR_ROL[usuario.rol], { replace: true });
            }
            toast.success('Los datos de demostración volvieron a su estado original');
          }}
        />
      )}
    </PanelDeDatos>
  );
}

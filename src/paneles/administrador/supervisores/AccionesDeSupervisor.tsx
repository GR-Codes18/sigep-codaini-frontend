import { useState } from 'react';
import { toast } from 'sonner';
import { ModalConfirmacion } from '@/compartido/ModalConfirmacion';
import {
  ModalContrasenaTemporal,
  type ContrasenaTemporal,
} from '@/compartido/ModalContrasenaTemporal';
import type { ProyectoACargoParaVista } from '@/app/adaptadores';
import { Button } from '@/compartido/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/compartido/ui/dialog';
import type { Id } from '@/domain';
import {
  desactivarSupervisor,
  ENTORNO,
  reactivarSupervisor,
  restablecerContrasena,
  type AccionSupervisor,
  type Entorno,
  type PersonaResumen,
  type Resultado,
} from '@/services';
import { FormularioDatosSupervisor } from './FormularioDatosSupervisor';
import { ReasignarProyectos } from './ReasignarProyectos';

interface Props {
  idActor: Id;
  supervisor: { id: Id; nombre: string; correo: string };
  /** Lo que se puede hacer ahora: lo decide `domain/` y llega con la consulta; aquí solo se ofrecen. */
  acciones: readonly AccionSupervisor[];
  /** Cuántos proyectos bloquean desactivarlo: lo cuenta `domain/` y llega con la consulta, la pantalla no cuenta. */
  proyectosPendientes: number;
  /** Sus proyectos activos y en pausa, para el diálogo de reasignación. */
  proyectosACargo: readonly ProyectoACargoParaVista[];
  /** A quién se pueden reasignar; lo decide `domain/` y llega con la consulta. */
  supervisoresDestino: readonly PersonaResumen[];
  entorno?: Entorno;
}

const ETIQUETA_DEL_BOTON: Record<AccionSupervisor, string> = {
  EDITAR_DATOS: 'Editar nombre y correo',
  RESTABLECER_CONTRASENA: 'Restablecer contraseña',
  REASIGNAR_PROYECTOS: 'Reasignar proyectos',
  DESACTIVAR: 'Desactivar',
  REACTIVAR: 'Reactivar',
};

/** El aviso del bloqueo (§5.3). El número viene de la consulta: la pantalla no cuenta proyectos. */
function avisoDeProyectos(cantidad: number): string {
  return cantidad === 1
    ? 'Tiene 1 proyecto pendiente: reasígnalo primero.'
    : `Tiene ${cantidad} proyectos pendientes: reasígnalos primero.`;
}

/** Un error de servicio llega al modal como excepción: el modal se queda abierto y muestra el mensaje. */
function exigirExito<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(resultado.mensaje);
  return resultado.valor;
}

/**
 * Las acciones del Administrador sobre un supervisor (§5.3): editar su nombre y correo, restablecer la contraseña
 * (visible una sola vez), reasignar sus proyectos, desactivarlo (bloqueado con proyectos pendientes, con el aviso «Tiene N
 * proyectos pendientes») y reactivarlo. Qué botones aparecen lo decide `domain/` y llega en `acciones`; la pantalla no los
 * deduce del estado.
 */
export function AccionesDeSupervisor({
  idActor,
  supervisor,
  acciones,
  proyectosPendientes,
  proyectosACargo,
  supervisoresDestino,
  entorno = ENTORNO,
}: Props) {
  const [abierta, setAbierta] = useState<AccionSupervisor | null>(null);
  // Vive solo en este estado, mientras el modal está abierto: no se persiste ni se escribe en otro lugar.
  const [contrasena, setContrasena] = useState<ContrasenaTemporal | null>(null);

  async function restablecer() {
    const resultado = exigirExito(
      await restablecerContrasena({ idActor, idUsuario: supervisor.id }, entorno),
    );
    toast.success('Contraseña restablecida');
    setContrasena({
      titulo: 'Contraseña restablecida',
      nombre: supervisor.nombre,
      correo: supervisor.correo,
      contrasena: resultado.contrasena_temporal,
    });
  }

  return (
    <>
      {acciones.length > 0 && (
        <div role="group" aria-label="Acciones" className="flex flex-wrap gap-2">
          {acciones.map((accion) => (
            <Button key={accion} type="button" variant="outline" onClick={() => setAbierta(accion)}>
              {ETIQUETA_DEL_BOTON[accion]}
            </Button>
          ))}
        </div>
      )}

      {abierta === 'EDITAR_DATOS' && (
        <FormularioDatosSupervisor
          idActor={idActor}
          supervisor={supervisor}
          onCerrar={() => setAbierta(null)}
          entorno={entorno}
        />
      )}

      {abierta === 'RESTABLECER_CONTRASENA' && (
        <ModalConfirmacion
          abierto
          onCerrar={() => setAbierta(null)}
          titulo="Restablecer contraseña"
          descripcion={`Se generará una contraseña temporal nueva para ${supervisor.nombre}. La actual dejará de servir y la nueva se mostrará una sola vez.`}
          etiquetaConfirmar="Restablecer"
          onConfirmar={restablecer}
        />
      )}

      {abierta === 'REASIGNAR_PROYECTOS' && (
        <ReasignarProyectos
          idActor={idActor}
          supervisor={supervisor}
          proyectos={proyectosACargo}
          destinos={supervisoresDestino}
          onCerrar={() => setAbierta(null)}
          entorno={entorno}
        />
      )}

      {abierta === 'DESACTIVAR' && proyectosPendientes > 0 && (
        <Dialog open onOpenChange={(valor) => !valor && setAbierta(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>No se puede desactivar</DialogTitle>
              <DialogDescription>
                {avisoDeProyectos(proyectosPendientes)} Un supervisor no puede quedar sin proyectos
                a su cargo mientras tenga proyectos activos o en pausa.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAbierta(null)}>
                Cerrar
              </Button>
              {acciones.includes('REASIGNAR_PROYECTOS') && (
                <Button type="button" onClick={() => setAbierta('REASIGNAR_PROYECTOS')}>
                  Reasignar proyectos
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {abierta === 'DESACTIVAR' && proyectosPendientes === 0 && (
        <ModalConfirmacion
          abierto
          onCerrar={() => setAbierta(null)}
          titulo="Desactivar supervisor"
          descripcion={`${supervisor.nombre} no podrá iniciar sesión. Sus acciones anteriores siguen asociadas a su nombre y puedes reactivarlo cuando quieras.`}
          etiquetaConfirmar="Desactivar"
          destructivo
          onConfirmar={async () => {
            exigirExito(
              await desactivarSupervisor({ idActor, idSupervisor: supervisor.id }, entorno),
            );
            toast.success('Supervisor desactivado');
          }}
        />
      )}

      {abierta === 'REACTIVAR' && (
        <ModalConfirmacion
          abierto
          onCerrar={() => setAbierta(null)}
          titulo="Reactivar supervisor"
          descripcion={`${supervisor.nombre} volverá a «Activo» y podrá iniciar sesión de nuevo. No recupera los proyectos que tenía.`}
          etiquetaConfirmar="Reactivar"
          onConfirmar={async () => {
            exigirExito(
              await reactivarSupervisor({ idActor, idSupervisor: supervisor.id }, entorno),
            );
            toast.success('Supervisor reactivado');
          }}
        />
      )}

      <ModalContrasenaTemporal datos={contrasena} onCerrar={() => setContrasena(null)} />
    </>
  );
}

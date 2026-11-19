import { useState } from 'react';
import { toast } from 'sonner';
import { ModalConfirmacion } from '@/compartido/ModalConfirmacion';
import {
  ModalContrasenaTemporal,
  type ContrasenaTemporal,
} from '@/compartido/ModalContrasenaTemporal';
import { Button } from '@/compartido/ui/button';
import type { Id } from '@/domain';
import {
  ENTORNO,
  restablecerContrasena,
  type AccionSupervisor,
  type Entorno,
  type Resultado,
} from '@/services';
import { FormularioDatosSupervisor } from './FormularioDatosSupervisor';

interface Props {
  idActor: Id;
  supervisor: { id: Id; nombre: string; correo: string };
  /** Lo que se puede hacer ahora: lo decide `domain/` y llega con la consulta; aquí solo se ofrecen. */
  acciones: readonly AccionSupervisor[];
  entorno?: Entorno;
}

const ETIQUETA_DEL_BOTON: Record<AccionSupervisor, string> = {
  EDITAR_DATOS: 'Editar nombre y correo',
  RESTABLECER_CONTRASENA: 'Restablecer contraseña',
};

/** Un error de servicio llega al modal como excepción: el modal se queda abierto y muestra el mensaje. */
function exigirExito<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(resultado.mensaje);
  return resultado.valor;
}

/**
 * Las acciones del Administrador sobre la cuenta de un supervisor (§5.3): editar su nombre y correo, y restablecer la
 * contraseña (visible una sola vez). Qué botones aparecen lo decide `domain/` y llega en `acciones`; la pantalla no los
 * deduce del estado.
 */
export function AccionesDeSupervisor({ idActor, supervisor, acciones, entorno = ENTORNO }: Props) {
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

      <ModalContrasenaTemporal datos={contrasena} onCerrar={() => setContrasena(null)} />
    </>
  );
}

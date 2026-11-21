import { useState } from 'react';
import { toast } from 'sonner';
import { ModalConfirmacion } from '@/compartido/ModalConfirmacion';
import { Button } from '@/compartido/ui/button';
import type { Fecha, Id } from '@/domain';
import {
  ENTORNO,
  finalizarPractica,
  reactivarPractica,
  restablecerContrasena,
  type AccionPracticante,
  type Entorno,
  type Resultado,
} from '@/services';
import {
  ModalContrasenaTemporal,
  type ContrasenaTemporal,
} from '@/compartido/ModalContrasenaTemporal';
import { FormularioDatosPractica } from './FormularioDatosPractica';

interface Props {
  idActor: Id;
  practicante: {
    id: Id;
    nombre: string;
    correo: string;
    idEspecialidad: Id | null;
    especialidad: string;
    fechaIngreso: Fecha;
    fechaFinPrevista: Fecha;
  };
  /** Lo que se puede hacer ahora: lo decide `domain/` y llega con la consulta; aquí solo se ofrecen. */
  acciones: readonly AccionPracticante[];
  /** Tareas en progreso que se liberarían al finalizar: lo calcula la consulta, no la pantalla. */
  tareasALiberar: number;
  entorno?: Entorno;
}

const ETIQUETA_DEL_BOTON: Record<AccionPracticante, string> = {
  EDITAR_DATOS: 'Editar datos de la práctica',
  RESTABLECER_CONTRASENA: 'Restablecer contraseña',
  FINALIZAR: 'Finalizar práctica',
  REACTIVAR: 'Reactivar',
};

/**
 * El aviso previo de finalizar (§5.2). El número viene de la consulta (`tareas_a_liberar`, que lo calcula `domain/`): la
 * pantalla no cuenta tareas.
 */
function avisoDeTareas(cantidad: number): string {
  if (cantidad === 0) return 'No tiene tareas en progreso.';
  return cantidad === 1
    ? 'Tiene 1 tarea en progreso que será liberada.'
    : `Tiene ${cantidad} tareas en progreso que serán liberadas.`;
}

/** Un error de servicio llega al modal como excepción: el modal se queda abierto y muestra el mensaje. */
function exigirExito<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(resultado.mensaje);
  return resultado.valor;
}

/**
 * Las acciones del Administrador sobre un practicante (§5.2): editar los datos de la práctica, restablecer la
 * contraseña (visible una sola vez), finalizar la práctica (motivo obligatorio y aviso de las tareas que se liberan) y
 * reactivarla (nota obligatoria). Qué botones aparecen lo decide `domain/` y llega en `acciones`; la pantalla no los
 * deduce del estado.
 */
export function AccionesDePracticante({
  idActor,
  practicante,
  acciones,
  tareasALiberar,
  entorno = ENTORNO,
}: Props) {
  const [abierta, setAbierta] = useState<AccionPracticante | null>(null);
  // Vive solo en este estado, mientras el modal está abierto: no se persiste ni se escribe en otro lugar.
  const [contrasena, setContrasena] = useState<ContrasenaTemporal | null>(null);

  async function restablecer() {
    const resultado = exigirExito(
      await restablecerContrasena({ idActor, idUsuario: practicante.id }, entorno),
    );
    toast.success('Contraseña restablecida');
    setContrasena({
      titulo: 'Contraseña restablecida',
      nombre: practicante.nombre,
      correo: practicante.correo,
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
        <FormularioDatosPractica
          idActor={idActor}
          practicante={practicante}
          onCerrar={() => setAbierta(null)}
          entorno={entorno}
        />
      )}

      {abierta === 'RESTABLECER_CONTRASENA' && (
        <ModalConfirmacion
          abierto
          onCerrar={() => setAbierta(null)}
          titulo="Restablecer contraseña"
          descripcion={`Se generará una contraseña temporal nueva para ${practicante.nombre}. La actual dejará de servir y la nueva se mostrará una sola vez.`}
          etiquetaConfirmar="Restablecer"
          onConfirmar={restablecer}
        />
      )}

      {abierta === 'FINALIZAR' && (
        <ModalConfirmacion
          abierto
          onCerrar={() => setAbierta(null)}
          titulo="Finalizar práctica"
          descripcion={`${avisoDeTareas(tareasALiberar)} Se bloqueará el acceso de ${practicante.nombre} y sus asignaciones recibirán fecha de baja. Las tareas que esperan supervisión no se liberan: siguen su curso con el supervisor.`}
          etiquetaConfirmar="Finalizar práctica"
          destructivo
          pedirMotivo={{ etiqueta: 'Motivo (término de ciclo, retiro u otro)', obligatorio: true }}
          onConfirmar={async (motivo) => {
            exigirExito(
              await finalizarPractica({ idActor, idPracticante: practicante.id, motivo }, entorno),
            );
            toast.success('Práctica finalizada');
          }}
        />
      )}

      {abierta === 'REACTIVAR' && (
        <ModalConfirmacion
          abierto
          onCerrar={() => setAbierta(null)}
          titulo="Reactivar práctica"
          descripcion={`${practicante.nombre} volverá a «Activo» y podrá ingresar de nuevo. Sus asignaciones antiguas no se reactivan: aparecerá en «Sin proyecto» y se le asigna de nuevo. La fecha de fin prevista no cambia; puedes editarla después.`}
          etiquetaConfirmar="Reactivar"
          pedirMotivo={{ etiqueta: 'Nota', obligatorio: true }}
          onConfirmar={async (nota) => {
            exigirExito(
              await reactivarPractica({ idActor, idPracticante: practicante.id, nota }, entorno),
            );
            toast.success('Práctica reactivada');
          }}
        />
      )}

      <ModalContrasenaTemporal datos={contrasena} onCerrar={() => setContrasena(null)} />
    </>
  );
}

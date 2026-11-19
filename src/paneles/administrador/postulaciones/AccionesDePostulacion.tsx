import { useState } from 'react';
import { toast } from 'sonner';
import type { AccionDecisionPostulacion, Id } from '@/domain';
import { ModalConfirmacion, type OpcionMotivo } from '@/compartido/ModalConfirmacion';
import { Button } from '@/compartido/ui/button';
import {
  aprobarPostulacion,
  ENTORNO,
  rechazarPostulacion,
  reconsiderarPostulacion,
  type Entorno,
  type Resultado,
} from '@/services';
import { ModalContrasenaTemporal, type ContrasenaTemporal } from './ModalContrasenaTemporal';

interface Props {
  idActor: Id;
  postulacion: { id: Id; nombre: string; correo: string };
  /** Lo que se puede decidir ahora: lo decide `domain/` y llega con la consulta; aquí solo se ofrecen. */
  decisiones: readonly AccionDecisionPostulacion[];
  entorno?: Entorno;
}

interface Configuracion {
  titulo: string;
  descripcion: string;
  etiquetaConfirmar: string;
  destructivo?: boolean;
  pedirMotivo: OpcionMotivo | false;
}

const CONFIGURACION = (nombre: string): Record<AccionDecisionPostulacion, Configuracion> => ({
  APROBAR: {
    titulo: 'Aprobar postulación',
    descripcion: `Se creará la cuenta de practicante de ${nombre} con una contraseña temporal y la postulación pasará a «Aprobada».`,
    etiquetaConfirmar: 'Aprobar',
    pedirMotivo: false,
  },
  RECHAZAR: {
    titulo: 'Rechazar postulación',
    descripcion: `Indica por qué se rechaza la postulación de ${nombre}. El motivo queda registrado en el historial.`,
    etiquetaConfirmar: 'Rechazar',
    destructivo: true,
    pedirMotivo: { etiqueta: 'Motivo', obligatorio: true },
  },
  RECONSIDERAR: {
    titulo: 'Reconsiderar postulación',
    descripcion: `La postulación de ${nombre} volverá a «Pendiente». Su evaluación anterior se conserva.`,
    etiquetaConfirmar: 'Reconsiderar',
    pedirMotivo: { etiqueta: 'Nota', obligatorio: true },
  },
});

const ETIQUETA_DEL_BOTON: Record<AccionDecisionPostulacion, string> = {
  APROBAR: 'Aprobar',
  RECHAZAR: 'Rechazar',
  RECONSIDERAR: 'Reconsiderar',
};

/** Un error de servicio llega al modal como excepción: el modal se queda abierto y muestra el mensaje. */
function exigirExito<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(resultado.mensaje);
  return resultado.valor;
}

/**
 * Las decisiones del Administrador sobre una postulación (§5.1): aprobar (con confirmación; la contraseña temporal se
 * muestra una sola vez), rechazar (con motivo obligatorio) y reconsiderar (con nota obligatoria). Qué botones aparecen
 * lo decide `domain/` y llega en `decisiones`; la pantalla no los deduce del estado. El motivo o la nota vacíos los
 * rechazan el modal y el servicio.
 */
export function AccionesDePostulacion({
  idActor,
  postulacion,
  decisiones,
  entorno = ENTORNO,
}: Props) {
  const [abierta, setAbierta] = useState<AccionDecisionPostulacion | null>(null);
  // Vive solo en este estado, mientras el modal está abierto: no se persiste ni se escribe en otro lugar.
  const [contrasena, setContrasena] = useState<ContrasenaTemporal | null>(null);

  async function ejecutar(accion: AccionDecisionPostulacion, texto: string | undefined) {
    const entrada = { idActor, idPostulante: postulacion.id };
    if (accion === 'APROBAR') {
      const aprobada = exigirExito(await aprobarPostulacion(entrada, entorno));
      toast.success('Postulación aprobada');
      setContrasena({
        nombre: postulacion.nombre,
        correo: postulacion.correo,
        contrasena: aprobada.contrasena_temporal,
      });
    } else if (accion === 'RECHAZAR') {
      exigirExito(await rechazarPostulacion({ ...entrada, motivo: texto }, entorno));
      toast.success('Postulación rechazada');
    } else {
      exigirExito(await reconsiderarPostulacion({ ...entrada, nota: texto }, entorno));
      toast.success('Postulación reconsiderada');
    }
  }

  const configuracion = abierta === null ? null : CONFIGURACION(postulacion.nombre)[abierta];

  return (
    <>
      {decisiones.length > 0 && (
        <div role="group" aria-label="Decisiones" className="flex flex-wrap gap-2">
          {decisiones.map((accion) => (
            <Button
              key={accion}
              type="button"
              variant={accion === 'APROBAR' ? 'default' : 'outline'}
              onClick={() => setAbierta(accion)}
            >
              {ETIQUETA_DEL_BOTON[accion]}
            </Button>
          ))}
        </div>
      )}

      {abierta !== null && configuracion !== null && (
        <ModalConfirmacion
          abierto
          onCerrar={() => setAbierta(null)}
          titulo={configuracion.titulo}
          descripcion={configuracion.descripcion}
          etiquetaConfirmar={configuracion.etiquetaConfirmar}
          destructivo={configuracion.destructivo}
          pedirMotivo={configuracion.pedirMotivo}
          onConfirmar={(texto) => ejecutar(abierta, texto)}
        />
      )}

      <ModalContrasenaTemporal datos={contrasena} onCerrar={() => setContrasena(null)} />
    </>
  );
}

import type { TareaDetalle } from '@/compartido/DetalleTarea';
import type { TareaDetalleVista } from '@/services';

/**
 * Convierte el detalle que entrega `obtenerTarea` (snake_case) al modelo de presentación de `DetalleTarea`.
 *
 * Solo renombra y aplana: no calcula reglas. La etiqueta del PR, la marca «Devuelta», la observación, la señal
 * de atención al responsable y las acciones ya vienen decididas por la consulta (`pull_request` es `null` cuando la
 * etiqueta no se muestra, y su URL es `null` con la etiqueta «Pendiente»).
 */
export function aTareaDetalle(vista: TareaDetalleVista): TareaDetalle {
  const pr = vista.pull_request;
  return {
    id: vista.id,
    idLegible: vista.id_legible,
    numero: vista.numero,
    titulo: vista.titulo,
    descripcion: vista.descripcion,
    estado: vista.estado,
    idProyecto: vista.proyecto.id,
    proyecto: vista.proyecto.nombre,
    idPracticante: vista.responsable?.id ?? null,
    ...(vista.responsable ? { responsable: vista.responsable.nombre } : {}),
    fechaLimite: vista.fecha_limite,
    requiereSupervision: vista.requiere_supervision,
    requierePr: vista.requiere_pr,
    estadoPr: pr?.etiqueta ?? null,
    ...(vista.fecha_termino ? { fechaTermino: vista.fecha_termino } : {}),
    ...(pr?.url ? { urlPr: pr.url } : {}),
    ...(pr?.rama_origen ? { ramaOrigen: pr.rama_origen } : {}),
    ...(pr?.rama_base ? { ramaBase: pr.rama_base } : {}),
    devuelta: vista.devuelta,
    ...(vista.observacion ? { observacion: vista.observacion } : {}),
    ...(vista.atencion_responsable.length > 0
      ? { atencionResponsable: vista.atencion_responsable }
      : {}),
  };
}

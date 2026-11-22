import { Link } from 'react-router';
import { toast } from 'sonner';
import { ETIQUETA_REGLA, type FilaInsight } from '@/app/adaptadores';
import { Insignia } from '@/compartido/Insignia';
import { ModalConfirmacion } from '@/compartido/ModalConfirmacion';
import { Button } from '@/compartido/ui/button';
import { cn } from '@/compartido/utils';
import type { Id } from '@/domain';
import {
  marcarInsightRevisado,
  notificarDesdeInsight,
  type Entorno,
  type Resultado,
} from '@/services';

/** Un error de servicio llega al modal como excepción: el modal se queda abierto y muestra el mensaje. */
function exigirExito<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(resultado.mensaje);
  return resultado.valor;
}

export type AccionDeInsight = { tipo: 'REVISAR' | 'NOTIFICAR'; insight: FilaInsight };

/**
 * La tarjeta de un insight con sus acciones, la misma en Reportes (§5.6) y en las alertas del Dashboard (§5.9): «Ver
 * detalle» del elemento afectado, «Marcar como revisado» y «Notificar». Qué botones aparecen lo deciden `puede()` y la
 * revisión vigente, y llegan con cada insight; la pantalla no los deduce.
 */
export function TarjetaDeInsight({
  insight,
  onAccion,
  compacta = false,
}: {
  insight: FilaInsight;
  onAccion: (accion: AccionDeInsight) => void;
  /** Menos alta, para las alertas del Dashboard: mismo contenido y mismas acciones, con menos aire. */
  compacta?: boolean;
}) {
  return (
    <article
      aria-label={insight.titulo}
      className={cn(
        'rounded-xl border border-border bg-surface',
        compacta ? 'space-y-1 p-3' : 'space-y-2 p-4',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Insignia tipo="severidad" estado={insight.severidad} />
        <span className="text-xs text-text-2">{ETIQUETA_REGLA[insight.tipoRegla]}</span>
        {insight.revisado && <span className="text-xs font-medium text-text-2">Revisado</span>}
      </div>
      <h3 className={compacta ? 'text-sm font-semibold text-text' : 'text-text'}>
        {insight.titulo}
      </h3>
      <p className={compacta ? 'text-xs text-text' : 'text-sm text-text'}>{insight.motivo}</p>
      <p className="text-xs text-text-2">
        Detectado el {insight.fechaDeteccionTexto}
        {insight.proyectos.length > 0 && (
          <> · {insight.proyectos.map((p) => p.nombre).join(', ')}</>
        )}
      </p>
      <div className={cn('flex flex-wrap items-center gap-2', compacta && 'pt-1')}>
        {insight.rutaElemento !== null && (
          <Button asChild variant="outline" size="sm">
            <Link to={insight.rutaElemento} aria-label={`Ver detalle: ${insight.titulo}`}>
              Ver detalle
            </Link>
          </Button>
        )}
        {insight.puedeMarcarRevisado && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Marcar como revisado: ${insight.titulo}`}
            onClick={() => onAccion({ tipo: 'REVISAR', insight })}
          >
            Marcar como revisado
          </Button>
        )}
        {insight.puedeNotificar && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Notificar: ${insight.titulo}`}
            onClick={() => onAccion({ tipo: 'NOTIFICAR', insight })}
          >
            Notificar
          </Button>
        )}
      </div>
    </article>
  );
}

/** Los diálogos de «Marcar como revisado» y «Notificar»; se muestran según la acción elegida en una tarjeta. */
export function ModalesDeInsight({
  accion,
  onCerrar,
  idActor,
  entorno,
}: {
  accion: AccionDeInsight | null;
  onCerrar: () => void;
  idActor: Id;
  entorno: Entorno;
}) {
  const entrada = (i: FilaInsight) => ({
    idActor,
    tipo_regla: i.tipoRegla,
    elemento: i.elemento,
  });

  return (
    <>
      {accion?.tipo === 'REVISAR' && (
        <ModalConfirmacion
          abierto
          onCerrar={onCerrar}
          titulo="Marcar como revisado"
          descripcion={`«${accion.insight.titulo}» sale de tu lista activa. Reaparece si la situación empeora o a los 7 días si sigue igual. Es solo para ti: las demás personas lo siguen viendo.`}
          etiquetaConfirmar="Marcar como revisado"
          pedirMotivo={{ etiqueta: 'Nota', obligatorio: false }}
          onConfirmar={async (nota) => {
            exigirExito(
              await marcarInsightRevisado(
                { ...entrada(accion.insight), nota: nota === '' ? null : nota },
                entorno,
              ),
            );
            toast.success('Alerta marcada como revisada');
          }}
        />
      )}

      {accion?.tipo === 'NOTIFICAR' && (
        <ModalConfirmacion
          abierto
          onCerrar={onCerrar}
          titulo="Notificar"
          descripcion={`Se enviará un aviso a la persona afectada con el título y el motivo de la alerta: «${accion.insight.titulo}».`}
          etiquetaConfirmar="Notificar"
          onConfirmar={async () => {
            exigirExito(await notificarDesdeInsight(entrada(accion.insight), entorno));
            toast.success('Aviso enviado');
          }}
        />
      )}
    </>
  );
}

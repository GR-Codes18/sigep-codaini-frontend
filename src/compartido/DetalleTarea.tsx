import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  etiquetaPRVisible,
  type EstadoPR,
  type EstadoTarea,
  type Fecha,
  type FechaHora,
} from '@/domain';
import { Insignia } from '@/compartido/Insignia';
import { LineaTiempo, type EventoLinea } from '@/compartido/LineaTiempo';
import { ModalConfirmacion, type OpcionMotivo } from '@/compartido/ModalConfirmacion';
import { Button } from '@/compartido/ui/button';

export interface TareaDetalle {
  id: string;
  idLegible: string;
  numero: number;
  titulo: string;
  descripcion: string;
  estado: EstadoTarea;
  idProyecto: string;
  proyecto: string;
  idPracticante: string | null;
  responsable?: string;
  fechaLimite: Fecha;
  requiereSupervision: boolean;
  requierePr: boolean;
  estadoPr: EstadoPR | null;
  fechaTermino?: FechaHora;
  urlPr?: string;
  ramaOrigen?: string;
  ramaBase?: string;
  devuelta?: boolean;
  observacion?: string;
}

export interface AccionTarea {
  clave: string;
  etiqueta: string;
  destructivo?: boolean;
  pedirMotivo?: OpcionMotivo;
  deshabilitada?: boolean;
  avisoDeshabilitacion?: string;
}

interface Props {
  tarea: TareaDetalle;
  /** Ya filtradas por permisos y estado. Vacío = solo lectura. */
  acciones: AccionTarea[];
  eventos: EventoLinea[];
  onEjecutar: (clave: string, motivo?: string) => Promise<void>;
}

export function DetalleTarea({ tarea, acciones, eventos, onEjecutar }: Props) {
  const [pendiente, setPendiente] = useState<AccionTarea | null>(null);
  const estadoPrVisible = etiquetaPRVisible({
    estado: tarea.estado,
    requiere_pr: tarea.requierePr,
    estado_pr: tarea.estadoPr,
  });
  const urlPrVisible =
    estadoPrVisible !== null && estadoPrVisible !== 'PENDIENTE' ? tarea.urlPr : undefined;

  async function alHacerClic(accion: AccionTarea) {
    if (accion.deshabilitada) return;
    if (accion.pedirMotivo || accion.destructivo) {
      setPendiente(accion);
      return;
    }
    try {
      await onEjecutar(accion.clave);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'No se pudo completar la acción.');
    }
  }

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs text-text-2 tabular-nums">
          {tarea.idLegible} · {tarea.proyecto}
        </p>
        <h1 className="text-text">{tarea.titulo}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Insignia tipo="tarea" estado={tarea.estado} />
          {tarea.devuelta && <Insignia tipo="marca" estado="DEVUELTA" />}
          {estadoPrVisible && <Insignia tipo="pr" estado={estadoPrVisible} />}
        </div>
      </header>

      {tarea.devuelta && tarea.observacion && (
        <section className="rounded-xl bg-state-danger-bg p-4">
          <h2 className="text-sm font-semibold text-state-danger-text">
            Observaciones del supervisor
          </h2>
          <p className="mt-1 text-sm text-text">{tarea.observacion}</p>
        </section>
      )}

      <dl className="grid gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-text-2">Responsable</dt>
          <dd className="text-text">{tarea.responsable ?? 'Sin asignar'}</dd>
        </div>
        <div>
          <dt className="text-text-2">Fecha límite</dt>
          <dd className="text-text tabular-nums">
            {format(parseISO(tarea.fechaLimite), 'dd/MM/yyyy')}
          </dd>
        </div>
        <div>
          <dt className="text-text-2">Requiere supervisión</dt>
          <dd className="text-text">{tarea.requiereSupervision ? 'Sí' : 'No'}</dd>
        </div>
        <div>
          <dt className="text-text-2">Requiere PR</dt>
          <dd className="text-text">{tarea.requierePr ? 'Sí' : 'No'}</dd>
        </div>
        {urlPrVisible && (
          <div className="sm:col-span-2">
            <dt className="text-text-2">Pull Request</dt>
            <dd>
              <a href={urlPrVisible} className="text-link underline underline-offset-2">
                {urlPrVisible}
              </a>
              {tarea.ramaOrigen && tarea.ramaBase && (
                <span className="text-text-2">
                  {' '}
                  ({tarea.ramaOrigen} → {tarea.ramaBase})
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>

      <section>
        <h2 className="mb-1 text-text">Descripción</h2>
        <p className="text-sm whitespace-pre-line text-text">{tarea.descripcion}</p>
      </section>

      {acciones.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {acciones.map((a) => (
            <div key={a.clave} className="space-y-1">
              <Button
                type="button"
                variant={a.destructivo ? 'outline' : 'default'}
                onClick={() => alHacerClic(a)}
                disabled={a.deshabilitada}
                aria-describedby={a.avisoDeshabilitacion ? `aviso-${a.clave}` : undefined}
              >
                {a.etiqueta}
              </Button>
              {a.avisoDeshabilitacion && (
                <p id={`aviso-${a.clave}`} className="max-w-56 text-xs text-text-2">
                  {a.avisoDeshabilitacion}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-text">Historial de la tarea</h2>
        <LineaTiempo eventos={eventos} />
      </section>

      {pendiente && (
        <ModalConfirmacion
          abierto
          onCerrar={() => setPendiente(null)}
          titulo={pendiente.etiqueta}
          descripcion={`${tarea.idLegible} · ${tarea.titulo}`}
          etiquetaConfirmar={pendiente.etiqueta}
          destructivo={pendiente.destructivo}
          pedirMotivo={pendiente.pedirMotivo ?? false}
          onConfirmar={(motivo) => onEjecutar(pendiente.clave, motivo)}
        />
      )}
    </article>
  );
}

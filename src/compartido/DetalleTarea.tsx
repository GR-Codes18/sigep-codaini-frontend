import { useState } from 'react';
import { toast } from 'sonner';
import { Insignia } from '@/compartido/Insignia';
import { LineaTiempo, type EventoLinea } from '@/compartido/LineaTiempo';
import { ModalConfirmacion, type OpcionMotivo } from '@/compartido/ModalConfirmacion';
import { Button } from '@/compartido/ui/button';

/** Forma provisional: se reemplaza por el tipo Tarea de domain/ cuando entre feat/fase1-tipos. */
export interface TareaDetalle {
  id: string;
  titulo: string;
  descripcion: string;
  estado: string;
  proyecto: string;
  responsable?: string;
  fechaLimite: Date;
  requiereSupervision: boolean;
  requierePr: boolean;
  estadoPr?: string;
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

  async function alHacerClic(accion: AccionTarea) {
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
          {tarea.id} · {tarea.proyecto}
        </p>
        <h1 className="text-text">{tarea.titulo}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Insignia tipo="tarea" estado={tarea.estado} />
          {tarea.devuelta && <Insignia tipo="marca" estado="DEVUELTA" />}
          {tarea.estadoPr && <Insignia tipo="pr" estado={tarea.estadoPr} />}
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
            {tarea.fechaLimite.toLocaleDateString('es-PE')}
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
        {tarea.urlPr && (
          <div className="sm:col-span-2">
            <dt className="text-text-2">Pull Request</dt>
            <dd>
              <a href={tarea.urlPr} className="text-link underline underline-offset-2">
                {tarea.urlPr}
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
            <Button
              key={a.clave}
              type="button"
              variant={a.destructivo ? 'outline' : 'default'}
              onClick={() => alHacerClic(a)}
            >
              {a.etiqueta}
            </Button>
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
          descripcion={`${tarea.id} · ${tarea.titulo}`}
          etiquetaConfirmar={pendiente.etiqueta}
          destructivo={pendiente.destructivo}
          pedirMotivo={pendiente.pedirMotivo ?? false}
          onConfirmar={(motivo) => onEjecutar(pendiente.clave, motivo)}
        />
      )}
    </article>
  );
}

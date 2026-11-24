import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import type { EstadoPR, EstadoTarea, Fecha, FechaHora, MotivoAtencionResponsable } from '@/domain';
import { CabeceraDeDetalle } from '@/compartido/CabeceraDeDetalle';
import { Insignia } from '@/compartido/Insignia';
import { ListaDeDefiniciones } from '@/compartido/ListaDeDefiniciones';
import { PanelDeDatos } from '@/compartido/PanelDeDatos';
import { LineaTiempo, type EventoLinea } from '@/compartido/LineaTiempo';
import { ModalConfirmacion, type OpcionMotivo } from '@/compartido/ModalConfirmacion';
import { Button } from '@/compartido/ui/button';
import type { Resultado } from '@/services';

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
  /** Por qué el responsable ya no puede seguir con la tarea (D6-A); solo la reciben Administrador y Supervisor. */
  atencionResponsable?: MotivoAtencionResponsable[];
}

const TEXTO_ATENCION: Record<MotivoAtencionResponsable, string> = {
  CUENTA_INACTIVA: 'La cuenta del responsable está inactiva.',
  CUENTA_NO_ENCONTRADA: 'No se encontró la cuenta del responsable.',
  SIN_ASIGNACION_VIGENTE: 'El responsable ya no tiene una asignación vigente en este proyecto.',
};

export interface AccionTarea {
  clave: string;
  etiqueta: string;
  destructivo?: boolean;
  pedirMotivo?: OpcionMotivo;
  deshabilitada?: boolean;
  avisoDeshabilitacion?: string;
  mensajeExito?: string;
  ejecutar?: (motivo?: string) => Promise<Resultado<unknown>>;
}

interface Props {
  tarea: TareaDetalle;
  /** El camino de vuelta (enlace o acción) que se muestra arriba de la cabecera. */
  volver?: { etiqueta: string; a?: string; onClick?: () => void };
  /** Ya filtradas por permisos y estado. Vacío = solo lectura. */
  acciones: AccionTarea[];
  eventos: EventoLinea[];
  onEjecutar: (clave: string, motivo?: string) => Promise<void>;
}

/**
 * Las acciones que avanzan la tarea por su flujo; la primera que esté disponible es la acción principal del estado y la
 * única en primario. Editar, activar o desactivar supervisión, el PR y demás van en contorno; las destructivas, en
 * contorno rojo. Solo cambia la variante del botón: qué acciones hay y cuándo salen lo decide la consulta.
 */
const ORDEN_ACCION_PRINCIPAL = ['tomar', 'aprobar', 'crear_pr', 'enviar', 'terminar', 'reabrir'];

const CLASE_DESTRUCTIVA =
  'border-danger/60 text-danger-text hover:text-danger-text dark:border-danger/60';

export function DetalleTarea({ tarea, volver, acciones, eventos, onEjecutar }: Props) {
  const [pendiente, setPendiente] = useState<AccionTarea | null>(null);
  // La etiqueta de PR y su enlace llegan ya decididos por la consulta (§7.3): aquí solo se muestran.
  const estadoPrVisible = tarea.estadoPr;
  const motivosAtencion = tarea.atencionResponsable ?? [];
  const clavePrincipal = ORDEN_ACCION_PRINCIPAL.find((c) =>
    acciones.some((a) => a.clave === c && !a.destructivo),
  );

  async function alHacerClic(accion: AccionTarea) {
    if (accion.deshabilitada) return;
    if (accion.pedirMotivo || accion.destructivo) {
      setPendiente(accion);
      return;
    }
    try {
      await ejecutarAccion(accion);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'No se pudo completar la acción.');
    }
  }

  async function ejecutarAccion(accion: AccionTarea, motivo?: string) {
    if (!accion.ejecutar) {
      if (motivo === undefined) {
        await onEjecutar(accion.clave);
      } else {
        await onEjecutar(accion.clave, motivo);
      }
      return;
    }

    const resultado = await accion.ejecutar(motivo);
    if (!resultado.ok) throw new Error(resultado.mensaje);
    toast.success(accion.mensajeExito ?? 'Acción aplicada');
  }

  return (
    <article className="space-y-3">
      <CabeceraDeDetalle
        volver={volver}
        titulo={tarea.titulo}
        insignias={
          <>
            <Insignia tipo="tarea" estado={tarea.estado} />
            {tarea.devuelta && <Insignia tipo="marca" estado="DEVUELTA" />}
            {estadoPrVisible && <Insignia tipo="pr" estado={estadoPrVisible} />}
          </>
        }
        metadatos={
          <span className="tabular-nums">
            {tarea.idLegible} · {tarea.proyecto}
          </span>
        }
        acciones={
          acciones.length > 0 ? (
            <>
              {acciones.map((a) => (
                <div key={a.clave} className="space-y-1">
                  <Button
                    type="button"
                    variant={a.clave === clavePrincipal ? 'default' : 'outline'}
                    className={a.destructivo ? CLASE_DESTRUCTIVA : undefined}
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
            </>
          ) : undefined
        }
      />

      {tarea.devuelta && tarea.observacion && (
        <section className="rounded-xl bg-state-danger-bg p-3">
          <h2 className="text-sm font-semibold text-state-danger-text">
            Observaciones del supervisor
          </h2>
          <p className="mt-1 text-sm text-text">{tarea.observacion}</p>
        </section>
      )}

      {motivosAtencion.length > 0 && (
        <section
          role="status"
          className="rounded-xl bg-state-warning-bg p-3 text-state-warning-text"
        >
          <h2 className="text-sm font-semibold">Revisar el responsable de la tarea</h2>
          <p className="mt-1 text-sm">
            {motivosAtencion.map((motivo) => TEXTO_ATENCION[motivo]).join(' ')} Un Administrador o
            Supervisor puede liberar la tarea con un motivo.
          </p>
        </section>
      )}

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <PanelDeDatos titulo="Datos de la tarea">
            <ListaDeDefiniciones
              disposicion="filas"
              items={[
                { etiqueta: 'Responsable', valor: tarea.responsable ?? 'Sin asignar' },
                {
                  etiqueta: 'Fecha límite',
                  valor: (
                    <span className="tabular-nums">
                      {format(parseISO(tarea.fechaLimite), 'dd/MM/yyyy')}
                    </span>
                  ),
                },
                {
                  etiqueta: 'Requiere supervisión',
                  valor: tarea.requiereSupervision ? 'Sí' : 'No',
                },
                { etiqueta: 'Requiere PR', valor: tarea.requierePr ? 'Sí' : 'No' },
                ...(tarea.urlPr
                  ? [
                      {
                        etiqueta: 'Pull Request',
                        valor: (
                          <>
                            <a
                              href={tarea.urlPr}
                              className="break-all text-link underline underline-offset-2"
                            >
                              {tarea.urlPr}
                            </a>
                            {tarea.ramaOrigen && tarea.ramaBase && (
                              <span className="text-text-2">
                                {' '}
                                ({tarea.ramaOrigen} → {tarea.ramaBase})
                              </span>
                            )}
                          </>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </PanelDeDatos>

          <PanelDeDatos titulo="Historial de la tarea">
            <LineaTiempo eventos={eventos} />
          </PanelDeDatos>
        </div>

        <PanelDeDatos titulo="Descripción" className="lg:col-span-3">
          <p className="text-sm whitespace-pre-line text-text">{tarea.descripcion}</p>
        </PanelDeDatos>
      </div>

      {pendiente && (
        <ModalConfirmacion
          abierto
          onCerrar={() => setPendiente(null)}
          titulo={pendiente.etiqueta}
          descripcion={`${tarea.idLegible} · ${tarea.titulo}`}
          etiquetaConfirmar={pendiente.etiqueta}
          destructivo={pendiente.destructivo}
          pedirMotivo={pendiente.pedirMotivo ?? false}
          onConfirmar={(motivo) => ejecutarAccion(pendiente, motivo)}
        />
      )}
    </article>
  );
}

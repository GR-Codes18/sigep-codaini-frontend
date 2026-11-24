import { useState } from 'react';
import { toast } from 'sonner';
import type { EquipoParaVista, MiembroParaVista } from '@/app/adaptadores';
import { ModalConfirmacion } from '@/compartido/ModalConfirmacion';
import { FilaDeLista, ListaDeFilas } from '@/compartido/ListaDeFilas';
import { PanelDeDatos } from '@/compartido/PanelDeDatos';
import { Button } from '@/compartido/ui/button';
import type { Id } from '@/domain';
import { ENTORNO, quitarPracticante, type Entorno, type Resultado } from '@/services';
import { AsignarPracticantes } from './AsignarPracticantes';

interface Props {
  idActor: Id;
  proyecto: { id: Id; nombre: string };
  equipo: EquipoParaVista;
  entorno?: Entorno;
}

const plural = (n: number, singular: string, plurales: string) =>
  `${n} ${n === 1 ? singular : plurales}`;

/** Un error de servicio llega al modal como excepción: el modal se queda abierto y muestra el mensaje. */
function exigirExito<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(resultado.mensaje);
  return resultado.valor;
}

/**
 * La pestaña «Equipo» del proyecto (§5.4): practicantes activos con su carga y anteriores con alta y baja. Quien puede
 * asigna (uno o varios, con su carga a la vista) y quita; los dos están bloqueados en un proyecto finalizado, y es
 * `domain/` quien lo decide (`puede_asignar` y `puede_quitar` llegan con la consulta). Quitar avisa cuántas tareas en
 * progreso se liberarán, y ese número también lo calcula `domain/`.
 */
export function EquipoDelProyecto({ idActor, proyecto, equipo, entorno = ENTORNO }: Props) {
  const [asignando, setAsignando] = useState(false);
  const [quitando, setQuitando] = useState<MiembroParaVista | null>(null);

  return (
    <div className="space-y-3">
      <PanelDeDatos
        titulo="Practicantes activos"
        nombre="Practicantes activos"
        acciones={
          equipo.puedeAsignar ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setAsignando(true)}>
              Asignar practicantes
            </Button>
          ) : undefined
        }
      >
        {equipo.estadoProyecto === 'FINALIZADO' && (
          <p role="note" className="text-xs text-text-2">
            Un proyecto finalizado no admite asignar ni quitar practicantes: si hace falta, se
            reactiva primero.
          </p>
        )}
        {equipo.activos.length === 0 ? (
          <p className="text-sm text-text-2">Este proyecto aún no tiene practicantes.</p>
        ) : (
          <ListaDeFilas>
            {equipo.activos.map((m) => (
              <FilaDeLista key={m.id}>
                <div className="min-w-0">
                  <p className="font-medium text-text">{m.nombre}</p>
                  <p className="text-xs text-text-2">
                    {m.correo} · {m.especialidad}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-text-2 tabular-nums">
                    {plural(m.carga, 'tarea en progreso', 'tareas en progreso')} · Desde{' '}
                    {m.altaTexto}
                  </p>
                  {m.puedeQuitar && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Quitar a ${m.nombre}`}
                      onClick={() => setQuitando(m)}
                    >
                      Quitar
                    </Button>
                  )}
                </div>
              </FilaDeLista>
            ))}
          </ListaDeFilas>
        )}
      </PanelDeDatos>

      <PanelDeDatos titulo="Practicantes anteriores" nombre="Practicantes anteriores">
        {equipo.anteriores.length === 0 ? (
          <p className="text-sm text-text-2">Aún no hay practicantes anteriores.</p>
        ) : (
          <ListaDeFilas>
            {equipo.anteriores.map((m, i) => (
              <FilaDeLista key={`${m.id}-${i}`}>
                <span className="font-medium text-text">{m.nombre}</span>
                <p className="text-xs text-text-2 tabular-nums">
                  Alta: {m.altaTexto} · Baja: {m.bajaTexto}
                </p>
              </FilaDeLista>
            ))}
          </ListaDeFilas>
        )}
      </PanelDeDatos>

      {asignando && (
        <AsignarPracticantes
          idActor={idActor}
          proyecto={proyecto}
          onCerrar={() => setAsignando(false)}
          entorno={entorno}
        />
      )}

      {quitando !== null && (
        <ModalConfirmacion
          abierto
          onCerrar={() => setQuitando(null)}
          titulo="Quitar practicante"
          descripcion={`${quitando.nombre} saldrá de ${proyecto.nombre}: su asignación recibe fecha de baja y no se borra. ${
            quitando.tareasALiberar === 0
              ? 'No tiene tareas en progreso en este proyecto.'
              : `Tiene ${plural(quitando.tareasALiberar, 'tarea en progreso que será liberada', 'tareas en progreso que serán liberadas')} en este proyecto.`
          }`}
          etiquetaConfirmar="Quitar"
          destructivo
          pedirMotivo={{ etiqueta: 'Motivo', obligatorio: false }}
          onConfirmar={async (motivo) => {
            exigirExito(
              await quitarPracticante(
                {
                  idActor,
                  idProyecto: proyecto.id,
                  idPracticante: quitando.id,
                  motivo: motivo === '' ? undefined : motivo,
                },
                entorno,
              ),
            );
            toast.success('Practicante quitado del proyecto');
          }}
        />
      )}
    </div>
  );
}

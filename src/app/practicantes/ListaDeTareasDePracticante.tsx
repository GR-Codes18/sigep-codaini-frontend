import type { TareaDePracticanteParaVista } from '@/app/adaptadores';
import { Insignia } from '@/compartido/Insignia';
import { FilaDeLista, ListaDeFilas } from '@/compartido/ListaDeFilas';
import { PanelDeDatos } from '@/compartido/PanelDeDatos';

/**
 * Las tareas de un practicante en el detalle: la usan el Administrador (§5.2) y el Supervisor (§9.1.2, solo las de sus
 * proyectos). Solo presenta; no tiene botones.
 */
export function ListaDeTareasDePracticante({
  titulo,
  vacio,
  tareas,
}: {
  titulo: string;
  vacio: string;
  tareas: TareaDePracticanteParaVista[];
}) {
  return (
    <PanelDeDatos titulo={titulo}>
      {tareas.length === 0 ? (
        <p className="text-sm text-text-2">{vacio}</p>
      ) : (
        <ListaDeFilas>
          {tareas.map(({ tarea, proyecto }) => (
            <FilaDeLista key={tarea.id}>
              <div className="min-w-0">
                <p className="text-text">
                  <span className="font-medium">{tarea.idLegible}</span> · {tarea.titulo}
                </p>
                <p className="text-xs text-text-2">{proyecto.nombre}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-2 tabular-nums">
                  Límite: {tarea.fechaLimite}
                </span>
                <Insignia tipo="tarea" estado={tarea.estado} />
              </div>
            </FilaDeLista>
          ))}
        </ListaDeFilas>
      )}
    </PanelDeDatos>
  );
}

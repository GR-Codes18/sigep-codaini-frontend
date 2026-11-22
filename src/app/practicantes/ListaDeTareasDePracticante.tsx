import type { TareaDePracticanteParaVista } from '@/app/adaptadores';
import { Insignia } from '@/compartido/Insignia';

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
    <section aria-label={titulo} className="space-y-2">
      <h2 className="text-text">{titulo}</h2>
      {tareas.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-text-2">
          {vacio}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {tareas.map(({ tarea, proyecto }) => (
            <li
              key={tarea.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
            >
              <div>
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

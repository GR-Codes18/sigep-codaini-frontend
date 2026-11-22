import type { CriterioParaVista } from '@/app/adaptadores';

interface BloqueProps {
  titulo: string;
  /** Puntaje del bloque, de 0 a 100. */
  puntaje: number;
  criterios: CriterioParaVista[];
}

function Bloque({ titulo, puntaje, criterios }: BloqueProps) {
  return (
    <section aria-label={titulo} className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-text">{titulo}</h3>
        <p className="text-sm text-text-2 tabular-nums">Puntaje del bloque: {puntaje}/100</p>
      </div>
      {criterios.length === 0 ? (
        <p className="text-sm text-text-2">Este bloque no tiene criterios evaluados.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full border-collapse text-[13px] tabular-nums">
            <thead className="bg-surface-2">
              <tr>
                {['Criterio', 'Peso', '¿Cumple?', 'Puntaje', 'Observación'].map((encabezado) => (
                  <th
                    key={encabezado}
                    scope="col"
                    className="h-11 px-4 text-left font-semibold text-text-2"
                  >
                    {encabezado}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {criterios.map((c) => (
                <tr key={c.nombre} className="border-t border-border">
                  <td className="px-4 py-2 text-text">{c.nombre}</td>
                  <td className="px-4 py-2 text-text">{c.peso}</td>
                  <td className="px-4 py-2 text-text">{c.cumplido ? 'Sí' : 'No'}</td>
                  <td className="px-4 py-2 text-text">{c.puntaje}</td>
                  <td className="px-4 py-2 text-text-2">{c.observacion || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

interface Props {
  puntajeArea: number;
  puntajeEspecialidad: number;
  bloques: { AREA: CriterioParaVista[]; ESPECIALIDAD: CriterioParaVista[] };
}

/**
 * El desglose criterio por criterio con el que se evaluó, separado en los dos bloques (§5.1): criterios del área y
 * criterios de la especialidad. Es el desglose guardado: cambiar los criterios después no lo altera.
 */
export function DesgloseEvaluacion({ puntajeArea, puntajeEspecialidad, bloques }: Props) {
  return (
    <div className="space-y-6">
      <Bloque titulo="Criterios del área" puntaje={puntajeArea} criterios={bloques.AREA} />
      <Bloque
        titulo="Criterios de la especialidad"
        puntaje={puntajeEspecialidad}
        criterios={bloques.ESPECIALIDAD}
      />
    </div>
  );
}

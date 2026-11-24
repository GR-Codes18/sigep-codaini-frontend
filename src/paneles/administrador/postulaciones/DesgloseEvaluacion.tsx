import type { CriterioParaVista } from '@/app/adaptadores';

/** Las columnas cortas se ajustan a su contenido para dejar el ancho a «Criterio» y «Observación». */
const COLUMNA_AJUSTADA = new Set(['Peso', '¿Cumple?', 'Puntaje']);

interface BloqueProps {
  titulo: string;
  /** Puntaje del bloque, de 0 a 100. */
  puntaje: number;
  criterios: CriterioParaVista[];
  /** Peso del bloque en la nota final, en %; si no se conoce, no se muestra. */
  peso?: number;
}

function Bloque({ titulo, puntaje, criterios, peso }: BloqueProps) {
  const ancho = Math.min(100, Math.max(0, puntaje));
  return (
    <section aria-label={titulo} className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-text">{titulo}</h3>
        <p className="text-xs text-text-2 tabular-nums">
          {peso !== undefined && <>Peso en la nota: {peso} % · </>}
          Puntaje del bloque: {puntaje}/100
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={`Puntaje: ${titulo}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={puntaje}
        className="h-1.5 overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${ancho}%` }} />
      </div>
      {criterios.length === 0 ? (
        <p className="text-xs text-text-2">Este bloque no tiene criterios evaluados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px] tabular-nums">
            <thead className="bg-surface-2">
              <tr>
                {['Criterio', 'Peso', '¿Cumple?', 'Puntaje', 'Observación'].map((encabezado) => (
                  <th
                    key={encabezado}
                    scope="col"
                    className={`h-9 px-3 text-left text-xs font-semibold text-text-2 ${COLUMNA_AJUSTADA.has(encabezado) ? 'w-0 whitespace-nowrap' : ''}`}
                  >
                    {encabezado}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {criterios.map((c) => (
                <tr key={c.nombre} className="border-t border-border">
                  <td className="px-3 py-2 text-text">{c.nombre}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-text">{c.peso}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-text">
                    {c.cumplido ? 'Sí' : 'No'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-text">{c.puntaje}</td>
                  <td className="px-3 py-2 text-xs text-text-2">{c.observacion || '—'}</td>
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
  /** Los pesos de cada bloque en la nota, en %, si se conocen. */
  pesos?: { area: number; especialidad: number } | null;
  bloques: { AREA: CriterioParaVista[]; ESPECIALIDAD: CriterioParaVista[] };
}

/**
 * El desglose criterio por criterio con el que se evaluó, separado en los dos bloques (§5.1): criterios del área y
 * criterios de la especialidad. Cada bloque lleva su puntaje con una barra y su tabla. Es el desglose guardado:
 * cambiar los criterios después no lo altera. No dibuja cajas: va dentro del panel de la evaluación.
 */
export function DesgloseEvaluacion({ puntajeArea, puntajeEspecialidad, pesos, bloques }: Props) {
  return (
    <div className="space-y-4">
      <Bloque
        titulo="Criterios del área"
        puntaje={puntajeArea}
        peso={pesos?.area}
        criterios={bloques.AREA}
      />
      <div className="border-t border-border pt-4">
        <Bloque
          titulo="Criterios de la especialidad"
          puntaje={puntajeEspecialidad}
          peso={pesos?.especialidad}
          criterios={bloques.ESPECIALIDAD}
        />
      </div>
    </div>
  );
}

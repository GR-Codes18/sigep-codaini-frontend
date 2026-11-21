import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PracticantesPorAreaParaVista } from '@/app/adaptadores';

/**
 * Colores solo con los tokens de `index.css` (variables CSS): cambian solos con el tema claro y oscuro. La barra usa
 * `--link`, el verde de la marca con contraste suficiente en los dos temas.
 */
const COLOR_BARRA = 'var(--link)';
const COLOR_EJE = 'var(--text-2)';
const COLOR_REJILLA = 'var(--border)';
const ESTILO_ETIQUETA = { fill: COLOR_EJE, fontSize: 12 };
const ESTILO_TOOLTIP = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 12,
};

const ALTO_POR_AREA = 36;
const ALTO_MINIMO = 120;

/**
 * Practicantes por área (§5.6) en barras horizontales. Es una ayuda visual: la información completa está en la tabla
 * «Practicantes por área» (la alternativa accesible), por eso el gráfico se oculta a los lectores de pantalla. Sin datos
 * no se dibuja nada.
 */
export function GraficoPracticantesPorArea({ datos }: { datos: PracticantesPorAreaParaVista[] }) {
  if (datos.length === 0) {
    return (
      <p className="text-sm text-text-2" role="status">
        No hay practicantes por área para graficar.
      </p>
    );
  }
  const alto = Math.max(ALTO_MINIMO, datos.length * ALTO_POR_AREA + 40);
  return (
    <div aria-hidden="true" data-testid="grafico-practicantes-por-area" style={{ height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid horizontal={false} stroke={COLOR_REJILLA} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={ESTILO_ETIQUETA}
            stroke={COLOR_REJILLA}
          />
          <YAxis
            type="category"
            dataKey="area"
            width={120}
            tick={ESTILO_ETIQUETA}
            stroke={COLOR_REJILLA}
          />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            contentStyle={ESTILO_TOOLTIP}
            labelStyle={{ color: 'var(--text)' }}
            formatter={(valor) => [String(valor), 'Practicantes']}
          />
          <Bar dataKey="practicantes" fill={COLOR_BARRA} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

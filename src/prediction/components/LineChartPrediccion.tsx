import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

export interface SerieChart {
  dataKey: string;
  name: string;
  color?: string;
}

interface Props {
  data: Array<Record<string, number | string | null>>;
  xKey: string;
  series: SerieChart[];
  height?: number;
  unit?: string;
  /** Líneas de umbral punteadas (p. ej. alerta/riesgo). */
  referencias?: { y: number; label: string; color?: string }[];
  yDomain?: [number, number];
}

/** Paleta por defecto sobre tokens del sistema de diseño (funciona en light/dark). */
const PALETA = ['var(--brand-500)', 'var(--sem-warning)', 'var(--sem-error)', 'var(--sem-info)', 'var(--sem-success)'];
const AXIS_STYLE = { fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' } as const;

/**
 * Wrapper de gráfico de líneas del módulo de predicción (RF-67 tendencia de riesgo).
 * Único punto que consume `recharts` aquí; el resto del módulo no depende de la librería.
 */
export function LineChartPrediccion({ data, xKey, series, height = 260, unit, referencias, yDomain }: Props) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>
        Sin datos para graficar en el período seleccionado.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
          <XAxis dataKey={xKey} tick={AXIS_STYLE} stroke="var(--surface-border)" minTickGap={24} />
          <YAxis
            tick={AXIS_STYLE}
            stroke="var(--surface-border)"
            width={44}
            domain={yDomain}
            label={unit ? { value: unit, angle: -90, position: 'insideLeft', style: { ...AXIS_STYLE, textAnchor: 'middle' } } : undefined}
          />
          <Tooltip
            contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', fontSize: '12px', color: 'var(--text-primary)' }}
            labelStyle={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
          />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: '12px' }} />}
          {referencias?.map((r) => (
            <ReferenceLine key={r.label} y={r.y} stroke={r.color ?? 'var(--sem-error)'} strokeDasharray="4 4" label={{ value: r.label, position: 'right', fontSize: 10, fill: r.color ?? 'var(--sem-error)' }} />
          ))}
          {series.map((s, i) => (
            <Line key={s.dataKey} type="monotone" dataKey={s.dataKey} name={s.name} stroke={s.color ?? PALETA[i % PALETA.length]} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

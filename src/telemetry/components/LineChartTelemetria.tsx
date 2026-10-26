// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-23 | destroyerban | FE-11 RF-59: aviso de truncado y marca de intervalos vacíos |
// | 2026-10-26 | Arekkazu | INC-M03-193-G121 RF-59: tramos por variable (mismo color, una entrada de leyenda) |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceArea,
} from 'recharts';

export interface SerieChart {
  dataKey: string;
  name: string;
  color?: string;
  /** Tramo de una misma variable tras un vacío: mismo color, sin repetir en la leyenda. */
  indiceColor?: number;
  ocultarEnLeyenda?: boolean;
}

interface Props {
  data: Array<Record<string, number | string | null>>;
  xKey: string;
  series: SerieChart[];
  height?: number;
  unit?: string;
  /** Formato del eje X y del tooltip (p. ej. hora de un timestamp ISO). */
  formatX?: (valor: string) => string;
  /** RF-59 E7 (FE-11): tramos sin datos, sombreados con `etiquetaSinDatos`. */
  zonasSinDatos?: { x1: string; x2: string }[];
  etiquetaSinDatos?: string;
}

/** Paleta por defecto sobre tokens del sistema de diseño (funciona en light/dark). */
const PALETA = [
  'var(--brand-500)',
  'var(--sem-info)',
  'var(--sem-warning)',
  'var(--sem-error)',
  'var(--sem-success)',
];

const AXIS_STYLE = { fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' } as const;

/**
 * Wrapper de gráfico de líneas (RF-59 historial / RF-62 tendencia de calidad).
 * Único punto que consume `recharts`; el resto del módulo no depende de la librería.
 */
export function LineChartTelemetria({ data, xKey, series, height = 260, unit, formatX, zonasSinDatos, etiquetaSinDatos }: Props) {
  const { t } = useT('telemetry');
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
          border: '1px dashed var(--surface-border)',
          borderRadius: 'var(--r-lg)',
        }}
      >{t('linecharttelemetria.sin_datos_para_graficar_en_el_periodo')}</div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
          <XAxis
            dataKey={xKey} tick={AXIS_STYLE} stroke="var(--surface-border)" minTickGap={24}
            tickFormatter={formatX ? (v) => formatX(String(v)) : undefined}
          />
          <YAxis
            tick={AXIS_STYLE}
            stroke="var(--surface-border)"
            width={44}
            label={
              unit
                ? { value: unit, angle: -90, position: 'insideLeft', style: { ...AXIS_STYLE, textAnchor: 'middle' } }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface-card)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--r-md)',
              fontSize: '12px',
              color: 'var(--text-primary)',
            }}
            labelStyle={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
            labelFormatter={formatX ? (v) => formatX(String(v)) : undefined}
          />
          {zonasSinDatos?.map((z) => (
            <ReferenceArea
              key={`${z.x1}-${z.x2}`} x1={z.x1} x2={z.x2}
              fill="var(--text-muted)" fillOpacity={0.12} stroke="var(--text-muted)" strokeDasharray="4 4"
              label={etiquetaSinDatos ? { value: etiquetaSinDatos, position: 'insideTop', fontSize: 11, fill: 'var(--text-muted)' } : undefined}
            />
          ))}
          {series.filter((s) => !s.ocultarEnLeyenda).length > 1 && <Legend wrapperStyle={{ fontSize: '12px' }} />}
          {series.map((s, i) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color ?? PALETA[(s.indiceColor ?? i) % PALETA.length]}
              legendType={s.ocultarEnLeyenda ? 'none' : undefined}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

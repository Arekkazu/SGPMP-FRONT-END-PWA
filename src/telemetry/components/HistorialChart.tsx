import React, { useMemo } from 'react';
import { LineChartTelemetria, type SerieChart } from './LineChartTelemetria';
import { horaCaptura } from '../lib/sensorEscala';
import type { LecturaHistoricaSchema } from '../types';

/**
 * Pivotea las lecturas a una serie temporal: una línea por `tipo_variable`.
 * El eje X es el timestamp de captura (orden ascendente).
 */
function buildChart(items: LecturaHistoricaSchema[]): { data: Array<Record<string, number | string | null>>; series: SerieChart[] } {
  if (items.length === 0) return { data: [], series: [] };

  const variables = Array.from(new Set(items.map((i) => i.tipo_variable)));
  const ordenados = [...items].sort((a, b) => a.timestamp_captura.localeCompare(b.timestamp_captura));

  const byTs = new Map<string, Record<string, number | string | null>>();
  for (const it of ordenados) {
    const key = it.timestamp_captura;
    const row = byTs.get(key) ?? { x: horaCaptura(key) };
    if (it.valor != null) row[it.tipo_variable] = it.valor;
    byTs.set(key, row);
  }

  const series: SerieChart[] = variables.map((v) => ({ dataKey: v, name: v }));
  return { data: Array.from(byTs.values()), series };
}

export function HistorialChart({ items, unidad }: { items: LecturaHistoricaSchema[]; unidad?: string }) {
  const { data, series } = useMemo(() => buildChart(items), [items]);
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s5)', marginBottom: 'var(--s6)' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>Evolución de lecturas</h3>
      <LineChartTelemetria data={data} xKey="x" series={series} unit={unidad} height={280} />
    </div>
  );
}

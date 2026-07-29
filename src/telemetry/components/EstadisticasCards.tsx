import React from 'react';
import type { ResumenEstadisticoSchema } from '../types';

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

export function EstadisticasCards({ estadisticas }: { estadisticas: ResumenEstadisticoSchema[] }) {
  if (estadisticas.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--s4)', marginBottom: 'var(--s6)' }}>
      {estadisticas.map((e) => (
        <div key={e.tipo_variable} style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--s3)' }}>{e.tipo_variable}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--s3)' }}>
            <Metric label="Mínimo" value={fmt(e.valor_minimo)} />
            <Metric label="Máximo" value={fmt(e.valor_maximo)} />
            <Metric label="Promedio" value={fmt(e.valor_promedio)} />
            <Metric label="Lecturas" value={fmt(e.total_lecturas)} />
            <Metric label="% en rango" value={e.pct_dentro_rango != null ? `${fmt(e.pct_dentro_rango)}%` : '—'} />
            <Metric label="Alertas" value={fmt(e.total_alertas_en_periodo)} />
          </div>
        </div>
      ))}
    </div>
  );
}

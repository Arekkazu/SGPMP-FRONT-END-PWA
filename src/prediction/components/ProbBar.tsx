import React from 'react';

interface Props {
  label: string;
  /** Valor 0–1. */
  valor: number;
  color?: string;
}

/** Barra de probabilidad horizontal con etiqueta y porcentaje (RF-66/RF-68). */
export function ProbBar({ label, valor, color = 'var(--brand-500)' }: Props) {
  const pct = Math.max(0, Math.min(100, valor * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
      <span style={{ flex: '0 0 140px', fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ flex: 1, height: 10, borderRadius: 'var(--r-full)', background: 'var(--surface-hover)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 'var(--r-full)' }} />
      </div>
      <span style={{ flex: '0 0 44px', textAlign: 'right', fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

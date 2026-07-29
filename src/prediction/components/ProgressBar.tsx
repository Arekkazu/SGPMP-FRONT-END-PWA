import React from 'react';

interface Props {
  /** Valor 0–100. */
  valor: number;
  color?: string;
  height?: number;
  label?: string;
}

/** Barra de progreso simple basada en tokens (OTA / reentrenamiento). */
export function ProgressBar({ valor, color = 'var(--brand-500)', height = 8, label }: Props) {
  const v = Math.max(0, Math.min(100, valor));
  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: 4 }}>
          <span>{label}</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{v.toFixed(0)}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(v)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        style={{ height, borderRadius: 'var(--r-full)', background: 'var(--surface-hover)', overflow: 'hidden' }}
      >
        <div style={{ width: `${v}%`, height: '100%', background: color, borderRadius: 'var(--r-full)', transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

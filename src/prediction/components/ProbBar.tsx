// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-31 | Arekkazu | USAB-M03-M04 T-19/T-22 RF-65/69/70: componentes con etiqueta y números en formato regional |
import React from 'react';
import { formatearNumero } from '../../shared/i18n/formato';

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
      <span style={{ flex: '0 0 44px', textAlign: 'right', fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{formatearNumero(pct / 100, { style: 'percent', maximumFractionDigits: 0 })}</span>
    </div>
  );
}

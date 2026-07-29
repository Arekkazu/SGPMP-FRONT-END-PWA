import React from 'react';

export type GaugeStatus = 'ok' | 'warning' | 'critical' | 'placeholder';

interface GaugeProps {
  /** Valor actual. `null` → estado sin dato (placeholder). */
  value: number | null;
  min?: number;
  max?: number;
  unit?: string;
  /** Color del arco. Si se omite se usa `placeholder` cuando `value` es null, si no `ok`. */
  status?: GaugeStatus;
  label?: string;
  /** Ancho en px (el alto es la mitad + espacio para el texto). */
  size?: number;
}

const STATUS_COLOR: Record<GaugeStatus, string> = {
  ok: 'var(--sem-success)',
  warning: 'var(--sem-warning)',
  critical: 'var(--sem-error)',
  placeholder: 'var(--text-muted)',
};

function clampPct(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const pct = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, pct));
}

/**
 * Medidor semicircular (180°) para el monitoreo de telemetría (RF-58 / RF-62).
 * Sin dependencias — SVG puro con tokens del sistema de diseño (light/dark).
 */
export function Gauge({
  value,
  min = 0,
  max = 100,
  unit,
  status,
  label,
  size = 132,
}: GaugeProps) {
  const isEmpty = value === null || Number.isNaN(value as number);
  const resolved: GaugeStatus = status ?? (isEmpty ? 'placeholder' : 'ok');
  const color = STATUS_COLOR[resolved];

  const w = size;
  const stroke = Math.round(size * 0.09);
  const r = (w - stroke) / 2;
  const cx = w / 2;
  const cy = w / 2;
  const arc = `M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${w - stroke / 2} ${cy}`;
  const pct = isEmpty ? 0 : clampPct(value as number, min, max);

  return (
    <div
      style={{ width: w, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      role="img"
      aria-label={`${label ? `${label}: ` : ''}${isEmpty ? 'sin dato' : `${value}${unit ? ` ${unit}` : ''}`}`}
    >
      <svg width={w} height={cy + stroke} viewBox={`0 0 ${w} ${cy + stroke}`}>
        <path
          d={arc}
          fill="none"
          stroke="var(--surface-hover)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={arc}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${pct} 100`}
          strokeDashoffset={0}
          style={{ transition: 'stroke-dasharray 0.4s ease, stroke 0.3s ease' }}
          opacity={isEmpty ? 0.35 : 1}
        />
      </svg>
      <div style={{ marginTop: -Math.round(size * 0.28), textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: size < 120 ? '15px' : '18px',
            fontWeight: 700,
            color: isEmpty ? 'var(--text-muted)' : 'var(--text-primary)',
            lineHeight: 1.1,
          }}
        >
          {isEmpty ? '—' : value}
          {!isEmpty && unit && (
            <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', marginLeft: 2 }}>
              {unit}
            </span>
          )}
        </div>
        {label && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
        )}
      </div>
    </div>
  );
}

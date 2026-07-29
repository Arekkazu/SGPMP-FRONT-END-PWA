import React from 'react';

export type Tono = 'success' | 'error' | 'warning' | 'info' | 'neutral';

const MAP: Record<Tono, [string, string, string]> = {
  success: ['var(--sem-success)', 'var(--sem-success-bg)', 'var(--sem-success-border)'],
  error: ['var(--sem-error)', 'var(--sem-error-bg)', 'var(--sem-error-border)'],
  warning: ['var(--sem-warning)', 'var(--sem-warning-bg)', 'var(--sem-warning-border)'],
  info: ['var(--sem-info)', 'var(--sem-info-bg)', 'var(--sem-info-border)'],
  neutral: ['var(--text-muted)', 'var(--surface-hover)', 'var(--surface-border)'],
};

interface Props {
  tono: Tono;
  children: React.ReactNode;
  icon?: React.ReactNode;
  title?: string;
}

/** Etiqueta compacta con icono + texto + color (WCAG 1.4.1: nunca color solo). */
export function Pill({ tono, children, icon, title }: Props) {
  const [fg, bg, bd] = MAP[tono];
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--s1)',
        fontSize: '11px',
        fontWeight: 600,
        color: fg,
        background: bg,
        border: `1px solid ${bd}`,
        padding: '2px var(--s2)',
        borderRadius: 'var(--r-full)',
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {children}
    </span>
  );
}

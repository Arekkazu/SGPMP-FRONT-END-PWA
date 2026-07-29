import React from 'react';

interface Props {
  icon: React.ReactNode;
  valor: React.ReactNode;
  etiqueta: string;
  sub?: string;
  color?: string;
}

export function KpiCard({ icon, valor, etiqueta, sub, color = 'var(--brand-500)' }: Props) {
  return (
    <div style={{ flex: '1 1 150px', minWidth: 150, background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', color }}>
        {icon}
        <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{valor}</span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{etiqueta}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

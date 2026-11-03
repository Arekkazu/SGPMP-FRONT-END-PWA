// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | USAB-M03 prototipo 13.4 RF-57/RF-58: la tarjeta filtra la vista al tocarla |
import React from 'react';
import { OptionCard } from '../../shared/design-system/OptionCard';

interface Props {
  icon: React.ReactNode;
  valor: React.ReactNode;
  etiqueta: string;
  sub?: string;
  color?: string;
  /** Con `onClick` la tarjeta es un filtro: botón con `aria-pressed` (prototipo M03, sección 13.4). */
  onClick?: () => void;
  activo?: boolean;
}

const CAJA: React.CSSProperties = { flex: '1 1 150px', minWidth: 150, padding: 'var(--s4)' };

export function KpiCard({ icon, valor, etiqueta, sub, color = 'var(--brand-500)', onClick, activo }: Props) {
  const contenido = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', color }}>
        {icon}
        <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{valor}</span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{etiqueta}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </>
  );
  if (onClick) {
    return <OptionCard selected={!!activo} onClick={onClick} style={{ ...CAJA, width: 'auto' }}>{contenido}</OptionCard>;
  }
  return (
    <div style={{ ...CAJA, background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)' }}>
      {contenido}
    </div>
  );
}

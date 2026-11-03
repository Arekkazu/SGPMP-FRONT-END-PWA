// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: título, propósito y acción principal de cada vista |
import React from 'react';

interface Props { titulo: string; descripcion: string; acciones?: React.ReactNode }

export function EncabezadoVista({ titulo, descripcion, acciones }: Props) {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
      <div style={{ minWidth: 0, flex: '1 1 320px' }}>
        <h1 style={{ margin: 0, fontSize: 'var(--fs-heading-md)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: 'var(--ls-tight)', lineHeight: 'var(--lh-snug)' }}>{titulo}</h1>
        <p style={{ margin: 'var(--s1) 0 0', fontSize: 'var(--fs-body-md)', color: 'var(--text-secondary)', maxWidth: '68ch', lineHeight: 'var(--lh-base)' }}>{descripcion}</p>
      </div>
      {acciones && <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>{acciones}</div>}
    </header>
  );
}

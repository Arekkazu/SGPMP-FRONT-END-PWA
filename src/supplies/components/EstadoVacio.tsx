// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: estado vacío que explica qué hacer |
import React from 'react';

interface Props { icono: React.ReactNode; titulo: string; detalle: string; accion?: React.ReactNode }

export function EstadoVacio({ icono, titulo, detalle, accion }: Props) {
  return (
    <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--s2)', textAlign: 'center', padding: 'var(--s8) var(--s4)', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)', color: 'var(--text-secondary)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{icono}</span>
      <p style={{ margin: 0, fontSize: 'var(--fs-heading-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{titulo}</p>
      <p style={{ margin: 0, fontSize: 'var(--fs-body-md)', maxWidth: '52ch', lineHeight: 'var(--lh-base)' }}>{detalle}</p>
      {accion && <div style={{ marginTop: 'var(--s2)' }}>{accion}</div>}
    </div>
  );
}

import React from 'react';
import { Hammer } from 'lucide-react';

interface Props {
  titulo: string;
  rf: string;
  descripcion?: string;
}

/** Placeholder temporal para vistas del módulo aún no implementadas. */
export function EnConstruccion({ titulo, rf, descripcion }: Props) {
  return (
    <div style={{ padding: 'var(--s7)' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--s3)',
          textAlign: 'center',
          color: 'var(--text-muted)',
          padding: 'var(--s8) var(--s4)',
          border: '1px dashed var(--surface-border)',
          borderRadius: 'var(--r-lg)',
        }}
      >
        <Hammer size={28} aria-hidden />
        <div>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {titulo}
          </p>
          <p style={{ margin: 'var(--s1) 0 0', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{rf}</p>
          {descripcion && <p style={{ margin: 'var(--s2) 0 0', fontSize: '13px' }}>{descripcion}</p>}
        </div>
      </div>
    </div>
  );
}

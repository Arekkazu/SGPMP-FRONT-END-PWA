import React from 'react';
import { Boxes, User } from 'lucide-react';
import { Badge } from '../../shared/design-system/Badge';
import { EstadoPill } from './EstadoPill';

interface MetaItem {
  label: string;
  value: React.ReactNode;
}

interface Props {
  idActivo: number;
  identificador: string | null;
  tipo: string;
  estado: string | null;
  especie?: string | null;
  infraestructura?: string | null;
  fase?: string | null;
  diasEnSistema?: number | null;
}

function Meta({ items }: { items: MetaItem[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s6)', marginTop: 'var(--s4)' }}>
      {items.map((m) => (
        <div key={m.label}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
            }}
          >
            {m.label}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: 2 }}>{m.value}</div>
        </div>
      ))}
    </div>
  );
}

export function ActivoHeader({
  idActivo, identificador, tipo, estado, especie, infraestructura, fase, diasEnSistema,
}: Props) {
  const esPoblacional = String(tipo).toUpperCase() === 'POBLACIONAL';

  const meta: MetaItem[] = [
    { label: 'Especie', value: especie ?? '—' },
    { label: 'Infraestructura', value: infraestructura ?? '—' },
    { label: 'Fase activa', value: fase ?? '—' },
  ];
  if (diasEnSistema != null) {
    meta.push({ label: 'Días en sistema', value: diasEnSistema });
  }

  return (
    <div
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--s5) var(--s6)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s4)', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {identificador ?? (
                <span style={{ fontFamily: 'var(--font-mono)' }}>Activo #{idActivo}</span>
              )}
            </h2>
            <Badge variant="neutral">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {esPoblacional ? <Boxes size={12} aria-hidden /> : <User size={12} aria-hidden />}
                {esPoblacional ? 'Poblacional' : 'Individual'}
              </span>
            </Badge>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
            ID #{idActivo}
          </div>
        </div>
        <EstadoPill estado={estado} size="md" />
      </div>
      <Meta items={meta} />
    </div>
  );
}

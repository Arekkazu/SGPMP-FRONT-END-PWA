import React from 'react';
import type { EspecieResponse } from '../types';

interface Props {
  especies: EspecieResponse[];
  loading: boolean;
  onSelect: (especie: EspecieResponse) => void;
}

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 'var(--s4)',
};

const CARD_BASE: React.CSSProperties = {
  padding: 'var(--s5)',
  borderRadius: 'var(--r-lg)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  cursor: 'pointer',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  textAlign: 'left',
  width: '100%',
};

const CARD_DISABLED: React.CSSProperties = {
  ...CARD_BASE,
  cursor: 'not-allowed',
  opacity: 0.5,
};

export function EspecieSelector({ especies, loading, onSelect }: Props) {
  if (loading) {
    return (
      <div style={GRID}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 90,
              borderRadius: 'var(--r-lg)',
              background: 'var(--surface-hover)',
              animation: 'pulse 1.4s ease-in-out infinite',
            }}
          />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }

  const activas = especies.filter((e) => e.es_activo);
  const inactivas = especies.filter((e) => !e.es_activo);

  if (especies.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s7) 0', fontSize: '14px' }}>
        No hay especies registradas. Ve al tab "Catálogo" para agregar una.
      </p>
    );
  }

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s5)' }}>
        Selecciona una especie para gestionar sus ciclos biológicos, patologías, métricas y umbrales.
      </p>
      <div style={GRID}>
        {activas.map((e) => (
          <button
            key={e.id_especie}
            type="button"
            style={CARD_BASE}
            onClick={() => onSelect(e)}
            onMouseEnter={(ev) => {
              (ev.currentTarget as HTMLButtonElement).style.borderColor = 'var(--brand-500)';
              (ev.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-sm)';
            }}
            onMouseLeave={(ev) => {
              (ev.currentTarget as HTMLButtonElement).style.borderColor = 'var(--surface-border)';
              (ev.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: 'var(--s1)' }}>
              {e.nombre}
            </div>
            {e.descripcion && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {e.descripcion}
              </div>
            )}
            <div
              style={{
                marginTop: 'var(--s3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--s1)',
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--sem-success)',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sem-success)' }} />
              Activa
            </div>
          </button>
        ))}

        {inactivas.map((e) => (
          <div key={e.id_especie} style={CARD_DISABLED} title="Especie inactiva — no disponible para configuración">
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-muted)', marginBottom: 'var(--s1)' }}>
              {e.nombre}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--s3)', fontStyle: 'italic' }}>
              No disponible
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

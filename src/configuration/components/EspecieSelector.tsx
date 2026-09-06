import React from 'react';
import { useT } from '../../shared/i18n/useT';
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
  const { t } = useT('configuration');
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
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s7) 0', fontSize: '14px' }}>{t('especieselector.no_hay_especies_registradas_ve_al_tab')}</p>
    );
  }

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s5)' }}>{t('especieselector.selecciona_una_especie_para_gestionar_sus')}</p>
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
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sem-success)' }} />{t('especieselector.activa')}</div>
          </button>
        ))}

        {inactivas.map((e) => (
          <div key={e.id_especie} style={CARD_DISABLED} title={t('especieselector.especie_inactiva_no_disponible_para')}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-muted)', marginBottom: 'var(--s1)' }}>
              {e.nombre}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--s3)', fontStyle: 'italic' }}>{t('especieselector.no_disponible')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

import React from 'react';
import { useT } from '../../shared/i18n/useT';
import type { EspecieResponse } from '../types';
import { OptionCard } from '../../shared/design-system/OptionCard';

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

// Especie inactiva: se distingue por fondo y borde punteado, no con opacity
// (bajaba el contraste del texto por debajo de 4.5:1, regla del DS).
const CARD_DISABLED: React.CSSProperties = {
  padding: 'var(--s5)',
  borderRadius: 'var(--r-lg)',
  border: '1.5px dashed var(--surface-border)',
  background: 'var(--surface-hover)',
  cursor: 'not-allowed',
  textAlign: 'left',
  width: '100%',
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
          <OptionCard
            key={e.id_especie}
            onClick={() => onSelect(e)}
            style={{ padding: 'var(--s5)' }}
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
          </OptionCard>
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

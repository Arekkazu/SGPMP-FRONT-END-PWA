import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { CATALOGO_VARIABLES } from '../lib/catalogos';

interface Props {
  seleccionadas: number[];
  onChange: (ids: number[]) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Multiselect por chips para las variables sensóricas asociadas (RF-64).
 * Regla del backend: entre 2 y 6 variables. La validación de rango se hace en el form.
 */
export function VariablesSelector({ seleccionadas, onChange, error, disabled }: Props) {
  const { t } = useT('prediction');
  const toggle = (id: number) => {
    if (disabled) return;
    onChange(seleccionadas.includes(id) ? seleccionadas.filter((x) => x !== id) : [...seleccionadas, id]);
  };

  return (
    <div>
      <div
        role="group"
        aria-label={t('variablesselector.variables_sensoricas_asociadas')}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)' }}
      >
        {CATALOGO_VARIABLES.map((v) => {
          const activa = seleccionadas.includes(v.id);
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => toggle(v.id)}
              aria-pressed={activa}
              disabled={disabled}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--s1)',
                padding: 'var(--s1) var(--s3)',
                borderRadius: 'var(--r-full)',
                border: `1.5px solid ${activa ? 'var(--brand-500)' : 'var(--surface-border)'}`,
                background: activa ? 'var(--brand-50)' : 'var(--surface-card)',
                color: activa ? 'var(--brand-700)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: activa ? 700 : 500,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                minHeight: 32,
              }}
            >
              {v.nombre}
              {v.unidad && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', opacity: 0.7 }}>{v.unidad}</span>}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--s2)' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {seleccionadas.length} seleccionada(s) · se requieren entre 2 y 6
        </span>
      </div>
      {error && (
        <span role="alert" style={{ display: 'block', marginTop: 'var(--s1)', fontSize: '12px', color: 'var(--sem-error)' }}>
          {error}
        </span>
      )}
    </div>
  );
}

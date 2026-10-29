// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: plurales y separador de miles en contadores |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M4-02 RF-64: variables y especies del catálogo real, con nombre |
// | 2026-10-29 | Arekkazu | TC-DIS-178 RF-64 a11y 3.3.2/2.5.5: regla 2-6 asociada al grupo y opciones de 48 px |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import type { VariableSensorica } from '../lib/catalogos';

interface Props {
  /** Catálogo I3P-1 real (useCatalogosPatologia). */
  variables: VariableSensorica[];
  seleccionadas: number[];
  onChange: (ids: number[]) => void;
  error?: string;
  disabled?: boolean;
  /** Rótulo visible del grupo (aria-labelledby); sin él se usa un nombre propio. */
  idRotulo?: string;
}

/**
 * Multiselect por chips para las variables sensóricas asociadas (RF-64).
 * Regla del backend: entre 2 y 6 variables. La validación de rango se hace en el form.
 */
export function VariablesSelector({ variables, seleccionadas, onChange, error, disabled, idRotulo }: Props) {
  const { t } = useT('prediction');
  const toggle = (id: number) => {
    if (disabled) return;
    onChange(seleccionadas.includes(id) ? seleccionadas.filter((x) => x !== id) : [...seleccionadas, id]);
  };

  return (
    <div>
      <div
        role="group"
        aria-labelledby={idRotulo}
        aria-label={idRotulo ? undefined : t('variablesselector.variables_sensoricas_asociadas')}
        aria-describedby={error ? 'vars-regla vars-error' : 'vars-regla'}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)' }}
      >
        {variables.map((v) => {
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
                minHeight: 'var(--s9)',
              }}
            >
              {v.nombre}
              {v.unidad && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{v.unidad}</span>}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--s2)' }}>
        <span id="vars-regla" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {t('variablesselector.regla', { n: seleccionadas.length })}
        </span>
      </div>
      {error && (
        <span id="vars-error" role="alert" style={{ display: 'block', marginTop: 'var(--s1)', fontSize: '12px', color: 'var(--sem-error)' }}>
          {error}
        </span>
      )}
    </div>
  );
}

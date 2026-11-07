// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-30 | Arekkazu | INC-M03-135-G01 RF-49: selector extraído de CalibracionSection para reutilizarlo |
import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { OptionCard } from '../../shared/design-system/OptionCard';
import { iconoCategoriaSensor } from '../iconos';
import type { SensorResponse } from '../types';

/** Sensores activos del dispositivo como tarjetas seleccionables. */
export function SensorSelector({ sensores, loading, error, onSelect, onBack }: {
  sensores: SensorResponse[]; loading: boolean; error: { message: string } | null;
  onSelect: (s: SensorResponse) => void; onBack: () => void;
}) {
  const { t } = useT('configuration');
  const activos = sensores.filter((s) => s.es_activo);
  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} style={{ marginBottom: 'var(--s4)' }} aria-label={t('calibracionsection.cambiar_dispositivo')}>
        <ChevronLeft size={16} aria-hidden />{t('calibracionsection.cambiar_dispositivo')}</Button>
      {error && <Alert variant="error" title={t('calibracionsection.error_al_cargar_sensores')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 'var(--s4)' }}>
          {Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ height: 80, borderRadius: 'var(--r-xl)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />)}
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : activos.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: 'var(--s6) 0' }}>{t('calibracionsection.este_dispositivo_no_tiene_sensores_activos')}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 'var(--s4)' }}>
          {activos.map((s) => {
            const Icono = iconoCategoriaSensor(s.categoria);
            return (
              <OptionCard key={s.id_sensores} onClick={() => onSelect(s)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
                  <span className="ds-option__icono"><Icono size={20} strokeWidth={1.5} aria-hidden /></span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{s.nombre}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{s.categoria ?? t('calibracionsection.sin_categoria')}</div>
                  </div>
                </div>
              </OptionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

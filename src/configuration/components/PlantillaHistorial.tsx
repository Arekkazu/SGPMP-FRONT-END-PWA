import React from 'react';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import type { AplicacionPlantillaResponse } from '../types';

interface Props {
  historial: AplicacionPlantillaResponse[];
  loading: boolean;
}

export function PlantillaHistorial({ historial, loading }: Props) {
  const { t } = useT('configuration');
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 44, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s infinite' }} />
        ))}
      </div>
    );
  }

  if (historial.length === 0) {
    return (
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--s5) 0' }}>{t('plantillahistorial.no_hay_aplicaciones_registradas_aun')}</p>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {['#', 'Fecha aplicación', 'Plantilla', 'Config resultante', 'Diff'].map((h) => (
              <th key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-hover)', whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {historial.map((h) => {
            const beforeKeys = Object.keys(h.before_snapshot ?? {});
            const afterKeys = Object.keys(h.after_snapshot ?? {});
            const diffCount = afterKeys.filter((k) => JSON.stringify(h.after_snapshot?.[k]) !== JSON.stringify(h.before_snapshot?.[k])).length;

            return (
              <tr key={h.id_aplicacion_plantilla} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                  #{h.id_aplicacion_plantilla}
                </td>
                <td style={{ padding: '11px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                  {h.fecha_aplicacion
                    ? formatearFechaHora(h.fecha_aplicacion, { dateStyle: 'short', timeStyle: 'short' })
                    : '—'}
                </td>
                <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--brand-600)' }}>
                  #{h.id_plantilla}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {afterKeys.length} parámetros
                  </span>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  {diffCount > 0 ? (
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sem-success)', border: '1px solid var(--sem-success)', borderRadius: 'var(--r-full)', padding: '2px 7px' }}>
                      {diffCount} cambios
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('plantillahistorial.sin_cambios')}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

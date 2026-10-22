// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-53/RF-56: componentes del vector de comportamiento (RFC-011) |
import React from 'react';
import { ScanEye } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';

export interface VectorComportamiento {
  area: string;
  ventanaInicio: string;
  ventanaFin: string;
  individuos: number;
  densidad: number;
  dispersion: number;
  tasa: number;
  /** indicadores_calidad del sobre (RF-62); null cuando el sobre llegó sin ellos. */
  calidad: Record<string, string | number> | null;
}

const DATO: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' };
const ROTULO: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 };

/** Vector de comportamiento de un área: sin valor ni unidad, una ventana de observación por sobre. */
export function VectorComportamientoPanel({ vector }: { vector: VectorComportamiento }) {
  const { t } = useT('telemetry');
  const campos: [string, string][] = [
    [t('vision.area_observada'), vector.area],
    [t('vision.ventana'), `${vector.ventanaInicio} – ${vector.ventanaFin}`],
    [t('vision.individuos'), String(vector.individuos)],
    [t('vision.densidad'), vector.densidad.toFixed(4)],
    [t('vision.dispersion'), vector.dispersion.toFixed(4)],
    [t('vision.tasa'), vector.tasa.toFixed(4)],
  ];
  return (
    <section aria-label={t('vision.titulo')} style={{ border: '1px solid var(--sem-info-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>
        <ScanEye size={16} aria-hidden style={{ color: 'var(--sem-info)' }} />{t('vision.titulo')}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>sgpmp/&lt;serial&gt;/vision</span>
      </h3>
      <div className="ds-fg3" style={{ gap: 'var(--s4)' }}>
        {campos.map(([rotulo, valor]) => (
          <div key={rotulo}><div style={ROTULO}>{rotulo}</div><div style={DATO}>{valor}</div></div>
        ))}
      </div>
      <div style={{ marginTop: 'var(--s4)' }}>
        <div style={ROTULO}>{t('vision.indicadores_calidad')}</div>
        {vector.calidad ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)' }}>
            {Object.entries(vector.calidad).map(([k, v]) => (
              <span key={k} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--surface-hover)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-sm)', padding: '2px var(--s2)' }}>
                {k}: {v}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--sem-error)' }}>{t('vision.sin_indicadores')}</p>
        )}
      </div>
    </section>
  );
}

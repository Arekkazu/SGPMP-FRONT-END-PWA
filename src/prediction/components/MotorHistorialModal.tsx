// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-65: historial de configuración del motor, solo lectura |
import React from 'react';
import { History } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { Alert } from '../../shared/design-system/Alert';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { ModalShell } from './ModalShell';
import { TH, TD, THEAD_ROW } from './tableStyles';
import type { EventoAuditoriaM04Response } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface Props {
  eventos: EventoAuditoriaM04Response[];
  loading: boolean;
  error: ApiError | null;
  onClose: () => void;
}

type Snapshot = Record<string, unknown>;

function valor(s: Snapshot, k: string): string {
  const v = s[k];
  return v == null || v === '' ? '—' : String(v);
}

function versiones(s: Snapshot): string {
  const comp = s.versiones_activas_por_componente as Record<string, number> | null | undefined;
  if (comp && Object.keys(comp).length) return Object.entries(comp).map(([c, id]) => `${c} #${id}`).join(' · ');
  return s.id_version_modelo_activa != null ? `#${s.id_version_modelo_activa}` : '—';
}

const MONO: React.CSSProperties = { ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'nowrap' };

export function MotorHistorialModal({ eventos, loading, error, onClose }: Props) {
  const { t } = useT('prediction');
  const cols = [t('motorhistorial.col_config'), t('motorhistorial.col_riesgo'), t('motorhistorial.col_alerta'), t('motorhistorial.col_anomalia'), t('motorhistorial.col_ventana'), t('motorhistorial.col_version'), t('motorhistorial.col_modo'), t('motorhistorial.col_responsable'), t('motorhistorial.col_fecha')];

  return (
    <ModalShell title={t('motorhistorial.titulo')} onClose={onClose} maxWidth={720}>
      <p style={{ margin: '0 0 var(--s4)', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('motorhistorial.ayuda')}</p>
      {error && (
        <Alert variant={error.status === 403 ? 'warning' : 'error'} title={t(error.status === 403 ? 'motorhistorial.sin_permiso' : 'motorhistorial.error')} description={error.message} />
      )}
      {loading && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('motorhistorial.cargando')}</p>}
      {!loading && !error && eventos.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s7) var(--s4)', fontSize: '14px', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>
          <History size={28} aria-hidden style={{ marginBottom: 'var(--s2)' }} />
          <p style={{ margin: 0 }}>{t('motorhistorial.vacio')}</p>
        </div>
      )}
      {!loading && eventos.length > 0 && (
        <ScrollRegion label={t('motorhistorial.titulo')}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={THEAD_ROW}>{cols.map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
            <tbody>
              {eventos.map((e) => {
                const s = ((e.payload_evento?.valores_nuevos ?? {}) as Snapshot);
                return (
                  <tr key={e.id_evento}>
                    <td style={{ ...MONO, fontWeight: 600, color: 'var(--text-primary)' }}>v{valor(s, 'config_version')}</td>
                    <td style={MONO}>{valor(s, 'umbral_riesgo_alto')}</td>
                    <td style={MONO}>{valor(s, 'umbral_alerta_critica')}</td>
                    <td style={MONO}>{valor(s, 'umbral_score_anomalia')}</td>
                    <td style={MONO}>{valor(s, 'ventana_temporal_min')} min</td>
                    <td style={MONO}>{versiones(s)}</td>
                    <td style={MONO}>{valor(s, 'modo_ejecucion')}</td>
                    <td style={MONO}>{e.id_usuario != null ? `#${e.id_usuario}` : e.id_sistema ?? '—'}</td>
                    <td style={MONO}>{formatearFechaHora(e.fecha_evento)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollRegion>
      )}
    </ModalShell>
  );
}

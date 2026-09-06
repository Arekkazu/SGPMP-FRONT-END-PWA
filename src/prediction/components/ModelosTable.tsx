import React from 'react';
import { formatearFecha } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { Eye, BadgeCheck } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { EstadoModeloPill } from './EstadoModeloPill';
import { TIPO_MODELO_LABEL } from '../types';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import type { VersionModeloResponse } from '../types';

function fmtPct(v: number | null): string {
  return v == null ? '—' : `${(v * 100).toFixed(1)}%`;
}

function fmtFecha(dt: string | null): string {
  if (!dt) return '—';
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : formatearFecha(d);
}

interface Props {
  modelos: VersionModeloResponse[];
  loading: boolean;
  onVer: (m: VersionModeloResponse) => void;
}

export function ModelosTable({ modelos, loading, onVer }: Props) {
  const { t } = useT('prediction');
  if (loading) {
    return <div style={{ padding: 'var(--s7)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>{t('modelostable.cargando_versiones')}</div>;
  }
  if (modelos.length === 0) {
    return (
      <div style={{ padding: 'var(--s8) var(--s4)', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>{t('modelostable.no_hay_versiones_de_modelo_que_coincidan')}</div>
    );
  }

  return (
    <div style={TABLE_WRAP}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={THEAD_ROW}>
            <th style={TH}>{t('modelostable.version')}</th>
            <th style={TH}>{t('modelostable.tipo_de_modelo')}</th>
            <th style={TH}>{t('modelostable.estado')}</th>
            <th style={{ ...TH, textAlign: 'right' }}>{t('modelostable.f1_global')}</th>
            <th style={{ ...TH, textAlign: 'right' }}>{t('modelostable.sensib_riesgo')}</th>
            <th style={TH}>{t('modelostable.entrenado')}</th>
            <th style={{ ...TH, textAlign: 'right' }}>{t('modelostable.acciones')}</th>
          </tr>
        </thead>
        <tbody>
          {modelos.map((m) => (
            <tr key={m.id_version_modelo}>
              <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)' }}>
                  {m.nombre_version}
                  {m.esta_produccion && <BadgeCheck size={14} aria-label={t('modelostable.en_produccion')} style={{ color: 'var(--sem-success)' }} />}
                </span>
              </td>
              <td style={TD}>{TIPO_MODELO_LABEL[m.tipo_modelo] ?? m.tipo_modelo}</td>
              <td style={TD}><EstadoModeloPill estado={m.estado_version} /></td>
              <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmtPct(m.f1_score)}</td>
              <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmtPct(m.recall_clase_riesgo_alto)}</td>
              <td style={TD}>{fmtFecha(m.fecha_entrenamiento)}</td>
              <td style={{ ...TD, textAlign: 'right' }}>
                <Button variant="ghost" size="sm" onClick={() => onVer(m)} aria-label={`Ver ${m.nombre_version}`} title={t('modelostable.ver_detalle')}>
                  <Eye size={16} aria-hidden />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

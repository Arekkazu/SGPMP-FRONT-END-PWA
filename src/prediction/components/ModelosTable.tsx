// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-69: métricas según paradigma y quién registró la versión |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M4-09: tipo de modelo vacío se lee "Sin tipo" |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre |
import React from 'react';
import { formatearFecha } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { Eye, BadgeCheck } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { EstadoModeloPill } from './EstadoModeloPill';
import { etiquetaTipoModelo } from '../types';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import type { VersionModeloResponse } from '../types';

function fmtPct(v: number | null): string {
  return v == null ? '—' : `${(v * 100).toFixed(1)}%`;
}

/** POBLACIONAL se evalúa con métricas propias; INDIVIDUAL/META con F1 y sensibilidad de riesgo alto. */
function Metricas({ m }: { m: VersionModeloResponse }) {
  const { t } = useT('prediction');
  const pob = m.metricas_poblacionales;
  const filas: [string, string][] = pob
    ? [
      [t('modelostable.fp_rutina'), fmtPct(typeof pob.tasa_falsos_positivos_rutina === 'number' ? pob.tasa_falsos_positivos_rutina : null)],
      [t('modelostable.deteccion_clinica'), fmtPct(typeof pob.tasa_deteccion_eventos_clinicos === 'number' ? pob.tasa_deteccion_eventos_clinicos : null)],
    ]
    : [[t('modelostable.f1_global'), fmtPct(m.f1_score)], [t('modelostable.sensib_riesgo'), fmtPct(m.recall_clase_riesgo_alto)]];
  return (
    <span style={{ display: 'grid', gap: 2, fontSize: '12px' }}>
      {filas.map(([k, v]) => <span key={k}><span style={{ color: 'var(--text-muted)' }}>{k}</span> <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{v}</span></span>)}
    </span>
  );
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
    <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label="Tabla de versiones de modelos">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={THEAD_ROW}>
            <th style={TH}>{t('modelostable.version')}</th>
            <th style={TH}>{t('modelostable.tipo_componente')}</th>
            <th style={TH}>{t('modelostable.estado')}</th>
            <th style={TH}>{t('modelostable.metricas')}</th>
            <th style={TH}>{t('modelostable.registrado')}</th>
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
              <td style={TD}>{etiquetaTipoModelo(m.tipo_modelo)}{m.componente && ` · ${m.componente}`}</td>
              <td style={TD}><EstadoModeloPill estado={m.estado_version} /></td>
              <td style={TD}><Metricas m={m} /></td>
              <td style={TD}>
                {fmtFecha(m.fecha_registro ?? m.fecha_entrenamiento)}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {m.id_proceso_rf71 ? t('modelostable.por_rf71', { proceso: m.id_proceso_rf71.slice(0, 8) }) : '—'}
                </div>
              </td>
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

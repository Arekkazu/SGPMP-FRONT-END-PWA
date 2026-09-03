import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Eye } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { EstadoOtaPill } from './EstadoOtaPill';
import { TIPO_MODELO_LABEL } from '../types';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import type { DespliegueOtaResponse } from '../types';

function fmt(dt: string | null): string {
  if (!dt) return '—';
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : d.toLocaleString('es-CO');
}

interface Props {
  despliegues: DespliegueOtaResponse[];
  loading: boolean;
  onVer: (d: DespliegueOtaResponse) => void;
}

export function OtaTable({ despliegues, loading, onVer }: Props) {
  const { t } = useT('prediction');
  if (loading) return <div style={{ padding: 'var(--s7)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>{t('otatable.cargando_despliegues')}</div>;
  if (despliegues.length === 0) {
    return (
      <div style={{ padding: 'var(--s8) var(--s4)', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>{t('otatable.no_hay_despliegues_que_coincidan_con_los')}</div>
    );
  }

  return (
    <div style={TABLE_WRAP}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={THEAD_ROW}>
            <th style={TH}>ID</th>
            <th style={TH}>{t('otatable.tipo_de_modelo')}</th>
            <th style={TH}>{t('otatable.version')}</th>
            <th style={TH}>{t('otatable.dispositivo')}</th>
            <th style={TH}>{t('otatable.modo')}</th>
            <th style={TH}>{t('otatable.estado')}</th>
            <th style={TH}>{t('otatable.inicio')}</th>
            <th style={{ ...TH, textAlign: 'right' }}>{t('otatable.acciones')}</th>
          </tr>
        </thead>
        <tbody>
          {despliegues.map((d) => (
            <tr key={d.id_despliegue_ota}>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#{d.id_despliegue_ota}</td>
              <td style={TD}>{TIPO_MODELO_LABEL[d.tipo_modelo] ?? d.tipo_modelo}</td>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)' }}>v{d.id_version_modelo}</td>
              <td style={{ ...TD, fontFamily: 'var(--font-mono)' }}>#{d.id_dispositivo_iot}</td>
              <td style={TD}>{d.modo_distribucion || '—'}</td>
              <td style={TD}><EstadoOtaPill estado={d.estado_despliegue} /></td>
              <td style={{ ...TD, fontSize: '12px', whiteSpace: 'nowrap' }}>{fmt(d.fecha_inicio)}</td>
              <td style={{ ...TD, textAlign: 'right' }}>
                <Button variant="ghost" size="sm" onClick={() => onVer(d)} aria-label={t('otatable.ver_despliegue')} title={t('otatable.ver_detalle')}>
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

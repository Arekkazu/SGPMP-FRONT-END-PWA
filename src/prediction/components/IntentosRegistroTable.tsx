// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-69: intentos de registro de versiones no admitidos (E1b, E2a) |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18: nombre del usuario en vez de «Usuario 900» |
import React from 'react';
import { ShieldX } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { Alert } from '../../shared/design-system/Alert';
import { SeveridadAuditoriaPill } from './SeveridadAuditoriaPill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import type { EventoAuditoriaM04Response } from '../types';
import type { ApiError } from '../../shared/api/errors';

const FLUJO: Record<string, string> = { INTENTO_CARGA_MODELO_EXTERNO: 'E1b', HASH_INVALIDO_DETECTADO: 'E2a' };

export function IntentosRegistroTable({ intentos, error }: { intentos: EventoAuditoriaM04Response[]; error: ApiError | null }) {
  const { t } = useT('prediction');
  const cols = [t('intentos.col_fecha'), t('intentos.col_origen'), t('intentos.col_flujo'), t('intentos.col_respuesta'), t('intentos.col_detalle'), t('intentos.col_evento')];

  return (
    <section aria-labelledby="intentos-titulo" style={{ marginTop: 'var(--s7)' }}>
      <h2 id="intentos-titulo" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s2)' }}>
        <ShieldX size={18} aria-hidden />{t('intentos.titulo')}
      </h2>
      <p style={{ margin: '0 0 var(--s4)', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '75ch' }}>{t('intentos.ayuda')}</p>
      {error ? (
        <Alert variant={error.status === 403 ? 'warning' : 'error'} title={t('intentos.error')} description={error.message} />
      ) : intentos.length === 0 ? (
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{t('intentos.vacio')}</p>
      ) : (
        <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label="Tabla de intentos de registro">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={THEAD_ROW}>{cols.map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
            <tbody>
              {intentos.map((e) => (
                <tr key={e.id_evento}>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'nowrap' }}>{formatearFechaHora(e.fecha_evento)}</td>
                  <td style={{ ...TD, fontSize: '12px' }}>{e.id_sistema ?? e.nombre_usuario ?? (e.id_usuario != null ? t('intentos.usuario', { id: e.id_usuario }) : '—')}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)' }}>{FLUJO[e.tipo_evento] ?? '—'}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{e.codigo_error ?? e.resultado_operacion ?? '—'}</td>
                  <td style={{ ...TD, fontSize: '12px', color: 'var(--text-secondary)' }}>{e.descripcion_error ?? '—'}</td>
                  <td style={TD}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', marginBottom: 2 }}>{e.tipo_evento}</div>
                    <SeveridadAuditoriaPill severidad={e.severidad_evento} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

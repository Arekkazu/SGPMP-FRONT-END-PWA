import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { Alert } from '../../shared/design-system/Alert';
import type { ApiError } from '../../shared/api/errors';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { Pill, type Tono } from './Pill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import type { EstadoSincronizacionNodo, ResultadoGuardarMotor, SincronizacionMotor } from '../types';

const ESTADO: Record<EstadoSincronizacionNodo, { tono: Tono; icono: React.ReactNode; clave: string }> = {
  APLICADA: { tono: 'success', icono: <CheckCircle2 size={12} aria-hidden />, clave: 'estado_aplicada' },
  PENDIENTE: { tono: 'warning', icono: <Clock size={12} aria-hidden />, clave: 'estado_pendiente' },
  FALLIDA: { tono: 'error', icono: <XCircle size={12} aria-hidden />, clave: 'estado_fallida' },
  DESINCRONIZADO: { tono: 'error', icono: <AlertTriangle size={12} aria-hidden />, clave: 'estado_desincronizado' },
};

interface Props {
  sincronizacion: SincronizacionMotor | null;
  error: ApiError | null;
}

/**
 * Aviso del último guardado según el código de `POST /prediccion/motor-ia` (DEV-09):
 * 202 PENDIENTE (nodo desconectado, E7) · 202 FALLIDA (sin ACK, E8) · 409 DESINCRONIZADO (E10).
 * La configuración quedó guardada en los cuatro casos; el aviso dice si llegó a los nodos.
 * Antes, un 202 se mostraba igual que un guardado exitoso.
 */
export function AvisoSincronizacionGuardado({ resultado }: { resultado: ResultadoGuardarMotor }) {
  const { t } = useT('prediction');
  const { status, sincronizacion, config } = resultado;
  if (status === 409) {
    return <Alert variant="error" title={t('motorview.aviso_desincronizado_titulo')} description={t('motorview.aviso_desincronizado_desc')} style={{ marginBottom: 'var(--s4)' }} />;
  }
  if (status === 202) {
    const sinAck = sincronizacion.estado === 'FALLIDA';
    return (
      <Alert
        variant="warning"
        title={t(sinAck ? 'motorview.aviso_fallida_titulo' : 'motorview.aviso_pendiente_titulo')}
        description={t(sinAck ? 'motorview.aviso_fallida_desc' : 'motorview.aviso_pendiente_desc')}
        style={{ marginBottom: 'var(--s4)' }}
      />
    );
  }
  if (sincronizacion.nodos.length === 0) return null;
  return (
    <Alert
      variant="success"
      title={t('motorview.aviso_aplicada_titulo')}
      description={t('motorview.aviso_aplicada_desc', { version: config.config_version })}
      style={{ marginBottom: 'var(--s4)' }}
    />
  );
}

/** RF-65 (DEV-09, FE-02): estado de la configuración del motor en cada nodo Edge. */
export function SincronizacionNodosPanel({ sincronizacion, error }: Props) {
  const { t } = useT('prediction');
  const nodos = sincronizacion?.nodos ?? [];

  return (
    <>
      {error && <Alert variant="error" title={t('motorview.error_sincronizacion')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}
      {!error && nodos.length === 0 && (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{t('motorview.sin_nodos')}</p>
      )}
      {nodos.length > 0 && (
        <div style={TABLE_WRAP}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={THEAD_ROW}>
                <th style={TH}>{t('motorview.dispositivo')}</th>
                <th style={TH}>{t('motorview.estado')}</th>
                <th style={TH}>{t('motorview.version_servidor')}</th>
                <th style={TH}>{t('motorview.version_nodo')}</th>
                <th style={TH}>{t('motorview.intentos')}</th>
                <th style={TH}>{t('motorview.ultima_sincronizacion')}</th>
                <th style={TH}>{t('motorview.motivo')}</th>
              </tr>
            </thead>
            <tbody>
              {nodos.map((n) => {
                const estado = ESTADO[n.estado_sincronizacion];
                return (
                  <tr key={n.id_dispositivo_iot}>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{n.serial}</td>
                    <td style={TD}>
                      <Pill tono={estado.tono} icon={estado.icono}>{t(`motorview.${estado.clave}`)}</Pill>
                    </td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)' }}>{n.config_version_servidor}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)' }}>{n.config_version_nodo ?? '—'}</td>
                    <td style={TD}>{n.intentos_sincronizacion}</td>
                    <td style={TD}>{n.fecha_ultimo_intento ? formatearFechaHora(n.fecha_ultimo_intento) : '—'}</td>
                    <td style={{ ...TD, color: 'var(--text-secondary)' }}>{n.motivo_fallo ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

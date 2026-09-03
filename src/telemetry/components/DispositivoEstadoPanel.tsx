import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Cpu, History } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { EstadoDispositivoPill } from './EstadoDispositivoPill';
import { horaCaptura } from '../lib/sensorEscala';
import type { EstadoDispositivoIoTSchema, HistoricoTransicionSchema } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface Props {
  idConsultado: number | null;
  estado: EstadoDispositivoIoTSchema | null;
  historial: HistoricoTransicionSchema[];
  loading: boolean;
  error: ApiError | null;
}

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s4)', padding: 'var(--s2) 0', borderBottom: '1px solid var(--surface-border)' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '13px', color: 'var(--text-primary)', textAlign: 'right', fontWeight: 500 }}>{children}</span>
    </div>
  );
}

function fechaHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  return `${iso.slice(0, 10)} ${horaCaptura(iso)}`;
}

export function DispositivoEstadoPanel({ idConsultado, estado, historial, loading, error }: Props) {
  const { t } = useT('telemetry');
  if (idConsultado == null) {
    return (
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{t('dispositivoestadopanel.ingresa_el_id_de_un_dispositivo_para')}</p>
    );
  }

  if (loading) {
    return (
      <div style={{ height: 180, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }}>
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        variant={error.status === 403 ? 'warning' : error.status === 404 ? 'info' : 'error'}
        title={error.status === 404 ? 'Dispositivo no encontrado' : error.status === 403 ? 'Sin acceso al estado del dispositivo' : 'Error al consultar el dispositivo'}
        description={error.message}
      />
    );
  }

  if (!estado) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--s6)' }}>
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s3)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <Cpu size={16} aria-hidden /> Dispositivo #{estado.id_dispositivo_iot}
          </h3>
          <EstadoDispositivoPill estado={estado.estado_actual} />
        </div>
        <Fila label={t('dispositivoestadopanel.ultimo_contacto')}>{fechaHora(estado.fecha_ultimo_contacto)}</Fila>
        <Fila label={t('dispositivoestadopanel.tiempo_sin_contacto')}>{estado.tiempo_sin_contacto ?? '—'}</Fila>
        <Fila label={t('dispositivoestadopanel.causa_primaria')}>{estado.causa_primaria ?? '—'}</Fila>
        <Fila label={t('dispositivoestadopanel.ultimo_heartbeat')}>{estado.id_ultimo_heartbeat != null ? `#${estado.id_ultimo_heartbeat}` : '—'}</Fila>
        <Fila label={t('dispositivoestadopanel.actualizado')}>{fechaHora(estado.fecha_ultima_actualizacion)}</Fila>
      </div>

      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s5)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' }}>
          <History size={16} aria-hidden />{t('dispositivoestadopanel.transiciones_de_estado')}</h3>
        {historial.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{t('dispositivoestadopanel.sin_transiciones_registradas')}</p>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            {historial.map((t, i) => (
              <li key={t.id_transaccion ?? i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{fechaHora(t.fecha_transicion)}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <strong>{t.estado_anterior}</strong> → <strong style={{ color: 'var(--text-primary)' }}>{t.estado_nuevo}</strong>
                  {t.causa_primaria ? ` · ${t.causa_primaria}` : ''}
                </span>
                {t.notas && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.notas}</span>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

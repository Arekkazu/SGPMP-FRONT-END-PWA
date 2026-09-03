import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Button } from '../../shared/design-system/Button';
import { ModalShell } from './ModalShell';
import { SeveridadAuditoriaPill } from './SeveridadAuditoriaPill';
import { Pill } from './Pill';
import type { EventoAuditoriaM04Response } from '../types';

interface Props {
  evento: EventoAuditoriaM04Response | null;
  loading: boolean;
  correlacionados: EventoAuditoriaM04Response[];
  onClose: () => void;
}

function fmt(dt: string | null): string {
  if (!dt) return '—';
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : d.toLocaleString('es-CO');
}

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <div style={{ fontSize: '13px', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{children}</div>
    </div>
  );
}

export function EventoAuditoriaModal({ evento, loading, correlacionados, onClose }: Props) {
  const { t } = useT('prediction');
  return (
    <ModalShell
      title={evento ? evento.tipo_evento : 'Evento de auditoría'}
      onClose={onClose}
      maxWidth={720}
      footer={<Button variant="secondary" onClick={onClose}>{t('eventoauditoriamodal.cerrar')}</Button>}
    >
      {loading || !evento ? (
        <div style={{ padding: 'var(--s6)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>{t('eventoauditoriamodal.cargando')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
          <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
            <SeveridadAuditoriaPill severidad={evento.severidad_evento} />
            <Pill tono="neutral">{evento.tipo_actor}</Pill>
            {evento.resultado_operacion && <Pill tono="info">{evento.resultado_operacion}</Pill>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--s4)' }}>
            <Fila label={t('eventoauditoriamodal.fecha')}>{fmt(evento.fecha_evento)}</Fila>
            <Fila label={t('eventoauditoriamodal.modulo')}>{evento.modulo}</Fila>
            <Fila label={t('eventoauditoriamodal.correlacion')}>{evento.correlacion_id ?? '—'}</Fila>
            <Fila label={t('eventoauditoriamodal.referencia')}>{evento.entidad_referencia ?? '—'}{evento.id_referencia ? ` · ${evento.id_referencia}` : ''}</Fila>
            <Fila label={t('eventoauditoriamodal.version_modelo')}>{evento.version_modelo ?? '—'}</Fila>
            <Fila label={t('eventoauditoriamodal.latencia')}>{evento.latencia_ms != null ? `${evento.latencia_ms} ms` : '—'}</Fila>
            <Fila label={t('eventoauditoriamodal.origen_dato')}>{evento.origen_dato ?? '—'}</Fila>
            <Fila label={t('eventoauditoriamodal.origen_registro')}>{evento.origen_registro ?? '—'}</Fila>
          </div>

          {(evento.codigo_error || evento.descripcion_error) && (
            <div style={{ background: 'var(--sem-error-bg)', border: '1px solid var(--sem-error-border)', borderRadius: 'var(--r-md)', padding: 'var(--s3)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sem-error)' }}>{evento.codigo_error ?? 'Error'}</div>
              {evento.descripcion_error && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{evento.descripcion_error}</div>}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s2)' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{t('eventoauditoriamodal.payload_del_evento')}</span>
              {evento.es_payload_truncado && <Pill tono="warning">{t('eventoauditoriamodal.truncado')}</Pill>}
            </div>
            <pre style={{ margin: 0, padding: 'var(--s3)', background: 'var(--surface-bg)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', overflowX: 'auto', maxHeight: 240 }}>
              {evento.payload_evento ? JSON.stringify(evento.payload_evento, null, 2) : '—'}
            </pre>
          </div>

          {evento.hash_evento && (
            <Fila label="Hash del evento (inmutable)">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', wordBreak: 'break-all' }}>{evento.hash_evento}</span>
            </Fila>
          )}

          {evento.correlacion_id && correlacionados.length > 1 && (
            <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s4)' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{t('eventoauditoriamodal.traza_de_correlacion')}</span>
              <div style={{ marginTop: 'var(--s3)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                {correlacionados.map((c) => (
                  <div key={c.id_evento} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', fontSize: '12px', color: c.id_evento === evento.id_evento ? 'var(--brand-600)' : 'var(--text-secondary)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.id_evento === evento.id_evento ? 'var(--brand-500)' : 'var(--surface-border)', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{fmt(c.fecha_evento)}</span>
                    <span style={{ fontWeight: 600 }}>{c.tipo_evento}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
}

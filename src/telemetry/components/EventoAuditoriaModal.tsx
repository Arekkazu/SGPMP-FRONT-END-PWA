// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | PR-667: fechas en el día y la hora local del usuario, no en UTC |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: plurales y separador de miles en contadores + T-19 códigos legibles |
import React from 'react';
import { formatearNumero } from '../../shared/i18n/formato';
import { useT, useNombreModulo } from '../../shared/i18n/useT';
import { Fingerprint } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { SeveridadLogPill } from './SeveridadLogPill';
import { Pill } from './Pill';
import { fechaHoraCaptura } from '../lib/sensorEscala';
import type { EventoAuditoriaIotSchema } from '../types';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s4)', padding: 'var(--s2) 0', borderBottom: '1px solid var(--surface-border)' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '13px', color: 'var(--text-primary)', textAlign: 'right', fontWeight: 500, wordBreak: 'break-word' }}>{children}</span>
    </div>
  );
}

export function EventoAuditoriaModal({ evento, onClose }: { evento: EventoAuditoriaIotSchema; onClose: () => void }) {
  const { t } = useT('telemetry');
  const nombreModulo = useNombreModulo();
  const detalle = evento.accion_detallada ? JSON.stringify(evento.accion_detallada, null, 2) : null;
  return (
    <ModalShell title={`Evento de auditoría · ${etiquetaCodigo(evento.tipo_evento)}`} onClose={onClose} maxWidth={600}>
      <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center', marginBottom: 'var(--s4)', flexWrap: 'wrap' }}>
        <SeveridadLogPill severidad={evento.severidad_log} />
        <Pill tono={evento.clasificacion_registro?.toUpperCase().includes('NIC') ? 'info' : 'neutral'}>
          {evento.clasificacion_registro} · {t('conteo.anios', { count: evento.retencion_aplicable, n: formatearNumero(evento.retencion_aplicable) })}
        </Pill>
        {evento.registro_incompleto && <Pill tono="warning">{t('eventoauditoriamodal.registro_incompleto')}</Pill>}
      </div>

      <Fila label={t('eventoauditoriamodal.modulo')}>{nombreModulo(evento.modulo)}</Fila>
      <Fila label={t('eventoauditoriamodal.resultado')}>{evento.resultado}</Fila>
      <Fila label={t('eventoauditoriamodal.fecha_hora')}>{fechaHoraCaptura(evento.fecha_hora)}</Fila>
      <Fila label={t('eventoauditoriamodal.usuario')}>{evento.nombre_usuario ?? (evento.id_usuario != null ? `#${evento.id_usuario}` : '—')}</Fila>
      {evento.descripcion && <Fila label={t('eventoauditoriamodal.descripcion')}>{evento.descripcion}</Fila>}
      {(evento.entidad_afectada_tipo || evento.entidad_afectada_id) && (
        <Fila label={t('eventoauditoriamodal.entidad_afectada')}>{evento.entidad_afectada_tipo ?? ''} {evento.entidad_afectada_id ? `#${evento.entidad_afectada_id}` : ''}</Fila>
      )}
      {evento.direccion_ip && <Fila label={t('eventoauditoriamodal.direccion_ip')}>{evento.direccion_ip}</Fila>}
      {evento.id_sesion && <Fila label={t('eventoauditoriamodal.sesion')}>{evento.id_sesion.slice(0, 8)}…</Fila>}

      <div style={{ marginTop: 'var(--s5)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s2)' }}>
          <Fingerprint size={16} aria-hidden /> Cadena de integridad (SHA-256)
        </h3>
        <code style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--surface-hover)', padding: 'var(--s3)', borderRadius: 'var(--r-md)', wordBreak: 'break-all' }}>
          {evento.hash_integridad || '—'}
        </code>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>
          id: {evento.id_evento}
        </div>
      </div>

      {detalle && (
        <div style={{ marginTop: 'var(--s4)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 'var(--s1)' }}>{t('eventoauditoriamodal.accion_detallada')}</div>
          <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--surface-hover)', padding: 'var(--s3)', borderRadius: 'var(--r-md)', overflowX: 'auto', maxHeight: 200 }}>
            {detalle}
          </pre>
        </div>
      )}
    </ModalShell>
  );
}

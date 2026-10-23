// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-80: detalle de un evento de auditoría con su estado anterior y nuevo |
import React from 'react';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { Alert } from '../../shared/design-system/Alert';
import { useT } from '../../shared/i18n/useT';
import type { ApiError } from '../../shared/api/errors';
import { formatoFecha, formatoMoneda } from '../lib/formato';
import type { EventoAuditoriaSuministro } from '../types';
import { EstadoRegistroBadge } from './EstadoRegistroBadge';
import { SECUNDARIO } from './estilos';

interface Props { evento: EventoAuditoriaSuministro | null; cargando: boolean; error: ApiError | null; onCerrar: () => void }

function Json({ titulo, datos }: { titulo: string; datos: Record<string, unknown> | null | undefined }) {
  return (
    <div style={{ minWidth: 0 }}>
      <h3 style={{ margin: '0 0 var(--s2)', fontSize: 'var(--fs-label-md)', fontWeight: 600, color: 'var(--text-muted)' }}>{titulo}</h3>
      <pre style={{ margin: 0, padding: 'var(--s3)', background: 'var(--surface-hover)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-mono-md)', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 280, overflow: 'auto' }}>
        {datos ? JSON.stringify(datos, null, 2) : '—'}
      </pre>
    </div>
  );
}

export function EventoAuditoriaModal({ evento: e, cargando, error, onCerrar }: Props) {
  const { t } = useT('supplies');
  return (
    <ModalShell title={e ? t('auditoria.detalle_titulo', { id: e.id_auditoria_suministro }) : t('auditoria.detalle')} onClose={onCerrar} maxWidth={720}>
      {error && <Alert variant="error" title={error.message} />}
      {!e ? <p style={SECUNDARIO}>{cargando ? t('comun.cargando') : ''}</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
          {e.registro_incompleto && <Alert variant="warning" title={t('auditoria.incompleto')} description={e.detalle_causa ?? undefined} />}
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--s4)', margin: 0 }}>
            {([
              [t('auditoria.operacion'), t(`evento.${e.tipo_operacion}`, { defaultValue: e.tipo_operacion })],
              [t('auditoria.entidad'), e.entidad_afectada],
              [t('comun.fecha'), formatoFecha(e.fecha_evento, true)],
              [t('auditoria.usuario'), `#${e.id_usuario}`],
              [t('comun.activo'), e.id_activo_biologico ? `#${e.id_activo_biologico}` : '—'],
              [t('auditoria.costo'), e.costo_afectado ? formatoMoneda(e.costo_afectado) : '—'],
              [t('auditoria.clasificacion'), e.clasificacion_registro ? `${e.clasificacion_registro} · ${e.retencion_aplicable ?? ''}` : '—'],
              [t('auditoria.ip'), e.ip_origen ?? '—'],
            ] as [string, React.ReactNode][]).map(([k, v]) => (
              <div key={k}>
                <dt style={{ fontSize: 'var(--fs-label-md)', fontWeight: 600, color: 'var(--text-muted)' }}>{k}</dt>
                <dd style={{ margin: 'var(--s1) 0 0', color: 'var(--text-primary)', fontWeight: 500, wordBreak: 'break-word' }}>{v}</dd>
              </div>
            ))}
            <div>
              <dt style={{ fontSize: 'var(--fs-label-md)', fontWeight: 600, color: 'var(--text-muted)' }}>{t('auditoria.resultado')}</dt>
              <dd style={{ margin: 'var(--s1) 0 0' }}><EstadoRegistroBadge estado={e.resultado} /></dd>
            </div>
          </dl>
          <div className="ds-fg2" style={{ display: 'grid', gap: 'var(--s4)' }}>
            <Json titulo={t('auditoria.antes')} datos={e.datos_anteriores} />
            <Json titulo={t('auditoria.despues')} datos={e.datos_nuevos} />
          </div>
          {e.hash_integridad && <p style={{ ...SECUNDARIO, margin: 0, wordBreak: 'break-all' }}>{t('nic41.hash')}: <code style={{ fontFamily: 'var(--font-mono)' }}>{e.hash_integridad}</code></p>}
        </div>
      )}
    </ModalShell>
  );
}

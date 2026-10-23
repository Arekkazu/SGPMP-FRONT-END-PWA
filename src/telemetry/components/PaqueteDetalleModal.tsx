// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-56: detalle del paquete con payload ramificado y motivo de fallo |
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { ModalShell } from './ModalShell';
import { Pill } from './Pill';
import { TipoDatoPill } from './TipoDatoPill';
import { OrigenDatoPill } from './OrigenDatoPill';
import { VectorComportamientoPanel } from './VectorComportamientoPanel';
import { FALLOS_NO_REINTENTABLES, MAX_REINTENTOS, payloadPaquete, type PaqueteMock } from '../mocks/pipelineMock';

const H3: React.CSSProperties = { fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' };
const ROTULO: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 };
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)', wordBreak: 'break-all' };

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return <div><div style={ROTULO}>{rotulo}</div><div>{children}</div></div>;
}

export function PaqueteDetalleModal({ paquete: p, onClose }: { paquete: PaqueteMock; onClose: () => void }) {
  const { t } = useT('telemetry');
  const reintentable = p.tipoFallo != null && !FALLOS_NO_REINTENTABLES.includes(p.tipoFallo);

  return (
    <ModalShell title={`${t('pipeline.detalle_titulo')} ${p.id}`} onClose={onClose} maxWidth={640}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
        {p.tipoFallo && (
          <div role="alert" style={{ display: 'flex', gap: 'var(--s2)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-md)', border: '1px solid var(--sem-error-border)', background: 'var(--sem-error-bg)', color: 'var(--text-primary)', fontSize: '13px' }}>
            <AlertTriangle size={16} aria-hidden style={{ color: 'var(--sem-error)', flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong>{t(`pipeline.fallo_${p.tipoFallo}`)}.</strong> {t(`pipeline.fallo_${p.tipoFallo}_desc`, { horas: p.desfaseH })}{' '}
              {reintentable ? t('pipeline.reintentable', { n: p.reintentos, max: MAX_REINTENTOS }) : t('pipeline.no_reintentable')}
            </span>
          </div>
        )}

        <section>
          <h3 style={H3}>{t('pipeline.trazabilidad')}</h3>
          <div className="ds-fg2" style={{ gap: 'var(--s4)' }}>
            <Campo rotulo="id_paquete"><span style={MONO}>{p.uuid}</span></Campo>
            <Campo rotulo={t('pipeline.col_dispositivo')}><span style={MONO}>{p.dispositivo}</span></Campo>
            <Campo rotulo={t('pipeline.col_tipo')}><TipoDatoPill tipo={p.tipoDato} /></Campo>
            <Campo rotulo="estado_calidad (RF-53)"><Pill tono={p.estadoCalidad === 'LECTURA_VALIDA' ? 'success' : 'warning'}>{p.estadoCalidad}</Pill></Campo>
            <Campo rotulo={t('pipeline.col_origen')}><OrigenDatoPill origen={p.origen} /></Campo>
            <Campo rotulo={t('pipeline.desfase')}><span style={MONO}>{p.desfaseH} h / 72 h</span></Campo>
            <Campo rotulo={t('pipeline.capturado')}><span style={MONO}>{p.capturado}</span></Campo>
            <Campo rotulo={t('pipeline.procesado_edge')}><span style={MONO}>{p.procesadoEdge}</span></Campo>
            <Campo rotulo={t('pipeline.col_enviado')}><span style={MONO}>{p.enviado ?? '—'}</span></Campo>
            <Campo rotulo={t('pipeline.version_objetivo')}><span style={MONO}>{p.version}</span></Campo>
          </div>
        </section>

        {p.vision && <VectorComportamientoPanel vector={p.vision} />}

        <section>
          <h3 style={H3}>{t('pipeline.payload')}</h3>
          <p style={{ margin: '0 0 var(--s2)', fontSize: '12px', color: 'var(--text-muted)' }}>{t(p.tipoDato === 'VECTOR_COMPORTAMIENTO' ? 'pipeline.payload_vision' : 'pipeline.payload_escalar')}</p>
          <pre tabIndex={0} aria-label={t('pipeline.payload')} style={{ margin: 0, maxHeight: 280, overflow: 'auto', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.5, color: 'var(--text-primary)', background: 'var(--surface-hover)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', padding: 'var(--s3)' }}>
            {JSON.stringify(payloadPaquete(p), null, 2)}
          </pre>
        </section>
      </div>
    </ModalShell>
  );
}

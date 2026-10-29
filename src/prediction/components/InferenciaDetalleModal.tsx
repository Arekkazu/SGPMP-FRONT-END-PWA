// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-66: detalle de inferencia por área o por activo con trazabilidad |
// | 2026-10-29 | Arekkazu | PEND-456 RF-66: tipos desde lib/inferencias (datos reales); paquete opcional |
import React from 'react';
import { Info } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { ModalShell } from './ModalShell';
import { Pill, type Tono } from './Pill';
import { ProbBar } from './ProbBar';
import { nivelRiesgoTono } from '../lib/riesgo';
import { PARADIGMA_POR_TIPO, TIPO_MODELO_LABEL } from '../types';
import type { EstadoInferencia, Inferencia } from '../lib/inferencias';

export const ESTADO_INFERENCIA_TONO: Record<EstadoInferencia, Tono> = {
  EMITIDO: 'success', RECHAZADO: 'neutral', DESCARTADO: 'neutral', FALLIDO: 'error', NO_DISPONIBLE: 'error',
};

const H3: React.CSSProperties = { fontSize: '13px', fontWeight: 700, margin: '0 0 var(--s3)', color: 'var(--text-primary)' };
const ROTULO: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 };
const NIVEL_COLOR = ['var(--text-muted)', 'var(--sem-info)', 'var(--sem-warning)', 'var(--sem-error)'];

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return <div><div style={ROTULO}>{rotulo}</div><div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{children}</div></div>;
}

export function InferenciaDetalleModal({ inf, onClose }: { inf: Inferencia; onClose: () => void }) {
  const { t } = useT('prediction');
  const poblacional = PARADIGMA_POR_TIPO[inf.tipoModelo] === 'POBLACIONAL';
  const na = <span style={{ color: 'var(--text-muted)' }}>{t('monitor.no_aplica')}</span>;
  const cadena = [t('monitor.traza_sensor'), 'RF-53', inf.eventoEdge ? `RF-55 · ${inf.eventoEdge}` : 'RF-55', inf.paquete ? `RF-56 · ${inf.paquete}` : 'RF-56', `RF-66 · ${inf.id}`, inf.alerta ? `RF-57 · ${inf.alerta}` : null].filter(Boolean) as string[];

  return (
    <ModalShell title={`${t('monitor.detalle_titulo')} · ${inf.unidad}`} onClose={onClose} maxWidth={640}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        <div className="ds-fg3" style={{ gap: 'var(--s4)' }}>
          <Campo rotulo={t('monitor.identificador')}><span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{inf.id}</span></Campo>
          <Campo rotulo={t('monitor.activo_area')}>{inf.unidad}<div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{inf.area} · {inf.especie}</div></Campo>
          <Campo rotulo={t('monitor.tipo_modelo')}>{TIPO_MODELO_LABEL[inf.tipoModelo]}<div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t(`contrato.paradigma_${PARADIGMA_POR_TIPO[inf.tipoModelo]}`)}</div></Campo>
          <Campo rotulo={t('monitor.estado_resultado')}><Pill tono={ESTADO_INFERENCIA_TONO[inf.estado]}>{t(`monitor.estado_${inf.estado}`)}</Pill></Campo>
          <Campo rotulo={t('monitor.nivel')}>{inf.nivel != null ? <Pill tono={nivelRiesgoTono(inf.nivel)}>{t(`monitor.nivel_${inf.nivel}`)}</Pill> : '—'}</Campo>
          <Campo rotulo={t('monitor.enfermedad')}>{poblacional ? na : inf.enfermedad ?? '—'}</Campo>
          <Campo rotulo={poblacional ? t('monitor.score_anomalia') : t('monitor.confianza')}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              {poblacional ? (inf.score != null ? `${inf.score.toFixed(2)} / ${inf.umbralScore?.toFixed(2)}` : '—') : inf.confianza != null ? `${Math.round(inf.confianza * 100)}%` : '—'}
            </span>
          </Campo>
          <Campo rotulo={t('monitor.latencia')}><span style={{ fontFamily: 'var(--font-mono)', color: (inf.latenciaMs ?? 0) > 2000 ? 'var(--sem-warning)' : undefined }}>{inf.latenciaMs != null ? `${inf.latenciaMs} ms` : '—'}</span></Campo>
          <Campo rotulo={t('monitor.modo')}>{t(`motorconfigform.modo_${inf.modo}`)}{inf.fallback && <div style={{ fontSize: '12px', color: 'var(--sem-warning)' }}>{t(`monitor.fallback_${inf.fallback}`)}</div>}</Campo>
          <Campo rotulo={t('monitor.version')}><span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{inf.version}</span></Campo>
          <Campo rotulo={t('monitor.ventana')}><span style={{ fontFamily: 'var(--font-mono)' }}>{inf.ventana}</span></Campo>
          <Campo rotulo={t('monitor.alerta')}>{inf.alerta ? <Pill tono="error">{inf.alerta}</Pill> : t('monitor.sin_alerta')}</Campo>
        </div>

        {inf.nota && (
          <div role="note" style={{ display: 'flex', gap: 'var(--s2)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-md)', border: '1px solid var(--sem-info-border)', background: 'var(--sem-info-bg)', fontSize: '13px', color: 'var(--text-primary)' }}>
            <Info size={16} aria-hidden style={{ color: 'var(--sem-info)', flexShrink: 0, marginTop: 1 }} /><span>{inf.nota}</span>
          </div>
        )}

        {inf.distRiesgo && (
          <section>
            <h3 style={H3}>{t('monitor.dist_niveles')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
              {inf.distRiesgo.map((p, n) => <ProbBar key={n} label={t(`monitor.nivel_${n}`)} valor={p} color={NIVEL_COLOR[n]} />)}
            </div>
          </section>
        )}

        {inf.distPatologias && (
          <section>
            <h3 style={H3}>{t('monitor.dist_patologias')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
              {inf.distPatologias.map((d) => <ProbBar key={d.nombre} label={d.nombre} valor={d.prob} />)}
            </div>
          </section>
        )}

        {inf.vector && (
          <section>
            <h3 style={H3}>{t('monitor.vector_titulo')}</h3>
            <div className="ds-fg3" style={{ gap: 'var(--s3)' }}>
              <Campo rotulo="densidad_actividad"><span style={{ fontFamily: 'var(--font-mono)' }}>{inf.vector.densidad.toFixed(4)}</span></Campo>
              <Campo rotulo="dispersion_espacial"><span style={{ fontFamily: 'var(--font-mono)' }}>{inf.vector.dispersion.toFixed(4)}</span></Campo>
              <Campo rotulo="tasa_movimiento"><span style={{ fontFamily: 'var(--font-mono)' }}>{inf.vector.tasa.toFixed(4)}</span></Campo>
              <Campo rotulo="n_individuos_observados"><span style={{ fontFamily: 'var(--font-mono)' }}>{inf.vector.individuos}</span></Campo>
              <Campo rotulo="cobertura_ventana"><span style={{ fontFamily: 'var(--font-mono)' }}>{inf.vector.cobertura.toFixed(2)}</span></Campo>
            </div>
          </section>
        )}

        {inf.variables && (
          <section>
            <h3 style={H3}>{t('monitor.variables_recibidas')}</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)' }}>
              {inf.variables.map((v) => <li key={v.nombre}><Pill tono="neutral">{v.nombre}: {v.valor}</Pill></li>)}
            </ul>
            {!!inf.faltantes?.length && (
              <p style={{ margin: 'var(--s3) 0 0', fontSize: '13px', color: 'var(--sem-warning)' }}>
                {t('monitor.variables_faltantes')}: {inf.faltantes.join(', ')}{inf.contextoIncompleto && ` · ${t('monitor.contexto_incompleto')}`}
              </p>
            )}
          </section>
        )}

        {inf.hibrido && (
          <section>
            <h3 style={H3}>{t('monitor.hibrido_titulo')}</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              {t('monitor.hibrido_texto', { ms: inf.hibrido.syncMs, nivel: t(`monitor.nivel_${inf.hibrido.nivelServidor}`) })}{' '}
              {t(inf.hibrido.discrepancia ? 'monitor.hibrido_discrepa' : 'monitor.hibrido_coincide')}
            </p>
          </section>
        )}

        <section>
          <h3 style={H3}>{t('monitor.trazabilidad')}</h3>
          <ol aria-label={t('monitor.trazabilidad')} style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--s2)' }}>
            {cadena.map((paso, i) => (
              <li key={paso} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {i > 0 && <span aria-hidden style={{ color: 'var(--text-muted)' }}>›</span>}
                <span style={{ padding: '2px var(--s2)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-sm)', background: 'var(--surface-hover)' }}>{paso}</span>
              </li>
            ))}
          </ol>
          <p style={{ margin: 'var(--s2) 0 0', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{inf.uuid}</p>
        </section>
      </div>
    </ModalShell>
  );
}

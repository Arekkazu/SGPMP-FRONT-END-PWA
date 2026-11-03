// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-07 RF-53: detalle con lo que devuelve la bitácora de ingesta; sin fases, prioridad ni batería inventadas |
import React from 'react';
import { CheckCircle2, Circle, Info } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { formatearFechaHora, formatearNumero } from '../../shared/i18n/formato';
import { ModalShell } from './ModalShell';
import { Pill, type Tono } from './Pill';
import { OrigenDatoPill } from './OrigenDatoPill';
import { valorConUnidad } from '../lib/sensorEscala';
import { ESTADOS_PERSISTIDOS, type EstadoIngesta, type LecturaIngesta } from '../types';

export const ESTADO_INGESTA_TONO: Record<EstadoIngesta, Tono> = {
  LECTURA_VALIDA: 'success', FUERA_DE_RANGO: 'warning', ERROR_CALIBRACION: 'warning', ERROR_DUPLICADO: 'neutral',
  ERROR_AUTENTICACION: 'error', ERROR_ESTRUCTURA: 'error', ERROR_TIEMPO: 'error', ERROR_UNIDAD: 'error', ERROR_SENSOR: 'error',
};

export function latenciaTexto(ms: number | null): string {
  if (ms == null) return '—';
  return ms < 1000 ? `${formatearNumero(ms)} ms` : `${formatearNumero(ms / 1000, { maximumFractionDigits: 1 })} s`;
}

const H3: React.CSSProperties = { fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' };
const ROTULO: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 };
const VALOR: React.CSSProperties = { fontSize: '14px', color: 'var(--text-primary)' };

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return <div><div style={ROTULO}>{rotulo}</div><div style={VALOR}>{children}</div></div>;
}

interface Props {
  lectura: LecturaIngesta;
  onClose: () => void;
}

export function IngestaDetalleModal({ lectura: l, onClose }: Props) {
  const { t } = useT('telemetry');
  const estado = l.estado_calidad;
  const persistido = l.id_telemetria != null || (estado != null && ESTADOS_PERSISTIDOS.includes(estado));
  const unidad = l.unidad_medida ?? '';
  const indicadores: [string, boolean | null][] = [
    [t('ingesta.ind_calibrado'), l.calibrado],
    [t('ingesta.ind_agregado'), l.valor_agregado],
    [t('ingesta.ind_bufferizado'), l.origen == null ? null : l.origen === 'BUFFER_LOCAL'],
    [t('ingesta.ind_latencia_alta'), l.latencia_alta],
    [t('ingesta.ind_frecuencia_anomala'), l.frecuencia_anomala],
    [t('ingesta.ind_drift'), l.posible_drift],
  ];
  const conIndicadores = indicadores.filter(([, v]) => v != null);
  const nota = estado && estado !== 'LECTURA_VALIDA'
    ? t(`ingesta.nota_${estado}`, { unidad, capturado: formatearFechaHora(l.fecha_captura_dato), procesado: formatearFechaHora(l.fecha_evento), defaultValue: '' })
    : '';

  return (
    <ModalShell title={`${l.nombre_variable ?? t('ingesta.evento')} — ${l.nombre_sensor ?? l.serial_dispositivo ?? '—'}`} onClose={onClose} maxWidth={640}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap', marginBottom: 'var(--s5)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
          {t('ingesta.evento_num', { id: l.id_bitacora_ingest })}{l.serial_dispositivo && ` · ${l.serial_dispositivo}`}
        </span>
        {estado && <Pill tono={ESTADO_INGESTA_TONO[estado] ?? 'neutral'}>{t(`ingesta.estado_${estado}`, { defaultValue: estado })}</Pill>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
        <section>
          <h3 style={H3}>{t('ingesta.datos_medicion')}</h3>
          <div className="ds-fg3" style={{ gap: 'var(--s4)' }}>
            <Campo rotulo={t('ingesta.valor_crudo')}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{l.valor_crudo != null ? valorConUnidad(l.valor_crudo, unidad) : t('ingesta.no_disponible')}</span>
            </Campo>
            <Campo rotulo={t('ingesta.valor_ajustado')}>
              {l.valor_ajustado != null
                ? <span style={{ fontFamily: 'var(--font-mono)' }}>{valorConUnidad(l.valor_ajustado, unidad)}</span>
                : <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('ingesta.sin_calibracion')}</span>}
            </Campo>
            <Campo rotulo={t('ingesta.categoria')}>{l.categoria_variable ?? '—'}</Campo>
            <Campo rotulo={t('ingesta.origen')}>{l.origen ? <OrigenDatoPill origen={l.origen} /> : '—'}</Campo>
            <Campo rotulo={t('ingesta.destino')}>
              <Pill tono={persistido ? 'success' : 'neutral'}>{t(persistido ? 'ingesta.destino_principal' : 'ingesta.destino_bitacora')}</Pill>
            </Campo>
          </div>
        </section>

        <section>
          <h3 style={H3}>{t('ingesta.tiempos')}</h3>
          <div className="ds-fg2" style={{ gap: 'var(--s4)' }}>
            <Campo rotulo={t('ingesta.capturado')}><span style={{ fontFamily: 'var(--font-mono)' }}>{formatearFechaHora(l.fecha_captura_dato)}</span></Campo>
            <Campo rotulo={t('ingesta.col_recibido')}><span style={{ fontFamily: 'var(--font-mono)' }}>{formatearFechaHora(l.fecha_evento)}</span></Campo>
            <Campo rotulo={t('ingesta.latencia')}><span style={{ fontFamily: 'var(--font-mono)' }}>{latenciaTexto(l.latencia_ms)}</span></Campo>
          </div>
          {conIndicadores.length > 0 && (
            <ul aria-label={t('ingesta.indicadores')} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)', listStyle: 'none', padding: 0, margin: 'var(--s4) 0 0' }}>
              {conIndicadores.map(([rotulo, activo]) => (
                <li key={rotulo}>
                  <Pill tono={activo ? 'info' : 'neutral'} icon={activo ? <CheckCircle2 size={12} aria-hidden /> : <Circle size={12} aria-hidden />}>
                    {rotulo}<span className="sr-only">{activo ? `: ${t('ingesta.si')}` : `: ${t('ingesta.no')}`}</span>
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 style={H3}>{t('ingesta.dispositivo')}</h3>
          <div className="ds-fg2" style={{ gap: 'var(--s4)' }}>
            <Campo rotulo={t('ingesta.sensor')}>{l.nombre_sensor ?? '—'}</Campo>
            <Campo rotulo={t('ingesta.dispositivo')}><span style={{ fontFamily: 'var(--font-mono)' }}>{l.serial_dispositivo ?? '—'}</span></Campo>
            <Campo rotulo={t('ingesta.area')}>{l.nombre_area ?? '—'}</Campo>
            <Campo rotulo={t('ingesta.gateway')}><span style={{ fontFamily: 'var(--font-mono)' }}>{l.gateway_id ?? '—'}</span></Campo>
          </div>
        </section>

        {l.descripcion && (
          <section>
            <h3 style={H3}>{t('ingesta.descripcion')}</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{l.descripcion}</p>
          </section>
        )}

        {l.payload_recibido && (
          <details>
            <summary style={{ cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', minHeight: 'var(--s9)', display: 'flex', alignItems: 'center' }}>{t('ingesta.payload')}</summary>
            <pre style={{ margin: 'var(--s2) 0 0', padding: 'var(--s3)', background: 'var(--surface-hover)', borderRadius: 'var(--r-md)', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(l.payload_recibido, null, 2)}
            </pre>
          </details>
        )}

        {nota && (
          <div role="note" style={{ display: 'flex', gap: 'var(--s2)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-md)', border: '1px solid var(--sem-info-border)', background: 'var(--sem-info-bg)', color: 'var(--text-primary)', fontSize: '13px' }}>
            <Info size={16} aria-hidden style={{ color: 'var(--sem-info)', flexShrink: 0, marginTop: 1 }} />
            <span>{nota}</span>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-53: detalle de lectura con fases, vector de visión y prioridad E15 |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: valores con máximo 2 decimales y separador regional |
import React from 'react';
import { CheckCircle2, XCircle, Circle, Info } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { ModalShell } from './ModalShell';
import { Pill, type Tono } from './Pill';
import { TipoDatoPill } from './TipoDatoPill';
import { OrigenDatoPill } from './OrigenDatoPill';
import { VectorComportamientoPanel } from './VectorComportamientoPanel';
import { FASES_INGESTA, ESTADOS_PERSISTIDOS, type EstadoIngesta, type LecturaIngestaMock } from '../mocks/ingestaMock';
import { valorConUnidad } from '../lib/sensorEscala';

export const ESTADO_INGESTA_TONO: Record<EstadoIngesta, Tono> = {
  LECTURA_VALIDA: 'success', FUERA_DE_RANGO: 'warning', ERROR_CALIBRACION: 'warning', ERROR_DUPLICADO: 'neutral',
  ERROR_AUTENTICACION: 'error', ERROR_ESTRUCTURA: 'error', ERROR_TIEMPO: 'error', ERROR_UNIDAD: 'error', ERROR_SENSOR: 'error',
};

export function latenciaTexto(ms: number | null): string {
  if (ms == null) return '—';
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

const H3: React.CSSProperties = { fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' };
const ROTULO: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 };
const VALOR: React.CSSProperties = { fontSize: '14px', color: 'var(--text-primary)' };

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return <div><div style={ROTULO}>{rotulo}</div><div style={VALOR}>{children}</div></div>;
}

interface Props {
  lectura: LecturaIngestaMock;
  onClose: () => void;
}

export function IngestaDetalleModal({ lectura: l, onClose }: Props) {
  const { t } = useT('telemetry');
  const esVision = l.tipoDato === 'VECTOR_COMPORTAMIENTO';
  const persistido = ESTADOS_PERSISTIDOS.includes(l.estado);
  const iError = l.fases.indexOf('error');
  const nombreFase = (i: number) => (esVision && i === 6 ? t('ingesta.fase_calibracion_no_aplica') : t(`ingesta.fase_${FASES_INGESTA[i]}`));

  const resumenFases = iError === -1
    ? t('ingesta.fases_todas_superadas')
    : t(persistido ? 'ingesta.fases_observacion' : 'ingesta.fases_detenido', { fase: nombreFase(iError) });

  const indicadores: [string, boolean][] = [
    ...(esVision ? [] : [[t('ingesta.ind_calibrado'), l.calibrado] as [string, boolean]]),
    [t('ingesta.ind_agregado'), l.agregado],
    [t('ingesta.ind_bufferizado'), l.origen === 'BUFFER_LOCAL'],
    [t('ingesta.ind_latencia_alta'), l.latenciaAlta],
    [t('ingesta.ind_frecuencia_anomala'), l.frecAnomala],
    [t('ingesta.ind_drift'), l.drift],
  ];

  const nota = l.estado !== 'LECTURA_VALIDA'
    ? t(`ingesta.nota_${l.estado}`, { unidad: l.unidad, capturado: l.capturado, procesado: l.procesado })
    : esVision ? `${l.vision?.individuos === 0 ? t('ingesta.nota_area_vacia') + ' ' : ''}${t('ingesta.nota_vision_defaults')}` : '';

  return (
    <ModalShell title={`${l.variable} — ${l.sensor}`} onClose={onClose} maxWidth={640}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap', marginBottom: 'var(--s5)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{l.id} · {l.dispositivo}</span>
        <Pill tono={ESTADO_INGESTA_TONO[l.estado]}>{t(`ingesta.estado_${l.estado}`)}</Pill>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
        <section>
          <h3 style={H3}>{t('ingesta.datos_medicion')}</h3>
          <div className="ds-fg3" style={{ gap: 'var(--s4)' }}>
            <Campo rotulo={t('ingesta.valor_crudo')}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                {esVision ? t('ingesta.valor_vector') : l.valor != null ? valorConUnidad(l.valor, l.unidad) : t('ingesta.no_disponible')}
              </span>
            </Campo>
            <Campo rotulo={t('ingesta.valor_ajustado')}>
              {esVision ? <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('ingesta.ajuste_no_aplica_vision')}</span>
                : l.valorAjustado != null ? <span style={{ fontFamily: 'var(--font-mono)' }}>{l.valorAjustado} {l.unidad}</span>
                  : <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('ingesta.sin_calibracion')}</span>}
            </Campo>
            <Campo rotulo={t('ingesta.categoria')}>{l.categoria}</Campo>
            <Campo rotulo={t('ingesta.origen')}><OrigenDatoPill origen={l.origen} /></Campo>
            <Campo rotulo={t('ingesta.tipo_dato')}><TipoDatoPill tipo={l.tipoDato} /></Campo>
            <Campo rotulo={t('ingesta.destino')}>
              <Pill tono={persistido ? 'success' : 'neutral'}>{t(persistido ? 'ingesta.destino_principal' : 'ingesta.destino_bitacora')}</Pill>
            </Campo>
          </div>
        </section>

        <section>
          <h3 style={H3}>{t('ingesta.tiempos')}</h3>
          <div className="ds-fg2" style={{ gap: 'var(--s4)' }}>
            <Campo rotulo={t('ingesta.capturado')}><span style={{ fontFamily: 'var(--font-mono)' }}>{l.capturado}{esVision && ' (= ventana_fin)'}</span></Campo>
            <Campo rotulo={t('ingesta.enviado')}><span style={{ fontFamily: 'var(--font-mono)' }}>{l.enviado}</span></Campo>
            <Campo rotulo={t('ingesta.procesado')}><span style={{ fontFamily: 'var(--font-mono)' }}>{l.procesado}</span></Campo>
            <Campo rotulo={t('ingesta.latencia')}><span style={{ fontFamily: 'var(--font-mono)' }}>{latenciaTexto(l.latenciaMs)}</span></Campo>
          </div>
          <ul aria-label={t('ingesta.indicadores')} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)', listStyle: 'none', padding: 0, margin: 'var(--s4) 0 0' }}>
            {indicadores.map(([rotulo, activo]) => (
              <li key={rotulo}>
                <Pill tono={activo ? 'info' : 'neutral'} icon={activo ? <CheckCircle2 size={12} aria-hidden /> : <Circle size={12} aria-hidden />}>
                  {rotulo}<span className="sr-only">{activo ? `: ${t('ingesta.si')}` : `: ${t('ingesta.no')}`}</span>
                </Pill>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 style={H3}>{t('ingesta.dispositivo')}</h3>
          <div className="ds-fg2" style={{ gap: 'var(--s4)' }}>
            <Campo rotulo={t('ingesta.sensor')}>{l.sensor}</Campo>
            <Campo rotulo={t('ingesta.dispositivo')}><span style={{ fontFamily: 'var(--font-mono)' }}>{l.dispositivo}</span></Campo>
            <Campo rotulo={t('ingesta.bateria')}>{l.bateria != null ? `${l.bateria}%` : t('ingesta.alimentacion_fija')}</Campo>
            <Campo rotulo={t('ingesta.senal')}><span style={{ fontFamily: 'var(--font-mono)' }}>{l.senal}</span></Campo>
          </div>
        </section>

        {esVision && l.vision && <VectorComportamientoPanel vector={l.vision} />}

        <section>
          <h3 style={H3}>{t('ingesta.recorrido_fases')}</h3>
          <p style={{ margin: '0 0 var(--s3)', fontSize: '13px', color: 'var(--text-secondary)' }}>{resumenFases}</p>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--s2)' }}>
            {l.fases.map((f, i) => (
              <li key={FASES_INGESTA[i]} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '13px', color: f === 'skip' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                {f === 'done' && <CheckCircle2 size={16} aria-hidden style={{ color: 'var(--sem-success)', flexShrink: 0 }} />}
                {f === 'error' && <XCircle size={16} aria-hidden style={{ color: 'var(--sem-error)', flexShrink: 0 }} />}
                {f === 'skip' && <Circle size={16} aria-hidden style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                <span>{i + 1}. {nombreFase(i)}<span className="sr-only">: {t(`ingesta.fase_estado_${f}`)}</span></span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h3 style={H3}>{t('ingesta.prioridad_e15')}</h3>
          <p style={{ margin: '0 0 var(--s3)', fontSize: '12px', color: 'var(--text-muted)' }}>{t('ingesta.prioridad_e15_ayuda')}</p>
          <div className="ds-fg2" style={{ gap: 'var(--s3)' }}>
            <Campo rotulo={`1 · ${t('ingesta.p_severidad')}`}>
              {l.severidad ? <Pill tono={l.severidad === 'CRITICO' ? 'error' : 'neutral'}>{t(l.severidad === 'CRITICO' ? 'ingesta.critico' : 'ingesta.no_critico')}</Pill>
                : <Pill tono="neutral">{t('ingesta.no_evaluada')}</Pill>}
            </Campo>
            <Campo rotulo={`2 · ${t('ingesta.p_area')}`}>
              <Pill tono={l.areaCriticidad === 'ALTA' ? 'warning' : l.areaCriticidad === 'BAJA' ? 'neutral' : 'info'}>
                {l.areaCriticidad ? t(`ingesta.area_${l.areaCriticidad}`) : t('ingesta.area_default')}
              </Pill>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>{l.area ?? t('ingesta.area_no_resuelta')}</div>
            </Campo>
            <Campo rotulo={`3 · ${t('ingesta.p_tipo')}`}>{t(esVision ? 'ingesta.tipo_telemetria_vision' : 'ingesta.tipo_telemetria_escalar')}</Campo>
            <Campo rotulo={`4 · ${t('ingesta.origen')}`}><OrigenDatoPill origen={l.origen} /></Campo>
            <Campo rotulo={`5 · ${t('ingesta.p_fifo')}`}><span style={{ fontFamily: 'var(--font-mono)' }}>{l.capturado}</span></Campo>
          </div>
        </section>

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

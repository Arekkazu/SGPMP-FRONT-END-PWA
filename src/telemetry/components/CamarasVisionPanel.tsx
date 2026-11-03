// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-60: parámetros de heartbeat por categoría y detección de visión por cámara |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre |
// | 2026-11-02 | Arekkazu | AJF-04 RF-60: parámetros y ventanas reales del backend, sin datos simulados |
import React from 'react';
import { ScanEye, Timer, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { formatearFechaHora, formatearHora, formatearNumero } from '../../shared/i18n/formato';
import { Alert } from '../../shared/design-system/Alert';
import { Pill, type Tono } from './Pill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';
import { formatoSegundos } from '../lib/duracion';
import type { ApiError } from '../../shared/api/errors';
import type { ParametrosHeartbeatCategoria, ResultadoVentanasVision, VentanasVision } from '../types';

const RESULTADO: Record<ResultadoVentanasVision, { tono: Tono; icon: React.ReactNode }> = {
  DETECCION_VALIDA: { tono: 'success', icon: <CheckCircle2 size={12} aria-hidden /> },
  SIN_DETECCION_VALIDA: { tono: 'warning', icon: <AlertTriangle size={12} aria-hidden /> },
  SIN_VENTANAS: { tono: 'neutral', icon: <Info size={12} aria-hidden /> },
  SIN_CONFIGURAR: { tono: 'neutral', icon: <Info size={12} aria-hidden /> },
  NO_ES_CAMARA: { tono: 'neutral', icon: <Info size={12} aria-hidden /> },
};

const H2: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s2)' };
const AYUDA: React.CSSProperties = { margin: '0 0 var(--s4)', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '75ch' };
const MONO: React.CSSProperties = { ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px' };

interface Props {
  parametros: ParametrosHeartbeatCategoria[];
  loadingParametros: boolean;
  errorParametros: ApiError | null;
  /** Dispositivo elegido en la lista (nombre para el título) y sus ventanas. */
  nombreDispositivo?: string;
  ventanas: VentanasVision | null;
  loadingVentanas: boolean;
  errorVentanas: ApiError | null;
}

function Segundos({ valor }: { valor: number | null }) {
  const { t } = useT('telemetry');
  return valor == null ? <span style={{ color: 'var(--text-muted)' }}>{t('camaras.sin_configurar_corto')}</span> : <>{formatoSegundos(valor)}</>;
}

export function CamarasVisionPanel({ parametros, loadingParametros, errorParametros, nombreDispositivo, ventanas, loadingVentanas, errorVentanas }: Props) {
  const { t } = useT('telemetry');
  const cols = [t('camaras.col_categoria'), t('camaras.col_intervalo'), t('camaras.col_frecuencia'), t('camaras.col_margen'), t('camaras.col_sin_senal'), t('camaras.col_inactivo'), t('camaras.col_cadena')];
  const faltan = parametros.some((p) => !p.configurado);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s7)' }}>
      <section>
        <h2 style={H2}><Timer size={18} aria-hidden />{t('camaras.parametros_titulo')}</h2>
        <p style={AYUDA}>{t('camaras.parametros_ayuda')}</p>
        {errorParametros && <Alert variant={errorParametros.status === 403 ? 'warning' : 'error'} title={t('camaras.error_parametros')} description={errorParametros.message} style={{ marginBottom: 'var(--s4)' }} />}
        {loadingParametros && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('camaras.cargando')}</p>}
        {parametros.length > 0 && (
          <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label={t('camaras.tabla_parametros')}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead><tr style={THEAD_ROW}>{cols.map((h) => <th key={h} scope="col" style={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {parametros.map((p) => (
                  <tr key={p.categoria} style={{ background: 'var(--surface-card)' }}>
                    <th scope="row" style={{ ...TD, textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {t(`camaras.cat_${p.categoria}`, { defaultValue: etiquetaCodigo(p.categoria) })}
                    </th>
                    <td style={MONO}><Segundos valor={p.intervalo_heartbeat_seg} /></td>
                    <td style={MONO}><Segundos valor={p.frecuencia_muestreo_seg} /></td>
                    <td style={MONO}><Segundos valor={p.margen_tolerancia_seg} /></td>
                    <td style={MONO}><Segundos valor={p.umbral_sin_senal_seg} /></td>
                    <td style={MONO}><Segundos valor={p.umbral_inactivo_seg} /></td>
                    <td style={TD}>
                      {p.cadena_valida == null
                        ? <Pill tono="neutral">{t('camaras.cadena_sin_datos')}</Pill>
                        : <Pill tono={p.cadena_valida ? 'success' : 'error'}>{t(p.cadena_valida ? 'camaras.cadena_ok' : 'camaras.cadena_error')}</Pill>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {faltan && <p style={{ margin: 'var(--s3) 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{t('camaras.sin_configurar')}</p>}
        <p style={{ margin: 'var(--s2) 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{t('camaras.cadena_explicacion')}</p>
      </section>

      <section aria-live="polite">
        <h2 style={H2}><ScanEye size={18} aria-hidden />{t('camaras.deteccion_titulo')}</h2>
        <p style={AYUDA}>{t('camaras.deteccion_ayuda')}</p>
        {!nombreDispositivo && !ventanas && !loadingVentanas && (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s5)', textAlign: 'center', margin: 0 }}>{t('camaras.elige_camara')}</p>
        )}
        {errorVentanas && <Alert variant={errorVentanas.status === 403 ? 'warning' : 'error'} title={t('camaras.error_ventanas')} description={errorVentanas.message} />}
        {loadingVentanas && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('camaras.cargando')}</p>}
        {ventanas && (
          <article style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', maxWidth: 560 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s2)', flexWrap: 'wrap', marginBottom: 'var(--s3)' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{nombreDispositivo}</span>
              <Pill tono={RESULTADO[ventanas.resultado].tono} icon={RESULTADO[ventanas.resultado].icon}>{t(`camaras.res_${ventanas.resultado}`)}</Pill>
            </header>
            {ventanas.resultado !== 'NO_ES_CAMARA' && ventanas.ventanas_consecutivas != null && ventanas.cobertura_minima != null && (
              <p style={{ margin: '0 0 var(--s2)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {t('camaras.politica', { n: ventanas.ventanas_consecutivas, cobertura: formatearNumero(ventanas.cobertura_minima, { style: 'percent' }) })}
                {' '}{t('camaras.consecutivas', { n: ventanas.consecutivas_bajo_minimo, max: ventanas.ventanas_consecutivas })}
              </p>
            )}
            {ventanas.ventanas.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s1)' }}>
                {ventanas.ventanas.map((v) => {
                  const bajo = ventanas.cobertura_minima != null && v.cobertura < ventanas.cobertura_minima;
                  return (
                    <li key={v.id_observacion_vision} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s2)', fontSize: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>
                        {v.inicio ? `${formatearFechaHora(v.inicio)}–${formatearHora(v.fin)}` : formatearFechaHora(v.fin)}
                        {v.n_individuos != null && ` · ${t('camaras.individuos', { n: v.n_individuos })}`}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: bajo ? 'var(--sem-warning)' : 'var(--text-secondary)' }}>
                        {bajo && <AlertTriangle size={12} aria-hidden style={{ verticalAlign: 'middle', marginRight: 2 }} />}
                        {formatearNumero(v.cobertura, { style: 'percent' })}{bajo && ` ${t('camaras.bajo_minimo')}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p style={{ margin: 'var(--s3) 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{t(`camaras.nota_${ventanas.resultado}`)}</p>
          </article>
        )}
      </section>
    </div>
  );
}

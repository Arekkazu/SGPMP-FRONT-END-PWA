// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-62: observaciones de visión, su índice de calidad y sus parámetros |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre |
// | 2026-10-31 | Arekkazu | TC-DIS-146 RF-53 a11y 1.3.1: la columna de detalle tiene encabezado |
import React, { useState } from 'react';
import { ScanEye, ChevronRight, Check, X } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { DatosSimuladosBanner } from './DatosSimuladosBanner';
import { ModalShell } from './ModalShell';
import { Pill, type Tono } from './Pill';
import { FlagChips } from './FlagChips';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import { alActivarConTeclado } from '../../shared/lib/teclado';
import {
  OBSERVACIONES_VISION, PARAMETROS_INDICE_VISION as P, evaluarVision,
  type ClaseVision, type ObservacionVision,
} from '../mocks/calidadVisionMock';

const CLASE_TONO: Record<ClaseVision, Tono> = { OPTIMA: 'success', DEGRADADA: 'warning', NO_APTA: 'error' };
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: '12px' };

function Apto({ ok }: { ok: boolean }) {
  const { t } = useT('telemetry');
  return ok
    ? <Check size={16} aria-label={t('calidadvision.si')} style={{ color: 'var(--sem-success)' }} />
    : <X size={16} aria-label={t('calidadvision.no')} style={{ color: 'var(--sem-error)' }} />;
}

function DetalleVision({ o, onClose }: { o: ObservacionVision; onClose: () => void }) {
  const { t } = useT('telemetry');
  const ev = evaluarVision(o);
  const filas: [string, string][] = [
    ['cobertura_ventana', `${o.cobertura.toFixed(2)} × w1 ${P.w1}`],
    ['min(1, fps_efectivo / fps_configurado)', `${ev.componenteFps.toFixed(2)} (${o.fpsEfectivo} / ${o.fpsConfigurado}) × w2 ${P.w2}`],
    ['1 − min(1, n_tracks_perdidos / tracks_tolerables)', `${ev.componenteTracks.toFixed(2)} (${o.tracksPerdidos} / ${P.tracksTolerables}) × w3 ${P.w3}`],
    [t('calidadvision.base'), String(ev.base)],
    [t('calidadvision.factor', { estado: o.calibracion }), `× ${ev.factor.toFixed(2)}`],
  ];
  return (
    <ModalShell title={t('calidadvision.detalle_titulo', { area: o.area })} onClose={onClose}>
      <p style={{ margin: '0 0 var(--s4)', ...MONO, color: 'var(--text-muted)' }}>{o.id} · {o.camara} · {o.ventana}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
        <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{ev.indice}</span>
        <Pill tono={CLASE_TONO[ev.clase]}>{t(`calidadvision.clase_${ev.clase}`)}</Pill>
        {ev.confianzaBaja && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('calidadvision.confianza_baja')}</span>}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <tbody>
          {filas.map(([k, v]) => (
            <tr key={k}>
              <th scope="row" style={{ ...TD, ...MONO, textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)' }}>{k}</th>
              <td style={{ ...TD, ...MONO, textAlign: 'right', color: 'var(--text-primary)' }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ margin: 'var(--s4) 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{t('calidadvision.inmutable')}</p>
    </ModalShell>
  );
}

export function CalidadVisionPanel() {
  const { t } = useT('telemetry');
  const [abierta, setAbierta] = useState<ObservacionVision | null>(null);
  const cols = [t('calidadvision.col_camara'), t('calidadvision.col_ventana'), t('calidadvision.col_valor'), t('calidadvision.col_indice'), t('calidadvision.col_clase'), t('calidadvision.col_apto_ia'), t('calidadvision.col_apto_nic41'), t('calidadvision.col_flags'), ''];

  return (
    <section style={{ marginTop: 'var(--s7)' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s2)' }}>
        <ScanEye size={18} aria-hidden />{t('calidadvision.titulo')}
      </h2>
      <p style={{ margin: '0 0 var(--s4)', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '75ch' }}>{t('calidadvision.ayuda')}</p>
      <DatosSimuladosBanner seccion />

      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', marginBottom: 'var(--s5)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' }}>{t('calidadvision.parametros_titulo')}</h3>
        <code style={{ display: 'block', ...MONO, lineHeight: 1.6, padding: 'var(--s3)', background: 'var(--surface-hover)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
          {`Índice = 100 × ( ${P.w1} · cobertura_ventana\n  + ${P.w2} · min(1, fps_efectivo / fps_configurado)\n  + ${P.w3} · (1 − min(1, n_tracks_perdidos / ${P.tracksTolerables})) )\n  × CALIBRADO 1.00 · EN_CALIBRACION ${P.factorEnCalibracion.toFixed(2)} · SIN_LINEA_BASE 0.00`}
        </code>
        <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)', listStyle: 'none', padding: 0, margin: 'var(--s3) 0 0' }}>
          <li><Pill tono="success">≥ {P.umbralOptima} {t('calidadvision.clase_OPTIMA')}</Pill></li>
          <li><Pill tono="warning">{P.umbralDegradada}–{P.umbralOptima - 1} {t('calidadvision.clase_DEGRADADA')}</Pill></li>
          <li><Pill tono="error">&lt; {P.umbralDegradada} {t('calidadvision.clase_NO_APTA')}</Pill></li>
        </ul>
        <p style={{ margin: 'var(--s3) 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{t('calidadvision.nic41_nota')}</p>
      </div>

      <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label="Tabla de calidad de visión">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead><tr style={THEAD_ROW}>{cols.map((h, i) => <th key={i} scope="col" style={TH}>{h || <span className="ds-sr-only">{t('acciones.ver_detalle', { ns: 'common' })}</span>}</th>)}</tr></thead>
          <tbody>
            {OBSERVACIONES_VISION.map((o) => {
              const ev = evaluarVision(o);
              return (
                <tr key={o.id} className="ds-fila-accion" tabIndex={0} onClick={() => setAbierta(o)} onKeyDown={alActivarConTeclado(() => setAbierta(o))}>
                  <td style={TD}>
                    <div style={{ ...MONO, color: 'var(--text-primary)', fontWeight: 600 }}>{o.camara}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.area}</div>
                  </td>
                  <td style={{ ...TD, ...MONO, whiteSpace: 'nowrap' }}>{o.ventana}</td>
                  <td style={{ ...TD, ...MONO, whiteSpace: 'nowrap' }}>ρ {o.densidad.toFixed(2)} · n={o.individuos}</td>
                  <td style={{ ...TD, ...MONO, color: 'var(--text-primary)', fontWeight: 600 }}>{ev.indice}</td>
                  <td style={TD}><Pill tono={CLASE_TONO[ev.clase]}>{t(`calidadvision.clase_${ev.clase}`)}</Pill></td>
                  <td style={{ ...TD, textAlign: 'center' }}>
                    <Apto ok={ev.aptoParaIa} />
                    {ev.confianzaBaja && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('calidadvision.confianza_baja')}</div>}
                  </td>
                  <td style={TD}><Pill tono="neutral">{t('calidadvision.no_aplica')}</Pill></td>
                  <td style={TD}><FlagChips flags={ev.flags} max={2} /></td>
                  <td style={{ ...TD, textAlign: 'right', color: 'var(--text-muted)' }}><ChevronRight size={16} aria-label={t('calidadvision.ver_detalle')} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {abierta && <DetalleVision o={abierta} onClose={() => setAbierta(null)} />}
    </section>
  );
}

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-62: observaciones de visión, su índice de calidad y sus parámetros |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre |
// | 2026-10-31 | Arekkazu | TC-DIS-146 RF-53 a11y 1.3.1: la columna de detalle tiene encabezado |
// | 2026-11-03 | Arekkazu | RF-62: observaciones reales de GET /iot/calidad/vision en vez de datos de ejemplo |
import React, { useEffect, useState } from 'react';
import { ScanEye, ChevronRight, Check, X } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { formatearFechaHora, formatearNumero } from '../../shared/i18n/formato';
import { Alert } from '../../shared/design-system/Alert';
import { ModalShell } from './ModalShell';
import { Pill, type Tono } from './Pill';
import { FlagChips } from './FlagChips';
import { Paginacion } from './Paginacion';
import { TH, TD, TABLE_WRAP, THEAD_ROW, INPUT, LABEL } from './tableStyles';
import { alActivarConTeclado } from '../../shared/lib/teclado';
import { useCalidadVision, POR_PAGINA_VISION } from '../hooks/useCalidadVision';
import { flagsActivos, valoresEvaluados } from '../lib/calidadVision';
import type { ClaseVision, FiltroClaseVision, ObservacionVisionEvaluada, PoliticaVision } from '../types';

const CLASE_TONO: Record<ClaseVision, Tono> = { OPTIMA: 'success', DEGRADADA: 'warning', NO_APTA: 'error' };
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: '12px' };

function num(v: string | number | null | undefined, decimales = 2): string {
  const n = Number(v);
  return v == null || !Number.isFinite(n) ? '—' : formatearNumero(n, { maximumFractionDigits: decimales });
}

function hora(iso: string | null): string {
  return iso ? formatearFechaHora(iso, { hour: '2-digit', minute: '2-digit' }) : '—';
}

function Apto({ ok }: { ok: boolean | null }) {
  const { t } = useT('telemetry');
  if (ok == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return ok
    ? <Check size={16} aria-label={t('calidadvision.si')} style={{ color: 'var(--sem-success)' }} />
    : <X size={16} aria-label={t('calidadvision.no')} style={{ color: 'var(--sem-error)' }} />;
}

function ClasePill({ o }: { o: ObservacionVisionEvaluada }) {
  const { t } = useT('telemetry');
  return o.clasificacion_calidad
    ? <Pill tono={CLASE_TONO[o.clasificacion_calidad]}>{t(`calidadvision.clase_${o.clasificacion_calidad}`)}</Pill>
    : <Pill tono="neutral">{t('calidadvision.sin_evaluar')}</Pill>;
}

function DetalleVision({ o, onClose }: { o: ObservacionVisionEvaluada; onClose: () => void }) {
  const { t } = useT('telemetry');
  const v = valoresEvaluados(o);
  const filas: [string, string][] = [
    [t('calidadvision.det_cobertura'), num(v.cobertura)],
    [t('calidadvision.det_fps'), `${num(v.fpsEfectivo, 1)} / ${num(v.fpsConfigurado, 1)}`],
    [t('calidadvision.det_tracks'), `${v.tracksPerdidos} / ${v.tracksTolerables ?? '—'}`],
    [t('calidadvision.det_calibracion'), t(`calidadvision.calibracion_${o.estado_calibracion}`)],
    [t('calidadvision.det_individuos'), o.n_individuos_observados != null ? String(o.n_individuos_observados) : '—'],
  ];
  return (
    <ModalShell title={t('calidadvision.detalle_titulo', { area: o.nombre_area ?? `#${o.id_infraestructura}` })} onClose={onClose}>
      <p style={{ margin: '0 0 var(--s4)', ...MONO, color: 'var(--text-muted)' }}>
        {o.serial_camara ?? `#${o.id_dispositivo_iot}`} · {hora(o.fecha_inicio_ventana)}–{hora(o.fecha_observacion)}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s3)', marginBottom: 'var(--s4)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{num(o.indice_calidad_vision)}</span>
        <ClasePill o={o} />
        {o.es_confianza_baja && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('calidadvision.confianza_baja')}</span>}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <tbody>
          {filas.map(([k, val]) => (
            <tr key={k}>
              <th scope="row" style={{ ...TD, textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)' }}>{k}</th>
              <td style={{ ...TD, ...MONO, textAlign: 'right', color: 'var(--text-primary)' }}>{val}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 'var(--s4)' }}><FlagChips flags={flagsActivos(o.flags_detectados)} textoVacio={t('calidadvision.sin_flags')} /></div>
      <p style={{ margin: 'var(--s4) 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
        {o.fecha_evaluacion_calidad ? t('calidadvision.evaluada_el', { fecha: formatearFechaHora(o.fecha_evaluacion_calidad) }) : t('calidadvision.pendiente_evaluacion')}
        {' '}{t('calidadvision.inmutable')}
      </p>
    </ModalShell>
  );
}

function Politica({ p, motivo }: { p: PoliticaVision | null; motivo: string | null }) {
  const { t } = useT('telemetry');
  if (!p) {
    return <Alert variant="warning" title={t('calidadvision.politica_sin_configurar')} description={motivo ?? undefined} style={{ marginBottom: 'var(--s5)' }} />;
  }
  const optima = Number(p.umbral_optima);
  const degradada = Number(p.umbral_degradada);
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', marginBottom: 'var(--s5)' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' }}>{t('calidadvision.parametros_titulo')}</h3>
      <code style={{ display: 'block', ...MONO, lineHeight: 1.6, padding: 'var(--s3)', background: 'var(--surface-hover)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
        {`Índice = 100 × ( ${num(p.w1)} · cobertura_ventana\n  + ${num(p.w2)} · min(1, fps_efectivo / fps_configurado)\n  + ${num(p.w3)} · (1 − min(1, n_tracks_perdidos / ${p.tracks_perdidos_tolerables})) )\n  × CALIBRADO 1 · EN_CALIBRACION ${num(p.factor_en_calibracion)} · SIN_LINEA_BASE 0`}
      </code>
      <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)', listStyle: 'none', padding: 0, margin: 'var(--s3) 0 0' }}>
        <li><Pill tono="success">≥ {num(optima)} {t('calidadvision.clase_OPTIMA')}</Pill></li>
        <li><Pill tono="warning">{num(degradada)}–{num(optima)} {t('calidadvision.clase_DEGRADADA')}</Pill></li>
        <li><Pill tono="error">&lt; {num(degradada)} {t('calidadvision.clase_NO_APTA')}</Pill></li>
      </ul>
      <p style={{ margin: 'var(--s3) 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{t('calidadvision.nic41_nota')}</p>
    </div>
  );
}

export function CalidadVisionPanel() {
  const { t } = useT('telemetry');
  const vision = useCalidadVision();
  const [clase, setClase] = useState<FiltroClaseVision | ''>('');
  const [abierta, setAbierta] = useState<ObservacionVisionEvaluada | null>(null);
  const filtros = (c = clase) => (c ? { clasificacion: c } : {});
  useEffect(() => { void vision.cargar({}, 1); }, [vision.cargar]);

  const cols = [t('calidadvision.col_camara'), t('calidadvision.col_ventana'), t('calidadvision.col_valor'), t('calidadvision.col_indice'), t('calidadvision.col_clase'), t('calidadvision.col_apto_ia'), t('calidadvision.col_apto_nic41'), t('calidadvision.col_flags'), ''];
  const d = vision.datos;
  const totalPaginas = d ? Math.max(1, Math.ceil(d.total / POR_PAGINA_VISION)) : 1;

  return (
    <section style={{ marginTop: 'var(--s7)' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s2)' }}>
        <ScanEye size={18} aria-hidden />{t('calidadvision.titulo')}
      </h2>
      <p style={{ margin: '0 0 var(--s4)', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '75ch' }}>{t('calidadvision.ayuda')}</p>

      {d && <Politica p={d.politica} motivo={d.politica_motivo} />}

      <div style={{ maxWidth: 320, marginBottom: 'var(--s4)' }}>
        <label style={LABEL} htmlFor="vision-clase">{t('calidadvision.filtro_clase')}</label>
        <select id="vision-clase" style={INPUT} value={clase}
          onChange={(e) => { const c = e.target.value as FiltroClaseVision | ''; setClase(c); void vision.cargar(filtros(c), 1); }}>
          <option value="">{t('calidadvision.todas')}</option>
          {(['OPTIMA', 'DEGRADADA', 'NO_APTA'] as const).map((c) => <option key={c} value={c}>{t(`calidadvision.clase_${c}`)}</option>)}
          <option value="SIN_EVALUAR">{t('calidadvision.sin_evaluar')}</option>
        </select>
        <p style={{ margin: 'var(--s1) 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{t('calidadvision.rango')}</p>
      </div>

      {vision.error && <Alert variant={vision.error.status === 403 ? 'warning' : 'error'} title={t('calidadvision.error')} description={vision.error.message} style={{ marginBottom: 'var(--s4)' }} />}

      {vision.loading && !d ? (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('calidadvision.cargando')}</p>
      ) : d && d.items.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('calidadvision.vacio')}</p>
      ) : d && (
        <>
          <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label={t('calidadvision.tabla_aria')} aria-busy={vision.loading}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead><tr style={THEAD_ROW}>{cols.map((h, i) => <th key={i} scope="col" style={TH}>{h || <span className="ds-sr-only">{t('acciones.ver_detalle', { ns: 'common' })}</span>}</th>)}</tr></thead>
              <tbody>
                {d.items.map((o) => (
                  <tr key={o.id_observacion_vision} className="ds-fila-accion" tabIndex={0} onClick={() => setAbierta(o)} onKeyDown={alActivarConTeclado(() => setAbierta(o))}>
                    <td style={TD}>
                      <div style={{ ...MONO, color: 'var(--text-primary)', fontWeight: 600 }}>{o.serial_camara ?? `#${o.id_dispositivo_iot}`}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.nombre_area ?? `#${o.id_infraestructura}`}</div>
                    </td>
                    <td style={{ ...TD, ...MONO, whiteSpace: 'nowrap' }}>{hora(o.fecha_inicio_ventana)}–{hora(o.fecha_observacion)}</td>
                    <td style={{ ...TD, ...MONO, whiteSpace: 'nowrap' }}>{o.n_individuos_observados != null ? t('calidadvision.individuos', { n: o.n_individuos_observados }) : '—'}</td>
                    <td style={{ ...TD, ...MONO, color: 'var(--text-primary)', fontWeight: 600 }}>{num(o.indice_calidad_vision)}</td>
                    <td style={TD}><ClasePill o={o} /></td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <Apto ok={o.es_apto_para_ia} />
                      {o.es_confianza_baja && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('calidadvision.confianza_baja')}</div>}
                    </td>
                    <td style={TD}><Pill tono="neutral">{t('calidadvision.no_aplica')}</Pill></td>
                    <td style={TD}><FlagChips flags={flagsActivos(o.flags_detectados)} max={2} /></td>
                    <td style={{ ...TD, textAlign: 'right', color: 'var(--text-muted)' }}><ChevronRight size={16} aria-label={t('calidadvision.ver_detalle')} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPaginas > 1 && (
            <Paginacion pagina={d.pagina} totalPaginas={totalPaginas} totalRegistros={d.total} onCambiar={(p) => void vision.cargar(filtros(), p)} />
          )}
        </>
      )}

      {abierta && <DetalleVision o={abierta} onClose={() => setAbierta(null)} />}
    </section>
  );
}

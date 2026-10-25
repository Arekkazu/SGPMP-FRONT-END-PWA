// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-71: monitoreo de degradación, historial con versión en RF-69 y formulario v2 |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M4-08 RF-71: solo Admin/Vet (permiso E sobre versiones de modelo) |
import React, { useState } from 'react';
import { formatearFechaHora, formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { RefreshCw, Play, CheckCircle2, XCircle, Loader2, Cpu, Terminal, TrendingDown, Circle, Info } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { usePermission } from '../../shared/rbac/usePermission';
import { DatosSimuladosBanner } from '../components/DatosSimuladosBanner';
import { PermissionDenied } from '../components/PermissionDenied';
import { RECURSO_MODELOS, ACCION_E } from '../rbac';
import { EstadoModeloPill } from '../components/EstadoModeloPill';
import { ModalShell } from '../components/ModalShell';
import { ProgressBar } from '../components/ProgressBar';
import { Pill, type Tono } from '../components/Pill';
import { INPUT, LABEL, TH, TD, TABLE_WRAP, THEAD_ROW } from '../components/tableStyles';
import { COMPONENTES, PARADIGMA_POR_TIPO, TIPOS_MODELO, TIPO_MODELO_LABEL, type TipoModelo } from '../types';
import {
  PROCESOS_REENTRENAMIENTO, RECURSOS_MOCK, DEGRADACION, FASES_REENTRENAMIENTO, estadoFases,
  type ProcesoReentrenamiento, type EstadoProceso, type EstadoFase,
} from '../mocks/reentrenamientoMock';

const ESTADO_TONO: Record<EstadoProceso, Tono> = {
  EJECUTANDO: 'info', PAUSADO: 'warning', COMPLETADO: 'success', FALLIDO: 'error', ABORTADO: 'neutral', INTERRUMPIDO: 'warning',
};
const H3: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '13px', fontWeight: 700, margin: '0 0 var(--s3)', color: 'var(--text-primary)' };
const CARD: React.CSSProperties = { background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' };

function tipoTexto(tipo: TipoModelo, componente: string | null) {
  return `${TIPO_MODELO_LABEL[tipo]}${componente ? ` · ${componente}` : ''}`;
}

function IconoFase({ estado }: { estado: EstadoFase }) {
  if (estado === 'completada') return <CheckCircle2 size={16} aria-hidden style={{ color: 'var(--sem-success)', flexShrink: 0 }} />;
  if (estado === 'en_curso') return <Loader2 size={16} aria-hidden style={{ color: 'var(--sem-info)', flexShrink: 0 }} />;
  if (estado === 'fallida') return <XCircle size={16} aria-hidden style={{ color: 'var(--sem-error)', flexShrink: 0 }} />;
  return <Circle size={16} aria-hidden style={{ color: 'var(--text-muted)', flexShrink: 0 }} />;
}

function MonitorModal({ proceso: p, onClose }: { proceso: ProcesoReentrenamiento; onClose: () => void }) {
  const { t } = useT('prediction');
  const fases = estadoFases(p);
  return (
    <ModalShell title={t('reentrenamiento.monitor_titulo', { id: p.id })} onClose={onClose} maxWidth={640} footer={<Button variant="secondary" onClick={onClose}>{t('reentrenamientoview.cerrar')}</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Pill tono={ESTADO_TONO[p.estado]}>{t(`reentrenamiento.estado_${p.estado}`)}</Pill>
          <Pill tono="neutral">{tipoTexto(p.tipoModelo, p.componente)}</Pill>
          <Pill tono="neutral">{t(`reentrenamiento.disparador_${p.disparador}`)}</Pill>
          <Pill tono="neutral">{t(`reentrenamiento.modo_${p.modo}`)}</Pill>
        </div>

        <div className="ds-fg3" style={{ gap: 'var(--s3)', fontSize: '13px' }}>
          <div><div style={LABEL}>{t('reentrenamiento.version_base')}</div><span style={{ fontFamily: 'var(--font-mono)' }}>{p.versionBase}</span></div>
          <div><div style={LABEL}>{t('reentrenamiento.dataset')}</div>{p.registros != null ? t('reentrenamiento.registros', { n: formatearNumero(p.registros) }) : '—'}</div>
          <div><div style={LABEL}>{t('reentrenamiento.version_rf69')}</div>{p.versionNueva ? <span style={{ display: 'inline-flex', gap: 'var(--s1)', alignItems: 'center', fontFamily: 'var(--font-mono)' }}>{p.versionNueva}{p.estadoRf69 && <EstadoModeloPill estado={p.estadoRf69} />}</span> : '—'}</div>
        </div>

        <ProgressBar valor={p.progreso} label={t('reentrenamientoview.progreso_general')} height={10} color={p.estado === 'FALLIDO' ? 'var(--sem-error)' : 'var(--brand-500)'} />

        <section>
          <h3 style={H3}>{t('reentrenamientoview.fases_del_proceso')}</h3>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
            {FASES_REENTRENAMIENTO.map((f, i) => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', fontSize: '13px', color: fases[i] === 'pendiente' ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: fases[i] === 'en_curso' ? 700 : 400 }}>
                <IconoFase estado={fases[i]} />
                <span>{i + 1}. {t(`reentrenamiento.fase_${f}`)}<span className="sr-only">: {t(`reentrenamiento.fase_estado_${fases[i]}`)}</span></span>
              </li>
            ))}
          </ol>
          <p style={{ margin: 'var(--s3) 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{t('reentrenamiento.sin_evaluar')}</p>
        </section>

        <section style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s4)' }}>
          <h3 style={H3}><Cpu size={15} aria-hidden />{t('reentrenamientoview.uso_de_recursos')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            <ProgressBar valor={RECURSOS_MOCK.cpu} label={t('reentrenamiento.cpu', { max: RECURSOS_MOCK.cpuMax })} color={RECURSOS_MOCK.cpu > RECURSOS_MOCK.cpuMax ? 'var(--sem-error)' : 'var(--sem-info)'} />
            <ProgressBar valor={RECURSOS_MOCK.ram} label={t('reentrenamiento.ram', { max: RECURSOS_MOCK.ramMax })} color={RECURSOS_MOCK.ram > RECURSOS_MOCK.ramMax ? 'var(--sem-error)' : 'var(--sem-info)'} />
          </div>
        </section>

        <section style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s4)' }}>
          <h3 style={H3}><Terminal size={15} aria-hidden />{t('reentrenamiento.log_titulo')}</h3>
          <pre tabIndex={0} style={{ margin: 0, padding: 'var(--s3)', background: 'var(--surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', fontFamily: 'var(--font-mono)', fontSize: '11px', overflowX: 'auto', lineHeight: 1.6 }}>
            {p.log.join('\n')}
          </pre>
        </section>
      </div>
    </ModalShell>
  );
}

function ConfigModal({ onClose }: { onClose: () => void }) {
  const { t } = useT('prediction');
  const [tipo, setTipo] = useState<TipoModelo>('MODELO_ESPECIES_MEDIANAS');
  const poblacional = PARADIGMA_POR_TIPO[tipo] === 'POBLACIONAL';
  const base = DEGRADACION.find((d) => d.tipoModelo === tipo)?.version ?? '—';
  return (
    <ModalShell
      title={t('reentrenamiento.configurar_titulo')}
      onClose={onClose}
      maxWidth={640}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('reentrenamientoview.cancelar')}</Button>
          <Button variant="primary" disabled title={t('reentrenamientoview.disparo_no_disponible')}>{t('reentrenamientoview.revisar_y_comenzar')}</Button>
        </>
      }
    >
      <Alert variant="info" title={t('reentrenamientoview.disparo_no_disponible')} description={t('reentrenamiento.disparo_desc')} style={{ marginBottom: 'var(--s4)' }} />
      <p style={{ margin: '0 0 var(--s4)', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('reentrenamiento.segundo_plano')}</p>
      <div style={{ display: 'grid', gap: 'var(--s4)' }}>
        <div className="ds-fg2" style={{ gap: 'var(--s4)' }}>
          <div>
            <label style={LABEL} htmlFor="re-tipo">{t('reentrenamientoview.tipo_de_modelo')}</label>
            <select id="re-tipo" style={INPUT} value={tipo} onChange={(e) => setTipo(e.target.value as TipoModelo)}>
              {TIPOS_MODELO.map((tm) => <option key={tm} value={tm}>{TIPO_MODELO_LABEL[tm]}</option>)}
            </select>
          </div>
          {poblacional && (
            <div>
              <label style={LABEL} htmlFor="re-comp">{t('reentrenamiento.componente')}</label>
              <select id="re-comp" style={INPUT} disabled defaultValue="ANOMALIAS">
                {COMPONENTES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={LABEL} htmlFor="re-modo">{t('reentrenamiento.modo_generacion')}</label>
            <select id="re-modo" style={INPUT} disabled defaultValue={poblacional ? 'CALIBRACION_EN_SITIO' : 'REENTRENAMIENTO'}>
              <option value="REENTRENAMIENTO">{t('reentrenamiento.modo_REENTRENAMIENTO')}</option>
              <option value="CALIBRACION_EN_SITIO">{t('reentrenamiento.modo_CALIBRACION_EN_SITIO')}</option>
            </select>
          </div>
          <div>
            <span style={LABEL}>{t('reentrenamiento.version_base')}</span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', padding: 'var(--s2) 0' }}>{base}</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('reentrenamiento.version_base_ayuda')}</span>
          </div>
          <div><label style={LABEL} htmlFor="re-desde">{t('reentrenamientoview.datos_desde')}</label><input id="re-desde" type="date" style={INPUT} disabled /></div>
          <div><label style={LABEL} htmlFor="re-hasta">{t('reentrenamientoview.datos_hasta')}</label><input id="re-hasta" type="date" style={INPUT} disabled /></div>
        </div>

        <fieldset style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', padding: 'var(--s4)', margin: 0 }}>
          <legend style={{ ...LABEL, padding: '0 var(--s1)' }}>{t('reentrenamiento.parametros')}</legend>
          <div className="ds-fg2" style={{ gap: 'var(--s4)' }}>
            <div>
              <label style={LABEL} htmlFor="re-algo">{t('reentrenamientoview.algoritmo')}</label>
              <select id="re-algo" style={INPUT} disabled defaultValue="RF">
                <option value="RF">{t('reentrenamiento.rf_defecto')}</option>
                <option value="GB">{t('reentrenamientoview.gradient_boosting')}</option>
                <option value="LSTM">{t('reentrenamientoview.lstm')}</option>
                <option value="XGB">{t('reentrenamientoview.xgboost')}</option>
              </select>
            </div>
            <div>
              <label style={LABEL} htmlFor="re-valid">{t('reentrenamiento.validacion')}</label>
              <select id="re-valid" style={INPUT} disabled defaultValue="CV">
                <option value="CV">{t('reentrenamiento.validacion_cruzada')}</option>
                <option value="HOLDOUT">Hold-out 70/15/15</option>
                <option value="SKF">Stratified K-Fold</option>
              </select>
            </div>
            <div><label style={LABEL} htmlFor="re-arboles">{t('reentrenamiento.arboles')}</label><input id="re-arboles" type="number" style={INPUT} disabled defaultValue={100} /><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('reentrenamiento.arboles_ayuda')}</span></div>
            <div><label style={LABEL} htmlFor="re-ventana">{t('reentrenamiento.ventana')}</label><input id="re-ventana" type="number" style={INPUT} disabled defaultValue={10} /><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('reentrenamiento.ventana_ayuda')}</span></div>
            <div><label style={LABEL} htmlFor="re-semilla">{t('reentrenamiento.semilla')}</label><input id="re-semilla" type="number" style={INPUT} disabled defaultValue={42} /><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('reentrenamiento.semilla_ayuda')}</span></div>
          </div>
        </fieldset>

        <div role="note" style={{ display: 'flex', gap: 'var(--s2)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-md)', border: '1px solid var(--sem-info-border)', background: 'var(--sem-info-bg)', fontSize: '13px', color: 'var(--text-primary)' }}>
          <Info size={16} aria-hidden style={{ color: 'var(--sem-info)', flexShrink: 0, marginTop: 1 }} />
          <span><strong>{t('reentrenamiento.sin_activacion_titulo')}</strong> {t('reentrenamiento.sin_activacion_texto')}</span>
        </div>
      </div>
    </ModalShell>
  );
}

export function ReentrenamientoView() {
  const { t } = useT('prediction');
  const [monitor, setMonitor] = useState<ProcesoReentrenamiento | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  // M4-08: RF-71 reserva el reentrenamiento a Admin/Vet. No tiene recurso propio;
  // se usa E sobre versiones de modelo, el mismo que activa una versión.
  const puedeReentrenar = usePermission(RECURSO_MODELOS, ACCION_E);

  const contar = (e: EstadoProceso) => PROCESOS_REENTRENAMIENTO.filter((p) => p.estado === e).length;
  const kpis: [string, number, string, React.ReactNode][] = [
    [t('reentrenamiento.kpi_ejecutando'), contar('EJECUTANDO'), 'var(--sem-info)', <Loader2 size={18} aria-hidden key="e" />],
    [t('reentrenamiento.kpi_completados'), contar('COMPLETADO'), 'var(--sem-success)', <CheckCircle2 size={18} aria-hidden key="c" />],
    [t('reentrenamiento.kpi_fallidos'), contar('FALLIDO') + contar('INTERRUMPIDO'), 'var(--sem-error)', <XCircle size={18} aria-hidden key="f" />],
    [t('reentrenamiento.kpi_degradados'), DEGRADACION.filter((d) => d.degradado).length, 'var(--sem-warning)', <TrendingDown size={18} aria-hidden key="d" />],
  ];

  if (!puedeReentrenar) return <PermissionDenied seccion="Reentrenamiento de modelos" />;

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <RefreshCw size={20} aria-hidden />{t('reentrenamientoview.reentrenamiento_de_modelos')}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('reentrenamiento.descripcion')}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setConfigOpen(true)}>
          <Play size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('reentrenamientoview.nuevo_reentrenamiento')}</Button>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        <DatosSimuladosBanner detalle="El reentrenamiento lo ejecuta el pipeline del equipo IoT/IA (RF-71); esta vista usa datos de ejemplo" />

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          {kpis.map(([etiqueta, valor, color, icon]) => (
            <div key={etiqueta} style={{ ...CARD, flex: '1 1 130px', minWidth: 130 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', color }}>{icon}<span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{valor}</span></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{etiqueta}</div>
            </div>
          ))}
        </div>

        <section aria-labelledby="re-degradacion" style={{ marginBottom: 'var(--s7)' }}>
          <h2 id="re-degradacion" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s2)' }}>
            <TrendingDown size={18} aria-hidden />{t('reentrenamiento.degradacion_titulo')}
          </h2>
          <p style={{ margin: '0 0 var(--s4)', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('reentrenamiento.degradacion_ayuda')}</p>
          <div style={TABLE_WRAP}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead><tr style={THEAD_ROW}>{[t('reentrenamiento.col_tipo'), t('reentrenamiento.col_version'), t('reentrenamiento.col_evaluacion'), t('reentrenamiento.col_datos'), t('reentrenamiento.col_criterio'), t('reentrenamiento.col_resultado')].map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {DEGRADACION.map((d) => (
                  <tr key={`${d.tipoModelo}-${d.componente}`}>
                    <td style={TD}>{tipoTexto(d.tipoModelo, d.componente)}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{d.version}</td>
                    <td style={{ ...TD, fontSize: '12px', whiteSpace: 'nowrap' }}>{formatearFechaHora(d.ultimaEvaluacion)}</td>
                    <td style={{ ...TD, fontSize: '12px', color: 'var(--text-secondary)' }}>{d.datos}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{d.criterio}</td>
                    <td style={TD}><Pill tono={d.degradado ? 'warning' : 'success'}>{t(d.degradado ? 'reentrenamiento.degradado' : 'reentrenamiento.estable')}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' }}>{t('reentrenamiento.historial_titulo')}</h2>
        <div style={TABLE_WRAP}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={THEAD_ROW}>
                {[t('reentrenamiento.col_inicio'), t('reentrenamiento.col_tipo'), t('reentrenamiento.col_activacion'), t('reentrenamiento.col_modo'), t('reentrenamiento.col_estado'), t('reentrenamiento.version_rf69'), ''].map((h, i) => <th key={i} style={TH}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {PROCESOS_REENTRENAMIENTO.map((p) => (
                <tr key={p.id}>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'nowrap' }}>{formatearFechaHora(p.inicio)}</td>
                  <td style={TD}>{tipoTexto(p.tipoModelo, p.componente)}</td>
                  <td style={TD}>{t(`reentrenamiento.disparador_${p.disparador}`)}</td>
                  <td style={{ ...TD, fontSize: '12px' }}>{t(`reentrenamiento.modo_${p.modo}`)}</td>
                  <td style={TD}><Pill tono={ESTADO_TONO[p.estado]}>{t(`reentrenamiento.estado_${p.estado}`)}</Pill></td>
                  <td style={TD}>
                    {p.versionNueva ? <span style={{ display: 'inline-flex', gap: 'var(--s1)', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{p.versionNueva}{p.estadoRf69 && <EstadoModeloPill estado={p.estadoRf69} />}</span> : '—'}
                  </td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <Button variant="ghost" size="sm" onClick={() => setMonitor(p)}>{t('reentrenamientoview.ver')}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {monitor && <MonitorModal proceso={monitor} onClose={() => setMonitor(null)} />}
      {configOpen && <ConfigModal onClose={() => setConfigOpen(false)} />}
    </div>
  );
}

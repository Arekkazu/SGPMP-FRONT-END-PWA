// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-66: resultados por área y por activo, alertas activas y feed con estado del resultado |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre |
// | 2026-10-29 | Arekkazu | TC-DIS-183 RF-66 a11y 4.1.3: contadores de riesgo y alertas en región viva |
import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { formatearNumero } from '../../shared/i18n/formato';
import { Activity, BellRing, ChevronRight, Clock } from 'lucide-react';
import { SubPestanas } from '../../shared/design-system/SubPestanas';
import { DatosSimuladosBanner } from '../components/DatosSimuladosBanner';
import { InferenciaDetalleModal, ESTADO_INFERENCIA_TONO } from '../components/InferenciaDetalleModal';
import { Pill } from '../components/Pill';
import { nivelRiesgoTono } from '../lib/riesgo';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from '../components/tableStyles';
import { alActivarConTeclado } from '../../shared/lib/teclado';
import { PARADIGMA_POR_TIPO, TIPO_MODELO_LABEL } from '../types';
import { MONITOR_MOTOR, INFERENCIAS, ultimoPorUnidad, type Inferencia } from '../mocks/monitorMock';

type TabId = 'unidades' | 'feed';

const CARD: React.CSSProperties = { background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' };

function Kpi({ valor, etiqueta }: { valor: number | string; etiqueta: string }) {
  return (
    <div style={{ ...CARD, flex: '1 1 130px', minWidth: 130 }}>
      <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{valor}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{etiqueta}</div>
    </div>
  );
}

/** Indicadores cortos de una fila: fallback, contexto incompleto, confianza baja, latencia > 2 s. */
function Indicadores({ i }: { i: Inferencia }) {
  const { t } = useT('prediction');
  const items = [
    i.fallback && t('monitor.ind_fallback'),
    i.contextoIncompleto && t('monitor.ind_parcial'),
    i.confianzaBaja && t('monitor.ind_confianza_baja'),
    (i.latenciaMs ?? 0) > 2000 && t('monitor.ind_latencia'),
  ].filter(Boolean) as string[];
  if (!items.length) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 'var(--s1)' }}>{items.map((x) => <Pill key={x} tono="warning">{x}</Pill>)}</span>;
}

function Resultado({ i }: { i: Inferencia }) {
  const { t } = useT('prediction');
  if (i.estado !== 'EMITIDO') return <Pill tono={ESTADO_INFERENCIA_TONO[i.estado]}>{t(`monitor.estado_${i.estado}`)}</Pill>;
  return <Pill tono={nivelRiesgoTono(i.nivel)}>{t(`monitor.nivel_${i.nivel}`)}</Pill>;
}

export function MonitorInferenciaView() {
  const { t } = useT('prediction');
  const [tab, setTab] = useState<TabId>('unidades');
  const [sel, setSel] = useState<Inferencia | null>(null);

  const actuales = ultimoPorUnidad();
  const contar = (f: (i: Inferencia) => boolean) => actuales.filter(f).length;
  const alertas = INFERENCIAS.filter((i) => i.alerta);
  const m = MONITOR_MOTOR;
  const stats = [
    [t('monitor.paquetes'), formatearNumero(m.paquetesRecibidos)],
    [t('monitor.latencia_p95'), `${m.latenciaP95Ms} ms`],
    [t('monitor.cola_max'), String(m.colaMaxNodo)],
    [t('monitor.sync_hibrida'), `${(m.syncHibridaMs / 1000).toFixed(1)} s`],
  ];
  const cols = [t('monitor.col_id'), t('monitor.activo_area'), t('monitor.tipo_modelo'), t('monitor.nivel'), t('monitor.enfermedad'), t('monitor.col_confianza'), t('monitor.latencia'), t('monitor.col_indicadores'), t('monitor.col_hora'), ''];

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <Activity size={20} aria-hidden />{t('monitorinferenciaview.monitoreo_de_inferencia')}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('monitor.descripcion')}</p>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        <DatosSimuladosBanner detalle="El motor de inferencia es del equipo IoT/IA y aún no expone endpoints; esta vista usa datos de ejemplo" />

        <section style={{ ...CARD, padding: 'var(--s5)', marginBottom: 'var(--s5)' }} aria-labelledby="motor-estado">
          <h2 id="motor-estado" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {t('monitor.motor')} <Pill tono="success">{t('monitor.operando')}</Pill>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--s4)', marginTop: 'var(--s4)' }}>
            {stats.map(([label, valor]) => (
              <div key={label}>
                <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{valor}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        <div aria-live="polite" style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s5)' }}>
          <Kpi valor={contar((i) => i.nivel === 3)} etiqueta={t('monitor.kpi_alto')} />
          <Kpi valor={contar((i) => i.nivel === 2)} etiqueta={t('monitor.kpi_medio')} />
          <Kpi valor={contar((i) => i.nivel === 0 || i.nivel === 1)} etiqueta={t('monitor.kpi_bajo')} />
          <Kpi valor={contar((i) => !!i.contextoIncompleto || !!i.confianzaBaja)} etiqueta={t('monitor.kpi_parciales')} />
          <Kpi valor={alertas.length} etiqueta={t('monitor.kpi_alertas')} />
        </div>

        <section aria-labelledby="monitor-alertas" style={{ marginBottom: 'var(--s5)' }}>
          <h2 id="monitor-alertas" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' }}>
            <BellRing size={16} aria-hidden />{t('monitor.alertas_titulo', { n: alertas.length })}
          </h2>
          {alertas.length === 0 ? <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{t('monitor.sin_alertas')}</p> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
              {alertas.map((i) => (
                <li key={i.alerta} style={{ ...CARD, padding: 'var(--s3) var(--s4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s3)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>{i.alerta}</strong> · {i.unidad} · {i.enfermedad ?? t('monitor.anomalia_area')}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)' }}>
                    <Pill tono={nivelRiesgoTono(i.nivel)}>{t(`monitor.nivel_${i.nivel}`)}</Pill>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{i.hora}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div>
          <SubPestanas<TabId>
            pestanas={[{ id: 'unidades', label: t('monitor.tab_unidades', { n: actuales.length }) }, { id: 'feed', label: t('monitor.tab_feed') }]}
            activa={tab}
            onCambiar={setTab}
            ariaLabel={t('monitorinferenciaview.vista_de_monitoreo')}
          />
        </div>

        {tab === 'unidades' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--s4)' }}>
            {actuales.map((i) => {
              const poblacional = PARADIGMA_POR_TIPO[i.tipoModelo] === 'POBLACIONAL';
              return (
                <article key={i.unidad} role="button" className="ds-fila-accion" tabIndex={0} onClick={() => setSel(i)} onKeyDown={alActivarConTeclado(() => setSel(i))} style={{ ...CARD, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s2)', marginBottom: 'var(--s2)' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{i.unidad}</span>
                    <Resultado i={i} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{i.area}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 'var(--s1)' }}>
                    {TIPO_MODELO_LABEL[i.tipoModelo]} · {t(`contrato.paradigma_${PARADIGMA_POR_TIPO[i.tipoModelo]}`)}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: 'var(--s3)', fontWeight: 600 }}>
                    {i.estado !== 'EMITIDO' ? '—' : poblacional ? t('monitor.score_card', { score: i.score?.toFixed(2), umbral: i.umbralScore?.toFixed(2) }) : i.enfermedad}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--s3)' }}>
                    <span><Clock size={11} aria-hidden style={{ verticalAlign: 'middle' }} /> {i.hora}</span>
                    <span>{t(`motorconfigform.modo_${i.modo}`)}</span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label="Tabla de inferencias recientes">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead><tr style={THEAD_ROW}>{cols.map((h, k) => <th key={k} style={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {INFERENCIAS.map((i) => {
                  const poblacional = PARADIGMA_POR_TIPO[i.tipoModelo] === 'POBLACIONAL';
                  return (
                    <tr key={i.id} className="ds-fila-accion" tabIndex={0} onClick={() => setSel(i)} onKeyDown={alActivarConTeclado(() => setSel(i))}>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>{i.id}</td>
                      <td style={TD}><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{i.unidad}</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{i.area}</div></td>
                      <td style={{ ...TD, fontSize: '12px' }}>{TIPO_MODELO_LABEL[i.tipoModelo]}</td>
                      <td style={TD}><Resultado i={i} /></td>
                      <td style={{ ...TD, fontSize: '12px' }}>{poblacional ? <span style={{ color: 'var(--text-muted)' }}>{t('monitor.no_aplica')}</span> : i.enfermedad ?? '—'}</td>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {poblacional ? (i.score != null ? `score ${i.score.toFixed(2)}` : '—') : i.confianza != null ? `${Math.round(i.confianza * 100)}%` : '—'}
                      </td>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{i.latenciaMs != null ? `${i.latenciaMs} ms` : '—'}</td>
                      <td style={TD}><Indicadores i={i} /></td>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{i.hora}</td>
                      <td style={{ ...TD, textAlign: 'right', color: 'var(--text-muted)' }}><ChevronRight size={16} aria-label={t('monitor.ver_detalle')} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {sel && <InferenciaDetalleModal inf={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

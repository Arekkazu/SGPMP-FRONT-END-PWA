// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-68: estado del motor, alertas, filtros y detalle con factores, reglas e historial |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M4-10 RF-68: pesos del cálculo en palabras y porcentaje |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre |
import React, { useMemo, useState } from 'react';
import { formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { ShieldAlert, BellRing, Info } from 'lucide-react';
import { SubPestanas } from '../../shared/design-system/SubPestanas';
import { DatosSimuladosBanner } from '../components/DatosSimuladosBanner';
import { LineChartPrediccion } from '../components/LineChartPrediccion';
import { ProbBar } from '../components/ProbBar';
import { ModalShell } from '../components/ModalShell';
import { Pill, type Tono } from '../components/Pill';
import { TH, TD, TABLE_WRAP, THEAD_ROW, INPUT, LABEL } from '../components/tableStyles';
import { alActivarConTeclado } from '../../shared/lib/teclado';
import { TIPO_MODELO_LABEL } from '../types';
import { CONTAGIO_MOTOR, LOTES_CONTAGIO, type LoteContagio, type NivelContagio, type ResultadoRegla } from '../mocks/contagioMock';

const NIVEL_TONO: Record<NivelContagio, Tono> = { ALTO: 'error', MEDIO: 'warning', BAJO: 'success' };
const REGLA_TONO: Record<ResultadoRegla, Tono> = { CUMPLE: 'success', NO_CUMPLE: 'error', AJUSTE: 'warning' };
const CARD: React.CSSProperties = { background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' };
const H3: React.CSSProperties = { fontSize: '13px', fontWeight: 700, margin: '0 0 var(--s3)', color: 'var(--text-primary)' };
const ROTULO: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 };
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)' };

type TabDetalle = 'factores' | 'reglas' | 'historial';

function NivelPill({ nivel }: { nivel: NivelContagio | null }) {
  const { t } = useT('prediction');
  return nivel ? <Pill tono={NIVEL_TONO[nivel]}>{t(`contagio.nivel_${nivel}`)}</Pill> : <Pill tono="neutral">{t('contagio.sin_calculo')}</Pill>;
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return <div><div style={ROTULO}>{rotulo}</div><div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{children}</div></div>;
}

function LoteDetalle({ lote, onClose }: { lote: LoteContagio; onClose: () => void }) {
  const { t } = useT('prediction');
  const [tab, setTab] = useState<TabDetalle>('factores');
  const p = lote.pesos;
  const chartData = lote.historial.map((h) => ({ hora: h.hora, prob: Math.round(h.probabilidad * 100) }));

  return (
    <ModalShell title={lote.nombre} onClose={onClose} maxWidth={720}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        <div className="ds-fg3" style={{ gap: 'var(--s4)' }}>
          <Campo rotulo={t('contagio.nivel')}><NivelPill nivel={lote.nivel} /></Campo>
          <Campo rotulo={t('contagio.probabilidad')}><span style={{ ...MONO, fontSize: '20px', fontWeight: 800 }}>{lote.probabilidad != null ? `${Math.round(lote.probabilidad * 100)}%` : '—'}</span></Campo>
          <Campo rotulo={t('contagio.calidad')}><Pill tono={lote.calidad === 'COMPLETA' ? 'success' : 'warning'}>{t(`contagio.calidad_${lote.calidad}`)}</Pill>{lote.confianzaReducida && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('contagio.confianza_reducida')}</div>}</Campo>
          <Campo rotulo={t('contagio.sincronizacion')}><Pill tono={lote.sincronizacion === 'SINCRONIZADA' ? 'success' : lote.sincronizacion === 'JITTER' ? 'warning' : 'error'}>{t(`contagio.sync_${lote.sincronizacion}`)}</Pill></Campo>
          <Campo rotulo={t('contagio.lote_area')}>{lote.area}<div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{TIPO_MODELO_LABEL[lote.tipoModelo]} · id {lote.id}</div></Campo>
          <Campo rotulo={t('contagio.fuente_fs')}>{t(`contagio.fuente_${lote.fuenteFs}`)}</Campo>
          <Campo rotulo={t('contagio.calculo')}>{t(`contagio.ejecucion_${lote.ejecucion}`)}<div style={{ ...MONO, fontSize: '12px', color: 'var(--text-muted)' }}>{CONTAGIO_MOTOR.version} · config v{CONTAGIO_MOTOR.configVersion}</div></Campo>
          <Campo rotulo={t('contagio.alerta')}>{lote.alerta ? <Pill tono="error">{lote.alerta}</Pill> : t('contagio.sin_alerta')}</Campo>
        </div>

        {lote.nota && (
          <div role="note" style={{ display: 'flex', gap: 'var(--s2)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-md)', border: '1px solid var(--sem-info-border)', background: 'var(--sem-info-bg)', fontSize: '13px', color: 'var(--text-primary)' }}>
            <Info size={16} aria-hidden style={{ color: 'var(--sem-info)', flexShrink: 0, marginTop: 1 }} /><span>{lote.nota}</span>
          </div>
        )}

        <section>
          <h3 style={H3}>{t('contagio.calculo_aplicado')}</h3>
          <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', padding: 'var(--s4)', ...MONO, fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            P = {p.fs} · F<sub>s</sub> ({lote.fs}) + {p.fa} · F<sub>a</sub> ({lote.fa}) + {p.fd} · F<sub>d</sub> ({lote.fd})
          </div>
        </section>

        <SubPestanas<TabDetalle>
          pestanas={[{ id: 'factores', label: t('contagio.tab_factores') }, { id: 'reglas', label: t('contagio.tab_reglas') }, { id: 'historial', label: t('contagio.tab_historial') }]}
          activa={tab}
          onCambiar={setTab}
          ariaLabel={t('contagio.tabs_aria')}
        />

        {tab === 'factores' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
            {lote.pesosRecalculados && <p role="note" style={{ margin: 0, fontSize: '13px', color: 'var(--sem-warning)' }}>{t('contagio.pesos_recalculados', { fs: p.fs, fa: p.fa, fd: p.fd })}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
              <ProbBar label={t('contagio.factor_fs')} valor={lote.fs} color="var(--sem-error)" />
              <ProbBar label={t('contagio.factor_fa')} valor={lote.fa} color="var(--sem-warning)" />
              <ProbBar label={t('contagio.factor_fd')} valor={lote.fd} color="var(--sem-info)" />
            </div>
            <div>
              <h3 style={H3}>{t('contagio.salidas_rf66')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)' }}>
                {lote.salidas.map((s) => <li key={s.id}><Pill tono="neutral">{s.id} · {s.valor} · {s.hora}</Pill></li>)}
              </ul>
            </div>
          </div>
        )}

        {tab === 'reglas' && (
          <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label="Tabla de factores del lote">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <caption className="sr-only">{t('contagio.reglas_caption')}</caption>
              <thead><tr style={THEAD_ROW}>{[t('contagio.col_regla'), t('contagio.col_valor'), t('contagio.col_resultado'), t('contagio.col_origen')].map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {lote.reglas.map((r) => (
                  <tr key={r.regla}>
                    <td style={{ ...TD, color: 'var(--text-primary)' }}>{r.regla}</td>
                    <td style={{ ...TD, ...MONO }}>{r.valor}</td>
                    <td style={TD}><Pill tono={REGLA_TONO[r.resultado]}>{t(`contagio.regla_${r.resultado}`)}</Pill></td>
                    <td style={{ ...TD, color: 'var(--text-muted)' }}>{r.origen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'historial' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
            <LineChartPrediccion
              data={chartData}
              xKey="hora"
              series={[{ dataKey: 'prob', name: t('contagio.probabilidad_pct'), color: 'var(--sem-error)' }]}
              yDomain={[0, 100]}
              referencias={[{ y: 65, label: t('contagio.nivel_ALTO'), color: 'var(--sem-error)' }, { y: 40, label: t('contagio.nivel_MEDIO'), color: 'var(--sem-warning)' }]}
              height={200}
            />
            <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label="Historial del lote">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={THEAD_ROW}>
                    {[t('contagio.col_hora'), t('contagio.col_disparador'), t('contagio.col_ejecucion'), t('contagio.col_prob'), t('contagio.nivel'), 'Fs', 'Fa', 'Fd', t('contagio.calidad')].map((h) => <th key={h} style={TH}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {lote.historial.map((h) => (
                    <tr key={`${h.hora}-${h.disparador}`}>
                      <td style={{ ...TD, ...MONO }}>{h.hora}</td>
                      <td style={TD}>{h.disparador}</td>
                      <td style={TD}>{t(`contagio.ejecucion_${h.ejecucion}`)}</td>
                      <td style={{ ...TD, ...MONO }}>{Math.round(h.probabilidad * 100)}%</td>
                      <td style={TD}><NivelPill nivel={h.nivel} /></td>
                      <td style={{ ...TD, ...MONO }}>{h.fs}</td>
                      <td style={{ ...TD, ...MONO }}>{h.fa}</td>
                      <td style={{ ...TD, ...MONO }}>{h.fd}</td>
                      <td style={TD}>{t(`contagio.calidad_${h.calidad}`)}{h.confianzaReducida && ` · ${t('contagio.confianza_reducida')}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

export function RiesgoContagioView() {
  const { t } = useT('prediction');
  const [sel, setSel] = useState<LoteContagio | null>(null);
  const [tipo, setTipo] = useState('');
  const [fuente, setFuente] = useState('');
  const [riesgo, setRiesgo] = useState('');
  const m = CONTAGIO_MOTOR;

  const lotes = useMemo(
    () => LOTES_CONTAGIO.filter((l) => (!tipo || l.tipoModelo === tipo) && (!fuente || l.fuenteFs === fuente) && (!riesgo || l.nivel === riesgo)),
    [tipo, fuente, riesgo],
  );
  const alertas = LOTES_CONTAGIO.filter((l) => l.alerta);
  const tipos = [...new Set(LOTES_CONTAGIO.map((l) => l.tipoModelo))];

  const motor = [
    [t('contagio.eventos'), m.eventosProcesados],
    [t('contagio.degradados'), m.lotesDegradados],
    [t('contagio.sin_calculo_vigente'), m.sinCalculo],
    [t('contagio.alertas_activas'), alertas.length],
  ];
  const kpis = [
    [t('contagio.kpi_lotes'), LOTES_CONTAGIO.length],
    [t('contagio.kpi_alto'), LOTES_CONTAGIO.filter((l) => l.nivel === 'ALTO').length],
    [t('contagio.kpi_reducida'), LOTES_CONTAGIO.filter((l) => l.confianzaReducida).length],
    [t('contagio.kpi_alertas'), alertas.length],
  ];

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <ShieldAlert size={20} aria-hidden />{t('riesgocontagioview.riesgo_de_contagio')}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('riesgocontagioview.estimacion_de_propagacion_sanitaria_por')}</p>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        <DatosSimuladosBanner detalle="El modelo de contagio es del equipo IoT/IA y aún no expone endpoints; esta vista usa datos de ejemplo" />

        <section aria-labelledby="ctg-motor" style={{ ...CARD, padding: 'var(--s5)', marginBottom: 'var(--s5)' }}>
          <h2 id="ctg-motor" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {t('contagio.motor')} <Pill tono="success">{t('contagio.operando')}</Pill>
            {/* M4-10: los pesos en palabras y en porcentaje, no "W fs 0.5". */}
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }} title={t('contagio.pesos_ayuda')}>
              {t('contagio.pesos', {
                fs: formatearNumero(m.w_fs, { style: 'percent' }),
                fa: formatearNumero(m.w_fa, { style: 'percent' }),
                fd: formatearNumero(m.w_fd, { style: 'percent' }),
              })}
            </span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--s4)', marginTop: 'var(--s4)' }}>
            {motor.map(([label, valor]) => (
              <div key={label}>
                <div style={{ fontSize: '20px', fontWeight: 800, ...MONO, color: 'var(--text-primary)' }}>{valor}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s5)' }}>
          {kpis.map(([label, valor]) => (
            <div key={label} style={{ ...CARD, flex: '1 1 140px', minWidth: 140 }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{valor}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{label}</div>
            </div>
          ))}
        </div>

        <section aria-labelledby="ctg-alertas" style={{ marginBottom: 'var(--s5)' }}>
          <h2 id="ctg-alertas" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' }}>
            <BellRing size={16} aria-hidden />{t('contagio.alertas_titulo', { n: alertas.length })}
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
            {alertas.map((l) => (
              <li key={l.alerta} style={{ ...CARD, padding: 'var(--s3) var(--s4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s3)', flexWrap: 'wrap', fontSize: '13px' }}>
                <span><strong style={MONO}>{l.alerta}</strong> · {l.nombre} · {l.area}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)' }}><NivelPill nivel={l.nivel} /><span style={MONO}>{l.probabilidad != null ? `${Math.round(l.probabilidad * 100)}%` : '—'}</span></span>
              </li>
            ))}
          </ul>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--s4)', marginBottom: 'var(--s4)' }}>
          <div>
            <label style={LABEL} htmlFor="ctg-tipo">{t('contagio.filtro_tipo')}</label>
            <select id="ctg-tipo" style={INPUT} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">{t('contagio.todos')}</option>
              {tipos.map((tm) => <option key={tm} value={tm}>{TIPO_MODELO_LABEL[tm]}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL} htmlFor="ctg-fuente">{t('contagio.fuente_fs')}</label>
            <select id="ctg-fuente" style={INPUT} value={fuente} onChange={(e) => setFuente(e.target.value)}>
              <option value="">{t('contagio.todas')}</option>
              <option value="CONTEO_INDIVIDUAL">{t('contagio.fuente_CONTEO_INDIVIDUAL')}</option>
              <option value="SCORE_POBLACIONAL">{t('contagio.fuente_SCORE_POBLACIONAL')}</option>
            </select>
          </div>
          <div>
            <label style={LABEL} htmlFor="ctg-riesgo">{t('contagio.nivel')}</label>
            <select id="ctg-riesgo" style={INPUT} value={riesgo} onChange={(e) => setRiesgo(e.target.value)}>
              <option value="">{t('contagio.todos')}</option>
              <option value="ALTO">{t('contagio.nivel_ALTO')}</option>
              <option value="MEDIO">{t('contagio.nivel_MEDIO')}</option>
              <option value="BAJO">{t('contagio.nivel_BAJO')}</option>
            </select>
          </div>
        </div>

        {lotes.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s7)', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)', fontSize: '14px' }}>{t('contagio.sin_resultados')}</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--s4)' }}>
            {lotes.map((l) => (
              <article key={l.id} role="button" className="ds-fila-accion" tabIndex={0} onClick={() => setSel(l)} onKeyDown={alActivarConTeclado(() => setSel(l))} style={{ ...CARD, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s2)', marginBottom: 'var(--s2)' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{l.nombre}</span>
                  <NivelPill nivel={l.nivel} />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{l.area} · {TIPO_MODELO_LABEL[l.tipoModelo]}</div>
                <div style={{ fontSize: '28px', fontWeight: 800, ...MONO, color: 'var(--text-primary)', margin: 'var(--s3) 0 var(--s2)' }}>
                  {l.probabilidad != null ? `${Math.round(l.probabilidad * 100)}%` : '—'}
                </div>
                {l.probabilidad != null && <ProbBar label={t('contagio.probabilidad')} valor={l.probabilidad} color={l.nivel ? `var(--sem-${NIVEL_TONO[l.nivel]})` : undefined} />}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s1)', marginTop: 'var(--s3)' }}>
                  <Pill tono="neutral">{t(`contagio.fuente_${l.fuenteFs}`)}</Pill>
                  {l.confianzaReducida && <Pill tono="warning">{t('contagio.confianza_reducida')}</Pill>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {sel && <LoteDetalle lote={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

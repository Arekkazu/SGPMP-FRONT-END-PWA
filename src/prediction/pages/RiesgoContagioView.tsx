import React, { useState } from 'react';
import { ShieldAlert, Activity, AlertTriangle, Database } from 'lucide-react';
import { DatosSimuladosBanner } from '../components/DatosSimuladosBanner';
import { LineChartPrediccion } from '../components/LineChartPrediccion';
import { ProbBar } from '../components/ProbBar';
import { ModalShell } from '../components/ModalShell';
import { Pill, type Tono } from '../components/Pill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from '../components/tableStyles';
import { CONTAGIO_MOTOR, LOTES_CONTAGIO, type LoteContagio } from '../mocks/contagioMock';

const NIVEL_TONO: Record<string, Tono> = { ALTO: 'error', MEDIO: 'warning', BAJO: 'success' };

function LoteDetalle({ lote, onClose }: { lote: LoteContagio; onClose: () => void }) {
  const m = CONTAGIO_MOTOR;
  const chartData = lote.historial.map((h) => ({ hora: h.hora, prob: Number((h.probabilidad * 100).toFixed(0)) }));
  return (
    <ModalShell title={`${lote.identificador} · ${lote.especie}`} onClose={onClose} maxWidth={720} footer={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s4)', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '40px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: `var(--sem-${NIVEL_TONO[lote.nivel]})` }}>
            {(lote.probabilidad * 100).toFixed(0)}%
          </div>
          <div>
            <Pill tono={NIVEL_TONO[lote.nivel]}>{lote.nivel}</Pill>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>Confianza {(lote.confianza * 100).toFixed(0)}% · Calidad {lote.calidad}</div>
          </div>
        </div>

        {lote.pesos_recalculados && (
          <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center', padding: 'var(--s3)', background: 'var(--sem-warning-bg)', border: '1px solid var(--sem-warning-border)', borderRadius: 'var(--r-md)', color: 'var(--sem-warning)', fontSize: '13px' }}>
            <AlertTriangle size={16} aria-hidden /> Pesos recalculados por datos faltantes.
          </div>
        )}

        {/* Fórmula ponderada */}
        <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', padding: 'var(--s4)', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
          P = {m.w_fs} · F<sub>s</sub> + {m.w_fa} · F<sub>a</sub> + {m.w_fd} · F<sub>d</sub>
        </div>

        {/* Factores del cálculo */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 var(--s3)', color: 'var(--text-primary)' }}>Factores del cálculo</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
            <ProbBar label="Factor sanitario (Fs)" valor={lote.factor_sanitario} color="var(--sem-error)" />
            <ProbBar label="Factor ambiental (Fa)" valor={lote.factor_ambiental} color="var(--sem-warning)" />
            <ProbBar label="Factor densidad (Fd)" valor={lote.factor_densidad} color="var(--sem-info)" />
          </div>
        </div>

        {/* Tendencia */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 var(--s3)', color: 'var(--text-primary)' }}>Tendencia de contagio</h3>
          <LineChartPrediccion
            data={chartData}
            xKey="hora"
            series={[{ dataKey: 'prob', name: 'Probabilidad (%)', color: 'var(--sem-error)' }]}
            yDomain={[0, 100]}
            referencias={[{ y: 70, label: 'Alto', color: 'var(--sem-error)' }, { y: 40, label: 'Medio', color: 'var(--sem-warning)' }]}
            height={220}
          />
        </div>

        {/* Historial del lote */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 var(--s3)', color: 'var(--text-primary)' }}>Historial del lote</h3>
          <div style={TABLE_WRAP}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={THEAD_ROW}>
                  <th style={TH}>Hora</th><th style={{ ...TH, textAlign: 'right' }}>Prob.</th><th style={TH}>Nivel</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Fs</th><th style={{ ...TH, textAlign: 'right' }}>Fa</th><th style={{ ...TH, textAlign: 'right' }}>Fd</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Confianza</th>
                </tr>
              </thead>
              <tbody>
                {lote.historial.map((h) => (
                  <tr key={h.hora}>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)' }}>{h.hora}</td>
                    <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{(h.probabilidad * 100).toFixed(0)}%</td>
                    <td style={TD}><Pill tono={NIVEL_TONO[h.nivel]}>{h.nivel}</Pill></td>
                    <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{h.fs}</td>
                    <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{h.fa}</td>
                    <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{h.fd}</td>
                    <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{(h.confianza * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export function RiesgoContagioView() {
  const [sel, setSel] = useState<LoteContagio | null>(null);
  const m = CONTAGIO_MOTOR;

  const kpis = [
    { etiqueta: 'Ciclos hoy', valor: m.ciclos_hoy, color: 'var(--brand-500)', icon: <Activity size={18} aria-hidden /> },
    { etiqueta: 'Lotes degradados', valor: m.lotes_degradados, color: 'var(--sem-warning)', icon: <AlertTriangle size={18} aria-hidden /> },
    { etiqueta: 'Sin datos', valor: m.sin_datos, color: 'var(--text-muted)', icon: <Database size={18} aria-hidden /> },
    { etiqueta: 'Alertas de contagio', valor: m.alertas, color: 'var(--sem-error)', icon: <ShieldAlert size={18} aria-hidden /> },
  ];

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <ShieldAlert size={20} aria-hidden />
          Riesgo de Contagio
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
          Estimación de propagación sanitaria por lote en tiempo real
        </p>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        <DatosSimuladosBanner detalle="El modelo de contagio es del equipo IoT/IA y aún no expone endpoints; esta vista usa datos de ejemplo" />

        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', marginBottom: 'var(--s6)', display: 'flex', gap: 'var(--s4)', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Pesos del cálculo:</span>
          <Pill tono="error">W<sub>fs</sub> {m.w_fs}</Pill>
          <Pill tono="warning">W<sub>fa</sub> {m.w_fa}</Pill>
          <Pill tono="info">W<sub>fd</sub> {m.w_fd}</Pill>
        </div>

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          {kpis.map((k) => (
            <div key={k.etiqueta} style={{ flex: '1 1 140px', minWidth: 140, background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', color: k.color }}>{k.icon}<span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{k.valor}</span></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{k.etiqueta}</div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>Lotes monitoreados</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--s4)' }}>
          {LOTES_CONTAGIO.map((l) => (
            <button key={l.id} onClick={() => setSel(l)} style={{ textAlign: 'left', background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s2)' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{l.identificador}</span>
                <Pill tono={NIVEL_TONO[l.nivel]}>{l.nivel}</Pill>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 'var(--s3)' }}>{l.especie} · {l.finca}</div>
              <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: `var(--sem-${NIVEL_TONO[l.nivel]})`, marginBottom: 'var(--s2)' }}>
                {(l.probabilidad * 100).toFixed(0)}%
              </div>
              <ProbBar label="Contagio" valor={l.probabilidad} color={`var(--sem-${NIVEL_TONO[l.nivel]})`} />
            </button>
          ))}
        </div>
      </div>

      {sel && <LoteDetalle lote={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

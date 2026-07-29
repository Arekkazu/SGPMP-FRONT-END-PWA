import React, { useState } from 'react';
import { Activity, Cpu, Gauge as GaugeIcon, Clock, Layers } from 'lucide-react';
import { Gauge } from '../../shared/design-system/Gauge';
import { DatosSimuladosBanner } from '../components/DatosSimuladosBanner';
import { ProbBar } from '../components/ProbBar';
import { ModalShell } from '../components/ModalShell';
import { Pill } from '../components/Pill';
import { NIVEL_RIESGO_LABEL, nivelRiesgoTono } from '../lib/riesgo';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from '../components/tableStyles';
import { MONITOR_MOTOR, MONITOR_KPIS, ACTIVOS_MONITOREADOS, type ActivoMonitoreado } from '../mocks/monitorMock';

type TabId = 'activos' | 'feed';

function EstadoMotor() {
  const m = MONITOR_MOTOR;
  const stats = [
    { label: 'Paquetes hoy', valor: m.paquetes_hoy.toLocaleString('es-CO') },
    { label: 'Latencia P95', valor: `${m.latencia_p95_ms} ms` },
    { label: 'Cola', valor: String(m.cola) },
    { label: 'Uptime', valor: m.uptime },
  ];
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s5)', marginBottom: 'var(--s6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--sem-success)', boxShadow: '0 0 0 4px var(--sem-success-bg)' }} aria-hidden />
          Motor activo
        </span>
        <Pill tono="info" icon={<Cpu size={12} aria-hidden />}>{MONITOR_MOTOR.version}</Pill>
        <Pill tono="neutral">{MONITOR_MOTOR.modo}</Pill>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--s4)', marginTop: 'var(--s4)' }}>
        {stats.map((s) => (
          <div key={s.label}>
            <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{s.valor}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivoDetalle({ activo, onClose }: { activo: ActivoMonitoreado; onClose: () => void }) {
  return (
    <ModalShell title={`${activo.identificador} · ${activo.especie}`} onClose={onClose} maxWidth={640} footer={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        <div style={{ display: 'flex', gap: 'var(--s5)', alignItems: 'center', flexWrap: 'wrap' }}>
          <Gauge value={activo.confianza * 100} unit="%" status={activo.nivel_riesgo >= 3 ? 'critical' : activo.nivel_riesgo === 2 ? 'warning' : 'ok'} label="Confianza" size={120} />
          <div>
            <div style={{ marginBottom: 'var(--s2)' }}><Pill tono={nivelRiesgoTono(activo.nivel_riesgo)}>{NIVEL_RIESGO_LABEL[activo.nivel_riesgo]}</Pill></div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{activo.enfermedad_estimada}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{activo.finca} · {activo.hora} · {activo.latencia_ms} ms</div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 var(--s3)', color: 'var(--text-primary)' }}>Distribución de probabilidades — Niveles de riesgo</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
            {activo.dist_riesgo.map((d) => <ProbBar key={d.nivel} label={d.nivel} valor={d.prob} color={d.nivel === 'Alto' ? 'var(--sem-error)' : d.nivel === 'Moderado' ? 'var(--sem-warning)' : 'var(--brand-500)'} />)}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 var(--s3)', color: 'var(--text-primary)' }}>Patologías detectadas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
            {activo.dist_patologias.map((d) => <ProbBar key={d.nombre} label={d.nombre} valor={d.prob} />)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s4)' }}>
          <div><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Variables recibidas</span><div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{activo.variables_recibidas}/{activo.variables_esperadas}</div></div>
          {activo.variables_faltantes.length > 0 && (
            <div><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Faltantes</span><div style={{ fontSize: '13px', color: 'var(--sem-warning)' }}>{activo.variables_faltantes.join(', ')}</div></div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

export function MonitorInferenciaView() {
  const [tab, setTab] = useState<TabId>('activos');
  const [sel, setSel] = useState<ActivoMonitoreado | null>(null);

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <Activity size={20} aria-hidden />
          Monitoreo de Inferencia
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
          Estado del motor de predicción sanitaria por lote y especie
        </p>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        <DatosSimuladosBanner detalle="El motor de inferencia es del equipo IoT/IA y aún no expone endpoints; esta vista usa datos de ejemplo" />

        <EstadoMotor />

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          {MONITOR_KPIS.map((k) => (
            <div key={k.etiqueta} style={{ flex: '1 1 130px', minWidth: 130, background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{k.valor}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{k.etiqueta}</div>
            </div>
          ))}
        </div>

        <div role="tablist" aria-label="Vista de monitoreo" style={{ display: 'flex', gap: 'var(--s2)', borderBottom: '1px solid var(--surface-border)', marginBottom: 'var(--s5)' }}>
          {([['activos', 'Activos monitoreados', <GaugeIcon size={15} aria-hidden key="a" />], ['feed', 'Feed de inferencias', <Layers size={15} aria-hidden key="f" />]] as const).map(([id, label, icon]) => {
            const activo = id === tab;
            return (
              <button key={id} role="tab" aria-selected={activo} onClick={() => setTab(id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)', padding: 'var(--s3) var(--s4)', border: 'none', borderBottom: `2px solid ${activo ? 'var(--brand-500)' : 'transparent'}`, background: 'transparent', color: activo ? 'var(--brand-600)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: activo ? 700 : 600, cursor: 'pointer' }}>
                {icon}{label}
              </button>
            );
          })}
        </div>

        {tab === 'activos' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--s4)' }}>
            {ACTIVOS_MONITOREADOS.map((a) => (
              <button key={a.id} onClick={() => setSel(a)} style={{ textAlign: 'left', background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s2)' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{a.identificador}</span>
                  <Pill tono={nivelRiesgoTono(a.nivel_riesgo)}>{NIVEL_RIESGO_LABEL[a.nivel_riesgo]}</Pill>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 'var(--s3)' }}>{a.especie} · {a.finca}</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Gauge value={a.confianza * 100} unit="%" status={a.nivel_riesgo >= 3 ? 'critical' : a.nivel_riesgo === 2 ? 'warning' : 'ok'} label={a.enfermedad_estimada} size={110} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--s3)' }}>
                  <span><Clock size={11} aria-hidden style={{ verticalAlign: 'middle' }} /> {a.hora}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{a.latencia_ms} ms</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div style={TABLE_WRAP}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={THEAD_ROW}>
                  <th style={TH}>Activo / Finca</th>
                  <th style={TH}>Especie</th>
                  <th style={TH}>Nivel</th>
                  <th style={TH}>Enfermedad estimada</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Confianza</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Latencia</th>
                  <th style={TH}>Hora</th>
                </tr>
              </thead>
              <tbody>
                {ACTIVOS_MONITOREADOS.map((a) => (
                  <tr key={a.id} onClick={() => setSel(a)} style={{ cursor: 'pointer' }}>
                    <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)' }}>{a.identificador} · {a.finca}</td>
                    <td style={TD}>{a.especie}</td>
                    <td style={TD}><Pill tono={nivelRiesgoTono(a.nivel_riesgo)}>{NIVEL_RIESGO_LABEL[a.nivel_riesgo]}</Pill></td>
                    <td style={TD}>{a.enfermedad_estimada}</td>
                    <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{(a.confianza * 100).toFixed(0)}%</td>
                    <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{a.latencia_ms} ms</td>
                    <td style={TD}>{a.hora}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {sel && <ActivoDetalle activo={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

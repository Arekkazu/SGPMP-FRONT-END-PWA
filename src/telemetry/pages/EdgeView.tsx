import React from 'react';
import { Cpu, Sliders, AlertTriangle, Database, CheckCircle2 } from 'lucide-react';
import { DatosSimuladosBanner } from '../components/DatosSimuladosBanner';
import { KpiCard } from '../components/KpiCard';
import { Gauge } from '../../shared/design-system/Gauge';
import { Pill, type Tono } from '../components/Pill';
import { SeveridadBadge } from '../components/SeveridadBadge';
import { OrigenPill } from '../components/OrigenPill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from '../components/tableStyles';
import { EDGE_KPIS, EDGE_GAUGES, EDGE_EVENTOS } from '../mocks/edgeMock';

const COLS = ['Dispositivo', 'Variable(s)', 'Valor', 'Clasificación', 'Regla aplicada', 'Severidad', 'Origen', 'Capturado', 'Procesado'];

const CLASIF_TONO: Record<string, Tono> = {
  NORMAL: 'success', SIMPLE: 'warning', COMPUESTA: 'error', ERROR_CONFIGURACION: 'neutral',
};

export function EdgeView() {
  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <Cpu size={20} aria-hidden />
          Detección de Desviaciones en Campo
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>RF-55 · Procesamiento Edge</p>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        <DatosSimuladosBanner />

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          <KpiCard icon={<Sliders size={18} aria-hidden />} valor={EDGE_KPIS.variables} etiqueta="Variables configuradas" sub="con umbrales activos" />
          <KpiCard icon={<AlertTriangle size={18} aria-hidden />} valor={EDGE_KPIS.desviacionesHoy} etiqueta="Desviaciones hoy" sub="simples + compuestas" color="var(--sem-warning)" />
          <KpiCard icon={<Database size={18} aria-hidden />} valor={EDGE_KPIS.enBuffer} etiqueta="Eventos en buffer" color="var(--sem-info)" />
          <KpiCard icon={<CheckCircle2 size={18} aria-hidden />} valor={EDGE_KPIS.normales} etiqueta="Lecturas normales" color="var(--sem-success)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--s4)', marginBottom: 'var(--s6)' }}>
          {EDGE_GAUGES.map((g) => (
            <div key={g.label} style={{ display: 'flex', justifyContent: 'center', background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
              <Gauge value={g.valor} min={g.min} max={g.max} unit={g.unidad} status={g.estado} label={g.label} size={128} />
            </div>
          ))}
        </div>

        <div style={TABLE_WRAP}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={THEAD_ROW}>{COLS.map((h, i) => <th key={i} style={TH}>{h}</th>)}</tr></thead>
            <tbody>
              {EDGE_EVENTOS.map((e) => (
                <tr key={e.id} style={{ background: 'var(--surface-card)' }}>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>{e.dispositivo}</td>
                  <td style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px' }}>{e.variables}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{e.valor}</td>
                  <td style={TD}><Pill tono={CLASIF_TONO[e.clasificacion] ?? 'neutral'}>{e.clasificacion.replace(/_/g, ' ')}</Pill></td>
                  <td style={{ ...TD, fontSize: '12px', color: 'var(--text-muted)' }}>{e.regla}</td>
                  <td style={TD}><SeveridadBadge severidad={e.severidad} /></td>
                  <td style={TD}><OrigenPill origen={e.origen} /></td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{e.capturado}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{e.procesado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

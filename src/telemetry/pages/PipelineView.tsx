import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Workflow, Send, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { DatosSimuladosBanner } from '../components/DatosSimuladosBanner';
import { KpiCard } from '../components/KpiCard';
import { Pill, type Tono } from '../components/Pill';
import { SeveridadBadge } from '../components/SeveridadBadge';
import { OrigenPill } from '../components/OrigenPill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from '../components/tableStyles';
import { PIPELINE_KPIS, PIPELINE_PAQUETES } from '../mocks/pipelineMock';

const COLS = ['Paquete', 'Dispositivo', 'Contexto', 'Vars', 'Registros', 'Severidad', 'Origen', 'Estado', 'Reintentos', 'Enviado'];

function estadoTono(e: string): Tono {
  if (e === 'ENVIADO') return 'success';
  if (e === 'PENDIENTE') return 'warning';
  return 'error';
}

export function PipelineView() {
  const { t } = useT('telemetry');
  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <Workflow size={20} aria-hidden />{t('pipelineview.pipeline_de_inferencia')}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('pipelineview.rf_56_consolidacion_y_envio_al_motor')}</p>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        <DatosSimuladosBanner />

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          <KpiCard icon={<Send size={18} aria-hidden />} valor={PIPELINE_KPIS.enviados} etiqueta="Enviados hoy" sub="confirmados por el motor" color="var(--sem-success)" />
          <KpiCard icon={<Clock size={18} aria-hidden />} valor={PIPELINE_KPIS.pendientes} etiqueta="Pendientes" color="var(--sem-warning)" />
          <KpiCard icon={<XCircle size={18} aria-hidden />} valor={PIPELINE_KPIS.fallidos} etiqueta="Fallidos" sub="requieren revisión" color="var(--sem-error)" />
          <KpiCard icon={<AlertTriangle size={18} aria-hidden />} valor={PIPELINE_KPIS.contextoIncompleto} etiqueta="Contexto incompleto" sub="enviados con baja prioridad" color="var(--sem-info)" />
        </div>

        <div style={TABLE_WRAP}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={THEAD_ROW}>{COLS.map((h, i) => <th key={i} style={TH}>{h}</th>)}</tr></thead>
            <tbody>
              {PIPELINE_PAQUETES.map((p) => (
                <tr key={p.id} style={{ background: 'var(--surface-card)' }}>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>{p.id}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>{p.dispositivo}</td>
                  <td style={{ ...TD, fontSize: '12px', color: 'var(--text-secondary)' }}>{p.contexto}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', textAlign: 'center', color: 'var(--text-muted)' }}>{p.variables}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', textAlign: 'center', color: 'var(--text-muted)' }}>{p.registros}</td>
                  <td style={TD}><SeveridadBadge severidad={p.severidad} /></td>
                  <td style={TD}><OrigenPill origen={p.origen} /></td>
                  <td style={TD}><Pill tono={estadoTono(p.estado)}>{p.estado}</Pill></td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', textAlign: 'center', color: 'var(--text-muted)' }}>{p.reintentos}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{p.enviado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

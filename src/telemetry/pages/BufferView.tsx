import React from 'react';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { Layers, Cpu, Database, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { DatosSimuladosBanner } from '../components/DatosSimuladosBanner';
import { KpiCard } from '../components/KpiCard';
import { Pill, type Tono } from '../components/Pill';
import { SeveridadBadge } from '../components/SeveridadBadge';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from '../components/tableStyles';
import { BUFFER_KPIS, BUFFER_DISPOSITIVOS, BUFFER_REGISTROS } from '../mocks/bufferMock';

const COLS = ['#Seq', 'Variable', 'Valor', 'Tipo', 'Severidad', 'Capturado', 'Origen', 'Estado', 'Reintentos'];

function estadoTono(e: string): Tono {
  if (e === 'SINCRONIZADO') return 'success';
  if (e === 'REINTENTO') return 'warning';
  return 'neutral';
}

export function BufferView() {
  const { t } = useT('telemetry');
  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <Layers size={20} aria-hidden />{t('bufferview.buffer_y_sincronizacion')}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('bufferview.rf_54_flujo_c')}</p>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        <DatosSimuladosBanner />

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          <KpiCard icon={<Cpu size={18} aria-hidden />} valor={BUFFER_KPIS.activos} etiqueta="Dispositivos activos" />
          <KpiCard icon={<Database size={18} aria-hidden />} valor={BUFFER_KPIS.enBuffer} etiqueta="En modo buffer" sub="sin conexión al backend" color="var(--sem-info)" />
          <KpiCard icon={<Layers size={18} aria-hidden />} valor={BUFFER_KPIS.pendientes} etiqueta="Datos pendientes" color="var(--sem-warning)" />
          <KpiCard icon={<RefreshCw size={18} aria-hidden />} valor={formatearFechaHora(BUFFER_KPIS.sincronizadosHoy)} etiqueta="Sincronizados hoy" color="var(--sem-success)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--s4)', marginBottom: 'var(--s6)' }}>
          {BUFFER_DISPOSITIVOS.map((d) => (
            <div key={d.id} style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s2)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{d.id}</span>
                {d.conexion === 'ONLINE'
                  ? <Pill tono="success" icon={<Wifi size={11} aria-hidden />}>{t('bufferview.online')}</Pill>
                  : <Pill tono="info" icon={<WifiOff size={11} aria-hidden />}>{t('bufferview.buffer')}</Pill>}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Política: {d.politica}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pendientes: <strong>{d.pendientes}</strong></div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Último dato: {d.ultimoDato}</div>
            </div>
          ))}
        </div>

        <div style={TABLE_WRAP}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={THEAD_ROW}>{COLS.map((h, i) => <th key={i} style={TH}>{h}</th>)}</tr></thead>
            <tbody>
              {BUFFER_REGISTROS.map((r) => (
                <tr key={r.seq} style={{ background: 'var(--surface-card)' }}>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>#{r.seq}</td>
                  <td style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px' }}>{r.variable}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{r.valor}</td>
                  <td style={{ ...TD, fontSize: '12px', color: 'var(--text-muted)' }}>{r.tipo}</td>
                  <td style={TD}>{r.severidad === '—' ? <span style={{ color: 'var(--text-muted)' }}>—</span> : <SeveridadBadge severidad={r.severidad} />}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{r.capturado}</td>
                  <td style={{ ...TD, fontSize: '11px', color: 'var(--text-muted)' }}>{r.origen}</td>
                  <td style={TD}><Pill tono={estadoTono(r.estado)}>{r.estado.replace(/_/g, ' ')}</Pill></td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', textAlign: 'center', color: 'var(--text-muted)' }}>{r.reintentos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

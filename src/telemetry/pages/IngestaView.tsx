import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { DownloadCloud, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { DatosSimuladosBanner } from '../components/DatosSimuladosBanner';
import { KpiCard } from '../components/KpiCard';
import { Pill, type Tono } from '../components/Pill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from '../components/tableStyles';
import { INGESTA_KPIS, INGESTA_LECTURAS } from '../mocks/ingestaMock';

const COLS = ['Sensor', 'Variable', 'Valor', 'Origen', 'Calidad', 'Latencia', 'Capturado'];

function calidadTono(c: string): Tono {
  if (c === 'VALIDA') return 'success';
  if (c === 'FUERA_DE_RANGO') return 'warning';
  return 'error';
}

export function IngestaView() {
  const { t } = useT('telemetry');
  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <DownloadCloud size={20} aria-hidden />{t('ingestaview.monitor_de_ingesta_de_telemetria')}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('ingestaview.rf_53_flujo_a_b')}</p>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        <DatosSimuladosBanner />

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          <KpiCard icon={<DownloadCloud size={18} aria-hidden />} valor={INGESTA_KPIS.hoy} etiqueta="Lecturas hoy" color="var(--brand-500)" />
          <KpiCard icon={<CheckCircle2 size={18} aria-hidden />} valor={INGESTA_KPIS.validas} etiqueta="Válidas" sub="80.2%" color="var(--sem-success)" />
          <KpiCard icon={<AlertTriangle size={18} aria-hidden />} valor={INGESTA_KPIS.fueraRango} etiqueta="Fuera de rango" sub="12.6%" color="var(--sem-warning)" />
          <KpiCard icon={<XCircle size={18} aria-hidden />} valor={INGESTA_KPIS.errores} etiqueta="Con errores" sub="autenticación, estructura, duplicados" color="var(--sem-error)" />
        </div>

        <div style={TABLE_WRAP}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={THEAD_ROW}>{COLS.map((h, i) => <th key={i} style={TH}>{h}</th>)}</tr></thead>
            <tbody>
              {INGESTA_LECTURAS.map((l) => (
                <tr key={l.id} style={{ background: 'var(--surface-card)' }}>
                  <td style={{ ...TD, color: 'var(--text-primary)', fontSize: '12px' }}>{l.sensor}</td>
                  <td style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px' }}>{l.variable}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{l.valor}</td>
                  <td style={{ ...TD, fontSize: '11px', color: 'var(--text-muted)' }}>{l.origen}</td>
                  <td style={TD}><Pill tono={calidadTono(l.calidad)}>{l.calidad.replace(/_/g, ' ')}</Pill></td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{l.latenciaMs} ms</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{l.capturado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

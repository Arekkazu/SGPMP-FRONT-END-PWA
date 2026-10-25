// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-56: reglas de envío, filtros, tipo de dato, estado_calidad y detalle del paquete |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre |
import React, { useMemo, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Workflow, Send, Clock, XCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { DatosSimuladosBanner } from '../components/DatosSimuladosBanner';
import { KpiCard } from '../components/KpiCard';
import { Pill, type Tono } from '../components/Pill';
import { SeveridadBadge } from '../components/SeveridadBadge';
import { TipoDatoPill } from '../components/TipoDatoPill';
import { OrigenDatoPill } from '../components/OrigenDatoPill';
import { PaqueteDetalleModal } from '../components/PaqueteDetalleModal';
import { TH, TD, TABLE_WRAP, THEAD_ROW, INPUT, LABEL, FILTER_GRID } from '../components/tableStyles';
import { alActivarConTeclado } from '../../shared/lib/teclado';
import { PIPELINE_KPIS, PIPELINE_PAQUETES, MAX_REGISTROS, MAX_REINTENTOS, type PaqueteMock } from '../mocks/pipelineMock';

const ESTADO_TONO: Record<PaqueteMock['estado'], Tono> = { ENVIADO: 'success', PENDIENTE: 'warning', FALLIDO: 'error' };
const CTX_CLAVE: Record<PaqueteMock['contexto'], string> = { Ambiental: 'ambiental', 'Biométrico': 'biometrico', 'Hídrico': 'hidrico', 'Visión': 'vision' };
const REGLAS = ['regla_estado_calidad', 'regla_max_registros', 'regla_coherencia', 'regla_desfase', 'regla_tipos', 'regla_buffer', 'regla_tls'];

export function PipelineView() {
  const { t } = useT('telemetry');
  const [estado, setEstado] = useState('');
  const [contexto, setContexto] = useState('');
  const [abierto, setAbierto] = useState<PaqueteMock | null>(null);

  const paquetes = useMemo(
    () => PIPELINE_PAQUETES.filter((p) => (!estado || p.estado === estado) && (!contexto || p.contexto === contexto)),
    [estado, contexto],
  );
  const cols = [t('pipeline.col_paquete'), t('pipeline.col_dispositivo'), t('pipeline.col_tipo'), t('pipeline.col_contexto'), t('pipeline.col_variables'), t('pipeline.col_registros'), 'estado_calidad', t('pipeline.col_severidad'), t('pipeline.col_origen'), t('pipeline.col_estado'), t('pipeline.col_reintentos'), t('pipeline.col_enviado'), ''];

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <Workflow size={20} aria-hidden />{t('pipelineview.pipeline_de_inferencia')}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('pipelineview.descripcion')}</p>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        <DatosSimuladosBanner />

        <section aria-labelledby="pipe-reglas" style={{ marginBottom: 'var(--s5)' }}>
          <h2 id="pipe-reglas" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 var(--s2)' }}>{t('pipeline.reglas_titulo')}</h2>
          <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)', listStyle: 'none', padding: 0, margin: 0 }}>
            {REGLAS.map((r) => <li key={r}><Pill tono="neutral">{t(`pipeline.${r}`)}</Pill></li>)}
          </ul>
        </section>

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          <KpiCard icon={<Send size={18} aria-hidden />} valor={PIPELINE_KPIS.enviados} etiqueta={t('pipeline.kpi_enviados')} sub={t('pipeline.kpi_enviados_sub')} color="var(--sem-success)" />
          <KpiCard icon={<Clock size={18} aria-hidden />} valor={PIPELINE_KPIS.pendientes} etiqueta={t('pipeline.kpi_pendientes')} sub={t('pipeline.kpi_pendientes_sub')} color="var(--sem-warning)" />
          <KpiCard icon={<XCircle size={18} aria-hidden />} valor={PIPELINE_KPIS.fallidos} etiqueta={t('pipeline.kpi_fallidos')} sub={t('pipeline.kpi_fallidos_sub')} color="var(--sem-error)" />
          <KpiCard icon={<AlertTriangle size={18} aria-hidden />} valor={PIPELINE_KPIS.contextoIncompleto} etiqueta={t('pipeline.kpi_incompleto')} sub={t('pipeline.kpi_incompleto_sub')} color="var(--sem-info)" />
        </div>

        <div style={FILTER_GRID}>
          <div>
            <label style={LABEL} htmlFor="pipe-estado">{t('pipeline.col_estado')}</label>
            <select id="pipe-estado" style={INPUT} value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">{t('pipeline.todos')}</option>
              <option value="ENVIADO">{t('pipeline.estado_ENVIADO')}</option>
              <option value="PENDIENTE">{t('pipeline.estado_PENDIENTE')}</option>
              <option value="FALLIDO">{t('pipeline.estado_FALLIDO')}</option>
            </select>
          </div>
          <div>
            <label style={LABEL} htmlFor="pipe-ctx">{t('pipeline.col_contexto')}</label>
            <select id="pipe-ctx" style={INPUT} value={contexto} onChange={(e) => setContexto(e.target.value)}>
              <option value="">{t('pipeline.todos_contextos')}</option>
              <option value="Ambiental">{t('pipeline.ctx_ambiental')}</option>
              <option value="Biométrico">{t('pipeline.ctx_biometrico')}</option>
              <option value="Hídrico">{t('pipeline.ctx_hidrico')}</option>
              <option value="Visión">{t('pipeline.ctx_vision')}</option>
            </select>
          </div>
        </div>

        <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label="Tabla de paquetes al motor de inferencia">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={THEAD_ROW}>{cols.map((h, i) => <th key={i} style={TH}>{h}</th>)}</tr></thead>
            <tbody>
              {paquetes.map((p) => (
                <tr key={p.id} className="ds-fila-accion" tabIndex={0} onClick={() => setAbierto(p)} onKeyDown={alActivarConTeclado(() => setAbierto(p))}>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>{p.id}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>{p.dispositivo}</td>
                  <td style={TD}><TipoDatoPill tipo={p.tipoDato} /></td>
                  <td style={{ ...TD, fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {t(`pipeline.ctx_${CTX_CLAVE[p.contexto]}`)}
                    {!p.ctxCompleto && <div><Pill tono="warning" icon={<AlertTriangle size={11} aria-hidden />}>{t('pipeline.incompleto')}</Pill></div>}
                  </td>
                  <td style={{ ...TD, fontSize: '12px', color: 'var(--text-muted)' }}>{p.variables.join(', ')}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.registros} / {MAX_REGISTROS}</td>
                  <td style={TD}><Pill tono={p.estadoCalidad === 'LECTURA_VALIDA' ? 'success' : 'warning'}>{p.estadoCalidad}</Pill></td>
                  <td style={TD}>{p.severidad ? <SeveridadBadge severidad={p.severidad} /> : '—'}</td>
                  <td style={TD}><OrigenDatoPill origen={p.origen} /></td>
                  <td style={TD}>
                    <Pill tono={ESTADO_TONO[p.estado]}>{t(`pipeline.estado_${p.estado}`)}</Pill>
                    {p.tipoFallo && <div style={{ fontSize: '11px', color: 'var(--sem-error)', marginTop: 2 }}>{t(`pipeline.fallo_${p.tipoFallo}`)}</div>}
                  </td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', textAlign: 'center', color: 'var(--text-muted)' }}>{p.reintentos}/{MAX_REINTENTOS}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{p.enviado ?? '—'}</td>
                  <td style={{ ...TD, textAlign: 'right', color: 'var(--text-muted)' }}><ChevronRight size={16} aria-label={t('pipeline.ver_detalle')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {abierto && <PaqueteDetalleModal paquete={abierto} onClose={() => setAbierto(null)} />}
    </div>
  );
}

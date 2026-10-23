// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-55: pestaña de visión por ventana y tiempo de proceso contra su presupuesto |
import React, { useMemo, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Cpu, Sliders, AlertTriangle, Database, CheckCircle2, Timer } from 'lucide-react';
import { DatosSimuladosBanner } from '../components/DatosSimuladosBanner';
import { KpiCard } from '../components/KpiCard';
import { Gauge } from '../../shared/design-system/Gauge';
import { SubPestanas } from '../../shared/design-system/SubPestanas';
import { Pill, type Tono } from '../components/Pill';
import { SeveridadBadge } from '../components/SeveridadBadge';
import { OrigenPill } from '../components/OrigenPill';
import { TH, TD, TABLE_WRAP, THEAD_ROW, INPUT, LABEL } from '../components/tableStyles';
import {
  EDGE_KPIS, EDGE_GAUGES, EDGE_EVENTOS, PRESUPUESTO_ESCALAR_MS, VISION_CFG, VENTANAS_VISION, estadoVentana,
  type EstadoVentana, type EventoEdgeMock,
} from '../mocks/edgeMock';

type Pestana = 'eventos' | 'vision';

const CLASIF_TONO: Record<string, Tono> = {
  NORMAL: 'success', SIMPLE: 'warning', COMPUESTA: 'error', ERROR_CONFIGURACION: 'neutral',
};
const VENTANA_TONO: Record<EstadoVentana, Tono> = { DENTRO: 'success', EXCEDIDO: 'warning', BACKPRESSURE: 'error' };
const PRESUPUESTO_SEG = (VISION_CFG.duracionSeg * VISION_CFG.presupuestoPct) / 100;

const H2: React.CSSProperties = { fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s2)' };
const CARD: React.CSSProperties = { background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s5)' };

function TiempoProceso({ e }: { e: EventoEdgeMock }) {
  const { t } = useT('telemetry');
  if (e.rama === 'VISION') {
    const est = estadoVentana(e.tiempoProceso);
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)', whiteSpace: 'nowrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{e.tiempoProceso} s / {PRESUPUESTO_SEG} s</span>
        <Pill tono={VENTANA_TONO[est]}>{t(`edge.ventana_${est}`)}</Pill>
      </span>
    );
  }
  const cumple = e.tiempoProceso <= PRESUPUESTO_ESCALAR_MS;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)', whiteSpace: 'nowrap' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{e.tiempoProceso} ms / {PRESUPUESTO_ESCALAR_MS} ms</span>
      <Pill tono={cumple ? 'success' : 'error'}>{t(cumple ? 'edge.cumple' : 'edge.excede')}</Pill>
    </span>
  );
}

function EventosEdge() {
  const { t } = useT('telemetry');
  const [filtro, setFiltro] = useState('');
  const eventos = useMemo(
    () => EDGE_EVENTOS.filter((e) => !filtro || (filtro === 'VISION' ? e.rama === 'VISION' : e.clasificacion === filtro)),
    [filtro],
  );
  const cols = [t('edge.col_dispositivo'), t('edge.col_variables'), t('edge.col_valor'), t('edge.col_rama'), t('edge.col_clasificacion'), t('edge.col_regla'), t('edge.col_severidad'), t('edge.col_origen'), t('edge.col_tiempo'), t('edge.col_capturado'), t('edge.col_procesado')];

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--s4)', marginBottom: 'var(--s6)' }}>
        {EDGE_GAUGES.map((g) => (
          <div key={g.label} style={{ display: 'flex', justifyContent: 'center', background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
            <Gauge value={g.valor} min={g.min} max={g.max} unit={g.unidad} status={g.estado} label={g.label} size={128} />
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 260, marginBottom: 'var(--s4)' }}>
        <label style={LABEL} htmlFor="edge-filtro">{t('edge.col_clasificacion')}</label>
        <select id="edge-filtro" style={INPUT} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">{t('edge.todos')}</option>
          <option value="NORMAL">{t('edge.clasif_NORMAL')}</option>
          <option value="SIMPLE">{t('edge.clasif_SIMPLE')}</option>
          <option value="COMPUESTA">{t('edge.clasif_COMPUESTA')}</option>
          <option value="ERROR_CONFIGURACION">{t('edge.clasif_ERROR_CONFIGURACION')}</option>
          <option value="VISION">{t('edge.rama_VISION')}</option>
        </select>
      </div>

      <div style={TABLE_WRAP}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead><tr style={THEAD_ROW}>{cols.map((h, i) => <th key={i} style={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {eventos.map((e) => (
              <tr key={e.id} style={{ background: 'var(--surface-card)' }}>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>{e.dispositivo}</td>
                <td style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px' }}>{e.variables}</td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{e.valor}</td>
                <td style={TD}><Pill tono={e.rama === 'BASICO' ? 'neutral' : 'info'}>{t(`edge.rama_${e.rama}`)}</Pill></td>
                <td style={TD}><Pill tono={CLASIF_TONO[e.clasificacion] ?? 'neutral'}>{t(`edge.clasif_${e.clasificacion}`)}</Pill></td>
                <td style={{ ...TD, fontSize: '12px', color: 'var(--text-muted)' }}>{e.regla}</td>
                <td style={TD}>{e.clasificacion === 'NORMAL' ? '—' : <SeveridadBadge severidad={e.severidad} />}</td>
                <td style={TD}><OrigenPill origen={e.origen} /></td>
                <td style={TD}><TiempoProceso e={e} /></td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{e.capturado}</td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{e.procesado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function VisionPorVentana() {
  const { t } = useT('telemetry');
  const cols = [t('edge.col_camara'), t('edge.col_ventana'), t('edge.col_tiempo'), t('edge.col_pct_ventana'), t('edge.col_estado'), t('edge.col_frames'), 'cobertura_ventana'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '75ch' }}>{t('edge.vision_descripcion')}</p>

      <div className="ds-fg2" style={{ gap: 'var(--s4)' }}>
        <section style={CARD}>
          <h2 style={H2}>{t('edge.presupuesto_titulo')}</h2>
          <p style={{ margin: '0 0 var(--s4)', fontSize: '12px', color: 'var(--text-muted)' }}>{t('edge.valores_d')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', fontSize: '13px' }}>
            <div><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>duracion_ventana_observacion</span><div style={{ fontWeight: 600 }}>{VISION_CFG.duracionSeg} s ({VISION_CFG.duracionSeg / 60} min)</div></div>
            <div><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>presupuesto_latencia_ventana</span><div style={{ fontWeight: 600 }}>{t('edge.pct_de_ventana', { pct: VISION_CFG.presupuestoPct, min: VISION_CFG.rangoMin, max: VISION_CFG.rangoMax })}</div></div>
            <div><span style={{ color: 'var(--text-muted)' }}>{t('edge.presupuesto_efectivo')}</span><div style={{ fontWeight: 600 }}>{t('edge.por_ventana', { seg: PRESUPUESTO_SEG })}</div></div>
          </div>
        </section>

        <section style={CARD}>
          <h2 style={H2}>{t('edge.criterio_titulo')}</h2>
          <p style={{ margin: '0 0 var(--s3)', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('edge.criterio_texto')}</p>
          <code style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '12px', padding: 'var(--s2) var(--s3)', background: 'var(--surface-hover)', borderRadius: 'var(--r-sm)', marginBottom: 'var(--s3)' }}>
            t_proceso(ventana N) &lt; cierre(ventana N+1)
          </code>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)' }}>
            {(['DENTRO', 'EXCEDIDO', 'BACKPRESSURE'] as EstadoVentana[]).map((est) => <Pill key={est} tono={VENTANA_TONO[est]}>{t(`edge.ventana_${est}`)}</Pill>)}
          </div>
          <p style={{ margin: 'var(--s3) 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{t('edge.no_encola')}</p>
        </section>
      </div>

      <section style={CARD}>
        <h2 style={H2}>{t('edge.reparto_titulo')}</h2>
        <p style={{ margin: '0 0 var(--s4)', fontSize: '12px', color: 'var(--text-muted)' }}>{t('edge.valores_d')}</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
          {VISION_CFG.etapas.map((et) => (
            <li key={et.nombre} style={{ fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s3)', marginBottom: 4 }}>
                <span>{et.nombre}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{et.pct}% · {Math.round((PRESUPUESTO_SEG * et.pct) / 100)} s</span>
              </div>
              <div role="presentation" style={{ height: 6, borderRadius: 'var(--r-full)', background: 'var(--surface-hover)' }}>
                <div style={{ width: `${et.pct}%`, height: '100%', borderRadius: 'var(--r-full)', background: 'var(--brand-500)' }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 style={{ ...H2, marginBottom: 'var(--s3)' }}>{t('edge.ultimas_ventanas')}</h2>
        <div style={TABLE_WRAP}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={THEAD_ROW}>{cols.map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
            <tbody>
              {VENTANAS_VISION.map((v) => {
                const est = estadoVentana(v.procesoSeg);
                return (
                  <tr key={`${v.camara}-${v.inicio}`} style={{ background: 'var(--surface-card)' }}>
                    <td style={TD}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>{v.camara}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{v.area}</div>
                    </td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'nowrap' }}>{v.inicio}–{v.fin}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{v.procesoSeg != null ? `${v.procesoSeg} s` : t('edge.sin_terminar')}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{v.procesoSeg != null ? `${Math.round((v.procesoSeg / VISION_CFG.duracionSeg) * 100)}%` : '—'}</td>
                    <td style={TD}><Pill tono={VENTANA_TONO[est]}>{t(`edge.ventana_${est}`)}</Pill></td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', color: v.framesDescartados ? 'var(--sem-error)' : 'var(--text-muted)' }}>{v.framesDescartados}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{v.cobertura}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function EdgeView() {
  const { t } = useT('telemetry');
  const [pestana, setPestana] = useState<Pestana>('eventos');
  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <Cpu size={20} aria-hidden />{t('edgeview.deteccion_de_desviaciones_en_campo')}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('edgeview.descripcion')}</p>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        <DatosSimuladosBanner />

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s5)' }}>
          <KpiCard icon={<Sliders size={18} aria-hidden />} valor={EDGE_KPIS.variables} etiqueta={t('edge.kpi_variables')} sub={t('edge.kpi_variables_sub')} />
          <KpiCard icon={<AlertTriangle size={18} aria-hidden />} valor={EDGE_KPIS.desviacionesHoy} etiqueta={t('edge.kpi_desviaciones')} sub={t('edge.kpi_desviaciones_sub')} color="var(--sem-warning)" />
          <KpiCard icon={<Database size={18} aria-hidden />} valor={EDGE_KPIS.enBuffer} etiqueta={t('edge.kpi_buffer')} sub={t('edge.kpi_buffer_sub')} color="var(--sem-info)" />
          <KpiCard icon={<CheckCircle2 size={18} aria-hidden />} valor={EDGE_KPIS.normales} etiqueta={t('edge.kpi_normales')} sub={t('edge.kpi_normales_sub')} color="var(--sem-success)" />
        </div>

        <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 var(--s5)' }}>
          <Timer size={16} aria-hidden style={{ color: 'var(--brand-600)', flexShrink: 0 }} />{t('edge.modo_presupuestos', { pct: VISION_CFG.presupuestoPct })}
        </p>

        <div>
          <SubPestanas<Pestana>
            pestanas={[{ id: 'eventos', label: t('edge.tab_eventos') }, { id: 'vision', label: t('edge.tab_vision') }]}
            activa={pestana}
            onCambiar={setPestana}
            ariaLabel={t('edge.tabs_aria')}
          />
        </div>

        {pestana === 'eventos' ? <EventosEdge /> : <VisionPorVentana />}
      </div>
    </div>
  );
}

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-53: filtros, tipo de dato, orden por prioridad E15 y detalle de lectura |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: valores con máximo 2 decimales y separador regional |
import React, { useMemo, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { DownloadCloud, CheckCircle2, AlertTriangle, XCircle, ChevronRight, ListOrdered } from 'lucide-react';
import { DatosSimuladosBanner } from '../components/DatosSimuladosBanner';
import { KpiCard } from '../components/KpiCard';
import { Pill } from '../components/Pill';
import { TipoDatoPill } from '../components/TipoDatoPill';
import { OrigenDatoPill } from '../components/OrigenDatoPill';
import { IngestaDetalleModal, ESTADO_INGESTA_TONO, latenciaTexto } from '../components/IngestaDetalleModal';
import { TH, TD, TABLE_WRAP, THEAD_ROW, INPUT, LABEL, FILTER_GRID } from '../components/tableStyles';
import { alActivarConTeclado } from '../../shared/lib/teclado';
import { INGESTA_KPIS, INGESTA_LECTURAS, compararPrioridad, type EstadoIngesta, type LecturaIngestaMock } from '../mocks/ingestaMock';
import { valorConUnidad } from '../lib/sensorEscala';

const ESTADOS: EstadoIngesta[] = [
  'LECTURA_VALIDA', 'FUERA_DE_RANGO', 'ERROR_CALIBRACION', 'ERROR_ESTRUCTURA', 'ERROR_AUTENTICACION',
  'ERROR_DUPLICADO', 'ERROR_TIEMPO', 'ERROR_UNIDAD', 'ERROR_SENSOR',
];

function valorTexto(l: LecturaIngestaMock): string {
  if (l.tipoDato === 'VECTOR_COMPORTAMIENTO') return l.vision ? `ρ ${l.vision.densidad.toFixed(2)} · n=${l.vision.individuos}` : '—';
  return valorConUnidad(l.valor, l.unidad);
}

export function IngestaView() {
  const { t } = useT('telemetry');
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('');
  const [origen, setOrigen] = useState('');
  const [tipo, setTipo] = useState('');
  const [porPrioridad, setPorPrioridad] = useState(false);
  const [abierta, setAbierta] = useState<LecturaIngestaMock | null>(null);

  const lecturas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtradas = INGESTA_LECTURAS.filter((l) =>
      (!q || [l.sensor, l.variable, l.id, l.dispositivo].some((c) => c.toLowerCase().includes(q)))
      && (!estado || l.estado === estado)
      && (!origen || l.origen === origen)
      && (!tipo || l.tipoDato === tipo));
    return porPrioridad ? [...filtradas].sort(compararPrioridad) : filtradas;
  }, [busqueda, estado, origen, tipo, porPrioridad]);

  const cols = [t('ingesta.col_sensor'), t('ingesta.col_variable'), t('ingesta.col_tipo'), t('ingesta.col_valor'), t('ingesta.origen'), t('ingesta.col_estado'), t('ingesta.latencia'), t('ingesta.capturado'), ''];

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <DownloadCloud size={20} aria-hidden />{t('ingestaview.monitor_de_ingesta_de_telemetria')}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('ingestaview.descripcion')}</p>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        <DatosSimuladosBanner />

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          <KpiCard icon={<DownloadCloud size={18} aria-hidden />} valor={INGESTA_KPIS.hoy} etiqueta={t('ingesta.kpi_hoy')} sub={t('ingesta.kpi_hoy_sub')} color="var(--brand-500)" />
          <KpiCard icon={<CheckCircle2 size={18} aria-hidden />} valor={INGESTA_KPIS.validas} etiqueta={t('ingesta.kpi_validas')} sub="80.2%" color="var(--sem-success)" />
          <KpiCard icon={<AlertTriangle size={18} aria-hidden />} valor={INGESTA_KPIS.fueraRango} etiqueta={t('ingesta.kpi_fuera_rango')} sub="12.6%" color="var(--sem-warning)" />
          <KpiCard icon={<XCircle size={18} aria-hidden />} valor={INGESTA_KPIS.errores} etiqueta={t('ingesta.kpi_errores')} sub={t('ingesta.kpi_errores_sub')} color="var(--sem-error)" />
        </div>

        <div style={FILTER_GRID}>
          <div>
            <label style={LABEL} htmlFor="ing-q">{t('ingesta.buscar')}</label>
            <input id="ing-q" type="search" style={INPUT} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder={t('ingesta.buscar_placeholder')} />
          </div>
          <div>
            <label style={LABEL} htmlFor="ing-estado">{t('ingesta.col_estado')}</label>
            <select id="ing-estado" style={INPUT} value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">{t('ingesta.todos_estados')}</option>
              {ESTADOS.map((e) => <option key={e} value={e}>{t(`ingesta.estado_${e}`)}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL} htmlFor="ing-origen">{t('ingesta.origen')}</label>
            <select id="ing-origen" style={INPUT} value={origen} onChange={(e) => setOrigen(e.target.value)}>
              <option value="">{t('ingesta.todos_origenes')}</option>
              <option value="TIEMPO_REAL">{t('vision.origen_tiempo_real')}</option>
              <option value="BUFFER_LOCAL">{t('vision.origen_buffer')}</option>
              <option value="EDGE_AGREGADO">{t('vision.origen_edge')}</option>
            </select>
          </div>
          <div>
            <label style={LABEL} htmlFor="ing-tipo">{t('ingesta.tipo_dato')}</label>
            <select id="ing-tipo" style={INPUT} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">{t('ingesta.todos_tipos')}</option>
              <option value="ESCALAR">{t('vision.tipo_escalar')}</option>
              <option value="VECTOR_COMPORTAMIENTO">{t('vision.tipo_vector')}</option>
            </select>
          </div>
          <div>
            <label style={LABEL} htmlFor="ing-orden">{t('ingesta.orden')}</label>
            <select id="ing-orden" style={INPUT} value={porPrioridad ? 'prioridad' : 'llegada'} onChange={(e) => setPorPrioridad(e.target.value === 'prioridad')}>
              <option value="llegada">{t('ingesta.orden_llegada')}</option>
              <option value="prioridad">{t('ingesta.orden_prioridad')}</option>
            </select>
          </div>
        </div>

        {porPrioridad && (
          <div role="note" style={{ display: 'flex', gap: 'var(--s2)', padding: 'var(--s3) var(--s4)', marginBottom: 'var(--s4)', borderRadius: 'var(--r-md)', border: '1px solid var(--sem-info-border)', background: 'var(--sem-info-bg)', color: 'var(--text-primary)', fontSize: '13px' }}>
            <ListOrdered size={16} aria-hidden style={{ color: 'var(--sem-info)', flexShrink: 0, marginTop: 1 }} />
            <span>{t('ingesta.saturacion_nota')}</span>
          </div>
        )}

        <p aria-live="polite" style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 var(--s2)' }}>
          {t('ingesta.mostrando', { n: lecturas.length })}
        </p>

        {lecturas.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s8) var(--s4)', fontSize: '14px', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>
            {t('ingesta.sin_resultados')}
          </div>
        ) : (
          <div style={TABLE_WRAP}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead><tr style={THEAD_ROW}>{cols.map((h, i) => <th key={i} style={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {lecturas.map((l) => (
                  <tr key={l.id} className="ds-fila-accion" tabIndex={0} onClick={() => setAbierta(l)} onKeyDown={alActivarConTeclado(() => setAbierta(l))}>
                    <td style={TD}>
                      <div style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 600 }}>{l.sensor}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{l.dispositivo}</div>
                    </td>
                    <td style={TD}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{l.variable}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.categoria}</div>
                    </td>
                    <td style={TD}><TipoDatoPill tipo={l.tipoDato} /></td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{valorTexto(l)}</td>
                    <td style={TD}><OrigenDatoPill origen={l.origen} /></td>
                    <td style={TD}><Pill tono={ESTADO_INGESTA_TONO[l.estado]}>{t(`ingesta.estado_${l.estado}`)}</Pill></td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', color: l.latenciaAlta ? 'var(--sem-warning)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{latenciaTexto(l.latenciaMs)}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{l.capturado.slice(11)}</td>
                    <td style={{ ...TD, textAlign: 'right', color: 'var(--text-muted)' }}><ChevronRight size={16} aria-label={t('ingesta.ver_detalle')} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {abierta && <IngestaDetalleModal lectura={abierta} onClose={() => setAbierta(null)} />}
    </div>
  );
}

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-53: filtros, tipo de dato, orden por prioridad E15 y detalle de lectura |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: valores con máximo 2 decimales y separador regional |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre |
// | 2026-10-31 | Arekkazu | TC-DIS-146 RF-53 a11y 1.3.1: la columna de detalle tiene encabezado |
// | 2026-11-02 | Arekkazu | AJF-07 RF-53: datos reales de GET /iot/ingesta, paginados en el backend; sin datos simulados |
import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { formatearFechaHora, formatearNumero } from '../../shared/i18n/formato';
import { DownloadCloud, CheckCircle2, AlertTriangle, XCircle, ChevronRight, Search } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { KpiCard } from '../components/KpiCard';
import { Pill } from '../components/Pill';
import { OrigenDatoPill } from '../components/OrigenDatoPill';
import { Paginacion } from '../components/Paginacion';
import { IngestaDetalleModal, ESTADO_INGESTA_TONO, latenciaTexto } from '../components/IngestaDetalleModal';
import { TH, TD, TABLE_WRAP, THEAD_ROW, INPUT, LABEL, FILTER_GRID } from '../components/tableStyles';
import { alActivarConTeclado } from '../../shared/lib/teclado';
import { finDelDiaUtc, inicioDelDiaUtc } from '../../shared/lib/fecha';
import { useIngesta } from '../hooks/useIngesta';
import { useDispositivos } from '../hooks/useDispositivo';
import { valorConUnidad } from '../lib/sensorEscala';
import type { EstadoIngesta, FiltrosIngesta, LecturaIngesta } from '../types';

const ESTADOS: EstadoIngesta[] = [
  'LECTURA_VALIDA', 'FUERA_DE_RANGO', 'ERROR_CALIBRACION', 'ERROR_ESTRUCTURA', 'ERROR_AUTENTICACION',
  'ERROR_DUPLICADO', 'ERROR_TIEMPO', 'ERROR_UNIDAD', 'ERROR_SENSOR',
];

interface FiltrosForm { estado: string; origen: string; dispositivo: string; desde: string; hasta: string }
const VACIO: FiltrosForm = { estado: '', origen: '', dispositivo: '', desde: '', hasta: '' };

/** Sin fechas el backend toma las últimas 24 h. */
function aFiltros(f: FiltrosForm): FiltrosIngesta {
  const r: FiltrosIngesta = {};
  if (f.estado) r.estado_calidad = f.estado;
  if (f.origen) r.origen = f.origen;
  if (f.dispositivo) r.id_dispositivo_iot = Number(f.dispositivo);
  if (f.desde) r.desde = inicioDelDiaUtc(f.desde);
  if (f.hasta) r.hasta = finDelDiaUtc(f.hasta);
  return r;
}

const pct = (n: number, total: number) => (total ? formatearNumero(n / total, { style: 'percent', maximumFractionDigits: 1 }) : '—');

export function IngestaView() {
  const { t } = useT('telemetry');
  const ingesta = useIngesta();
  const dispositivos = useDispositivos(true);
  const [form, setForm] = useState<FiltrosForm>(VACIO);
  const [aplicados, setAplicados] = useState<FiltrosIngesta>({});
  const [abierta, setAbierta] = useState<LecturaIngesta | null>(null);
  const invertido = !!form.desde && !!form.hasta && form.desde > form.hasta;

  useEffect(() => {
    void ingesta.cargar({}, 1);
    void ingesta.cargarIndicadores();
  }, [ingesta.cargar, ingesta.cargarIndicadores]); // eslint-disable-line react-hooks/exhaustive-deps

  const aplicar = () => {
    if (invertido) return;
    const f = aFiltros(form);
    setAplicados(f);
    void ingesta.cargar(f, 1);
  };
  const limpiar = () => { setForm(VACIO); setAplicados({}); void ingesta.cargar({}, 1); };
  const set = (k: keyof FiltrosForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  const k = ingesta.indicadores;
  const cols = [t('ingesta.col_sensor'), t('ingesta.col_variable'), t('ingesta.col_valor'), t('ingesta.origen'), t('ingesta.col_estado'), t('ingesta.latencia'), t('ingesta.col_recibido'), ''];

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <DownloadCloud size={20} aria-hidden />{t('ingestaview.monitor_de_ingesta_de_telemetria')}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('ingestaview.descripcion')}</p>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        <div aria-live="polite" style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          <KpiCard icon={<DownloadCloud size={18} aria-hidden />} valor={k ? formatearNumero(k.total) : '—'} etiqueta={t('ingesta.kpi_hoy')} sub={t('ingesta.kpi_hoy_sub')} color="var(--brand-500)" />
          <KpiCard icon={<CheckCircle2 size={18} aria-hidden />} valor={k ? formatearNumero(k.validas) : '—'} etiqueta={t('ingesta.kpi_validas')} sub={k ? pct(k.validas, k.total) : undefined} color="var(--sem-success)" />
          <KpiCard icon={<AlertTriangle size={18} aria-hidden />} valor={k ? formatearNumero(k.fuera_de_rango) : '—'} etiqueta={t('ingesta.kpi_fuera_rango')} sub={k ? pct(k.fuera_de_rango, k.total) : undefined} color="var(--sem-warning)" />
          <KpiCard icon={<XCircle size={18} aria-hidden />} valor={k ? formatearNumero(k.errores) : '—'} etiqueta={t('ingesta.kpi_errores')} sub={t('ingesta.kpi_errores_sub')} color="var(--sem-error)" />
        </div>

        <div style={FILTER_GRID}>
          <div>
            <label style={LABEL} htmlFor="ing-estado">{t('ingesta.col_estado')}</label>
            <select id="ing-estado" style={INPUT} value={form.estado} onChange={set('estado')}>
              <option value="">{t('ingesta.todos_estados')}</option>
              {ESTADOS.map((e) => <option key={e} value={e}>{t(`ingesta.estado_${e}`)}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL} htmlFor="ing-origen">{t('ingesta.origen')}</label>
            <select id="ing-origen" style={INPUT} value={form.origen} onChange={set('origen')}>
              <option value="">{t('ingesta.todos_origenes')}</option>
              <option value="TIEMPO_REAL">{t('vision.origen_tiempo_real')}</option>
              <option value="BUFFER_LOCAL">{t('vision.origen_buffer')}</option>
              <option value="EDGE_AGREGADO">{t('vision.origen_edge')}</option>
            </select>
          </div>
          <div>
            <label style={LABEL} htmlFor="ing-dispositivo">{t('ingesta.dispositivo')}</label>
            <select id="ing-dispositivo" style={INPUT} value={form.dispositivo} onChange={set('dispositivo')}>
              <option value="">{t('ingesta.todos_dispositivos')}</option>
              {dispositivos.items.map((d) => <option key={d.id_dispositivo_iot} value={String(d.id_dispositivo_iot)}>{d.descripcion || d.serial} · {d.nombre_infraestructura}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL} htmlFor="ing-desde">{t('ingesta.desde')}</label>
            <input id="ing-desde" type="date" style={INPUT} value={form.desde} onChange={set('desde')} />
          </div>
          <div>
            <label style={LABEL} htmlFor="ing-hasta">{t('ingesta.hasta')}</label>
            <input id="ing-hasta" type="date" style={INPUT} value={form.hasta} onChange={set('hasta')} aria-invalid={invertido} aria-describedby={invertido ? 'ing-rango-error' : 'ing-rango-ayuda'} />
            {invertido
              ? <p id="ing-rango-error" role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>{t('filtros.rango_invertido', { ns: 'common' })}</p>
              : <p id="ing-rango-ayuda" style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 'var(--s1) 0 0' }}>{t('ingesta.rango_ayuda')}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s5)' }}>
          <Button variant="primary" size="sm" disabled={invertido} onClick={aplicar}>
            <Search size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('ingesta.aplicar')}</Button>
          <Button variant="ghost" size="sm" onClick={limpiar}>{t('ingesta.limpiar')}</Button>
        </div>

        {ingesta.error && <Alert variant={ingesta.error.status === 403 ? 'warning' : 'error'} title={t('ingesta.error_titulo')} description={ingesta.error.message} style={{ marginBottom: 'var(--s4)' }} />}
        {ingesta.loading && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('ingesta.cargando')}</p>}

        {!ingesta.loading && !ingesta.error && ingesta.items.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s8) var(--s4)', fontSize: '14px', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>
            {Object.keys(aplicados).length ? t('ingesta.sin_resultados') : t('ingesta.sin_eventos')}
          </div>
        ) : ingesta.items.length > 0 && (
          <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label={t('ingesta.tabla_aria')}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead><tr style={THEAD_ROW}>{cols.map((h, i) => <th key={i} scope="col" style={TH}>{h || <span className="ds-sr-only">{t('acciones.ver_detalle', { ns: 'common' })}</span>}</th>)}</tr></thead>
              <tbody>
                {ingesta.items.map((l) => (
                  <tr key={l.id_bitacora_ingest} className="ds-fila-accion" tabIndex={0} onClick={() => setAbierta(l)} onKeyDown={alActivarConTeclado(() => setAbierta(l))}>
                    <td style={TD}>
                      <div style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 600 }}>{l.nombre_sensor ?? '—'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.serial_dispositivo ?? l.gateway_id ?? '—'}{l.nombre_area && ` · ${l.nombre_area}`}</div>
                    </td>
                    <td style={TD}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{l.nombre_variable ?? '—'}</div>
                      {l.categoria_variable && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.categoria_variable}</div>}
                    </td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{l.valor_crudo != null ? valorConUnidad(l.valor_crudo, l.unidad_medida ?? '') : '—'}</td>
                    <td style={TD}>{l.origen ? <OrigenDatoPill origen={l.origen} /> : '—'}</td>
                    <td style={TD}>{l.estado_calidad ? <Pill tono={ESTADO_INGESTA_TONO[l.estado_calidad] ?? 'neutral'}>{t(`ingesta.estado_${l.estado_calidad}`, { defaultValue: l.estado_calidad })}</Pill> : '—'}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', color: l.latencia_alta ? 'var(--sem-warning)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{latenciaTexto(l.latencia_ms)}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatearFechaHora(l.fecha_evento)}</td>
                    <td style={{ ...TD, textAlign: 'right', color: 'var(--text-muted)' }}><ChevronRight size={16} aria-label={t('ingesta.ver_detalle')} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginacion
          pagina={ingesta.paginacion.pagina}
          totalPaginas={ingesta.paginacion.totalPaginas}
          totalRegistros={ingesta.paginacion.totalRegistros}
          onCambiar={(p) => void ingesta.cargar(aplicados, p)}
        />
      </div>

      {abierta && <IngestaDetalleModal lectura={abierta} onClose={() => setAbierta(null)} />}
    </div>
  );
}

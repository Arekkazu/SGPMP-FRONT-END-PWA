import React, { useCallback, useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { useHistory } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Search } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { useAuditoriaM02 } from '../hooks/useAuditoriaM02';
import { Paginacion } from '../components/Paginacion';
import type { ConsultarBitacoraFiltros, EventoAuditoriaResponse } from '../types';
import { finDelDiaUtc, inicioDelDiaUtc } from '../../shared/lib/fecha';

const INPUT: React.CSSProperties = {
  width: '100%',
  padding: 'var(--s2) var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: 'var(--fs-body-md)',
  height: 38,
};

const LABEL: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
  marginBottom: 'var(--s1)', textTransform: 'uppercase', letterSpacing: '0.04em',
};

const TH: React.CSSProperties = {
  padding: 'var(--s2) var(--s4)', textAlign: 'left', fontFamily: 'var(--font-mono)',
  fontSize: 'var(--fs-label-sm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
  color: 'var(--text-muted)', whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = { padding: 'var(--s3) var(--s4)', borderBottom: '1px solid var(--surface-border)', verticalAlign: 'top' };

function pill(text: string, tono: 'success' | 'error' | 'warning' | 'info' | 'neutral') {
  const map = {
    success: ['var(--sem-success)', 'var(--sem-success-bg)', 'var(--sem-success-border)'],
    error: ['var(--sem-error)', 'var(--sem-error-bg)', 'var(--sem-error-border)'],
    warning: ['var(--sem-warning)', 'var(--sem-warning-bg)', 'var(--sem-warning-border)'],
    info: ['var(--sem-info)', 'var(--sem-info-bg)', 'var(--sem-info-border)'],
    neutral: ['var(--text-muted)', 'var(--surface-hover)', 'var(--surface-border)'],
  } as const;
  const [fg, bg, bd] = map[tono];
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, color: fg, background: bg, border: `1px solid ${bd}`, padding: '2px var(--s2)', borderRadius: 'var(--r-full)', whiteSpace: 'nowrap' }}>
      {text}
    </span>
  );
}

function tonoResultado(r: string): 'success' | 'error' | 'neutral' {
  const up = r.toUpperCase();
  if (up === 'EXITOSO') return 'success';
  if (up === 'FALLIDO') return 'error';
  return 'neutral';
}

function tonoSeveridad(s: string): 'info' | 'warning' | 'error' | 'neutral' {
  const up = s.toUpperCase();
  if (up === 'ERROR' || up === 'CRITICAL') return 'error';
  if (up === 'WARNING' || up === 'WARN') return 'warning';
  if (up === 'INFO') return 'info';
  return 'neutral';
}

interface FiltrosState {
  rf_origen: string;
  tipo_evento: string;
  id_activo_biologico: string;
  clasificacion_biologica: string;
  resultado: string;
  severidad_log: string;
  id_usuario_responsable: string;
  fecha_inicio: string;
  fecha_fin: string;
}

const VACIO: FiltrosState = {
  rf_origen: '', tipo_evento: '', id_activo_biologico: '', clasificacion_biologica: '',
  resultado: '', severidad_log: '', id_usuario_responsable: '', fecha_inicio: '', fecha_fin: '',
};

/** Valor legible de un campo de `detalle_tecnico` (TC-DIS-143). */
function valorDetalle(v: unknown): string {
  if (v == null) return '—';
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}

function Row({ ev }: { ev: EventoAuditoriaResponse }) {
  const { t } = useT('biologicalAssets');
  const detalle = ev.detalle_tecnico ? Object.entries(ev.detalle_tecnico) : [];
  return (
    <tr style={{ background: 'var(--surface-card)' }}>
      <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {ev.timestamp_evento?.slice(0, 19).replace('T', ' ')}
      </td>
      <td style={{ ...TD, whiteSpace: 'nowrap' }}>{pill(ev.rf_origen, 'neutral')}</td>
      <td style={{ ...TD, color: 'var(--text-primary)', fontSize: '12px' }}>
        <div style={{ fontWeight: 600 }}>{ev.tipo_evento}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ev.clasificacion_biologica}</div>
      </td>
      <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
        {ev.id_activo_biologico ?? '—'}
      </td>
      <td style={TD}>{pill(ev.resultado, tonoResultado(ev.resultado))}</td>
      <td style={TD}>{pill(ev.severidad_log, tonoSeveridad(ev.severidad_log))}</td>
      <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
        {ev.id_usuario_responsable != null ? `#${ev.id_usuario_responsable}` : '—'}
      </td>
      {/* TC-DIS-145: un motivo largo sin espacios ensanchaba la tabla en móvil/tablet. */}
      <td style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px', maxWidth: 260, overflowWrap: 'anywhere' }}>
        {ev.descripcion ?? '—'}
        {ev.registro_incompleto && <div>{pill('INCOMPLETO', 'warning')}</div>}
        {detalle.length > 0 && (
          <details style={{ marginTop: 'var(--s1)' }}>
            <summary style={{ cursor: 'pointer', fontSize: '11px' }}>{t('auditoriam02view.detalle_tecnico')}</summary>
            <dl style={{ margin: 'var(--s1) 0 0', fontSize: '11px' }}>
              {detalle.map(([k, v]) => (
                <div key={k}>
                  <dt style={{ display: 'inline', fontWeight: 600 }}>{k.replace(/_/g, ' ')}: </dt>
                  <dd style={{ display: 'inline', margin: 0 }}>{valorDetalle(v)}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </td>
      <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label-sm)', color: 'var(--text-muted)' }} title={ev.hash_integridad}>
        {ev.hash_integridad ? `${ev.hash_integridad.slice(0, 10)}…` : '—'}
      </td>
    </tr>
  );
}

export function AuditoriaM02View() {
  const { t } = useT('biologicalAssets');
  const history = useHistory();
  const { registros, paginacion, loading, error, cargar } = useAuditoriaM02();
  const [filtros, setFiltros] = useState<FiltrosState>(VACIO);

  const consultar = useCallback(
    (pagina: number) => {
      const f: ConsultarBitacoraFiltros = { pagina, page_size: 20 };
      if (filtros.rf_origen) f.rf_origen = filtros.rf_origen.trim();
      if (filtros.tipo_evento) f.tipo_evento = filtros.tipo_evento.trim();
      if (filtros.id_activo_biologico) f.id_activo_biologico = Number(filtros.id_activo_biologico);
      if (filtros.clasificacion_biologica) f.clasificacion_biologica = filtros.clasificacion_biologica.trim();
      if (filtros.resultado) f.resultado = filtros.resultado;
      if (filtros.severidad_log) f.severidad_log = filtros.severidad_log;
      if (filtros.id_usuario_responsable) f.id_usuario_responsable = Number(filtros.id_usuario_responsable);
      if (filtros.fecha_inicio) f.fecha_inicio = inicioDelDiaUtc(filtros.fecha_inicio);
      if (filtros.fecha_fin) f.fecha_fin = finDelDiaUtc(filtros.fecha_fin);
      cargar(f);
    },
    [filtros, cargar]
  );

  // Carga inicial (sin filtros).
  useEffect(() => { cargar({ pagina: 1, page_size: 20 }); }, [cargar]);

  const set = (k: keyof FiltrosState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFiltros((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div style={{ minHeight: '100%', background: 'var(--surface-bg)' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <Button variant="ghost" size="sm" onClick={() => history.push('/activos-biologicos')} style={{ marginBottom: 'var(--s3)' }}>
          <ArrowLeft size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('auditoriam02view.volver_a_la_lista')}</Button>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <ShieldCheck size={20} aria-hidden />{t('auditoriam02view.auditoria_y_trazabilidad')}</h1>
        <p style={{ fontSize: 'var(--fs-body-md)', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('auditoriam02view.bitacora_de_eventos_del_modulo_de_activos')}</p>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        {/* Filtros — en un <form> para que Enter aplique la búsqueda (TC-DIS-143). */}
        <form onSubmit={(e) => { e.preventDefault(); consultar(1); }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--s4)', marginBottom: 'var(--s4)' }}>
          <div><label style={LABEL} htmlFor="a-rf">{t('auditoriam02view.rf_origen')}</label><input id="a-rf" style={INPUT} placeholder="Ej: RF40" value={filtros.rf_origen} onChange={set('rf_origen')} /></div>
          <div><label style={LABEL} htmlFor="a-tipo">{t('auditoriam02view.tipo_de_evento')}</label><input id="a-tipo" style={INPUT} value={filtros.tipo_evento} onChange={set('tipo_evento')} /></div>
          <div><label style={LABEL} htmlFor="a-id">{t('auditoriam02view.id_activo')}</label><input id="a-id" type="number" style={INPUT} value={filtros.id_activo_biologico} onChange={set('id_activo_biologico')} /></div>
          <div><label style={LABEL} htmlFor="a-clas">{t('auditoriam02view.clasificacion')}</label><input id="a-clas" style={INPUT} value={filtros.clasificacion_biologica} onChange={set('clasificacion_biologica')} /></div>
          <div>
            <label style={LABEL} htmlFor="a-res">{t('auditoriam02view.resultado')}</label>
            <select id="a-res" style={INPUT} value={filtros.resultado} onChange={set('resultado')}>
              <option value="">{t('auditoriam02view.todos')}</option>
              <option value="EXITOSO">{t('auditoriam02view.exitoso')}</option>
              <option value="FALLIDO">{t('auditoriam02view.fallido')}</option>
            </select>
          </div>
          <div>
            <label style={LABEL} htmlFor="a-sev">{t('auditoriam02view.severidad')}</label>
            <select id="a-sev" style={INPUT} value={filtros.severidad_log} onChange={set('severidad_log')}>
              <option value="">{t('auditoriam02view.todas')}</option>
              <option value="INFO">{t('auditoriam02view.info')}</option>
              <option value="WARNING">{t('auditoriam02view.warning')}</option>
              <option value="ERROR">{t('auditoriam02view.error')}</option>
            </select>
          </div>
          <div><label style={LABEL} htmlFor="a-usuario">{t('auditoriam02view.id_usuario')}</label><input id="a-usuario" type="number" min={1} style={INPUT} value={filtros.id_usuario_responsable} onChange={set('id_usuario_responsable')} /></div>
          <div><label style={LABEL} htmlFor="a-desde">{t('auditoriam02view.desde')}</label><input id="a-desde" type="date" style={INPUT} value={filtros.fecha_inicio} onChange={set('fecha_inicio')} /></div>
          <div><label style={LABEL} htmlFor="a-hasta">{t('auditoriam02view.hasta')}</label><input id="a-hasta" type="date" style={INPUT} value={filtros.fecha_fin} onChange={set('fecha_fin')} /></div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s5)' }}>
          <Button type="submit" variant="primary" size="sm">
            <Search size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('auditoriam02view.aplicar_filtros')}</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setFiltros(VACIO); cargar({ pagina: 1, page_size: 20 }); }}>{t('auditoriam02view.limpiar')}</Button>
        </div>
        </form>

        {error && (
          <Alert
            variant={error.status === 403 ? 'warning' : 'error'}
            title={error.status === 403 ? t('auditoriam02view.sin_acceso_a_la_auditoria') : t('auditoriam02view.error_al_cargar_la_bitacora')}
            description={error.message}
            style={{ marginBottom: 'var(--s4)' }}
          />
        )}

        {loading ? (
          <div style={{ height: 200, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }}>
            <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
          </div>
        ) : error ? null : registros.length === 0 ? (
          // Un 403 no debe leerse como "sin registros" (TC-DIS-143).
          <p role="status" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{t('auditoriam02view.sin_registros_de_auditoria_para_los_filtros')}</p>
        ) : (
          <div style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <ScrollRegion label={t('auditoriam02view.auditoria_y_trazabilidad')}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-body-md)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
                  {['Fecha', 'RF', 'Evento', 'Activo', 'Resultado', 'Severidad', 'Usuario', 'Descripción', 'Hash'].map((h) => <th key={h} scope="col" style={TH}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {registros.map((ev) => <Row key={ev.id_bitacora} ev={ev} />)}
              </tbody>
            </table>
            </ScrollRegion>
          </div>
        )}

        {!error && <Paginacion
          pagina={paginacion.pagina}
          totalPaginas={paginacion.totalPaginas}
          totalRegistros={paginacion.totalRegistros}
          onCambiar={consultar}
        />}
      </div>
    </div>
  );
}

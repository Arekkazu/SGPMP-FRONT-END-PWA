import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Search } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useAuditoriaM02 } from '../hooks/useAuditoriaM02';
import { Paginacion } from '../components/Paginacion';
import type { ConsultarBitacoraFiltros, EventoAuditoriaResponse } from '../types';

const INPUT: React.CSSProperties = {
  width: '100%',
  padding: 'var(--s2) var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  height: 38,
};

const LABEL: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
  marginBottom: 'var(--s1)', textTransform: 'uppercase', letterSpacing: '0.04em',
};

const TH: React.CSSProperties = {
  padding: 'var(--s2) var(--s4)', textAlign: 'left', fontFamily: 'var(--font-mono)',
  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
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
  fecha_inicio: string;
  fecha_fin: string;
}

const VACIO: FiltrosState = {
  rf_origen: '', tipo_evento: '', id_activo_biologico: '', clasificacion_biologica: '',
  resultado: '', severidad_log: '', fecha_inicio: '', fecha_fin: '',
};

function Row({ ev }: { ev: EventoAuditoriaResponse }) {
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
      <td style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px', maxWidth: 260 }}>
        {ev.descripcion ?? '—'}
        {ev.registro_incompleto && <div>{pill('INCOMPLETO', 'warning')}</div>}
      </td>
      <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }} title={ev.hash_integridad}>
        {ev.hash_integridad ? `${ev.hash_integridad.slice(0, 10)}…` : '—'}
      </td>
    </tr>
  );
}

export function AuditoriaM02View() {
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
      if (filtros.fecha_inicio) f.fecha_inicio = `${filtros.fecha_inicio}T00:00:00Z`;
      if (filtros.fecha_fin) f.fecha_fin = `${filtros.fecha_fin}T23:59:59Z`;
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
          <ArrowLeft size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
          Volver a la lista
        </Button>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <ShieldCheck size={20} aria-hidden />
          Auditoría y Trazabilidad
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
          Bitácora de eventos del módulo de activos biológicos
        </p>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        {/* Filtros */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--s4)', marginBottom: 'var(--s4)' }}>
          <div><label style={LABEL} htmlFor="a-rf">RF origen</label><input id="a-rf" style={INPUT} placeholder="Ej: RF40" value={filtros.rf_origen} onChange={set('rf_origen')} /></div>
          <div><label style={LABEL} htmlFor="a-tipo">Tipo de evento</label><input id="a-tipo" style={INPUT} value={filtros.tipo_evento} onChange={set('tipo_evento')} /></div>
          <div><label style={LABEL} htmlFor="a-id">ID activo</label><input id="a-id" type="number" style={INPUT} value={filtros.id_activo_biologico} onChange={set('id_activo_biologico')} /></div>
          <div><label style={LABEL} htmlFor="a-clas">Clasificación</label><input id="a-clas" style={INPUT} value={filtros.clasificacion_biologica} onChange={set('clasificacion_biologica')} /></div>
          <div>
            <label style={LABEL} htmlFor="a-res">Resultado</label>
            <select id="a-res" style={INPUT} value={filtros.resultado} onChange={set('resultado')}>
              <option value="">Todos</option>
              <option value="EXITOSO">Exitoso</option>
              <option value="FALLIDO">Fallido</option>
            </select>
          </div>
          <div>
            <label style={LABEL} htmlFor="a-sev">Severidad</label>
            <select id="a-sev" style={INPUT} value={filtros.severidad_log} onChange={set('severidad_log')}>
              <option value="">Todas</option>
              <option value="INFO">Info</option>
              <option value="WARNING">Warning</option>
              <option value="ERROR">Error</option>
            </select>
          </div>
          <div><label style={LABEL} htmlFor="a-desde">Desde</label><input id="a-desde" type="date" style={INPUT} value={filtros.fecha_inicio} onChange={set('fecha_inicio')} /></div>
          <div><label style={LABEL} htmlFor="a-hasta">Hasta</label><input id="a-hasta" type="date" style={INPUT} value={filtros.fecha_fin} onChange={set('fecha_fin')} /></div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s5)' }}>
          <Button variant="primary" size="sm" onClick={() => consultar(1)}>
            <Search size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
            Aplicar filtros
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setFiltros(VACIO); cargar({ pagina: 1, page_size: 20 }); }}>
            Limpiar
          </Button>
        </div>

        {error && (
          <Alert
            variant={error.status === 403 ? 'warning' : 'error'}
            title={error.status === 403 ? 'Sin acceso a la auditoría' : 'Error al cargar la bitácora'}
            description={error.message}
            style={{ marginBottom: 'var(--s4)' }}
          />
        )}

        {loading ? (
          <div style={{ height: 200, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }}>
            <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
          </div>
        ) : registros.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Sin registros de auditoría para los filtros seleccionados.</p>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
                  {['Fecha', 'RF', 'Evento', 'Activo', 'Resultado', 'Severidad', 'Descripción', 'Hash'].map((h) => <th key={h} style={TH}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {registros.map((ev) => <Row key={ev.id_bitacora} ev={ev} />)}
              </tbody>
            </table>
          </div>
        )}

        <Paginacion
          pagina={paginacion.pagina}
          totalPaginas={paginacion.totalPaginas}
          totalRegistros={paginacion.totalRegistros}
          onCambiar={consultar}
        />
      </div>
    </div>
  );
}

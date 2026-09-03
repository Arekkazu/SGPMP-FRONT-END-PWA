import React, { useCallback, useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Gauge, AlertTriangle } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { useIndicadores } from '../hooks/useIndicadores';
import type { IndicadorZootecnicoResponse, TipoIndicador, ConsultarIndicadoresFiltros } from '../types';

interface Props {
  idActivo: number;
}

const CARD: React.CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--r-lg)',
  padding: 'var(--s5)',
};

const SELECT: React.CSSProperties = {
  padding: 'var(--s2) var(--s3)', borderRadius: 'var(--r-md)', border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: '13px', height: 38,
};

const LABEL: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
  marginBottom: 'var(--s1)', textTransform: 'uppercase', letterSpacing: '0.04em',
};

const TIPOS: TipoIndicador[] = ['TODOS', 'CRECIMIENTO', 'PRODUCCION', 'SANITARIO', 'EFICIENCIA'];

function IndicadorCard({ ind }: { ind: IndicadorZootecnicoResponse }) {
  const { t } = useT('biologicalAssets');
  return (
    <div
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--s5)',
        opacity: ind.disponible ? 1 : 0.6,
      }}
    >
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
        {ind.tipo}
      </div>
      {ind.disponible ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s2)', marginTop: 'var(--s2)' }}>
          <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {ind.valor ?? '—'}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{ind.unidad}</span>
        </div>
      ) : (
        <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: 'var(--s2)' }}>{t('indicadoressection.no_disponible')}</div>
      )}
      {(ind.periodo_inicio || ind.periodo_fin) && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 'var(--s2)' }}>
          {ind.periodo_inicio ?? '…'} → {ind.periodo_fin ?? '…'}
        </div>
      )}
    </div>
  );
}

export function IndicadoresSection({ idActivo }: Props) {
  const { t } = useT('biologicalAssets');
  const { data, loading, error, cargar } = useIndicadores(idActivo);
  const [tipo, setTipo] = useState<TipoIndicador>('TODOS');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const consultar = useCallback(() => {
    const filtros: ConsultarIndicadoresFiltros = { tipo_indicador: tipo };
    if (fechaInicio) filtros.fecha_inicio = fechaInicio;
    if (fechaFin) filtros.fecha_fin = fechaFin;
    cargar(filtros);
  }, [tipo, fechaInicio, fechaFin, cargar]);

  useEffect(() => { consultar(); }, [consultar]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
      <div style={CARD}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>
          <Gauge size={16} aria-hidden />{t('indicadoressection.indicadores_zootecnicos')}</h3>
        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={LABEL} htmlFor="ind-tipo">{t('indicadoressection.tipo')}</label>
            <select id="ind-tipo" style={SELECT} value={tipo} onChange={(e) => setTipo(e.target.value as TipoIndicador)}>
              {TIPOS.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL} htmlFor="ind-desde">{t('indicadoressection.desde')}</label>
            <input id="ind-desde" type="date" style={{ ...SELECT, minWidth: 150 }} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </div>
          <div>
            <label style={LABEL} htmlFor="ind-hasta">{t('indicadoressection.hasta')}</label>
            <input id="ind-hasta" type="date" style={{ ...SELECT, minWidth: 150 }} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </div>
        </div>
      </div>

      {error && <Alert variant="error" title={t('indicadoressection.error_al_cargar_indicadores')} description={error.message} />}

      {data && data.advertencias.length > 0 && (
        <div style={{ background: 'var(--sem-warning-bg)', border: '1px solid var(--sem-warning-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', color: 'var(--sem-warning)', fontWeight: 600, fontSize: '13px', marginBottom: 'var(--s2)' }}>
            <AlertTriangle size={15} aria-hidden />{t('indicadoressection.advertencias')}</div>
          <ul style={{ margin: 0, paddingLeft: 'var(--s5)', color: 'var(--text-secondary)', fontSize: '13px' }}>
            {data.advertencias.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--s4)' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 110, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : !data || data.indicadores.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{t('indicadoressection.no_hay_indicadores_para_los_filtros')}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--s4)' }}>
          {data.indicadores.map((ind, i) => <IndicadorCard key={i} ind={ind} />)}
        </div>
      )}
    </div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { useDatosConsolidados } from '../hooks/useDatosConsolidados';
import { Paginacion } from './Paginacion';
import type { DatosConsolidadosFiltros } from '../types';

interface Props {
  idActivo: number;
}

type TipoDato = 'todos' | 'eventos' | 'fases' | 'estado' | 'metricas';

const CARD: React.CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--r-lg)',
  padding: 'var(--s5)',
};

const CARD_TITLE: React.CSSProperties = {
  fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 var(--s4)',
};

const SELECT: React.CSSProperties = {
  padding: 'var(--s2) var(--s3)', borderRadius: 'var(--r-md)', border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: '13px', height: 38,
};

const LABEL: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
  marginBottom: 'var(--s1)', textTransform: 'uppercase', letterSpacing: '0.04em',
};

function DictList({ items, vacio }: { items: Record<string, unknown>[]; vacio: string }) {
  if (!items || items.length === 0) {
    return <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{vacio}</p>;
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
      {items.map((it, i) => (
        <li key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: 'var(--s2) var(--s3)', background: 'var(--surface-hover)', borderRadius: 'var(--r-md)' }}>
          {Object.entries(it).filter(([, v]) => v != null && v !== '').slice(0, 6).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') || '—'}
        </li>
      ))}
    </ul>
  );
}

export function DatosAnaliticosSection({ idActivo }: Props) {
  const { data, loading, error, cargar } = useDatosConsolidados(idActivo);
  const [tipoDato, setTipoDato] = useState<TipoDato>('todos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const consultar = useCallback(
    (pagina: number) => {
      const filtros: DatosConsolidadosFiltros = { tipo_dato: tipoDato, pagina, page_size: 20 };
      if (fechaInicio) filtros.fecha_inicio = fechaInicio;
      if (fechaFin) filtros.fecha_fin = fechaFin;
      cargar(filtros);
    },
    [tipoDato, fechaInicio, fechaFin, cargar]
  );

  useEffect(() => { consultar(1); }, [consultar]);

  const mostrar = (seccion: 'eventos' | 'fases' | 'estado' | 'metricas') =>
    tipoDato === 'todos' || tipoDato === seccion;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
      <div style={CARD}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>
          <BarChart3 size={16} aria-hidden />
          Datos consolidados
        </h3>
        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={LABEL} htmlFor="dc-tipo">Tipo de dato</label>
            <select id="dc-tipo" style={SELECT} value={tipoDato} onChange={(e) => setTipoDato(e.target.value as TipoDato)}>
              <option value="todos">Todos</option>
              <option value="eventos">Eventos</option>
              <option value="fases">Fases</option>
              <option value="estado">Estado</option>
              <option value="metricas">Métricas</option>
            </select>
          </div>
          <div>
            <label style={LABEL} htmlFor="dc-desde">Desde</label>
            <input id="dc-desde" type="date" style={{ ...SELECT, minWidth: 150 }} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </div>
          <div>
            <label style={LABEL} htmlFor="dc-hasta">Hasta</label>
            <input id="dc-hasta" type="date" style={{ ...SELECT, minWidth: 150 }} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </div>
        </div>
      </div>

      {error && <Alert variant="error" title="Error al cargar datos consolidados" description={error.message} />}

      {loading ? (
        <div style={{ height: 160, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }}>
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : !data ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Sin datos.</p>
      ) : (
        <>
          {mostrar('metricas') && (
            <div style={CARD}>
              <h4 style={CARD_TITLE}>Métricas actuales</h4>
              {Object.keys(data.metricas_actuales ?? {}).length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Sin métricas.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--s4)' }}>
                  {Object.entries(data.metricas_actuales).map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{k}</div>
                      <div style={{ fontSize: '15px', color: 'var(--text-primary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{String(v)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {mostrar('eventos') && (
            <div style={CARD}>
              <h4 style={CARD_TITLE}>Historial de eventos</h4>
              <DictList items={data.historial_eventos} vacio="Sin eventos." />
            </div>
          )}
          {mostrar('fases') && (
            <div style={CARD}>
              <h4 style={CARD_TITLE}>Historial de fases</h4>
              <DictList items={data.historial_fases} vacio="Sin fases." />
            </div>
          )}
          {mostrar('estado') && (
            <div style={CARD}>
              <h4 style={CARD_TITLE}>Histórico de estados</h4>
              <DictList items={data.historico_estados} vacio="Sin cambios de estado." />
            </div>
          )}

          <Paginacion
            pagina={data.pagina_actual}
            totalPaginas={data.total_paginas}
            totalRegistros={data.total_registros}
            onCambiar={consultar}
          />
        </>
      )}
    </div>
  );
}

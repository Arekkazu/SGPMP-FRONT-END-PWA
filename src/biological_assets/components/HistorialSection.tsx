import React, { useCallback, useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { History } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { useHistorial } from '../hooks/useHistorial';
import { Paginacion } from './Paginacion';
import type { CategoriaHistorial, ConsultarHistorialFiltros } from '../types';

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
  padding: 'var(--s2) var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  height: 38,
};

const INPUT_DATE: React.CSSProperties = { ...SELECT, minWidth: 150 };

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

const CATEGORIAS: CategoriaHistorial[] = [
  'ESTADO', 'FASE', 'EVENTO_BIOLOGICO', 'CRECIMIENTO', 'SANITARIO',
  'REPRODUCTIVO', 'PRODUCTIVO', 'BAJA', 'TRANSFERENCIA',
];

export function HistorialSection({ idActivo }: Props) {
  const { t } = useT('biologicalAssets');
  const { registros, paginacion, loading, error, cargar } = useHistorial(idActivo);
  const [categoria, setCategoria] = useState<'' | CategoriaHistorial>('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const consultar = useCallback(
    (pagina: number) => {
      const filtros: ConsultarHistorialFiltros = { pagina, page_size: 20 };
      if (categoria) filtros.categoria_evento = categoria;
      if (fechaInicio) filtros.fecha_inicio = fechaInicio;
      if (fechaFin) filtros.fecha_fin = fechaFin;
      cargar(filtros);
    },
    [categoria, fechaInicio, fechaFin, cargar]
  );

  useEffect(() => { consultar(1); }, [consultar]);

  return (
    <div style={CARD}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>
        <History size={16} aria-hidden />{t('historialsection.historial_consolidado')}</h3>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 'var(--s5)' }}>
        <div>
          <label style={LABEL} htmlFor="hist-cat">{t('historialsection.categoria')}</label>
          <select id="hist-cat" style={SELECT} value={categoria} onChange={(e) => setCategoria(e.target.value as '' | CategoriaHistorial)}>
            <option value="">{t('historialsection.todas')}</option>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="hist-desde">{t('historialsection.desde')}</label>
          <input id="hist-desde" type="date" style={INPUT_DATE} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        </div>
        <div>
          <label style={LABEL} htmlFor="hist-hasta">{t('historialsection.hasta')}</label>
          <input id="hist-hasta" type="date" style={INPUT_DATE} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
        </div>
      </div>

      {error && <Alert variant="error" title={t('historialsection.error_al_cargar_el_historial')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

      {loading ? (
        <div style={{ height: 120, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }}>
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : registros.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>{t('historialsection.sin_registros_para_los_filtros_seleccionados')}</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
                {['Fecha', 'Categoría', 'Descripción', 'Responsable', 'Origen'].map((h) => <th key={h} style={TH}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {registros.map((r, i) => (
                <tr key={i} style={{ background: 'var(--surface-card)' }}>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {r.fecha_evento?.slice(0, 10)}
                  </td>
                  <td style={TD}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--surface-hover)', padding: '2px var(--s2)', borderRadius: 'var(--r-full)', whiteSpace: 'nowrap' }}>
                      {r.categoria}
                    </span>
                  </td>
                  <td style={{ ...TD, color: 'var(--text-primary)' }}>{r.descripcion}</td>
                  <td style={{ ...TD, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.usuario_responsable}</td>
                  <td style={{ ...TD, color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>{r.modulo_origen}</td>
                </tr>
              ))}
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
  );
}

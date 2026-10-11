import React, { useCallback, useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { FECHA_NUMERICA, formatearFecha } from '../../shared/i18n/formato';
import { errorServidor } from './formControls';
import { History } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { useHistorial } from '../hooks/useHistorial';
import { Paginacion } from './Paginacion';
import { humanizar } from '../../shared/lib/etiquetas';
import type { CategoriaHistorial, ConsultarHistorialFiltros, RegistroHistorialResponse } from '../types';

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
  fontSize: 'var(--fs-body-md)',
  height: 38,
};

const INPUT_DATE: React.CSSProperties = { ...SELECT, minWidth: 150 };

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

const CATEGORIAS: CategoriaHistorial[] = [
  'ESTADO', 'FASE', 'EVENTO_BIOLOGICO', 'CRECIMIENTO', 'SANITARIO',
  'REPRODUCTIVO', 'PRODUCTIVO', 'BAJA', 'TRANSFERENCIA',
];

const texto = (v: unknown): string => (v == null || v === '' ? '' : String(v));

/**
 * M2-05 / #298 §6.1-6.2: la vista solo trae `detalle_1`/`detalle_2` y, en las
 * fases, una `observacion` técnica (`duracion_dias=3650, es_activa=true`). Se
 * arma una frase legible; la nota que escribió el usuario se agrega al final.
 */
export function describirRegistro(r: RegistroHistorialResponse, etiquetaReproductiva: (c: string) => string = humanizar): string {
  const d = r.detalle_especifico ?? {};
  const d1 = texto(d.detalle_1);
  const d2 = texto(d.detalle_2);
  const nota = r.categoria === 'FASE_PRODUCTIVA' ? '' : texto(r.descripcion);
  const partes: Record<string, string> = {
    ESTADO: d1 && d2 ? `${humanizar(d1)} → ${humanizar(d2)}` : '',
    FASE_PRODUCTIVA: d1 ? `${d1}${d2 ? ` (${d2.toLowerCase()})` : ''}` : '',
    SANITARIO: [d1, d2].filter(Boolean).join(' · '),
    CRECIMIENTO: d1 ? `${humanizar(d1)}: ${d2}` : '',
    PRODUCTIVO: d1 ? `${d1}: ${d2}` : '',
    REPRODUCTIVO: d1 ? `${etiquetaReproductiva(d1)}${d2 ? ` · ${humanizar(d2)}` : ''}` : '',
    INGRESO: d1 ? `${humanizar(d1)}: ${d2}` : '',
    INDICADOR: humanizar(d1),
    BAJA: texto(d.tipo) ? `${humanizar(texto(d.tipo))}${texto(d.cantidad_afectada) ? ` · ${texto(d.cantidad_afectada)}` : ''}` : '',
    TRANSFERENCIA: texto(d.infraestructura_origen) ? `${texto(d.infraestructura_origen)} → ${texto(d.infraestructura_destino)}` : '',
  };
  return [partes[r.categoria] ?? '', nota].filter(Boolean).join(' — ') || '—';
}

export function HistorialSection({ idActivo }: Props) {
  const { t } = useT('biologicalAssets');
  const categoriaLegible = (c: string) => t(`historialsection.cat_${c.toLowerCase()}`, { defaultValue: humanizar(c) });
  const reproductiva = (c: string) => t(`eventoreproductivoform.${c.toLowerCase()}`, { defaultValue: humanizar(c) });
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
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>
        <History size={16} aria-hidden />{t('historialsection.historial_consolidado')}</h2>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 'var(--s5)' }}>
        <div>
          <label style={LABEL} htmlFor="hist-cat">{t('historialsection.categoria')}</label>
          <select id="hist-cat" style={SELECT} value={categoria} onChange={(e) => setCategoria(e.target.value as '' | CategoriaHistorial)}>
            <option value="">{t('historialsection.todas')}</option>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{categoriaLegible(c)}</option>)}
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="hist-desde">{t('historialsection.desde')}</label>
          <input
            id="hist-desde" type="date" style={INPUT_DATE} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
            aria-invalid={!!errorServidor(error, 'fecha_inicio')}
            aria-describedby={errorServidor(error, 'fecha_inicio') ? 'hist-error' : undefined}
          />
        </div>
        <div>
          <label style={LABEL} htmlFor="hist-hasta">{t('historialsection.hasta')}</label>
          <input
            id="hist-hasta" type="date" style={INPUT_DATE} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
            aria-invalid={!!errorServidor(error, 'fecha_fin')}
            aria-describedby={errorServidor(error, 'fecha_fin') ? 'hist-error' : undefined}
          />
        </div>
      </div>

      {error && <Alert id="hist-error" variant="error" title={t('historialsection.error_al_cargar_el_historial')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

      {loading ? (
        <div style={{ height: 120, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }}>
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : error ? null : registros.length === 0 ? (
        <p role="status" style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-body-md)', margin: 0 }}>{t('historialsection.sin_registros_para_los_filtros_seleccionados')}</p>
      ) : (
        <ScrollRegion label={t('historialsection.historial_consolidado')}>
          <table aria-label={t('historialsection.historial_consolidado')} style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-body-md)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
                {['Fecha', 'Categoría', 'Descripción', 'Responsable'].map((h) => <th key={h} scope="col" style={TH}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {registros.map((r, i) => (
                <tr key={i} style={{ background: 'var(--surface-card)' }}>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {formatearFecha(r.fecha_evento, FECHA_NUMERICA)}
                  </td>
                  <td style={TD}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--surface-hover)', padding: '2px var(--s2)', borderRadius: 'var(--r-full)', whiteSpace: 'nowrap' }}>
                      {categoriaLegible(r.categoria)}
                    </span>
                  </td>
                  <td style={{ ...TD, color: 'var(--text-primary)' }}>{describirRegistro(r, reproductiva)}</td>
                  <td style={{ ...TD, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.usuario_responsable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      )}

      {!error && <Paginacion
        pagina={paginacion.pagina}
        totalPaginas={paginacion.totalPaginas}
        totalRegistros={paginacion.totalRegistros}
        onCambiar={consultar}
      />}
    </div>
  );
}

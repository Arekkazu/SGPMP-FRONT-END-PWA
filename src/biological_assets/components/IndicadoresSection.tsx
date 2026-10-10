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
  background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: 'var(--fs-body-md)', height: 38,
};

const LABEL: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
  marginBottom: 'var(--s1)', textTransform: 'uppercase', letterSpacing: '0.04em',
};

const TIPOS: TipoIndicador[] = ['TODOS', 'CRECIMIENTO', 'PRODUCCION', 'SANITARIO', 'EFICIENCIA'];

// TC-DIS-140: el backend nombra indicadores y causas con claves internas
// (`ganancia_peso`, `DATOS_INSUFICIENTES: ...`); al usuario se le muestra texto.
const INDICADORES = ['ganancia_peso', 'conversion_alimenticia', 'produccion_promedio', 'tasa_morbilidad', 'tasa_mortalidad'];
const CAUSAS = ['DATOS_INSUFICIENTES', 'NO_APLICA_INDIVIDUAL', 'OUTLIER_CRITICO'];

function useTextoLegible() {
  const { t } = useT('biologicalAssets');
  const nombre = (clave: string) => t(`indicadoressection.ind_${clave}`, { defaultValue: clave.replace(/_/g, ' ') });
  // TC-DIS-141: el backend manda unidades compuestas como `kg_alimento/kg_ganancia`.
  const unidad = (crudo: string) => t(`indicadoressection.unidad_${crudo.replace(/\W+/g, '_')}`, {
    defaultValue: crudo.replace(/_/g, ' ').replace(/\//g, ' / '),
  });
  const texto = (crudo: string) => {
    let s = crudo.replace(/\b\w+_\w+\/\w+_\w+\b/g, unidad);
    for (const c of CAUSAS) s = s.replace(new RegExp(`^${c}:\\s*`), `${t(`indicadoressection.causa_${c.toLowerCase()}`)}: `);
    for (const k of INDICADORES) s = s.replace(new RegExp(`\\b${k}\\b`, 'g'), nombre(k).toLowerCase());
    return s;
  };
  return { nombre, unidad, texto };
}

// Una fecha tecleada a mano pasa por años parciales (0002, 0020, 0202...).
const fechaCompleta = (f: string) => f === '' || f >= '1900-01-01';

function IndicadorCard({ ind }: { ind: IndicadorZootecnicoResponse }) {
  const { t } = useT('biologicalAssets');
  const { nombre, unidad } = useTextoLegible();
  return (
    <dl
      style={{
        background: 'var(--surface-card)',
        border: `1px ${ind.disponible ? 'solid' : 'dashed'} var(--surface-border)`,
        borderRadius: 'var(--r-lg)',
        padding: 'var(--s5)',
        margin: 0,
      }}
    >
      <dt style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
        {nombre(ind.tipo)}
      </dt>
      {ind.disponible ? (
        <dd style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s2)', margin: 'var(--s2) 0 0' }}>
          <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {ind.valor ?? '—'}
          </span>
          <span style={{ fontSize: 'var(--fs-body-md)', color: 'var(--text-secondary)' }}>{ind.unidad ? unidad(ind.unidad) : null}</span>
        </dd>
      ) : (
        <dd style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 'var(--s2) 0 0' }}>{t('indicadoressection.no_disponible')}</dd>
      )}
      {(ind.periodo_inicio || ind.periodo_fin) && (
        <dd style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', margin: 'var(--s2) 0 0' }}>
          {ind.periodo_inicio ?? '…'} → {ind.periodo_fin ?? '…'}
        </dd>
      )}
    </dl>
  );
}

export function IndicadoresSection({ idActivo }: Props) {
  const { t } = useT('biologicalAssets');
  const { data, loading, error, cargar } = useIndicadores(idActivo);
  const [tipo, setTipo] = useState<TipoIndicador>('TODOS');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const { texto } = useTextoLegible();

  const consultar = useCallback(() => {
    const filtros: ConsultarIndicadoresFiltros = { tipo_indicador: tipo };
    if (fechaInicio) filtros.fecha_inicio = fechaInicio;
    if (fechaFin) filtros.fecha_fin = fechaFin;
    cargar(filtros);
  }, [tipo, fechaInicio, fechaFin, cargar]);

  // TC-DIS-140: una consulta por tecla saturaba el backend; se espera a que el filtro se asiente.
  useEffect(() => {
    if (!fechaCompleta(fechaInicio) || !fechaCompleta(fechaFin)) return;
    const temporizador = setTimeout(consultar, 400);
    return () => clearTimeout(temporizador);
  }, [consultar, fechaInicio, fechaFin]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
      <div style={CARD}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>
          <Gauge size={16} aria-hidden />{t('indicadoressection.indicadores_zootecnicos')}</h2>
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

      {/* TC-DIS-140/141: el 422 de muestra insuficiente es informativo (warning) y un 5xx no muestra detalle técnico. */}
      {error && (
        <Alert
          variant={error.status >= 500 ? 'error' : 'warning'}
          title={t('indicadoressection.error_al_cargar_indicadores')}
          description={error.status >= 500 ? t('errores.generico', { ns: 'common' }) : texto(error.message)}
        />
      )}

      {data && data.advertencias.length > 0 && (
        <div role="status" style={{ background: 'var(--sem-warning-bg)', border: '1px solid var(--sem-warning-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', color: 'var(--sem-warning)', fontWeight: 600, fontSize: 'var(--fs-body-md)', marginBottom: 'var(--s2)' }}>
            <AlertTriangle size={15} aria-hidden />{t('indicadoressection.advertencias')}</div>
          <ul style={{ margin: 0, paddingLeft: 'var(--s5)', color: 'var(--text-secondary)', fontSize: 'var(--fs-body-md)' }}>
            {data.advertencias.map((a, i) => <li key={i}>{texto(a)}</li>)}
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
      ) : error ? null : !data || data.indicadores.length === 0 ? (
        <p role="status" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{t('indicadoressection.no_hay_indicadores_para_los_filtros')}</p>
      ) : (
        <div aria-live="polite" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--s4)' }}>
          {data.indicadores.map((ind, i) => <IndicadorCard key={i} ind={ind} />)}
        </div>
      )}
    </div>
  );
}

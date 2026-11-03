// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74: ICA vigente e historial por activo, cálculo bajo demanda y batch |
import React, { useState } from 'react';
import { Calculator, Search, Gauge as IconoGauge } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useT } from '../../shared/i18n/useT';
import { ACCION_E, ACCION_R, RECURSO_BATCH_ICA, RECURSO_ICA } from '../rbac';
import { useEficiencia } from '../hooks/useEficiencia';
import { useActivosSuministros } from '../hooks/useActivosSuministros';
import { formatoCantidad, formatoFecha } from '../lib/formato';
import { PERIODOS_ICA, type PeriodoEvaluacion, type ResultadoIca } from '../types';
import { EncabezadoVista } from '../components/EncabezadoVista';
import { EstadoVacio } from '../components/EstadoVacio';
import { EstadoRegistroBadge } from '../components/EstadoRegistroBadge';
import { SelectorActivo } from '../components/SelectorActivo';
import { BatchIcaPanel } from '../components/BatchIcaPanel';
import { FILTROS, PANEL, SECUNDARIO, TABLA, TD, TD_NUM, TH, TH_NUM } from '../components/estilos';

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt style={{ fontSize: 'var(--fs-label-md)', fontWeight: 600, color: 'var(--text-muted)' }}>{etiqueta}</dt>
      <dd style={{ margin: 'var(--s1) 0 0', fontSize: 'var(--fs-body-lg)', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{valor}</dd>
    </div>
  );
}

function ResultadoVigente({ r }: { r: ResultadoIca }) {
  const { t } = useT('supplies');
  const calculado = r.estado_resultado === 'CALCULADO' && r.ca_calculado !== null;
  return (
    <div style={{ display: 'flex', gap: 'var(--s6)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ flex: '0 0 auto', minWidth: 160 }}>
        <p style={{ margin: 0, fontSize: 'var(--fs-label-md)', fontWeight: 600, color: 'var(--text-muted)' }}>{t('ica.conversion')}</p>
        <p style={{ margin: 'var(--s1) 0 var(--s2)', fontSize: 'var(--fs-display-lg)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: 'var(--ls-tight)', fontVariantNumeric: 'tabular-nums', lineHeight: 'var(--lh-tight)' }}>
          {calculado ? formatoCantidad(r.ca_calculado, 2) : '—'}
        </p>
        <EstadoRegistroBadge estado={calculado && r.clasificacion_ca ? r.clasificacion_ca : r.estado_resultado} />
      </div>
      <dl style={{ flex: '1 1 320px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--s4)', margin: 0 }}>
        <Dato etiqueta={t('ica.alimento')} valor={r.alimento_consumido_total_kg ? `${formatoCantidad(r.alimento_consumido_total_kg)} kg` : '—'} />
        <Dato etiqueta={t('ica.ganancia')} valor={r.ganancia_peso_kg ? `${formatoCantidad(r.ganancia_peso_kg)} kg` : '—'} />
        <Dato etiqueta={t('ica.periodo')} valor={`${formatoFecha(r.fecha_inicio_periodo)} – ${formatoFecha(r.fecha_fin_periodo)}`} />
        <Dato etiqueta={t('ica.calidad')} valor={`${r.data_quality_score} %`} />
      </dl>
      {r.causa_no_calculo && <Alert variant="warning" title={t('ica.no_calculable')} description={r.mensaje ?? r.causa_no_calculo} style={{ flexBasis: '100%' }} />}
    </div>
  );
}

export function EficienciaView() {
  const { t } = useT('supplies');
  const puedeLeer = usePermission(RECURSO_ICA, ACCION_R);
  const puedeCalcular = usePermission(RECURSO_ICA, ACCION_E);
  const puedeVerBatch = usePermission(RECURSO_BATCH_ICA, ACCION_R);
  const online = useOnlineStatus();
  const { activos, cargando: cargandoActivos } = useActivosSuministros();
  const { vigente, historial, calculo } = useEficiencia();
  const [texto, setTexto] = useState('');
  const [idActivo, setIdActivo] = useState<number | null>(null);
  const [periodo, setPeriodo] = useState<PeriodoEvaluacion>('MENSUAL');
  const [consultado, setConsultado] = useState<{ id: number; periodo: PeriodoEvaluacion } | null>(null);
  const [errorActivo, setErrorActivo] = useState<string>();

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.eficiencia')} />;

  const consultar = (id: number, p: PeriodoEvaluacion) => {
    setConsultado({ id, periodo: p });
    vigente.ejecutar(id, p);
    historial.ejecutar(id, p);
  };
  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (idActivo === null) { setErrorActivo(t('comun.activo_requerido')); return; }
    setErrorActivo(undefined);
    calculo.limpiar();
    consultar(idActivo, periodo);
  };
  const calcular = async () => {
    if (!consultado) return;
    if (await calculo.ejecutar(consultado.id, consultado.periodo)) consultar(consultado.id, consultado.periodo);
  };

  const v = vigente.data;
  const filas = historial.data?.items ?? [];

  return (
    <>
      <EncabezadoVista titulo={t('ica.titulo')} descripcion={t('ica.descripcion')} />
      <form onSubmit={buscar} style={{ ...FILTROS, marginBottom: 'var(--s5)' }}>
        <SelectorActivo id="ica-activo" activos={activos} cargando={cargandoActivos} value={texto} required error={errorActivo} onChange={(x, id) => { setTexto(x); setIdActivo(id); }} />
        <Select id="ica-periodo" label={t('ica.periodo_evaluacion')} value={periodo} onChange={(e) => setPeriodo(e.target.value as PeriodoEvaluacion)}>
          {PERIODOS_ICA.map((p) => <option key={p} value={p}>{t(`periodo.${p}`)}</option>)}
        </Select>
        <div style={{ paddingBottom: 'var(--s1)' }}>
          <Button type="submit" variant="secondary" size="md" loading={vigente.cargando}><Search size={16} aria-hidden />{t('comun.consultar')}</Button>
        </div>
      </form>

      {!consultado ? (
        <EstadoVacio icono={<IconoGauge size={28} aria-hidden />} titulo={t('ica.vacio_titulo')} detalle={t('ica.vacio_detalle')} />
      ) : (
        <>
          <section aria-labelledby="ica-vigente" style={PANEL}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s3)', flexWrap: 'wrap', marginBottom: 'var(--s4)' }}>
              <h2 id="ica-vigente" style={{ margin: 0, fontSize: 'var(--fs-heading-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('ica.vigente', { periodo: t(`periodo.${consultado.periodo}`) })}
              </h2>
              {puedeCalcular && (
                <Button variant="primary" size="sm" disabled={!online} loading={calculo.cargando} onClick={calcular}>
                  <Calculator size={16} aria-hidden />{t('ica.calcular')}
                </Button>
              )}
            </div>
            {calculo.error && <Alert variant="warning" title={calculo.error.message} style={{ marginBottom: 'var(--s4)' }} />}
            {vigente.error && <Alert variant="error" title={vigente.error.message} />}
            {v && (v.tiene_resultado && v.resultado
              ? <ResultadoVigente r={v.resultado} />
              : <p style={{ ...SECUNDARIO, margin: 0, fontSize: 'var(--fs-body-md)' }}>{v.mensaje ?? t('ica.sin_resultado')}</p>)}
          </section>

          <h2 style={{ margin: 'var(--s7) 0 var(--s3)', fontSize: 'var(--fs-heading-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{t('ica.historial')}</h2>
          {historial.error && <Alert variant="error" title={historial.error.message} />}
          {filas.length === 0 ? (
            <p style={{ ...SECUNDARIO, fontSize: 'var(--fs-body-md)' }}>{historial.cargando ? t('comun.cargando') : t('ica.historial_vacio')}</p>
          ) : (
            <ScrollRegion label={t('ica.historial')}>
              <table style={TABLA} aria-busy={historial.cargando}>
                <thead>
                  <tr>
                    <th style={TH}>{t('ica.periodo')}</th>
                    <th style={TH_NUM}>{t('ica.conversion_corta')}</th>
                    <th style={TH}>{t('ica.clasificacion')}</th>
                    <th style={TH_NUM}>{t('ica.calidad')}</th>
                    <th style={TH}>{t('ica.tipo_calculo')}</th>
                    <th style={TH}>{t('ica.calculado')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((r) => (
                    <tr key={r.id_resultado_ica ?? `${r.fecha_inicio_periodo}-${r.intento}`}>
                      <td style={TD}>
                        {formatoFecha(r.fecha_inicio_periodo)} – {formatoFecha(r.fecha_fin_periodo)}
                        {r.es_vigente && <div style={{ ...SECUNDARIO, color: 'var(--brand-600)', fontWeight: 600 }}>{t('ica.es_vigente')}</div>}
                      </td>
                      <td style={TD_NUM}>{r.ca_calculado !== null ? formatoCantidad(r.ca_calculado, 2) : '—'}</td>
                      <td style={TD}><EstadoRegistroBadge estado={r.clasificacion_ca ?? r.estado_resultado} /></td>
                      <td style={TD_NUM}>{r.data_quality_score} %</td>
                      <td style={TD}>{t(`ica.tipo_${r.tipo_calculo}`, { defaultValue: r.tipo_calculo })}</td>
                      <td style={TD}>{formatoFecha(r.fecha_calculo, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollRegion>
          )}
        </>
      )}

      {puedeVerBatch && <BatchIcaPanel online={online} />}
    </>
  );
}

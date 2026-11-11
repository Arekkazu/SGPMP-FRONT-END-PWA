// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74: ICA vigente e historial por activo, cálculo bajo demanda y batch |
// | 2026-11-10 | Arekkazu | TC-DIS-198/200 RF-74: alerta anunciada al quedar en Crítica, foco sobre el resultado y detalle por cálculo |
import React, { useRef, useState } from 'react';
import { Calculator, Eye, Search, Gauge as IconoGauge } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { ModalShell } from '../../shared/design-system/ModalShell';
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

const calculado = (r: ResultadoIca) => r.estado_resultado === 'CALCULADO' && r.ca_calculado !== null;

function ResultadoVigente({ r }: { r: ResultadoIca }) {
  const { t } = useT('supplies');
  const ok = calculado(r);
  return (
    <div style={{ display: 'flex', gap: 'var(--s6)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ flex: '0 0 auto', minWidth: 160 }}>
        <p style={{ margin: 0, fontSize: 'var(--fs-label-md)', fontWeight: 600, color: 'var(--text-muted)' }}>{t('ica.conversion')}</p>
        <p style={{ margin: 'var(--s1) 0 var(--s2)', fontSize: 'var(--fs-display-lg)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: 'var(--ls-tight)', fontVariantNumeric: 'tabular-nums', lineHeight: 'var(--lh-tight)' }}>
          {ok ? formatoCantidad(r.ca_calculado, 2) : '—'}
        </p>
        <EstadoRegistroBadge estado={ok && r.clasificacion_ca ? r.clasificacion_ca : r.estado_resultado} />
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

/** Detalle de un cálculo puntual del historial (RF-74): mismos datos que el vigente, en un diálogo. */
function DetalleCalculoModal({ r, onCerrar }: { r: ResultadoIca; onCerrar: () => void }) {
  const { t } = useT('supplies');
  return (
    <ModalShell title={t('ica.detalle_titulo', { desde: formatoFecha(r.fecha_inicio_periodo), hasta: formatoFecha(r.fecha_fin_periodo) })} onClose={onCerrar}
      footer={<Button variant="secondary" size="md" onClick={onCerrar}>{t('comun.cerrar')}</Button>}>
      <ResultadoVigente r={r} />
      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--s4)', margin: 'var(--s5) 0 0' }}>
        <Dato etiqueta={t('ica.tipo_calculo')} valor={t(`ica.tipo_${r.tipo_calculo}`, { defaultValue: r.tipo_calculo })} />
        <Dato etiqueta={t('ica.calculado')} valor={formatoFecha(r.fecha_calculo, true)} />
        <Dato etiqueta={t('ica.intento')} valor={r.intento} />
        <Dato etiqueta={t('ica.es_vigente')} valor={r.es_vigente ? t('comun.si') : t('comun.no')} />
      </dl>
    </ModalShell>
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
  const [detalle, setDetalle] = useState<ResultadoIca | null>(null);
  const resultadoRef = useRef<HTMLElement>(null);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.eficiencia')} />;

  // Tras consultar o calcular, el foco queda sobre el resultado y no se pierde en <body> (WCAG 2.4.3).
  const consultar = async (id: number, p: PeriodoEvaluacion) => {
    setConsultado({ id, periodo: p });
    await Promise.all([vigente.ejecutar(id, p), historial.ejecutar(id, p)]);
    resultadoRef.current?.focus();
  };
  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (idActivo === null) { setErrorActivo(t('comun.activo_requerido')); return; }
    setErrorActivo(undefined);
    calculo.limpiar();
    void consultar(idActivo, periodo);
  };
  const calcular = async () => {
    if (!consultado) return;
    if (await calculo.ejecutar(consultado.id, consultado.periodo)) await consultar(consultado.id, consultado.periodo);
    else resultadoRef.current?.focus();
  };

  const v = vigente.data;
  const r = v?.tiene_resultado ? v.resultado : null;
  const critico = !!r && calculado(r) && r.clasificacion_ca === 'CRITICA';
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
          <section ref={resultadoRef} tabIndex={-1} aria-labelledby="ica-vigente" style={{ ...PANEL, outline: 'none' }}>
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
            {/* RF-74: un ICA mayor que 5 es Crítica y genera una alerta; se anuncia de inmediato (WCAG 4.1.3) sin mover el foco. */}
            {critico && r && (
              <Alert variant="error" title={t('ica.alerta_critica', { valor: formatoCantidad(r.ca_calculado, 2) })} description={t('ica.alerta_critica_detalle')} style={{ marginBottom: 'var(--s4)' }} />
            )}
            {v && (r
              ? <ResultadoVigente r={r} />
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
                    <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((x) => {
                    const etiqueta = `${formatoFecha(x.fecha_inicio_periodo)} – ${formatoFecha(x.fecha_fin_periodo)}`;
                    return (
                      <tr key={x.id_resultado_ica ?? `${x.fecha_inicio_periodo}-${x.intento}`}>
                        <td style={TD}>
                          {etiqueta}
                          {x.es_vigente && <div style={{ ...SECUNDARIO, color: 'var(--brand-600)', fontWeight: 600 }}>{t('ica.es_vigente')}</div>}
                        </td>
                        <td style={TD_NUM}>{x.ca_calculado !== null ? formatoCantidad(x.ca_calculado, 2) : '—'}</td>
                        <td style={TD}><EstadoRegistroBadge estado={x.clasificacion_ca ?? x.estado_resultado} /></td>
                        <td style={TD_NUM}>{x.data_quality_score} %</td>
                        <td style={TD}>{t(`ica.tipo_${x.tipo_calculo}`, { defaultValue: x.tipo_calculo })}</td>
                        <td style={TD}>{formatoFecha(x.fecha_calculo, true)}</td>
                        <td style={TD}>
                          <Button variant="ghost" size="sm" onClick={() => setDetalle(x)} aria-label={t('ica.ver_detalle_aria', { periodo: etiqueta })}>
                            <Eye size={16} aria-hidden />{t('comun.ver')}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollRegion>
          )}
        </>
      )}

      {detalle && <DetalleCalculoModal r={detalle} onCerrar={() => setDetalle(null)} />}
      {puedeVerBatch && <BatchIcaPanel online={online} />}
    </>
  );
}

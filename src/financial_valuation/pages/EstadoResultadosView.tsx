// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-93: estado de resultados del período con versiones, aprobación y descarga |
import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Download, Plus } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_C, ACCION_R, ACCION_U, R_CONFIGURACION, R_ESTADO_RESULTADOS } from '../rbac';
import type { Periodo } from '../types';
import {
  Datos, EncabezadoVista, EstadoBadge, EstadoVacio, ErrorApi, FILTROS, PANEL, SECUNDARIO, SelectorPeriodo, Subtitulo, TABLA, TD,
  TD_NUM, TH, TH_NUM, formatoFecha, formatoMoneda, guardarArchivo, useAsync,
} from '../components/comunes';

const INGRESOS = [
  'ganancia_reconocimiento_inicial', 'ganancia_transformacion_biologica', 'ganancia_precio_mercado',
  'ingresos_productos_agricolas', 'ganancia_ajustes_periodos_anteriores',
];
const GASTOS = [
  'perdida_reconocimiento_inicial', 'perdida_transformacion_biologica', 'perdida_precio_mercado', 'costos_mantenimiento',
  'inversiones_llevadas_a_gasto', 'bajas_activos', 'depreciacion_activos_costo', 'deterioro_activos_costo',
  'perdida_ajustes_periodos_anteriores',
];

export function EstadoResultadosView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_ESTADO_RESULTADOS, ACCION_R);
  const puedeGenerar = usePermissionPorNombre(R_ESTADO_RESULTADOS, ACCION_C);
  const puedeAprobar = usePermissionPorNombre(R_ESTADO_RESULTADOS, ACCION_U);
  const puedeVerConfig = usePermissionPorNombre(R_CONFIGURACION, ACCION_R);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [idEstado, setIdEstado] = useState<number | null>(null);
  const [especie, setEspecie] = useState('');
  const estados = useAsync(finanzasApi.estados);
  const detalle = useAsync(finanzasApi.estado);
  const generacion = useAsync(finanzasApi.generarEstado);
  const aprobacion = useAsync(finanzasApi.aprobarEstado);
  const descarga = useAsync(finanzasApi.descargarEstado);
  const config = useAsync(finanzasApi.configuracion);
  const { ejecutar: cargarEstados, limpiar: limpiarEstados } = estados;
  const { ejecutar: cargarDetalle, limpiar: limpiarDetalle } = detalle;
  const { ejecutar: cargarConfig } = config;
  const elegir = useCallback((id: number | null, _p: Periodo | null) => {
    setIdPeriodo(id); setIdEstado(null); limpiarEstados(); limpiarDetalle();
  }, [limpiarEstados, limpiarDetalle]);
  useEffect(() => { if (idPeriodo) cargarEstados(idPeriodo); }, [idPeriodo, cargarEstados]);
  useEffect(() => { if (estados.data?.length && idEstado === null) setIdEstado(estados.data[0].id_estado); }, [estados.data, idEstado]);
  useEffect(() => { if (idEstado) cargarDetalle(idEstado); }, [idEstado, cargarDetalle]);
  useEffect(() => { if (puedeVerConfig) cargarConfig(); }, [puedeVerConfig, cargarConfig]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.estado-resultados')} />;
  const e = detalle.data;
  const monto = (k: string) => (e?.componentes[k] as string | undefined) ?? '0';
  const nombreEspecie = (id: number | null | undefined) => config.data?.especies.find((x) => x.id_especie === id)?.especie ?? `#${id}`;

  const generar = async () => {
    if (!idPeriodo) return;
    const r = await generacion.ejecutar(idPeriodo, especie ? { id_especie: Number(especie) } : {});
    if (r) { pushToast('success', t('er.generado')); setIdEstado(r.id_estado); cargarEstados(idPeriodo); }
  };
  const aprobar = async () => {
    if (e && await aprobacion.ejecutar(e.id_estado)) { pushToast('success', t('er.aprobado')); cargarDetalle(e.id_estado); if (idPeriodo) cargarEstados(idPeriodo); }
  };
  const descargar = async (formato: 'pdf' | 'excel') => {
    const a = e && await descarga.ejecutar(e.id_estado, formato);
    if (a) guardarArchivo(a.blob, a.nombre);
  };

  const tablaComponentes = (claves: string[], titulo: string, total: string) => (
    <table style={TABLA}>
      <thead><tr><th style={TH}>{titulo}</th><th style={TH_NUM}>{t('col.valor')}</th></tr></thead>
      <tbody>
        {claves.map((k) => <tr key={k}><td style={TD}>{t(`er.c.${k}`)}</td><td style={TD_NUM}>{formatoMoneda(monto(k))}</td></tr>)}
        <tr><td style={{ ...TD, fontWeight: 700 }}>{t('er.total')}</td><td style={{ ...TD_NUM, fontWeight: 700 }}>{formatoMoneda(total)}</td></tr>
      </tbody>
    </table>
  );

  return (
    <>
      <EncabezadoVista titulo={t('er.titulo')} descripcion={t('er.descripcion')} />
      <div style={{ ...FILTROS, marginBottom: 'var(--s5)' }}>
        <SelectorPeriodo id="er-periodo" value={idPeriodo} onChange={elegir} autoseleccionar preferir="CERRADO" />
        {(estados.data ?? []).length > 0 && (
          <Select id="er-version" label={t('er.version')} value={idEstado ?? ''} onChange={(ev) => setIdEstado(Number(ev.target.value))}>
            {(estados.data ?? []).map((x) => (
              <option key={x.id_estado} value={x.id_estado}>
                V{x.version} · {t(`estado.${x.estado}`)} · {Object.values(x.filtros).some(Boolean) ? t('er.filtrado') : t('er.consolidado')}
              </option>
            ))}
          </Select>
        )}
        {puedeGenerar && idPeriodo && (
          <>
            {puedeVerConfig && (
              <Select id="er-especie" label={t('er.filtro_especie')} value={especie} onChange={(ev) => setEspecie(ev.target.value)}>
                <option value="">{t('comun.todas')}</option>
                {(config.data?.especies ?? []).map((x) => <option key={x.id_especie} value={x.id_especie}>{x.especie}</option>)}
              </Select>
            )}
            <div style={{ paddingBottom: 'var(--s1)' }}>
              <Button variant="secondary" size="md" loading={generacion.cargando} onClick={generar}><Plus size={16} aria-hidden />{t('er.generar')}</Button>
            </div>
          </>
        )}
      </div>
      <ErrorApi error={estados.error ?? detalle.error ?? generacion.error ?? aprobacion.error ?? descarga.error} />
      {!e ? (
        <EstadoVacio icono={<BarChart3 size={28} aria-hidden />} titulo={estados.cargando || detalle.cargando ? t('comun.cargando') : t('er.vacio_titulo')} detalle={t('er.vacio_detalle')} />
      ) : (
        <>
          <section style={PANEL} aria-label={t('er.resumen')}>
            <Datos filas={[
              [t('er.ingresos'), formatoMoneda(e.total_ingresos)], [t('er.gastos'), formatoMoneda(e.total_gastos)],
              [t('er.resultado'), <strong key="r" style={{ color: Number(e.resultado_neto) < 0 ? 'var(--sem-error)' : 'var(--sem-success)' }}>{formatoMoneda(e.resultado_neto)}</strong>],
              [t('col.estado'), <EstadoBadge key="s" estado={e.estado} />],
              [t('er.generado_el'), formatoFecha(e.fecha_generacion, true)],
              [t('er.filtros'), e.filtros.id_especie ? nombreEspecie(e.filtros.id_especie) : t('er.consolidado')],
            ]} />
            <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', marginTop: 'var(--s4)' }}>
              {e.estado === 'GENERADO' && puedeAprobar && (
                <Button variant="primary" size="sm" loading={aprobacion.cargando} onClick={aprobar}><CheckCircle2 size={14} aria-hidden />{t('er.aprobar')}</Button>
              )}
              {e.estado === 'APROBADO' && (
                <>
                  <Button variant="secondary" size="sm" loading={descarga.cargando} onClick={() => descargar('pdf')}><Download size={14} aria-hidden />PDF</Button>
                  <Button variant="secondary" size="sm" loading={descarga.cargando} onClick={() => descargar('excel')}><Download size={14} aria-hidden />Excel</Button>
                </>
              )}
            </div>
            {e.estado !== 'APROBADO' && <p style={{ ...SECUNDARIO, margin: 'var(--s3) 0 0' }}>{t('er.descarga_aprobado')}</p>}
          </section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--s5)', marginTop: 'var(--s5)' }}>
            <ScrollRegion label={t('er.ingresos')}>{tablaComponentes(INGRESOS, t('er.ingresos'), e.total_ingresos)}</ScrollRegion>
            <ScrollRegion label={t('er.gastos')}>{tablaComponentes(GASTOS, t('er.gastos'), e.total_gastos)}</ScrollRegion>
          </div>
          {Array.isArray(e.componentes.activos_excluidos_cierre) && e.componentes.activos_excluidos_cierre.length > 0 && (
            <>
              <Subtitulo>{t('er.excluidos')}</Subtitulo>
              <Alert variant="warning" title={t('er.excluidos_detalle', { count: e.componentes.activos_excluidos_cierre.length })} />
            </>
          )}
        </>
      )}
    </>
  );
}

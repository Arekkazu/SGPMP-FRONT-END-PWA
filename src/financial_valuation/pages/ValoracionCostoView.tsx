// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-05 | Arekkazu | M06 RF-88 prototipo: activos al costo y con precio estimado, sin el paso de valor razonable a costo (¶31) |
import React, { useEffect, useState } from 'react';
import { Scale } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { Badge } from '../../shared/design-system/Badge';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_R, R_COSTO_HISTORICO, R_PRECIOS, R_VALORACION } from '../rbac';
import type { ActivoValorado } from '../types';
import { sumar } from '../lib/decimal';
import { DetalleActivoModal } from '../components/DetalleActivoModal';
import {
  CeldaActivo, EncabezadoVista, ErrorApi, Indicadores, Listado, TABLA, TD, TD_NUM, TH, TH_NUM, formatoFecha, formatoMoneda, useAsync,
  useListado,
} from '../components/comunes';

type Metodo = 'COSTO' | 'ESTIMADO';
const metodo = (a: ActivoValorado): Metodo => (a.valorado_por_costo ? 'COSTO' : 'ESTIMADO');

export function ValoracionCostoView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_COSTO_HISTORICO, ACCION_R);
  const puedeVerActivos = usePermissionPorNombre(R_VALORACION, ACCION_R);
  const puedeVerPrecios = usePermissionPorNombre(R_PRECIOS, ACCION_R);
  const activos = useAsync(finanzasApi.activos);
  const precios = useAsync(finanzasApi.precios);
  const [detalle, setDetalle] = useState<ActivoValorado | null>(null);
  const { ejecutar: cargar } = activos;
  const { ejecutar: cargarPrecios } = precios;
  useEffect(() => { if (puedeLeer && puedeVerActivos) cargar(); }, [puedeLeer, puedeVerActivos, cargar]);
  useEffect(() => { if (puedeLeer && puedeVerPrecios) cargarPrecios(); }, [puedeLeer, puedeVerPrecios, cargarPrecios]);

  // NIC 41 ¶30: con precio fiable el activo al costo DEBE pasar a valor razonable; se avisa por activo.
  const conPrecio = new Set((precios.data ?? []).filter((p) => p.estado === 'ACTIVO').map((p) => p.id_especie));
  const filas = (activos.data ?? []).filter((a) => a.valorado_por_costo || a.tiene_valor_estimado);
  const l = useListado(filas, (a) => `${a.identificador} ${a.especie} ${a.finca}`, [
    { id: 'metodo', etiqueta: t('col.metodo'), valor: metodo, texto: (v) => t(`sin_mercado.metodo_${v}`) },
    { id: 'especie', etiqueta: t('col.especie'), valor: (a) => a.especie, texto: (v) => v, femenino: true },
    { id: 'clasificacion', etiqueta: t('col.clasificacion'), valor: (a) => a.clasificacion, texto: (v) => t(`clasificacion.${v}`), femenino: true },
  ]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.valoracion-costo')} />;
  const alCosto = filas.filter((a) => a.valorado_por_costo);
  const estimados = filas.filter((a) => !a.valorado_por_costo);
  const pasarAVr = alCosto.filter((a) => conPrecio.has(a.id_especie));

  return (
    <>
      <EncabezadoVista titulo={t('sin_mercado.titulo')} descripcion={t('sin_mercado.descripcion')} />
      <div className="fin-avisos">
        <Alert variant="warning" title={t('sin_mercado.aviso_titulo')} description={t('sin_mercado.aviso_detalle')} />
        {pasarAVr.length > 0 && (
          <Alert variant="info" title={t('sin_mercado.pasar_vr_titulo', { count: pasarAVr.length })}
            description={t('sin_mercado.pasar_vr_detalle', { activos: pasarAVr.slice(0, 5).map((a) => a.identificador).join(', ') })} />
        )}
      </div>
      <ErrorApi error={activos.error} />
      <Indicadores items={[
        { etiqueta: t('sin_mercado.kpi_costo'), valor: alCosto.length, tono: 'warning', detalle: t('sin_mercado.kpi_costo_detalle') },
        { etiqueta: t('sin_mercado.kpi_valor'), valor: formatoMoneda(sumar(alCosto.map((a) => a.valor_contable_por_costo))), detalle: t('sin_mercado.kpi_valor_detalle') },
        { etiqueta: t('sin_mercado.kpi_depreciacion'), valor: formatoMoneda(sumar(alCosto.map((a) => a.depreciacion_acumulada))), tono: 'error', detalle: t('sin_mercado.kpi_depreciacion_detalle') },
        { etiqueta: t('sin_mercado.kpi_estimados'), valor: estimados.length, tono: estimados.length ? 'warning' : 'neutral', detalle: t('sin_mercado.kpi_estimados_detalle') },
      ]} />
      <Listado l={l} idBase="sin-mercado" titulo={t('sin_mercado.listado')} sustantivo={t('recon.sustantivo')} buscar={t('medicion.buscar')}
        cargando={activos.cargando}
        vacio={{ icono: <Scale size={28} aria-hidden />, titulo: t('sin_mercado.vacio_titulo'), detalle: t('sin_mercado.vacio_detalle') }}>
        {(visibles) => (
          <table style={TABLA}>
            <thead>
              <tr>
                <th style={TH}>{t('col.activo')}</th><th style={TH_NUM}>{t('sin_mercado.costo_inicial')}</th><th style={TH_NUM}>{t('col.depreciacion')}</th>
                <th style={TH_NUM}>{t('col.valor_libros')}</th><th style={TH}>{t('sin_mercado.razon')}</th><th style={TH}>{t('sin_mercado.desde')}</th>
                <th style={TH}>{t('sin_mercado.metodo_actual')}</th><th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((a) => (
                <tr key={a.id_activo_biologico}>
                  <td style={TD}>
                    <CeldaActivo identificador={a.identificador} especie={a.especie} finca={a.finca} />
                    {a.clasificacion && <span className="fin-secundario">{t(`clasificacion.${a.clasificacion}`)}</span>}
                  </td>
                  <td style={TD_NUM}>{a.valorado_por_costo ? formatoMoneda(a.costo_base) : t('sin_mercado.no_aplica')}</td>
                  <td style={TD_NUM}>{a.valorado_por_costo ? <span className="fin-neg">−{formatoMoneda(a.depreciacion_acumulada)}</span> : t('sin_mercado.no_aplica')}</td>
                  <td style={TD_NUM}><strong>{formatoMoneda(a.valorado_por_costo ? a.valor_contable_por_costo : a.valor_razonable_neto)}</strong></td>
                  <td style={{ ...TD, maxWidth: 280 }}>
                    {a.valorado_por_costo ? (a.razon_sin_mercado || t('sin_mercado.razon_inicial')) : t('sin_mercado.razon_estimado')}
                    {a.valorado_por_costo && conPrecio.has(a.id_especie) && <span className="fin-secundario">{t('sin_mercado.ya_hay_precio')}</span>}
                  </td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(a.valorado_por_costo ? a.fecha_marcacion : a.fecha_calculo)}</td>
                  <td style={TD}><Badge variant={a.valorado_por_costo ? 'warning' : 'info'}>{t(`sin_mercado.metodo_${metodo(a)}`)}</Badge></td>
                  <td style={TD}>
                    <Button variant="ghost" size="sm" onClick={() => setDetalle(a)} aria-label={t('valor.ver_detalle_aria', { activo: a.identificador })}>
                      {t('valor.ver_detalle')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Listado>
      {detalle && (
        <DetalleActivoModal idActivo={detalle.id_activo_biologico} identificador={detalle.identificador}
          onCerrar={() => setDetalle(null)} onCambio={cargar} />
      )}
    </>
  );
}

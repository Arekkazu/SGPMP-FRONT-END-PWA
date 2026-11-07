// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-05 | Arekkazu | M06 RF-85 prototipo: productos agrícolas del período con indicadores y filtros |
import React, { useEffect } from 'react';
import { Package, Play } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { Badge } from '../../shared/design-system/Badge';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_E, ACCION_R, R_VALORACION } from '../rbac';
import { sumar } from '../lib/decimal';
import {
  EncabezadoVista, ErrorApi, Indicadores, Listado, SinPeriodo, TABLA, TD, TD_NUM, TH, TH_NUM, formatoCantidad,
  formatoFecha, formatoMoneda, nombrePeriodo, useAsync, useListado, usePeriodo,
} from '../components/comunes';

export function ProductosView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_VALORACION, ACCION_R);
  const puedeProcesar = usePermissionPorNombre(R_VALORACION, ACCION_E);
  const { periodo } = usePeriodo();
  const productos = useAsync(finanzasApi.productos);
  const proceso = useAsync(finanzasApi.procesarEventos);
  const id = periodo?.id_periodo_contable;
  const { ejecutar: cargar } = productos;
  useEffect(() => { if (puedeLeer && id) cargar(id); }, [puedeLeer, id, cargar]);

  const l = useListado(productos.data, (p) => `${p.producto_agricola} ${p.identificador} ${p.especie} ${p.finca}`, [
    { id: 'tipo', etiqueta: t('productos.tipo'), valor: (p) => p.tipo, texto: (v) => t(`productos.tipo_${v}`, { defaultValue: t('productos.tipo_PRODUCTO_DE_CONSUMO') }) },
    { id: 'producto', etiqueta: t('productos.producto'), valor: (p) => p.producto_agricola, texto: (v) => v },
    { id: 'especie', etiqueta: t('col.especie'), valor: (p) => p.especie, texto: (v) => v, femenino: true },
  ]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.productos')} />;
  const lista = productos.data ?? [];

  const procesar = async () => {
    const r = await proceso.ejecutar();
    if (!r) return;
    pushToast('success', t('valor.procesado', { eventos: r.eventos.PROCESADO ?? 0, provisiones: r.provisiones_m05.PROCESADO ?? 0 }));
    if (id) cargar(id);
  };

  return (
    <>
      <EncabezadoVista
        titulo={t('productos.titulo')}
        descripcion={periodo ? t('productos.descripcion_periodo', { periodo: nombrePeriodo(periodo) }) : t('productos.descripcion')}
        acciones={puedeProcesar && <Button variant="secondary" size="md" loading={proceso.cargando} onClick={procesar}><Play size={16} aria-hidden />{t('valor.procesar')}</Button>}
      />
      <Alert variant="info" title={t('productos.nota_titulo')} description={t('productos.nota_detalle')} style={{ marginBottom: 'var(--s5)' }} />
      <ErrorApi error={productos.error ?? proceso.error} />
      {!periodo ? <SinPeriodo /> : (
        <>
          <Indicadores items={[
            { etiqueta: t('productos.kpi_reconocidos'), valor: lista.length, tono: 'success', detalle: t('productos.kpi_reconocidos_detalle', { periodo: nombrePeriodo(periodo) }) },
            { etiqueta: t('productos.kpi_valor'), valor: formatoMoneda(sumar(lista.map((p) => p.valor_producto))), tono: 'info', detalle: t('productos.kpi_valor_detalle') },
            { etiqueta: t('productos.kpi_periodicos'), valor: lista.filter((p) => p.tipo === 'PRODUCTO_PERIODICO').length, detalle: t('productos.kpi_periodicos_detalle') },
            { etiqueta: t('productos.kpi_consumo'), valor: lista.filter((p) => p.tipo === 'PRODUCTO_DE_CONSUMO').length, detalle: t('productos.kpi_consumo_detalle') },
          ]} />
          <Listado l={l} idBase="productos" titulo={t('productos.listado')} sustantivo={t('productos.sustantivo')} buscar={t('productos.buscar')}
            cargando={productos.cargando}
            vacio={{ icono: <Package size={28} aria-hidden />, titulo: t('productos.vacio_titulo'), detalle: t('productos.vacio_detalle') }}>
            {(visibles) => (
              <table style={TABLA}>
                <thead>
                  <tr>
                    <th style={TH}>{t('productos.fecha_cosecha')}</th><th style={TH}>{t('productos.producto_origen')}</th>
                    <th style={TH_NUM}>{t('productos.cantidad')}</th><th style={TH_NUM}>{t('productos.precio_ref')}</th>
                    <th style={TH_NUM}>{t('col.valor_neto')}</th><th style={TH}>{t('productos.tipo')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((p) => (
                    <tr key={p.id_reconocimiento_producto_agricola}>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(p.fecha_cosecha)}</td>
                      <td style={TD}><strong>{p.producto_agricola}</strong><span className="fin-secundario">{[p.identificador, p.especie, p.finca].join(' · ')}</span></td>
                      <td style={TD_NUM}>{formatoCantidad(p.cantidad_cosechada)} {p.unidad_medida}</td>
                      <td style={TD_NUM}>{p.precio_mercado_producto ? `${formatoMoneda(p.precio_mercado_producto)} / ${p.unidad_medida}` : t('productos.sin_precio')}</td>
                      <td style={TD_NUM}>
                        <strong>{formatoMoneda(p.valor_producto)}</strong>
                        {p.costo_venta_producto && <span className="fin-secundario">{t('productos.menos_costos', { costos: formatoMoneda(p.costo_venta_producto) })}</span>}
                      </td>
                      <td style={TD}>
                        <Badge variant={p.tipo === 'PRODUCTO_PERIODICO' ? 'info' : 'neutral'}>
                          {t(`productos.tipo_${p.tipo}`, { defaultValue: t('productos.tipo_PRODUCTO_DE_CONSUMO') })}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Listado>
        </>
      )}
    </>
  );
}

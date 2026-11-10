// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-05 | Arekkazu | M06 RF-85 prototipo: productos agrícolas del período con indicadores y filtros |
// | 2026-11-09 | destroyerban | INC-M06-323-G27 RF-85: cosechas pendientes e ingreso manual de sus costos de venta |
import React, { useEffect, useState } from 'react';
import { Package, PenLine, Play } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { Badge } from '../../shared/design-system/Badge';
import { Input } from '../../shared/design-system/Input';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_E, ACCION_R, R_VALORACION } from '../rbac';
import { sumar } from '../lib/decimal';
import type { CosechaPendiente, CostosManuales } from '../types';
import {
  AreaTexto, EncabezadoVista, ErrorApi, Indicadores, Listado, SECUNDARIO, SinPeriodo, Subtitulo, TABLA, TD, TD_NUM, TH, TH_NUM, formatoCantidad,
  formatoFecha, formatoMoneda, nombrePeriodo, useAsync, useListado, usePeriodo,
} from '../components/comunes';

export function ProductosView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_VALORACION, ACCION_R);
  const puedeProcesar = usePermissionPorNombre(R_VALORACION, ACCION_E);
  const { periodo } = usePeriodo();
  const productos = useAsync(finanzasApi.productos);
  const proceso = useAsync(finanzasApi.procesarEventos);
  const pendientes = useAsync(finanzasApi.cosechasPendientes);
  const [costeando, setCosteando] = useState<CosechaPendiente | null>(null);
  const id = periodo?.id_periodo_contable;
  const { ejecutar: cargar } = productos;
  const { ejecutar: cargarPendientes } = pendientes;
  useEffect(() => { if (puedeLeer && id) cargar(id); }, [puedeLeer, id, cargar]);
  useEffect(() => { if (puedeLeer) cargarPendientes(); }, [puedeLeer, cargarPendientes]);

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
    cargarPendientes();
  };
  const listaPendientes = pendientes.data ?? [];

  return (
    <>
      <EncabezadoVista
        titulo={t('productos.titulo')}
        descripcion={periodo ? t('productos.descripcion_periodo', { periodo: nombrePeriodo(periodo) }) : t('productos.descripcion')}
        acciones={puedeProcesar && <Button variant="secondary" size="md" loading={proceso.cargando} onClick={procesar}><Play size={16} aria-hidden />{t('valor.procesar')}</Button>}
      />
      <Alert variant="info" title={t('productos.nota_titulo')} description={t('productos.nota_detalle')} style={{ marginBottom: 'var(--s5)' }} />
      <ErrorApi error={productos.error ?? proceso.error ?? pendientes.error} />
      {listaPendientes.length > 0 && (
        <section aria-labelledby="productos-pendientes" style={{ marginBottom: 'var(--s5)' }}>
          <Alert variant="warning" title={t('productos.pendientes_aviso', { count: listaPendientes.length })}
            description={t('productos.pendientes_ayuda')} style={{ marginBottom: 'var(--s3)' }} />
          <Subtitulo id="productos-pendientes">{t('productos.pendientes_titulo')}</Subtitulo>
          <table style={TABLA}>
            <thead>
              <tr>
                <th style={TH}>{t('productos.fecha_cosecha')}</th><th style={TH}>{t('productos.producto_origen')}</th>
                <th style={TH_NUM}>{t('productos.cantidad')}</th><th style={TH}>{t('productos.motivo')}</th>
                {puedeProcesar && <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>}
              </tr>
            </thead>
            <tbody>
              {listaPendientes.map((c) => (
                <tr key={c.id_evento}>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(c.fecha_cosecha)}</td>
                  <td style={TD}>
                    <strong>{c.producto_agricola ?? t('productos.sin_producto')}</strong>
                    <span className="fin-secundario">{[c.identificador, c.especie, c.finca].join(' · ')}</span>
                  </td>
                  <td style={TD_NUM}>{formatoCantidad(c.cantidad_cosechada)} {c.unidad_medida ?? ''}</td>
                  <td style={TD}>{c.motivo ?? t('productos.sin_motivo')}</td>
                  {puedeProcesar && (
                    <td style={TD}>
                      {c.admite_costos_manuales ? (
                        <Button variant="secondary" size="sm" onClick={() => setCosteando(c)}
                          aria-label={t('productos.ingresar_costos_aria', { producto: c.producto_agricola ?? '', activo: c.identificador })}>
                          {t('productos.ingresar_costos')}
                        </Button>
                      ) : <span className="fin-secundario">{t('productos.consumo_sin_manuales')}</span>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {costeando && (
        <CostosCosechaModal cosecha={costeando} onCerrar={() => setCosteando(null)}
          onReconocida={() => { setCosteando(null); cargarPendientes(); if (id) cargar(id); }} />
      )}
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

// RF-85 FA-2: sin costos de venta en la configuración, el Contador los ingresa a mano con su justificación.
function CostosCosechaModal({ cosecha, onCerrar, onReconocida }: {
  cosecha: CosechaPendiente; onCerrar: () => void; onReconocida: () => void;
}) {
  const { t } = useT('finanzas');
  const reconocimiento = useAsync(finanzasApi.reconocerCosecha);
  const [costos, setCostos] = useState<Record<keyof CostosManuales, string>>({ transporte: '', comisiones: '', impuestos: '', otros: '' });
  const [justificacion, setJustificacion] = useState('');
  const [aviso, setAviso] = useState<string>();

  const reconocer = async () => {
    const valores = Object.entries(costos).filter(([, v]) => v.trim() !== '');
    if (valores.length === 0) { setAviso(t('productos.costos_falta')); return; }
    if (valores.some(([, v]) => !(Number(v.replace(',', '.')) >= 0))) { setAviso(t('recon.costos_invalidos')); return; }
    if (justificacion.trim().length < 20) { setAviso(t('recon.justificacion_corta')); return; }
    setAviso(undefined);
    const r = await reconocimiento.ejecutar(cosecha.id_evento, {
      costos_manuales: Object.fromEntries(valores.map(([k, v]) => [k, v.replace(',', '.')])), justificacion: justificacion.trim(),
    });
    if (r) {
      pushToast('success', t('productos.cosecha_reconocida', { producto: cosecha.producto_agricola ?? '', activo: cosecha.identificador }));
      onReconocida();
    }
  };

  return (
    <ModalShell
      title={t('productos.costos_titulo', { producto: cosecha.producto_agricola ?? '', activo: cosecha.identificador })}
      onClose={onCerrar}
      maxWidth={640}
      footer={(
        <>
          <Button variant="secondary" size="md" onClick={onCerrar} disabled={reconocimiento.cargando}>{t('comun.cancelar')}</Button>
          <Button variant="primary" size="md" loading={reconocimiento.cargando} onClick={reconocer}>
            <PenLine size={16} aria-hidden />{t('productos.costos_confirmar')}
          </Button>
        </>
      )}
    >
      <p style={{ ...SECUNDARIO, margin: '0 0 var(--s4)' }}>
        {t('productos.costos_ayuda', { cantidad: formatoCantidad(cosecha.cantidad_cosechada), unidad: cosecha.unidad_medida ?? '' })}
      </p>
      <ErrorApi error={reconocimiento.error} />
      <div style={{ display: 'grid', gap: 'var(--s4)' }}>
        <div className="ds-fg2">
          {(['transporte', 'comisiones', 'impuestos', 'otros'] as const).map((k) => (
            <Input key={k} id={`cc-${k}`} label={t(`recon.costo_${k}`)} inputMode="decimal" value={costos[k]}
              onChange={(e) => setCostos({ ...costos, [k]: e.target.value })} />
          ))}
        </div>
        <AreaTexto id="cc-justificacion" label={t('productos.costos_justificacion')} required maxLength={1000} value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)} hint={t('recon.justificacion_ayuda')} />
        {aviso && <Alert variant="error" title={aviso} />}
      </div>
    </ModalShell>
  );
}

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-81: historial de suministros por activo, filtros, resumen y exportación |
import React, { useEffect, useState } from 'react';
import { Search, FileDown, History } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { ACCION_R, RECURSO_HISTORIAL } from '../rbac';
import { useHistorialSuministros } from '../hooks/useHistorialSuministros';
import { useSondeoTrabajo } from '../hooks/useSondeoTrabajo';
import { useActivosSuministros } from '../hooks/useActivosSuministros';
import { guardarArchivo } from '../lib/descarga';
import { formatoCantidad, formatoFecha, formatoMoneda } from '../lib/formato';
import { ORIGENES_PRECIO, TIPOS_SUMINISTRO, type FiltrosHistorial } from '../types';
import { EncabezadoVista } from '../components/EncabezadoVista';
import { EstadoVacio } from '../components/EstadoVacio';
import { SelectorActivo } from '../components/SelectorActivo';
import { Paginacion } from '../components/Paginacion';
import { FILTROS, PANEL, SECUNDARIO, TABLA, TD, TD_NUM, TH, TH_NUM } from '../components/estilos';

const POR_PAGINA = 50;

export function HistorialView() {
  const { t } = useT('supplies');
  const puedeLeer = usePermission(RECURSO_HISTORIAL, ACCION_R);
  const online = useOnlineStatus();
  const { activos, cargando: cargandoActivos } = useActivosSuministros();
  const { consulta, exportacion, descarga, consultarTrabajo } = useHistorialSuministros();
  const [texto, setTexto] = useState('');
  const [idActivo, setIdActivo] = useState<number | null>(null);
  const [errorActivo, setErrorActivo] = useState<string>();
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [tipo, setTipo] = useState('TODOS');
  const [origen, setOrigen] = useState('TODOS');
  const [costoMin, setCostoMin] = useState('');
  const [costoMax, setCostoMax] = useState('');
  const [filtros, setFiltros] = useState<FiltrosHistorial | null>(null);
  const [trabajo, setTrabajo] = useState<{ id: number; exportacion: boolean } | null>(null);
  const sondeo = useSondeoTrabajo(trabajo?.id ?? null, consultarTrabajo);

  const { ejecutar: consultar } = consulta;
  useEffect(() => { if (filtros) consultar(filtros); }, [filtros, consultar]);
  useEffect(() => {
    if (consulta.data?.tipo === 'asincrono' && consulta.data.consulta.id_consulta_asincrona) {
      setTrabajo({ id: consulta.data.consulta.id_consulta_asincrona, exportacion: false });
    }
  }, [consulta.data]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.historial')} />;

  const rangoInvalido = !!desde && !!hasta && desde > hasta;
  const costosInvalidos = !!costoMin && !!costoMax && Number(costoMin) > Number(costoMax);
  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (idActivo === null) { setErrorActivo(t('comun.activo_requerido')); return; }
    setErrorActivo(undefined);
    if (rangoInvalido || costosInvalidos) return;
    setTrabajo(null);
    setFiltros({
      id_activo_biologico: idActivo,
      fecha_inicio_filtro: desde || undefined,
      fecha_fin_filtro: hasta || undefined,
      tipo_suministro_filtro: tipo,
      origen_precio_filtro: origen,
      costo_min: costoMin || undefined,
      costo_max: costoMax || undefined,
      pagina: 1,
      registros_por_pagina: POR_PAGINA,
    });
  };

  const exportar = async (formato: 'PDF' | 'EXCEL') => {
    if (!filtros) return;
    const r = await exportacion.ejecutar(filtros, formato);
    if (!r) return;
    if (r.tipo === 'archivo') { guardarArchivo(r.blob, r.nombre); return; }
    const id = r.consulta.id_exportacion ?? r.consulta.id_consulta_asincrona;
    pushToast('info', t('historial.exportacion_en_cola'), r.consulta.mensaje);
    if (id) setTrabajo({ id, exportacion: true });
  };

  const descargarTrabajo = async () => {
    if (!trabajo) return;
    const blob = await descarga.ejecutar(trabajo.id);
    if (blob) guardarArchivo(blob, `historial_suministros_${trabajo.id}`);
  };

  const pagina = consulta.data?.tipo === 'pagina' ? consulta.data : null;
  const resumen = pagina?.resumen;
  const errorVista = consulta.error ?? exportacion.error ?? descarga.error;

  return (
    <>
      <EncabezadoVista
        titulo={t('historial.titulo')}
        descripcion={t('historial.descripcion')}
        acciones={filtros && (
          <>
            <Button variant="secondary" size="md" disabled={!online} loading={exportacion.cargando} onClick={() => exportar('PDF')}><FileDown size={16} aria-hidden />PDF</Button>
            <Button variant="secondary" size="md" disabled={!online} loading={exportacion.cargando} onClick={() => exportar('EXCEL')}><FileDown size={16} aria-hidden />Excel</Button>
          </>
        )}
      />
      <form onSubmit={buscar} role="search" style={{ ...FILTROS, marginBottom: 'var(--s5)' }}>
        <SelectorActivo id="historial-activo" activos={activos} cargando={cargandoActivos} value={texto} required error={errorActivo} onChange={(x, id) => { setTexto(x); setIdActivo(id); }} />
        <Input id="historial-desde" label={t('comun.desde')} type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        <Input id="historial-hasta" label={t('comun.hasta')} type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} error={rangoInvalido ? t('comun.rango_invalido') : undefined} />
        <Select id="historial-tipo" label={t('historial.tipo')} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS_SUMINISTRO.map((x) => <option key={x} value={x}>{x === 'TODOS' ? t('comun.todos') : t(`tipo.${x}`)}</option>)}
        </Select>
        <Select id="historial-origen" label={t('historial.origen_precio')} value={origen} onChange={(e) => setOrigen(e.target.value)}>
          {ORIGENES_PRECIO.map((x) => <option key={x} value={x}>{x === 'TODOS' ? t('comun.todos') : t(`origen.${x}`)}</option>)}
        </Select>
        <Input id="historial-min" label={t('historial.costo_min')} type="number" step="any" min={0} value={costoMin} onChange={(e) => setCostoMin(e.target.value)} />
        <Input id="historial-max" label={t('historial.costo_max')} type="number" step="any" min={0} value={costoMax} onChange={(e) => setCostoMax(e.target.value)}
          error={costosInvalidos ? t('historial.costos_invalidos') : undefined} />
        <div style={{ paddingBottom: 'var(--s1)' }}>
          <Button type="submit" variant="secondary" size="md" loading={consulta.cargando}><Search size={16} aria-hidden />{t('comun.consultar')}</Button>
        </div>
      </form>

      {errorVista && <Alert variant={errorVista.status === 429 ? 'warning' : 'error'} title={errorVista.message} style={{ marginBottom: 'var(--s4)' }} />}

      {trabajo && (
        <Alert
          variant={sondeo.estado?.estado === 'FALLIDO' ? 'error' : sondeo.terminado ? 'success' : 'info'}
          title={trabajo.exportacion ? t('historial.exportacion_trabajo') : t('historial.asincrono')}
          description={sondeo.fallo ? t('comun.seguimiento_fallo') : t(`estado.${sondeo.estado?.estado ?? 'PENDIENTE'}`)}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      {trabajo?.exportacion && sondeo.estado?.estado === 'COMPLETADO' && (
        <div style={{ marginBottom: 'var(--s4)' }}>
          <Button variant="primary" size="md" loading={descarga.cargando} onClick={descargarTrabajo}><FileDown size={16} aria-hidden />{t('historial.descargar')}</Button>
        </div>
      )}
      {!trabajo?.exportacion && sondeo.estado?.estado === 'COMPLETADO' && sondeo.estado.resultado && (
        <section style={{ ...PANEL, marginBottom: 'var(--s4)' }}>
          <p style={{ margin: 0, fontSize: 'var(--fs-body-md)', color: 'var(--text-secondary)' }}>
            {t('historial.resumen_async', {
              registros: sondeo.estado.resultado.total_registros_filtrados ?? 0,
              monto: formatoMoneda(sondeo.estado.resultado.monto_total_filtrado),
            })}
          </p>
        </section>
      )}

      {!filtros ? (
        <EstadoVacio icono={<History size={28} aria-hidden />} titulo={t('historial.vacio_titulo')} detalle={t('historial.vacio_detalle')} />
      ) : pagina && (
        <>
          {resumen && (
            <section aria-label={t('historial.resumen')} style={{ ...PANEL, marginBottom: 'var(--s4)', display: 'flex', gap: 'var(--s6)', flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, fontSize: 'var(--fs-label-md)', fontWeight: 600, color: 'var(--text-muted)' }}>{t('historial.monto_total')}</p>
                <p style={{ margin: 'var(--s1) 0 0', fontSize: 'var(--fs-heading-md)', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatoMoneda(resumen.monto_total_filtrado)}</p>
                <p style={{ ...SECUNDARIO, margin: 'var(--s1) 0 0' }}>{t('comun.registros', { count: resumen.total_registros_filtrados })}</p>
              </div>
              <dl style={{ flex: '1 1 280px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--s4)', margin: 0 }}>
                {Object.entries(resumen.desglose_por_tipo_suministro).map(([tipoS, v]) => (
                  <div key={tipoS}>
                    <dt style={{ fontSize: 'var(--fs-label-md)', fontWeight: 600, color: 'var(--text-muted)' }}>{t(`tipo.${tipoS}`, { defaultValue: tipoS })}</dt>
                    <dd style={{ margin: 'var(--s1) 0 0', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatoMoneda(v.monto)} <span style={SECUNDARIO}>· {v.total}</span></dd>
                  </div>
                ))}
              </dl>
              <p style={{ ...SECUNDARIO, margin: 0, flexBasis: '100%' }}>
                {t('historial.actualizado', { fecha: formatoFecha(resumen.datos_actualizados_hasta, true) })}
                {resumen.datos_contexto_no_disponibles && ` · ${t('historial.sin_contexto')}`}
              </p>
            </section>
          )}
          {resumen?.mensaje && <Alert variant="info" title={resumen.mensaje} style={{ marginBottom: 'var(--s4)' }} />}
          {pagina.items.length === 0 ? (
            <EstadoVacio icono={<History size={28} aria-hidden />} titulo={t('historial.sin_resultados')} detalle={t('historial.sin_resultados_detalle')} />
          ) : (
            <>
              <ScrollRegion label={t('historial.titulo')}>
                <table style={TABLA} aria-busy={consulta.cargando}>
                  <thead>
                    <tr>
                      <th style={TH}>{t('comun.fecha')}</th>
                      <th style={TH}>{t('historial.tipo')}</th>
                      <th style={TH}>{t('historial.descripcion')}</th>
                      <th style={TH}>{t('historial.ciclo')}</th>
                      <th style={TH_NUM}>{t('historial.cantidad')}</th>
                      <th style={TH_NUM}>{t('historial.precio')}</th>
                      <th style={TH_NUM}>{t('historial.costo')}</th>
                      <th style={TH}>{t('historial.operacion')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagina.items.map((l) => (
                      <tr key={l.id_registro_suministro}>
                        <td style={TD}>{formatoFecha(l.fecha_aplicacion)}</td>
                        <td style={TD}>{t(`tipo.${l.tipo_suministro}`, { defaultValue: l.tipo_suministro })}</td>
                        <td style={TD}>{l.descripcion}{l.observacion && <div style={{ ...SECUNDARIO, maxWidth: 280 }}>{l.observacion}</div>}</td>
                        <td style={TD}>{l.nombre_ciclo ?? `#${l.id_ciclo_productivo}`}{l.estado_ciclo && <div style={SECUNDARIO}>{l.estado_ciclo}</div>}</td>
                        <td style={TD_NUM}>{formatoCantidad(l.cantidad)} {l.unidad_medida}</td>
                        <td style={TD_NUM}>{formatoMoneda(l.precio_unitario)}<div style={SECUNDARIO}>{t(`origen.${l.origen_precio}`, { defaultValue: l.origen_precio })}</div></td>
                        <td style={TD_NUM}>{formatoMoneda(l.costo_registro)}</td>
                        <td style={TD}>{t(`operacion.${l.tipo_operacion}`, { defaultValue: l.tipo_operacion })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollRegion>
              {resumen && (
                <Paginacion pagina={resumen.pagina_actual} totalPaginas={resumen.total_paginas} total={resumen.total_registros_filtrados}
                  onCambiar={(p) => setFiltros((f) => (f ? { ...f, pagina: p } : f))} />
              )}
            </>
          )}
        </>
      )}
    </>
  );
}

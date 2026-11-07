// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-94: consulta legible de la auditoría financiera con integridad por evento |
// | 2026-11-05 | Arekkazu | M06 RF-94 prototipo: panel de monitoreo por severidad, últimos eventos y exploración filtrada |
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, FilterX, ScrollText, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Select } from '../../shared/design-system/Select';
import { Badge } from '../../shared/design-system/Badge';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_R, R_AUDITORIA } from '../rbac';
import type { EventoAuditoria, Severidad } from '../types';
import {
  EncabezadoVista, EstadoVacio, ErrorApi, Indicadores, SECUNDARIO, SinPeriodo, Subtitulo, TABLA, TD, TD_NUM, TH, TH_NUM, formatoFecha,
  formatoMoneda, nombrePeriodo, useAsync, usePeriodo,
} from '../components/comunes';

const SEVERIDADES: Severidad[] = ['CRITICAL', 'ERROR', 'WARNING', 'INFO'];
const VARIANTE = { INFO: 'info', WARNING: 'warning', ERROR: 'error', CRITICAL: 'error' } as const;
const RELLENO = { INFO: 'fin-barra__relleno--info', WARNING: 'fin-barra__relleno--warning', ERROR: 'fin-barra__relleno--error', CRITICAL: 'fin-barra__relleno--error' };
// Catálogo de tipos que acepta el backend (un valor fuera de él responde 400).
const TIPOS = [
  'RECONOCIMIENTO_INICIAL', 'RECONOCIMIENTO_REVERTIDO', 'RECONOCIMIENTO_BLOQUEADO_SIN_VALOR', 'REVERSION_BLOQUEADA', 'CALCULO_VALOR_RAZONABLE',
  'AJUSTE_MANUAL_COSTOS_VENTA', 'MEDICION_POSTERIOR', 'MEDICION_CON_ESTIMACION', 'MEDICION_SIN_VARIACION', 'MEDICION_PENDIENTE',
  'VARIACION_REGISTRADA', 'LINEA_ASIENTO_PENDIENTE_CUENTA', 'LINEA_ASIENTO_REGISTRADA', 'PRODUCTO_AGRICOLA_RECONOCIDO',
  'RECONOCIMIENTO_PRODUCTO_PENDIENTE', 'BAJA_ACTIVO_REGISTRADA', 'COSTO_REGISTRADO', 'COSTO_CLASIFICADO', 'PRECIO_REGISTRADO',
  'PRECIO_MARCADO_REEMPLAZADO', 'PRECIO_REFERENCIA_VENCIDO', 'PARAMETRO_COSTOS_VENTA_ACTUALIZADO', 'MATRIZ_CONTABLE_ACTUALIZADA',
  'CONFIGURACION_CONTABLE_ACTUALIZADA', 'ACTIVO_MARCADO_SIN_MERCADO', 'METODO_VALORACION_CAMBIADO', 'DEPRECIACION_REGISTRADA',
  'DETERIORO_REGISTRADO', 'COTIZACION_REGISTRADA', 'COTIZACION_MODIFICADA', 'COTIZACION_ANULADA', 'COTIZACION_VENCIDA',
  'CIERRE_PERIODO_INICIADO', 'CIERRE_PERIODO_COMPLETADO', 'CIERRE_PERIODO_FALLIDO', 'EXCLUSION_CIERRE_AUTORIZADA', 'COMPROBANTE_GENERADO',
  'CADENA_TRAZABILIDAD_VERIFICADA', 'INFORME_REVELACIONES_GENERADO', 'INFORME_REVELACIONES_APROBADO', 'INFORME_REVELACIONES_RECHAZADO',
  'ERROR_CONSISTENCIA', 'ESTADO_RESULTADOS_GENERADO', 'ESTADO_RESULTADOS_APROBADO', 'ERROR_CONCILIACION', 'ERROR_TECNICO',
];
const POR_PAGINA = 25;

export function AuditoriaView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_AUDITORIA, ACCION_R);
  const { periodo } = usePeriodo();
  const [severidad, setSeveridad] = useState('');
  const [tipo, setTipo] = useState('');
  const [orden, setOrden] = useState<'DESC' | 'ASC'>('DESC');
  const [pagina, setPagina] = useState(1);
  const recientes = useAsync(finanzasApi.auditoria);
  const consulta = useAsync(finanzasApi.auditoria);
  const id = periodo?.id_periodo_contable;
  const { ejecutar: cargarRecientes } = recientes;
  const { ejecutar: consultar } = consulta;
  useEffect(() => { if (puedeLeer && id) cargarRecientes({ id_periodo_contable: id, pagina: 1, tamano: 5, orden: 'DESC' }); }, [puedeLeer, id, cargarRecientes]);
  useEffect(() => { setPagina(1); }, [id, severidad, tipo, orden]);
  useEffect(() => {
    if (puedeLeer && id) consultar({ id_periodo_contable: id, severidad: severidad || undefined, tipo_evento: tipo || undefined, pagina, tamano: POR_PAGINA, orden });
  }, [puedeLeer, id, severidad, tipo, orden, pagina, consultar]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.auditoria')} />;
  const resumen = recientes.data?.resumen_severidad;
  const total = recientes.data?.total_registros ?? 0;
  const datos = consulta.data;
  const eventos = datos?.eventos ?? [];
  const paginas = Math.max(1, Math.ceil((datos?.total_registros ?? 0) / POR_PAGINA));
  const hayFiltros = !!severidad || !!tipo;

  return (
    <>
      <EncabezadoVista titulo={t('aud.titulo')} descripcion={periodo ? t('aud.descripcion_periodo', { periodo: nombrePeriodo(periodo) }) : t('aud.descripcion')} />
      <ErrorApi error={recientes.error ?? consulta.error} />
      {!periodo ? <SinPeriodo /> : (
        <>
          <Indicadores items={[
            { etiqueta: t('aud.kpi_total'), valor: total, tono: 'success', detalle: t('aud.kpi_total_detalle') },
            { etiqueta: t('aud.kpi_criticos'), valor: (resumen?.CRITICAL ?? 0) + (resumen?.ERROR ?? 0), tono: 'error', detalle: t('aud.kpi_criticos_detalle') },
            { etiqueta: t('aud.kpi_advertencias'), valor: resumen?.WARNING ?? 0, tono: 'warning', detalle: t('aud.kpi_advertencias_detalle') },
            { etiqueta: t('aud.kpi_informativos'), valor: resumen?.INFO ?? 0, tono: 'info', detalle: t('aud.kpi_informativos_detalle') },
          ]} />
          <div className="fin-columnas">
            <section className="fin-tarjeta" aria-labelledby="aud-dist">
              <h2 id="aud-dist">{t('aud.distribucion')}</h2>
              <div className="fin-barras">
                {SEVERIDADES.map((s) => (
                  <div key={s}>
                    <div className="fin-barra__fila"><span>{t(`severidad.${s}`)}</span><strong>{resumen?.[s] ?? 0}</strong></div>
                    <div className="fin-barra__pista" aria-hidden>
                      <div className={`fin-barra__relleno ${RELLENO[s]}`} style={{ width: `${total ? Math.max(2, ((resumen?.[s] ?? 0) / total) * 100) : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="fin-tarjeta" aria-labelledby="aud-ultimos">
              <h2 id="aud-ultimos">{t('aud.ultimos')}</h2>
              {(recientes.data?.eventos ?? []).length === 0 ? <p style={SECUNDARIO}>{recientes.cargando ? t('comun.cargando') : t('aud.vacio_detalle')}</p> : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 'var(--s3)' }}>
                  {(recientes.data?.eventos ?? []).map((e) => (
                    <li key={e.id_evento} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s3)', borderBottom: '1px solid var(--surface-border)', paddingBottom: 'var(--s2)' }}>
                      <span style={{ minWidth: 0 }}>
                        <strong>{nombreEvento(t, e)}</strong>
                        <span className="fin-secundario">{[e.activo, actor(t, e)].filter(Boolean).join(' · ')}</span>
                      </span>
                      <span style={{ ...SECUNDARIO, whiteSpace: 'nowrap' }}>{formatoFecha(e.fecha_hora, true)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <Subtitulo>{t('aud.explorar')}</Subtitulo>
          <section className="fin-listado" aria-label={t('aud.explorar')}>
            <div className="fin-filtros">
              <Select id="aud-severidad" label={t('aud.severidad')} value={severidad} onChange={(e) => setSeveridad(e.target.value)}>
                <option value="">{t('comun.todas')}</option>
                {SEVERIDADES.map((s) => <option key={s} value={s}>{t(`severidad.${s}`)}</option>)}
              </Select>
              <Select id="aud-tipo" label={t('aud.evento')} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="">{t('comun.todos')}</option>
                {[...TIPOS].sort((a, b) => t(`evento.${a}`).localeCompare(t(`evento.${b}`))).map((x) => <option key={x} value={x}>{t(`evento.${x}`)}</option>)}
              </Select>
              <Select id="aud-orden" label={t('aud.orden_label')} value={orden} onChange={(e) => setOrden(e.target.value as 'DESC' | 'ASC')}>
                <option value="DESC">{t('aud.orden_desc')}</option>
                <option value="ASC">{t('aud.orden_asc')}</option>
              </Select>
              {hayFiltros && (
                <div className="fin-filtros__limpiar">
                  <Button variant="ghost" size="md" onClick={() => { setSeveridad(''); setTipo(''); }}><FilterX size={16} aria-hidden />{t('comun.limpiar_filtros')}</Button>
                </div>
              )}
            </div>
            {eventos.length === 0 ? (
              <div className="fin-listado__vacio">
                <EstadoVacio icono={<ScrollText size={28} aria-hidden />} titulo={consulta.cargando ? t('comun.cargando') : hayFiltros ? t('comun.sin_coincidencias') : t('aud.vacio_titulo')}
                  detalle={hayFiltros ? t('comun.sin_coincidencias_detalle') : t('aud.vacio_detalle')} />
              </div>
            ) : (
              <ScrollRegion label={t('aud.explorar')}>
                <table style={TABLA}>
                  <thead>
                    <tr>
                      <th style={TH}>{t('col.fecha')}</th><th style={TH}>{t('aud.evento')}</th><th style={TH}>{t('aud.actor')}</th>
                      <th style={TH}>{t('col.activo')}</th><th style={TH_NUM}>{t('col.monto')}</th><th style={TH}>{t('aud.severidad')}</th>
                      <th style={TH}>{t('aud.integridad')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventos.map((e) => (
                      <tr key={e.id_evento}>
                        <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(e.fecha_hora, true)}</td>
                        <td style={TD}>{nombreEvento(t, e)}</td>
                        <td style={TD}>{actor(t, e)}</td>
                        <td style={TD}>{e.activo ?? t('aud.sin_activo')}</td>
                        <td style={TD_NUM}>{e.monto_afectado ? formatoMoneda(e.monto_afectado) : t('aud.sin_monto')}</td>
                        <td style={TD}><Badge variant={VARIANTE[e.severidad as Severidad] ?? 'neutral'}>{t(`severidad.${e.severidad}`, { defaultValue: t('severidad.INFO') })}</Badge></td>
                        <td style={TD}>
                          {e.integridad_verificable
                            ? <span style={{ display: 'inline-flex', gap: 'var(--s1)', alignItems: 'center', color: 'var(--sem-success)' }}><ShieldCheck size={14} aria-hidden />{t('aud.integra')}</span>
                            : <span style={{ display: 'inline-flex', gap: 'var(--s1)', alignItems: 'center', color: 'var(--sem-error)' }}><ShieldAlert size={14} aria-hidden />{t('aud.sin_hash')}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollRegion>
            )}
            {(datos?.total_registros ?? 0) > 0 && (
              <div className="fin-listado__pie">
                <span role="status">{t('comun.mostrando', { n: eventos.length, total: datos?.total_registros ?? 0, que: t('aud.sustantivo') })}</span>
                {paginas > 1 && (
                  <div className="fin-acciones" style={{ alignItems: 'center' }}>
                    <span>{t('comun.pagina_de', { pagina, total: paginas })}</span>
                    <Button variant="secondary" size="sm" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} aria-label={t('comun.anterior')}><ChevronLeft size={16} aria-hidden /></Button>
                    <Button variant="secondary" size="sm" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)} aria-label={t('comun.siguiente')}><ChevronRight size={16} aria-hidden /></Button>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

type T = (k: string, o?: Record<string, unknown>) => string;
const nombreEvento = (t: T, e: EventoAuditoria) => t(`evento.${e.tipo_evento}`, { defaultValue: e.descripcion_evento });
const actor = (t: T, e: EventoAuditoria) => (e.actor === 'Sistema automático' ? t('aud.sistema') : e.actor === 'Usuario sin nombre registrado' ? t('aud.usuario_sin_nombre') : e.actor);

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-94: consulta legible de la auditoría financiera con integridad por evento |
// | 2026-11-05 | Arekkazu | M06 RF-94 prototipo: panel de monitoreo por severidad, últimos eventos y exploración filtrada |
// | 2026-11-10 | Arekkazu | TC-DIS-265/266 RF-94: filtros por fechas, usuario, origen y activo; columnas de período y origen; severidad con icono; detalle del evento |
import React, { useEffect, useState } from 'react';
import { Eye, FilterX, ScrollText, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { useT } from '../../shared/i18n/useT';
import { finDelDiaUtc, inicioDelDiaUtc } from '../../shared/lib/fecha';
import { Paginacion } from '../../supplies/components/Paginacion';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_R, R_AUDITORIA, R_VALORACION } from '../rbac';
import type { EventoAuditoria, Severidad } from '../types';
import { EventoFinancieroModal } from '../components/EventoFinancieroModal';
import {
  BadgeTono, EncabezadoVista, EstadoVacio, ErrorApi, Indicadores, SECUNDARIO, SinPeriodo, Subtitulo, TABLA, TD, TD_NUM, TH, TH_NUM, formatoFecha,
  formatoMoneda, nombrePeriodo, useAsync, usePeriodo,
} from '../components/comunes';

const SEVERIDADES: Severidad[] = ['CRITICAL', 'ERROR', 'WARNING', 'INFO'];
const VARIANTE = { INFO: 'info', WARNING: 'warning', ERROR: 'error', CRITICAL: 'error' } as const;
const ORIGENES = ['REPOSITORIO', 'FALLBACK'] as const;
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

/** El origen llega legible del backend; si no, se deduce del código del filtro. */
function origenDe(t: T, e: EventoAuditoria): string {
  if (e.origen) return e.origen;
  const crudo = (e.resumen_payload as Record<string, unknown> | null)?.origen;
  return crudo === 'FALLBACK' ? t('aud.origen_FALLBACK') : crudo === 'REPOSITORIO' ? t('aud.origen_REPOSITORIO') : t('aud.origen_desconocido');
}

export function AuditoriaView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_AUDITORIA, ACCION_R);
  const puedeVerActivos = usePermissionPorNombre(R_VALORACION, ACCION_R);
  const { periodo } = usePeriodo();
  const [severidad, setSeveridad] = useState('');
  const [tipo, setTipo] = useState('');
  const [origen, setOrigen] = useState('');
  const [usuario, setUsuario] = useState('');
  const [activo, setActivo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [orden, setOrden] = useState<'DESC' | 'ASC'>('DESC');
  const [pagina, setPagina] = useState(1);
  const [detalle, setDetalle] = useState<EventoAuditoria | null>(null);
  const recientes = useAsync(finanzasApi.auditoria);
  const consulta = useAsync(finanzasApi.auditoria);
  const activos = useAsync(finanzasApi.activos);
  const id = periodo?.id_periodo_contable;
  const { ejecutar: cargarRecientes } = recientes;
  const { ejecutar: consultar } = consulta;
  const { ejecutar: cargarActivos } = activos;
  const rangoInvalido = !!desde && !!hasta && desde > hasta;
  useEffect(() => { if (puedeLeer && id) cargarRecientes({ id_periodo_contable: id, pagina: 1, tamano: 5, orden: 'DESC' }); }, [puedeLeer, id, cargarRecientes]);
  useEffect(() => { if (puedeLeer && puedeVerActivos) cargarActivos(); }, [puedeLeer, puedeVerActivos, cargarActivos]);
  useEffect(() => { setPagina(1); }, [id, severidad, tipo, origen, usuario, activo, desde, hasta, orden]);
  useEffect(() => {
    if (!puedeLeer || !id || rangoInvalido) return;
    consultar({
      id_periodo_contable: id, severidad: severidad || undefined, tipo_evento: tipo || undefined, origen_registro: origen || undefined,
      id_usuario: usuario ? Number(usuario) : undefined, id_activo_biologico: activo ? Number(activo) : undefined,
      desde: inicioDelDiaUtc(desde), hasta: finDelDiaUtc(hasta), pagina, tamano: POR_PAGINA, orden,
    });
  }, [puedeLeer, id, severidad, tipo, origen, usuario, activo, desde, hasta, orden, pagina, rangoInvalido, consultar]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.auditoria')} />;
  const resumen = recientes.data?.resumen_severidad;
  const total = recientes.data?.total_registros ?? 0;
  const datos = consulta.data;
  const eventos = datos?.eventos ?? [];
  const paginas = Math.max(1, Math.ceil((datos?.total_registros ?? 0) / POR_PAGINA));
  const hayFiltros = !!severidad || !!tipo || !!origen || !!usuario || !!activo || !!desde || !!hasta;
  const limpiar = () => { setSeveridad(''); setTipo(''); setOrigen(''); setUsuario(''); setActivo(''); setDesde(''); setHasta(''); };
  const nombrePeriodoActual = periodo ? nombrePeriodo(periodo) : '';

  return (
    <>
      <EncabezadoVista titulo={t('aud.titulo')} descripcion={periodo ? t('aud.descripcion_periodo', { periodo: nombrePeriodoActual }) : t('aud.descripcion')} />
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
              <table style={TABLA}>
                <thead><tr><th style={TH}>{t('aud.severidad')}</th><th style={TH_NUM}>{t('aud.eventos_col')}</th><th style={TH_NUM}>{t('costos.participacion')}</th></tr></thead>
                <tbody>
                  {SEVERIDADES.map((s) => (
                    <tr key={s}>
                      <th scope="row" style={{ ...TD, textAlign: 'left', fontWeight: 500 }}><BadgeTono tono={VARIANTE[s]}>{t(`severidad.${s}`)}</BadgeTono></th>
                      <td style={TD_NUM}>{resumen?.[s] ?? 0}</td>
                      <td style={TD_NUM}>{total ? `${(((resumen?.[s] ?? 0) / total) * 100).toFixed(0)} %` : '0 %'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <div className="fin-filtros" role="search">
              <p style={{ ...SECUNDARIO, margin: 0, gridColumn: '1 / -1' }}>{t('aud.filtro_obligatorio', { periodo: nombrePeriodoActual })}</p>
              <Select id="aud-severidad" label={t('aud.severidad')} value={severidad} onChange={(e) => setSeveridad(e.target.value)}>
                <option value="">{t('comun.todas')}</option>
                {SEVERIDADES.map((s) => <option key={s} value={s}>{t(`severidad.${s}`)}</option>)}
              </Select>
              <Select id="aud-tipo" label={t('aud.evento')} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="">{t('comun.todos')}</option>
                {[...TIPOS].sort((a, b) => t(`evento.${a}`).localeCompare(t(`evento.${b}`))).map((x) => <option key={x} value={x}>{t(`evento.${x}`)}</option>)}
              </Select>
              <Select id="aud-origen" label={t('aud.origen')} value={origen} onChange={(e) => setOrigen(e.target.value)}>
                <option value="">{t('comun.todos')}</option>
                {ORIGENES.map((o) => <option key={o} value={o}>{t(`aud.origen_${o}`)}</option>)}
              </Select>
              <Input id="aud-usuario" label={t('aud.usuario')} type="number" step={1} min={1} value={usuario} onChange={(e) => setUsuario(e.target.value)} hint={t('aud.usuario_hint')} />
              {puedeVerActivos ? (
                <Select id="aud-activo" label={t('col.activo')} value={activo} onChange={(e) => setActivo(e.target.value)} disabled={(activos.data ?? []).length === 0}>
                  <option value="">{t('comun.todos')}</option>
                  {(activos.data ?? []).map((a) => <option key={a.id_activo_biologico} value={a.id_activo_biologico}>{a.identificador} · {a.especie}</option>)}
                </Select>
              ) : (
                <Input id="aud-activo" label={t('aud.activo_id')} type="number" step={1} min={1} value={activo} onChange={(e) => setActivo(e.target.value)} />
              )}
              <Input id="aud-desde" label={t('aud.desde')} type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
              <Input id="aud-hasta" label={t('aud.hasta')} type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} error={rangoInvalido ? t('aud.rango_invalido') : undefined} />
              <Select id="aud-orden" label={t('aud.orden_label')} value={orden} onChange={(e) => setOrden(e.target.value as 'DESC' | 'ASC')}>
                <option value="DESC">{t('aud.orden_desc')}</option>
                <option value="ASC">{t('aud.orden_asc')}</option>
              </Select>
              {hayFiltros && (
                <div className="fin-filtros__limpiar">
                  <Button variant="ghost" size="md" onClick={limpiar}><FilterX size={16} aria-hidden />{t('comun.limpiar_filtros')}</Button>
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
                      <th style={TH}>{t('col.activo')}</th><th style={TH}>{t('comun.periodo')}</th><th style={TH_NUM}>{t('col.monto')}</th><th style={TH}>{t('aud.severidad')}</th>
                      <th style={TH}>{t('aud.origen')}</th><th style={TH}>{t('aud.integridad')}</th><th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventos.map((e) => (
                      <tr key={e.id_evento}>
                        <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(e.fecha_hora, true)}</td>
                        <td style={TD}>{nombreEvento(t, e)}</td>
                        <td style={TD}>{actor(t, e)}</td>
                        <td style={TD}>{e.activo ?? t('aud.sin_activo')}</td>
                        <td style={TD}>{e.id_periodo_contable === id ? nombrePeriodoActual : e.id_periodo_contable ? t('aud.otro_periodo') : t('aud.sin_periodo')}</td>
                        <td style={TD_NUM}>{e.monto_afectado ? formatoMoneda(e.monto_afectado) : t('aud.sin_monto')}</td>
                        <td style={TD}><BadgeTono tono={VARIANTE[e.severidad as Severidad] ?? 'neutral'}>{t(`severidad.${e.severidad}`, { defaultValue: t('severidad.INFO') })}</BadgeTono></td>
                        <td style={TD}>{origenDe(t, e)}</td>
                        <td style={TD}>
                          {e.integridad_verificable
                            ? <span style={{ display: 'inline-flex', gap: 'var(--s1)', alignItems: 'center', color: 'var(--sem-success)' }}><ShieldCheck size={14} aria-hidden />{t('aud.integra')}</span>
                            : <span style={{ display: 'inline-flex', gap: 'var(--s1)', alignItems: 'center', color: 'var(--sem-error)' }}><ShieldAlert size={14} aria-hidden />{t('aud.sin_hash')}</span>}
                        </td>
                        <td style={TD}>
                          <Button variant="ghost" size="sm" onClick={() => setDetalle(e)} aria-label={t('aud.ver_aria', { evento: nombreEvento(t, e), fecha: formatoFecha(e.fecha_hora, true) })}>
                            <Eye size={14} aria-hidden />{t('aud.ver')}
                          </Button>
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
                {paginas > 1 && <Paginacion pagina={pagina} totalPaginas={paginas} onCambiar={setPagina} sinResumen />}
              </div>
            )}
          </section>
        </>
      )}
      {detalle && <EventoFinancieroModal evento={detalle} periodo={nombrePeriodoActual} onCerrar={() => setDetalle(null)} />}
    </>
  );
}

type T = (k: string, o?: Record<string, unknown>) => string;
const nombreEvento = (t: T, e: EventoAuditoria) => t(`evento.${e.tipo_evento}`, { defaultValue: e.descripcion_evento });
const actor = (t: T, e: EventoAuditoria) => (e.actor === 'Sistema automático' ? t('aud.sistema') : e.actor === 'Usuario sin nombre registrado' ? t('aud.usuario_sin_nombre') : e.actor);

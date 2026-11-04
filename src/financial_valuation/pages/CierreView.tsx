// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-87/RF-91: períodos, prevalidación y cierre, comprobantes NIC 41 y trazabilidad |
import React, { useCallback, useEffect, useState } from 'react';
import { Download, Link2, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_E, ACCION_R, R_CIERRE, R_TRAZABILIDAD, R_VALORACION } from '../rbac';
import type { Linea, Periodo } from '../types';
import {
  Datos, EncabezadoVista, EstadoBadge, EstadoVacio, ErrorApi, FILTROS, PANEL, SECUNDARIO, SelectorPeriodo, Subtitulo, TABLA, TD,
  TD_NUM, TH, TH_NUM, etiquetaPeriodo, formatoFecha, formatoMoneda, guardarArchivo, useAsync,
} from '../components/comunes';

export function CierreView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_CIERRE, ACCION_R);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [periodo, setPeriodo] = useState<Periodo | null>(null);
  const [version, setVersion] = useState(0);
  const elegir = useCallback((id: number | null, p: Periodo | null) => { setIdPeriodo(id); setPeriodo(p); }, []);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.cierre')} />;
  return (
    <>
      <EncabezadoVista titulo={t('cierre.titulo')} descripcion={t('cierre.descripcion')} />
      <div style={{ ...FILTROS, marginBottom: 'var(--s5)' }}>
        <SelectorPeriodo key={version} id="cierre-periodo" value={idPeriodo} onChange={elegir} autoseleccionar />
      </div>
      {periodo === null ? (
        <EstadoVacio icono={<Lock size={28} aria-hidden />} titulo={t('cierre.vacio_titulo')} detalle={t('cierre.vacio_detalle')} />
      ) : (
        <PanelPeriodo key={periodo.id_periodo_contable} periodo={periodo}
          onCerrado={(siguiente) => { setVersion((v) => v + 1); setIdPeriodo(null); setPeriodo(null); if (siguiente) pushToast('info', t('cierre.siguiente_abierto')); }} />
      )}
    </>
  );
}

function PanelPeriodo({ periodo, onCerrado }: { periodo: Periodo; onCerrado: (siguiente: number | null) => void }) {
  const { t } = useT('finanzas');
  const puedeCerrar = usePermissionPorNombre(R_CIERRE, ACCION_E);
  const puedeVerificar = usePermissionPorNombre(R_TRAZABILIDAD, ACCION_E);
  const puedeVerCadena = usePermissionPorNombre(R_TRAZABILIDAD, ACCION_R);
  const puedeVerLineas = usePermissionPorNombre(R_VALORACION, ACCION_R);
  const id = periodo.id_periodo_contable;
  const cerrado = periodo.estado === 'CERRADO';
  const prevalidacion = useAsync(finanzasApi.prevalidar);
  const cierre = useAsync(finanzasApi.cerrar);
  const comprobantes = useAsync(finanzasApi.comprobantes);
  const descarga = useAsync(finanzasApi.descargarComprobantes);
  const verificacion = useAsync(finanzasApi.verificarTrazabilidad);
  const lineas = useAsync(finanzasApi.lineas);
  const [sinPrecio, setSinPrecio] = useState<'' | 'excluir' | 'incluir'>('');
  const [autorizarLineas, setAutorizarLineas] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [cadenaDe, setCadenaDe] = useState<Linea | null>(null);
  const { ejecutar: prevalidar } = prevalidacion;
  const { ejecutar: cargarComprobantes } = comprobantes;
  const { ejecutar: cargarLineas } = lineas;
  useEffect(() => {
    if (!cerrado) prevalidar(id);
    cargarComprobantes(id);
    if (puedeVerLineas) cargarLineas(id);
  }, [id, cerrado, puedeVerLineas, prevalidar, cargarComprobantes, cargarLineas]);

  const pv = prevalidacion.data;
  // RF-87 FA-2/FA-3: los activos sin precio se excluyen o se incluyen con estimación; las líneas sin
  // trazabilidad se excluyen con autorización. El backend recibe una sola autorización para ambas.
  const faltaAutorizar = !!pv && ((pv.activos_sin_precio.length > 0 && !sinPrecio) || (pv.lineas_sin_trazabilidad.length > 0 && !autorizarLineas));

  const ejecutar = async () => {
    setConfirmando(false);
    const r = await cierre.ejecutar(id, { autorizar_exclusiones: sinPrecio === 'excluir' || autorizarLineas, incluir_activos_sin_precio: sinPrecio === 'incluir' });
    if (r) {
      pushToast('success', t('cierre.cerrado', { periodo: r.periodo }), t('cierre.cerrado_detalle', { count: r.comprobantes.length }));
      onCerrado(r.id_periodo_siguiente);
    } else {
      prevalidar(id);
    }
  };

  const descargar = async (formato: 'csv' | 'pdf') => {
    const a = await descarga.ejecutar(id, formato);
    if (a) guardarArchivo(a.blob, a.nombre);
  };

  const verificar = async () => {
    const r = await verificacion.ejecutar(id);
    if (r) { pushToast(r.pendientes.length ? 'warning' : 'success', t('cierre.verificadas', { verificadas: r.verificadas, pendientes: r.pendientes.length })); cargarLineas(id); }
  };

  return (
    <>
      <section style={PANEL} aria-label={t('cierre.resumen')}>
        <Datos filas={[
          [t('comun.periodo'), etiquetaPeriodo(periodo)], [t('col.tipo_cierre'), t(`tipo_cierre.${periodo.tipo_cierre}`)],
          [t('col.estado'), <EstadoBadge key="e" estado={periodo.estado} />], [t('col.fecha_cierre'), formatoFecha(periodo.fecha_cierre, true)],
        ]} />
        {periodo.ultimo_cierre?.estado === 'FALLIDO' && (
          <Alert variant="error" title={t('cierre.ultimo_fallido', { paso: periodo.ultimo_cierre.paso_actual ?? '—' })}
            description={periodo.ultimo_cierre.error_detalle ?? undefined} style={{ marginTop: 'var(--s4)' }} />
        )}
      </section>

      {!cerrado && (
        <>
          <Subtitulo>{t('cierre.prevalidacion')}</Subtitulo>
          <ErrorApi error={prevalidacion.error ?? cierre.error} />
          {pv && (
            <div style={{ display: 'grid', gap: 'var(--s3)' }}>
              {pv.bloqueos.map((b) => <Alert key={b.codigo} variant="error" title={b.mensaje} />)}
              {pv.activos_sin_precio.length > 0 && (
                <Alert variant="warning" title={t('cierre.sin_precio', { count: pv.activos_sin_precio.length })}
                  description={pv.activos_sin_precio.map((a) => `${a.identificador} (${a.especie})`).join(', ')} />
              )}
              {pv.lineas_sin_trazabilidad.length > 0 && (
                <Alert variant="warning" title={t('cierre.sin_trazabilidad', { count: pv.lineas_sin_trazabilidad.length })}
                  description={pv.lineas_sin_trazabilidad.map((l) => `#${l.id_linea} ${t(`hecho.${l.tipo_hecho}`)}: ${l.faltantes.map((f) => t(`eslabon.${f}`, { defaultValue: f })).join(', ')}`).join(' · ')} />
              )}
              {pv.puede_cerrar && !pv.requiere_autorizacion && <Alert variant="success" title={t('cierre.listo')} />}
              {puedeCerrar && pv.puede_cerrar && (
                <div style={{ ...PANEL, display: 'grid', gap: 'var(--s3)' }}>
                  {pv.activos_sin_precio.length > 0 && (
                    <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 'var(--s2)' }}>
                      <legend style={{ fontWeight: 600, marginBottom: 'var(--s2)' }}>{t('cierre.que_hacer_sin_precio')}</legend>
                      <label style={{ display: 'flex', gap: 'var(--s2)' }}>
                        <input type="radio" name="sin-precio" checked={sinPrecio === 'excluir'} onChange={() => setSinPrecio('excluir')} />
                        {t('cierre.excluir')}
                      </label>
                      <label style={{ display: 'flex', gap: 'var(--s2)' }}>
                        <input type="radio" name="sin-precio" checked={sinPrecio === 'incluir'} onChange={() => setSinPrecio('incluir')} />
                        {t('cierre.incluir_estimacion')}
                      </label>
                    </fieldset>
                  )}
                  {pv.lineas_sin_trazabilidad.length > 0 && (
                    <label style={{ display: 'flex', gap: 'var(--s2)' }}>
                      <input type="checkbox" checked={autorizarLineas} onChange={(e) => setAutorizarLineas(e.target.checked)} />
                      {t('cierre.autorizar_lineas')}
                    </label>
                  )}
                  <div>
                    <Button variant="primary" size="md" loading={cierre.cargando} disabled={faltaAutorizar} onClick={() => setConfirmando(true)}>
                      <Lock size={16} aria-hidden />{t('cierre.ejecutar')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Subtitulo>{t('cierre.comprobantes')}</Subtitulo>
      <ErrorApi error={comprobantes.error ?? descarga.error} />
      {(comprobantes.data ?? []).length === 0 ? (
        <p style={SECUNDARIO}>{cerrado ? t('cierre.sin_comprobantes') : t('cierre.comprobantes_al_cerrar')}</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s3)' }}>
            <Button variant="secondary" size="sm" loading={descarga.cargando} onClick={() => descargar('csv')}><Download size={14} aria-hidden />CSV</Button>
            <Button variant="secondary" size="sm" loading={descarga.cargando} onClick={() => descargar('pdf')}><Download size={14} aria-hidden />PDF</Button>
          </div>
          <ScrollRegion label={t('cierre.comprobantes')}>
            <table style={TABLA}>
              <thead>
                <tr><th style={TH}>{t('col.codigo')}</th><th style={TH}>{t('col.tipo_hecho')}</th><th style={TH}>{t('col.especie')}</th>
                  <th style={TH}>{t('col.cuentas')}</th><th style={TH_NUM}>{t('col.valor')}</th><th style={TH}>{t('col.hash')}</th></tr>
              </thead>
              <tbody>
                {(comprobantes.data ?? []).map((c) => (
                  <tr key={c.id_comprobante_nic41}>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-body-sm)' }}>{c.codigo}</td>
                    <td style={TD}>{t(`hecho.${c.tipo_hecho}`)}</td>
                    <td style={TD}>{c.especie}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)' }}>{c.lineas.map((l) => `${l.cuenta_debito}/${l.cuenta_credito}`).join(' · ')}</td>
                    <td style={TD_NUM}>{formatoMoneda(c.valor_total)}</td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-body-sm)' }} title={c.hash_integridad}>{c.hash_integridad.slice(0, 12)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
        </>
      )}

      {puedeVerLineas && (
        <>
          <Subtitulo>{t('cierre.lineas')}</Subtitulo>
          <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center', flexWrap: 'wrap', marginBottom: 'var(--s3)' }}>
            <p style={{ ...SECUNDARIO, margin: 0, flex: '1 1 320px' }}>{t('cierre.lineas_ayuda')}</p>
            {puedeVerificar && !cerrado && (
              <Button variant="secondary" size="sm" loading={verificacion.cargando} onClick={verificar}><ShieldCheck size={14} aria-hidden />{t('cierre.verificar')}</Button>
            )}
          </div>
          <ErrorApi error={lineas.error ?? verificacion.error} />
          {(lineas.data ?? []).length === 0 ? <p style={SECUNDARIO}>{lineas.cargando ? t('comun.cargando') : t('cierre.sin_lineas')}</p> : (
            <ScrollRegion label={t('cierre.lineas')}>
              <table style={TABLA}>
                <thead>
                  <tr><th style={TH}>{t('col.fecha')}</th><th style={TH}>{t('col.tipo_hecho')}</th><th style={TH}>{t('col.sentido')}</th>
                    <th style={TH_NUM}>{t('col.valor')}</th><th style={TH}>{t('col.cuentas')}</th><th style={TH}>{t('col.estado')}</th>
                    <th style={TH}>{t('col.trazabilidad')}</th>{puedeVerCadena && <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>}</tr>
                </thead>
                <tbody>
                  {(lineas.data ?? []).map((l) => (
                    <tr key={l.id_linea_asiento_nic41}>
                      <td style={TD}>{formatoFecha(l.fecha_hecho)}</td>
                      <td style={TD}>{t(`hecho.${l.tipo_hecho}`)}{l.es_estimacion && <div style={SECUNDARIO}>{t('valor.estimado')}</div>}</td>
                      <td style={TD}>{t(`sentido.${l.sentido}`)}</td>
                      <td style={TD_NUM}>{formatoMoneda(l.valor)}</td>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)' }}>{l.cuenta_debito && l.cuenta_credito ? `${l.cuenta_debito} / ${l.cuenta_credito}` : '—'}</td>
                      <td style={TD}><EstadoBadge estado={l.estado} /></td>
                      <td style={TD}><EstadoBadge estado={l.estado_trazabilidad} /></td>
                      {puedeVerCadena && (
                        <td style={TD}><Button variant="ghost" size="sm" onClick={() => setCadenaDe(l)} aria-label={t('cierre.ver_cadena_aria', { id: l.id_linea_asiento_nic41 })}><Link2 size={14} aria-hidden />{t('cierre.ver_cadena')}</Button></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollRegion>
          )}
        </>
      )}

      {confirmando && (
        <ModalShell title={t('cierre.confirmar_titulo')} onClose={() => setConfirmando(false)} maxWidth={480}
          footer={(
            <>
              <Button variant="secondary" size="md" onClick={() => setConfirmando(false)}>{t('comun.cancelar')}</Button>
              <Button variant="primary" size="md" onClick={ejecutar}>{t('cierre.ejecutar')}</Button>
            </>
          )}>
          <p style={{ margin: 0, lineHeight: 'var(--lh-base)' }}>{t('cierre.confirmar_detalle', { periodo: etiquetaPeriodo(periodo) })}</p>
        </ModalShell>
      )}
      {cadenaDe && <CadenaModal linea={cadenaDe} onCerrar={() => setCadenaDe(null)} />}
    </>
  );
}

function CadenaModal({ linea, onCerrar }: { linea: Linea; onCerrar: () => void }) {
  const { t } = useT('finanzas');
  const cadena = useAsync(finanzasApi.cadena);
  const { ejecutar } = cadena;
  useEffect(() => { ejecutar(linea.id_linea_asiento_nic41); }, [linea.id_linea_asiento_nic41, ejecutar]);
  const c = cadena.data;
  const eslabones = (c?.eslabones ?? {}) as Record<string, unknown>;
  const presentes = ['origen', 'precio_documentado', 'evento_m02', 'lecturas_nic41', 'evento_sanitario', 'cierre']
    .filter((k) => k in eslabones && eslabones[k] !== null);
  return (
    <ModalShell title={t('cierre.cadena_titulo', { id: linea.id_linea_asiento_nic41 })} onClose={onCerrar} maxWidth={600}
      footer={<Button variant="secondary" size="md" onClick={onCerrar}>{t('comun.cerrar')}</Button>}>
      <ErrorApi error={cadena.error} />
      {c && (
        <>
          <Datos filas={[
            [t('col.tipo_hecho'), t(`hecho.${c.tipo_hecho}`)], [t('col.valor'), formatoMoneda(c.valor)],
            [t('col.evidencia'), t(`evidencia.${c.tipo_evidencia}`, { defaultValue: c.tipo_evidencia })],
            [t('col.trazabilidad'), <EstadoBadge key="e" estado={c.estado_trazabilidad} />],
          ]} />
          <Subtitulo>{t('cierre.eslabones')}</Subtitulo>
          <ul style={{ margin: 0, paddingLeft: 'var(--s5)', display: 'grid', gap: 'var(--s1)' }}>
            {presentes.map((k) => <li key={k}>{t(`eslabon.${k}`)}: {eslabones[k] ? t('comun.si') : t('comun.no')}</li>)}
          </ul>
          {(c.eslabones_faltantes ?? []).length > 0 && (
            <Alert variant="warning" title={t('cierre.faltantes')} description={(c.eslabones_faltantes ?? []).map((f) => t(`eslabon.${f}`, { defaultValue: f })).join(', ')}
              style={{ marginTop: 'var(--s3)' }} />
          )}
        </>
      )}
    </ModalShell>
  );
}

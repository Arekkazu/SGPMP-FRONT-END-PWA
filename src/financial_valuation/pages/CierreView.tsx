// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-87/RF-91: períodos, prevalidación y cierre, comprobantes NIC 41 y trazabilidad |
// | 2026-11-05 | Arekkazu | M06 RF-87 prototipo: tarjeta del período, precondiciones en lista, historial de cerrados |
// | 2026-11-10 | Arekkazu | INC-M06-345/350 RF-87: cierre en espera de autorización, cancelación, matriz y titular |
// | 2026-11-10 | Arekkazu | INC-M06-346-G43-02 RF-87: la prevalidación lista cada línea sin trazabilidad con su activo y lo que falta |
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Download, Lock, XCircle } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { Badge } from '../../shared/design-system/Badge';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_E, ACCION_R, R_CIERRE, R_RECONOCIMIENTO, R_REVELACIONES } from '../rbac';
import type { Periodo } from '../types';
import {
  Datos, EncabezadoVista, EstadoBadge, ErrorApi, SECUNDARIO, SinPeriodo, Subtitulo, TABLA, TD, TD_NUM, TH, TH_NUM, etiquetaPeriodo,
  formatoFecha, formatoMoneda, guardarArchivo, nombrePeriodo, useAsync, usePeriodo,
} from '../components/comunes';

type Nivel = 'ok' | 'aviso' | 'pendiente';
interface Check { id: string; nivel: Nivel; titulo: string; detalle: string }

const ICONO_CHECK: Record<Nivel, React.ReactNode> = {
  ok: <CheckCircle2 size={20} aria-hidden style={{ color: 'var(--sem-success)' }} />,
  aviso: <AlertTriangle size={20} aria-hidden style={{ color: 'var(--sem-warning)' }} />,
  pendiente: <XCircle size={20} aria-hidden style={{ color: 'var(--sem-error)' }} />,
};
const TONO_CHECK = { ok: 'success', aviso: 'warning', pendiente: 'error' } as const;
// Bloqueos que devuelve la prevalidación, cada uno con su precondición; uno desconocido sale con título genérico.
const BLOQUEOS: Array<[codigo: string, clave: string]> = [
  ['PERIODO_ANTERIOR_ABIERTO', 'anterior'], ['LINEAS_PENDIENTE_CUENTA', 'cuentas'], ['COSTOS_PENDIENTE_CLASIFICACION', 'costos'],
  ['ENTREGAS_M05_PENDIENTES', 'suministros'], ['MATRIZ_CONTABLE_INCOMPLETA', 'matriz'], ['FINCA_SIN_TITULAR', 'titular'],
];

export function CierreView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_CIERRE, ACCION_R);
  const { periodo, periodos, recargar } = usePeriodo();
  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.cierre')} />;
  return (
    <>
      <EncabezadoVista titulo={periodo ? t('cierre.titulo_periodo', { periodo: nombrePeriodo(periodo) }) : t('cierre.titulo')} descripcion={t('cierre.descripcion')} />
      {!periodo ? <SinPeriodo /> : (
        <PanelPeriodo key={periodo.id_periodo_contable} periodo={periodo} onCambio={recargar}
          onCerrado={(siguiente) => { recargar(); if (siguiente) pushToast('info', t('cierre.siguiente_abierto')); }} />
      )}
      <Historial periodos={periodos.filter((p) => p.estado === 'CERRADO')} />
    </>
  );
}

function PanelPeriodo({ periodo, onCerrado, onCambio }: {
  periodo: Periodo; onCerrado: (siguiente: number | null) => void; onCambio: () => void;
}) {
  const { t } = useT('finanzas');
  const puedeCerrar = usePermissionPorNombre(R_CIERRE, ACCION_E);
  const puedeVerPropuestas = usePermissionPorNombre(R_RECONOCIMIENTO, ACCION_R);
  const id = periodo.id_periodo_contable;
  const cerrado = periodo.estado === 'CERRADO';
  const prevalidacion = useAsync(finanzasApi.prevalidar);
  const propuestas = useAsync(finanzasApi.propuestas);
  const cierre = useAsync(finanzasApi.cerrar);
  const comprobantes = useAsync(finanzasApi.comprobantes);
  const descarga = useAsync(finanzasApi.descargarComprobantes);
  const cancelacion = useAsync(finanzasApi.cancelarCierre);
  // Un cierre EN_PROCESO en el paso 3 espera que el Contador autorice las exclusiones o lo cancele (RF-87 FA-2/FA-3).
  const ultimo = periodo.ultimo_cierre;
  const enEspera = periodo.estado === 'EN_CIERRE' && ultimo?.estado === 'EN_PROCESO' && ultimo.paso_actual === 3;
  const [sinPrecio, setSinPrecio] = useState<'' | 'excluir' | 'incluir'>('');
  const [autorizarLineas, setAutorizarLineas] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const { ejecutar: prevalidar } = prevalidacion;
  const { ejecutar: cargarPropuestas } = propuestas;
  const { ejecutar: cargarComprobantes } = comprobantes;
  useEffect(() => {
    if (!cerrado) {
      prevalidar(id);
      if (puedeVerPropuestas) cargarPropuestas();
    }
    cargarComprobantes(id);
  }, [id, cerrado, puedeVerPropuestas, prevalidar, cargarPropuestas, cargarComprobantes]);

  const pv = prevalidacion.data;
  // Los activos sin precio se excluyen o se incluyen con estimación; las líneas sin trazabilidad se excluyen con
  // autorización. El backend recibe una sola autorización para ambas.
  const faltaAutorizar = !!pv && ((pv.activos_sin_precio.length > 0 && !sinPrecio) || (pv.lineas_sin_trazabilidad.length > 0 && !autorizarLineas));
  const pendientes = (propuestas.data ?? []).filter((p) => p.es_confirmable);
  const conocidos = new Set(BLOQUEOS.map(([c]) => c));

  const checks: Check[] = pv ? [
    ...BLOQUEOS.map(([codigo, clave]): Check => {
      const b = pv.bloqueos.find((x) => x.codigo === codigo);
      return { id: codigo, nivel: b ? 'pendiente' : 'ok', titulo: t(`cierre.check_${clave}`), detalle: b?.mensaje ?? t(`cierre.check_${clave}_ok`) };
    }),
    ...pv.bloqueos.filter((b) => !conocidos.has(b.codigo))
      .map((b): Check => ({ id: b.codigo, nivel: 'pendiente', titulo: t('cierre.check_bloqueo'), detalle: b.mensaje })),
    ...(puedeVerPropuestas ? [{
      id: 'recon', nivel: (pendientes.length ? 'aviso' : 'ok') as Nivel, titulo: t('cierre.check_reconocimientos'),
      detalle: pendientes.length ? t('cierre.check_reconocimientos_pend', { count: pendientes.length, activos: pendientes.slice(0, 5).map((p) => p.identificador).join(', ') })
        : t('cierre.check_reconocimientos_ok'),
    }] : []),
    {
      id: 'precios', nivel: pv.activos_sin_precio.length ? 'aviso' : 'ok', titulo: t('cierre.check_precios'),
      detalle: pv.activos_sin_precio.length
        ? t('cierre.check_precios_pend', { count: pv.activos_sin_precio.length, activos: pv.activos_sin_precio.slice(0, 5).map((a) => `${a.identificador} (${a.especie})`).join(', ') })
        : t('cierre.check_precios_ok'),
    },
    {
      id: 'traza', nivel: pv.lineas_sin_trazabilidad.length ? 'aviso' : 'ok', titulo: t('cierre.check_trazabilidad'),
      detalle: pv.lineas_sin_trazabilidad.length
        ? t('cierre.check_trazabilidad_pend', { count: pv.lineas_sin_trazabilidad.length, hechos: [...new Set(pv.lineas_sin_trazabilidad.map((l) => t(`hecho.${l.tipo_hecho}`)))].join(', ') })
        : t('cierre.check_trazabilidad_ok'),
    },
  ] : [];
  const completas = checks.filter((c) => c.nivel === 'ok').length;

  const ejecutar = async () => {
    setConfirmando(false);
    const r = await cierre.ejecutar(id, { autorizar_exclusiones: sinPrecio === 'excluir' || autorizarLineas, incluir_activos_sin_precio: sinPrecio === 'incluir' });
    if (r) {
      pushToast('success', t('cierre.cerrado', { periodo: nombrePeriodo(periodo) }), t('cierre.cerrado_detalle', { count: r.comprobantes.length }));
      onCerrado(r.id_periodo_siguiente);
    } else {
      prevalidar(id);
      onCambio();  // el 409 de autorización deja el período EN_CIERRE
    }
  };

  const cancelar = async () => {
    if (await cancelacion.ejecutar(id)) {
      pushToast('info', t('cierre.cancelado', { periodo: nombrePeriodo(periodo) }));
      prevalidar(id);
      onCambio();
    }
  };

  const descargar = async (formato: 'csv' | 'pdf') => {
    const a = await descarga.ejecutar(id, formato);
    if (a) guardarArchivo(a.blob, a.nombre);
  };

  return (
    <>
      <section className="fin-tarjeta" aria-label={t('cierre.resumen')} style={{ marginBottom: 'var(--s5)' }}>
        <div className="fin-acciones" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
          <h2 style={{ margin: 0 }}>{t('cierre.periodo_de', { periodo: nombrePeriodo(periodo) })}</h2>
          <EstadoBadge estado={periodo.estado} />
        </div>
        <Datos filas={[
          [t('cierre.inicio'), formatoFecha(periodo.fecha_inicio)], [t('cierre.fin'), formatoFecha(periodo.fecha_fin)],
          [t('col.tipo_cierre'), t(`tipo_cierre.${periodo.tipo_cierre}`)], [t('cierre.titular'), `NIT ${periodo.numero_id_tributaria}`],
          [t('col.fecha_cierre'), periodo.fecha_cierre ? formatoFecha(periodo.fecha_cierre, true) : t('cierre.sin_cerrar')],
        ]} />
        {periodo.ultimo_cierre?.estado === 'FALLIDO' && (
          <Alert variant="error" title={t('cierre.ultimo_fallido', { paso: periodo.ultimo_cierre.paso_actual ?? 1 })}
            description={periodo.ultimo_cierre.error_detalle ?? undefined} style={{ marginTop: 'var(--s4)' }} />
        )}
        {enEspera && ultimo && (
          <Alert variant="warning" title={t('cierre.en_espera')} style={{ marginTop: 'var(--s4)' }}
            description={t('cierre.en_espera_detalle', {
              fecha: formatoFecha(ultimo.fecha_inicio, true), usuario: ultimo.nombre_usuario_ejecutor ?? t('cierre.otro_usuario'),
            })} />
        )}
        {enEspera && puedeCerrar && (
          <div className="fin-acciones" style={{ marginTop: 'var(--s3)' }}>
            <Button variant="secondary" size="sm" loading={cancelacion.cargando} onClick={cancelar}>
              <XCircle size={14} aria-hidden />{t('cierre.cancelar')}
            </Button>
          </div>
        )}
      </section>

      {!cerrado && (
        <section className="fin-tarjeta" aria-labelledby="cierre-pre" style={{ marginBottom: 'var(--s5)' }}>
          <div className="fin-acciones" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 id="cierre-pre" style={{ margin: 0 }}>{t('cierre.prevalidacion')}</h2>
            {checks.length > 0 && <Badge variant={completas === checks.length ? 'success' : 'warning'}>{t('cierre.completas', { n: completas, total: checks.length })}</Badge>}
          </div>
          <p style={{ ...SECUNDARIO, margin: 'var(--s1) 0 var(--s4)' }}>{t('cierre.prevalidacion_ayuda')}</p>
          <ErrorApi error={prevalidacion.error ?? cierre.error ?? cancelacion.error} />
          {prevalidacion.cargando && !pv && <p style={SECUNDARIO}>{t('comun.cargando')}</p>}
          {pv && (
            <>
              <ul className="fin-checks">
                {checks.map((c) => (
                  <li key={c.id} className={`fin-check${c.nivel === 'ok' ? '' : ` fin-check--${c.nivel}`}`}>
                    {ICONO_CHECK[c.nivel]}
                    <div>
                      <p className="fin-check__titulo">{c.titulo}</p>
                      <p className="fin-check__detalle">{c.detalle}</p>
                    </div>
                    <Badge variant={TONO_CHECK[c.nivel]}>{t(`cierre.nivel_${c.nivel}`)}</Badge>
                  </li>
                ))}
              </ul>
              {pv.lineas_sin_trazabilidad.length > 0 && (
                <div style={{ marginTop: 'var(--s4)' }}>
                  <table style={TABLA} aria-describedby="cierre-traza-titulo">
                    <caption id="cierre-traza-titulo" style={{ textAlign: 'left', fontWeight: 600, marginBottom: 'var(--s2)' }}>
                      {t('cierre.lineas_traza_titulo', { count: pv.lineas_sin_trazabilidad.length })}
                    </caption>
                    <thead>
                      <tr><th style={TH}>{t('cierre.lineas_traza_asiento')}</th><th style={TH}>{t('col.activo')}</th><th style={TH}>{t('cierre.lineas_traza_falta')}</th></tr>
                    </thead>
                    <tbody>
                      {pv.lineas_sin_trazabilidad.map((l) => (
                        <tr key={l.id_linea}>
                          <td style={TD}>{t('cierre.lineas_traza_linea', { linea: l.id_linea, hecho: t(`hecho.${l.tipo_hecho}`) })}</td>
                          <td style={TD}>{l.identificador ?? t('cierre.lineas_traza_sin_activo')}</td>
                          <td style={TD}>{l.faltantes.map((f) => t(`eslabon.${f}`, { defaultValue: t('cierre.eslabon_otro') })).join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {puedeCerrar && pv.puede_cerrar && (
                <div style={{ display: 'grid', gap: 'var(--s3)', marginTop: 'var(--s5)' }}>
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
                      <input type="checkbox" checked={autorizarLineas} aria-describedby="cierre-traza-titulo" onChange={(e) => setAutorizarLineas(e.target.checked)} />
                      {t('cierre.autorizar_lineas')}
                    </label>
                  )}
                  {pv.requiere_autorizacion && <Alert variant="warning" title={t('cierre.requiere_autorizacion')} />}
                  <div className="fin-acciones" style={{ alignItems: 'center' }}>
                    <Button variant="primary" size="lg" loading={cierre.cargando} disabled={faltaAutorizar} onClick={() => setConfirmando(true)}>
                      <Lock size={16} aria-hidden />{t('cierre.ejecutar')}
                    </Button>
                    <span style={SECUNDARIO}>{t('cierre.irreversible')}</span>
                  </div>
                </div>
              )}
              {!pv.puede_cerrar && <Alert variant="error" title={t('cierre.no_puede')} style={{ marginTop: 'var(--s4)' }} />}
            </>
          )}
        </section>
      )}

      <Subtitulo>{t('cierre.comprobantes')}</Subtitulo>
      <ErrorApi error={comprobantes.error ?? descarga.error} />
      {(comprobantes.data ?? []).length === 0 ? (
        <p style={SECUNDARIO}>{cerrado ? t('cierre.sin_comprobantes') : t('cierre.comprobantes_al_cerrar')}</p>
      ) : (
        <>
          <div className="fin-acciones" style={{ marginBottom: 'var(--s3)' }}>
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
                    <td style={TD}><span className="fin-mono">{c.codigo}</span></td>
                    <td style={TD}>{t(`hecho.${c.tipo_hecho}`)}</td>
                    <td style={TD}>{c.especie}</td>
                    <td style={TD}><span className="fin-mono">{c.lineas.map((l) => `${l.cuenta_debito}/${l.cuenta_credito}`).join(' · ')}</span></td>
                    <td style={TD_NUM}>{formatoMoneda(c.valor_total)}</td>
                    <td style={TD} title={c.hash_integridad}><span className="fin-mono">{c.hash_integridad.slice(0, 12)}…</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
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
    </>
  );
}

/** Períodos ya cerrados, con atajo a sus revelaciones (el prototipo los lista bajo el cierre). */
function Historial({ periodos }: { periodos: Periodo[] }) {
  const { t } = useT('finanzas');
  const history = useHistory();
  const { elegir } = usePeriodo();
  const puedeVerRevelaciones = usePermissionPorNombre(R_REVELACIONES, ACCION_R);
  if (periodos.length === 0) return null;
  const ordenados = [...periodos].sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
  const ver = (p: Periodo, destino: string) => { elegir(p.id_periodo_contable); history.push(destino); };
  return (
    <>
      <Subtitulo>{t('cierre.historial')}</Subtitulo>
      <ScrollRegion label={t('cierre.historial')}>
        <table style={TABLA}>
          <thead>
            <tr><th style={TH}>{t('comun.periodo')}</th><th style={TH}>{t('cierre.titular')}</th><th style={TH}>{t('col.fecha_cierre')}</th>
              <th style={TH}>{t('col.estado')}</th><th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th></tr>
          </thead>
          <tbody>
            {ordenados.map((p) => (
              <tr key={p.id_periodo_contable}>
                <td style={TD}><strong>{nombrePeriodo(p)}</strong><span className="fin-secundario">{t(`tipo_cierre.${p.tipo_cierre}`)}</span></td>
                <td style={TD}>NIT {p.numero_id_tributaria}</td>
                <td style={{ ...TD, whiteSpace: 'nowrap' }}>{p.fecha_cierre ? formatoFecha(p.fecha_cierre, true) : t('cierre.sin_cerrar')}</td>
                <td style={TD}><EstadoBadge estado={p.estado} /></td>
                <td style={TD}>
                  <div className="fin-acciones">
                    <Button variant="ghost" size="sm" onClick={() => ver(p, '/finanzas/cierre')}>{t('cierre.ver_comprobantes')}</Button>
                    {puedeVerRevelaciones && <Button variant="ghost" size="sm" onClick={() => ver(p, '/finanzas/revelaciones')}>{t('cierre.ver_revelaciones')}</Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
    </>
  );
}

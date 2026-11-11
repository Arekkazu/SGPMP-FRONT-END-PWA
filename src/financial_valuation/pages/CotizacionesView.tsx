// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-COT: cotizaciones de venta con valor razonable de referencia y control por versión |
// | 2026-11-05 | Arekkazu | M06 RF-COT prototipo: búsqueda y filtros por estado y activo; sin ids en pantalla |
// | 2026-11-10 | Arekkazu | TC-DIS-251..253 RF-COT: detalle por cotización, estado al cierre, conteo y referencia de solo lectura, errores bajo el campo y nombres para el Productor |
import React, { useEffect, useState } from 'react';
import { Eye, FileSignature, PencilLine, Plus, XCircle } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import type { ApiError } from '../../shared/api/errors';
import { decimalPositivo } from '../../supplies/lib/formato';
import { useActivosSuministros } from '../../supplies/hooks/useActivosSuministros';
import { nombreActivo } from '../../supplies/components/SelectorActivo';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_C, ACCION_D, ACCION_R, ACCION_U, R_COTIZACIONES, R_VALORACION } from '../rbac';
import type { ActivoValorado, Cotizacion } from '../types';
import {
  AreaTexto, Datos, EncabezadoVista, EstadoBadge, ErrorApi, Listado, MotivoModal, SECUNDARIO, TABLA, TD, TD_NUM, TH, TH_NUM, Variacion,
  formatoFecha, formatoMoneda, useAsync, useListado,
} from '../components/comunes';
import { sumar } from '../lib/decimal';

export function CotizacionesView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_COTIZACIONES, ACCION_R);
  const puedeCrear = usePermissionPorNombre(R_COTIZACIONES, ACCION_C);
  const puedeModificar = usePermissionPorNombre(R_COTIZACIONES, ACCION_U);
  const puedeAnular = usePermissionPorNombre(R_COTIZACIONES, ACCION_D);
  const puedeVerActivos = usePermissionPorNombre(R_VALORACION, ACCION_R);
  const cotizaciones = useAsync(finanzasApi.cotizaciones);
  const activos = useAsync(finanzasApi.activos);
  // El Productor no lee los activos valorados: los nombres salen del catálogo de activos biológicos que sí puede ver.
  const { activos: catalogo } = useActivosSuministros();
  const anulacion = useAsync(finanzasApi.anularCotizacion);
  const [nueva, setNueva] = useState(false);
  const [editar, setEditar] = useState<Cotizacion | null>(null);
  const [anular, setAnular] = useState<Cotizacion | null>(null);
  const [detalle, setDetalle] = useState<Cotizacion | null>(null);
  const { ejecutar: cargar } = cotizaciones;
  const { ejecutar: cargarActivos } = activos;
  useEffect(() => { if (puedeLeer) cargar(); }, [puedeLeer, cargar]);
  useEffect(() => { if (puedeVerActivos) cargarActivos(); }, [puedeVerActivos, cargarActivos]);

  const nombres = new Map<number, string>([
    ...catalogo.map((a) => [a.id_activo_biologico, nombreActivo(a)] as [number, string]),
    ...(activos.data ?? []).map((a) => [a.id_activo_biologico, a.identificador] as [number, string]),
  ]);
  const nombre = (id: number) => nombres.get(id) ?? t('cot.activo_sin_reconocer');
  // Una cotización agrupa varios activos: se buscan por su identificador en el buscador.
  const l = useListado(cotizaciones.data, (c) => `${c.activos_cotizados.map(nombre).join(' ')} ${c.condiciones ?? ''}`, [
    { id: 'estado', etiqueta: t('col.estado'), valor: (c) => c.estado, texto: (v) => t(`estado.${v}`) },
  ]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.cotizaciones')} />;
  const recargar = () => cargar();
  const describir = (c: Cotizacion) => `${formatoFecha(c.fecha_emision)} · ${c.activos_cotizados.map(nombre).join(', ')}`;
  const hayCerradas = (cotizaciones.data ?? []).some((c) => c.estado_periodo === 'CERRADO');
  const conAcciones = puedeModificar || puedeAnular;

  return (
    <>
      <EncabezadoVista
        titulo={t('cot.titulo')}
        descripcion={t('cot.descripcion')}
        acciones={puedeCrear && puedeVerActivos && (
          <Button variant="primary" size="md" onClick={() => setNueva(true)}><Plus size={18} aria-hidden />{t('cot.registrar')}</Button>
        )}
      />
      <Alert variant="info" title={t('cot.sin_efecto')} style={{ marginBottom: 'var(--s5)' }} />
      <ErrorApi error={cotizaciones.error} />
      <Listado l={l} idBase="cot" sustantivo={t('cot.sustantivo')} buscar={t('cot.buscar')} cargando={cotizaciones.cargando}
        vacio={{ icono: <FileSignature size={28} aria-hidden />, titulo: t('cot.vacio_titulo'), detalle: t('cot.vacio_detalle') }}>
        {(visibles) => (
          <table style={TABLA}>
            <thead>
              <tr>
                <th style={TH}>{t('col.fecha')}</th><th style={TH}>{t('col.activos')}</th><th style={TH_NUM}>{t('col.valor_referencia')}</th>
                <th style={TH_NUM}>{t('col.valor_propuesto')}</th><th style={TH_NUM}>{t('cot.diferencia')}</th><th style={TH}>{t('col.vencimiento')}</th>
                <th style={TH}>{t('cot.estado_actual')}</th>
                {hayCerradas && <th style={TH}>{t('cot.estado_al_cierre')}</th>}
                <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => {
                const cerrada = c.estado_periodo === 'CERRADO';
                const vigente = c.estado === 'COTIZADO' && !cerrada;
                return (
                  <tr key={c.id_cotizacion}>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(c.fecha_emision)}<span className="fin-secundario">{t('cot.version', { n: c.version })}</span></td>
                    <td style={TD}>{c.activos_cotizados.map(nombre).join(', ')}
                      {c.condiciones && <span className="fin-secundario">{c.condiciones}</span>}</td>
                    <td style={TD_NUM}>{formatoMoneda(c.valor_razonable_referencia)}</td>
                    <td style={TD_NUM}><strong>{formatoMoneda(c.valor_cotizacion_propuesto)}</strong></td>
                    <td style={TD_NUM}><Variacion valor={sumar([c.valor_cotizacion_propuesto, `-${c.valor_razonable_referencia}`])} /></td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{c.fecha_vencimiento ? formatoFecha(c.fecha_vencimiento) : t('cot.sin_vencimiento')}</td>
                    <td style={TD}><EstadoBadge estado={c.estado} />{c.motivo_anulacion && <span className="fin-secundario">{c.motivo_anulacion}</span>}</td>
                    {hayCerradas && <td style={TD}>{cerrada ? <EstadoBadge estado={c.estado_al_cierre ?? c.estado} /> : <span style={SECUNDARIO}>{t('cot.periodo_abierto')}</span>}</td>}
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      <Button variant="ghost" size="sm" onClick={() => setDetalle(c)} aria-label={t('cot.ver_aria', { cotizacion: describir(c) })}><Eye size={14} aria-hidden />{t('cot.ver')}</Button>
                      {vigente && puedeModificar && <Button variant="ghost" size="sm" onClick={() => setEditar(c)} aria-label={t('cot.modificar_aria', { cotizacion: describir(c) })}><PencilLine size={14} aria-hidden /></Button>}
                      {vigente && puedeAnular && <Button variant="ghost" size="sm" onClick={() => { anulacion.limpiar(); setAnular(c); }} aria-label={t('cot.anular_aria', { cotizacion: describir(c) })}><XCircle size={14} aria-hidden /></Button>}
                      {cerrada && conAcciones && <span className="fin-secundario">{t('cot.cerrada_sin_cambios')}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Listado>
      {detalle && (
        <ModalShell title={t('cot.detalle_titulo', { fecha: formatoFecha(detalle.fecha_emision) })} onClose={() => setDetalle(null)}
          footer={<Button variant="secondary" size="md" onClick={() => setDetalle(null)}>{t('comun.cerrar')}</Button>}>
          <Datos filas={[
            [t('col.activos'), detalle.activos_cotizados.map(nombre).join(', ')],
            [t('col.fecha'), formatoFecha(detalle.fecha_emision)],
            [t('col.valor_referencia'), formatoMoneda(detalle.valor_razonable_referencia)],
            [t('col.valor_propuesto'), formatoMoneda(detalle.valor_cotizacion_propuesto)],
            [t('cot.diferencia'), <Variacion key="d" valor={sumar([detalle.valor_cotizacion_propuesto, `-${detalle.valor_razonable_referencia}`])} />],
            [t('col.vencimiento'), detalle.fecha_vencimiento ? formatoFecha(detalle.fecha_vencimiento) : t('cot.sin_vencimiento')],
            [t('cot.estado_actual'), <EstadoBadge key="e" estado={detalle.estado} />],
            [t('cot.estado_al_cierre'), detalle.estado_periodo === 'CERRADO' ? <EstadoBadge key="c" estado={detalle.estado_al_cierre ?? detalle.estado} /> : t('cot.periodo_abierto')],
            [t('cot.version_col'), String(detalle.version)],
            [t('cot.condiciones'), detalle.condiciones || t('cot.sin_condiciones')],
            ...(detalle.motivo_anulacion ? [[t('cot.motivo'), detalle.motivo_anulacion] as [string, React.ReactNode]] : []),
          ]} />
          {detalle.estado_periodo === 'CERRADO' && <p style={{ ...SECUNDARIO, margin: 'var(--s4) 0 0' }}>{t('cot.cerrada_sin_cambios')}</p>}
        </ModalShell>
      )}
      {nueva && <CotizacionModal activos={activos.data ?? []} onCerrar={() => setNueva(false)} onGuardado={() => { setNueva(false); recargar(); }} />}
      {editar && <CotizacionModal activos={activos.data ?? []} cotizacion={editar} nombre={nombre} onCerrar={() => setEditar(null)} onGuardado={() => { setEditar(null); recargar(); }} />}
      {anular && (
        <MotivoModal titulo={t('cot.anular')} descripcion={t('cot.anular_ayuda')} etiqueta={t('cot.motivo')} confirmar={t('cot.anular')}
          min={20} max={2000} peligro enviando={anulacion.cargando} error={anulacion.error} onCerrar={() => setAnular(null)}
          onConfirmar={async (motivo) => {
            if (await anulacion.ejecutar(anular.id_cotizacion, anular.version, motivo)) { setAnular(null); pushToast('success', t('cot.anulada')); recargar(); }
          }} />
      )}
    </>
  );
}

const CAMPO_API: Record<string, string> = { valor_cotizacion_propuesto: 'valor', fecha_vencimiento: 'vencimiento', activos_cotizados: 'activos', condiciones: 'condiciones', justificacion: 'justificacion' };

function erroresDeApi(e: ApiError | null): Record<string, string> {
  if (!e) return {};
  const pares = (e.fields?.length ? e.fields : e.field ? [{ field: e.field, message: e.message }] : [])
    .map(({ field, message }) => [CAMPO_API[field] ?? CAMPO_API[field.split('.').pop() ?? ''], message] as const)
    .filter(([k]) => !!k) as Array<[string, string]>;
  return Object.fromEntries(pares);
}

function CotizacionModal({ activos, cotizacion, nombre, onCerrar, onGuardado }: {
  activos: ActivoValorado[]; cotizacion?: Cotizacion; nombre?: (id: number) => string; onCerrar: () => void; onGuardado: () => void;
}) {
  const { t } = useT('finanzas');
  const registro = useAsync(finanzasApi.registrarCotizacion);
  const modificacion = useAsync(finanzasApi.modificarCotizacion);
  const [seleccion, setSeleccion] = useState<number[]>(cotizacion?.activos_cotizados ?? []);
  const [valor, setValor] = useState(cotizacion ? String(Number(cotizacion.valor_cotizacion_propuesto)) : '');
  const [condiciones, setCondiciones] = useState(cotizacion?.condiciones ?? '');
  const [vencimiento, setVencimiento] = useState(cotizacion?.fecha_vencimiento ?? '');
  const [justificacion, setJustificacion] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const enviando = registro.cargando || modificacion.cargando;
  const errorApi = registro.error ?? modificacion.error;
  const error = { ...erroresDeApi(errorApi), ...errores };
  const errorGlobal = errorApi && Object.keys(erroresDeApi(errorApi)).length === 0 ? errorApi : null;
  const valorDe = (a: ActivoValorado) => (a.valorado_por_costo ? a.valor_contable_por_costo : a.valor_razonable_neto);
  // Valor razonable de referencia: la suma de los activos elegidos, de solo lectura (RF-COT).
  const referencia = cotizacion ? cotizacion.valor_razonable_referencia
    : sumar(activos.filter((a) => seleccion.includes(a.id_activo_biologico)).map((a) => valorDe(a) ?? '0'));

  const guardar = async () => {
    const e: Record<string, string> = {};
    const monto = decimalPositivo(valor);
    if (!monto) e.valor = t('cot.valor_invalido');
    if (!cotizacion && seleccion.length === 0) e.activos = t('cot.activos_requeridos');
    if (cotizacion && justificacion.trim().length < 10) e.justificacion = t('cot.justificacion_requerida');
    if (vencimiento && vencimiento < (cotizacion?.fecha_emision ?? new Date().toISOString().slice(0, 10))) e.vencimiento = t('cot.vencimiento_invalido');
    setErrores(e);
    if (Object.keys(e).length || !monto) return;
    const ok = cotizacion
      ? await modificacion.ejecutar(cotizacion.id_cotizacion, {
        version: cotizacion.version, justificacion: justificacion.trim(), valor_cotizacion_propuesto: monto,
        condiciones: condiciones.trim() || null, fecha_vencimiento: vencimiento || null,
      })
      : await registro.ejecutar({ activos_cotizados: seleccion, valor_cotizacion_propuesto: monto, condiciones: condiciones.trim() || null, fecha_vencimiento: vencimiento || null });
    if (ok) { pushToast('success', cotizacion ? t('cot.modificada') : t('cot.registrada')); onGuardado(); }
  };

  return (
    <ModalShell title={cotizacion ? t('cot.modificar', { fecha: formatoFecha(cotizacion.fecha_emision) }) : t('cot.registrar')} onClose={onCerrar} maxWidth={600}
      descripcion={cotizacion ? t('cot.modificar_ayuda') : undefined}
      footer={(
        <>
          <Button variant="secondary" size="md" onClick={onCerrar} disabled={enviando}>{t('comun.cancelar')}</Button>
          <Button variant="primary" size="md" loading={enviando} onClick={guardar}>{t('comun.guardar')}</Button>
        </>
      )}>
      <ErrorApi error={errorGlobal} />
      {cotizacion && nombre && (
        <div style={{ marginBottom: 'var(--s4)' }}>
          {/* Lo que no se puede cambiar (RF-COT): activos, emisión y período, como datos de solo lectura. */}
          <Datos filas={[
            [t('col.activos'), cotizacion.activos_cotizados.map(nombre).join(', ')],
            [t('cot.fecha_emision'), formatoFecha(cotizacion.fecha_emision)],
            [t('comun.periodo'), t(`estado.${cotizacion.estado_periodo}`, { defaultValue: cotizacion.estado_periodo })],
            [t('col.valor_referencia'), formatoMoneda(cotizacion.valor_razonable_referencia)],
          ]} />
          <p style={{ ...SECUNDARIO, margin: 'var(--s2) 0 0' }}>{t('cot.no_modificable')}</p>
        </div>
      )}
      {!cotizacion && (
        <fieldset style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', padding: 'var(--s3) var(--s4)', marginBottom: 'var(--s4)' }}>
          <legend style={{ fontSize: 'var(--fs-label-md)', fontWeight: 600, padding: '0 var(--s1)' }}>{t('col.activos')}</legend>
          {error.activos && <Alert variant="error" title={error.activos} style={{ marginBottom: 'var(--s3)' }} />}
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'grid', gap: 'var(--s1)' }}>
            {activos.map((a) => (
              <label key={a.id_activo_biologico} className="fin-casilla">
                <input type="checkbox" checked={seleccion.includes(a.id_activo_biologico)}
                  onChange={() => { setSeleccion(seleccion.includes(a.id_activo_biologico) ? seleccion.filter((x) => x !== a.id_activo_biologico) : [...seleccion, a.id_activo_biologico]); setErrores(({ activos: _, ...r }) => r); }} />
                <span>{a.identificador} · {a.especie}<span className="fin-secundario">{t('cot.valor_actual_de', { valor: formatoMoneda(valorDe(a)) })}</span></span>
              </label>
            ))}
          </div>
          <p role="status" style={{ ...SECUNDARIO, margin: 'var(--s2) 0 0' }}>{t('cot.seleccionados', { count: seleccion.length })}</p>
        </fieldset>
      )}
      <div className="ds-fg2">
        <Input id="cot-referencia" label={t('col.valor_referencia')} value={formatoMoneda(referencia)} readOnly aria-readonly="true" tabIndex={-1} hint={t('cot.referencia_ayuda')} />
        <Input id="cot-valor" label={t('col.valor_propuesto')} required inputMode="decimal" value={valor} onChange={(e) => { setValor(e.target.value); setErrores(({ valor: _, ...r }) => r); }} error={error.valor} />
        <Input id="cot-vencimiento" label={t('col.vencimiento')} type="date" value={vencimiento} onChange={(e) => { setVencimiento(e.target.value); setErrores(({ vencimiento: _, ...r }) => r); }}
          error={error.vencimiento} hint={vencimiento ? undefined : t('cot.sin_vencimiento_hint')} />
      </div>
      <div style={{ display: 'grid', gap: 'var(--s4)', marginTop: 'var(--s4)' }}>
        <AreaTexto id="cot-condiciones" label={t('cot.condiciones')} maxLength={2000} value={condiciones} onChange={(e) => setCondiciones(e.target.value)} error={error.condiciones} />
        {cotizacion && (
          <AreaTexto id="cot-justificacion" label={t('cot.justificacion')} required maxLength={2000} value={justificacion}
            onChange={(e) => { setJustificacion(e.target.value); setErrores(({ justificacion: _, ...r }) => r); }} error={error.justificacion} hint={t('comun.minimo', { n: 10 })} />
        )}
      </div>
    </ModalShell>
  );
}

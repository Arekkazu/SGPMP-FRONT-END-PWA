// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-COT: cotizaciones de venta con valor razonable de referencia y control por versión |
// | 2026-11-05 | Arekkazu | M06 RF-COT prototipo: búsqueda y filtros por estado y activo; sin ids en pantalla |
import React, { useEffect, useState } from 'react';
import { FileSignature, PencilLine, Plus, XCircle } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { decimalPositivo } from '../../supplies/lib/formato';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_C, ACCION_D, ACCION_R, ACCION_U, R_COTIZACIONES, R_VALORACION } from '../rbac';
import type { ActivoValorado, Cotizacion } from '../types';
import {
  AreaTexto, EncabezadoVista, EstadoBadge, ErrorApi, Listado, MotivoModal, SECUNDARIO, TABLA, TD, TD_NUM, TH, TH_NUM, Variacion,
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
  const anulacion = useAsync(finanzasApi.anularCotizacion);
  const [nueva, setNueva] = useState(false);
  const [editar, setEditar] = useState<Cotizacion | null>(null);
  const [anular, setAnular] = useState<Cotizacion | null>(null);
  const { ejecutar: cargar } = cotizaciones;
  const { ejecutar: cargarActivos } = activos;
  useEffect(() => { if (puedeLeer) cargar(); }, [puedeLeer, cargar]);
  useEffect(() => { if (puedeVerActivos) cargarActivos(); }, [puedeVerActivos, cargarActivos]);

  const nombres = new Map((activos.data ?? []).map((a) => [a.id_activo_biologico, a.identificador]));
  const nombre = (id: number) => nombres.get(id) ?? t('cot.activo_sin_reconocer');
  // Una cotización agrupa varios activos: se buscan por su identificador en el buscador.
  const l = useListado(cotizaciones.data, (c) => `${c.activos_cotizados.map(nombre).join(' ')} ${c.condiciones ?? ''}`, [
    { id: 'estado', etiqueta: t('col.estado'), valor: (c) => c.estado, texto: (v) => t(`estado.${v}`) },
  ]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.cotizaciones')} />;
  const recargar = () => cargar();
  const describir = (c: Cotizacion) => `${formatoFecha(c.fecha_emision)} · ${c.activos_cotizados.map(nombre).join(', ')}`;

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
                <th style={TH}>{t('col.estado')}</th>
                {(puedeModificar || puedeAnular) && <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>}
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => {
                const vigente = c.estado === 'COTIZADO' && c.estado_periodo !== 'CERRADO';
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
                    {(puedeModificar || puedeAnular) && (
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                        {vigente && puedeModificar && <Button variant="ghost" size="sm" onClick={() => setEditar(c)} aria-label={t('cot.modificar_aria', { cotizacion: describir(c) })}><PencilLine size={14} aria-hidden /></Button>}
                        {vigente && puedeAnular && <Button variant="ghost" size="sm" onClick={() => { anulacion.limpiar(); setAnular(c); }} aria-label={t('cot.anular_aria', { cotizacion: describir(c) })}><XCircle size={14} aria-hidden /></Button>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Listado>
      {nueva && <CotizacionModal activos={activos.data ?? []} onCerrar={() => setNueva(false)} onGuardado={() => { setNueva(false); recargar(); }} />}
      {editar && <CotizacionModal activos={activos.data ?? []} cotizacion={editar} onCerrar={() => setEditar(null)} onGuardado={() => { setEditar(null); recargar(); }} />}
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

function CotizacionModal({ activos, cotizacion, onCerrar, onGuardado }: {
  activos: ActivoValorado[]; cotizacion?: Cotizacion; onCerrar: () => void; onGuardado: () => void;
}) {
  const { t } = useT('finanzas');
  const registro = useAsync(finanzasApi.registrarCotizacion);
  const modificacion = useAsync(finanzasApi.modificarCotizacion);
  const [seleccion, setSeleccion] = useState<number[]>(cotizacion?.activos_cotizados ?? []);
  const [valor, setValor] = useState(cotizacion ? String(Number(cotizacion.valor_cotizacion_propuesto)) : '');
  const [condiciones, setCondiciones] = useState(cotizacion?.condiciones ?? '');
  const [vencimiento, setVencimiento] = useState(cotizacion?.fecha_vencimiento ?? '');
  const [justificacion, setJustificacion] = useState('');
  const [aviso, setAviso] = useState<string>();
  const enviando = registro.cargando || modificacion.cargando;

  const guardar = async () => {
    const monto = decimalPositivo(valor);
    if (!monto) { setAviso(t('cot.valor_invalido')); return; }
    if (!cotizacion && seleccion.length === 0) { setAviso(t('cot.activos_requeridos')); return; }
    if (cotizacion && justificacion.trim().length < 10) { setAviso(t('cot.justificacion_requerida')); return; }
    setAviso(undefined);
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
      footer={(
        <>
          <Button variant="secondary" size="md" onClick={onCerrar} disabled={enviando}>{t('comun.cancelar')}</Button>
          <Button variant="primary" size="md" loading={enviando} onClick={guardar}>{t('comun.guardar')}</Button>
        </>
      )}>
      <ErrorApi error={registro.error ?? modificacion.error} />
      {aviso && <Alert variant="error" title={aviso} style={{ marginBottom: 'var(--s3)' }} />}
      {!cotizacion && (
        <fieldset style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', padding: 'var(--s3) var(--s4)', marginBottom: 'var(--s4)' }}>
          <legend style={{ fontSize: 'var(--fs-label-md)', fontWeight: 600, padding: '0 var(--s1)' }}>{t('col.activos')}</legend>
          <div style={{ maxHeight: 180, overflowY: 'auto', display: 'grid', gap: 'var(--s1)' }}>
            {activos.map((a) => (
              <label key={a.id_activo_biologico} style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
                <input type="checkbox" checked={seleccion.includes(a.id_activo_biologico)}
                  onChange={() => setSeleccion(seleccion.includes(a.id_activo_biologico) ? seleccion.filter((x) => x !== a.id_activo_biologico) : [...seleccion, a.id_activo_biologico])} />
                {a.identificador} · {a.especie} · {formatoMoneda(a.valorado_por_costo ? a.valor_contable_por_costo : a.valor_razonable_neto)}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="ds-fg2">
        <Input id="cot-valor" label={t('col.valor_propuesto')} required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
        <Input id="cot-vencimiento" label={t('col.vencimiento')} type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gap: 'var(--s4)', marginTop: 'var(--s4)' }}>
        <AreaTexto id="cot-condiciones" label={t('cot.condiciones')} maxLength={2000} value={condiciones} onChange={(e) => setCondiciones(e.target.value)} />
        {cotizacion && (
          <AreaTexto id="cot-justificacion" label={t('cot.justificacion')} required maxLength={2000} value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)} hint={t('comun.minimo', { n: 10 })} />
        )}
      </div>
    </ModalShell>
  );
}

// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-90: costos del activo (manuales, factura de proveedor, reparto y clasificación) |
// | 2026-11-05 | Arekkazu | M06 RF-90 prototipo: costos del período consolidados por naturaleza y tipo, con filtros |
// | 2026-11-10 | Arekkazu | TC-DIS-247..250 RF-90: consolidados en tabla (tipo, origen, activo), errores bajo cada campo, vista previa del reparto y cuenta débito resuelta |
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Receipt, Tags, Trash2 } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import type { ApiError } from '../../shared/api/errors';
import { decimalPositivo } from '../../supplies/lib/formato';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_C, ACCION_R, ACCION_U, R_CONFIGURACION, R_COSTOS, R_VALORACION } from '../rbac';
import { ORIGENES, SUBTIPOS } from '../types';
import type { ActivoValorado, Asignacion, Costo, CostoPayload, Naturaleza, OrigenCosto, Subtipo } from '../types';
import { sumar } from '../lib/decimal';
import {
  AreaTexto, BadgeTono, CeldaActivo, EncabezadoVista, EstadoBadge, ErrorApi, Listado, MotivoModal, SECUNDARIO, SinPeriodo, TABLA, TD, TD_NUM, TH,
  TH_NUM, formatoFecha, formatoMoneda, nombrePeriodo, useAsync, useListado, usePeriodo,
} from '../components/comunes';

const ORIGENES_MANUALES: OrigenCosto[] = ['MANO_OBRA_PROPIA', 'COMPRA_PROVEEDOR', 'SERVICIO_TERCERO'];
const NATURALEZAS: Naturaleza[] = ['MANTENIMIENTO', 'INVERSION', 'VENTA'];
const TONO_NATURALEZA = { MANTENIMIENTO: 'success', VENTA: 'info', INVERSION: 'warning' } as const;
/** Un reverso resta del total. */
const firmado = (c: Costo) => (c.es_reverso ? `-${c.monto_costo}` : c.monto_costo);
const pct = (parte: string, total: string) => (Number(total) ? `${((Number(parte) / Number(total)) * 100).toFixed(1)} %` : '—');

/** Tabla de subtotales con encabezado de fila (WCAG 1.3.1): la alternativa a cualquier barra. */
function Subtotales({ titulo, filas, total }: { titulo: string; filas: Array<[string, string]>; total: string }) {
  const { t } = useT('finanzas');
  return (
    <ScrollRegion label={titulo}>
      <table style={TABLA}>
        <thead><tr><th style={TH}>{titulo}</th><th style={TH_NUM}>{t('col.monto')}</th><th style={TH_NUM}>{t('costos.participacion')}</th></tr></thead>
        <tbody>
          {filas.map(([k, v]) => <tr key={k}><th scope="row" style={{ ...TD, textAlign: 'left', fontWeight: 500 }}>{k}</th><td style={TD_NUM}>{formatoMoneda(v)}</td><td style={TD_NUM}>{pct(v, total)}</td></tr>)}
          <tr><th scope="row" style={{ ...TD, textAlign: 'left', fontWeight: 700 }}>{t('costos.subtotal')}</th><td style={{ ...TD_NUM, fontWeight: 700 }}>{formatoMoneda(total)}</td><td style={TD_NUM}>100 %</td></tr>
        </tbody>
      </table>
    </ScrollRegion>
  );
}

export function CostosView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_COSTOS, ACCION_R);
  const puedeRegistrar = usePermissionPorNombre(R_COSTOS, ACCION_C);
  const puedeClasificar = usePermissionPorNombre(R_COSTOS, ACCION_U);
  const puedeVerActivos = usePermissionPorNombre(R_VALORACION, ACCION_R);
  const { periodo } = usePeriodo();
  const costos = useAsync(finanzasApi.costos);
  const activos = useAsync(finanzasApi.activos);
  const [registrar, setRegistrar] = useState(false);
  const [aClasificar, setAClasificar] = useState<Costo | null>(null);
  const id = periodo?.id_periodo_contable;
  const { ejecutar: cargar } = costos;
  const { ejecutar: cargarActivos } = activos;
  const recargar = () => { if (id) cargar({ id_periodo_contable: id }); };
  useEffect(() => { if (puedeLeer && id) cargar({ id_periodo_contable: id }); }, [puedeLeer, id, cargar]);
  useEffect(() => { if (puedeVerActivos) cargarActivos(); }, [puedeVerActivos, cargarActivos]);

  const l = useListado(costos.data, (c) => `${c.activo ?? ''} ${c.especie} ${c.finca} ${c.tercero_razon_social ?? ''} ${c.factura_numero ?? ''}`, [
    { id: 'naturaleza', etiqueta: t('col.naturaleza'), valor: (c) => c.naturaleza_costo ?? 'SIN_CLASIFICAR', texto: (v) => t(`naturaleza.${v}`), femenino: true },
    { id: 'subtipo', etiqueta: t('col.subtipo'), valor: (c) => c.subtipo_costo, texto: (v) => t(`subtipo.${v}`) },
    { id: 'estado', etiqueta: t('col.estado'), valor: (c) => c.estado, texto: (v) => t(`estado.${v}`) },
    { id: 'origen', etiqueta: t('col.origen'), valor: (c) => c.origen_costo, texto: (v) => t(`origen_costo.${v}`) },
  ]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.costos')} />;
  const lista = costos.data ?? [];
  const pendientes = lista.filter((c) => c.estado === 'PENDIENTE_CLASIFICACION');
  const total = sumar(lista.map(firmado));
  const grupos = NATURALEZAS.map((n) => {
    const deEsta = lista.filter((c) => c.naturaleza_costo === n);
    const porSubtipo = SUBTIPOS.map((s) => ({ s, total: sumar(deEsta.filter((c) => c.subtipo_costo === s).map(firmado)) }))
      .filter((x) => Number(x.total) !== 0);
    return { n, registros: deEsta.length, total: sumar(deEsta.map(firmado)), porSubtipo };
  }).filter((g) => g.registros > 0);
  const porOrigen = ORIGENES.map((o) => [t(`origen_costo.${o}`), sumar(lista.filter((c) => c.origen_costo === o).map(firmado))] as [string, string]).filter(([, v]) => Number(v) !== 0);
  const porActivo = [...new Map(lista.map((c) => [c.id_activo_biologico ?? 0, c.activo ?? t('costos.sin_activo')])).entries()]
    .map(([idA, nombre]) => [nombre, sumar(lista.filter((c) => (c.id_activo_biologico ?? 0) === idA).map(firmado))] as [string, string])
    .filter(([, v]) => Number(v) !== 0);

  return (
    <>
      <EncabezadoVista
        titulo={t('costos.titulo')}
        descripcion={periodo ? t('costos.descripcion_periodo', { periodo: nombrePeriodo(periodo) }) : t('costos.descripcion')}
        acciones={puedeRegistrar && puedeVerActivos && (
          <Button variant="primary" size="md" onClick={() => setRegistrar(true)}><Plus size={18} aria-hidden />{t('costos.registrar')}</Button>
        )}
      />
      <div className="fin-avisos">
        <Alert variant="info" title={t('costos.politica_titulo')} description={t('costos.politica_detalle')} />
        {pendientes.length > 0 && (
          <div className="fin-acciones" style={{ alignItems: 'center' }}>
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <Alert variant="warning" title={t('costos.pendientes_titulo', { count: pendientes.length })} description={t('costos.pendientes_detalle')} id="costos-pendientes-aviso" />
            </div>
            <Button variant="secondary" size="md" onClick={() => l.setFiltro('estado', 'PENDIENTE_CLASIFICACION')} aria-describedby="costos-pendientes-aviso">{t('costos.ver_pendientes')}</Button>
          </div>
        )}
      </div>
      <ErrorApi error={costos.error ?? activos.error} />
      {!periodo ? <SinPeriodo /> : (
        <>
          {grupos.length > 0 && (
            <div className="fin-columnas">
              {grupos.map((g) => (
                <section key={g.n} className="fin-tarjeta" aria-labelledby={`costos-${g.n}`} style={{ borderLeft: `4px solid var(--sem-${TONO_NATURALEZA[g.n]})` }}>
                  <div className="fin-acciones" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <BadgeTono tono={TONO_NATURALEZA[g.n]}>{t(`naturaleza.${g.n}`)}</BadgeTono>
                    <span style={SECUNDARIO}>{t('costos.registros', { count: g.registros })}</span>
                  </div>
                  <h2 id={`costos-${g.n}`} style={{ margin: 'var(--s3) 0 0' }}>{t(`costos.total_${g.n}`)}</h2>
                  <p className="fin-kpi__valor" style={{ margin: 'var(--s1) 0' }}>{formatoMoneda(g.total)}</p>
                  <p style={{ ...SECUNDARIO, margin: '0 0 var(--s3)' }}>{t(`costos.ayuda_${g.n}`)}</p>
                  <Subtotales titulo={t('col.subtipo')} filas={g.porSubtipo.map((x) => [t(`subtipo.${x.s}`), x.total])} total={g.total} />
                </section>
              ))}
              <section className="fin-tarjeta" aria-labelledby="costos-origen">
                <h2 id="costos-origen">{t('costos.por_origen')}</h2>
                <Subtotales titulo={t('col.origen')} filas={porOrigen} total={total} />
              </section>
              <section className="fin-tarjeta" aria-labelledby="costos-activo">
                <h2 id="costos-activo">{t('costos.por_activo')}</h2>
                <Subtotales titulo={t('col.activo')} filas={porActivo} total={total} />
              </section>
            </div>
          )}
          <Listado l={l} idBase="costos" titulo={t('costos.registros_titulo')} sustantivo={t('costos.sustantivo')} buscar={t('costos.buscar')}
            cargando={costos.cargando}
            vacio={{ icono: <Receipt size={28} aria-hidden />, titulo: t('costos.vacio_titulo'), detalle: t('costos.vacio_detalle') }}>
            {(visibles) => (
              <table style={TABLA}>
                <thead>
                  <tr>
                    <th style={TH}>{t('col.activo')}</th><th style={TH}>{t('col.naturaleza')}</th><th style={TH}>{t('col.subtipo')}</th>
                    <th style={TH_NUM}>{t('col.monto')}</th><th style={TH}>{t('col.estado')}</th><th style={TH}>{t('col.origen')}</th>
                    <th style={TH}>{t('col.fecha')}</th>{puedeClasificar && <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((c) => (
                    <tr key={c.id_registro_costo} className={c.estado === 'PENDIENTE_CLASIFICACION' ? 'fin-fila--atencion' : undefined}>
                      <td style={TD}>
                        <CeldaActivo identificador={c.activo ?? t('costos.sin_activo')} especie={c.especie} finca={c.finca} />
                        {c.id_grupo_reparto && <span className="fin-secundario">{t('costos.repartido')}</span>}
                      </td>
                      <td style={TD}>{c.naturaleza_costo
                        ? <BadgeTono tono={TONO_NATURALEZA[c.naturaleza_costo]}>{t(`naturaleza.${c.naturaleza_costo}`)}</BadgeTono>
                        : t('naturaleza.SIN_CLASIFICAR')}</td>
                      <td style={TD}>
                        {t(`subtipo.${c.subtipo_costo}`)}
                        <span className="fin-secundario">{t(`vehiculo.${c.vehiculo_contable}`, { defaultValue: t('vehiculo.NINGUNO') })}{c.politica_capitalizacion === 'CAPITALIZAR' ? ` · ${t('costos.capitalizado')}` : ''}</span>
                      </td>
                      <td style={TD_NUM}>{c.es_reverso ? <span className="fin-neg">−{formatoMoneda(c.monto_costo)}</span> : formatoMoneda(c.monto_costo)}</td>
                      <td style={TD}><EstadoBadge estado={c.estado} /></td>
                      <td style={TD}>
                        {t(`origen_costo.${c.origen_costo}`)}
                        {c.factura_numero && <span className="fin-secundario">{t('costos.factura', { numero: `${c.factura_prefijo ?? ''}${c.factura_numero}`, tercero: c.tercero_razon_social ?? '' })}</span>}
                      </td>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(c.fecha_costo)}</td>
                      {puedeClasificar && (
                        <td style={TD}>
                          {c.estado === 'PENDIENTE_CLASIFICACION' && (
                            <Button variant="secondary" size="sm" onClick={() => setAClasificar(c)}
                              aria-label={t('costos.clasificar_aria', { subtipo: t(`subtipo.${c.subtipo_costo}`), activo: c.activo ?? t('costos.sin_activo'), monto: formatoMoneda(c.monto_costo) })}>
                              <Tags size={14} aria-hidden />{t('costos.clasificar')}
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Listado>
        </>
      )}
      {registrar && <CostoModal activos={activos.data ?? []} onCerrar={() => setRegistrar(false)} onGuardado={() => { setRegistrar(false); recargar(); }} />}
      {aClasificar && <ClasificarModal costo={aClasificar} onCerrar={() => setAClasificar(null)} onGuardado={() => { setAClasificar(null); recargar(); }} />}
    </>
  );
}

const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Campo del backend → campo del formulario, para poner cada error debajo del control (WCAG 3.3.1). */
const CAMPO_API: Record<string, string> = {
  tercero_nit: 'nit', tercero_dv: 'dv', tercero_razon_social: 'razon', factura_prefijo: 'prefijo', factura_numero: 'numero',
  fecha_factura: 'fechaFactura', fecha_vencimiento_factura: 'vencimiento', monto_costo: 'monto', fecha_costo: 'fecha',
  justificacion: 'justificacion', subtipo_costo: 'subtipo', origen_costo: 'origen', naturaleza_costo: 'naturaleza',
  id_activo_biologico: 'uno', activos_reparto: 'reparto', metodo_reparto: 'metodo',
};

function erroresDeApi(e: ApiError | null): Record<string, string> {
  if (!e) return {};
  const pares = (e.fields?.length ? e.fields : e.field ? [{ field: e.field, message: e.message }] : [])
    .map(({ field, message }) => [CAMPO_API[field] ?? CAMPO_API[field.split('.').pop() ?? ''], message] as const)
    .filter(([k]) => !!k) as Array<[string, string]>;
  return Object.fromEntries(pares);
}

function CostoModal({ activos, onCerrar, onGuardado }: { activos: ActivoValorado[]; onCerrar: () => void; onGuardado: () => void }) {
  const { t } = useT('finanzas');
  const puedeVerMatriz = usePermissionPorNombre(R_CONFIGURACION, ACCION_R);
  const registro = useAsync(finanzasApi.registrarCosto);
  const configuracion = useAsync(finanzasApi.configuracion);
  const { ejecutar: cargarConfiguracion } = configuracion;
  useEffect(() => { if (puedeVerMatriz) cargarConfiguracion(); }, [puedeVerMatriz, cargarConfiguracion]);
  const [f, setF] = useState({
    subtipo: 'MANO_OBRA' as Subtipo, origen: 'MANO_OBRA_PROPIA' as OrigenCosto, monto: '', fecha: hoyIso(), naturaleza: '' as Naturaleza | '',
    justificacion: '', nit: '', dv: '', razon: '', prefijo: '', numero: '', fechaFactura: '', vencimiento: '', capitalizar: false,
  });
  const [destino, setDestino] = useState<'uno' | 'reparto'>('uno');
  const [uno, setUno] = useState('');
  const [reparto, setReparto] = useState<number[]>([]);
  const [metodo, setMetodo] = useState<'POR_CABEZAS' | 'POR_BIOMASA'>('POR_CABEZAS');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [avisoMetodo, setAvisoMetodo] = useState('');
  const grupoRef = useRef<HTMLFieldSetElement>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setF({ ...f, [k]: e.target.value });
    if (errores[k]) setErrores((er) => { const { [k]: _, ...resto } = er; return resto; });
  };
  const conProveedor = f.origen === 'COMPRA_PROVEEDOR' || f.origen === 'SERVICIO_TERCERO';
  const requiereJustificacion = f.subtipo === 'OTRO' || f.naturaleza === 'INVERSION' || f.naturaleza === 'VENTA';
  const error = { ...erroresDeApi(registro.error), ...errores };
  const errorGlobal = registro.error && Object.keys(erroresDeApi(registro.error)).length === 0 ? registro.error : null;

  // Cuenta débito que resolverá el sistema según la matriz contable (RF-90): solo lectura, antes de guardar.
  const matriz = configuracion.data?.matriz ?? [];
  const hecho = f.origen === 'MANO_OBRA_PROPIA' ? 'MANO_OBRA_PROPIA' : 'CONSUMO_INSUMO';
  const asignacion: Asignacion | undefined = matriz.find((a) => a.subtipo_costo === f.subtipo) ?? matriz.find((a) => a.tipo_hecho === hecho && !a.subtipo_costo);
  const cuentaDebito = !puedeVerMatriz ? t('costos.cuenta_segun_matriz') : configuracion.cargando ? t('comun.cargando')
    : asignacion ? `${asignacion.cuenta_debito} · ${t('costos.cuenta_credito_corta', { cuenta: asignacion.cuenta_credito })}` : t('costos.cuenta_sin_configurar');

  const validar = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!decimalPositivo(f.monto)) e.monto = t('costos.monto_invalido');
    if (destino === 'uno' && !uno) e.uno = t('costos.activo_requerido');
    if (destino === 'reparto' && reparto.length < 2) e.reparto = t('costos.reparto_minimo');
    if (requiereJustificacion && f.justificacion.trim().length < 10) e.justificacion = t('costos.justificacion_requerida');
    if (conProveedor) {
      if (!/^\d{6,15}$/.test(f.nit)) e.nit = t('costos.nit_invalido');
      if (!/^\d$/.test(f.dv)) e.dv = t('costos.dv_invalido');
      if (!f.razon.trim()) e.razon = t('comun.requerido');
      if (!f.numero.trim()) e.numero = t('comun.requerido');
      if (!f.fechaFactura) e.fechaFactura = t('comun.requerido');
    }
    return e;
  };

  const guardar = async () => {
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length) return;
    const p: CostoPayload = {
      subtipo_costo: f.subtipo, origen_costo: f.origen, monto_costo: decimalPositivo(f.monto) as string, fecha_costo: f.fecha,
      ...(destino === 'uno' ? { id_activo_biologico: Number(uno) } : { activos_reparto: reparto, metodo_reparto: metodo }),
      ...(f.naturaleza ? { naturaleza_costo: f.naturaleza } : {}),
      ...(f.justificacion.trim() ? { justificacion: f.justificacion.trim() } : {}),
      ...(conProveedor ? {
        tercero_nit: f.nit, tercero_dv: f.dv, tercero_razon_social: f.razon.trim(), factura_prefijo: f.prefijo.trim() || undefined,
        factura_numero: f.numero.trim(), fecha_factura: f.fechaFactura, fecha_vencimiento_factura: f.vencimiento || undefined,
      } : {}),
      ...(f.naturaleza === 'INVERSION' && f.capitalizar ? { confirmar_capitalizacion: true } : {}),
    };
    const r = await registro.ejecutar(p);
    if (r) {
      pushToast('success', t('costos.registrado', { count: r.registros.length }), r.aviso ? t('costos.aviso_fuente_unica') : undefined);
      onGuardado();
    }
  };

  const alternar = (id: number) => setReparto(reparto.includes(id) ? reparto.filter((x) => x !== id) : [...reparto, id]);
  const quitar = (id: number, indice: number) => {
    setReparto(reparto.filter((x) => x !== id));
    // El foco pasa al siguiente «Quitar» o, si era el último, al grupo de activos (WCAG 2.4.3).
    setTimeout(() => {
      const botones = grupoRef.current?.querySelectorAll<HTMLButtonElement>('[data-quitar]') ?? [];
      (botones[Math.min(indice, botones.length - 1)] ?? grupoRef.current?.querySelector<HTMLElement>('input'))?.focus();
    }, 0);
  };
  const cambiarMetodo = (m: 'POR_CABEZAS' | 'POR_BIOMASA') => {
    setMetodo(m);
    setAvisoMetodo(m === 'POR_BIOMASA' ? t('costos.aviso_biomasa') : t('costos.aviso_cabezas'));
  };
  const seleccionados = activos.filter((a) => reparto.includes(a.id_activo_biologico));
  const montoReparto = decimalPositivo(f.monto);
  // Vista previa del reparto por cabezas: partes iguales entre los activos elegidos; el residuo del redondeo va al primero.
  const parte = montoReparto && seleccionados.length ? Math.floor((Number(montoReparto) * 100) / seleccionados.length) / 100 : 0;
  const residuo = montoReparto ? Number((Number(montoReparto) - parte * seleccionados.length).toFixed(2)) : 0;
  const tipoActivo = (a: ActivoValorado) => t(`cadena.tipo_${a.tipo}`, { defaultValue: a.tipo });

  return (
    <ModalShell title={t('costos.registrar')} onClose={onCerrar} maxWidth={720} descripcion={t('costos.registrar_ayuda')}
      footer={(
        <>
          <Button variant="secondary" size="md" onClick={onCerrar} disabled={registro.cargando}>{t('comun.cancelar')}</Button>
          <Button variant="primary" size="md" loading={registro.cargando} onClick={guardar}>{t('comun.guardar')}</Button>
        </>
      )}>
      <ErrorApi error={errorGlobal} />
      <div className="ds-fg2">
        <Select id="co-subtipo" label={t('col.subtipo')} required value={f.subtipo} onChange={set('subtipo')} error={error.subtipo}>
          {SUBTIPOS.filter((s) => s !== 'ALIMENTO' && s !== 'MEDICAMENTO').map((s) => <option key={s} value={s}>{t(`subtipo.${s}`)}</option>)}
        </Select>
        <Select id="co-origen" label={t('col.origen')} required value={f.origen} onChange={set('origen')} error={error.origen}>
          {ORIGENES_MANUALES.map((o) => <option key={o} value={o}>{t(`origen_costo.${o}`)}</option>)}
        </Select>
        <Input id="co-monto" label={t('col.monto')} required inputMode="decimal" value={f.monto} onChange={set('monto')} error={error.monto} />
        <Input id="co-fecha" label={t('col.fecha')} type="date" required max={hoyIso()} value={f.fecha} onChange={set('fecha')} error={error.fecha} />
        <Select id="co-naturaleza" label={t('col.naturaleza')} value={f.naturaleza} onChange={set('naturaleza')} hint={t('costos.naturaleza_ayuda')} error={error.naturaleza}>
          <option value="">{t('costos.naturaleza_automatica')}</option>
          {NATURALEZAS.map((n) => <option key={n} value={n}>{t(`naturaleza.${n}`)}</option>)}
        </Select>
        <Select id="co-destino" label={t('costos.destino')} value={destino} onChange={(e) => setDestino(e.target.value as 'uno' | 'reparto')}>
          <option value="uno">{t('costos.un_activo')}</option>
          <option value="reparto">{t('costos.varios_activos')}</option>
        </Select>
        <Input id="co-cuenta" label={t('costos.cuenta_debito')} value={cuentaDebito} readOnly aria-readonly="true" tabIndex={-1} hint={t('costos.cuenta_debito_ayuda')} />
      </div>
      {f.naturaleza === 'INVERSION' && (
        <label className="fin-casilla" style={{ marginTop: 'var(--s4)' }}>
          <input type="checkbox" checked={f.capitalizar} onChange={(e) => setF({ ...f, capitalizar: e.target.checked })} />
          <span>{t('costos.capitalizar')}<span style={{ ...SECUNDARIO, display: 'block' }}>{t('costos.capitalizar_ayuda')}</span></span>
        </label>
      )}
      <div style={{ marginTop: 'var(--s4)' }}>
        {destino === 'uno' ? (
          <Select id="co-activo" label={t('col.activo')} required value={uno} onChange={(e) => { setUno(e.target.value); setErrores(({ uno: _, ...r }) => r); }} error={error.uno}>
            <option value="">{t('comun.elegir')}</option>
            {activos.map((a) => <option key={a.id_activo_biologico} value={a.id_activo_biologico}>{a.identificador} · {a.especie} · {tipoActivo(a)}</option>)}
          </Select>
        ) : (
          <fieldset ref={grupoRef} style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', padding: 'var(--s3) var(--s4)' }}>
            <legend style={{ fontSize: 'var(--fs-label-md)', fontWeight: 600, padding: '0 var(--s1)' }}>{t('costos.activos_reparto')}</legend>
            {error.reparto && <Alert variant="error" title={error.reparto} style={{ marginBottom: 'var(--s3)' }} />}
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'grid', gap: 'var(--s1)' }}>
              {activos.map((a) => (
                <label key={a.id_activo_biologico} className="fin-casilla">
                  <input type="checkbox" checked={reparto.includes(a.id_activo_biologico)} onChange={() => alternar(a.id_activo_biologico)} />
                  <span>{a.identificador} · {a.especie} · {tipoActivo(a)}</span>
                </label>
              ))}
            </div>
            <p role="status" style={{ ...SECUNDARIO, margin: 'var(--s2) 0 0' }}>{t('costos.seleccionados', { count: reparto.length })}</p>
            <div style={{ marginTop: 'var(--s3)' }}>
              <Select id="co-metodo" label={t('costos.metodo_reparto')} value={metodo} onChange={(e) => cambiarMetodo(e.target.value as 'POR_CABEZAS' | 'POR_BIOMASA')} error={error.metodo}>
                <option value="POR_CABEZAS">{t('reparto.POR_CABEZAS')}</option>
                <option value="POR_BIOMASA">{t('reparto.POR_BIOMASA')}</option>
              </Select>
              <p role="status" style={{ ...SECUNDARIO, margin: 'var(--s2) 0 0' }}>{avisoMetodo}</p>
            </div>
            {seleccionados.length > 0 && (
              <div style={{ marginTop: 'var(--s3)' }}>
                <table style={TABLA}>
                  <caption style={{ textAlign: 'left', fontWeight: 600, marginBottom: 'var(--s2)' }}>{t('costos.vista_previa_reparto')}</caption>
                  <thead>
                    <tr><th style={TH}>{t('col.activo')}</th><th style={TH}>{t('costos.tipo_activo')}</th><th style={TH_NUM}>{t('costos.participacion')}</th>
                      <th style={TH_NUM}>{t('costos.importe')}</th><th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th></tr>
                  </thead>
                  <tbody>
                    {seleccionados.map((a, i) => (
                      <tr key={a.id_activo_biologico}>
                        <th scope="row" style={{ ...TD, textAlign: 'left' }}>{a.identificador}</th>
                        <td style={TD}>{tipoActivo(a)}</td>
                        <td style={TD_NUM}>{metodo === 'POR_BIOMASA' ? t('costos.segun_peso') : `${(100 / seleccionados.length).toFixed(1)} %`}</td>
                        <td style={TD_NUM}>{metodo === 'POR_BIOMASA' || !montoReparto ? t('costos.al_guardar') : formatoMoneda(parte + (i === 0 ? residuo : 0))}</td>
                        <td style={TD}>
                          <Button variant="ghost" size="sm" data-quitar onClick={() => quitar(a.id_activo_biologico, i)} aria-label={t('costos.quitar_activo', { activo: a.identificador })}>
                            <Trash2 size={14} aria-hidden />{t('comun.quitar')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {metodo === 'POR_CABEZAS' && montoReparto && residuo !== 0 && (
                      <tr><td colSpan={5} style={{ ...TD, ...SECUNDARIO }}>{t('costos.residuo', { monto: formatoMoneda(residuo), activo: seleccionados[0].identificador })}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </fieldset>
        )}
      </div>
      {conProveedor && (
        <fieldset style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', padding: 'var(--s3) var(--s4)', marginTop: 'var(--s4)' }}>
          <legend style={{ fontSize: 'var(--fs-label-md)', fontWeight: 600, padding: '0 var(--s1)' }}>{t('costos.factura_proveedor')}</legend>
          <p role="status" style={{ ...SECUNDARIO, margin: '0 0 var(--s3)' }}>{t('costos.proveedor_habilitado')}</p>
          <div className="ds-fg2">
            <Input id="co-nit" label={t('costos.nit')} required inputMode="numeric" value={f.nit} onChange={set('nit')} error={error.nit} ariaDescribedBy="co-fuente-unica" />
            <Input id="co-dv" label={t('costos.dv')} required inputMode="numeric" maxLength={1} value={f.dv} onChange={set('dv')} error={error.dv} />
            <Input id="co-razon" label={t('costos.razon_social')} required maxLength={200} value={f.razon} onChange={set('razon')} error={error.razon} />
            <Input id="co-prefijo" label={t('costos.prefijo')} maxLength={10} value={f.prefijo} onChange={set('prefijo')} error={error.prefijo} />
            <Input id="co-numero" label={t('costos.numero_factura')} required maxLength={30} value={f.numero} onChange={set('numero')} error={error.numero} ariaDescribedBy="co-fuente-unica" />
            <Input id="co-ffactura" label={t('costos.fecha_factura')} type="date" required value={f.fechaFactura} onChange={set('fechaFactura')} error={error.fechaFactura} />
            <Input id="co-fvenc" label={t('costos.vencimiento_factura')} type="date" value={f.vencimiento} onChange={set('vencimiento')} error={error.vencimiento} />
          </div>
          <p id="co-fuente-unica" style={{ ...SECUNDARIO, margin: 'var(--s3) 0 0' }}>{t('costos.aviso_fuente_unica')}</p>
        </fieldset>
      )}
      <div style={{ marginTop: 'var(--s4)' }}>
        <AreaTexto id="co-justificacion" label={t('costos.justificacion')} required={requiereJustificacion} maxLength={2000} value={f.justificacion}
          onChange={set('justificacion')} error={error.justificacion} hint={requiereJustificacion ? t('comun.minimo', { n: 10 }) : undefined} />
      </div>
    </ModalShell>
  );
}

function ClasificarModal({ costo, onCerrar, onGuardado }: { costo: Costo; onCerrar: () => void; onGuardado: () => void }) {
  const { t } = useT('finanzas');
  const clasificacion = useAsync(finanzasApi.clasificarCosto);
  const [naturaleza, setNaturaleza] = useState<Naturaleza>('MANTENIMIENTO');
  return (
    <MotivoModal
      titulo={t('costos.clasificar_titulo', { monto: formatoMoneda(costo.monto_costo) })}
      descripcion={t('costos.clasificar_ayuda')}
      etiqueta={t('costos.justificacion')}
      confirmar={t('costos.clasificar_como', { naturaleza: t(`naturaleza.${naturaleza}`) })}
      min={10} max={2000} enviando={clasificacion.cargando} error={clasificacion.error}
      onCerrar={onCerrar}
      onConfirmar={async (texto) => {
        if (await clasificacion.ejecutar(costo.id_registro_costo, naturaleza, texto)) { pushToast('success', t('costos.clasificado')); onGuardado(); }
      }}
      extra={(
        <Select id="cl-naturaleza" label={t('col.naturaleza')} value={naturaleza} onChange={(e) => setNaturaleza(e.target.value as Naturaleza)}>
          {NATURALEZAS.map((n) => <option key={n} value={n}>{t(`naturaleza.${n}`)}</option>)}
        </Select>
      )}
    />
  );
}

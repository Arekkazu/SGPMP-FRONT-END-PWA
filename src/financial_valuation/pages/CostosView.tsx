// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-90: costos del activo (manuales, factura de proveedor, reparto y clasificación) |
// | 2026-11-05 | Arekkazu | M06 RF-90 prototipo: costos del período consolidados por naturaleza y tipo, con filtros |
import React, { useEffect, useState } from 'react';
import { Plus, Receipt, Tags } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { Badge } from '../../shared/design-system/Badge';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { decimalPositivo } from '../../supplies/lib/formato';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_C, ACCION_R, ACCION_U, R_COSTOS, R_VALORACION } from '../rbac';
import { SUBTIPOS } from '../types';
import type { ActivoValorado, Costo, CostoPayload, Naturaleza, OrigenCosto, Subtipo } from '../types';
import { sumar } from '../lib/decimal';
import {
  AreaTexto, CeldaActivo, EncabezadoVista, EstadoBadge, ErrorApi, Listado, MotivoModal, SECUNDARIO, SinPeriodo, TABLA, TD, TD_NUM, TH,
  TH_NUM, formatoFecha, formatoMoneda, nombrePeriodo, useAsync, useListado, usePeriodo,
} from '../components/comunes';

const ORIGENES_MANUALES: OrigenCosto[] = ['MANO_OBRA_PROPIA', 'COMPRA_PROVEEDOR', 'SERVICIO_TERCERO'];
const NATURALEZAS: Naturaleza[] = ['MANTENIMIENTO', 'INVERSION', 'VENTA'];
const TONO_NATURALEZA = { MANTENIMIENTO: 'success', VENTA: 'info', INVERSION: 'warning' } as const;
/** Un reverso resta del total. */
const firmado = (c: Costo) => (c.es_reverso ? `-${c.monto_costo}` : c.monto_costo);

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
  const grupos = NATURALEZAS.map((n) => {
    const deEsta = lista.filter((c) => c.naturaleza_costo === n);
    const porSubtipo = SUBTIPOS.map((s) => ({ s, total: sumar(deEsta.filter((c) => c.subtipo_costo === s).map(firmado)) }))
      .filter((x) => Number(x.total) !== 0);
    return { n, registros: deEsta.length, total: sumar(deEsta.map(firmado)), porSubtipo };
  }).filter((g) => g.registros > 0);

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
              <Alert variant="warning" title={t('costos.pendientes_titulo', { count: pendientes.length })} description={t('costos.pendientes_detalle')} />
            </div>
            <Button variant="secondary" size="md" onClick={() => l.setFiltro('estado', 'PENDIENTE_CLASIFICACION')}>{t('costos.ver_pendientes')}</Button>
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
                    <Badge variant={TONO_NATURALEZA[g.n]}>{t(`naturaleza.${g.n}`)}</Badge>
                    <span style={SECUNDARIO}>{t('costos.registros', { count: g.registros })}</span>
                  </div>
                  <h3 id={`costos-${g.n}`} style={{ margin: 'var(--s3) 0 0' }}>{t(`costos.total_${g.n}`)}</h3>
                  <p className="fin-kpi__valor" style={{ margin: 'var(--s1) 0' }}>{formatoMoneda(g.total)}</p>
                  <p style={{ ...SECUNDARIO, margin: 0 }}>{t(`costos.ayuda_${g.n}`)}</p>
                  <div className="fin-barras">
                    {g.porSubtipo.map((x) => (
                      <div key={x.s}>
                        <div className="fin-barra__fila"><span>{t(`subtipo.${x.s}`)}</span><strong>{formatoMoneda(x.total)}</strong></div>
                        <div className="fin-barra__pista" aria-hidden>
                          <div className={`fin-barra__relleno${g.n === 'VENTA' ? ' fin-barra__relleno--info' : ''}`}
                            style={{ width: `${Math.max(2, Math.min(100, (Number(x.total) / Number(g.total)) * 100))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
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
                        ? <Badge variant={TONO_NATURALEZA[c.naturaleza_costo]}>{t(`naturaleza.${c.naturaleza_costo}`)}</Badge>
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
                            <Button variant="secondary" size="sm" onClick={() => setAClasificar(c)}><Tags size={14} aria-hidden />{t('costos.clasificar')}</Button>
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

function CostoModal({ activos, onCerrar, onGuardado }: { activos: ActivoValorado[]; onCerrar: () => void; onGuardado: () => void }) {
  const { t } = useT('finanzas');
  const registro = useAsync(finanzasApi.registrarCosto);
  const [f, setF] = useState({
    subtipo: 'MANO_OBRA' as Subtipo, origen: 'MANO_OBRA_PROPIA' as OrigenCosto, monto: '', fecha: hoyIso(), naturaleza: '' as Naturaleza | '',
    justificacion: '', nit: '', dv: '', razon: '', prefijo: '', numero: '', fechaFactura: '', vencimiento: '', capitalizar: false,
  });
  const [destino, setDestino] = useState<'uno' | 'reparto'>('uno');
  const [uno, setUno] = useState('');
  const [reparto, setReparto] = useState<number[]>([]);
  const [metodo, setMetodo] = useState<'POR_CABEZAS' | 'POR_BIOMASA'>('POR_CABEZAS');
  const [aviso, setAviso] = useState<string>();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const conProveedor = f.origen === 'COMPRA_PROVEEDOR' || f.origen === 'SERVICIO_TERCERO';
  const requiereJustificacion = f.subtipo === 'OTRO' || f.naturaleza === 'INVERSION' || f.naturaleza === 'VENTA';

  const guardar = async () => {
    const monto = decimalPositivo(f.monto);
    if (!monto) { setAviso(t('costos.monto_invalido')); return; }
    if (destino === 'uno' ? !uno : reparto.length < 2) { setAviso(destino === 'uno' ? t('costos.activo_requerido') : t('costos.reparto_minimo')); return; }
    if (requiereJustificacion && f.justificacion.trim().length < 10) { setAviso(t('costos.justificacion_requerida')); return; }
    if (conProveedor && (!/^\d{6,15}$/.test(f.nit) || !/^\d$/.test(f.dv) || !f.razon.trim() || !f.numero.trim() || !f.fechaFactura)) {
      setAviso(t('costos.proveedor_incompleto')); return;
    }
    setAviso(undefined);
    const p: CostoPayload = {
      subtipo_costo: f.subtipo, origen_costo: f.origen, monto_costo: monto, fecha_costo: f.fecha,
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

  return (
    <ModalShell title={t('costos.registrar')} onClose={onCerrar} maxWidth={720}
      footer={(
        <>
          <Button variant="secondary" size="md" onClick={onCerrar} disabled={registro.cargando}>{t('comun.cancelar')}</Button>
          <Button variant="primary" size="md" loading={registro.cargando} onClick={guardar}>{t('comun.guardar')}</Button>
        </>
      )}>
      <p style={{ ...SECUNDARIO, margin: '0 0 var(--s4)' }}>{t('costos.registrar_ayuda')}</p>
      <ErrorApi error={registro.error} />
      {aviso && <Alert variant="error" title={aviso} style={{ marginBottom: 'var(--s3)' }} />}
      <div className="ds-fg2">
        <Select id="co-subtipo" label={t('col.subtipo')} required value={f.subtipo} onChange={set('subtipo')}>
          {SUBTIPOS.filter((s) => s !== 'ALIMENTO' && s !== 'MEDICAMENTO').map((s) => <option key={s} value={s}>{t(`subtipo.${s}`)}</option>)}
        </Select>
        <Select id="co-origen" label={t('col.origen')} required value={f.origen} onChange={set('origen')}>
          {ORIGENES_MANUALES.map((o) => <option key={o} value={o}>{t(`origen_costo.${o}`)}</option>)}
        </Select>
        <Input id="co-monto" label={t('col.monto')} required inputMode="decimal" value={f.monto} onChange={set('monto')} />
        <Input id="co-fecha" label={t('col.fecha')} type="date" required max={hoyIso()} value={f.fecha} onChange={set('fecha')} />
        <Select id="co-naturaleza" label={t('col.naturaleza')} value={f.naturaleza} onChange={set('naturaleza')} hint={t('costos.naturaleza_ayuda')}>
          <option value="">{t('costos.naturaleza_automatica')}</option>
          {NATURALEZAS.map((n) => <option key={n} value={n}>{t(`naturaleza.${n}`)}</option>)}
        </Select>
        <Select id="co-destino" label={t('costos.destino')} value={destino} onChange={(e) => setDestino(e.target.value as 'uno' | 'reparto')}>
          <option value="uno">{t('costos.un_activo')}</option>
          <option value="reparto">{t('costos.varios_activos')}</option>
        </Select>
      </div>
      {f.naturaleza === 'INVERSION' && (
        <label style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'flex-start', marginTop: 'var(--s4)', fontSize: 'var(--fs-body-md)' }}>
          <input type="checkbox" checked={f.capitalizar} onChange={(e) => setF({ ...f, capitalizar: e.target.checked })} style={{ marginTop: 4 }} />
          <span>{t('costos.capitalizar')}<span style={{ ...SECUNDARIO, display: 'block' }}>{t('costos.capitalizar_ayuda')}</span></span>
        </label>
      )}
      <div style={{ marginTop: 'var(--s4)' }}>
        {destino === 'uno' ? (
          <Select id="co-activo" label={t('col.activo')} required value={uno} onChange={(e) => setUno(e.target.value)}>
            <option value="">{t('comun.elegir')}</option>
            {activos.map((a) => <option key={a.id_activo_biologico} value={a.id_activo_biologico}>{a.identificador} · {a.especie}</option>)}
          </Select>
        ) : (
          <fieldset style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', padding: 'var(--s3) var(--s4)' }}>
            <legend style={{ fontSize: 'var(--fs-label-md)', fontWeight: 600, padding: '0 var(--s1)' }}>{t('costos.activos_reparto')}</legend>
            <div style={{ maxHeight: 180, overflowY: 'auto', display: 'grid', gap: 'var(--s1)' }}>
              {activos.map((a) => (
                <label key={a.id_activo_biologico} style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center', fontSize: 'var(--fs-body-md)' }}>
                  <input type="checkbox" checked={reparto.includes(a.id_activo_biologico)} onChange={() => alternar(a.id_activo_biologico)} />
                  {a.identificador} · {a.especie}
                </label>
              ))}
            </div>
            <div style={{ marginTop: 'var(--s3)' }}>
              <Select id="co-metodo" label={t('costos.metodo_reparto')} value={metodo} onChange={(e) => setMetodo(e.target.value as 'POR_CABEZAS' | 'POR_BIOMASA')}>
                <option value="POR_CABEZAS">{t('reparto.POR_CABEZAS')}</option>
                <option value="POR_BIOMASA">{t('reparto.POR_BIOMASA')}</option>
              </Select>
            </div>
          </fieldset>
        )}
      </div>
      {conProveedor && (
        <fieldset style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', padding: 'var(--s3) var(--s4)', marginTop: 'var(--s4)' }}>
          <legend style={{ fontSize: 'var(--fs-label-md)', fontWeight: 600, padding: '0 var(--s1)' }}>{t('costos.factura_proveedor')}</legend>
          <div className="ds-fg2">
            <Input id="co-nit" label={t('costos.nit')} required inputMode="numeric" value={f.nit} onChange={set('nit')} />
            <Input id="co-dv" label={t('costos.dv')} required inputMode="numeric" maxLength={1} value={f.dv} onChange={set('dv')} />
            <Input id="co-razon" label={t('costos.razon_social')} required maxLength={200} value={f.razon} onChange={set('razon')} />
            <Input id="co-prefijo" label={t('costos.prefijo')} maxLength={10} value={f.prefijo} onChange={set('prefijo')} />
            <Input id="co-numero" label={t('costos.numero_factura')} required maxLength={30} value={f.numero} onChange={set('numero')} />
            <Input id="co-ffactura" label={t('costos.fecha_factura')} type="date" required value={f.fechaFactura} onChange={set('fechaFactura')} />
            <Input id="co-fvenc" label={t('costos.vencimiento_factura')} type="date" value={f.vencimiento} onChange={set('vencimiento')} />
          </div>
          <p style={{ ...SECUNDARIO, margin: 'var(--s3) 0 0' }}>{t('costos.aviso_fuente_unica')}</p>
        </fieldset>
      )}
      <div style={{ marginTop: 'var(--s4)' }}>
        <AreaTexto id="co-justificacion" label={t('costos.justificacion')} required={requiereJustificacion} maxLength={2000} value={f.justificacion}
          onChange={set('justificacion')} hint={requiereJustificacion ? t('comun.minimo', { n: 10 }) : undefined} />
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

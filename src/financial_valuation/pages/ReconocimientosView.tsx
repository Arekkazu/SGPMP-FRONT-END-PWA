// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-82/RF-84/RF-88: propuestas de reconocimiento inicial y confirmación |
// | 2026-11-05 | Arekkazu | M06 RF-82 prototipo: indicadores, avisos y una tabla con propuestas y reconocidos filtrable |
// | 2026-11-08 | destroyerban | INC-M06-316-G16 RF-84: referencia documental de los costos manuales |
// | 2026-11-11 | Arekkazu | USAB-M05-M06 RF-82..94: reporte de usabilidad del 11-11 (período por defecto, titular, formatos y nombres) |
import React, { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, RefreshCw } from 'lucide-react';
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
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_C, ACCION_R, R_RECONOCIMIENTO, R_VALORACION } from '../rbac';
import type { Clasificacion, CostosManuales, Dec, Propuesta } from '../types';
import { DetalleActivoModal } from '../components/DetalleActivoModal';
import {
  AreaTexto, CeldaActivo, Datos, EncabezadoVista, EstadoBadge, ErrorApi, Indicadores, Listado, SECUNDARIO, Subtitulo, TABLA, TD,
  TD_NUM, TH, TH_NUM, formatoCantidad, formatoFecha, formatoMoneda, nombrePeriodo, useAsync, useListado, usePeriodo,
} from '../components/comunes';

type EstadoFila = 'PENDIENTE' | 'BLOQUEADO' | 'CONFIRMADO';
interface Fila {
  id: number; identificador: string; especie: string; finca: string; origen: string; metodo: string | null; valor: Dec | null;
  fecha: string | null; estado: EstadoFila; propuesta?: Propuesta;
}

export function ReconocimientosView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_RECONOCIMIENTO, ACCION_R);
  const puedeConfirmar = usePermissionPorNombre(R_RECONOCIMIENTO, ACCION_C);
  const puedeVerActivos = usePermissionPorNombre(R_VALORACION, ACCION_R);
  const { periodo } = usePeriodo();
  const propuestas = useAsync(finanzasApi.propuestas);
  const activos = useAsync(finanzasApi.activos);
  const [abierta, setAbierta] = useState<Propuesta | null>(null);
  const [detalle, setDetalle] = useState<Fila | null>(null);
  const { ejecutar: cargarPropuestas } = propuestas;
  const { ejecutar: cargarActivos } = activos;
  // Solo los activos del titular del período elegido (M6-03): con El Rosal no deben salir los de otras fincas.
  const nit = periodo?.numero_id_tributaria ?? null;
  const cargar = () => { cargarPropuestas(nit); if (puedeVerActivos) cargarActivos(nit); };
  useEffect(() => {
    if (puedeLeer) cargarPropuestas(nit);
    if (puedeLeer && puedeVerActivos) cargarActivos(nit);
  }, [puedeLeer, puedeVerActivos, cargarPropuestas, cargarActivos, nit]);

  const filas: Fila[] = [
    ...(propuestas.data ?? []).map((p): Fila => ({
      id: p.id_activo_biologico, identificador: p.identificador, especie: p.especie, finca: p.finca, origen: p.origen_financiero,
      metodo: p.indicador_valoracion, valor: p.valor_inicial, fecha: p.fecha_reconocimiento,
      estado: p.es_confirmable ? 'PENDIENTE' : 'BLOQUEADO', propuesta: p,
    })),
    ...(activos.data ?? []).map((a): Fila => ({
      id: a.id_activo_biologico, identificador: a.identificador, especie: a.especie, finca: a.finca, origen: a.origen_financiero,
      metodo: a.indicador_reconocimiento, valor: a.valor_inicial, fecha: a.fecha_reconocimiento, estado: 'CONFIRMADO',
    })),
  ];
  const l = useListado(filas, (f) => `${f.identificador} ${f.especie} ${f.finca}`, [
    { id: 'estado', etiqueta: t('col.estado'), valor: (f) => f.estado, texto: (v) => t(`estado.${v}`) },
    { id: 'metodo', etiqueta: t('col.metodo'), valor: (f) => f.metodo, texto: (v) => t(`metodo.${v}`) },
    { id: 'especie', etiqueta: t('col.especie'), valor: (f) => f.especie, texto: (v) => v, femenino: true },
    { id: 'origen', etiqueta: t('col.origen'), valor: (f) => f.origen, texto: (v) => t(`origen.${v}`, { defaultValue: t('recon.origen_sin_definir') }) },
  ]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.reconocimiento')} />;

  const pendientes = filas.filter((f) => f.estado === 'PENDIENTE');
  const bloqueados = filas.filter((f) => f.estado === 'BLOQUEADO');
  const confirmados = filas.filter((f) => f.estado === 'CONFIRMADO');
  const enPeriodo = periodo
    ? confirmados.filter((f) => f.fecha && f.fecha >= periodo.fecha_inicio && f.fecha <= periodo.fecha_fin)
    : confirmados;
  const alCosto = confirmados.filter((f) => f.metodo === 'VALORACION_POR_COSTO');

  return (
    <>
      <EncabezadoVista
        titulo={t('recon.titulo')}
        descripcion={t('recon.descripcion')}
        acciones={<Button variant="secondary" size="md" loading={propuestas.cargando || activos.cargando} onClick={cargar}><RefreshCw size={16} aria-hidden />{t('comun.actualizar')}</Button>}
      />
      <ErrorApi error={propuestas.error ?? activos.error} />
      <Indicadores items={[
        { etiqueta: t('recon.kpi_periodo'), valor: enPeriodo.length, tono: 'success',
          detalle: periodo ? t('recon.kpi_periodo_detalle', { periodo: nombrePeriodo(periodo) }) : t('recon.kpi_total_detalle') },
        { etiqueta: t('recon.kpi_pendientes'), valor: pendientes.length, tono: pendientes.length ? 'warning' : 'neutral',
          detalle: pendientes.length ? pendientes.slice(0, 3).map((f) => f.identificador).join(', ') : t('recon.kpi_sin_pendientes') },
        { etiqueta: t('recon.kpi_costo'), valor: alCosto.length, tono: 'info', detalle: t('recon.kpi_costo_detalle') },
        { etiqueta: t('recon.kpi_total'), valor: filas.length, detalle: t('recon.kpi_total_activos', { count: bloqueados.length }) },
      ]} />
      {(pendientes.length > 0 || bloqueados.length > 0) && (
        <div className="fin-avisos">
          {pendientes.length > 0 && (
            <div className="fin-acciones" style={{ alignItems: 'center' }}>
              <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                <Alert variant="warning" title={t('recon.aviso_pendientes', { count: pendientes.length })} description={t('recon.aviso_pendientes_detalle')} />
              </div>
              {pendientes[0].propuesta && (
                <Button variant="secondary" size="md" onClick={() => setAbierta(pendientes[0].propuesta ?? null)}>{t('recon.revisar_ahora')}</Button>
              )}
            </div>
          )}
          {bloqueados.length > 0 && (
            <Alert variant="error" title={t('recon.aviso_bloqueados', { count: bloqueados.length })}
              description={bloqueados.slice(0, 3).map((f) => `${f.identificador}: ${f.propuesta?.bloqueos[0]?.mensaje ?? t('recon.bloqueo_generico')}`).join(' · ')} />
          )}
        </div>
      )}
      <Listado l={l} idBase="recon" sustantivo={t('recon.sustantivo')} buscar={t('recon.buscar')} cargando={propuestas.cargando || activos.cargando}
        vacio={{ icono: <ClipboardCheck size={28} aria-hidden />, titulo: t('recon.vacio_titulo'), detalle: t('recon.vacio_detalle') }}>
        {(visibles) => (
          <table style={TABLA}>
            <thead>
              <tr>
                <th style={TH}>{t('col.activo')}</th><th style={TH}>{t('col.especie_origen')}</th><th style={TH_NUM}>{t('col.valor_reconocido')}</th>
                <th style={TH}>{t('col.metodo')}</th><th style={TH}>{t('col.estado')}</th><th style={TH}>{t('col.fecha')}</th>
                <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => (
                <tr key={`${f.estado}-${f.id}`} className={f.estado === 'PENDIENTE' ? 'fin-fila--atencion' : undefined}>
                  <td style={TD}><CeldaActivo identificador={f.identificador} finca={f.finca} /></td>
                  <td style={TD}>{f.especie}<span className="fin-secundario">{t(`origen.${f.origen}`, { defaultValue: t('recon.origen_sin_definir') })}</span></td>
                  <td style={TD_NUM}>
                    {f.valor ? formatoMoneda(f.valor) : t('recon.sin_valor')}
                    <span className="fin-secundario">{f.estado === 'CONFIRMADO' ? t('recon.valor_reconocido') : t('recon.valor_propuesto')}</span>
                  </td>
                  <td style={TD}>{f.metodo
                    ? <Badge variant={f.metodo === 'VALORACION_POR_COSTO' ? 'warning' : 'info'}>{t(`metodo.${f.metodo}`)}</Badge>
                    : t('recon.metodo_por_definir')}</td>
                  <td style={TD}><EstadoBadge estado={f.estado} /></td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(f.fecha)}</td>
                  <td style={TD}>
                    {f.propuesta ? (
                      <Button variant="secondary" size="sm" onClick={() => setAbierta(f.propuesta ?? null)}
                        aria-label={t('recon.revisar_aria', { activo: f.identificador })}>{t('recon.revisar')}</Button>
                    ) : puedeVerActivos && (
                      <Button variant="ghost" size="sm" onClick={() => setDetalle(f)}
                        aria-label={t('valor.ver_detalle_aria', { activo: f.identificador })}>{t('valor.ver_detalle')}</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Listado>
      {abierta && (
        <PropuestaModal inicial={abierta} puedeConfirmar={puedeConfirmar} onCerrar={() => setAbierta(null)}
          onConfirmado={() => { setAbierta(null); cargar(); }} />
      )}
      {detalle && <DetalleActivoModal idActivo={detalle.id} identificador={detalle.identificador} onCerrar={() => setDetalle(null)} onCambio={cargar} />}
    </>
  );
}

function PropuestaModal({ inicial, puedeConfirmar, onCerrar, onConfirmado }: {
  inicial: Propuesta; puedeConfirmar: boolean; onCerrar: () => void; onConfirmado: () => void;
}) {
  const { t } = useT('finanzas');
  const recalculo = useAsync(finanzasApi.propuesta);
  const confirmacion = useAsync(finanzasApi.confirmar);
  const p = recalculo.data ?? inicial;
  const [clasificacion, setClasificacion] = useState<Clasificacion | ''>(inicial.clasificacion ?? '');
  const [manuales, setManuales] = useState(inicial.requiere_costos_manuales);
  const [costos, setCostos] = useState<Record<keyof CostosManuales, string>>({ transporte: '', comisiones: '', impuestos: '', otros: '' });
  const [justificacion, setJustificacion] = useState('');
  const [referencia, setReferencia] = useState('');
  const [aviso, setAviso] = useState<string>();

  const recalcular = (c: Clasificacion | '') => { setClasificacion(c); if (c) recalculo.ejecutar(inicial.id_activo_biologico, c); };

  const confirmar = async () => {
    let costosManuales: CostosManuales | undefined;
    if (manuales) {
      const valores = Object.entries(costos).filter(([, v]) => v.trim() !== '');
      if (valores.some(([, v]) => !(Number(v.replace(',', '.')) >= 0))) { setAviso(t('recon.costos_invalidos')); return; }
      if (justificacion.trim().length < 20) { setAviso(t('recon.justificacion_corta')); return; }
      // RF-84 R4: los costos propios se respaldan con un documento; el backend responde 400 sin él.
      if (valores.length > 0 && referencia.trim().length < 3) { setAviso(t('recon.referencia_falta')); return; }
      costosManuales = Object.fromEntries(valores.map(([k, v]) => [k, v.replace(',', '.')]));
    }
    setAviso(undefined);
    const r = await confirmacion.ejecutar(inicial.id_activo_biologico, {
      clasificacion: clasificacion || undefined, costos_manuales: costosManuales, justificacion: manuales ? justificacion.trim() : undefined,
      referencia_documental: manuales ? referencia.trim() || undefined : undefined,
    });
    if (r) {
      pushToast('success', t('recon.confirmado', { activo: inicial.identificador }), r.advertencias.join(' ') || undefined);
      onConfirmado();
    }
  };

  const filas: Array<[string, React.ReactNode]> = [
    [t('col.fecha_reconocimiento'), formatoFecha(p.fecha_reconocimiento)],
    [t('col.metodo'), p.indicador_valoracion ? t(`metodo.${p.indicador_valoracion}`) : t('recon.metodo_por_definir')],
    [t('col.magnitud'), p.magnitud ? `${formatoCantidad(p.magnitud)} ${p.unidad_magnitud ?? ''}` : t('valor.sin_magnitud')],
    [t('col.precio'), p.precio ? `${formatoMoneda(p.precio.precio_unitario)} / ${p.precio.unidad_medida} · ${t(`fuente.${p.precio.fuente}`)} · ${formatoFecha(p.precio.fecha_vigencia)}` : t('recon.sin_precio')],
    [t('col.costos_venta'), p.costos_venta ? formatoMoneda(p.costos_venta) : t('recon.sin_costos_venta')],
    [t('col.valor_inicial'), p.valor_inicial ? formatoMoneda(p.valor_inicial) : t('recon.sin_valor')],
    [t('col.costo_adquisicion'), p.costo_adquisicion ? formatoMoneda(p.costo_adquisicion) : t('valor.sin_costo')],
    [t('col.soporte'), p.soporte_documental || t('recon.sin_soporte')],
  ];

  return (
    <ModalShell
      title={t('recon.modal_titulo', { activo: p.identificador })}
      onClose={onCerrar}
      maxWidth={720}
      footer={(
        <>
          <Button variant="secondary" size="md" onClick={onCerrar} disabled={confirmacion.cargando}>{t('comun.cerrar')}</Button>
          {puedeConfirmar && (
            <Button variant="primary" size="md" loading={confirmacion.cargando} disabled={!p.es_confirmable || recalculo.cargando} onClick={confirmar}>
              <CheckCircle2 size={16} aria-hidden />{t('recon.confirmar')}
            </Button>
          )}
        </>
      )}
    >
      <p style={{ ...SECUNDARIO, margin: '0 0 var(--s4)' }}>{t('recon.modal_ayuda')}</p>
      <ErrorApi error={confirmacion.error ?? recalculo.error} />
      {p.bloqueos.map((b) => <Alert key={b.codigo} variant="error" title={b.mensaje} style={{ marginBottom: 'var(--s3)' }} />)}
      {p.advertencias.map((a) => <Alert key={a} variant="warning" title={a} style={{ marginBottom: 'var(--s3)' }} />)}
      <Datos filas={filas} />

      <Subtitulo>{t('recon.hechos')}</Subtitulo>
      {p.hechos.length === 0 ? <p style={SECUNDARIO}>{t('recon.sin_hechos')}</p> : (
        <table style={TABLA}>
          <thead><tr><th style={TH}>{t('col.tipo_hecho')}</th><th style={TH}>{t('col.sentido')}</th><th style={TH_NUM}>{t('col.valor')}</th></tr></thead>
          <tbody>
            {p.hechos.map((h) => (
              <tr key={`${h.tipo_hecho}-${h.sentido}`}>
                <td style={TD}>{t(`hecho.${h.tipo_hecho}`)}</td><td style={TD}>{t(`sentido.${h.sentido}`)}</td><td style={TD_NUM}>{formatoMoneda(h.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {puedeConfirmar && (
        <div style={{ display: 'grid', gap: 'var(--s4)', marginTop: 'var(--s5)' }}>
          <Select id="rc-clasificacion" label={t('col.clasificacion')} value={clasificacion} onChange={(e) => recalcular(e.target.value as Clasificacion)}
            hint={t('recon.clasificacion_ayuda')}>
            <option value="">{t('comun.sin_definir')}</option>
            <option value="PRODUCCION">{t('clasificacion.PRODUCCION')}</option>
            <option value="CONSUMO">{t('clasificacion.CONSUMO')}</option>
          </Select>
          <label style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center', fontSize: 'var(--fs-body-md)' }}>
            <input type="checkbox" checked={manuales} onChange={(e) => setManuales(e.target.checked)} disabled={p.requiere_costos_manuales} />
            {t('recon.usar_manuales')}
          </label>
          {manuales && (
            <>
              <div className="ds-fg2">
                {(['transporte', 'comisiones', 'impuestos', 'otros'] as const).map((k) => (
                  <Input key={k} id={`rc-${k}`} label={t(`recon.costo_${k}`)} inputMode="decimal" value={costos[k]}
                    onChange={(e) => setCostos({ ...costos, [k]: e.target.value })} />
                ))}
              </div>
              <AreaTexto id="rc-justificacion" label={t('recon.justificacion')} required maxLength={1000} value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)} hint={t('recon.justificacion_ayuda')} />
              <Input id="rc-referencia" label={t('recon.referencia')} required maxLength={200} value={referencia}
                onChange={(e) => setReferencia(e.target.value)} hint={t('recon.referencia_ayuda')} />
            </>
          )}
          {aviso && <Alert variant="error" title={aviso} />}
        </div>
      )}
    </ModalShell>
  );
}

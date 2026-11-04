// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-83..88: valor en libros por activo, mediciones ¶51, modelo de costo y reversión |
import React, { useEffect, useState } from 'react';
import { Calculator, Play, Scale, Undo2 } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Badge } from '../../shared/design-system/Badge';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { decimalPositivo } from '../../supplies/lib/formato';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_C, ACCION_D, ACCION_E, ACCION_R, ACCION_U, R_COSTO_HISTORICO, R_RECONOCIMIENTO, R_VALORACION } from '../rbac';
import type { ActivoValorado } from '../types';
import {
  AreaTexto, Datos, EncabezadoVista, EstadoBadge, EstadoVacio, ErrorApi, MotivoModal, PANEL, SECUNDARIO, Subtitulo, TABLA, TD,
  TD_NUM, TH, TH_NUM, formatoCantidad, formatoFecha, formatoMoneda, useAsync,
} from '../components/comunes';

export function ValoracionView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_VALORACION, ACCION_R);
  const puedeProcesar = usePermissionPorNombre(R_VALORACION, ACCION_E);
  const activos = useAsync(finanzasApi.activos);
  const proceso = useAsync(finanzasApi.procesarEventos);
  const [abierto, setAbierto] = useState<ActivoValorado | null>(null);
  const { ejecutar: cargar } = activos;
  useEffect(() => { if (puedeLeer) cargar(); }, [puedeLeer, cargar]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.valoracion')} />;
  const lista = activos.data ?? [];

  const procesar = async () => {
    const r = await proceso.ejecutar();
    if (!r) return;
    const suma = (o: Record<string, number>) => o.PROCESADO ?? 0;
    pushToast('success', t('valor.procesado', { eventos: suma(r.eventos), provisiones: suma(r.provisiones_m05) }));
    cargar();
  };

  return (
    <>
      <EncabezadoVista
        titulo={t('valor.titulo')}
        descripcion={t('valor.descripcion')}
        acciones={puedeProcesar && (
          <Button variant="secondary" size="md" loading={proceso.cargando} onClick={procesar}><Play size={16} aria-hidden />{t('valor.procesar')}</Button>
        )}
      />
      <ErrorApi error={activos.error ?? proceso.error} />
      {lista.length === 0 ? (
        <EstadoVacio icono={<Scale size={28} aria-hidden />} titulo={activos.cargando ? t('comun.cargando') : t('valor.vacio_titulo')} detalle={t('valor.vacio_detalle')} />
      ) : (
        <ScrollRegion label={t('valor.titulo')}>
          <table style={TABLA}>
            <thead>
              <tr>
                <th style={TH}>{t('col.activo')}</th><th style={TH}>{t('col.especie')}</th><th style={TH}>{t('col.clasificacion')}</th>
                <th style={TH}>{t('col.metodo')}</th><th style={TH_NUM}>{t('col.valor_libros')}</th><th style={TH}>{t('col.ultima_medicion')}</th>
                <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.id_activo_biologico}>
                  <td style={TD}><strong>{a.identificador}</strong><div style={SECUNDARIO}>{a.finca}</div></td>
                  <td style={TD}>{a.especie}</td>
                  <td style={TD}>{a.clasificacion ? t(`clasificacion.${a.clasificacion}`) : '—'}</td>
                  <td style={TD}>
                    {a.valorado_por_costo ? <Badge variant="warning">{t('metodo.VALORACION_POR_COSTO')}</Badge> : <Badge variant="info">{t('metodo.VALOR_RAZONABLE')}</Badge>}
                    {a.tiene_valor_estimado && <div style={{ ...SECUNDARIO, marginTop: 'var(--s1)' }}>{t('valor.estimado')}</div>}
                  </td>
                  <td style={TD_NUM}>{formatoMoneda(a.valorado_por_costo ? a.valor_contable_por_costo : a.valor_razonable_neto)}</td>
                  <td style={TD}>{formatoFecha(a.fecha_calculo, true)}</td>
                  <td style={TD}><Button variant="secondary" size="sm" onClick={() => setAbierto(a)}>{t('valor.ver_detalle')}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      )}
      {abierto && <DetalleActivo activo={abierto} onCerrar={() => setAbierto(null)} onCambio={cargar} />}
    </>
  );
}

function DetalleActivo({ activo, onCerrar, onCambio }: { activo: ActivoValorado; onCerrar: () => void; onCambio: () => void }) {
  const { t } = useT('finanzas');
  const puedeRevertir = usePermissionPorNombre(R_RECONOCIMIENTO, ACCION_D);
  const puedeDeteriorar = usePermissionPorNombre(R_COSTO_HISTORICO, ACCION_C);
  const puedeCambiarMetodo = usePermissionPorNombre(R_COSTO_HISTORICO, ACCION_U);
  const historial = useAsync(finanzasApi.historial);
  const simulacion = useAsync(finanzasApi.simular);
  const reversion = useAsync(finanzasApi.revertir);
  const cambio = useAsync(finanzasApi.cambiarAValorRazonable);
  const [revertir, setRevertir] = useState(false);
  const [deterioro, setDeterioro] = useState(false);
  const id = activo.id_activo_biologico;
  const { ejecutar: cargar } = historial;
  useEffect(() => { cargar(id); }, [id, cargar]);

  const h = historial.data;
  const costo = h?.valoracion_costo?.es_activa ? h.valoracion_costo : null;
  const refrescar = () => { cargar(id); onCambio(); };

  const pasarAValorRazonable = async () => {
    if (await cambio.ejecutar(id)) { pushToast('success', t('valor.cambio_ok')); refrescar(); }
  };

  // Los diálogos no se anidan: la acción reemplaza al detalle y al cerrarla vuelve a él.
  if (revertir) {
    return (
      <MotivoModal
        titulo={t('valor.revertir_titulo')} descripcion={t('valor.revertir_ayuda')} etiqueta={t('valor.motivo')} confirmar={t('valor.revertir')}
        min={20} max={2000} peligro enviando={reversion.cargando} error={reversion.error}
        onCerrar={() => setRevertir(false)}
        onConfirmar={async (motivo) => {
          if (await reversion.ejecutar(id, motivo)) { setRevertir(false); pushToast('success', t('valor.revertido')); refrescar(); }
        }}
      />
    );
  }
  if (deterioro) return <DeterioroModal idActivo={id} onCerrar={() => setDeterioro(false)} onGuardado={() => { setDeterioro(false); refrescar(); }} />;

  return (
    <ModalShell title={t('valor.detalle_titulo', { activo: activo.identificador })} onClose={onCerrar} maxWidth={960}
      footer={<Button variant="secondary" size="md" onClick={onCerrar}>{t('comun.cerrar')}</Button>}>
      <ErrorApi error={historial.error ?? cambio.error} />
      {h && (
        <>
          <Datos filas={[
            [t('col.especie'), h.activo.especie], [t('col.finca'), h.activo.finca],
            [t('col.titular'), h.activo.razon_social ? `${h.activo.razon_social} · ${h.activo.numero_id_tributaria}` : t('valor.sin_titular')],
            [t('col.magnitud'), h.activo.peso_kg ? `${formatoCantidad(h.activo.peso_kg)} kg` : h.activo.cantidad_actual != null ? t('valor.individuos', { count: h.activo.cantidad_actual }) : '—'],
            [t('col.costo_adquisicion'), formatoMoneda(h.activo.costo_adquisicion)],
            [t('col.valor_libros'), formatoMoneda(costo ? costo.valor_contable_por_costo : activo.valor_razonable_neto)],
          ]} />

          <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', marginTop: 'var(--s4)' }}>
            <Button variant="secondary" size="sm" loading={simulacion.cargando} onClick={() => simulacion.ejecutar(id)}>
              <Calculator size={14} aria-hidden />{t('valor.simular')}
            </Button>
            {costo && puedeDeteriorar && <Button variant="secondary" size="sm" onClick={() => setDeterioro(true)}>{t('valor.registrar_deterioro')}</Button>}
            {costo && puedeCambiarMetodo && (
              <Button variant="secondary" size="sm" loading={cambio.cargando} onClick={pasarAValorRazonable}>{t('valor.pasar_vr')}</Button>
            )}
            {puedeRevertir && h.reconocimientos.some((r) => r.estado === 'CONFIRMADO') && (
              <Button variant="danger" size="sm" onClick={() => { reversion.limpiar(); setRevertir(true); }}><Undo2 size={14} aria-hidden />{t('valor.revertir')}</Button>
            )}
          </div>

          {simulacion.error && <Alert variant="error" title={simulacion.error.message} style={{ marginTop: 'var(--s3)' }} />}
          {simulacion.data && (
            <section style={{ ...PANEL, marginTop: 'var(--s4)' }} aria-label={t('valor.simulacion')}>
              <h3 style={{ margin: '0 0 var(--s3)', fontSize: 'var(--fs-body-lg)' }}>{t('valor.simulacion')}</h3>
              {!simulacion.data.es_valido && <Alert variant="warning" title={simulacion.data.mensaje ?? t(`motivo.${simulacion.data.motivo}`, { defaultValue: simulacion.data.motivo ?? '' })} />}
              {simulacion.data.calculo && (
                <Datos filas={[
                  [t('col.magnitud'), `${formatoCantidad(simulacion.data.calculo.magnitud)} ${simulacion.data.calculo.unidad_magnitud}`],
                  [t('col.precio'), formatoMoneda(simulacion.data.calculo.precio_unitario)],
                  [t('col.valor_bruto'), formatoMoneda(simulacion.data.calculo.valor_razonable_bruto)],
                  [t('col.costo_transporte'), formatoMoneda(simulacion.data.calculo.costo_transporte)],
                  [t('col.costo_comisiones'), formatoMoneda(simulacion.data.calculo.costo_comisiones)],
                  [t('col.costo_impuestos'), formatoMoneda(simulacion.data.calculo.costo_impuestos_transaccion)],
                  [t('col.valor_neto'), formatoMoneda(simulacion.data.calculo.valor_neto)],
                ]} />
              )}
              <p style={{ ...SECUNDARIO, margin: 'var(--s3) 0 0' }}>{t('valor.simulacion_ayuda')}</p>
            </section>
          )}

          {costo && (
            <>
              <Subtitulo>{t('valor.modelo_costo')}</Subtitulo>
              <Alert variant="info" title={t('valor.modelo_costo_ayuda')} description={costo.razon_sin_mercado ?? undefined} style={{ marginBottom: 'var(--s3)' }} />
              <Datos filas={[
                [t('col.costo_base'), formatoMoneda(costo.costos_adquisicion)], [t('col.vida_util'), costo.vida_util_meses ?? '—'],
                [t('col.depreciacion'), formatoMoneda(costo.depreciacion_acumulada)], [t('col.deterioro'), formatoMoneda(costo.deterioro_acumulado)],
                [t('col.valor_libros'), formatoMoneda(costo.valor_contable_por_costo)],
              ]} />
            </>
          )}

          <Subtitulo>{t('valor.mediciones')}</Subtitulo>
          <p style={{ ...SECUNDARIO, margin: '0 0 var(--s3)' }}>{t('valor.mediciones_ayuda')}</p>
          {h.mediciones.length === 0 ? <p style={SECUNDARIO}>{t('valor.sin_mediciones')}</p> : (
            <ScrollRegion label={t('valor.mediciones')}>
              <table style={TABLA}>
                <thead>
                  <tr>
                    <th style={TH}>{t('col.fecha')}</th><th style={TH}>{t('col.origen')}</th><th style={TH_NUM}>{t('col.valor_anterior')}</th>
                    <th style={TH_NUM}>{t('col.valor_actual')}</th><th style={TH_NUM}>{t('col.transformacion')}</th>
                    <th style={TH_NUM}>{t('col.precio_mercado')}</th><th style={TH_NUM}>{t('col.variacion_total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {h.mediciones.map((m) => (
                    <tr key={m.id_medicion_posterior}>
                      <td style={TD}>{formatoFecha(m.fecha_medicion, true)}{m.tiene_valor_estimado && <div style={SECUNDARIO}>{t('valor.estimado')}</div>}</td>
                      <td style={TD}>{t(`origen_medicion.${m.origen_medicion}`, { defaultValue: m.origen_medicion })}</td>
                      <td style={TD_NUM}>{formatoMoneda(m.valor_razonable_anterior)}</td>
                      <td style={TD_NUM}>{formatoMoneda(m.valor_razonable_actual)}</td>
                      <td style={TD_NUM}>{formatoMoneda(m.ganancia_perdida_transformacion)}</td>
                      <td style={TD_NUM}>{formatoMoneda(m.ganancia_perdida_precio_mercado)}</td>
                      <td style={TD_NUM}><strong>{formatoMoneda(m.variacion_total)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollRegion>
          )}

          <Subtitulo>{t('valor.lineas')}</Subtitulo>
          {h.lineas.length === 0 ? <p style={SECUNDARIO}>{t('valor.sin_lineas')}</p> : (
            <ScrollRegion label={t('valor.lineas')}>
              <table style={TABLA}>
                <thead>
                  <tr>
                    <th style={TH}>{t('col.fecha')}</th><th style={TH}>{t('col.tipo_hecho')}</th><th style={TH}>{t('col.sentido')}</th>
                    <th style={TH_NUM}>{t('col.valor')}</th><th style={TH}>{t('col.cuentas')}</th><th style={TH}>{t('col.estado')}</th>
                  </tr>
                </thead>
                <tbody>
                  {h.lineas.map((l) => (
                    <tr key={l.id_linea_asiento_nic41}>
                      <td style={TD}>{formatoFecha(l.fecha_hecho)}</td>
                      <td style={TD}>{t(`hecho.${l.tipo_hecho}`)}{l.es_reverso && <div style={SECUNDARIO}>{t('valor.reverso')}</div>}</td>
                      <td style={TD}>{t(`sentido.${l.sentido}`)}</td>
                      <td style={TD_NUM}>{formatoMoneda(l.valor)}</td>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)' }}>{l.cuenta_debito && l.cuenta_credito ? `${l.cuenta_debito} / ${l.cuenta_credito}` : '—'}</td>
                      <td style={TD}><EstadoBadge estado={l.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollRegion>
          )}
        </>
      )}

    </ModalShell>
  );
}

function DeterioroModal({ idActivo, onCerrar, onGuardado }: { idActivo: number; onCerrar: () => void; onGuardado: () => void }) {
  const { t } = useT('finanzas');
  const registro = useAsync(finanzasApi.registrarDeterioro);
  const [evento, setEvento] = useState('');
  const [impacto, setImpacto] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [aviso, setAviso] = useState<string>();

  const guardar = async () => {
    const monto = decimalPositivo(impacto);
    if (!/^\d+$/.test(evento) || !monto || justificacion.trim().length < 30) { setAviso(t('valor.deterioro_incompleto')); return; }
    setAviso(undefined);
    if (await registro.ejecutar(idActivo, { id_evento_sanitario: Number(evento), impacto_economico_cop: monto, justificacion: justificacion.trim() })) {
      pushToast('success', t('valor.deterioro_ok'));
      onGuardado();
    }
  };

  return (
    <ModalShell title={t('valor.registrar_deterioro')} onClose={onCerrar} maxWidth={520}
      footer={(
        <>
          <Button variant="secondary" size="md" onClick={onCerrar} disabled={registro.cargando}>{t('comun.cancelar')}</Button>
          <Button variant="primary" size="md" loading={registro.cargando} onClick={guardar}>{t('comun.guardar')}</Button>
        </>
      )}>
      <p style={{ ...SECUNDARIO, margin: '0 0 var(--s4)' }}>{t('valor.deterioro_ayuda')}</p>
      <ErrorApi error={registro.error} />
      {aviso && <Alert variant="error" title={aviso} style={{ marginBottom: 'var(--s3)' }} />}
      <div style={{ display: 'grid', gap: 'var(--s4)' }}>
        <Input id="det-evento" label={t('valor.evento_sanitario')} required inputMode="numeric" value={evento} onChange={(e) => setEvento(e.target.value.trim())} hint={t('valor.evento_sanitario_ayuda')} />
        <Input id="det-impacto" label={t('valor.impacto')} required inputMode="decimal" value={impacto} onChange={(e) => setImpacto(e.target.value)} />
        <AreaTexto id="det-justificacion" label={t('valor.justificacion')} required maxLength={2000} value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)} hint={t('comun.minimo', { n: 30 })} />
      </div>
    </ModalShell>
  );
}

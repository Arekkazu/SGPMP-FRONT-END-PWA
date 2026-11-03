// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-78/RF-79: acumulado del ciclo, costos directos, correcciones y NIC-41 |
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, PencilLine, Coins } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { ACCION_C, ACCION_R, ACCION_U, RECURSO_COSTEO, RECURSO_NIC41 } from '../rbac';
import { useCosteo } from '../hooks/useCosteo';
import { useActivosSuministros } from '../hooks/useActivosSuministros';
import { formatoCantidad, formatoFecha, formatoMoneda } from '../lib/formato';
import type { LineaHistorial } from '../types';
import { EncabezadoVista } from '../components/EncabezadoVista';
import { EstadoVacio } from '../components/EstadoVacio';
import { SelectorActivo, nombreActivo } from '../components/SelectorActivo';
import { SuministroDirectoFormModal } from '../components/SuministroDirectoFormModal';
import { CorreccionSuministroModal } from '../components/CorreccionSuministroModal';
import { Nic41Panel } from '../components/Nic41Panel';
import { FILTROS, PANEL, SECUNDARIO, TABLA, TD, TD_NUM, TH, TH_NUM } from '../components/estilos';

export function CostosView() {
  const { t } = useT('supplies');
  const puedeLeer = usePermission(RECURSO_COSTEO, ACCION_R);
  const puedeRegistrar = usePermission(RECURSO_COSTEO, ACCION_C);
  const puedeCorregir = usePermission(RECURSO_COSTEO, ACCION_U);
  const puedeVerNic41 = usePermission(RECURSO_NIC41, ACCION_R);
  const online = useOnlineStatus();
  const { activos, cargando: cargandoActivos } = useActivosSuministros();
  const { acumulado, registros, registro, correccion } = useCosteo();
  const [texto, setTexto] = useState('');
  const [idActivo, setIdActivo] = useState<number | null>(null);
  const [consultado, setConsultado] = useState<number | null>(null);
  const [errorActivo, setErrorActivo] = useState<string>();
  const [formAbierto, setFormAbierto] = useState(false);
  const [aCorregir, setACorregir] = useState<LineaHistorial | null>(null);

  const { ejecutar: cargarAcumulado } = acumulado;
  const { ejecutar: cargarRegistros } = registros;
  const recargar = useMemo(() => (id: number) => {
    cargarAcumulado(id);
    cargarRegistros({ id_activo_biologico: id, registros_por_pagina: 200 });
  }, [cargarAcumulado, cargarRegistros]);
  useEffect(() => { if (consultado !== null) recargar(consultado); }, [consultado, recargar]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.costos')} />;

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (idActivo === null) { setErrorActivo(t('comun.activo_requerido')); return; }
    setErrorActivo(undefined);
    setConsultado(idActivo);
  };

  const a = acumulado.data;
  const sinCiclo = acumulado.error?.status === 404;
  const activo = activos.find((x) => x.id_activo_biologico === consultado);
  const etiquetaActivo = activo ? nombreActivo(activo) : `#${consultado}`;
  const pagina = registros.data?.tipo === 'pagina' ? registros.data : null;
  // Solo el ciclo vigente admite correcciones, y nunca una corrección de otra (CORRECCION_SOBRE_CORRECCION).
  const lineas = (pagina?.items ?? []).filter((l) => !a || l.id_ciclo_productivo === a.id_ciclo_productivo);

  return (
    <>
      <EncabezadoVista
        titulo={t('costeo.titulo')}
        descripcion={t('costeo.descripcion')}
        acciones={puedeRegistrar && a && (
          <Button variant="primary" size="md" disabled={!online} onClick={() => { registro.limpiar(); setFormAbierto(true); }}>
            <Plus size={18} aria-hidden />{t('costeo.registrar')}
          </Button>
        )}
      />
      <form onSubmit={buscar} style={{ ...FILTROS, marginBottom: 'var(--s5)' }}>
        <SelectorActivo id="costeo-activo" activos={activos} cargando={cargandoActivos} value={texto} required error={errorActivo} onChange={(x, id) => { setTexto(x); setIdActivo(id); }} />
        <div style={{ paddingBottom: 'var(--s1)' }}>
          <Button type="submit" variant="secondary" size="md" loading={acumulado.cargando}><Search size={16} aria-hidden />{t('comun.consultar')}</Button>
        </div>
      </form>

      {consultado === null ? (
        <EstadoVacio icono={<Coins size={28} aria-hidden />} titulo={t('costeo.vacio_titulo')} detalle={t('costeo.vacio_detalle')} />
      ) : (
        <>
          {sinCiclo && <Alert variant="info" title={t('costeo.sin_ciclo')} description={acumulado.error?.message} />}
          {acumulado.error && !sinCiclo && <Alert variant="error" title={acumulado.error.message} />}
          {a && (
            <section aria-labelledby="acumulado-titulo" style={PANEL}>
              <div style={{ display: 'flex', gap: 'var(--s6)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: '0 0 auto' }}>
                  <h2 id="acumulado-titulo" style={{ margin: 0, fontSize: 'var(--fs-label-md)', fontWeight: 600, color: 'var(--text-muted)' }}>{t('costeo.acumulado', { activo: etiquetaActivo })}</h2>
                  <p style={{ margin: 'var(--s1) 0 0', fontSize: 'var(--fs-display-lg)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: 'var(--ls-tight)', fontVariantNumeric: 'tabular-nums', lineHeight: 'var(--lh-tight)' }}>
                    {formatoMoneda(a.acumulado_total_ciclo)}
                  </p>
                  <p style={{ ...SECUNDARIO, margin: 'var(--s2) 0 0' }}>{t('costeo.actualizado', { fecha: formatoFecha(a.fecha_ultima_actualizacion, true), version: a.version_acumulado })}</p>
                </div>
                <dl style={{ flex: '1 1 280px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--s4)', margin: 0 }}>
                  {Object.entries(a.acumulado_por_categoria).map(([cat, monto]) => (
                    <div key={cat}>
                      <dt style={{ fontSize: 'var(--fs-label-md)', fontWeight: 600, color: 'var(--text-muted)' }}>{t(`tipo.${cat}`, { defaultValue: cat })}</dt>
                      <dd style={{ margin: 'var(--s1) 0 0', fontSize: 'var(--fs-body-lg)', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatoMoneda(monto)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          )}

          {a && (
            <>
              <h2 style={{ margin: 'var(--s7) 0 var(--s3)', fontSize: 'var(--fs-heading-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{t('costeo.registros')}</h2>
              {registros.error && <Alert variant="error" title={registros.error.message} />}
              {registros.data?.tipo === 'asincrono' && <Alert variant="info" title={t('historial.asincrono')} description={registros.data.consulta.mensaje} />}
              {lineas.length === 0 ? (
                <p style={{ ...SECUNDARIO, fontSize: 'var(--fs-body-md)' }}>{registros.cargando ? t('comun.cargando') : t('costeo.sin_registros')}</p>
              ) : (
                <ScrollRegion label={t('costeo.registros')}>
                  <table style={TABLA} aria-busy={registros.cargando}>
                    <thead>
                      <tr>
                        <th style={TH}>{t('comun.fecha')}</th>
                        <th style={TH}>{t('historial.tipo')}</th>
                        <th style={TH}>{t('historial.descripcion')}</th>
                        <th style={TH_NUM}>{t('historial.cantidad')}</th>
                        <th style={TH_NUM}>{t('historial.precio')}</th>
                        <th style={TH_NUM}>{t('historial.costo')}</th>
                        <th style={TH}>{t('historial.operacion')}</th>
                        {puedeCorregir && <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {lineas.map((l) => (
                        <tr key={l.id_registro_suministro}>
                          <td style={TD}>{formatoFecha(l.fecha_aplicacion)}</td>
                          <td style={TD}>{t(`tipo.${l.tipo_suministro}`, { defaultValue: l.tipo_suministro })}</td>
                          <td style={TD}>{l.descripcion}{l.observacion && <div style={{ ...SECUNDARIO, maxWidth: 280 }}>{l.observacion}</div>}</td>
                          <td style={TD_NUM}>{formatoCantidad(l.cantidad)} {l.unidad_medida}</td>
                          <td style={TD_NUM}>{formatoMoneda(l.precio_unitario)}</td>
                          <td style={TD_NUM}>{formatoMoneda(l.costo_registro)}</td>
                          <td style={TD}>{t(`operacion.${l.tipo_operacion}`, { defaultValue: l.tipo_operacion })}</td>
                          {puedeCorregir && (
                            <td style={TD}>
                              {l.tipo_operacion === 'REGISTRO' && (
                                <Button variant="ghost" size="sm" disabled={!online} onClick={() => { correccion.limpiar(); setACorregir(l); }}>
                                  <PencilLine size={16} aria-hidden />{t('costeo.corregir')}
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollRegion>
              )}
            </>
          )}

          {puedeVerNic41 && <Nic41Panel key={consultado} idActivo={consultado} idGestionFasesActiva={a?.id_gestion_fases ?? null} online={online} />}
        </>
      )}

      {formAbierto && consultado !== null && (
        <SuministroDirectoFormModal
          idActivo={consultado}
          nombreActivo={etiquetaActivo}
          enviando={registro.cargando}
          error={registro.error}
          onCerrar={() => setFormAbierto(false)}
          onGuardar={async (payload) => {
            const r = await registro.ejecutar(payload);
            if (r) { setFormAbierto(false); pushToast('success', t('costeo.registrado'), r.mensaje); recargar(consultado); }
          }}
        />
      )}
      {aCorregir && consultado !== null && (
        <CorreccionSuministroModal
          original={aCorregir}
          enviando={correccion.cargando}
          error={correccion.error}
          onCerrar={() => setACorregir(null)}
          onGuardar={async (payload) => {
            const r = await correccion.ejecutar(aCorregir.id_registro_suministro, payload);
            if (r) { setACorregir(null); pushToast('success', t('costeo.corregido'), r.mensaje); recargar(consultado); }
          }}
        />
      )}
    </>
  );
}

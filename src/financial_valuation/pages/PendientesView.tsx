// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-10 | Arekkazu | TC-DIS-233 RF-86: panel de gestión con los hechos en medición pendiente y sin cuenta contable |
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { ClipboardList, Play } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_E, ACCION_R, R_CONFIGURACION, R_VALORACION } from '../rbac';
import {
  BadgeTono, CeldaActivo, EncabezadoVista, EstadoVacio, ErrorApi, Indicadores, SECUNDARIO, SinPeriodo, Subtitulo, TABLA, TD, TD_NUM, TH, TH_NUM,
  formatoFecha, formatoMoneda, nombrePeriodo, useAsync, usePeriodo,
} from '../components/comunes';

/**
 * RF-86: «panel de gestión de M06» con lo que impide registrar o cerrar el período: eventos cuya medición quedó
 * pendiente (MEDICION_PENDIENTE) y hechos sin par de cuentas en la matriz (PENDIENTE_CUENTA).
 */
export function PendientesView() {
  const { t } = useT('finanzas');
  const history = useHistory();
  const puedeLeer = usePermissionPorNombre(R_VALORACION, ACCION_R);
  const puedeProcesar = usePermissionPorNombre(R_VALORACION, ACCION_E);
  const puedeConfigurar = usePermissionPorNombre(R_CONFIGURACION, ACCION_R);
  const { periodo } = usePeriodo();
  const eventos = useAsync(finanzasApi.eventosPendientes);
  const lineas = useAsync(finanzasApi.lineas);
  const activos = useAsync(finanzasApi.activos);
  const proceso = useAsync(finanzasApi.procesarEventos);
  const id = periodo?.id_periodo_contable;
  const { ejecutar: cargarEventos } = eventos;
  const { ejecutar: cargarLineas } = lineas;
  const { ejecutar: cargarActivos } = activos;
  useEffect(() => {
    if (!puedeLeer || !id) return;
    cargarEventos(id);
    cargarLineas(id, 'PENDIENTE_CUENTA');
  }, [puedeLeer, id, cargarEventos, cargarLineas]);
  useEffect(() => { if (puedeLeer) cargarActivos(); }, [puedeLeer, cargarActivos]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.pendientes')} />;
  const listaEventos = eventos.data ?? [];
  const listaLineas = lineas.data ?? [];
  const nombre = new Map((activos.data ?? []).map((a) => [a.id_activo_biologico, a.identificador]));
  const activoDe = (idActivo: number | null) => (idActivo ? nombre.get(idActivo) ?? t('traza.activo_sin_reconocer') : t('traza.sin_activo'));

  const procesar = async () => {
    const r = await proceso.ejecutar();
    if (!r) return;
    pushToast('success', t('valor.procesado', { eventos: r.eventos.PROCESADO ?? 0, provisiones: r.provisiones_m05.PROCESADO ?? 0 }));
    if (id) { cargarEventos(id); cargarLineas(id, 'PENDIENTE_CUENTA'); }
  };

  return (
    <>
      <EncabezadoVista
        titulo={t('pendientes.titulo')}
        descripcion={periodo ? t('pendientes.descripcion_periodo', { periodo: nombrePeriodo(periodo) }) : t('pendientes.descripcion')}
        acciones={puedeProcesar && periodo?.estado === 'ABIERTO' && (
          <Button variant="primary" size="md" loading={proceso.cargando} onClick={procesar}><Play size={16} aria-hidden />{t('valor.procesar')}</Button>
        )}
      />
      <ErrorApi error={eventos.error ?? lineas.error ?? proceso.error} />
      {!periodo ? <SinPeriodo /> : (
        <>
          <Indicadores items={[
            { etiqueta: t('pendientes.kpi_medicion'), valor: listaEventos.length, tono: listaEventos.length ? 'warning' : 'success', detalle: t('pendientes.kpi_medicion_detalle') },
            { etiqueta: t('pendientes.kpi_cuenta'), valor: listaLineas.length, tono: listaLineas.length ? 'warning' : 'success', detalle: t('pendientes.kpi_cuenta_detalle') },
          ]} />
          {(listaEventos.length > 0 || listaLineas.length > 0) && (
            <Alert variant="warning" title={t('pendientes.bloquean_cierre')} description={t('pendientes.bloquean_cierre_detalle')} style={{ marginBottom: 'var(--s5)' }} />
          )}

          <section aria-labelledby="pend-medicion">
            <Subtitulo id="pend-medicion">{t('pendientes.medicion_titulo')}</Subtitulo>
            {listaEventos.length === 0 ? (
              <EstadoVacio icono={<ClipboardList size={28} aria-hidden />} titulo={eventos.cargando ? t('comun.cargando') : t('pendientes.sin_medicion')}
                detalle={t('pendientes.sin_medicion_detalle')} />
            ) : (
              <ScrollRegion label={t('pendientes.medicion_titulo')}>
                <table style={TABLA}>
                  <thead><tr><th style={TH}>{t('col.activo')}</th><th style={TH}>{t('col.fecha')}</th><th style={TH}>{t('col.estado')}</th><th style={TH}>{t('pendientes.motivo')}</th></tr></thead>
                  <tbody>
                    {listaEventos.map((e) => (
                      <tr key={e.id_evento}>
                        <th scope="row" style={{ ...TD, textAlign: 'left', fontWeight: 400 }}><CeldaActivo identificador={e.identificador} especie={e.especie} finca={e.finca} /></th>
                        <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(e.fecha_evento)}</td>
                        <td style={TD}><BadgeTono tono="warning">{t('estado.MEDICION_PENDIENTE')}</BadgeTono></td>
                        <td style={TD}>{e.motivo ?? t('pendientes.sin_motivo')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollRegion>
            )}
            {listaEventos.length > 0 && (
              <div className="fin-acciones" style={{ marginTop: 'var(--s3)' }}>
                <Button variant="secondary" size="sm" onClick={() => history.push('/finanzas/medicion')}>{t('pendientes.ir_medicion')}</Button>
              </div>
            )}
          </section>

          <section aria-labelledby="pend-cuenta" style={{ marginTop: 'var(--s6)' }}>
            <Subtitulo id="pend-cuenta">{t('pendientes.cuenta_titulo')}</Subtitulo>
            {listaLineas.length === 0 ? (
              <EstadoVacio icono={<ClipboardList size={28} aria-hidden />} titulo={lineas.cargando ? t('comun.cargando') : t('pendientes.sin_cuenta')}
                detalle={t('pendientes.sin_cuenta_detalle')} />
            ) : (
              <ScrollRegion label={t('pendientes.cuenta_titulo')}>
                <table style={TABLA}>
                  <thead>
                    <tr><th style={TH}>{t('col.tipo_hecho')}</th><th style={TH}>{t('col.activo')}</th><th style={TH}>{t('col.fecha')}</th>
                      <th style={TH_NUM}>{t('col.valor')}</th><th style={TH}>{t('col.estado')}</th></tr>
                  </thead>
                  <tbody>
                    {listaLineas.map((l) => (
                      <tr key={l.id_linea_asiento_nic41}>
                        <th scope="row" style={{ ...TD, textAlign: 'left', fontWeight: 400 }}>
                          {t(`hecho.${l.tipo_hecho}`)}<span className="fin-secundario">{t(`sentido.${l.sentido}`)}</span>
                        </th>
                        <td style={TD}>{activoDe(l.id_activo_biologico)}</td>
                        <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(l.fecha_hecho)}</td>
                        <td style={TD_NUM}>{formatoMoneda(l.valor)}</td>
                        <td style={TD}><BadgeTono tono="warning">{t('estado.PENDIENTE_CUENTA')}</BadgeTono></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollRegion>
            )}
            {listaLineas.length > 0 && (
              puedeConfigurar
                ? <div className="fin-acciones" style={{ marginTop: 'var(--s3)' }}><Button variant="secondary" size="sm" onClick={() => history.push('/finanzas/configuracion')}>{t('pendientes.ir_configuracion')}</Button></div>
                : <p style={{ ...SECUNDARIO, marginTop: 'var(--s3)' }}>{t('pendientes.pedir_configuracion')}</p>
            )}
          </section>
        </>
      )}
    </>
  );
}

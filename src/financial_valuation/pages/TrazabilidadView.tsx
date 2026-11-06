// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-05 | Arekkazu | M06 RF-91 prototipo: líneas de asiento del período con su cadena, indicadores y filtros |
import React, { useEffect, useState } from 'react';
import { GitBranch, Link2, ShieldCheck } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_E, ACCION_R, R_TRAZABILIDAD, R_VALORACION } from '../rbac';
import type { Linea } from '../types';
import { CadenaModal } from '../components/CadenaModal';
import {
  EncabezadoVista, EstadoBadge, ErrorApi, Indicadores, Listado, SinPeriodo, TABLA, TD, TD_NUM, TH, TH_NUM, formatoFecha, formatoMoneda,
  nombrePeriodo, useAsync, useListado, usePeriodo,
} from '../components/comunes';

export function TrazabilidadView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_TRAZABILIDAD, ACCION_R);
  const puedeVerificar = usePermissionPorNombre(R_TRAZABILIDAD, ACCION_E);
  const puedeVerLineas = usePermissionPorNombre(R_VALORACION, ACCION_R);
  const { periodo } = usePeriodo();
  const lineas = useAsync(finanzasApi.lineas);
  const activos = useAsync(finanzasApi.activos);
  const verificacion = useAsync(finanzasApi.verificarTrazabilidad);
  const [cadena, setCadena] = useState<Linea | null>(null);
  const id = periodo?.id_periodo_contable;
  const { ejecutar: cargarLineas } = lineas;
  const { ejecutar: cargarActivos } = activos;
  useEffect(() => { if (puedeLeer && puedeVerLineas && id) cargarLineas(id); }, [puedeLeer, puedeVerLineas, id, cargarLineas]);
  useEffect(() => { if (puedeLeer && puedeVerLineas) cargarActivos(); }, [puedeLeer, puedeVerLineas, cargarActivos]);

  const identificador = new Map((activos.data ?? []).map((a) => [a.id_activo_biologico, a.identificador]));
  const activoDe = (l: Linea) => (l.id_activo_biologico ? identificador.get(l.id_activo_biologico) ?? t('traza.activo_sin_reconocer') : t('traza.sin_activo'));
  const l = useListado(lineas.data, (x) => `${activoDe(x)} ${t(`hecho.${x.tipo_hecho}`)}`, [
    { id: 'traza', etiqueta: t('col.trazabilidad'), valor: (x) => x.estado_trazabilidad, texto: (v) => t(`estado.${v}`), femenino: true },
    { id: 'evidencia', etiqueta: t('col.evidencia'), valor: (x) => x.tipo_evidencia, texto: (v) => t(`evidencia.${v}`, { defaultValue: t('evidencia.REGISTRO_MANUAL') }), femenino: true },
    { id: 'hecho', etiqueta: t('col.tipo_hecho'), valor: (x) => x.tipo_hecho, texto: (v) => t(`hecho.${v}`) },
    { id: 'estado', etiqueta: t('traza.estado_contable'), valor: (x) => x.estado, texto: (v) => t(`estado.${v}`) },
  ]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.trazabilidad')} />;
  if (!puedeVerLineas) return <AccesoDenegado seccion={t('cierre.lineas')} />;
  const lista = lineas.data ?? [];
  const cuenta = (e: string) => lista.filter((x) => x.estado_trazabilidad === e).length;
  const incompletas = cuenta('PENDIENTE_TRAZABILIDAD');

  const verificar = async () => {
    if (!id) return;
    const r = await verificacion.ejecutar(id);
    if (r) {
      pushToast(r.pendientes.length ? 'warning' : 'success', t('cierre.verificadas', { verificadas: r.verificadas, pendientes: r.pendientes.length }));
      cargarLineas(id);
    }
  };

  return (
    <>
      <EncabezadoVista
        titulo={t('traza.titulo')}
        descripcion={periodo ? t('traza.descripcion_periodo', { periodo: nombrePeriodo(periodo) }) : t('traza.descripcion')}
        acciones={puedeVerificar && periodo && periodo.estado !== 'CERRADO' && (
          <Button variant="primary" size="md" loading={verificacion.cargando} onClick={verificar}><ShieldCheck size={16} aria-hidden />{t('cierre.verificar')}</Button>
        )}
      />
      <div className="fin-avisos">
        <Alert variant="info" title={t('traza.aviso_titulo')} description={t('traza.aviso_detalle')} />
        {incompletas > 0 && <Alert variant="warning" title={t('traza.incompletas', { count: incompletas })} description={t('traza.incompletas_detalle')} />}
      </div>
      <ErrorApi error={lineas.error ?? verificacion.error} />
      {!periodo ? <SinPeriodo /> : (
        <>
          <Indicadores items={[
            { etiqueta: t('traza.kpi_total'), valor: lista.length, detalle: nombrePeriodo(periodo) },
            { etiqueta: t('traza.kpi_verificados'), valor: cuenta('VERIFICADO'), tono: 'success', detalle: t('traza.kpi_verificados_detalle') },
            { etiqueta: t('traza.kpi_pendientes'), valor: cuenta('VERIFICACION_PENDIENTE'), tono: 'info', detalle: t('traza.kpi_pendientes_detalle') },
            { etiqueta: t('traza.kpi_incompletas'), valor: incompletas, tono: incompletas ? 'warning' : 'neutral', detalle: t('traza.kpi_incompletas_detalle') },
          ]} />
          <Listado l={l} idBase="traza" sustantivo={t('traza.sustantivo')} buscar={t('traza.buscar')} cargando={lineas.cargando}
            vacio={{ icono: <GitBranch size={28} aria-hidden />, titulo: t('cierre.sin_lineas'), detalle: t('cierre.lineas_ayuda') }}>
            {(visibles) => (
              <table style={TABLA}>
                <thead>
                  <tr>
                    <th style={TH}>{t('col.tipo_hecho')}</th><th style={TH}>{t('col.activo')}</th><th style={TH}>{t('col.evidencia')}</th>
                    <th style={TH}>{t('col.fecha')}</th><th style={TH_NUM}>{t('col.valor')}</th><th style={TH}>{t('col.cuentas')}</th>
                    <th style={TH}>{t('traza.estado_contable')}</th><th style={TH}>{t('col.trazabilidad')}</th>
                    <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((x) => (
                    <tr key={x.id_linea_asiento_nic41} className={x.estado_trazabilidad === 'PENDIENTE_TRAZABILIDAD' ? 'fin-fila--atencion' : undefined}>
                      <td style={TD}>
                        {t(`hecho.${x.tipo_hecho}`)}
                        <span className="fin-secundario">{t(`sentido.${x.sentido}`)}{x.es_estimacion ? ` · ${t('valor.estimado')}` : ''}{x.es_reverso ? ` · ${t('valor.reverso')}` : ''}</span>
                      </td>
                      <td style={TD}>{activoDe(x)}</td>
                      <td style={TD}>{t(`evidencia.${x.tipo_evidencia}`, { defaultValue: t('evidencia.REGISTRO_MANUAL') })}</td>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(x.fecha_hecho)}</td>
                      <td style={TD_NUM}>{formatoMoneda(x.valor)}</td>
                      <td style={TD}>{x.cuenta_debito && x.cuenta_credito ? <span className="fin-mono">{x.cuenta_debito} / {x.cuenta_credito}</span> : t('valor.sin_cuenta')}</td>
                      <td style={TD}><EstadoBadge estado={x.estado} /></td>
                      <td style={TD}><EstadoBadge estado={x.estado_trazabilidad} /></td>
                      <td style={TD}>
                        <Button variant="ghost" size="sm" onClick={() => setCadena(x)} aria-label={t('cierre.ver_cadena_aria', { linea: `${t(`hecho.${x.tipo_hecho}`)} · ${activoDe(x)}` })}>
                          <Link2 size={14} aria-hidden />{t('cierre.ver_cadena')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Listado>
        </>
      )}
      {cadena && (
        <CadenaModal idLinea={cadena.id_linea_asiento_nic41} titulo={`${t(`hecho.${cadena.tipo_hecho}`)} · ${activoDe(cadena)}`} onCerrar={() => setCadena(null)} />
      )}
    </>
  );
}

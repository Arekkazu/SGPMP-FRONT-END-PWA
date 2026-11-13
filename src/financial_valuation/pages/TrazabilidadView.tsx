// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-05 | Arekkazu | M06 RF-91 prototipo: líneas de asiento del período con su cadena, indicadores y filtros |
// | 2026-11-10 | Arekkazu | INC-M06-351-G45 RF-87: ajustar una línea de un período cerrado |
// | 2026-11-10 | Arekkazu | TC-DIS-254..256 RF-91: tipo de activo para la cadena, foco que se queda en «Verificar» y aviso de solo lectura del período cerrado |
// | 2026-11-12 | Arekkazu | TC-DIS-256 RF-91: el auditor externo consulta las líneas sin permiso de valoración (solo períodos cerrados) |
import React, { useEffect, useRef, useState } from 'react';
import { GitBranch, Link2, PencilLine, ShieldCheck } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_C, ACCION_E, ACCION_R, R_CIERRE, R_COSTOS, R_TRAZABILIDAD, R_VALORACION } from '../rbac';
import type { Linea } from '../types';
import { AjusteModal } from '../components/AjusteModal';
import { CadenaModal } from '../components/CadenaModal';
import {
  EncabezadoVista, EstadoBadge, ErrorApi, Indicadores, Listado, SinPeriodo, TABLA, TD, TD_NUM, TH, TH_NUM, formatoFecha, formatoMoneda,
  nombrePeriodo, useAsync, useListado, usePeriodo,
} from '../components/comunes';

export function TrazabilidadView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_TRAZABILIDAD, ACCION_R);
  const puedeVerificar = usePermissionPorNombre(R_TRAZABILIDAD, ACCION_E);
  // TC-DIS-256: las líneas las lee quien consulta la trazabilidad (el auditor, solo períodos cerrados por la BD);
  // la lista de activos valorados es solo para quien lee la valoración.
  const puedeVerActivos = usePermissionPorNombre(R_VALORACION, ACCION_R);
  const puedeAjustar = usePermissionPorNombre(R_CIERRE, ACCION_E);
  // RF-91: sin visión completa (ejecutar el cierre o registrar costos) la BD solo muestra períodos cerrados.
  const registraCostos = usePermissionPorNombre(R_COSTOS, ACCION_C);
  const visionCompleta = puedeAjustar || registraCostos;
  const { periodo } = usePeriodo();
  const lineas = useAsync(finanzasApi.lineas);
  const activos = useAsync(finanzasApi.activos);
  const verificacion = useAsync(finanzasApi.verificarTrazabilidad);
  const [cadena, setCadena] = useState<Linea | null>(null);
  const [ajustando, setAjustando] = useState<Linea | null>(null);
  const botonVerificar = useRef<HTMLButtonElement>(null);
  const devolverFoco = useRef(false);
  // Al terminar la verificación el botón deja de estar ocupado: el foco vuelve a él (WCAG 4.1.3, no se mueve al anuncio).
  useEffect(() => {
    if (!verificacion.cargando && devolverFoco.current) { devolverFoco.current = false; botonVerificar.current?.focus(); }
  }, [verificacion.cargando]);
  const id = periodo?.id_periodo_contable;
  const { ejecutar: cargarLineas } = lineas;
  const { ejecutar: cargarActivos } = activos;
  useEffect(() => { if (puedeLeer && id) cargarLineas(id); }, [puedeLeer, id, cargarLineas]);
  useEffect(() => { if (puedeLeer && puedeVerActivos) cargarActivos(); }, [puedeLeer, puedeVerActivos, cargarActivos]);

  const identificador = new Map((activos.data ?? []).map((a) => [a.id_activo_biologico, a.identificador]));
  const tipoDe = (l: Linea) => (l.id_activo_biologico ? l.tipo_activo ?? (activos.data ?? []).find((a) => a.id_activo_biologico === l.id_activo_biologico)?.tipo ?? null : null);
  const activoDe = (l: Linea) => (l.id_activo_biologico ? l.identificador_activo ?? identificador.get(l.id_activo_biologico) ?? t('traza.activo_sin_reconocer') : t('traza.sin_activo'));
  const l = useListado(lineas.data, (x) => `${activoDe(x)} ${t(`hecho.${x.tipo_hecho}`)}`, [
    { id: 'traza', etiqueta: t('col.trazabilidad'), valor: (x) => x.estado_trazabilidad, texto: (v) => t(`estado.${v}`), femenino: true },
    { id: 'evidencia', etiqueta: t('col.evidencia'), valor: (x) => x.tipo_evidencia, texto: (v) => t(`evidencia.${v}`, { defaultValue: t('evidencia.REGISTRO_MANUAL') }), femenino: true },
    { id: 'hecho', etiqueta: t('col.tipo_hecho'), valor: (x) => x.tipo_hecho, texto: (v) => t(`hecho.${v}`) },
    { id: 'estado', etiqueta: t('traza.estado_contable'), valor: (x) => x.estado, texto: (v) => t(`estado.${v}`) },
  ]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.trazabilidad')} />;
  const lista = lineas.data ?? [];
  const cuenta = (e: string) => lista.filter((x) => x.estado_trazabilidad === e).length;
  const incompletas = cuenta('PENDIENTE_TRAZABILIDAD');
  // Un hecho de un período cerrado se corrige con un ajuste en el período abierto (RF-87 v1.1); no se ajusta otro ajuste.
  const ajustable = (x: Linea) => puedeAjustar && periodo?.estado === 'CERRADO' && x.estado === 'REGISTRADA'
    && x.tipo_hecho !== 'AJUSTE_PERIODO_ANTERIOR';

  const verificar = async () => {
    if (!id) return;
    devolverFoco.current = true;
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
          <Button ref={botonVerificar} variant="primary" size="md" loading={verificacion.cargando} onClick={verificar}><ShieldCheck size={16} aria-hidden />{t('cierre.verificar')}</Button>
        )}
      />
      <div className="fin-avisos">
        {periodo?.estado === 'CERRADO'
          ? <Alert variant="info" title={t('traza.solo_lectura')} description={t('traza.solo_lectura_detalle')} />
          : periodo && !visionCompleta
            ? <Alert variant="warning" title={t('traza.solo_cerrados')} description={t('traza.solo_cerrados_detalle')} />
            : <Alert variant="info" title={t('traza.aviso_titulo')} description={t('traza.aviso_detalle')} />}
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
                        {ajustable(x) && (
                          <Button variant="ghost" size="sm" onClick={() => setAjustando(x)} aria-label={t('ajuste.abrir_aria', { linea: `${t(`hecho.${x.tipo_hecho}`)} · ${activoDe(x)}` })}>
                            <PencilLine size={14} aria-hidden />{t('ajuste.abrir')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Listado>
        </>
      )}
      {ajustando && (
        <AjusteModal linea={ajustando} titulo={`${t(`hecho.${ajustando.tipo_hecho}`)} · ${activoDe(ajustando)}`} onCerrar={() => setAjustando(null)} />
      )}
      {cadena && (
        <CadenaModal idLinea={cadena.id_linea_asiento_nic41} titulo={`${t(`hecho.${cadena.tipo_hecho}`)} · ${activoDe(cadena)}`} tipoActivo={tipoDe(cadena)} onCerrar={() => setCadena(null)} />
      )}
    </>
  );
}

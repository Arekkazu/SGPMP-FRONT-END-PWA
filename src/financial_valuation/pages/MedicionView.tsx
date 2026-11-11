// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-05 | Arekkazu | M06 RF-83 prototipo: medición posterior del período por activo, con indicadores y filtros |
// | 2026-11-10 | Arekkazu | INC-M06-297-G34-02 RF-86: un evento suspendido posterior a la última medición deja el activo pendiente |
import React, { useEffect, useState } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { Badge } from '../../shared/design-system/Badge';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_E, ACCION_R, R_VALORACION } from '../rbac';
import type { ActivoValorado, Dec, EventoPendiente, MedicionPeriodo } from '../types';
import { sumar, signo } from '../lib/decimal';
import { DetalleActivoModal } from '../components/DetalleActivoModal';
import {
  CeldaActivo, EncabezadoVista, ErrorApi, Indicadores, Listado, SinPeriodo, TABLA, TD, TD_NUM, TH, TH_NUM, Variacion,
  formatoFecha, formatoMoneda, nombrePeriodo, useAsync, useListado, usePeriodo,
} from '../components/comunes';

type EstadoMedicion = 'COMPLETADO' | 'MEDICION_PENDIENTE' | 'SIN_MEDICION' | 'AL_COSTO';
interface Fila {
  activo: ActivoValorado; mediciones: MedicionPeriodo[]; anterior: Dec | null; actual: Dec | null; total: Dec | null;
  transformacion: Dec | null; precio: Dec | null; estimado: boolean; estado: EstadoMedicion; ultima: string | null;
  motivo: string | null;
}

const TONO_ESTADO = { COMPLETADO: 'success', MEDICION_PENDIENTE: 'warning', SIN_MEDICION: 'neutral', AL_COSTO: 'info' } as const;

/** Un activo en el período: del valor con que lo empezó al último medido, con la suma de las variaciones. */
export function porActivo(activo: ActivoValorado, todas: MedicionPeriodo[], suspendidos: EventoPendiente[] = []): Fila {
  const mediciones = todas.filter((m) => m.id_activo_biologico === activo.id_activo_biologico)
    .sort((a, b) => a.fecha_medicion.localeCompare(b.fecha_medicion));
  const hechas = mediciones.filter((m) => m.estado === 'COMPLETADO');
  // Un evento suspendido no deja medición: si es posterior a la última medida, esa ya no es la vigente.
  const ultimaHecha = hechas.at(-1)?.fecha_medicion;
  const suspendido = suspendidos
    .filter((e) => e.id_activo_biologico === activo.id_activo_biologico
      && (!ultimaHecha || Date.parse(e.fecha_evento) > Date.parse(ultimaHecha)))
    .sort((a, b) => b.fecha_evento.localeCompare(a.fecha_evento))[0];
  const estado: EstadoMedicion = suspendido || mediciones.some((m) => m.estado !== 'COMPLETADO') ? 'MEDICION_PENDIENTE'
    : hechas.length ? 'COMPLETADO' : activo.valorado_por_costo ? 'AL_COSTO' : 'SIN_MEDICION';
  return {
    activo, mediciones, estado, motivo: suspendido?.motivo ?? null, estimado: hechas.some((m) => m.tiene_valor_estimado),
    anterior: hechas[0]?.valor_razonable_anterior ?? null, actual: hechas.at(-1)?.valor_razonable_actual ?? null,
    total: hechas.length ? sumar(hechas.map((m) => m.variacion_total)) : null,
    transformacion: hechas.length ? sumar(hechas.map((m) => m.ganancia_perdida_transformacion)) : null,
    precio: hechas.length ? sumar(hechas.map((m) => m.ganancia_perdida_precio_mercado)) : null,
    ultima: mediciones.at(-1)?.fecha_medicion ?? null,
  };
}

export function MedicionView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_VALORACION, ACCION_R);
  const puedeProcesar = usePermissionPorNombre(R_VALORACION, ACCION_E);
  const { periodo } = usePeriodo();
  const activos = useAsync(finanzasApi.activos);
  const mediciones = useAsync(finanzasApi.mediciones);
  const suspendidos = useAsync(finanzasApi.eventosPendientes);
  const proceso = useAsync(finanzasApi.procesarEventos);
  const [detalle, setDetalle] = useState<ActivoValorado | null>(null);
  const id = periodo?.id_periodo_contable;
  const { ejecutar: cargarActivos } = activos;
  const { ejecutar: cargarMediciones } = mediciones;
  const { ejecutar: cargarSuspendidos } = suspendidos;
  const cargar = () => { cargarActivos(); if (id) { cargarMediciones(id); cargarSuspendidos(id); } };
  useEffect(() => { if (puedeLeer) cargarActivos(); }, [puedeLeer, cargarActivos]);
  useEffect(() => { if (puedeLeer && id) { cargarMediciones(id); cargarSuspendidos(id); } }, [puedeLeer, id, cargarMediciones, cargarSuspendidos]);

  const filas = (activos.data ?? []).map((a) => porActivo(a, mediciones.data ?? [], suspendidos.data ?? []));
  const l = useListado(filas, (f) => `${f.activo.identificador} ${f.activo.especie} ${f.activo.finca}`, [
    { id: 'estado', etiqueta: t('col.estado'), valor: (f) => f.estado, texto: (v) => t(`medicion.estado_${v}`) },
    { id: 'clasificacion', etiqueta: t('col.clasificacion'), valor: (f) => f.activo.clasificacion, texto: (v) => t(`clasificacion.${v}`), femenino: true },
    { id: 'especie', etiqueta: t('col.especie'), valor: (f) => f.activo.especie, texto: (v) => v, femenino: true },
    { id: 'estimado', etiqueta: t('medicion.valor_estimado'), valor: (f) => (f.estado !== 'COMPLETADO' ? null : f.estimado ? 'SI' : 'NO'), texto: (v) => t(v === 'SI' ? 'medicion.con_estimado' : 'medicion.sin_estimado') },
  ]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.medicion')} />;

  const procesar = async () => {
    const r = await proceso.ejecutar();
    if (!r) return;
    pushToast('success', t('valor.procesado', { eventos: r.eventos.PROCESADO ?? 0, provisiones: r.provisiones_m05.PROCESADO ?? 0 }));
    cargar();
  };

  const medidos = filas.filter((f) => f.estado === 'COMPLETADO');
  const neta = sumar(medidos.map((f) => f.total));
  const pendientes = filas.filter((f) => f.estado === 'MEDICION_PENDIENTE' || f.estado === 'SIN_MEDICION');

  return (
    <>
      <EncabezadoVista
        titulo={t('medicion.titulo')}
        descripcion={periodo ? t('medicion.descripcion_periodo', { periodo: nombrePeriodo(periodo) }) : t('medicion.descripcion')}
        acciones={(
          <>
            <Button variant="secondary" size="md" loading={activos.cargando || mediciones.cargando} onClick={cargar}><RefreshCw size={16} aria-hidden />{t('comun.actualizar')}</Button>
            {puedeProcesar && <Button variant="primary" size="md" loading={proceso.cargando} onClick={procesar}><Play size={16} aria-hidden />{t('medicion.calcular_ahora')}</Button>}
          </>
        )}
      />
      <Alert variant="info" title={t('medicion.aviso_titulo')} description={t('medicion.aviso_detalle')} style={{ marginBottom: 'var(--s5)' }} />
      <ErrorApi error={activos.error ?? mediciones.error ?? suspendidos.error ?? proceso.error} />
      {!periodo ? <SinPeriodo /> : (
        <>
          <Indicadores items={[
            { etiqueta: t('medicion.kpi_medidos'), valor: medidos.length, tono: 'success', detalle: t('medicion.kpi_medidos_detalle', { count: filas.length }) },
            { etiqueta: t('medicion.kpi_neta'), valor: <Variacion valor={neta} />, tono: signo(neta) < 0 ? 'error' : 'success',
              detalle: t('medicion.kpi_neta_detalle', { periodo: nombrePeriodo(periodo) }) },
            { etiqueta: t('medicion.kpi_estimado'), valor: filas.filter((f) => f.estimado).length, tono: 'warning', detalle: t('medicion.kpi_estimado_detalle') },
            { etiqueta: t('medicion.kpi_pendientes'), valor: pendientes.length, tono: pendientes.length ? 'error' : 'neutral',
              detalle: pendientes.length ? pendientes.slice(0, 3).map((f) => f.activo.identificador).join(', ') : t('medicion.kpi_sin_pendientes') },
          ]} />
          <Listado l={l} idBase="medicion" sustantivo={t('medicion.sustantivo')} buscar={t('medicion.buscar')} cargando={activos.cargando || mediciones.cargando}
            vacio={{ icono: <RefreshCw size={28} aria-hidden />, titulo: t('valor.vacio_titulo'), detalle: t('valor.vacio_detalle') }}>
            {(visibles) => (
              <table style={TABLA}>
                <thead>
                  <tr>
                    <th style={TH}>{t('col.activo')}</th><th style={TH}>{t('col.clasificacion')}</th><th style={TH_NUM}>{t('col.valor_anterior')}</th>
                    <th style={TH_NUM}>{t('col.valor_actual')}</th><th style={TH_NUM}>{t('col.variacion_total')}</th>
                    <th style={TH}>{t('medicion.valor_estimado')}</th><th style={TH}>{t('col.estado')}</th>
                    <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((f) => (
                    <tr key={f.activo.id_activo_biologico} className={f.estado === 'MEDICION_PENDIENTE' ? 'fin-fila--atencion' : undefined}>
                      <td style={TD}><CeldaActivo identificador={f.activo.identificador} especie={f.activo.especie} finca={f.activo.finca} /></td>
                      <td style={TD}>{f.activo.clasificacion ? t(`clasificacion.${f.activo.clasificacion}`) : t('comun.sin_definir')}</td>
                      <td style={TD_NUM}>{f.anterior ? formatoMoneda(f.anterior) : t('medicion.sin_valor_periodo')}</td>
                      <td style={TD_NUM}>
                        {f.actual ? formatoMoneda(f.actual) : f.activo.valorado_por_costo ? formatoMoneda(f.activo.valor_contable_por_costo) : t('medicion.sin_valor_periodo')}
                        {f.ultima && <span className="fin-secundario">{formatoFecha(f.ultima)}</span>}
                      </td>
                      <td style={TD_NUM}>
                        {f.total ? <Variacion valor={f.total} /> : t('medicion.sin_variacion')}
                        {f.total && (
                          <span className="fin-secundario">
                            {t('medicion.desglose', { transformacion: formatoMoneda(f.transformacion), precio: formatoMoneda(f.precio) })}
                          </span>
                        )}
                      </td>
                      <td style={TD}>{f.estado !== 'COMPLETADO' ? t('sin_mercado.no_aplica')
                        : f.estimado ? <Badge variant="warning">{t('valor.estimado')}</Badge> : t('medicion.con_precio_vigente')}</td>
                      <td style={TD}>
                        <Badge variant={TONO_ESTADO[f.estado]}>{t(`medicion.estado_${f.estado}`)}</Badge>
                        {f.motivo && <span className="fin-secundario">{f.motivo}</span>}
                      </td>
                      <td style={TD}>
                        <Button variant="ghost" size="sm" onClick={() => setDetalle(f.activo)}
                          aria-label={t('valor.ver_detalle_aria', { activo: f.activo.identificador })}>{t('valor.ver_detalle')}</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Listado>
        </>
      )}
      {detalle && (
        <DetalleActivoModal idActivo={detalle.id_activo_biologico} identificador={detalle.identificador}
          onCerrar={() => setDetalle(null)} onCambio={cargar} />
      )}
    </>
  );
}

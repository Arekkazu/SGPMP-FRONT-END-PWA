// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-05 | Arekkazu | M06 RF-86 prototipo: variaciones del período por tipo, fuente y trazabilidad con resumen |
// | 2026-11-10 | Arekkazu | TC-DIS-235 RF-86: el Contador inicia el registro procesando los eventos pendientes; el rechazo se anuncia |
import React, { useEffect, useState } from 'react';
import { BarChart3, Link2, Play } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Badge } from '../../shared/design-system/Badge';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_E, ACCION_R, R_TRAZABILIDAD, R_VALORACION } from '../rbac';
import type { VariacionPeriodo } from '../types';
import { sumar } from '../lib/decimal';
import { CadenaModal } from '../components/CadenaModal';
import {
  CeldaActivo, EncabezadoVista, EstadoBadge, ErrorApi, Indicadores, Listado, SECUNDARIO, SinPeriodo, TABLA, TD, TD_NUM, TH, TH_NUM,
  Variacion, formatoFecha, formatoMoneda, nombrePeriodo, useAsync, useListado, usePeriodo,
} from '../components/comunes';

/** El tipo dice si es ganancia o pérdida; el monto se firma con él. */
const firmado = (v: VariacionPeriodo) => `${v.tipo.startsWith('PERDIDA') ? '-' : ''}${v.monto_variacion.replace('-', '')}`;

export function VariacionesView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_VALORACION, ACCION_R);
  const puedeVerCadena = usePermissionPorNombre(R_TRAZABILIDAD, ACCION_R);
  const { periodo } = usePeriodo();
  const puedeProcesar = usePermissionPorNombre(R_VALORACION, ACCION_E);
  const variaciones = useAsync(finanzasApi.variaciones);
  const proceso = useAsync(finanzasApi.procesarEventos);
  const [cadena, setCadena] = useState<VariacionPeriodo | null>(null);
  const id = periodo?.id_periodo_contable;
  const { ejecutar: cargar } = variaciones;
  useEffect(() => { if (puedeLeer && id) cargar(id); }, [puedeLeer, id, cargar]);

  const l = useListado(variaciones.data, (v) => `${v.identificador} ${v.especie} ${v.finca}`, [
    { id: 'tipo', etiqueta: t('variaciones.tipo'), valor: (v) => v.tipo, texto: (v) => t(`variaciones.tipo_${v}`) },
    { id: 'trazabilidad', etiqueta: t('col.trazabilidad'), valor: (v) => v.estado_trazabilidad, texto: (v) => t(`estado.${v}`), femenino: true },
    { id: 'activo', etiqueta: t('col.activo'), valor: (v) => v.identificador, texto: (v) => v },
    { id: 'fuente', etiqueta: t('col.fuente'), valor: (v) => v.tipo_evidencia, texto: (v) => t(`evidencia.${v}`), femenino: true },
  ]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.variaciones')} />;
  const lista = variaciones.data ?? [];
  const ganancias = lista.filter((v) => v.tipo.startsWith('GANANCIA'));
  const perdidas = lista.filter((v) => v.tipo.startsWith('PERDIDA'));
  const totalGanancias = sumar(ganancias.map(firmado));
  const totalPerdidas = sumar(perdidas.map(firmado));
  const verificadas = lista.filter((v) => v.estado_trazabilidad === 'VERIFICADO').length;
  // RF-86: las variaciones salen de los eventos medidos (con su evento de origen); el Contador inicia el proceso.
  const procesar = async () => {
    const r = await proceso.ejecutar();
    if (!r) return;
    pushToast('success', t('valor.procesado', { eventos: r.eventos.PROCESADO ?? 0, provisiones: r.provisiones_m05.PROCESADO ?? 0 }));
    if (id) cargar(id);
  };

  return (
    <>
      <EncabezadoVista titulo={t('variaciones.titulo')}
        descripcion={periodo ? t('variaciones.descripcion_periodo', { periodo: nombrePeriodo(periodo) }) : t('variaciones.descripcion')}
        acciones={puedeProcesar && periodo?.estado === 'ABIERTO' && (
          <Button variant="primary" size="md" loading={proceso.cargando} onClick={procesar}><Play size={16} aria-hidden />{t('valor.procesar')}</Button>
        )} />
      <p style={{ ...SECUNDARIO, margin: '0 0 var(--s4)' }}>{t('variaciones.registro_automatico')}</p>
      <ErrorApi error={variaciones.error ?? proceso.error} />
      {!periodo ? <SinPeriodo /> : (
        <>
          <Indicadores items={[
            { etiqueta: t('variaciones.kpi_ganancia'), valor: <Variacion valor={totalGanancias} />, tono: 'success', detalle: t('variaciones.kpi_positivas', { count: ganancias.length }) },
            { etiqueta: t('variaciones.kpi_perdida'), valor: <Variacion valor={totalPerdidas} />, tono: 'error', detalle: t('variaciones.kpi_negativas', { count: perdidas.length }) },
            { etiqueta: t('variaciones.kpi_verificadas'), valor: verificadas, tono: 'info', detalle: t('variaciones.kpi_de_total', { count: lista.length }) },
            { etiqueta: t('variaciones.kpi_pendientes'), valor: lista.length - verificadas, tono: lista.length > verificadas ? 'warning' : 'neutral', detalle: t('variaciones.kpi_pendientes_detalle') },
          ]} />
          <Listado l={l} idBase="variaciones" sustantivo={t('variaciones.sustantivo')} buscar={t('medicion.buscar')} cargando={variaciones.cargando}
            vacio={{ icono: <BarChart3 size={28} aria-hidden />, titulo: t('variaciones.vacio_titulo'), detalle: t('variaciones.vacio_detalle') }}>
            {(visibles) => (
              <table style={TABLA}>
                <thead>
                  <tr>
                    <th style={TH}>{t('col.fecha')}</th><th style={TH}>{t('col.activo')}</th><th style={TH}>{t('variaciones.tipo')}</th>
                    <th style={TH_NUM}>{t('col.valor_anterior')}</th><th style={TH_NUM}>{t('col.valor_actual')}</th>
                    <th style={TH_NUM}>{t('variaciones.variacion')}</th><th style={TH}>{t('col.fuente')}</th><th style={TH}>{t('col.trazabilidad')}</th>
                    {puedeVerCadena && <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((v) => (
                    <tr key={v.id_variacion_valor_razonable}>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(v.fecha_registro)}</td>
                      <td style={TD}><CeldaActivo identificador={v.identificador} especie={v.especie} finca={v.clasificacion ? t(`clasificacion.${v.clasificacion}`) : v.finca} /></td>
                      <td style={TD}>
                        <Badge variant={v.tipo.startsWith('GANANCIA') ? 'success' : 'error'}>{t(`variaciones.tipo_${v.tipo}`)}</Badge>
                        {v.tiene_estimacion && <span className="fin-secundario">{t('valor.estimado')}</span>}
                      </td>
                      <td style={TD_NUM}>{formatoMoneda(v.valor_razonable_anterior)}</td>
                      <td style={TD_NUM}>{formatoMoneda(v.valor_razonable_nuevo)}</td>
                      <td style={TD_NUM}><Variacion valor={firmado(v)} /></td>
                      <td style={TD}>{v.tipo_evidencia ? t(`evidencia.${v.tipo_evidencia}`) : t('variaciones.sin_asiento')}</td>
                      <td style={TD}><EstadoBadge estado={v.estado_trazabilidad} /></td>
                      {puedeVerCadena && (
                        <td style={TD}>
                          {v.id_linea && (
                            <Button variant="ghost" size="sm" onClick={() => setCadena(v)} aria-label={t('cierre.ver_cadena_aria', { linea: v.identificador })}>
                              <Link2 size={14} aria-hidden />{t('cierre.ver_cadena')}
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
          {lista.length > 0 && (
            <section className="fin-tarjeta" style={{ marginTop: 'var(--s5)' }} aria-labelledby="variaciones-resumen">
              <h2 id="variaciones-resumen">{t('variaciones.resumen', { periodo: nombrePeriodo(periodo) })}</h2>
              <Indicadores items={[
                { etiqueta: t('variaciones.total_ganancias'), valor: <Variacion valor={totalGanancias} />, tono: 'success', detalle: t('variaciones.kpi_positivas', { count: ganancias.length }) },
                { etiqueta: t('variaciones.total_perdidas'), valor: <Variacion valor={totalPerdidas} />, tono: 'error', detalle: t('variaciones.kpi_negativas', { count: perdidas.length }) },
                { etiqueta: t('variaciones.neta'), valor: <Variacion valor={sumar([totalGanancias, totalPerdidas])} />, tono: 'info' },
              ]} />
              <p style={{ ...SECUNDARIO, margin: 0 }}>{t('variaciones.resumen_ayuda')}</p>
            </section>
          )}
        </>
      )}
      {cadena?.id_linea && (
        <CadenaModal idLinea={cadena.id_linea} titulo={`${t(`variaciones.tipo_${cadena.tipo}`)} · ${cadena.identificador}`} onCerrar={() => setCadena(null)} />
      )}
    </>
  );
}

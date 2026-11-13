// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-93: estado de resultados del período con versiones, aprobación y descarga |
// | 2026-11-05 | Arekkazu | M06 RF-93 prototipo: generación con filtros de especie, finca y activo; versiones en lista |
// | 2026-11-10 | Arekkazu | INC-M06-337/344 RF-86/93: acumulado del período abierto y desglose del mantenimiento |
// | 2026-11-10 | Arekkazu | TC-DIS-260..264 RF-93: gráficas con tabla alternativa, signo y «Ganancia/Pérdida» en texto, filtros completos y descarga anunciada |
// | 2026-11-11 | Arekkazu | USAB-M05-M06 RF-82..94: reporte de usabilidad del 11-11 (período por defecto, titular, formatos y nombres) |
// | 2026-11-12 | Arekkazu | TC-DIS-262/263 RF-93: activo individual y lote poblacional por separado; gráficas vacías con texto y sin «−$ 0» |
import React, { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Download, FilterX, Plus } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_C, ACCION_R, ACCION_U, R_CIERRE, R_ESTADO_RESULTADOS, R_VALORACION } from '../rbac';
import type { ActivoValorado, Dec, EstadoResumen } from '../types';
import { signo } from '../lib/decimal';
import {
  Datos, EncabezadoVista, EstadoBadge, ErrorApi, Listado, PANEL, SECUNDARIO, SinPeriodo, Subtitulo, TABLA, TD, TD_NUM, TH, TH_NUM,
  Variacion, descargarArchivo, formatoFecha, formatoMoneda, nombrePeriodo, useAsync, useListado, usePeriodo,
} from '../components/comunes';

const INGRESOS = [
  'ganancia_reconocimiento_inicial', 'ganancia_transformacion_biologica', 'ganancia_precio_mercado',
  'ingresos_productos_agricolas', 'ganancia_ajustes_periodos_anteriores',
];
const GASTOS = [
  'perdida_reconocimiento_inicial', 'perdida_transformacion_biologica', 'perdida_precio_mercado', 'costos_mantenimiento',
  'inversiones_llevadas_a_gasto', 'bajas_activos', 'depreciacion_activos_costo', 'deterioro_activos_costo',
  'perdida_ajustes_periodos_anteriores',
];
/** Opciones únicas (id → nombre) de los activos, ordenadas por nombre. */
function unicos(activos: ActivoValorado[], id: (a: ActivoValorado) => number, nombre: (a: ActivoValorado) => string) {
  return [...new Map(activos.map((a) => [id(a), nombre(a)])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
}

interface Segmento { etiqueta: string; valor: number; color: string }

/**
 * Gráfica de barras horizontales en SVG con nombre accesible (WCAG 1.1.1); la tabla de al lado es su
 * alternativa textual. Cada barra lleva su etiqueta completa encima y su monto en texto: no se distingue
 * solo por el color. El largo es proporcional al mayor monto; un porcentaje sobre la suma de ingresos,
 * gastos y resultado no significa nada (N-03).
 */
function GraficaBarras({ id, titulo, segmentos, resumen }: { id: string; titulo: string; segmentos: Segmento[]; resumen: string }) {
  const maximo = Math.max(0, ...segmentos.map((x) => Math.abs(x.valor)));
  const alto = segmentos.length * 40 + 8;
  return (
    <figure style={{ margin: 0 }}>
      <figcaption id={`${id}-cap`} style={{ fontWeight: 700, marginBottom: 'var(--s2)' }}>{titulo}</figcaption>
      {segmentos.length === 0 ? <p style={{ ...SECUNDARIO, margin: 0 }}>{resumen}</p> : (
      <svg role="img" aria-labelledby={`${id}-cap ${id}-desc`} width="100%" viewBox={`0 0 400 ${alto}`} style={{ maxWidth: 480, display: 'block' }}>
        <desc id={`${id}-desc`}>{resumen}</desc>
        {segmentos.map((s, i) => {
          const ancho = Math.max(maximo ? (Math.abs(s.valor) / maximo) * 250 : 0, 1);
          const y = i * 40 + 4;
          return (
            <g key={s.etiqueta}>
              <text x="0" y={y + 12} fontSize="11" fill="var(--text-secondary)">{s.etiqueta}</text>
              <rect x="0" y={y + 18} width={ancho} height="14" rx="3" fill={s.color} />
              <text x={ancho + 6} y={y + 29} fontSize="11" fill="var(--text-primary)">{formatoMoneda(s.valor)}</text>
            </g>
          );
        })}
      </svg>
      )}
    </figure>
  );
}

export function EstadoResultadosView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_ESTADO_RESULTADOS, ACCION_R);
  const puedeGenerar = usePermissionPorNombre(R_ESTADO_RESULTADOS, ACCION_C);
  const puedeAprobar = usePermissionPorNombre(R_ESTADO_RESULTADOS, ACCION_U);
  const puedeVerActivos = usePermissionPorNombre(R_VALORACION, ACCION_R);
  const leeCierre = usePermissionPorNombre(R_CIERRE, ACCION_R);
  const { periodo, disponible } = usePeriodo();
  const [idEstado, setIdEstado] = useState<number | null>(null);
  const filtroVacio = { especie: '', finca: '', infraestructura: '', activo: '', lote: '' };
  const [filtro, setFiltro] = useState(filtroVacio);
  const estados = useAsync(finanzasApi.estados);
  const detalle = useAsync(finanzasApi.estado);
  const generacion = useAsync(finanzasApi.generarEstado);
  const aprobacion = useAsync(finanzasApi.aprobarEstado);
  const descarga = useAsync(finanzasApi.descargarEstado);
  const activos = useAsync(finanzasApi.activos);
  const acumulado = useAsync(finanzasApi.acumulado);
  const idPeriodo = periodo?.id_periodo_contable;
  const cerrado = periodo?.estado === 'CERRADO';
  const { ejecutar: cargarEstados, limpiar: limpiarEstados } = estados;
  const { ejecutar: cargarDetalle, limpiar: limpiarDetalle } = detalle;
  const { ejecutar: cargarActivos } = activos;
  const { ejecutar: cargarAcumulado, limpiar: limpiarAcumulado } = acumulado;
  // RF-86: con el período abierto se consulta lo acumulado, sin versión; el estado formal (RF-93) llega al cerrar.
  useEffect(() => {
    limpiarAcumulado();
    // RF-93: quien solo consulta reportes (Productor) ve el estado aprobado, no el acumulado provisional del período abierto.
    if (puedeLeer && leeCierre && idPeriodo && !cerrado) cargarAcumulado(idPeriodo);
  }, [puedeLeer, leeCierre, idPeriodo, cerrado, cargarAcumulado, limpiarAcumulado]);
  useEffect(() => {
    setIdEstado(null); limpiarEstados(); limpiarDetalle();
    if (puedeLeer && idPeriodo) cargarEstados(idPeriodo);
  }, [puedeLeer, idPeriodo, cargarEstados, limpiarEstados, limpiarDetalle]);
  useEffect(() => { if (estados.data?.length && idEstado === null) setIdEstado(estados.data[0].id_estado); }, [estados.data, idEstado]);
  useEffect(() => { if (idEstado) cargarDetalle(idEstado); }, [idEstado, cargarDetalle]);
  useEffect(() => { if (puedeLeer && puedeVerActivos) cargarActivos(); }, [puedeLeer, puedeVerActivos, cargarActivos]);

  const todos = activos.data ?? [];
  const especies = unicos(todos, (a) => a.id_especie, (a) => a.especie);
  const fincas = unicos(todos, (a) => a.id_finca, (a) => a.finca);
  const infraestructuras = unicos(todos.filter((a) => !filtro.finca || a.id_finca === Number(filtro.finca)), (a) => a.id_infraestructura, (a) => a.infraestructura);
  // Filtros encadenados: el activo o el lote solo pueden ser de la especie, la finca y la infraestructura elegidas.
  const cumple = (a: ActivoValorado, f: typeof filtro) => (!f.especie || a.id_especie === Number(f.especie)) && (!f.finca || a.id_finca === Number(f.finca))
    && (!f.infraestructura || a.id_infraestructura === Number(f.infraestructura));
  const candidatos = todos.filter((a) => cumple(a, filtro));
  // TC-DIS-263: el activo individual y el lote poblacional se filtran por separado.
  const individuales = candidatos.filter((a) => a.tipo !== 'POBLACIONAL');
  const lotes = candidatos.filter((a) => a.tipo === 'POBLACIONAL');
  const hayFiltros = Object.values(filtro).some(Boolean);
  const alcance = (e: EstadoResumen) => {
    const f = e.filtros;
    const partes = [
      f.id_especie && (especies.find(([id]) => id === f.id_especie)?.[1] ?? t('er.especie_filtrada')),
      f.id_finca && (fincas.find(([id]) => id === f.id_finca)?.[1] ?? t('er.finca_filtrada')),
      f.id_activo_biologico && (todos.find((a) => a.id_activo_biologico === f.id_activo_biologico)?.identificador ?? t('er.activo_filtrado')),
      f.id_infraestructura && (todos.find((a) => a.id_infraestructura === f.id_infraestructura)?.infraestructura ?? t('er.infraestructura_filtrada')),
    ].filter(Boolean);
    return partes.length ? partes.join(' · ') : t('er.consolidado');
  };
  const l = useListado(estados.data, (e) => `V${e.version} ${alcance(e)}`, [
    { id: 'estado', etiqueta: t('col.estado'), valor: (e) => e.estado, texto: (v) => t(`estado.${v}`) },
    { id: 'alcance', etiqueta: t('er.filtros'), valor: (e) => (Object.values(e.filtros).some(Boolean) ? 'FILTRADO' : 'CONSOLIDADO'), texto: (v) => t(v === 'FILTRADO' ? 'er.filtrado' : 'er.consolidado') },
  ]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.estado-resultados')} />;
  const e = detalle.data;
  const a = acumulado.data;
  const cambiar = (k: keyof typeof filtro) => (ev: React.ChangeEvent<HTMLSelectElement>) => {
    const siguiente = { ...filtro, [k]: ev.target.value };
    if (k === 'finca') siguiente.infraestructura = '';
    if (k === 'activo' && siguiente.activo) siguiente.lote = '';  // el estado se genera por uno solo
    if (k === 'lote' && siguiente.lote) siguiente.activo = '';
    for (const c of ['activo', 'lote'] as const) {
      if (k !== c && siguiente[c] && !todos.some((x) => x.id_activo_biologico === Number(siguiente[c]) && cumple(x, siguiente))) siguiente[c] = '';
    }
    setFiltro(siguiente);
  };

  const generar = async () => {
    if (!idPeriodo) return;
    const activoElegido = Number(filtro.activo || filtro.lote) || null;
    const r = await generacion.ejecutar(idPeriodo, {
      ...(filtro.especie ? { id_especie: Number(filtro.especie) } : {}), ...(filtro.finca ? { id_finca: Number(filtro.finca) } : {}),
      ...(activoElegido ? { id_activo_biologico: activoElegido } : {}),
    });
    if (r) { pushToast('success', t('er.generado')); setIdEstado(r.id_estado); cargarEstados(idPeriodo); }
  };
  const aprobar = async () => {
    if (e && await aprobacion.ejecutar(e.id_estado)) { pushToast('success', t('er.aprobado')); cargarDetalle(e.id_estado); if (idPeriodo) cargarEstados(idPeriodo); }
  };
  const descargar = async (formato: 'pdf' | 'excel') => {
    const archivo = e && await descarga.ejecutar(e.id_estado, formato);
    if (archivo) descargarArchivo(archivo);
  };

  // Gasto en negativo y con su etiqueta; una categoría en cero dice que no hubo actividad (WCAG 1.4.1 / 1.3.1).
  const monto = (valor: Dec | undefined, gasto: boolean) => {
    const n = Number(valor ?? '0');
    if (!n) return <span style={SECUNDARIO}>{t('er.sin_actividad')}</span>;
    return gasto ? <span className="fin-neg">−{formatoMoneda(valor)} <span className="ds-sr-only">({t('er.gasto_etiqueta')})</span></span> : <>{formatoMoneda(valor)}</>;
  };
  const tablaComponentes = (componentes: Record<string, unknown>, claves: string[], titulo: string, total: string, gasto: boolean) => (
    <table style={TABLA}>
      <thead><tr><th style={TH}>{titulo}</th><th style={TH_NUM}>{t('col.valor')}</th></tr></thead>
      <tbody>
        {claves.map((k) => (
          <React.Fragment key={k}>
            <tr><th scope="row" style={{ ...TD, textAlign: 'left', fontWeight: 500 }}>{t(`er.c.${k}`)}</th><td style={TD_NUM}>{monto(componentes[k] as Dec | undefined, gasto)}</td></tr>
            {k === 'costos_mantenimiento' && Object.entries((componentes.desglose_costos_mantenimiento ?? {}) as Record<string, Dec>).map(([tipo, v]) => (
              <tr key={tipo}><th scope="row" style={{ ...TD, paddingLeft: 'var(--s6)', textAlign: 'left', fontWeight: 400 }} className="fin-secundario">{t(`subtipo.${tipo}`)}</th>
                <td style={TD_NUM} className="fin-secundario">{monto(v, gasto)}</td></tr>
            ))}
          </React.Fragment>
        ))}
        <tr><th scope="row" style={{ ...TD, textAlign: 'left', fontWeight: 700 }}>{t('er.total')}</th><td style={{ ...TD_NUM, fontWeight: 700 }}>{gasto && Number(total) ? <span className="fin-neg">−{formatoMoneda(total)}</span> : formatoMoneda(total)}</td></tr>
      </tbody>
    </table>
  );
  const COLORES = ['var(--brand-500)', 'var(--sem-info)', 'var(--sem-warning)', 'var(--neutral-450)', 'var(--brand-700)', 'var(--sem-error)', 'var(--neutral-550)', 'var(--brand-300)', 'var(--sem-success)'];
  const segmentos = (componentes: Record<string, unknown>, claves: string[]): Segmento[] => claves
    .map((k, i) => ({ etiqueta: t(`er.c.${k}`), valor: Number((componentes[k] as Dec | undefined) ?? '0'), color: COLORES[i % COLORES.length] }))
    .filter((s) => s.valor !== 0);
  const resumenDe = (s: Segmento[]) => s.map((x) => `${x.etiqueta}: ${formatoMoneda(x.valor)}`).join('; ') || t('er.sin_actividad');
  const graficas = (componentes: Record<string, unknown>, ingresos: string, gastos: string, neto: string, prefijo: string) => {
    const si = segmentos(componentes, INGRESOS);
    const sg = segmentos(componentes, GASTOS);
    const sr: Segmento[] = [
      { etiqueta: t('er.ingresos'), valor: Number(ingresos), color: 'var(--sem-success)' },
      { etiqueta: t('er.gastos'), valor: -Number(gastos) || 0, color: 'var(--sem-error)' },  // sin gastos, «$ 0» y no «−$ 0»
      { etiqueta: `${t('er.resultado')} (${t(signo(neto) < 0 ? 'comun.perdida' : 'comun.ganancia')})`, valor: Number(neto), color: signo(neto) < 0 ? 'var(--sem-error)' : 'var(--brand-500)' },
    ];
    return (
      <section aria-labelledby={`${prefijo}-graficas`} style={{ ...PANEL, marginTop: 'var(--s5)' }}>
        <Subtitulo id={`${prefijo}-graficas`}>{t('er.graficas')}</Subtitulo>
        <p style={{ ...SECUNDARIO, marginTop: 0 }}>{t('er.graficas_ayuda')}</p>
        <div className="fin-columnas" style={{ marginBottom: 0 }}>
          <GraficaBarras id={`${prefijo}-g-ingresos`} titulo={t('er.grafica_ingresos')} segmentos={si} resumen={resumenDe(si)} />
          <GraficaBarras id={`${prefijo}-g-gastos`} titulo={t('er.grafica_gastos')} segmentos={sg} resumen={resumenDe(sg)} />
          <GraficaBarras id={`${prefijo}-g-resultado`} titulo={t('er.grafica_resultado')} segmentos={sr} resumen={resumenDe(sr)} />
        </div>
      </section>
    );
  };
  const excluidos = (e?.componentes.activos_excluidos_cierre as Array<{ id_activo_biologico: number; identificador?: string; motivo?: string }> | undefined) ?? [];
  const sinEstados = !!periodo && !estados.cargando && (estados.data ?? []).length === 0;

  return (
    <>
      <EncabezadoVista titulo={t('er.titulo')} descripcion={periodo ? t('er.descripcion_periodo', { periodo: nombrePeriodo(periodo) }) : t('er.descripcion')} />
      {puedeGenerar
        ? <Alert variant="info" title={cerrado ? t('er.desglose_titulo') : t('er.solo_cerrados')} description={cerrado ? t('er.desglose_detalle') : t('er.solo_cerrados_detalle')} style={{ marginBottom: 'var(--s5)' }} id="er-solo-cerrados" />
        : disponible && <Alert variant="info" title={t('er.consulta_titulo')} description={t('er.consulta_detalle')} style={{ marginBottom: 'var(--s5)' }} />}
      <ErrorApi error={estados.error ?? detalle.error ?? generacion.error ?? aprobacion.error ?? descarga.error ?? acumulado.error} />
      {a && (
        <section aria-labelledby="er-acumulado" style={{ marginBottom: 'var(--s5)' }}>
          <Subtitulo id="er-acumulado">{t('er.acumulado_titulo')}</Subtitulo>
          <p style={{ ...SECUNDARIO, marginTop: 0 }}>{t('er.acumulado_detalle')}</p>
          <section style={PANEL} aria-label={t('er.resumen')}>
            <Datos filas={[[t('er.ingresos'), formatoMoneda(a.total_ingresos)], [t('er.gastos'), Number(a.total_gastos) ? <span key="g" className="fin-neg">−{formatoMoneda(a.total_gastos)}</span> : formatoMoneda(a.total_gastos)],
              [t('er.resultado'), <Variacion key="r" valor={a.resultado_neto} etiqueta />]]} />
          </section>
          <div className="fin-columnas" style={{ marginTop: 'var(--s5)' }}>
            <ScrollRegion label={t('er.ingresos')}>
              {tablaComponentes({ ...a.componentes, desglose_costos_mantenimiento: a.desglose_costos_mantenimiento }, INGRESOS, t('er.ingresos'), a.total_ingresos, false)}
            </ScrollRegion>
            <ScrollRegion label={t('er.gastos')}>
              {tablaComponentes({ ...a.componentes, desglose_costos_mantenimiento: a.desglose_costos_mantenimiento }, GASTOS, t('er.gastos'), a.total_gastos, true)}
            </ScrollRegion>
          </div>
          {graficas(a.componentes, a.total_ingresos, a.total_gastos, a.resultado_neto, 'acum')}
        </section>
      )}
      {!periodo ? <SinPeriodo /> : (
        <>
          {puedeGenerar && (
            <section className="fin-tarjeta" aria-labelledby="er-generar" style={{ marginBottom: 'var(--s5)' }}>
              <h2 id="er-generar">{t('er.generar_titulo')}</h2>
              <Datos filas={[[t('comun.periodo'), nombrePeriodo(periodo)], [t('col.tipo_cierre'), t(`tipo_cierre.${periodo.tipo_cierre}`)],
                [t('col.estado'), <EstadoBadge key="e" estado={periodo.estado} />]]} />
              {puedeVerActivos && (
                <>
                  <p className="fin-kpi__etiqueta" style={{ margin: 'var(--s5) 0 var(--s3)' }}>{t('er.filtros_opcionales')}</p>
                  <div className="ds-fg3">
                    <Select id="er-especie" label={t('col.especie')} value={filtro.especie} onChange={cambiar('especie')} disabled={especies.length === 0}>
                      <option value="">{t('comun.todas')}</option>
                      {especies.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                    </Select>
                    <Select id="er-finca" label={t('col.finca')} value={filtro.finca} onChange={cambiar('finca')} disabled={fincas.length === 0}>
                      <option value="">{t('comun.todas')}</option>
                      {fincas.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                    </Select>
                    <Select id="er-infraestructura" label={t('er.filtro_infraestructura')} value={filtro.infraestructura} onChange={cambiar('infraestructura')} disabled={infraestructuras.length === 0}>
                      <option value="">{t('comun.todas')}</option>
                      {infraestructuras.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                    </Select>
                    <Select id="er-activo" label={t('er.activo_individual')} value={filtro.activo} onChange={cambiar('activo')} disabled={individuales.length === 0}>
                      <option value="">{t('comun.todos')}</option>
                      {individuales.map((x) => <option key={x.id_activo_biologico} value={x.id_activo_biologico}>{x.identificador} · {x.especie}</option>)}
                    </Select>
                    <Select id="er-lote" label={t('er.lote_poblacional')} value={filtro.lote} onChange={cambiar('lote')} disabled={lotes.length === 0}>
                      <option value="">{t('comun.todos')}</option>
                      {lotes.map((x) => <option key={x.id_activo_biologico} value={x.id_activo_biologico}>{x.identificador} · {x.especie}</option>)}
                    </Select>
                    {hayFiltros && (
                      <div className="fin-filtros__limpiar">
                        <Button variant="ghost" size="md" onClick={() => setFiltro(filtroVacio)}><FilterX size={16} aria-hidden />{t('comun.limpiar_filtros')}</Button>
                      </div>
                    )}
                  </div>
                  {filtro.infraestructura && <p style={{ ...SECUNDARIO, margin: 'var(--s2) 0 0' }}>{t('er.filtros_acotan')}</p>}
                </>
              )}
              <div className="fin-acciones" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--s4)' }}>
                <span style={SECUNDARIO} id="er-generar-ayuda">{cerrado ? t('er.filtros_ayuda') : t('er.generar_motivo')}</span>
                <Button variant="primary" size="md" loading={generacion.cargando} disabled={!cerrado} onClick={generar} aria-describedby={cerrado ? undefined : 'er-generar-ayuda er-solo-cerrados'}>
                  <Plus size={16} aria-hidden />{t('er.generar')}
                </Button>
              </div>
              {generacion.cargando && <p role="status" style={{ ...SECUNDARIO, margin: 'var(--s2) 0 0' }}>{t('er.generando')}</p>}
            </section>
          )}
          {sinEstados && !puedeGenerar && <p role="status" style={{ ...SECUNDARIO, marginBottom: 'var(--s4)' }}>
            {cerrado ? t('er.sin_estado_productor') : t('er.periodo_abierto_productor')}</p>}
          <Listado l={l} idBase="er" titulo={t('er.versiones')} sustantivo={t('er.sustantivo')} buscar={t('er.buscar')} cargando={estados.cargando}
            vacio={{ icono: <BarChart3 size={28} aria-hidden />, titulo: t('er.vacio_titulo'), detalle: puedeGenerar ? t('er.vacio_detalle') : t('er.vacio_detalle_consulta') }}>
            {(visibles) => (
              <table style={TABLA}>
                <thead>
                  <tr><th style={TH}>{t('er.version')}</th><th style={TH}>{t('er.filtros')}</th><th style={TH_NUM}>{t('er.ingresos')}</th>
                    <th style={TH_NUM}>{t('er.gastos')}</th><th style={TH_NUM}>{t('er.resultado')}</th><th style={TH}>{t('col.estado')}</th>
                    <th style={TH}>{t('er.generado_el')}</th><th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th></tr>
                </thead>
                <tbody>
                  {visibles.map((x) => (
                    <tr key={x.id_estado} aria-current={x.id_estado === idEstado ? 'true' : undefined}>
                      <td style={TD}><strong>{t('er.version_n', { n: x.version })}</strong></td>
                      <td style={TD}>{alcance(x)}</td>
                      <td style={TD_NUM}>{formatoMoneda(x.total_ingresos)}</td>
                      <td style={TD_NUM}>{Number(x.total_gastos) ? <span className="fin-neg">−{formatoMoneda(x.total_gastos)}</span> : formatoMoneda(x.total_gastos)}</td>
                      <td style={TD_NUM}><Variacion valor={x.resultado_neto} etiqueta /></td>
                      <td style={TD}><EstadoBadge estado={x.estado} /></td>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(x.fecha_generacion, true)}</td>
                      <td style={TD}>
                        <Button variant={x.id_estado === idEstado ? 'secondary' : 'ghost'} size="sm" onClick={() => setIdEstado(x.id_estado)} aria-label={t('er.ver_aria', { n: x.version })}>{t('er.ver')}</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Listado>
        </>
      )}
      {e && (
        <>
          <section style={{ ...PANEL, marginTop: 'var(--s5)' }} aria-label={t('er.resumen')}>
            <Datos filas={[
              [t('er.ingresos'), formatoMoneda(e.total_ingresos)],
              [t('er.gastos'), Number(e.total_gastos) ? <span key="g" className="fin-neg">−{formatoMoneda(e.total_gastos)}</span> : formatoMoneda(e.total_gastos)],
              [t('er.resultado'), <Variacion key="r" valor={e.resultado_neto} etiqueta />],
              [t('col.estado'), <EstadoBadge key="s" estado={e.estado} />],
              [t('er.generado_el'), formatoFecha(e.fecha_generacion, true)],
              ...(e.fecha_aprobacion ? [[t('er.aprobado_por'), `${e.nombre_aprobador ?? t('er.aprobador_sin_nombre')} · ${formatoFecha(e.fecha_aprobacion, true)}`] as [string, React.ReactNode]] : []),
              [t('er.filtros'), alcance(e)],
            ]} />
            <div className="fin-acciones" style={{ marginTop: 'var(--s4)' }}>
              {e.estado === 'GENERADO' && puedeAprobar && (
                <Button variant="primary" size="sm" loading={aprobacion.cargando} onClick={aprobar}><CheckCircle2 size={14} aria-hidden />{t('er.aprobar')}</Button>
              )}
              {e.estado === 'APROBADO' && (
                <>
                  <Button variant="secondary" size="sm" loading={descarga.cargando} onClick={() => descargar('pdf')}><Download size={14} aria-hidden />PDF</Button>
                  <Button variant="secondary" size="sm" loading={descarga.cargando} onClick={() => descargar('excel')}><Download size={14} aria-hidden />Excel</Button>
                </>
              )}
            </div>
            {e.estado !== 'APROBADO' && <p style={{ ...SECUNDARIO, margin: 'var(--s3) 0 0' }}>{t('er.descarga_aprobado')}</p>}
          </section>
          <div className="fin-columnas" style={{ marginTop: 'var(--s5)' }}>
            <ScrollRegion label={t('er.ingresos')}>{tablaComponentes(e.componentes, INGRESOS, t('er.ingresos'), e.total_ingresos, false)}</ScrollRegion>
            <ScrollRegion label={t('er.gastos')}>{tablaComponentes(e.componentes, GASTOS, t('er.gastos'), e.total_gastos, true)}</ScrollRegion>
          </div>
          {graficas(e.componentes, e.total_ingresos, e.total_gastos, e.resultado_neto, 'est')}
          {excluidos.length > 0 && (
            <section aria-labelledby="er-excluidos" style={{ marginTop: 'var(--s5)' }}>
              <Subtitulo id="er-excluidos">{t('er.excluidos')}</Subtitulo>
              <Alert variant="warning" title={t('er.excluidos_detalle', { count: excluidos.length })} />
              <ul style={{ margin: 'var(--s3) 0 0', paddingLeft: 'var(--s5)', lineHeight: 'var(--lh-relaxed)' }}>
                {excluidos.map((x) => <li key={x.id_activo_biologico}>{x.identificador ?? t('er.activo_filtrado')}{x.motivo ? ` · ${x.motivo}` : ''}</li>)}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}

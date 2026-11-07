// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-93: estado de resultados del período con versiones, aprobación y descarga |
// | 2026-11-05 | Arekkazu | M06 RF-93 prototipo: generación con filtros de especie, finca y activo; versiones en lista |
import React, { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Download, Plus } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_C, ACCION_R, ACCION_U, R_ESTADO_RESULTADOS, R_VALORACION } from '../rbac';
import type { ActivoValorado, EstadoResumen } from '../types';
import {
  Datos, EncabezadoVista, EstadoBadge, ErrorApi, Listado, PANEL, SECUNDARIO, SinPeriodo, Subtitulo, TABLA, TD, TD_NUM, TH, TH_NUM,
  Variacion, formatoFecha, formatoMoneda, guardarArchivo, nombrePeriodo, useAsync, useListado, usePeriodo,
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

export function EstadoResultadosView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_ESTADO_RESULTADOS, ACCION_R);
  const puedeGenerar = usePermissionPorNombre(R_ESTADO_RESULTADOS, ACCION_C);
  const puedeAprobar = usePermissionPorNombre(R_ESTADO_RESULTADOS, ACCION_U);
  const puedeVerActivos = usePermissionPorNombre(R_VALORACION, ACCION_R);
  const { periodo } = usePeriodo();
  const [idEstado, setIdEstado] = useState<number | null>(null);
  const [filtro, setFiltro] = useState({ especie: '', finca: '', activo: '' });
  const estados = useAsync(finanzasApi.estados);
  const detalle = useAsync(finanzasApi.estado);
  const generacion = useAsync(finanzasApi.generarEstado);
  const aprobacion = useAsync(finanzasApi.aprobarEstado);
  const descarga = useAsync(finanzasApi.descargarEstado);
  const activos = useAsync(finanzasApi.activos);
  const idPeriodo = periodo?.id_periodo_contable;
  const cerrado = periodo?.estado === 'CERRADO';
  const { ejecutar: cargarEstados, limpiar: limpiarEstados } = estados;
  const { ejecutar: cargarDetalle, limpiar: limpiarDetalle } = detalle;
  const { ejecutar: cargarActivos } = activos;
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
  // Filtros encadenados: el activo solo puede ser de la especie y la finca elegidas.
  const candidatos = todos.filter((a) => (!filtro.especie || a.id_especie === Number(filtro.especie)) && (!filtro.finca || a.id_finca === Number(filtro.finca)));
  const alcance = (e: EstadoResumen) => {
    const f = e.filtros;
    const partes = [
      f.id_especie && (especies.find(([id]) => id === f.id_especie)?.[1] ?? t('er.especie_filtrada')),
      f.id_finca && (fincas.find(([id]) => id === f.id_finca)?.[1] ?? t('er.finca_filtrada')),
      f.id_activo_biologico && (todos.find((a) => a.id_activo_biologico === f.id_activo_biologico)?.identificador ?? t('er.activo_filtrado')),
      f.id_infraestructura && t('er.infraestructura_filtrada'),
    ].filter(Boolean);
    return partes.length ? partes.join(' · ') : t('er.consolidado');
  };
  const l = useListado(estados.data, (e) => `V${e.version} ${alcance(e)}`, [
    { id: 'estado', etiqueta: t('col.estado'), valor: (e) => e.estado, texto: (v) => t(`estado.${v}`) },
    { id: 'alcance', etiqueta: t('er.filtros'), valor: (e) => (Object.values(e.filtros).some(Boolean) ? 'FILTRADO' : 'CONSOLIDADO'), texto: (v) => t(v === 'FILTRADO' ? 'er.filtrado' : 'er.consolidado') },
  ]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.estado-resultados')} />;
  const e = detalle.data;
  const monto = (k: string) => (e?.componentes[k] as string | undefined) ?? '0';
  const cambiar = (k: keyof typeof filtro) => (ev: React.ChangeEvent<HTMLSelectElement>) => {
    const siguiente = { ...filtro, [k]: ev.target.value };
    // Al cambiar especie o finca, el activo elegido deja de valer si ya no está entre los candidatos.
    if (k !== 'activo' && siguiente.activo && !todos.some((a) => a.id_activo_biologico === Number(siguiente.activo)
      && (!siguiente.especie || a.id_especie === Number(siguiente.especie)) && (!siguiente.finca || a.id_finca === Number(siguiente.finca)))) {
      siguiente.activo = '';
    }
    setFiltro(siguiente);
  };

  const generar = async () => {
    if (!idPeriodo) return;
    const r = await generacion.ejecutar(idPeriodo, {
      ...(filtro.especie ? { id_especie: Number(filtro.especie) } : {}), ...(filtro.finca ? { id_finca: Number(filtro.finca) } : {}),
      ...(filtro.activo ? { id_activo_biologico: Number(filtro.activo) } : {}),
    });
    if (r) { pushToast('success', t('er.generado')); setIdEstado(r.id_estado); cargarEstados(idPeriodo); }
  };
  const aprobar = async () => {
    if (e && await aprobacion.ejecutar(e.id_estado)) { pushToast('success', t('er.aprobado')); cargarDetalle(e.id_estado); if (idPeriodo) cargarEstados(idPeriodo); }
  };
  const descargar = async (formato: 'pdf' | 'excel') => {
    const a = e && await descarga.ejecutar(e.id_estado, formato);
    if (a) guardarArchivo(a.blob, a.nombre);
  };

  const tablaComponentes = (claves: string[], titulo: string, total: string) => (
    <table style={TABLA}>
      <thead><tr><th style={TH}>{titulo}</th><th style={TH_NUM}>{t('col.valor')}</th></tr></thead>
      <tbody>
        {claves.map((k) => <tr key={k}><td style={TD}>{t(`er.c.${k}`)}</td><td style={TD_NUM}>{formatoMoneda(monto(k))}</td></tr>)}
        <tr><td style={{ ...TD, fontWeight: 700 }}>{t('er.total')}</td><td style={{ ...TD_NUM, fontWeight: 700 }}>{formatoMoneda(total)}</td></tr>
      </tbody>
    </table>
  );

  return (
    <>
      <EncabezadoVista titulo={t('er.titulo')} descripcion={periodo ? t('er.descripcion_periodo', { periodo: nombrePeriodo(periodo) }) : t('er.descripcion')} />
      <Alert variant="info" title={cerrado ? t('er.desglose_titulo') : t('er.solo_cerrados')} description={cerrado ? t('er.desglose_detalle') : t('er.solo_cerrados_detalle')}
        style={{ marginBottom: 'var(--s5)' }} />
      <ErrorApi error={estados.error ?? detalle.error ?? generacion.error ?? aprobacion.error ?? descarga.error} />
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
                    <Select id="er-activo" label={t('er.activo_lote')} value={filtro.activo} onChange={cambiar('activo')} disabled={candidatos.length === 0}>
                      <option value="">{t('comun.todos')}</option>
                      {candidatos.map((a) => <option key={a.id_activo_biologico} value={a.id_activo_biologico}>{a.identificador} · {a.especie}</option>)}
                    </Select>
                  </div>
                </>
              )}
              <div className="fin-acciones" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--s4)' }}>
                <span style={SECUNDARIO}>{t('er.filtros_ayuda')}</span>
                <Button variant="primary" size="md" loading={generacion.cargando} disabled={!cerrado} onClick={generar}><Plus size={16} aria-hidden />{t('er.generar')}</Button>
              </div>
            </section>
          )}
          <Listado l={l} idBase="er" titulo={t('er.versiones')} sustantivo={t('er.sustantivo')} buscar={t('er.buscar')} cargando={estados.cargando}
            vacio={{ icono: <BarChart3 size={28} aria-hidden />, titulo: t('er.vacio_titulo'), detalle: t('er.vacio_detalle') }}>
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
                      <td style={TD_NUM}>{formatoMoneda(x.total_gastos)}</td>
                      <td style={TD_NUM}><Variacion valor={x.resultado_neto} /></td>
                      <td style={TD}><EstadoBadge estado={x.estado} /></td>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(x.fecha_generacion, true)}</td>
                      <td style={TD}>
                        <Button variant={x.id_estado === idEstado ? 'secondary' : 'ghost'} size="sm" onClick={() => setIdEstado(x.id_estado)}>{t('er.ver')}</Button>
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
              [t('er.ingresos'), formatoMoneda(e.total_ingresos)], [t('er.gastos'), formatoMoneda(e.total_gastos)],
              [t('er.resultado'), <Variacion key="r" valor={e.resultado_neto} />],
              [t('col.estado'), <EstadoBadge key="s" estado={e.estado} />],
              [t('er.generado_el'), formatoFecha(e.fecha_generacion, true)],
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
            <ScrollRegion label={t('er.ingresos')}>{tablaComponentes(INGRESOS, t('er.ingresos'), e.total_ingresos)}</ScrollRegion>
            <ScrollRegion label={t('er.gastos')}>{tablaComponentes(GASTOS, t('er.gastos'), e.total_gastos)}</ScrollRegion>
          </div>
          {Array.isArray(e.componentes.activos_excluidos_cierre) && e.componentes.activos_excluidos_cierre.length > 0 && (
            <>
              <Subtitulo>{t('er.excluidos')}</Subtitulo>
              <Alert variant="warning" title={t('er.excluidos_detalle', { count: e.componentes.activos_excluidos_cierre.length })} />
            </>
          )}
        </>
      )}
    </>
  );
}

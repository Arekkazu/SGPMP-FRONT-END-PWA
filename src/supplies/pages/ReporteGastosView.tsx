// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-77: generar reportes de gastos (síncrono o en cola), exportarlos y consultar el historial |
// | 2026-11-10 | Arekkazu | CP119/H-M05-03 RF-77: alcance agregado por especie o infraestructura cuando no se elige un activo |
// | 2026-11-11 | Arekkazu | USAB-M05-M06 RF-74..81: reporte de usabilidad del 11-11 (nombres en lugar de ids, textos y formatos) |
import React, { useEffect, useState } from 'react';
import { FileBarChart2, RefreshCw, Eye } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { pushToast } from '../../shared/hooks/useToast';
import { diasAtrasLocal, hoyLocal } from '../../shared/lib/fecha';
import { useT } from '../../shared/i18n/useT';
import { ACCION_E, ACCION_R, RECURSO_GASTOS } from '../rbac';
import { useReporteGastos } from '../hooks/useReporteGastos';
import { useAsync } from '../hooks/useAsync';
import { catalogosApi } from '../api/catalogosApi';
import { useSondeoTrabajo } from '../hooks/useSondeoTrabajo';
import { useActivosSuministros } from '../hooks/useActivosSuministros';
import { guardarArchivo } from '../lib/descarga';
import { formatoFecha, formatoMoneda } from '../lib/formato';
import type { CategoriaGasto, GranularidadDesglose, ReporteGasto } from '../types';
import { EncabezadoVista } from '../components/EncabezadoVista';
import { SelectorActivo } from '../components/SelectorActivo';
import { ReporteGastoDetalle } from '../components/ReporteGastoDetalle';
import { EstadoRegistroBadge } from '../components/EstadoRegistroBadge';
import { FILTROS, SECUNDARIO, TABLA, TD, TD_NUM, TH, TH_NUM } from '../components/estilos';

const CATEGORIAS: CategoriaGasto[] = ['ALIMENTACION', 'MEDICACION'];
const GRANULARIDADES: GranularidadDesglose[] = ['CICLO_COMPLETO', 'MENSUAL', 'SEMANAL'];

export function ReporteGastosView() {
  const { t } = useT('supplies');
  const puedeLeer = usePermission(RECURSO_GASTOS, ACCION_R);
  const puedeGenerar = usePermission(RECURSO_GASTOS, ACCION_E);
  const online = useOnlineStatus();
  const { activos, cargando: cargandoActivos } = useActivosSuministros();
  const { generacion, historial, detalle, regeneracion, exportacion, descarga, consultarTrabajo } = useReporteGastos();
  const [desde, setDesde] = useState(diasAtrasLocal(30));
  const [hasta, setHasta] = useState(hoyLocal());
  const [granularidad, setGranularidad] = useState<GranularidadDesglose>('CICLO_COMPLETO');
  const [categorias, setCategorias] = useState<CategoriaGasto[]>(CATEGORIAS);
  const [texto, setTexto] = useState('');
  const [idActivo, setIdActivo] = useState<number | null>(null);
  const [visible, setVisible] = useState<ReporteGasto | null>(null);
  const [idCola, setIdCola] = useState<number | null>(null);
  const sondeo = useSondeoTrabajo(idCola, consultarTrabajo);
  // Alcance agregado (RF-77): sin activo, el reporte se acota por especie o por infraestructura de una finca.
  const [idEspecie, setIdEspecie] = useState('');
  const [idFinca, setIdFinca] = useState('');
  const [idInfraestructura, setIdInfraestructura] = useState('');
  const especies = useAsync(catalogosApi.especies);
  const fincas = useAsync(catalogosApi.fincas);
  const infraestructuras = useAsync(catalogosApi.infraestructuras);
  const { ejecutar: cargarEspecies } = especies;
  const { ejecutar: cargarFincas } = fincas;
  const { ejecutar: cargarInfraestructuras, limpiar: limpiarInfraestructuras } = infraestructuras;
  useEffect(() => { if (puedeGenerar) { cargarEspecies(); cargarFincas(); } }, [puedeGenerar, cargarEspecies, cargarFincas]);
  useEffect(() => {
    setIdInfraestructura('');
    if (idFinca) cargarInfraestructuras(Number(idFinca)); else limpiarInfraestructuras();
  }, [idFinca, cargarInfraestructuras, limpiarInfraestructuras]);

  const { ejecutar: cargarHistorial } = historial;
  useEffect(() => { if (puedeLeer) cargarHistorial(); }, [puedeLeer, cargarHistorial]);
  useEffect(() => {
    if (!sondeo.terminado || !sondeo.estado) return;
    if (sondeo.estado.reporte) setVisible(sondeo.estado.reporte);
    setIdCola(null);
    cargarHistorial();
  }, [sondeo.terminado, sondeo.estado, cargarHistorial]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.gastos')} />;

  const rangoInvalido = desde > hasta;
  const generar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rangoInvalido || categorias.length === 0) return;
    const r = await generacion.ejecutar({
      fecha_inicio_reporte: desde,
      fecha_fin_reporte: hasta,
      tipo_periodo: granularidad,
      activo_biologico_id: idActivo,
      id_especie: idActivo === null && idEspecie ? Number(idEspecie) : null,
      id_infraestructura: idActivo === null && idInfraestructura ? Number(idInfraestructura) : null,
      categorias_incluidas: categorias.length === CATEGORIAS.length ? null : categorias,
    });
    if (!r) return;
    if (r.tipo === 'reporte') { setVisible(r.reporte); cargarHistorial(); }
    else { setVisible(null); setIdCola(r.trabajo.id_cola); pushToast('info', t('gastos.en_cola'), r.trabajo.mensaje); }
  };

  const exportar = async (formato: 'PDF' | 'CSV') => {
    if (!visible?.id_reporte_gasto_acumulado) return;
    const archivo = await exportacion.ejecutar(visible.id_reporte_gasto_acumulado, formato);
    if (!archivo) return;
    const blob = await descarga.ejecutar(archivo.id_archivo);
    if (blob) guardarArchivo(blob, archivo.nombre_archivo);
  };

  const abrir = async (id: number, regenerar = false) => {
    const r = regenerar ? await regeneracion.ejecutar(id) : await detalle.ejecutar(id);
    if (r) setVisible(r);
  };

  const errorPrincipal = generacion.error ?? exportacion.error ?? descarga.error ?? detalle.error ?? regeneracion.error;
  const items = historial.data?.items ?? [];

  return (
    <>
      <EncabezadoVista titulo={t('gastos.titulo')} descripcion={t('gastos.descripcion')} />
      {puedeGenerar && (
        <form onSubmit={generar} style={{ ...FILTROS, marginBottom: 'var(--s5)' }}>
          <Input id="gastos-desde" label={t('comun.desde')} type="date" required max={hoyLocal()} value={desde} onChange={(e) => setDesde(e.target.value)} />
          <Input id="gastos-hasta" label={t('comun.hasta')} type="date" required max={hoyLocal()} value={hasta} onChange={(e) => setHasta(e.target.value)}
            error={rangoInvalido ? t('comun.rango_invalido') : undefined} />
          <Select id="gastos-granularidad" label={t('gastos.desglose')} value={granularidad} onChange={(e) => setGranularidad(e.target.value as GranularidadDesglose)}>
            {GRANULARIDADES.map((g) => <option key={g} value={g}>{t(`granularidad.${g}`)}</option>)}
          </Select>
          <SelectorActivo id="gastos-activo" label={t('gastos.activo_opcional')} activos={activos} cargando={cargandoActivos} value={texto} onChange={(x, id) => { setTexto(x); setIdActivo(id); }} />
          {idActivo === null && (
            <>
              <Select id="gastos-especie" label={t('gastos.especie_opcional')} value={idEspecie} onChange={(e) => setIdEspecie(e.target.value)} hint={t('gastos.alcance_hint')}>
                <option value="">{t('comun.todas')}</option>
                {(especies.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
              </Select>
              <Select id="gastos-finca" label={t('gastos.finca_opcional')} value={idFinca} onChange={(e) => setIdFinca(e.target.value)}>
                <option value="">{t('comun.todas')}</option>
                {(fincas.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
              </Select>
              <Select id="gastos-infraestructura" label={t('gastos.infraestructura_opcional')} value={idInfraestructura} disabled={!idFinca}
                hint={!idFinca ? t('gastos.infraestructura_hint') : undefined} onChange={(e) => setIdInfraestructura(e.target.value)}>
                <option value="">{t('comun.todas')}</option>
                {(infraestructuras.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
              </Select>
            </>
          )}
          <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
            <legend className="ds-field__label">{t('gastos.categorias')}</legend>
            <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', minHeight: 'var(--s9)', alignItems: 'center' }}>
              {CATEGORIAS.map((c) => (
                <label key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)', fontSize: 'var(--fs-body-md)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox" checked={categorias.includes(c)} style={{ width: 18, height: 18, accentColor: 'var(--brand-600)' }}
                    onChange={(e) => setCategorias((prev) => e.target.checked ? [...prev, c] : prev.filter((x) => x !== c))}
                  />
                  {t(`categoria.${c}`)}
                </label>
              ))}
            </div>
            {categorias.length === 0 && <span className="ds-field__error" role="alert">{t('gastos.categoria_requerida')}</span>}
          </fieldset>
          <div style={{ paddingBottom: 'var(--s1)' }}>
            <Button type="submit" variant="primary" size="md" disabled={!online || idCola !== null} loading={generacion.cargando}>
              <FileBarChart2 size={16} aria-hidden />{t('gastos.generar')}
            </Button>
          </div>
        </form>
      )}

      {idCola !== null && (
        <Alert variant="info" title={t('gastos.procesando')} description={sondeo.fallo ? t('comun.seguimiento_fallo') : t('gastos.procesando_detalle', { estado: t(`estado.${sondeo.estado?.estado ?? 'PENDIENTE'}`) })} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {sondeo.estado?.estado === 'FALLIDO' && <Alert variant="error" title={t('gastos.fallo')} style={{ marginBottom: 'var(--s4)' }} />}
      {errorPrincipal && <Alert variant={errorPrincipal.status >= 500 ? 'error' : 'warning'} title={errorPrincipal.message} style={{ marginBottom: 'var(--s4)' }} />}

      {visible && <ReporteGastoDetalle reporte={visible} puedeExportar={puedeGenerar} exportando={exportacion.cargando || descarga.cargando} online={online} onExportar={exportar} />}

      <h2 style={{ margin: 'var(--s7) 0 var(--s3)', fontSize: 'var(--fs-heading-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{t('gastos.historial')}</h2>
      {historial.error && <Alert variant="error" title={historial.error.message} />}
      {items.length === 0 ? (
        <p style={{ ...SECUNDARIO, fontSize: 'var(--fs-body-md)' }}>{historial.cargando ? t('comun.cargando') : t('gastos.historial_vacio')}</p>
      ) : (
        <ScrollRegion label={t('gastos.historial')}>
          <table style={TABLA} aria-busy={historial.cargando}>
            <thead>
              <tr>
                <th style={TH}>{t('gastos.periodo')}</th>
                <th style={TH}>{t('gastos.desglose')}</th>
                <th style={TH_NUM}>{t('gastos.monto')}</th>
                <th style={TH}>{t('gastos.generado')}</th>
                <th style={TH}>{t('comun.estado')}</th>
                <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id_reporte_gasto_acumulado ?? r.fecha_generacion}>
                  <td style={TD}>{formatoFecha(r.fecha_inicio)} – {formatoFecha(r.fecha_fin)}{r.id_activo_biologico && <div style={SECUNDARIO}>{r.nombre_activo ?? t('comun.activo_n', { id: r.id_activo_biologico })}</div>}</td>
                  <td style={TD}>{t(`granularidad.${r.tipo_periodo}`, { defaultValue: r.tipo_periodo })}</td>
                  <td style={TD_NUM}>{formatoMoneda(r.gasto_total_acumulado)}</td>
                  <td style={TD}>{formatoFecha(r.fecha_generacion, true)}</td>
                  <td style={TD}><EstadoRegistroBadge estado={r.estado ?? 'GENERADO'} /></td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                    {r.id_reporte_gasto_acumulado !== null && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => abrir(r.id_reporte_gasto_acumulado as number)}><Eye size={16} aria-hidden />{t('comun.ver')}</Button>
                        <Button variant="ghost" size="sm" disabled={!online} onClick={() => abrir(r.id_reporte_gasto_acumulado as number, true)} title={t('gastos.regenerar_hint')}>
                          <RefreshCw size={16} aria-hidden />{t('gastos.regenerar')}
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      )}
    </>
  );
}

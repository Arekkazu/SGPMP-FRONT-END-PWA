// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-92: informe de revelaciones NIC 41 por párrafo (borrador, aprobación y descarga) |
import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, FileText, Plus, Trash2, XCircle } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_C, ACCION_R, ACCION_U, R_REVELACIONES, R_VALORACION } from '../rbac';
import type { ActivoValorado, InformePayload, Periodo } from '../types';
import {
  AreaTexto, Datos, EncabezadoVista, EstadoBadge, EstadoVacio, ErrorApi, FILTROS, MotivoModal, PANEL, SECUNDARIO, SelectorPeriodo,
  Subtitulo, TABLA, TD, TH, formatoCantidad, formatoFecha, formatoMoneda, guardarArchivo, useAsync,
} from '../components/comunes';

/** Orden del informe: el de la norma (¶40-56 y NIIF 13 ¶93). */
const SECCIONES = [
  'parr_41_43_descripcion', 'parr_40_ganancias_perdidas', 'parr_51_separacion_precio_transformacion', 'parr_50_conciliacion',
  'niif13_93_metodos_y_supuestos', 'niif13_93_precios_referencia', 'parr_49_restricciones_compromisos', 'parr_53_riesgos',
  'parr_54_56_activos_al_costo', 'exclusiones_cierre',
];
/** Campos monetarios del contenido; el resto se muestra tal cual. */
const MONEDA = new Set([
  'valor_cierre', 'valor_inicio', 'compras', 'bajas', 'cosechas', 'precio_mercado', 'transformacion_biologica',
  'nacimientos_y_otros_ingresos', 'depreciacion_y_deterioro', 'reconocimiento_inicial', 'total', 'valor_neto',
  'valor_razonable_bruto', 'precio_unitario', 'costo', 'depreciacion_acumulada', 'deterioro_acumulado', 'valor_contable',
  'monto_estimado', 'monto_garantia', 'impacto_economico_cop',
]);
const OCULTOS = new Set(['id_activo_biologico', 'id_precio_mercado', 'json_metodo_costo']);
const CATALOGO: Record<string, string> = { fuente: 'fuente', categoria: 'categoria', metodo_costo: 'metodo_costo' };

function Valor({ campo, valor }: { campo: string; valor: unknown }) {
  const { t } = useT('finanzas');
  if (valor === null || valor === undefined || valor === '') return <>—</>;
  if (typeof valor === 'boolean') return <>{valor ? t('comun.si') : t('comun.no')}</>;
  if (MONEDA.has(campo)) return <>{formatoMoneda(valor as string)}</>;
  if (campo === 'magnitud') return <>{formatoCantidad(valor as string)}</>;
  if (campo.startsWith('fecha')) return <>{formatoFecha(String(valor))}</>;
  if (Array.isArray(valor)) return <>{valor.map((v) => t(`clasificacion.${v}`, { defaultValue: String(v) })).join(', ')}</>;
  if (typeof valor === 'object') return <>{JSON.stringify(valor)}</>;
  // Solo los valores de catálogo se traducen; nombres, identificadores y textos del Contador son datos.
  return <>{campo in CATALOGO ? t(`${CATALOGO[campo]}.${String(valor)}`, { defaultValue: String(valor) }) : String(valor)}</>;
}

function Seccion({ clave, contenido }: { clave: string; contenido: unknown }) {
  const { t } = useT('finanzas');
  const etiqueta = (k: string) => t(`rev.campo.${k}`, { defaultValue: k });
  let cuerpo: React.ReactNode;
  if (typeof contenido === 'string') {
    cuerpo = <p style={SECUNDARIO}>{t('rev.datos_insuficientes')}</p>;
  } else if (Array.isArray(contenido)) {
    if (contenido.length === 0) cuerpo = <p style={SECUNDARIO}>{t('rev.sin_datos')}</p>;
    else {
      const columnas = Object.keys(contenido[0] as object).filter((k) => !OCULTOS.has(k));
      cuerpo = (
        <ScrollRegion label={t(`rev.s.${clave}`)}>
          <table style={TABLA}>
            <thead><tr>{columnas.map((c) => <th key={c} style={TH}>{etiqueta(c)}</th>)}</tr></thead>
            <tbody>
              {contenido.map((fila, i) => (
                <tr key={i}>{columnas.map((c) => <td key={c} style={TD}><Valor campo={c} valor={(fila as Record<string, unknown>)[c]} /></td>)}</tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      );
    }
  } else if (contenido && typeof contenido === 'object') {
    const obj = contenido as Record<string, unknown>;
    const simples = Object.entries(obj).filter(([, v]) => !Array.isArray(v) || v.every((x) => typeof x !== 'object'));
    const listas = Object.entries(obj).filter(([, v]) => Array.isArray(v) && v.some((x) => typeof x === 'object'));
    cuerpo = (
      <>
        <Datos filas={simples.map(([k, v]) => [etiqueta(k), <Valor key={k} campo={k} valor={v} />])} />
        {listas.map(([k, v]) => <div key={k} style={{ marginTop: 'var(--s3)' }}><Seccion clave={k} contenido={v} /></div>)}
        {Object.entries(obj).filter(([, v]) => Array.isArray(v) && v.length === 0).map(([k]) => (
          <p key={k} style={{ ...SECUNDARIO, margin: 'var(--s2) 0 0' }}>{etiqueta(k)}: {t('rev.sin_datos')}</p>
        ))}
      </>
    );
  }
  return (
    <section style={{ marginTop: 'var(--s5)' }} aria-labelledby={`rev-${clave}`}>
      <h3 id={`rev-${clave}`} style={{ margin: '0 0 var(--s2)', fontSize: 'var(--fs-body-lg)', fontWeight: 700 }}>{t(`rev.s.${clave}`)}</h3>
      {cuerpo}
    </section>
  );
}

export function RevelacionesView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_REVELACIONES, ACCION_R);
  const puedeGenerar = usePermissionPorNombre(R_REVELACIONES, ACCION_C);
  const puedeResolver = usePermissionPorNombre(R_REVELACIONES, ACCION_U);
  const puedeVerActivos = usePermissionPorNombre(R_VALORACION, ACCION_R);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [idInforme, setIdInforme] = useState<number | null>(null);
  const [generar, setGenerar] = useState(false);
  const [rechazar, setRechazar] = useState(false);
  const [cerrado, setCerrado] = useState(false);
  const informes = useAsync(finanzasApi.informes);
  const detalle = useAsync(finanzasApi.informe);
  const resolucion = useAsync(finanzasApi.resolverInforme);
  const descarga = useAsync(finanzasApi.descargarInforme);
  const activos = useAsync(finanzasApi.activos);
  const { ejecutar: cargarInformes, limpiar: limpiarInformes } = informes;
  const { ejecutar: cargarDetalle, limpiar: limpiarDetalle } = detalle;
  const { ejecutar: cargarActivos } = activos;
  const elegir = useCallback((id: number | null, p: Periodo | null) => {
    setIdPeriodo(id); setCerrado(p?.estado === 'CERRADO'); setIdInforme(null); limpiarInformes(); limpiarDetalle();
  }, [limpiarInformes, limpiarDetalle]);
  useEffect(() => { if (idPeriodo) cargarInformes(idPeriodo); }, [idPeriodo, cargarInformes]);
  useEffect(() => { if (informes.data?.length && idInforme === null) setIdInforme(informes.data[0].id_informe); }, [informes.data, idInforme]);
  useEffect(() => { if (idInforme) cargarDetalle(idInforme); }, [idInforme, cargarDetalle]);
  useEffect(() => { if (puedeGenerar && puedeVerActivos) cargarActivos(); }, [puedeGenerar, puedeVerActivos, cargarActivos]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.revelaciones')} />;
  const inf = detalle.data;
  const refrescar = (id: number) => { setIdInforme(id); cargarDetalle(id); if (idPeriodo) cargarInformes(idPeriodo); };
  const alertas = (inf?.contenido.alertas_consistencia as Array<{ campo: string; detalle: string }> | undefined) ?? [];

  const aprobar = async () => {
    if (inf && await resolucion.ejecutar(inf.id_informe, true)) { pushToast('success', t('rev.aprobado')); refrescar(inf.id_informe); }
  };
  const descargar = async (formato: 'pdf' | 'excel') => {
    const a = inf && await descarga.ejecutar(inf.id_informe, formato);
    if (a) guardarArchivo(a.blob, a.nombre);
  };

  return (
    <>
      <EncabezadoVista
        titulo={t('rev.titulo')}
        descripcion={t('rev.descripcion')}
        acciones={puedeGenerar && idPeriodo && cerrado && (
          <Button variant="primary" size="md" onClick={() => setGenerar(true)}><Plus size={18} aria-hidden />{t('rev.generar')}</Button>
        )}
      />
      <div style={{ ...FILTROS, marginBottom: 'var(--s5)' }}>
        <SelectorPeriodo id="rev-periodo" value={idPeriodo} onChange={elegir} autoseleccionar preferir="CERRADO" />
        {(informes.data ?? []).length > 0 && (
          <Select id="rev-version" label={t('rev.version')} value={idInforme ?? ''} onChange={(e) => setIdInforme(Number(e.target.value))}>
            {(informes.data ?? []).map((x) => <option key={x.id_informe} value={x.id_informe}>{x.version_informe} · {t(`estado.${x.estado}`)}</option>)}
          </Select>
        )}
      </div>
      <ErrorApi error={informes.error ?? detalle.error ?? resolucion.error ?? descarga.error} />
      {!inf ? (
        <EstadoVacio icono={<FileText size={28} aria-hidden />} titulo={informes.cargando || detalle.cargando ? t('comun.cargando') : t('rev.vacio_titulo')} detalle={t('rev.vacio_detalle')} />
      ) : (
        <>
          <section style={PANEL} aria-label={t('rev.resumen')}>
            <Datos filas={[
              [t('rev.version'), inf.version_informe], [t('col.estado'), <EstadoBadge key="e" estado={inf.estado} />],
              [t('rev.generado_el'), formatoFecha(inf.fecha_generacion, true)], [t('rev.aprobado_el'), formatoFecha(inf.fecha_aprobacion, true)],
              [t('col.hash'), <span key="h" title={inf.hash_informe} style={{ fontFamily: 'var(--font-mono)' }}>{inf.hash_informe.slice(0, 16)}…</span>],
            ]} />
            {inf.razon_rechazo && <Alert variant="error" title={t('rev.rechazado_por')} description={inf.razon_rechazo} style={{ marginTop: 'var(--s3)' }} />}
            <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', marginTop: 'var(--s4)' }}>
              {inf.estado === 'BORRADOR' && puedeResolver && (
                <>
                  <Button variant="primary" size="sm" loading={resolucion.cargando} onClick={aprobar}><CheckCircle2 size={14} aria-hidden />{t('rev.aprobar')}</Button>
                  <Button variant="danger" size="sm" onClick={() => { resolucion.limpiar(); setRechazar(true); }}><XCircle size={14} aria-hidden />{t('rev.rechazar')}</Button>
                </>
              )}
              {inf.estado === 'APROBADO' && (
                <>
                  <Button variant="secondary" size="sm" loading={descarga.cargando} onClick={() => descargar('pdf')}><Download size={14} aria-hidden />PDF</Button>
                  <Button variant="secondary" size="sm" loading={descarga.cargando} onClick={() => descargar('excel')}><Download size={14} aria-hidden />Excel</Button>
                </>
              )}
            </div>
          </section>
          {alertas.length > 0 && (
            <Alert variant="warning" title={t('rev.alertas', { count: alertas.length })} description={alertas.map((a) => a.detalle).join(' · ')} style={{ marginTop: 'var(--s4)' }} />
          )}
          {SECCIONES.filter((k) => k in inf.contenido).map((k) => <Seccion key={k} clave={k} contenido={inf.contenido[k]} />)}
        </>
      )}
      {generar && idPeriodo && (
        <GenerarModal idPeriodo={idPeriodo} activos={activos.data ?? []} onCerrar={() => setGenerar(false)}
          onGenerado={(id) => { setGenerar(false); refrescar(id); }} />
      )}
      {rechazar && inf && (
        <MotivoModal titulo={t('rev.rechazar')} descripcion={t('rev.rechazar_ayuda')} etiqueta={t('rev.razon')} confirmar={t('rev.rechazar')}
          min={20} max={2000} peligro enviando={resolucion.cargando} error={resolucion.error} onCerrar={() => setRechazar(false)}
          onConfirmar={async (razon) => {
            if (await resolucion.ejecutar(inf.id_informe, false, razon)) { setRechazar(false); pushToast('success', t('rev.rechazado')); refrescar(inf.id_informe); }
          }} />
      )}
    </>
  );
}

function GenerarModal({ idPeriodo, activos, onCerrar, onGenerado }: {
  idPeriodo: number; activos: ActivoValorado[]; onCerrar: () => void; onGenerado: (id: number) => void;
}) {
  const { t } = useT('finanzas');
  const generacion = useAsync(finanzasApi.generarInforme);
  const [compromisos, setCompromisos] = useState<InformePayload['compromisos_vigentes']>([]);
  const [pignorados, setPignorados] = useState<Array<{ id: string; entidad: string; monto: string }>>([]);
  const [sinNovedad, setSinNovedad] = useState(false);
  const [justificacion, setJustificacion] = useState('');
  const [aviso, setAviso] = useState<string>();

  const enviar = async () => {
    if (compromisos.some((c) => c.descripcion.trim().length < 3) || pignorados.some((p) => !p.id || p.entidad.trim().length < 2)) {
      setAviso(t('rev.filas_incompletas')); return;
    }
    if (!sinNovedad && compromisos.length === 0 && pignorados.length === 0) { setAviso(t('rev.declare_o_registre')); return; }
    setAviso(undefined);
    const r = await generacion.ejecutar(idPeriodo, {
      compromisos_vigentes: compromisos.map((c) => ({ ...c, descripcion: c.descripcion.trim(), monto_estimado: c.monto_estimado || null })),
      activos_pignorados: pignorados.map((p) => ({ id_activo_biologico: Number(p.id), entidad_acreedora: p.entidad.trim(), monto_garantia: p.monto || null })),
      declaracion_sin_novedad: sinNovedad, justificacion_inconsistencias: justificacion.trim() || null,
    });
    if (r) { pushToast('success', t('rev.generado', { version: r.version_informe })); onGenerado(r.id_informe); }
  };

  return (
    <ModalShell title={t('rev.generar')} onClose={onCerrar} maxWidth={720}
      footer={(
        <>
          <Button variant="secondary" size="md" onClick={onCerrar} disabled={generacion.cargando}>{t('comun.cancelar')}</Button>
          <Button variant="primary" size="md" loading={generacion.cargando} onClick={enviar}>{t('rev.generar_borrador')}</Button>
        </>
      )}>
      <p style={{ ...SECUNDARIO, margin: '0 0 var(--s4)' }}>{t('rev.generar_ayuda')}</p>
      <ErrorApi error={generacion.error} />
      {aviso && <Alert variant="error" title={aviso} style={{ marginBottom: 'var(--s3)' }} />}

      <Subtitulo>{t('rev.compromisos')}</Subtitulo>
      {compromisos.map((c, i) => (
        <div key={i} className="ds-fg3" style={{ alignItems: 'end', marginBottom: 'var(--s2)' }}>
          <Input id={`rc-desc-${i}`} label={t('rev.campo.descripcion')} value={c.descripcion} onChange={(e) => setCompromisos(compromisos.map((x, j) => (j === i ? { ...x, descripcion: e.target.value } : x)))} />
          <Input id={`rc-cont-${i}`} label={t('rev.campo.contraparte')} value={c.contraparte ?? ''} onChange={(e) => setCompromisos(compromisos.map((x, j) => (j === i ? { ...x, contraparte: e.target.value } : x)))} />
          <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'end' }}>
            <Input id={`rc-monto-${i}`} label={t('rev.campo.monto_estimado')} inputMode="decimal" value={c.monto_estimado ?? ''} onChange={(e) => setCompromisos(compromisos.map((x, j) => (j === i ? { ...x, monto_estimado: e.target.value } : x)))} />
            <Button variant="ghost" size="sm" onClick={() => setCompromisos(compromisos.filter((_, j) => j !== i))} aria-label={t('comun.quitar')}><Trash2 size={14} aria-hidden /></Button>
          </div>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={() => setCompromisos([...compromisos, { descripcion: '', contraparte: '', monto_estimado: '' }])}><Plus size={14} aria-hidden />{t('rev.agregar_compromiso')}</Button>

      <Subtitulo>{t('rev.pignorados')}</Subtitulo>
      {pignorados.map((p, i) => (
        <div key={i} className="ds-fg3" style={{ alignItems: 'end', marginBottom: 'var(--s2)' }}>
          <Select id={`rp-activo-${i}`} label={t('col.activo')} value={p.id} onChange={(e) => setPignorados(pignorados.map((x, j) => (j === i ? { ...x, id: e.target.value } : x)))}>
            <option value="">{t('comun.elegir')}</option>
            {activos.map((a) => <option key={a.id_activo_biologico} value={a.id_activo_biologico}>{a.identificador}</option>)}
          </Select>
          <Input id={`rp-ent-${i}`} label={t('rev.campo.entidad_acreedora')} value={p.entidad} onChange={(e) => setPignorados(pignorados.map((x, j) => (j === i ? { ...x, entidad: e.target.value } : x)))} />
          <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'end' }}>
            <Input id={`rp-monto-${i}`} label={t('rev.campo.monto_garantia')} inputMode="decimal" value={p.monto} onChange={(e) => setPignorados(pignorados.map((x, j) => (j === i ? { ...x, monto: e.target.value } : x)))} />
            <Button variant="ghost" size="sm" onClick={() => setPignorados(pignorados.filter((_, j) => j !== i))} aria-label={t('comun.quitar')}><Trash2 size={14} aria-hidden /></Button>
          </div>
        </div>
      ))}
      <Button variant="secondary" size="sm" disabled={activos.length === 0} onClick={() => setPignorados([...pignorados, { id: '', entidad: '', monto: '' }])}><Plus size={14} aria-hidden />{t('rev.agregar_pignorado')}</Button>

      <label style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'flex-start', marginTop: 'var(--s5)' }}>
        <input type="checkbox" checked={sinNovedad} onChange={(e) => setSinNovedad(e.target.checked)} style={{ marginTop: 4 }} />
        {t('rev.sin_novedad')}
      </label>
      <div style={{ marginTop: 'var(--s4)' }}>
        <AreaTexto id="rev-justificacion" label={t('rev.justificacion')} maxLength={2000} value={justificacion} onChange={(e) => setJustificacion(e.target.value)} hint={t('rev.justificacion_ayuda')} />
      </div>
    </ModalShell>
  );
}

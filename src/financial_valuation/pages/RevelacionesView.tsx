// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-92: informe de revelaciones NIC 41 por párrafo (borrador, aprobación y descarga) |
// | 2026-11-05 | Arekkazu | M06 RF-92 prototipo: historial de versiones del período con filtros; sin JSON ni claves crudas |
// | 2026-11-10 | Arekkazu | TC-DIS-257..259 RF-92: índice de secciones, filas identificadas, justificación bajo el campo, aprobación confirmada, aprobador y descarga anunciada |
import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileText, Plus, Trash2, XCircle } from 'lucide-react';
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
import type { ActivoValorado, InformePayload } from '../types';
import {
  AreaTexto, Datos, EncabezadoVista, EstadoBadge, ErrorApi, Listado, MotivoModal, PANEL, SECUNDARIO, SinPeriodo, Subtitulo, TABLA, TD, TH,
  descargarArchivo, formatoCantidad, formatoFecha, formatoMoneda, nombrePeriodo, useAsync, useListado, usePeriodo,
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

/** Rótulo de un campo del informe; uno sin traducción se lee como texto, nunca como clave. */
function humanizar(clave: string): string {
  const texto = clave.replace(/_/g, ' ').trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function Valor({ campo, valor }: { campo: string; valor: unknown }) {
  const { t } = useT('finanzas');
  if (valor === null || valor === undefined || valor === '') return <>{t('rev.sin_dato')}</>;
  if (typeof valor === 'boolean') return <>{valor ? t('comun.si') : t('comun.no')}</>;
  if (MONEDA.has(campo)) return <>{formatoMoneda(valor as string)}</>;
  if (campo === 'magnitud') return <>{formatoCantidad(valor as string)}</>;
  if (campo.startsWith('fecha')) return <>{formatoFecha(String(valor))}</>;
  if (Array.isArray(valor)) return <>{valor.map((v) => t(`clasificacion.${v}`, { defaultValue: String(v) })).join(', ')}</>;
  if (typeof valor === 'object') {
    const pares = Object.entries(valor as Record<string, unknown>).filter(([k]) => !OCULTOS.has(k));
    return <>{pares.map(([k, v], i) => <span key={k}>{i > 0 && ' · '}{t(`rev.campo.${k}`, { defaultValue: humanizar(k) })}: <Valor campo={k} valor={v} /></span>)}</>;
  }
  // Solo los valores de catálogo se traducen; nombres, identificadores y textos del Contador son datos.
  return <>{campo in CATALOGO ? t(`${CATALOGO[campo]}.${String(valor)}`, { defaultValue: String(valor) }) : String(valor)}</>;
}

function Seccion({ clave, contenido }: { clave: string; contenido: unknown }) {
  const { t } = useT('finanzas');
  const etiqueta = (k: string) => t(`rev.campo.${k}`, { defaultValue: humanizar(k) });
  const titulo = t(`rev.s.${clave}`, { defaultValue: humanizar(clave) });
  let cuerpo: React.ReactNode;
  if (typeof contenido === 'string') {
    // El backend marca la sección con un código: sin datos suficientes, o bloqueada por un error en su fuente.
    const bloqueada = /BLOQUE|ERROR/i.test(contenido);
    cuerpo = (
      <p style={{ ...SECUNDARIO, display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
        {bloqueada ? <XCircle size={16} aria-hidden style={{ color: 'var(--sem-error)' }} /> : <AlertTriangle size={16} aria-hidden style={{ color: 'var(--sem-warning)' }} />}
        {bloqueada ? t('rev.seccion_bloqueada') : t('rev.datos_insuficientes')}
      </p>
    );
  } else if (Array.isArray(contenido)) {
    if (contenido.length === 0) cuerpo = <p style={SECUNDARIO}>{t('rev.sin_datos')}</p>;
    else {
      const columnas = Object.keys(contenido[0] as object).filter((k) => !OCULTOS.has(k));
      cuerpo = (
        <ScrollRegion label={titulo}>
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
    const simples = Object.entries(obj).filter(([k, v]) => !OCULTOS.has(k) && (!Array.isArray(v) || v.every((x) => typeof x !== 'object')));
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
      <h3 id={`rev-${clave}`} tabIndex={-1} style={{ margin: '0 0 var(--s2)', fontSize: 'var(--fs-body-lg)', fontWeight: 700, outline: 'none' }}>{titulo}</h3>
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
  const { periodo } = usePeriodo();
  const [idInforme, setIdInforme] = useState<number | null>(null);
  const [generar, setGenerar] = useState(false);
  const [rechazar, setRechazar] = useState(false);
  const [aprobando, setAprobando] = useState(false);
  const informes = useAsync(finanzasApi.informes);
  const detalle = useAsync(finanzasApi.informe);
  const resolucion = useAsync(finanzasApi.resolverInforme);
  const descarga = useAsync(finanzasApi.descargarInforme);
  const activos = useAsync(finanzasApi.activos);
  const idPeriodo = periodo?.id_periodo_contable;
  const cerrado = periodo?.estado === 'CERRADO';
  const { ejecutar: cargarInformes, limpiar: limpiarInformes } = informes;
  const { ejecutar: cargarDetalle, limpiar: limpiarDetalle } = detalle;
  const { ejecutar: cargarActivos } = activos;
  useEffect(() => {
    setIdInforme(null); limpiarInformes(); limpiarDetalle();
    if (puedeLeer && idPeriodo) cargarInformes(idPeriodo);
  }, [puedeLeer, idPeriodo, cargarInformes, limpiarInformes, limpiarDetalle]);
  useEffect(() => { if (informes.data?.length && idInforme === null) setIdInforme(informes.data[0].id_informe); }, [informes.data, idInforme]);
  useEffect(() => { if (idInforme) cargarDetalle(idInforme); }, [idInforme, cargarDetalle]);
  useEffect(() => { if (puedeGenerar && puedeVerActivos) cargarActivos(); }, [puedeGenerar, puedeVerActivos, cargarActivos]);

  const l = useListado(informes.data, (x) => x.version_informe, [
    { id: 'estado', etiqueta: t('col.estado'), valor: (x) => x.estado, texto: (v) => t(`estado.${v}`) },
  ]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.revelaciones')} />;
  const inf = detalle.data;
  const refrescar = (id: number) => { setIdInforme(id); cargarDetalle(id); if (idPeriodo) cargarInformes(idPeriodo); };
  const alertas = (inf?.contenido.alertas_consistencia as Array<{ campo: string; detalle: string }> | undefined) ?? [];

  const aprobar = async () => {
    setAprobando(false);
    if (inf && await resolucion.ejecutar(inf.id_informe, true)) { pushToast('success', t('rev.aprobado')); refrescar(inf.id_informe); }
  };
  const descargar = async (formato: 'pdf' | 'excel') => {
    const a = inf && await descarga.ejecutar(inf.id_informe, formato);
    if (a) descargarArchivo(a);
  };
  const secciones = inf ? SECCIONES.filter((k) => k in inf.contenido) : [];

  return (
    <>
      <EncabezadoVista
        titulo={t('rev.titulo')}
        descripcion={periodo ? t('rev.descripcion_periodo', { periodo: nombrePeriodo(periodo) }) : t('rev.descripcion')}
        acciones={puedeGenerar && cerrado && (
          <Button variant="primary" size="md" onClick={() => setGenerar(true)}><Plus size={18} aria-hidden />{t('rev.generar')}</Button>
        )}
      />
      {periodo && !cerrado && <Alert variant="info" title={t('rev.solo_cerrados')} description={t('rev.solo_cerrados_detalle')} style={{ marginBottom: 'var(--s5)' }} />}
      <ErrorApi error={informes.error ?? detalle.error ?? resolucion.error ?? descarga.error} />
      {!periodo ? <SinPeriodo /> : (
        <Listado l={l} idBase="rev" titulo={t('rev.historial')} sustantivo={t('rev.sustantivo')} buscar={t('rev.buscar')} cargando={informes.cargando}
          vacio={{ icono: <FileText size={28} aria-hidden />, titulo: t('rev.vacio_titulo'), detalle: t('rev.vacio_detalle') }}>
          {(visibles) => (
            <table style={TABLA}>
              <thead>
                <tr><th style={TH}>{t('rev.version')}</th><th style={TH}>{t('col.estado')}</th><th style={TH}>{t('rev.generado_el')}</th>
                  <th style={TH}>{t('rev.aprobado_el')}</th><th style={TH}>{t('rev.aprobador')}</th><th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th></tr>
              </thead>
              <tbody>
                {visibles.map((x) => (
                  <tr key={x.id_informe} aria-current={x.id_informe === idInforme ? 'true' : undefined}>
                    <td style={TD}><strong className="fin-mono">{x.version_informe}</strong></td>
                    <td style={TD}><EstadoBadge estado={x.estado} />{x.razon_rechazo && <span className="fin-secundario">{x.razon_rechazo}</span>}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(x.fecha_generacion, true)}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{x.fecha_aprobacion ? formatoFecha(x.fecha_aprobacion, true) : t('rev.sin_aprobar')}</td>
                    <td style={TD}>{x.nombre_aprobador ?? (x.fecha_aprobacion ? t('rev.aprobador_sin_nombre') : t('rev.sin_aprobar'))}</td>
                    <td style={TD}>
                      <Button variant={x.id_informe === idInforme ? 'secondary' : 'ghost'} size="sm" onClick={() => setIdInforme(x.id_informe)}>
                        {x.estado === 'BORRADOR' ? t('rev.ver_borrador') : t('rev.ver_informe')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Listado>
      )}
      {inf && (
        <>
          <section style={{ ...PANEL, marginTop: 'var(--s5)' }} aria-label={t('rev.resumen')}>
            <Datos filas={[
              [t('rev.version'), inf.version_informe], [t('col.estado'), <EstadoBadge key="e" estado={inf.estado} />],
              [t('rev.generado_el'), formatoFecha(inf.fecha_generacion, true)],
              [t('rev.aprobado_el'), inf.fecha_aprobacion ? formatoFecha(inf.fecha_aprobacion, true) : t('rev.sin_aprobar')],
              [t('rev.aprobador'), inf.nombre_aprobador ?? (inf.fecha_aprobacion ? t('rev.aprobador_sin_nombre') : t('rev.sin_aprobar'))],
              [t('col.hash'), <span key="h" title={inf.hash_informe} className="fin-mono">{inf.hash_informe.slice(0, 16)}…</span>],
            ]} />
            {inf.razon_rechazo && <Alert variant="error" title={t('rev.rechazado_por')} description={inf.razon_rechazo} style={{ marginTop: 'var(--s3)' }} />}
            <div className="fin-acciones" style={{ marginTop: 'var(--s4)' }}>
              {inf.estado === 'BORRADOR' && puedeResolver && (
                <>
                  <Button variant="primary" size="sm" loading={resolucion.cargando} onClick={() => setAprobando(true)}><CheckCircle2 size={14} aria-hidden />{t('rev.aprobar')}</Button>
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
            {inf.estado !== 'APROBADO' && <p style={{ ...SECUNDARIO, margin: 'var(--s3) 0 0' }}>{t('rev.descarga_aprobado')}</p>}
          </section>
          {alertas.length > 0 && (
            <Alert variant="warning" title={t('rev.alertas', { count: alertas.length })} description={alertas.map((a) => a.detalle).join(' · ')} style={{ marginTop: 'var(--s4)' }} />
          )}
          {secciones.length > 1 && (
            <nav aria-label={t('rev.indice')} style={{ ...PANEL, marginTop: 'var(--s4)' }}>
              <p style={{ margin: '0 0 var(--s2)', fontWeight: 700 }}>{t('rev.indice')}</p>
              <ol style={{ margin: 0, paddingLeft: 'var(--s5)', display: 'grid', gap: 'var(--s1)', fontSize: 'var(--fs-body-md)' }}>
                {secciones.map((k) => <li key={k}><a href={`#rev-${k}`} style={{ color: 'var(--brand-600)' }}>{t(`rev.s.${k}`, { defaultValue: humanizar(k) })}</a></li>)}
              </ol>
            </nav>
          )}
          {secciones.map((k) => <Seccion key={k} clave={k} contenido={inf.contenido[k]} />)}
        </>
      )}
      {aprobando && inf && (
        <ModalShell title={t('rev.aprobar_titulo', { version: inf.version_informe })} onClose={() => setAprobando(false)} maxWidth={480}
          descripcion={t('rev.aprobar_detalle')}
          footer={(
            <>
              <Button variant="secondary" size="md" data-autofocus onClick={() => setAprobando(false)}>{t('comun.cancelar')}</Button>
              <Button variant="primary" size="md" loading={resolucion.cargando} onClick={aprobar}>{t('rev.aprobar')}</Button>
            </>
          )}>
          <p style={{ margin: 0, lineHeight: 'var(--lh-base)' }}>{t('rev.aprobar_confirmacion', { version: inf.version_informe })}</p>
        </ModalShell>
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
  const [errorJustificacion, setErrorJustificacion] = useState<string>();
  // La inconsistencia detectada por el backend se corrige en la justificación: el error va debajo de ese campo (WCAG 3.3.1).
  const campoApi = generacion.error?.field ?? generacion.error?.fields?.[0]?.field;
  const justificacionApi = campoApi === 'justificacion_inconsistencias' ? generacion.error?.message : undefined;

  const enviar = async () => {
    if (compromisos.some((c) => c.descripcion.trim().length < 3) || pignorados.some((p) => !p.id || p.entidad.trim().length < 2)) {
      setAviso(t('rev.filas_incompletas')); return;
    }
    if (!sinNovedad && compromisos.length === 0 && pignorados.length === 0) { setAviso(t('rev.declare_o_registre')); return; }
    if (justificacion.trim() && justificacion.trim().length < 20) { setErrorJustificacion(t('rev.justificacion_corta')); return; }
    setAviso(undefined); setErrorJustificacion(undefined);
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
      <ErrorApi error={justificacionApi ? null : generacion.error} />
      {aviso && <Alert variant="error" title={aviso} style={{ marginBottom: 'var(--s3)' }} />}

      <Subtitulo>{t('rev.compromisos')}</Subtitulo>
      {compromisos.map((c, i) => (
        <div key={i} className="ds-fg3" style={{ alignItems: 'end', marginBottom: 'var(--s2)' }}>
          <Input id={`rc-desc-${i}`} label={t('rev.fila_compromiso', { n: i + 1, campo: t('rev.campo.descripcion') })} value={c.descripcion} onChange={(e) => setCompromisos(compromisos.map((x, j) => (j === i ? { ...x, descripcion: e.target.value } : x)))} />
          <Input id={`rc-cont-${i}`} label={t('rev.fila_compromiso', { n: i + 1, campo: t('rev.campo.contraparte') })} value={c.contraparte ?? ''} onChange={(e) => setCompromisos(compromisos.map((x, j) => (j === i ? { ...x, contraparte: e.target.value } : x)))} />
          <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'end' }}>
            <Input id={`rc-monto-${i}`} label={t('rev.fila_compromiso', { n: i + 1, campo: t('rev.campo.monto_estimado') })} inputMode="decimal" value={c.monto_estimado ?? ''} onChange={(e) => setCompromisos(compromisos.map((x, j) => (j === i ? { ...x, monto_estimado: e.target.value } : x)))} />
            <Button variant="ghost" size="sm" onClick={() => setCompromisos(compromisos.filter((_, j) => j !== i))} aria-label={t('rev.quitar_compromiso', { n: i + 1 })}><Trash2 size={14} aria-hidden /></Button>
          </div>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={() => setCompromisos([...compromisos, { descripcion: '', contraparte: '', monto_estimado: '' }])}><Plus size={14} aria-hidden />{t('rev.agregar_compromiso')}</Button>

      <Subtitulo>{t('rev.pignorados')}</Subtitulo>
      {pignorados.map((p, i) => (
        <div key={i} className="ds-fg3" style={{ alignItems: 'end', marginBottom: 'var(--s2)' }}>
          <Select id={`rp-activo-${i}`} label={t('rev.fila_pignorado', { n: i + 1, campo: t('col.activo') })} value={p.id} onChange={(e) => setPignorados(pignorados.map((x, j) => (j === i ? { ...x, id: e.target.value } : x)))}>
            <option value="">{t('comun.elegir')}</option>
            {activos.map((a) => <option key={a.id_activo_biologico} value={a.id_activo_biologico}>{a.identificador}</option>)}
          </Select>
          <Input id={`rp-ent-${i}`} label={t('rev.fila_pignorado', { n: i + 1, campo: t('rev.campo.entidad_acreedora') })} value={p.entidad} onChange={(e) => setPignorados(pignorados.map((x, j) => (j === i ? { ...x, entidad: e.target.value } : x)))} />
          <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'end' }}>
            <Input id={`rp-monto-${i}`} label={t('rev.fila_pignorado', { n: i + 1, campo: t('rev.campo.monto_garantia') })} inputMode="decimal" value={p.monto} onChange={(e) => setPignorados(pignorados.map((x, j) => (j === i ? { ...x, monto: e.target.value } : x)))} />
            <Button variant="ghost" size="sm" onClick={() => setPignorados(pignorados.filter((_, j) => j !== i))} aria-label={t('rev.quitar_pignorado', { n: i + 1 })}><Trash2 size={14} aria-hidden /></Button>
          </div>
        </div>
      ))}
      <Button variant="secondary" size="sm" disabled={activos.length === 0} onClick={() => setPignorados([...pignorados, { id: '', entidad: '', monto: '' }])}><Plus size={14} aria-hidden />{t('rev.agregar_pignorado')}</Button>

      <label className="fin-casilla" style={{ marginTop: 'var(--s5)' }}>
        <input type="checkbox" checked={sinNovedad} onChange={(e) => setSinNovedad(e.target.checked)} />
        <span>{t('rev.sin_novedad')}</span>
      </label>
      <div style={{ marginTop: 'var(--s4)' }}>
        <AreaTexto id="rev-justificacion" label={t('rev.justificacion')} maxLength={2000} value={justificacion} required={!!justificacionApi}
          onChange={(e) => { setJustificacion(e.target.value); setErrorJustificacion(undefined); }} error={errorJustificacion ?? justificacionApi} hint={t('rev.justificacion_ayuda')} />
      </div>
    </ModalShell>
  );
}

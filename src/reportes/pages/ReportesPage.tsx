// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-104: elegir reporte, filtros, vista previa, PDF/Excel, segundo plano y mis reportes |
// | 2026-11-19 | Arekkazu | M08 RF-104: vista previa con la estructura de las plantillas V1.1 |
// | 2026-11-21 | Arekkazu | INC-M08-392-G027 RF-107: la generación queda en curso para el resto del sistema y los botones explican el bloqueo |
// | 2026-11-22 | Arekkazu | A11Y2-M08 TC-DIS-286/287 RF-104: cambio de tipo anunciado, foco tras exportar, texto del RF y nombre de «Descargar» |
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Download, Eye, FileText, X } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { Badge, type BadgeVariant } from '../../shared/design-system/Badge';
import { Button } from '../../shared/design-system/Button';
import { Anunciador } from '../../shared/design-system/Anunciador';
import { ProcesoEnCurso } from '../../shared/design-system/ProcesoEnCurso';
import { enOperacion } from '../../shared/hooks/operacionEnCurso';
import { Select } from '../../shared/design-system/Select';
import { pushToast } from '../../shared/hooks/useToast';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import type { ApiError } from '../../shared/api/errors';
import { formatearFechaHora, formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { reportesApi } from '../api/reportesApi';
import { FiltrosReporte } from '../components/FiltrosReporte';
import { VistaPreviaReporte } from '../components/VistaPreviaReporte';
import {
  GRUPO_REPORTE, type EstadoReporte, type FormatoReporte, type Reporte, type ReporteCatalogo, type TipoReporte,
  type ValoresFiltros, type VistaPrevia,
} from '../tipos';

const GRUPOS = ['produccion', 'sanitario', 'contable', 'iot', 'gerencial'] as const;
const VARIANTE_ESTADO: Record<EstadoReporte, BadgeVariant> = {
  EN_PROCESO: 'info', GENERADO: 'success', FALLIDO: 'error', CANCELADO: 'neutral', EXPIRADO: 'neutral',
};
const SONDEO_MS = 10_000;

const SECCION: React.CSSProperties = {
  background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-lg, 12px)',
  padding: 'var(--s5)', marginBottom: 'var(--s5)',
};

function errorComo(e: unknown): ApiError {
  return e as ApiError;
}

/** Del campo `filtros.fecha_fin` del error del backend, el nombre del filtro. */
function filtroDelError(e: ApiError): string | undefined {
  return e.field?.startsWith('filtros.') ? e.field.slice('filtros.'.length) : undefined;
}

/**
 * RF-104: reportes PDF y Excel para cada actor. Solo aparecen los que el rol puede generar. El flujo es el del RF:
 * elegir el tipo, llenar los filtros, ver la vista previa (20 filas o el resumen) y confirmar la exportación. Hasta
 * 1.000 registros el archivo se descarga al momento; por encima se genera en segundo plano, la bandeja avisa y
 * queda en «Mis reportes» durante 48 horas.
 */
export function ReportesPage() {
  const { t } = useT('reportes');
  const online = useOnlineStatus();
  const history = useHistory();
  const [catalogo, setCatalogo] = useState<ReporteCatalogo[] | null>(null);
  const [errorCatalogo, setErrorCatalogo] = useState<ApiError | null>(null);
  const [tipo, setTipo] = useState<TipoReporte | ''>('');
  const [valores, setValores] = useState<ValoresFiltros>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [formato, setFormato] = useState<FormatoReporte>('PDF');
  const [previa, setPrevia] = useState<VistaPrevia | null>(null);
  const [cargandoPrevia, setCargandoPrevia] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<ApiError | null>(null);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [descargando, setDescargando] = useState<string | null>(null);
  const enProcesoAntes = useRef<Set<string>>(new Set());
  const [aviso, setAviso] = useState('');
  const misReportesRef = useRef<HTMLHeadingElement>(null);

  const reporte = useMemo(() => catalogo?.find((r) => r.tipo_reporte === tipo) ?? null, [catalogo, tipo]);

  const cargarCatalogo = useCallback(() => {
    setErrorCatalogo(null);
    reportesApi.catalogo().then(setCatalogo).catch((e) => setErrorCatalogo(errorComo(e)));
  }, []);

  const cargarReportes = useCallback(async () => {
    try {
      const lista = await reportesApi.listar();
      // Un reporte en segundo plano que terminó mientras se miraba la página se anuncia aquí también.
      lista.filter((r) => enProcesoAntes.current.has(r.id_reporte) && r.estado === 'GENERADO')
        .forEach((r) => pushToast('success', t('avisos.listo', { titulo: r.titulo }), undefined,
          { idOperacion: `reporte-${r.id_reporte}` }));
      enProcesoAntes.current = new Set(lista.filter((r) => r.estado === 'EN_PROCESO').map((r) => r.id_reporte));
      setReportes(lista);
    } catch {
      // La lista se reintenta en el siguiente sondeo; el resto de la página sigue usable.
    }
  }, [t]);

  useEffect(() => { cargarCatalogo(); void cargarReportes(); }, [cargarCatalogo, cargarReportes]);

  const hayEnProceso = reportes.some((r) => r.estado === 'EN_PROCESO');
  useEffect(() => {
    if (!hayEnProceso || !online) return;
    const intervalo = setInterval(() => void cargarReportes(), SONDEO_MS);
    return () => clearInterval(intervalo);
  }, [hayEnProceso, online, cargarReportes]);

  const cambiarTipo = (nuevo: TipoReporte | '') => {
    // 4.1.3 (TC-DIS-286): los filtros cambian con el tipo; se avisa sin mover el foco.
    const elegido = catalogo?.find((r) => r.tipo_reporte === nuevo);
    setAviso(elegido ? t('filtros.cambiaron', { reporte: elegido.titulo, count: elegido.filtros.filter((f) => f.obligatorio).length }) : '');
    setTipo(nuevo);
    setValores({});
    setErrores({});
    setPrevia(null);
    setErrorAccion(null);
  };

  const cambiarFiltro = (nombre: string, valor: string | number | undefined) => {
    setValores((v) => {
      const siguiente = { ...v };
      if (valor === undefined || valor === '') delete siguiente[nombre]; else siguiente[nombre] = valor;
      return siguiente;
    });
    setErrores((e) => ({ ...e, [nombre]: '' }));
    setPrevia(null);
  };

  const validar = (): boolean => {
    if (!reporte) return false;
    const faltantes = Object.fromEntries(reporte.filtros
      .filter((f) => f.obligatorio && (valores[f.nombre] === undefined || valores[f.nombre] === ''))
      .map((f) => [f.nombre, t('filtros.obligatorio', { campo: f.etiqueta })]));
    setErrores(faltantes);
    return Object.keys(faltantes).length === 0;
  };

  const manejarError = (e: unknown) => {
    const error = errorComo(e);
    const campo = filtroDelError(error);
    if (campo) setErrores((x) => ({ ...x, [campo]: error.message }));
    setErrorAccion(error);
  };

  // RF-107 8.3: lo que se deshabilita por la generación en curso dice por qué y hasta cuándo.
  const esperaGeneracion = generando ? t('proceso.espera', { ns: 'common', operacion: t('generar.operacion') }) : undefined;

  const verPrevia = async () => {
    if (!reporte || !validar()) return;
    setCargandoPrevia(true);
    setErrorAccion(null);
    try {
      setPrevia(await reportesApi.vistaPrevia(reporte.tipo_reporte, valores));
    } catch (e) {
      manejarError(e);
    } finally {
      setCargandoPrevia(false);
    }
  };

  const descargar = async (r: Reporte) => {
    setDescargando(r.id_reporte);
    try {
      for (const parte of r.partes) {
        // eslint-disable-next-line no-await-in-loop
        await reportesApi.descargar(r.id_reporte, parte.numero_parte, parte.nombre_archivo);
      }
    } catch (e) {
      const error = errorComo(e);
      pushToast('error', t('avisos.no_descargo'), error.message, {
        idOperacion: `descarga-${r.id_reporte}`, accion: error.accion,
      });
      void cargarReportes();
    } finally {
      setDescargando(null);
    }
  };

  const generar = async () => {
    if (!reporte || !validar()) return;
    setGenerando(true);
    setErrorAccion(null);
    try {
      // RF-107 8.2: mientras se genera, ninguna acción crítica se abre (tampoco desde otra sección).
      const r = await enOperacion(t('generar.operacion'),
        () => reportesApi.generar(reporte.tipo_reporte, formato, valores));
      if (r.estado === 'GENERADO') {
        pushToast('success', t('avisos.generado', { titulo: r.titulo }),
          t('avisos.generado_detalle', { registros: formatearNumero(r.numero_registros ?? 0) }),
          { idOperacion: `reporte-${r.id_reporte}` });
        await descargar(r);
      } else {
        enProcesoAntes.current.add(r.id_reporte);
        // RF-104: el texto del RF para la generación en segundo plano.
        pushToast('info', t('avisos.en_segundo_plano'), undefined, { idOperacion: `reporte-${r.id_reporte}` });
      }
      setPrevia(null);
      void cargarReportes();
      // 2.4.3 (TC-DIS-287): «Exportar» desaparece con la vista previa; el foco pasa a «Mis reportes», donde queda el archivo.
      window.setTimeout(() => misReportesRef.current?.focus(), 0);
    } catch (e) {
      manejarError(e);
    } finally {
      setGenerando(false);
    }
  };

  const cancelar = async (r: Reporte) => {
    try {
      await reportesApi.cancelar(r.id_reporte);
      pushToast('success', t('avisos.cancelado', { titulo: r.titulo }));
    } catch (e) {
      pushToast('error', t('avisos.no_cancelo'), errorComo(e).message);
    }
    void cargarReportes();
  };

  if (errorCatalogo?.status === 403) return <Alert variant="warning" title={t('sin_permiso')} style={{ margin: 'var(--s5)' }} />;

  return (
    <div style={{ padding: 'var(--s5)', maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--s5)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: 'var(--fs-title-lg, 24px)', margin: 0 }}>
          <FileText size={24} aria-hidden /> {t('titulo')}
        </h1>
        <p style={{ margin: 'var(--s2) 0 0', color: 'var(--text-secondary)' }}>{t('descripcion')}</p>
      </header>

      {errorCatalogo && (
        <Alert variant="error" title={t('no_cargo_catalogo')} description={errorCatalogo.message}
               accion={{ texto: t('reintentar'), onClick: cargarCatalogo }} />
      )}

      <Anunciador mensaje={aviso} />
      <section style={SECCION} aria-labelledby="titulo-generar">
        <h2 id="titulo-generar" style={{ margin: '0 0 var(--s4)', fontSize: 'var(--fs-title-sm, 18px)' }}>{t('generar.titulo')}</h2>
        {catalogo && catalogo.length === 0 ? (
          <p>{t('generar.sin_reportes')}</p>
        ) : (
          <>
            <Select id="tipo-reporte" label={t('generar.tipo')} required value={tipo} disabled={!catalogo}
                    onChange={(e) => cambiarTipo(e.target.value as TipoReporte | '')}>
              <option value="">{catalogo ? t('generar.elige_tipo') : t('filtros.cargando')}</option>
              {GRUPOS.map((g) => {
                const del_grupo = (catalogo ?? []).filter((r) => GRUPO_REPORTE[r.tipo_reporte] === g);
                return del_grupo.length ? (
                  <optgroup key={g} label={t(`grupos.${g}`)}>
                    {del_grupo.map((r) => <option key={r.tipo_reporte} value={r.tipo_reporte}>{r.titulo}</option>)}
                  </optgroup>
                ) : null;
              })}
            </Select>
            {reporte && (
              <>
                <p style={{ margin: 'var(--s2) 0 var(--s4)', color: 'var(--text-secondary)' }}>
                  {t(`ayuda.${reporte.tipo_reporte}`)}
                  {reporte.periodo_cerrado ? ` ${t('ayuda.periodo_cerrado')}` : ''}
                </p>
                <FiltrosReporte reporte={reporte} valores={valores} errores={errores} onCambiar={cambiarFiltro} />
                <fieldset style={{ border: 0, padding: 0, margin: 'var(--s4) 0 0', display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap' }}>
                  <legend style={{ fontWeight: 600, marginBottom: 'var(--s2)' }}>{t('generar.formato')}</legend>
                  {(['PDF', 'EXCEL'] as const).map((f) => (
                    <label key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)', minHeight: 'var(--s9, 48px)' }}>
                      <input type="radio" name="formato" value={f} checked={formato === f} onChange={() => setFormato(f)} />
                      {t(`formatos.${f}`)}
                    </label>
                  ))}
                </fieldset>
                <div style={{ display: 'flex', gap: 'var(--s3)', flexWrap: 'wrap', marginTop: 'var(--s4)' }}>
                  <Button variant="secondary" onClick={() => void verPrevia()} loading={cargandoPrevia}
                          disabled={!online || cargandoPrevia || generando} title={esperaGeneracion}>
                    <Eye size={16} aria-hidden /> {t('generar.ver_previa')}
                  </Button>
                  <Button onClick={() => void generar()} loading={generando}
                          disabled={!online || generando || !previa || previa.sin_datos}
                          title={esperaGeneracion ?? (!previa ? t('generar.primero_previa') : undefined)}>
                    <Download size={16} aria-hidden /> {t('generar.confirmar', { formato: t(`formatos.${formato}`) })}
                  </Button>
                </div>
                {!online && <p role="status" style={{ marginTop: 'var(--s2)' }}>{t('generar.sin_conexion')}</p>}
              </>
            )}
          </>
        )}
        {errorAccion && (
          <Alert variant={errorAccion.status === 403 ? 'warning' : 'error'} title={t('generar.no_se_pudo')}
                 description={errorAccion.message} style={{ marginTop: 'var(--s4)' }}
                 onDismiss={() => setErrorAccion(null)}
                 accion={errorAccion.accion ? { texto: errorAccion.accion.texto,
                   onClick: () => history.push(`/${errorAccion.accion!.ruta}`) } : undefined} />
        )}
        {generando && (
          <div style={{ marginTop: 'var(--s4)' }}><ProcesoEnCurso mensaje={t('generar.generando')} /></div>
        )}
      </section>

      {previa && (
        <section style={SECCION} aria-labelledby="titulo-previa">
          <VistaPreviaReporte previa={previa} />
        </section>
      )}

      <section style={SECCION} aria-labelledby="titulo-mis-reportes">
        <h2 id="titulo-mis-reportes" ref={misReportesRef} tabIndex={-1} style={{ margin: '0 0 var(--s2)', fontSize: 'var(--fs-title-sm, 18px)' }}>{t('mis.titulo')}</h2>
        <p style={{ margin: '0 0 var(--s4)', color: 'var(--text-secondary)' }}>{t('mis.descripcion')}</p>
        {reportes.some((r) => r.estado === 'EN_PROCESO') && (
          <div style={{ marginBottom: 'var(--s4)' }}>
            <ProcesoEnCurso mensaje={t('mis.en_proceso')} detalle={t('mis.te_avisaremos')} />
          </div>
        )}
        {reportes.length === 0 ? (
          <p>{t('mis.vacio')}</p>
        ) : (
          <div className="ds-scroll-region" tabIndex={0} role="region" aria-label={t('mis.titulo')} style={{ overflowX: 'auto' }}>
            <table className="ds-tabla-tarjetas" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['reporte', 'formato', 'estado', 'solicitado', 'vence', 'acciones'].map((c) => (
                    <th key={c} scope="col" style={{ textAlign: 'left', padding: 'var(--s2) var(--s3)', borderBottom: '2px solid var(--surface-border)' }}>
                      {t(`mis.col.${c}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportes.map((r) => (
                  <tr key={r.id_reporte}>
                    <td data-label={t('mis.col.reporte')} style={{ padding: 'var(--s2) var(--s3)' }}>
                      <strong>{r.titulo}</strong>
                      {r.numero_registros !== null && <div style={{ color: 'var(--text-secondary)' }}>
                        {t('previa.registros', { count: r.numero_registros, registros: formatearNumero(r.numero_registros) })}</div>}
                      {r.mensaje && r.estado !== 'EN_PROCESO' && <div style={{ color: 'var(--text-secondary)' }}>{r.mensaje}</div>}
                    </td>
                    <td data-label={t('mis.col.formato')} style={{ padding: 'var(--s2) var(--s3)' }}>{t(`formatos.${r.formato}`)}</td>
                    <td data-label={t('mis.col.estado')} style={{ padding: 'var(--s2) var(--s3)' }}>
                      <Badge variant={VARIANTE_ESTADO[r.estado]}>{t(`estados.${r.estado}`)}</Badge>
                    </td>
                    <td data-label={t('mis.col.solicitado')} style={{ padding: 'var(--s2) var(--s3)' }}>
                      {r.fecha_solicitud ? formatearFechaHora(r.fecha_solicitud) : '—'}
                    </td>
                    <td data-label={t('mis.col.vence')} style={{ padding: 'var(--s2) var(--s3)' }}>
                      {r.estado === 'GENERADO' && r.fecha_expiracion ? formatearFechaHora(r.fecha_expiracion) : t('mis.no_aplica')}
                    </td>
                    <td data-label={t('mis.col.acciones')} style={{ padding: 'var(--s2) var(--s3)' }}>
                      <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
                        {r.estado === 'GENERADO' && (
                          <Button size="sm" variant="secondary" loading={descargando === r.id_reporte}
                                  disabled={!online || descargando === r.id_reporte} onClick={() => void descargar(r)}
                                  aria-label={r.partes.length > 1 ? t('mis.descargar_partes_aria', { count: r.partes.length, titulo: r.titulo }) : t('mis.descargar_aria', { titulo: r.titulo })}>
                            <Download size={14} aria-hidden /> {r.partes.length > 1 ? t('mis.descargar_partes', { count: r.partes.length }) : t('mis.descargar')}
                          </Button>
                        )}
                        {r.estado === 'EN_PROCESO' && (
                          <Button size="sm" variant="ghost" disabled={!online} onClick={() => void cancelar(r)}
                                  aria-label={t('mis.cancelar_aria', { titulo: r.titulo })}>
                            <X size={14} aria-hidden /> {t('mis.cancelar')}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
